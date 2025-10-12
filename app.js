// Load environment variables
require('dotenv').config();

// TYMCZASOWA NAPRAWA PĘTLI PRZEKIEROWAŃ:
// - Wyłączono session-file-store (używany MemoryStore)
// - Wyłączono proxy w konfiguracji sesji
// - Te zmiany powinny rozwiązać problem z pętlą przekierowań
// - Po rozwiązaniu problemu można przywrócić oryginalną konfigurację

// Fallback for Phusion Passenger
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const IS_DEV = process.env.NODE_ENV === 'development';
// Debug environment variables (development only)
if (IS_DEV) {
  console.log('🔍 Environment Debug:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('APP_URL:', process.env.APP_URL);
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
}

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const dbConfig = require('./config/database');
const SiteSettings = require('./models/SiteSettings');
const MenuItems = require('./models/MenuItems');

// Helper function to generate breadcrumbs
function generateBreadcrumbs(path, query, menuStructure, articleTitle = null) {
  const breadcrumbs = [
    { title: 'Strona główna', url: '/', isActive: false }
  ];

  // Strona główna
  if (path === '/') {
    breadcrumbs[0].isActive = true;
    return breadcrumbs;
  }

  // Sprawdź czy to hierarchiczny URL (parent/child)
  const hierarchicalMatch = path.match(/^\/([^\/]+)\/(.+)$/);
  if (hierarchicalMatch) {
    const [, parentSlug, childSlug] = hierarchicalMatch;
    
    // Znajdź parent menu item
    const parentItem = menuStructure.find(item => item.slug === parentSlug);
    if (parentItem) {
      // Dodaj parent jako link
      breadcrumbs.push({
        title: parentItem.title,
        url: `/${parentItem.slug}`,
        isActive: false
      });
      
      // Najpierw sprawdź czy child to submenu item
      let childItem = null;
      if (parentItem.children) {
        childItem = parentItem.children.find(child => child.slug === childSlug);
      }
      
      if (childItem) {
        // To jest submenu item - dodaj go do breadcrumbs
        breadcrumbs.push({
          title: childItem.title,
          url: `/${parentItem.slug}/${childItem.slug}`,
          isActive: false
        });
        
        // Jeśli mamy tytuł artykułu, dodaj go jako aktywny
        if (articleTitle) {
          breadcrumbs.push({
            title: articleTitle,
            url: '',
            isActive: true
          });
        } else {
          // Jeśli nie ma tytułu artykułu, submenu item jest aktywny
          breadcrumbs[breadcrumbs.length - 1].isActive = true;
          breadcrumbs[breadcrumbs.length - 1].url = '';
        }
      } else {
        // Nie znaleziono submenu - może to jest bezpośredni artykuł
        let childTitle = childSlug;
        if (articleTitle) {
          childTitle = articleTitle;
        } else {
          // Fallback - formatuj slug
          childTitle = childSlug.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        }
        
        breadcrumbs.push({
          title: childTitle,
          url: '',
          isActive: true
        });
      }
      
      return breadcrumbs;
    }
  }

  // Znajdź odpowiedni element w menu (istniejąca logika)
  function findMenuItemByPath(items, searchPath, searchQuery = {}) {
    for (const item of items) {
      // Sprawdź czy to URL menu item (np. /menu/123)
      const menuMatch = searchPath.match(/^\/menu\/(\d+)$/);
      if (menuMatch) {
        const menuId = parseInt(menuMatch[1]);
        if (item.id === menuId) {
          return item;
        }
        // Sprawdź także w children
        if (item.children) {
          for (const child of item.children) {
            if (child.id === menuId) {
              return { parent: item, child: child };
            }
          }
        }
      }

      // NAJPIERW sprawdź dzieci (submenu) - to ma priorytet
      if (item.children && item.children.length > 0) {
        // Sprawdź czy to aktualności z parametrem kategoria
        if (item.slug === 'aktualnosci' && searchPath === '/aktualnosci' && searchQuery.kategoria) {
          // Dekoduj parametr kategoria z URL
          const decodedKategoria = decodeURIComponent(searchQuery.kategoria);
          const child = item.children.find(child => child.slug === decodedKategoria);
          if (child) {
            return { parent: item, child: child };
          }
        }
        
        // Sprawdź inne dzieci
        for (const child of item.children) {
          if (`/${child.slug}` === searchPath) {
            return { parent: item, child: child };
          }
        }
      }
      
      // DOPIERO POTEM sprawdź główną pozycję (tylko jeśli nie ma query parametrów)
      if (`/${item.slug}` === searchPath && Object.keys(searchQuery).length === 0) {
        return item;
      }
    }
    return null;
  }

  const foundItem = findMenuItemByPath(menuStructure, path, query);

  if (foundItem) {
    if (foundItem.parent && foundItem.child) {
      // Submenu - dodaj rodzica i dziecko
      breadcrumbs.push({
        title: foundItem.parent.title,
        url: `/${foundItem.parent.slug}`,
        isActive: false
      });
      breadcrumbs.push({
        title: foundItem.child.title,
        url: '',
        isActive: true
      });
    } else {
      // Główna pozycja
      breadcrumbs.push({
        title: foundItem.title,
        url: '',
        isActive: true
      });
    }
  } else {
    // Fallback - spróbuj na podstawie slug
    const slug = path.substring(1); // usuń '/' z początku
    
    if (slug) {
      // Capitalize pierwszą literę i zamień myślniki na spacje
      const title = slug.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      breadcrumbs.push({
        title: title,
        url: '',
        isActive: true
      });
    }
  }

  return breadcrumbs;
}

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || process.env.BASE_URL || `http://localhost:${PORT}`;

// Trust proxy for correct IP detection (important for view tracking)
app.set('trust proxy', true);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use EJS layouts
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Create reusable services and caches
app.locals.services = {
  siteSettings: null,
  menuItems: null
};

// Make database and site settings available to all views
app.use(async (req, res, next) => {
  res.locals.db = db;
  res.locals.appUrl = APP_URL;

  if (db) {
    try {
      // Initialize and reuse services
      if (!req.app.locals.services.siteSettings) {
        req.app.locals.services.siteSettings = new SiteSettings(db);
        // Short TTL cache 60s
        req.app.locals.services.siteSettings.cacheTime = 60 * 1000;
      }
      if (!req.app.locals.services.menuItems) {
        req.app.locals.services.menuItems = new MenuItems(db);
      }

      const siteSettings = req.app.locals.services.siteSettings;
      const menuItems = req.app.locals.services.menuItems;

      const settings = await siteSettings.getAll();
      const menuStructure = await menuItems.getMenuStructure();

      res.locals.siteSettings = settings;
      res.locals.menuStructure = menuStructure;
      res.locals.menuItems = menuItems;

      // Breadcrumbs - przekaż articleTitle jeśli dostępny
      res.locals.breadcrumbs = generateBreadcrumbs(
        req.path,
        req.query,
        menuStructure,
        res.locals.articleTitle
      );

      // Log only once in development
      if (IS_DEV && Object.keys(settings).length > 0 && !req.app.locals.dataLogged) {
        console.log(`✅ SiteSettings załadowane: ${Object.keys(settings).length} ustawień`);
        console.log(`✅ Menu załadowane: ${menuStructure.length} pozycji głównych`);
        req.app.locals.dataLogged = true;
      }
    } catch (error) {
      console.error('Błąd ładowania danych strony:', error);
      res.locals.siteSettings = {};
      res.locals.menuStructure = [];
      res.locals.menuItems = null;
      res.locals.breadcrumbs = generateBreadcrumbs(req.path, req.query, [], res.locals.articleTitle);
    }
  } else {
    if (IS_DEV) console.log('Brak połączenia z bazą - używam pustych ustawień');
    res.locals.siteSettings = {};
    res.locals.menuStructure = [];
    res.locals.menuItems = null;
    res.locals.breadcrumbs = generateBreadcrumbs(req.path, req.query, []);
  }

  next();
});

// Middleware
const crypto = require('crypto');

// Generate nonce for each request
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      scriptSrc: [
        "'self'", 
        'https://cdn.jsdelivr.net',
        // Allow unsafe-inline in development, use nonce in production
        ...(IS_DEV ? ["'unsafe-inline'"] : [(req, res) => `'nonce-${res.locals.cspNonce}'`])
      ],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    },
  },
}));
app.use(compression());
// Trust proxy (required for correct IP and HTTPS detection behind Nginx)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'bip.sid', // Custom session name
  cookie: { 
    secure: false, // Set to false for HTTP, even in production (Nginx handles HTTPS)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    domain: undefined // Don't set domain explicitly
  }
};

