const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const MenuItems = require('../models/MenuItems');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper: load current user into request (from session)
async function loadCurrentUser(req, res, next) {
  // Skip if no session or no database connection
  if (!req.session || !res.locals.db) {
    req.currentUser = null;
    return next();
  }
  
  // Skip if no userId in session
  if (!req.session.userId) {
    req.currentUser = null;
    return next();
  }
  
  try {
    const user = await User.findById(res.locals.db, req.session.userId);
    req.currentUser = user;
  } catch (e) {
    console.error('Error loading user:', e.message);
    req.currentUser = null;
    // Clear invalid session
    if (req.session) {
      req.session.userId = null;
    }
  }
  next();
}

// Auth guard for admin/editor roles
function requireEditor(req, res, next) {
  // Prevent redirect loop - check if already on login page
  if (req.path === '/login') {
    return next();
  }
  
  if (req.currentUser && (req.currentUser.role === 'admin' || req.currentUser.role === 'editor')) {
    return next();
  }
  
  // Only redirect if not already going to login
  if (req.path !== '/login') {
    return res.redirect('/admin/login');
  }
  
  next();
}

router.use(loadCurrentUser);

// Login page
router.get('/login', (req, res) => {
  // Debug logging
  console.log('Login page accessed:', {
    hasSession: !!req.session,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    hasCurrentUser: !!req.currentUser,
    currentUserRole: req.currentUser?.role
  });
  
  // Prevent redirect loop
  if (req.currentUser) {
    console.log('User already logged in, redirecting to /admin');
    return res.redirect('/admin');
  }
  
  res.render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny' });
});

// Debug endpoint to check users (remove in production)
router.get('/debug/users', async (req, res) => {
  try {
    if (!res.locals.db) {
      return res.json({ error: 'Database not available' });
    }
    
    const [rows] = await res.locals.db.execute('SELECT id, username, role, imie, nazwisko FROM users');
    res.json({ users: rows });
  } catch (e) {
    console.error('Debug users error:', e);
    res.json({ error: e.message });
  }
});

// Login submit
router.post('/login', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
    console.log('Database available:', !!res.locals.db);
    
    const { username, password } = req.body;
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Podaj login i hasło.' });
    }
    
    if (!res.locals.db) {
      console.log('Database not available for login');
      return res.status(503).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Baza danych niedostępna.' });
    }
    
    const user = await User.findByUsername(res.locals.db, username);
    console.log('User found:', !!user, user ? { id: user.id, username: user.username, role: user.role, hasPassword: !!user.password } : 'not found');
    
    if (!user) {
      console.log('User not found for username:', username);
      return res.status(401).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Nieprawidłowe dane logowania.' });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', ok);
    
    if (!ok) {
      console.log('Password mismatch for user:', username);
      return res.status(401).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Nieprawidłowe dane logowania.' });
    }
    
    // Role check: admin/editor allowed
    if (user.role !== 'admin' && user.role !== 'editor') {
      console.log('Insufficient role for user:', username, 'role:', user.role);
      return res.status(403).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Brak uprawnień do panelu.' });
    }
    
    console.log('Login successful for user:', username, 'role:', user.role);
    
    // Save session explicitly
    req.session.userId = user.id;
    req.session.role = user.role;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).render('admin/login', { 
          layout: false, 
          title: 'Logowanie - Panel administracyjny', 
          error: 'Błąd zapisywania sesji.' 
        });
      }
      console.log('Session saved successfully:', {
        sessionId: req.session.id,
        userId: req.session.userId,
        role: req.session.role
      });
      return res.redirect('/admin');
    });
  } catch (e) {
    console.error('Admin login error:', e);
    return res.status(500).render('admin/login', { layout: false, title: 'Logowanie - Panel administracyjny', error: 'Błąd serwera.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/admin/login');
    });
  } else {
    res.redirect('/admin/login');
  }
});

