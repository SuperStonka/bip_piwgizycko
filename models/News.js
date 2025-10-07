class News {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.slug = data.slug;
    this.excerpt = data.excerpt;
    this.content = data.content;
    this.featuredImage = data.featuredImage ? JSON.parse(data.featuredImage) : null;
    this.category = data.category || 'Aktualności';
    this.isPublished = data.isPublished;
    this.isFeatured = data.isFeatured;
    this.publishDate = data.publishDate;
    this.views = data.views || 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
  }

  // Generate slug from title
  static generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Create news
  static async create(db, newsData) {
    const slug = newsData.slug || News.generateSlug(newsData.title);
    const featuredImage = newsData.featuredImage ? JSON.stringify(newsData.featuredImage) : null;
    
    const [result] = await db.execute(
      `INSERT INTO news (title, slug, excerpt, content, featuredImage, category, isPublished, isFeatured, publishDate, views, createdBy, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        newsData.title, 
        slug, 
        newsData.excerpt || null, 
        newsData.content, 
        featuredImage,
        newsData.category || 'Aktualności',
        newsData.isPublished || false,
        newsData.isFeatured || false,
        newsData.publishDate || new Date(),
        newsData.views || 0,
        newsData.createdBy
      ]
    );
    
    return result.insertId;
  }

  // Find news by slug
  static async findBySlug(db, slug) {
    const [rows] = await db.execute(
      'SELECT * FROM news WHERE slug = ? AND isPublished = 1',
      [slug]
    );
    
    return rows.length > 0 ? new News(rows[0]) : null;
  }

  // Find all news
  static async findAll(db) {
    const [rows] = await db.execute(
      'SELECT * FROM news ORDER BY updatedAt DESC'
    );
    
    return rows.map(row => new News(row));
  }

  // Find published news
  static async findPublished(db, limit = null, offset = 0) {
    let query = 'SELECT * FROM news WHERE isPublished = 1 ORDER BY publishDate DESC';
    const params = [];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const [rows] = await db.execute(query, params);
    return rows.map(row => new News(row));
  }

  // Find featured news
  static async findFeatured(db, limit = 3) {
    const [rows] = await db.execute(
      'SELECT * FROM news WHERE isPublished = 1 AND isFeatured = 1 ORDER BY publishDate DESC LIMIT ?',
      [limit]
    );
    
    return rows.map(row => new News(row));
  }

  // Find news by category
  static async findByCategory(db, category, limit = null, offset = 0) {
    let query = 'SELECT * FROM news WHERE isPublished = 1 AND category = ? ORDER BY publishDate DESC';
    const params = [category];
    
    if (limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const [rows] = await db.execute(query, params);
    return rows.map(row => new News(row));
  }

  // Find news by ID
  static async findById(db, id) {
    const [rows] = await db.execute(
      'SELECT * FROM news WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? new News(rows[0]) : null;
  }

  // Count published news
  static async countPublished(db, category = null) {
    let query = 'SELECT COUNT(*) as count FROM news WHERE isPublished = 1';
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  // Update views
  async incrementViews(db) {
    await db.execute(
      'UPDATE news SET views = views + 1 WHERE id = ?',
      [this.id]
    );
    this.views += 1;
  }

  // Update news
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
    if (updateData.excerpt !== undefined) {
      fields.push('excerpt = ?');
      values.push(updateData.excerpt);
    }
    if (updateData.content) {
      fields.push('content = ?');
      values.push(updateData.content);
    }
    if (updateData.featuredImage !== undefined) {
      fields.push('featuredImage = ?');
      values.push(updateData.featuredImage ? JSON.stringify(updateData.featuredImage) : null);
    }
    if (updateData.category) {
      fields.push('category = ?');
      values.push(updateData.category);
    }
    if (updateData.isPublished !== undefined) {
      fields.push('isPublished = ?');
      values.push(updateData.isPublished);
    }
    if (updateData.isFeatured !== undefined) {
      fields.push('isFeatured = ?');
      values.push(updateData.isFeatured);
    }
    if (updateData.publishDate) {
      fields.push('publishDate = ?');
      values.push(updateData.publishDate);
    }
    
    if (fields.length > 0) {
      fields.push('updatedAt = NOW()');
      values.push(this.id);
      await db.execute(
        `UPDATE news SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  // Delete news
  async delete(db) {
    await db.execute(
      'DELETE FROM news WHERE id = ?',
      [this.id]
    );
  }
}

module.exports = News;