// TYMCZASOWO: Wyłącz proxy i FileStore aby rozwiązać problem z pętlą przekierowań
// if (process.env.NODE_ENV === 'production') {
//   sessionConfig.proxy = true;
// }

// TYMCZASOWO: Używaj MemoryStore dla wszystkich środowisk (bez FileStore)
console.log('✅ Using MemoryStore for sessions (temporary fix for redirect loop)');
// if (process.env.NODE_ENV === 'production') {
//   try {
//     const FileStore = require('session-file-store')(session);
//     sessionConfig.store = new FileStore({
//       path: './sessions',
//       ttl: 24 * 60 * 60, // 24 hours
//       retries: 5
//     });
//     if (IS_DEV) console.log('✅ Using FileStore for sessions (production)');
//   } catch (error) {
//     console.log('⚠️  FileStore not available, using MemoryStore (not recommended for production)');
//   }
// } else {
//   if (IS_DEV) console.log('✅ Using MemoryStore for sessions (development)');
// }

app.use(session(sessionConfig));

// Debug middleware - log session info (remove in production)
if (IS_DEV || process.env.DEBUG_SESSIONS === 'true') {
  app.use((req, res, next) => {
    console.log('Session Debug:', {
      path: req.path,
      method: req.method,
      hasSession: !!req.session,
      sessionID: req.session?.id,
      cookie: req.session?.cookie,
      headers: {
        host: req.headers.host,
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-for': req.headers['x-forwarded-for']
      }
    });
    next();
  });
}