// Admin dashboard (protected)
router.get('/', requireEditor, async (req, res) => {
  try {
    const Article = require('../models/Article');
    const User = require('../models/User');
    const recentArticles = res.locals.db ? await Article.getRecent(res.locals.db, 10) : [];

    // Attach editor full name from users table based on updated_by
    if (res.locals.db && recentArticles.length) {
      for (const a of recentArticles) {
        if (a.updatedBy) {
          const editor = await User.findById(res.locals.db, a.updatedBy);
          if (editor) {
            a.lastEditedByName = [editor.firstName, editor.lastName].filter(Boolean).join(' ').trim();
          }
        }
      }
    }

    // Stats
    let stats = { totalArticles: 0, published: 0, drafts: 0, totalViews: 0 };
    if (res.locals.db) {
      // Total
      const [allCountRows] = await res.locals.db.execute('SELECT COUNT(*) AS count FROM articles');
      stats.totalArticles = allCountRows[0]?.count || 0;
      // Published
      stats.published = await Article.countPublished(res.locals.db);
      // Drafts
      const [draftCountRows] = await res.locals.db.execute('SELECT COUNT(*) AS count FROM articles WHERE status = "draft"');
      stats.drafts = draftCountRows[0]?.count || 0;
      // Total views
      const [viewSumRows] = await res.locals.db.execute('SELECT COALESCE(SUM(view_count),0) AS views FROM articles');
      stats.totalViews = viewSumRows[0]?.views || 0;
    }
    res.render('admin/dashboard', {
      layout: false,
      title: 'Panel administracyjny',
      adminUser: req.currentUser,
      recentArticles,
      stats
    });
  } catch (e) {
    console.error('Admin dashboard load error:', e);
    res.render('admin/dashboard', {
      layout: false,
      title: 'Panel administracyjny',
      adminUser: req.currentUser,
      recentArticles: [],
      stats: { totalArticles: 0, published: 0, drafts: 0, totalViews: 0 }
    });
  }
});

// Articles
router.get('/articles', requireEditor, async (req, res) => {
  try {
    const Article = require('../models/Article');
    const User = require('../models/User');
    const articleList = res.locals.db ? await Article.findAll(res.locals.db) : [];
    // Resolve author names for createdBy
    if (res.locals.db && articleList.length) {
      const menu = new MenuItems(res.locals.db);
      for (const a of articleList) {
        if (a.createdBy) {
          const author = await User.findById(res.locals.db, a.createdBy);
          if (author) {
            a.authorName = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
          }
        }
        if (a.menuItemId) {
          const mi = await menu.findByIdAny(a.menuItemId);
          if (mi) a.menuItemTitle = mi.title;
        }
      }
    }
    res.render('admin/articles', {
      layout: false,
      title: 'Artykuły — Panel administracyjny',
      adminUser: req.currentUser,
      articleList,
      query: req.query
    });
  } catch (e) {
    console.error('Admin articles load error:', e);
    res.render('admin/articles', {
      layout: false,
      title: 'Artykuły — Panel administracyjny',
      adminUser: req.currentUser,
      articleList: [],
      query: req.query
    });
  }
});

// New article form
router.get('/articles/new', requireEditor, async (req, res) => {
  const MenuItems = require('../models/MenuItems');
  const User = require('../models/User');
  const menu = new MenuItems(res.locals.db);
  const allMenu = await menu.getAll(); // active list for selection
  const [rows] = await res.locals.db.execute('SELECT id, imie, nazwisko, username FROM users ORDER BY imie, nazwisko');
  res.render('admin/article-form', {
    layout: false,
    title: 'Dodaj artykuł — Panel administracyjny',
    adminUser: req.currentUser,
    mode: 'create',
    article: { title: '', slug: '', content: '', status: 'draft', menuItemId: '', excerpt: '' },
    menuItems: allMenu,
    usersList: rows
  });
});

