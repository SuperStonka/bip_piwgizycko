class Page {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.slug = data.slug;
    this.content = data.content;
    this.metaDescription = data.metaDescription;
    this.metaKeywords = data.metaKeywords;
    this.isPublished = data.isPublished;
    this.isHomepage = data.isHomepage;
    this.menuOrder = data.menuOrder || 0;
    this.showInMenu = data.showInMenu !== undefined ? data.showInMenu : true;
    this.parentPage = data.parentPage;
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

  // Create page
  static async create(db, pageData) {
    const slug = pageData.slug || Page.generateSlug(pageData.title);
    
    const [result] = await db.execute(
      `INSERT INTO pages (title, slug, content, metaDescription, metaKeywords, isPublished, isHomepage, menuOrder, showInMenu, parentPage, createdBy, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        pageData.title, 
        slug, 
        pageData.content, 
        pageData.metaDescription || null, 
        pageData.metaKeywords || null,
        pageData.isPublished || false,
        pageData.isHomepage || false,
        pageData.menuOrder || 0,
        pageData.showInMenu !== undefined ? pageData.showInMenu : true,
        pageData.parentPage || null,
        pageData.createdBy
      ]
    );
    
    return result.insertId;
  }

  // Find page by slug
  static async findBySlug(db, slug) {
    const [rows] = await db.execute(
      'SELECT * FROM pages WHERE slug = ? AND isPublished = 1',
      [slug]
    );
    
    return rows.length > 0 ? new Page(rows[0]) : null;
  }

  // Find homepage
  static async findHomepage(db) {
    const [rows] = await db.execute(
      'SELECT * FROM pages WHERE isHomepage = 1 AND isPublished = 1 LIMIT 1'
    );
    
    return rows.length > 0 ? new Page(rows[0]) : null;
  }

  // Find all pages
  static async findAll(db) {
    const [rows] = await db.execute(
      'SELECT * FROM pages ORDER BY updatedAt DESC'
    );
    
    return rows.map(row => new Page(row));
  }

  // Find published pages
  static async findPublished(db) {
    const [rows] = await db.execute(
      'SELECT * FROM pages WHERE isPublished = 1 ORDER BY menuOrder ASC, title ASC'
    );
    
    return rows.map(row => new Page(row));
  }

  // Find page by ID
  static async findById(db, id) {
    const [rows] = await db.execute(
      'SELECT * FROM pages WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? new Page(rows[0]) : null;
  }

  // Update page
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
    if (updateData.content) {
      fields.push('content = ?');
      values.push(updateData.content);
    }
    if (updateData.metaDescription !== undefined) {
      fields.push('metaDescription = ?');
      values.push(updateData.metaDescription);
    }
    if (updateData.metaKeywords !== undefined) {
      fields.push('metaKeywords = ?');
      values.push(updateData.metaKeywords);
    }
    if (updateData.isPublished !== undefined) {
      fields.push('isPublished = ?');
      values.push(updateData.isPublished);
    }
    if (updateData.isHomepage !== undefined) {
      fields.push('isHomepage = ?');
      values.push(updateData.isHomepage);
    }
    if (updateData.menuOrder !== undefined) {
      fields.push('menuOrder = ?');
      values.push(updateData.menuOrder);
    }
    if (updateData.showInMenu !== undefined) {
      fields.push('showInMenu = ?');
      values.push(updateData.showInMenu);
    }
    if (updateData.parentPage !== undefined) {
      fields.push('parentPage = ?');
      values.push(updateData.parentPage);
    }
    
    if (fields.length > 0) {
      fields.push('updatedAt = NOW()');
      values.push(this.id);
      await db.execute(
        `UPDATE pages SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  // Delete page
  async delete(db) {
    await db.execute(
      'DELETE FROM pages WHERE id = ?',
      [this.id]
    );
  }
}

module.exports = Page;
