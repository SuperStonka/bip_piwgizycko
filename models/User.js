const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.firstName = data.imie;
    this.lastName = data.nazwisko;
    this.email = data.email;
    this.password = data.password_hash;
    this.role = data.role || 'editor';
    this.isActive = true; // Always true since there's no isActive column
    this.lastLogin = null; // No lastLogin column
    this.createdAt = data.created_at;
  }

  // Hash password
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Create user
  static async create(db, userData) {
    const hashedPassword = await User.hashPassword(userData.password);
    
    const [result] = await db.execute(
      `INSERT INTO users (username, imie, nazwisko, email, password_hash, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userData.username, userData.firstName || '', userData.lastName || '', userData.email, hashedPassword, userData.role || 'editor']
    );
    
    return result.insertId;
  }

  // Find user by username
  static async findByUsername(db, username) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  // Find user by email
  static async findByEmail(db, email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  // Find user by ID
  static async findById(db, id) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? new User(rows[0]) : null;
  }

  // Find user by role
  static async findByRole(db, role) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE role = ?',
      [role]
    );
    
    return rows.map(row => new User(row));
  }

  // Update last login - not available in current schema
  async updateLastLogin(db) {
    // No lastLogin column in current schema
    return;
  }

  // Update user
  async update(db, updateData) {
    const fields = [];
    const values = [];
    
    if (updateData.username) {
      fields.push('username = ?');
      values.push(updateData.username);
    }
    if (updateData.firstName !== undefined) {
      fields.push('imie = ?');
      values.push(updateData.firstName);
    }
    if (updateData.lastName !== undefined) {
      fields.push('nazwisko = ?');
      values.push(updateData.lastName);
    }
    if (updateData.email) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.password) {
      const hashedPassword = await User.hashPassword(updateData.password);
      fields.push('password_hash = ?');
      values.push(hashedPassword);
    }
    if (updateData.role) {
      fields.push('role = ?');
      values.push(updateData.role);
    }
    
    if (fields.length > 0) {
      values.push(this.id);
      await db.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  // Delete user - not available in current schema
  async delete(db) {
    // No isActive column in current schema, so we can't soft delete
    // This would require actual DELETE or adding isActive column
    return;
  }
}

module.exports = User;