// Create article
router.post('/articles', requireEditor, express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const Article = require('../models/Article');
    const [miRows] = await res.locals.db.execute('SELECT id, title, display_mode FROM menu_items WHERE id = ?', [req.body.menu_item_id || null]);
    if (miRows && miRows[0] && miRows[0].display_mode === 'single') {
      const [existing] = await res.locals.db.execute('SELECT id, title FROM articles WHERE menu_item_id = ? LIMIT 1', [miRows[0].id]);
      if (existing && existing[0]) {
        const link = `/admin/articles/${existing[0].id}/edit`;
        const errHtml = `Dla pozycji menu "${miRows[0].title}" można dodać tylko jeden artykuł. <a href="${link}">Przejdź do edycji istniejącego artykułu</a>.`;
        return res.status(400).render('admin/article-form', { layout: false, title: 'Dodaj artykuł — Panel administracyjny', adminUser: req.currentUser, mode: 'create', article: req.body, menuItems: await (new (require('../models/MenuItems'))(res.locals.db)).getAll(), usersList: (await res.locals.db.execute('SELECT id, imie, nazwisko, username FROM users ORDER BY imie, nazwisko'))[0], error: errHtml });
      }
    }
    const payload = {
      title: req.body.title,
      content: req.body.content || '',
      excerpt: req.body.excerpt || null,
      status: req.body.status || 'draft',
      menuCategory: null,
      responsiblePerson: null,
      createdBy: req.currentUser?.id,
      publishedBy: req.currentUser?.id,
      updatedBy: req.currentUser?.id,
      menuItemId: req.body.menu_item_id ? parseInt(req.body.menu_item_id, 10) : null
    };
    await Article.create(res.locals.db, payload);
    res.redirect('/admin/articles?created=1');
  } catch (e) {
    console.error('Create article error:', e);
    res.status(500).render('admin/article-form', { layout: false, title: 'Dodaj artykuł — Panel administracyjny', adminUser: req.currentUser, mode: 'create', article: req.body, error: 'Błąd zapisu.' });
  }
});

// Edit article form
router.get('/articles/:id/edit', requireEditor, async (req, res) => {
  try {
    const Article = require('../models/Article');
    const MenuItems = require('../models/MenuItems');
    const [rows] = await res.locals.db.execute('SELECT id, imie, nazwisko, username FROM users ORDER BY imie, nazwisko');
    const article = await Article.findById(res.locals.db, req.params.id);
    if (!article) return res.status(404).render('admin/article-form', { layout: false, title: 'Nie znaleziono', adminUser: req.currentUser, mode: 'edit', article: {}, error: 'Artykuł nie istnieje.' });
    const menu = new MenuItems(res.locals.db);
    const allMenu = await menu.getAll();
    // Article versions for history
    const [versions] = await res.locals.db.execute(
      `SELECT v.id, v.created_at, v.updated_by, u.username, u.imie, u.nazwisko
       FROM article_versions v
       LEFT JOIN users u ON u.id = v.updated_by
       WHERE v.article_id = ? ORDER BY v.created_at DESC`,
      [article.id]
    );
    res.render('admin/article-form', { layout: false, title: 'Edytuj artykuł — Panel administracyjny', adminUser: req.currentUser, mode: 'edit', article, menuItems: allMenu, usersList: rows, versions, query: req.query });
  } catch (e) {
    console.error('Edit form load error:', e);
    res.status(500).render('admin/article-form', { layout: false, title: 'Edytuj artykuł — Panel administracyjny', adminUser: req.currentUser, mode: 'edit', article: {}, error: 'Błąd.' });
  }
});