// Database connection
let db = null;

async function connectToDatabase() {
  try {
    db = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      connectionLimit: dbConfig.connectionLimit || 10,
      charset: dbConfig.charset || 'utf8mb4'
    });
    
    // Test connection
    const connection = await db.getConnection();
    if (IS_DEV) {
      console.log('✅ Połączono z bazą danych MySQL');
      console.log('📊 Baza danych:', dbConfig.database);
      console.log('🌐 Host:', dbConfig.host);
      console.log('👤 Użytkownik:', dbConfig.user);
      console.log('🔌 Port:', dbConfig.port);
    }
    connection.release();
  } catch (err) {
    console.error('❌ Błąd połączenia z MySQL:', err.message);
    if (IS_DEV) console.log('⚠️  Aplikacja będzie działać bez bazy danych (tryb offline)');
  }
}

// Initialize database connection
connectToDatabase();

// Database check middleware for admin routes
app.use('/admin', (req, res, next) => {
  if (!db) {
    return res.status(503).send(`
      <html>
        <head><title>Service Unavailable</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px">
          <h1>Database Connection Error</h1>
          <p>The application is starting up. Please refresh in a moment.</p>
          <script>setTimeout(() => location.reload(), 3000);</script>
        </body>
      </html>
    `);
  }
  next();
});

// Routes (mount admin BEFORE main to avoid catch-all :slug capturing /admin)
app.use('/admin', require('./routes/admin'));

// API Routes (must be defined BEFORE main routes to avoid catch-all conflicts)
app.post('/api/article/:id/view', async (req, res) => {
  try {
    console.log('API route hit: /api/article/:id/view');
    console.log('Request params:', req.params);
    console.log('Database available:', !!req.app.locals.db);
    
    const articleId = parseInt(req.params.id);
    if (!articleId || isNaN(articleId)) {
      console.log('Invalid article ID:', req.params.id);
      return res.status(400).json({ success: false, message: 'Invalid article ID' });
    }

    if (!req.app.locals.db) {
      console.log('Database not available');
      return res.status(503).json({ success: false, message: 'Database not available' });
    }

    console.log('Updating view count for article:', articleId);
    
    // Update view count in database
    await req.app.locals.db.execute(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [articleId]
    );

    // Get updated view count
    const [rows] = await req.app.locals.db.execute(
      'SELECT view_count FROM articles WHERE id = ?',
      [articleId]
    );

    const viewCount = rows[0] ? rows[0].view_count : 0;
    console.log('Updated view count:', viewCount);

    res.json({ 
      success: true, 
      viewCount: viewCount,
      message: 'View count updated successfully' 
    });
  } catch (error) {
    console.error('Error updating article view count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.use('/', require('./routes/main'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Błąd serwera',
    message: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Strona nie znaleziona',
    message: 'Strona, której szukasz, nie została znaleziona.',
    error: {}
  });
});

// Initialize view counter store and cleanup
app.locals.articleViews = new Map();
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, lastViewTs] of app.locals.articleViews.entries()) {
    if (typeof lastViewTs === 'number' && (now - lastViewTs) > ONE_HOUR_MS) {
      app.locals.articleViews.delete(key);
    }
  }
}, 10 * 60 * 1000); // cleanup every 10 minutes

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
  if (IS_DEV) console.log(`Aplikacja dostępna pod adresem: http://localhost:${PORT}`);
});

module.exports = app;
