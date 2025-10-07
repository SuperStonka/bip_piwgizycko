const mysql = require('mysql2/promise');

class Article {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.slug = data.slug;
    this.content = data.content;
    this.excerpt = data.excerpt;
    this.status = data.status || 'draft';
    this.menuCategory = data.menu_category;
    this.responsiblePerson = data.responsible_person;
    this.createdBy = data.created_by;
    this.publishedBy = data.published_by;
    this.updatedBy = data.updated_by;
    this.publishedAt = data.published_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.viewCount = data.view_count || 0;
    this.menuItemId = data.menu_item_id;
  }

  // Generate slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Create article
  static async create(db, articleData) {
    const slug = articleData.slug || Article.generateSlug(articleData.title);
    
    const [result] = await db.execute(
      `INSERT INTO articles (title, slug, content, excerpt, status, menu_category, responsible_person, created_by, published_by, updated_by, published_at, created_at, updated_at, menu_item_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
      [
        articleData.title, 
        slug, 
        articleData.content, 
        articleData.excerpt || null, 
        articleData.status || 'draft',
        articleData.menuCategory || null,
        articleData.responsiblePerson || null,
        articleData.createdBy,
        articleData.publishedBy || null,
        articleData.updatedBy || null,
        articleData.status === 'published' ? new Date() : null,
        articleData.menuItemId || null
      ]
    );
    
    return result.insertId;
  }

  // Find article by slug
  static async findBySlug(db, slug) {
    const [rows] = await db.execute(
      'SELECT * FROM articles WHERE slug = ? AND status = "published"',
      [slug]
    );
    
    return rows.length > 0 ? new Article(rows[0]) : null;
  }

  // Find article by ID
  static async findById(db, id) {
    const [rows] = await db.execute(
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? new Article(rows[0]) : null;
  }

  // Find all articles
  static async findAll(db) {
    const [rows] = await db.execute(
      'SELECT * FROM articles ORDER BY updated_at DESC'
    );
    
    return rows.map(row => new Article(row));
  }

  // Find published articles
  static async findPublished(db, limit = null, offset = 0) {
    let query = 'SELECT * FROM articles WHERE status = "published" ORDER BY published_at DESC, created_at DESC';
    const params = [];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const [rows] = await db.execute(query, params);
    return rows.map(row => new Article(row));
  }

  // Find articles by menu item ID
  static async findByMenuItemId(db, menuItemId, limit = null, offset = 0) {
    let query = 'SELECT * FROM articles WHERE menu_item_id = ? AND status = "published" ORDER BY published_at DESC, created_at DESC';
    const params = [menuItemId];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const [rows] = await db.execute(query, params);
    return rows.map(row => new Article(row));
  }

  // Find articles by category
  static async findByCategory(db, category, limit = null, offset = 0) {
    let query = 'SELECT * FROM articles WHERE menu_category = ? AND status = "published" ORDER BY published_at DESC, created_at DESC';
    const params = [category];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const [rows] = await db.execute(query, params);
    return rows.map(row => new Article(row));
  }

  // Count published articles
  static async countPublished(db, category = null) {
    let query = 'SELECT COUNT(*) as count FROM articles WHERE status = "published"';
    const params = [];
    
    if (category) {
      query += ' AND menu_category = ?';
      params.push(category);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  // Count articles by menu item ID
  static async countByMenuItemId(db, menuItemId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM articles WHERE menu_item_id = ? AND status = "published"',
      [menuItemId]
    );
    return rows[0].count;
  }

  // Search articles
  static async search(db, searchTerm, limit = 10, offset = 0) {
    const [rows] = await db.execute(
      `SELECT * FROM articles 
       WHERE status = "published" 
       AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?) 
       ORDER BY published_at DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit, offset]
    );
    
    return rows.map(row => new Article(row));
  }

  // Increment view count
  async incrementViews(db) {
    await db.execute(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [this.id]
    );
    this.viewCount++;
  }

  // Static method to increment view count by ID
  static async incrementViewCount(db, articleId) {
    await db.execute(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [articleId]
    );
  }

  // Update article
  async update(db, updateData) {
    const fields = [];
    const values = [];
    
    if (updateData.title) {
      fields.push('title = ?');
      values.push(updateData.title);
    }
    if (updateData.slug) {
      fields.push('slug = ?');
      values.push(updateData.slug);
    }
    if (updateData.content !== undefined) {
      fields.push('content = ?');
      values.push(updateData.content);
    }
    if (updateData.excerpt !== undefined) {
      fields.push('excerpt = ?');
      values.push(updateData.excerpt);
    }
    if (updateData.status) {
      fields.push('status = ?');
      values.push(updateData.status);
      
      // Update published_at when status changes to published
      if (updateData.status === 'published' && this.status !== 'published') {
        fields.push('published_at = NOW()');
      }
    }
    if (updateData.menuCategory !== undefined) {
      fields.push('menu_category = ?');
      values.push(updateData.menuCategory);
    }
    if (updateData.responsiblePerson !== undefined) {
      fields.push('responsible_person = ?');
      values.push(updateData.responsiblePerson);
    }
    if (updateData.publishedBy !== undefined) {
      fields.push('published_by = ?');
      values.push(updateData.publishedBy);
    }
    if (updateData.updatedBy !== undefined) {
      fields.push('updated_by = ?');
      values.push(updateData.updatedBy);
    }
    if (updateData.menuItemId !== undefined) {
      fields.push('menu_item_id = ?');
      values.push(updateData.menuItemId);
    }
    
    if (fields.length > 0) {
      values.push(this.id);
      await db.execute(
        `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  // Delete article
  async delete(db) {
    await db.execute(
      'DELETE FROM articles WHERE id = ?',
      [this.id]
    );
  }

  // Get recent articles
  static async getRecent(db, limit = 5) {
    const [rows] = await db.execute(
      'SELECT * FROM articles WHERE status = "published" ORDER BY published_at DESC, created_at DESC LIMIT ?',
      [limit]
    );
    
    return rows.map(row => new Article(row));
  }

  // Get articles for sitemap
  static async getAllForSitemap(db) {
    const [rows] = await db.execute(
      'SELECT slug, updated_at FROM articles WHERE status = "published" ORDER BY updated_at DESC'
    );
    
    return rows;
  }
}

module.exports = Article;