// Update article
router.post('/articles/:id', requireEditor, express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const Article = require('../models/Article');
    const article = await Article.findById(res.locals.db, req.params.id);
    if (!article) return res.status(404).send('Not found');
    // Guard for single display_mode
    if (req.body.menu_item_id) {
      const [miRows] = await res.locals.db.execute('SELECT id, title, display_mode FROM menu_items WHERE id = ?', [req.body.menu_item_id]);
      if (miRows && miRows[0] && miRows[0].display_mode === 'single') {
        const [existing] = await res.locals.db.execute('SELECT id, title FROM articles WHERE menu_item_id = ? AND id <> ? LIMIT 1', [miRows[0].id, article.id]);
        if (existing && existing[0]) {
          const link = `/admin/articles/${existing[0].id}/edit`;
          const errHtml = `Dla pozycji menu "${miRows[0].title}" można dodać tylko jeden artykuł. <a href="${link}">Przejdź do edycji istniejącego artykułu</a>.`;
          return res.status(400).render('admin/article-form', { layout: false, title: 'Edytuj artykuł — Panel administracyjny', adminUser: req.currentUser, mode: 'edit', article: { ...article, ...req.body }, menuItems: await (new (require('../models/MenuItems'))(res.locals.db)).getAll(), usersList: (await res.locals.db.execute('SELECT id, imie, nazwisko, username FROM users ORDER BY imie, nazwisko'))[0], error: errHtml });
        }
      }
    }
    await article.update(res.locals.db, {
      title: req.body.title,
      content: req.body.content,
      excerpt: req.body.excerpt,
      status: req.body.status,
      updatedBy: req.currentUser?.id,
      menuItemId: req.body.menu_item_id ? parseInt(req.body.menu_item_id, 10) : null
    });
    // Save version history (match SQL schema: version_number, no status/menu_item_id)
    try {
      const [vRows] = await res.locals.db.execute('SELECT COALESCE(MAX(version_number),0)+1 AS v FROM article_versions WHERE article_id = ?', [article.id]);
      const versionNumber = (vRows && vRows[0] && vRows[0].v) ? vRows[0].v : 1;
      await res.locals.db.execute(
        `INSERT INTO article_versions (article_id, version_number, title, content, excerpt, updated_by, change_summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          article.id,
          versionNumber,
          req.body.title,
          req.body.content || '',
          req.body.excerpt || null,
          req.currentUser ? req.currentUser.id : null,
          'Update'
        ]
      );
    } catch (e) {
      console.error('article_versions insert error:', e);
    }
    res.redirect('/admin/articles?updated=1');
  } catch (e) {
    console.error('Update article error:', e);
    res.status(500).send('Error');
  }
});

// Get version JSON (preview)
router.get('/articles/:id/versions/:versionId', requireEditor, async (req, res) => {
  try {
    const [rows] = await res.locals.db.execute('SELECT * FROM article_versions WHERE id = ? AND article_id = ?', [req.params.versionId, req.params.id]);
    if (!rows || !rows[0]) return res.status(404).json({ ok:false });
    res.json({ ok:true, version: rows[0] });
  } catch (e) {
    res.status(500).json({ ok:false });
  }
});

// Restore version
router.post('/articles/:id/versions/:versionId/restore', requireEditor, async (req, res) => {
  try {
    const [rows] = await res.locals.db.execute('SELECT * FROM article_versions WHERE id = ? AND article_id = ?', [req.params.versionId, req.params.id]);
    if (!rows || !rows[0]) return res.status(404).json({ ok:false });
    const v = rows[0];
    // Update article with version content (schema of versions does not have status/menu_item_id)
    await res.locals.db.execute(
      `UPDATE articles SET title=?, content=?, excerpt=?, updated_by=?, updated_at=NOW() WHERE id=?`,
      [v.title, v.content, v.excerpt, req.currentUser?.id || null, req.params.id]
    );
    // Save new version snapshot (the restore action itself)
    const [vRows] = await res.locals.db.execute('SELECT COALESCE(MAX(version_number),0)+1 AS v FROM article_versions WHERE article_id = ?', [req.params.id]);
    const versionNumber = (vRows && vRows[0] && vRows[0].v) ? vRows[0].v : 1;
    await res.locals.db.execute(
      `INSERT INTO article_versions (article_id, version_number, title, content, excerpt, updated_by, change_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [req.params.id, versionNumber, v.title, v.content, v.excerpt, req.currentUser?.id || null, 'Restore']
    );
    res.json({ ok:true });
  } catch (e) {
    console.error('restore version error', e);
    res.status(500).json({ ok:false });
  }
});

// Delete article
router.post('/articles/:id/delete', requireEditor, async (req, res) => {
  try {
    const Article = require('../models/Article');
    const article = await Article.findById(res.locals.db, req.params.id);
    if (!article) return res.status(404).json({ ok: false });
    // delete versions first to keep FK integrity (if any)
    try { await res.locals.db.execute('DELETE FROM article_versions WHERE article_id = ?', [req.params.id]); } catch (_) {}
    await article.delete(res.locals.db);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete article error:', e);
    res.status(500).json({ ok: false });
  }
});

// Upload endpoints for editor (images/files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isImage = /^image\//.test(file.mimetype);
    // Images -> public/uploads, files -> public/downloads
    const dir = isImage ? path.join('public','uploads') : path.join('public','download');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g,'_');
    cb(null, Date.now() + '-' + base + ext);
  }
});
const upload = multer({ storage });

router.post('/uploads/image', requireEditor, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false });
  const url = '/uploads/' + req.file.filename;
  res.json({ ok:true, url });
});

