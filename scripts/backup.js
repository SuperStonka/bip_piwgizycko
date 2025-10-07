const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const archiver = require('archiver');

// Load environment variables
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

// Database configuration
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;

async function createBackup() {
  try {
    console.log('🔄 Rozpoczynam tworzenie kopii zapasowej...');
    
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('✅ Utworzono folder backups/');
    }

    // Create timestamped backup folder
    const backupFolder = path.join(BACKUP_DIR, `backup_${timestamp}`);
    fs.mkdirSync(backupFolder, { recursive: true });
    console.log(`✅ Utworzono folder: ${backupFolder}`);

    // 1. Backup database
    console.log('\n📊 Tworzę kopię bazy danych...');
    const dbBackupFile = path.join(backupFolder, `database_${timestamp}.sql`);
    
    // Check if mysqldump is available
    const mysqldumpCmd = process.platform === 'win32' ? 'mysqldump' : 'mysqldump';
    
    const dumpCommand = `${mysqldumpCmd} -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${dbBackupFile}"`;
    
    try {
      await execPromise(dumpCommand, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
      console.log(`✅ Kopia bazy danych: ${dbBackupFile}`);
    } catch (error) {
      console.error('❌ Błąd mysqldump:', error.message);
      console.log('⚠️ Próbuję alternatywną metodę...');
      
      // Alternative: Use node-mysql to export data
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
      });

      let sqlDump = `-- Database Backup: ${DB_NAME}\n`;
      sqlDump += `-- Date: ${new Date().toISOString()}\n`;
      sqlDump += `-- Host: ${DB_HOST}\n\n`;
      sqlDump += `SET NAMES utf8mb4;\n`;
      sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

      // Get all tables
      const [tables] = await connection.execute('SHOW TABLES');
      
      for (const tableRow of tables) {
        const tableName = Object.values(tableRow)[0];
        console.log(`  - Eksportuję tabelę: ${tableName}`);
        
        // Get CREATE TABLE statement
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        sqlDump += `-- Table: ${tableName}\n`;
        sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlDump += createTable[0]['Create Table'] + ';\n\n';
        
        // Get table data
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
        
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          sqlDump += `-- Data for table: ${tableName}\n`;
          sqlDump += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n`;
          
          const values = rows.map(row => {
            const vals = columns.map(col => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'number') return val;
              if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
              return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
            });
            return `(${vals.join(', ')})`;
          });
          
          sqlDump += values.join(',\n') + ';\n\n';
        }
      }
      
      sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
      
      fs.writeFileSync(dbBackupFile, sqlDump, 'utf8');
      await connection.end();
      console.log(`✅ Kopia bazy danych (alternatywna metoda): ${dbBackupFile}`);
    }

    // 2. Backup application files
    console.log('\n📁 Tworzę kopię plików aplikacji...');
    const appBackupFolder = path.join(backupFolder, 'app');
    fs.mkdirSync(appBackupFolder, { recursive: true });

    // List of directories and files to backup
    const itemsToBackup = [
      'app.js',
      'package.json',
      'package-lock.json',
      'config',
      'models',
      'routes',
      'views',
      'public/css',
      'public/js',
      'public/images',
      'scripts',
      'env.development',
      'env.example'
    ];

    function copyRecursive(src, dest) {
      if (!fs.existsSync(src)) {
        console.log(`  ⚠️ Pomijam (nie istnieje): ${src}`);
        return;
      }

      const stat = fs.statSync(src);
      
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const items = fs.readdirSync(src);
        items.forEach(item => {
          copyRecursive(path.join(src, item), path.join(dest, item));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    }

    const rootDir = path.join(__dirname, '..');
    
    itemsToBackup.forEach(item => {
      const srcPath = path.join(rootDir, item);
      const destPath = path.join(appBackupFolder, item);
      
      console.log(`  - Kopiuję: ${item}`);
      try {
        copyRecursive(srcPath, destPath);
      } catch (error) {
        console.log(`  ⚠️ Błąd kopiowania ${item}:`, error.message);
      }
    });

    console.log(`✅ Kopia plików aplikacji: ${appBackupFolder}`);

    // 3. Backup uploads (separately, as they can be large)
    console.log('\n📦 Tworzę kopię plików użytkowników...');
    
    // 3a. Backup public/uploads
    const uploadsBackupFolder = path.join(backupFolder, 'uploads');
    const uploadsSrc = path.join(rootDir, 'public', 'uploads');
    
    if (fs.existsSync(uploadsSrc)) {
      copyRecursive(uploadsSrc, uploadsBackupFolder);
      console.log(`  ✅ uploads/ → ${getDirectorySize(uploadsBackupFolder)} bytes`);
    } else {
      console.log('  ⚠️ Folder public/uploads nie istnieje');
    }

    // 3b. Backup public/download
    const downloadBackupFolder = path.join(backupFolder, 'download');
    const downloadSrc = path.join(rootDir, 'public', 'download');
    
    if (fs.existsSync(downloadSrc)) {
      copyRecursive(downloadSrc, downloadBackupFolder);
      console.log(`  ✅ download/ → ${getDirectorySize(downloadBackupFolder)} bytes`);
    } else {
      console.log('  ⚠️ Folder public/download nie istnieje');
    }

    console.log('✅ Kopia plików użytkowników zakończona');

    // 4. Create backup info file
    const backupInfo = {
      date: new Date().toISOString(),
      timestamp: timestamp,
      database: {
        host: DB_HOST,
        name: DB_NAME,
        backup_file: `database_${timestamp}.sql`
      },
      application: {
        node_version: process.version,
        items_backed_up: itemsToBackup
      },
      backup_size: getDirectorySize(backupFolder)
    };

    fs.writeFileSync(
      path.join(backupFolder, 'backup_info.json'),
      JSON.stringify(backupInfo, null, 2),
      'utf8'
    );

    console.log('\n📦 Tworzę archiwum ZIP...');
    const zipPath = path.join(BACKUP_DIR, `backup_${timestamp}.zip`);
    await createZipArchive(backupFolder, zipPath);
    
    // Get ZIP file size
    const zipStats = fs.statSync(zipPath);
    const zipSize = zipStats.size;

    console.log(`✅ Archiwum ZIP utworzone: ${zipPath}`);
    console.log(`💾 Rozmiar ZIP: ${formatBytes(zipSize)}`);
    console.log(`📊 Kompresja: ${Math.round((1 - zipSize / backupInfo.backup_size) * 100)}%`);

    // Remove temporary folder
    console.log('\n🧹 Usuwam folder tymczasowy...');
    removeDirectory(backupFolder);
    console.log('✅ Folder tymczasowy usunięty');

    console.log('\n✅ KOPIA ZAPASOWA ZAKOŃCZONA POMYŚLNIE!');
    console.log(`📂 Lokalizacja: ${zipPath}`);
    console.log(`💾 Rozmiar: ${formatBytes(zipSize)}`);
    console.log(`📅 Data: ${new Date().toLocaleString('pl-PL')}`);
    
    return zipPath;

  } catch (error) {
    console.error('\n❌ BŁĄD podczas tworzenia kopii zapasowej:', error);
    throw error;
  }
}

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let size = 0;
  
  if (!fs.existsSync(dirPath)) return 0;
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      size += getDirectorySize(itemPath);
    } else {
      size += stat.size;
    }
  });
  
  return size;
}

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to create ZIP archive
function createZipArchive(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Helper function to remove directory recursively
function removeDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      removeDirectory(itemPath);
    } else {
      fs.unlinkSync(itemPath);
    }
  });
  
  fs.rmdirSync(dirPath);
}

// Run backup
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log('\n✨ Backup wykonany poprawnie!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Backup zakończony błędem:', error);
      process.exit(1);
    });
}

module.exports = { createBackup };