router.post('/uploads/file', requireEditor, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false });
  const url = '/download/' + req.file.filename;
  res.json({ ok:true, url, name: req.file.originalname });
});
// Analytics
router.get('/analytics', requireEditor, async (req, res) => {
  try {
    const Article = require('../models/Article');
    const User = require('../models/User');
    // KPI tiles
    const [allCountRows] = await res.locals.db.execute('SELECT COUNT(*) AS count FROM articles');
    const totalArticles = allCountRows[0]?.count || 0;
    const published = await Article.countPublished(res.locals.db);
    const [draftCountRows] = await res.locals.db.execute('SELECT COUNT(*) AS count FROM articles WHERE status = "draft"');
    const drafts = draftCountRows[0]?.count || 0;
    const [viewSumRows] = await res.locals.db.execute('SELECT COALESCE(SUM(view_count),0) AS views FROM articles');
    const totalViews = viewSumRows[0]?.views || 0;
    const avgViews = totalArticles ? Math.round(totalViews / totalArticles) : 0;

    // Top viewed
    const [topViewedRows] = await res.locals.db.execute('SELECT id, title, slug, view_count FROM articles WHERE status <> "deleted" ORDER BY view_count DESC, updated_at DESC LIMIT 5');

    // Recent articles
    const [recentRows] = await res.locals.db.execute('SELECT id, title, slug, status, updated_by, updated_at FROM articles ORDER BY updated_at DESC LIMIT 5');
    for (const r of recentRows) {
      if (r.updated_by) {
        const u = await User.findById(res.locals.db, r.updated_by);
        r.authorName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username : '';
      }
    }

    // Articles per menu category
    const [perCategory] = await res.locals.db.execute(
      `SELECT mi.title AS category, COUNT(a.id) AS cnt
       FROM menu_items mi
       LEFT JOIN articles a ON a.menu_item_id = mi.id AND a.status <> 'deleted'
       GROUP BY mi.id
       ORDER BY cnt DESC, mi.title ASC`
    );

    res.render('admin/analytics', {
      layout: false,
      title: 'Analityka — Panel administracyjny',
      adminUser: req.currentUser,
      kpis: { totalArticles, published, drafts, totalViews, avgViews },
      topViewed: topViewedRows,
      recent: recentRows,
      perCategory
    });
  } catch (e) {
    console.error('Analytics load error', e);
    res.render('admin/analytics', {
      layout: false,
      title: 'Analityka — Panel administracyjny',
      adminUser: req.currentUser,
      kpis: { totalArticles: 0, published: 0, drafts: 0, totalViews: 0, avgViews: 0 },
      topViewed: [],
      recent: [],
      perCategory: []
    });
  }
});

// Menu
router.get('/menu', requireEditor, async (req, res) => {
  try {
    const MenuItems = require('../models/MenuItems');
    const menu = new MenuItems(res.locals.db);
    const all = await res.locals.db.execute(`SELECT id, title, slug, parent_id, sort_order, is_active, hidden, display_mode FROM menu_items ORDER BY parent_id IS NULL DESC, sort_order ASC, id ASC`);
    const items = all[0] || [];
    res.render('admin/menu', {
      layout: false,
      title: 'Menu — Panel administracyjny',
      adminUser: req.currentUser,
      items
    });
  } catch (e) {
    res.render('admin/menu', {
      layout: false,
      title: 'Menu — Panel administracyjny',
      adminUser: req.currentUser,
      items: []
    });
  }
});

// Toggle active/visible for menu item
router.post('/menu/:id/toggle', requireEditor, express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { field } = req.body || {};
    const rawValue = (req.body && Object.prototype.hasOwnProperty.call(req.body, 'value')) ? req.body.value : undefined;
    const boolValue = (rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1');
    
    if (!id || (field !== 'active' && field !== 'visible')) {
      return res.status(400).json({ ok:false });
    }

    if (field === 'active') {
      const desired = boolValue ? 1 : 0;
      await res.locals.db.execute('UPDATE menu_items SET is_active = ?, updated_at = NOW() WHERE id = ?', [desired, id]);
    } else {
      // field === 'visible' -> hidden is inverse
      const desiredHidden = boolValue ? 0 : 1;
      await res.locals.db.execute('UPDATE menu_items SET hidden = ?, updated_at = NOW() WHERE id = ?', [desiredHidden, id]);
    }

    // Return current state after update
    const [rows] = await res.locals.db.execute('SELECT is_active, hidden FROM menu_items WHERE id = ?', [id]);
    if (!rows || !rows[0]) return res.status(404).json({ ok:false });
    return res.json({ ok:true, state: rows[0] });
  } catch (e) {
    console.error('menu toggle error', e);
    return res.status(500).json({ ok:false, error: e.message });
  }
});

// Create new menu item
router.post('/menu', requireEditor, express.json(), async (req, res) => {
  try {
    const { title, slug, parent_id, display_mode, is_active, hidden } = req.body;
    if (!title || !display_mode) return res.status(400).json({ ok: false });
    
    const finalSlug = slug || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Get max sort_order for the same parent group
    const parentIdValue = parent_id || null;
    let maxSortQuery, maxSortParams;
    if (parentIdValue === null) {
      maxSortQuery = 'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM menu_items WHERE parent_id IS NULL';
      maxSortParams = [];
    } else {
      maxSortQuery = 'SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM menu_items WHERE parent_id = ?';
      maxSortParams = [parentIdValue];
    }
    const [maxRows] = await res.locals.db.execute(maxSortQuery, maxSortParams);
    const newSortOrder = (maxRows[0].max_sort || 0) + 1;
    
    const [result] = await res.locals.db.execute(
      'INSERT INTO menu_items (title, slug, parent_id, display_mode, is_active, hidden, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [title, finalSlug, parentIdValue, display_mode, is_active || 0, hidden || 0, newSortOrder]
    );
    
    res.json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error('Create menu item error:', e);
    res.status(500).json({ ok: false });
  }
});

// Get single menu item for editing
router.get('/menu/:id', requireEditor, async (req, res) => {
  try {
    const [rows] = await res.locals.db.execute('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (!rows || !rows[0]) return res.status(404).json({ ok: false });
    
    res.json({ ok: true, item: rows[0] });
  } catch (e) {
    console.error('Get menu item error:', e);
    res.status(500).json({ ok: false });
  }
});

// Update menu item
router.put('/menu/:id', requireEditor, express.json(), async (req, res) => {
  try {
    const { title, slug, parent_id, display_mode, is_active, hidden } = req.body;
    if (!title || !display_mode) return res.status(400).json({ ok: false });
    
    const finalSlug = slug || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    
    await res.locals.db.execute(
      'UPDATE menu_items SET title = ?, slug = ?, parent_id = ?, display_mode = ?, is_active = ?, hidden = ?, updated_at = NOW() WHERE id = ?',
      [title, finalSlug, parent_id || null, display_mode, is_active || 0, hidden || 0, req.params.id]
    );
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Update menu item error:', e);
    res.status(500).json({ ok: false });
  }
});

// Reorder menu items (drag and drop)
router.post('/menu/reorder', requireEditor, express.json(), async (req, res) => {
  try {
    const { movedId, targetId, parentId } = req.body;
    if (!movedId || !targetId) return res.status(400).json({ ok: false });
    
    // Get all items in the same parent group
    let query, params;
    if (parentId === null || parentId === '' || parentId === undefined) {
      query = 'SELECT id, sort_order FROM menu_items WHERE parent_id IS NULL ORDER BY sort_order ASC';
      params = [];
    } else {
      query = 'SELECT id, sort_order FROM menu_items WHERE parent_id = ? ORDER BY sort_order ASC';
      params = [parentId];
    }
    const [items] = await res.locals.db.execute(query, params);
    
    // Find current positions
    const movedIndex = items.findIndex(item => item.id === movedId);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (movedIndex === -1 || targetIndex === -1) {
      return res.status(404).json({ ok: false });
    }
    
    // Reorder array
    const moved = items.splice(movedIndex, 1)[0];
    items.splice(targetIndex, 0, moved);
    
    // Update sort_order in database
    for (let i = 0; i < items.length; i++) {
      await res.locals.db.execute(
        'UPDATE menu_items SET sort_order = ? WHERE id = ?',
        [i, items[i].id]
      );
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Reorder menu error:', e);
    res.status(500).json({ ok: false });
  }
});

// Delete menu item
router.delete('/menu/:id', requireEditor, async (req, res) => {
  try {
    // Check if menu item has children
    const [children] = await res.locals.db.execute('SELECT COUNT(*) as count FROM menu_items WHERE parent_id = ?', [req.params.id]);
    if (children[0].count > 0) {
      return res.status(400).json({ ok: false, error: 'Nie można usunąć pozycji menu, która ma podpozycje.' });
    }
    
    // Check if menu item has articles
    const [articles] = await res.locals.db.execute('SELECT COUNT(*) as count FROM articles WHERE menu_item_id = ? AND status != "deleted"', [req.params.id]);
    if (articles[0].count > 0) {
      return res.status(400).json({ ok: false, error: 'Nie można usunąć pozycji menu, która ma przypisane artykuły.' });
    }
    
    await res.locals.db.execute('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete menu item error:', e);
    res.status(500).json({ ok: false });
  }
});

// Users
router.get('/users', requireEditor, async (req, res) => {
  try {
    const [users] = await res.locals.db.execute(
      `SELECT id, username, imie, nazwisko, email, role, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    
    res.render('admin/users', {
      layout: false,
      title: 'Użytkownicy — Panel administracyjny',
      adminUser: req.currentUser,
      users: users || []
    });
  } catch (e) {
    console.error('Users page error:', e);
    res.render('admin/users', {
      layout: false,
      title: 'Użytkownicy — Panel administracyjny',
      adminUser: req.currentUser,
      users: []
    });
  }
});

// Create user
router.post('/users', requireEditor, express.json(), async (req, res) => {
  try {
    const { username, firstName, lastName, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Username, email i hasło są wymagane' });
    }
    
    // Check if username or email already exists
    const [existing] = await res.locals.db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: 'Użytkownik o podanej nazwie lub emailu już istnieje' });
    }
    
    const User = require('../models/User');
    const userId = await User.create(res.locals.db, {
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      password,
      role: role || 'editor'
    });
    
    res.json({ ok: true, id: userId });
  } catch (e) {
    console.error('Create user error:', e);
    res.status(500).json({ ok: false, error: 'Błąd tworzenia użytkownika' });
  }
});

// Get single user
router.get('/users/:id', requireEditor, async (req, res) => {
  try {
    const [rows] = await res.locals.db.execute(
      'SELECT id, username, imie, nazwisko, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows || !rows[0]) return res.status(404).json({ ok: false });
    
    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error('Get user error:', e);
    res.status(500).json({ ok: false });
  }
});

// Update user
router.put('/users/:id', requireEditor, express.json(), async (req, res) => {
  try {
    const { username, firstName, lastName, email, password, role } = req.body;
    const userId = parseInt(req.params.id);
    
    if (!username || !email) {
      return res.status(400).json({ ok: false, error: 'Username i email są wymagane' });
    }
    
    // Check if username or email already exists (exclude current user)
    const [existing] = await res.locals.db.execute(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ ok: false, error: 'Użytkownik o podanej nazwie lub emailu już istnieje' });
    }
    
    const User = require('../models/User');
    const user = await User.findById(res.locals.db, userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Użytkownik nie znaleziony' });
    }
    
    await user.update(res.locals.db, {
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      password: password || undefined,
      role: role || 'editor'
    });
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Update user error:', e);
    res.status(500).json({ ok: false, error: 'Błąd aktualizacji użytkownika' });
  }
});

// Change user password (admin only)
router.post('/users/:id/change-password', requireEditor, express.json(), async (req, res) => {
  try {
    // Check if current user is admin
    if (req.currentUser.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Brak uprawnień' });
    }
    
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ ok: false, error: 'Hasło jest wymagane' });
    }
    
    const User = require('../models/User');
    const user = await User.findById(res.locals.db, userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Użytkownik nie znaleziony' });
    }
    
    await user.update(res.locals.db, { password });
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Change password error:', e);
    res.status(500).json({ ok: false, error: 'Błąd zmiany hasła' });
  }
});

// Delete user
router.delete('/users/:id', requireEditor, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting current user
    if (userId === req.currentUser.id) {
      return res.status(400).json({ ok: false, error: 'Nie możesz usunąć własnego konta' });
    }
    
    // Check if user exists
    const [user] = await res.locals.db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user || user.length === 0) {
      return res.status(404).json({ ok: false, error: 'Użytkownik nie znaleziony' });
    }
    
    await res.locals.db.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ ok: false, error: 'Błąd usuwania użytkownika' });
  }
});

// Settings page
router.get('/settings', requireEditor, async (req, res) => {
  try {
    const [settings] = await res.locals.db.execute('SELECT setting_key, setting_value FROM site_settings');
    
    const siteSettings = {};
    settings.forEach(setting => {
      siteSettings[setting.setting_key] = setting.setting_value;
    });
    
    // Clean up duplicate site_description entries and ensure we have one
    const siteDescKeys = Object.keys(siteSettings).filter(key => key.trim() === 'site_description');
    if (siteDescKeys.length > 1) {
      // Remove duplicates, keep the first one
      const keepKey = siteDescKeys[0];
      const keepValue = siteSettings[keepKey];
      for (let i = 1; i < siteDescKeys.length; i++) {
        delete siteSettings[siteDescKeys[i]];
        await res.locals.db.execute('DELETE FROM site_settings WHERE setting_key = ?', [siteDescKeys[i]]);
      }
      siteSettings.site_description = keepValue;
    } else if (siteDescKeys.length === 1) {
      // Rename to standard key if it has extra spaces
      const actualKey = siteDescKeys[0];
      if (actualKey !== 'site_description') {
        siteSettings.site_description = siteSettings[actualKey];
        delete siteSettings[actualKey];
        await res.locals.db.execute('UPDATE site_settings SET setting_key = ? WHERE setting_key = ?', ['site_description', actualKey]);
      }
    } else {
      // Create new site_description
      await res.locals.db.execute(
        'INSERT INTO site_settings (setting_key, setting_value, setting_type, updated_by, updated_at) VALUES (?, ?, ?, ?, NOW())',
        ['site_description', '', 'text', req.currentUser.id]
      );
      siteSettings.site_description = '';
    }
    
    res.render('admin/settings', {
      layout: false,
      title: 'Ustawienia strony',
      adminUser: req.currentUser,
      activeTab: 'settings',
      settings: siteSettings
    });
  } catch (e) {
    console.error('Settings page error:', e);
    res.status(500).render('error', { 
      title: 'Błąd ładowania ustawień',
      message: 'Błąd ładowania ustawień' 
    });
  }
});

// Update settings
router.post('/settings', requireEditor, express.json(), async (req, res) => {
  try {
    const settings = req.body;
    const userId = req.currentUser.id;
    
    // Map form fields to setting keys
    const settingMappings = {
      page_title: 'site_title',
      page_subtitle: 'site_subtitle', 
      page_description: 'site_description',
      seo_keywords: 'seo_keywords',
      google_analytics_id: 'google_analytics_id',
      contact_address: 'contact_address',
      contact_city: 'contact_city',
      contact_phone: 'contact_phone',
      contact_fax: 'contact_fax',
      contact_email: 'contact_email',
      working_hours: 'office_hours',
      epuap: 'epuap',
      edoreczenia: 'edoreczenia',
      nip: 'nip',
      regon: 'regon',
      bank_account: 'bank_account',
      gmina: 'gmina',
      powiat: 'powiat',
      wojewodztwo: 'wojewodztwo',
      home_page: 'home_page'
    };
    
    // Update or insert each setting
    for (const [formField, settingKey] of Object.entries(settingMappings)) {
      const value = settings[formField] || '';
      
      // Check if setting exists
      const [existing] = await res.locals.db.execute(
        'SELECT id FROM site_settings WHERE setting_key = ?', 
        [settingKey]
      );
      
      if (existing.length > 0) {
        // Update existing setting
        await res.locals.db.execute(
          'UPDATE site_settings SET setting_value = ?, updated_by = ?, updated_at = NOW() WHERE setting_key = ?',
          [value, userId, settingKey]
        );
      } else {
        // Insert new setting
        await res.locals.db.execute(
          'INSERT INTO site_settings (setting_key, setting_value, setting_type, updated_by, updated_at) VALUES (?, ?, ?, ?, NOW())',
          [settingKey, value, 'text', userId]
        );
      }
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Update settings error:', e);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;


