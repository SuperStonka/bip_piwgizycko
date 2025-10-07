const express = require('express');
const path = require('path');
const router = express.Router();
const Article = require('../models/Article');
const User = require('../models/User');

// Helper function to get user data for metryczka
async function getUserDataForMetryczka(db, userId) {
  if (!userId) return null;
  
  try {
    const user = await User.findById(db, userId);
    if (user) {
      return {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      };
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  
  return null;
}

// Homepage
router.get('/', async (req, res) => {
  try {
    let homepage = null;
    let featuredNews = [];
    let recentNews = [];

    // Check if database is connected
    if (res.locals.db) {
      // Znajdź artykuł strony głównej na podstawie site_settings.home_page (slug)
      console.log('DEBUG: Available site settings:', Object.keys(res.locals.siteSettings || {}));
      console.log('DEBUG: All site settings values:', res.locals.siteSettings);
      const homePageArticleSlug = res.locals.siteSettings?.home_page;
      console.log('DEBUG: Homepage article slug from settings:', homePageArticleSlug, typeof homePageArticleSlug);
      
      if (homePageArticleSlug) {
        homepage = await Article.findBySlug(res.locals.db, homePageArticleSlug);
        console.log('DEBUG: Homepage article found by slug:', !!homepage, homepage ? homepage.title : 'not found');
      } else {
        // Fallback - znajdź artykuł z najniższym ID
        console.log('DEBUG: No home_page setting found, falling back to article with lowest ID');
        const [rows] = await res.locals.db.execute(
          'SELECT * FROM articles WHERE status = "published" ORDER BY id ASC LIMIT 1'
        );
        if (rows.length > 0) {
          const Article = require('../models/Article');
          homepage = new Article(rows[0]);
          console.log('DEBUG: Fallback homepage found (lowest ID):', homepage.title, 'ID:', homepage.id);
        } else {
          console.log('DEBUG: No published articles found for fallback');
          // Check if there are any articles at all
          const [allRows] = await res.locals.db.execute('SELECT COUNT(*) as count FROM articles');
          console.log('DEBUG: Total articles in database:', allRows[0].count);
        }
      }
      
      // Pobierz dane użytkownika dla metryczki
      if (homepage) {
        console.log('Homepage found:', homepage.title);
        console.log('Created by ID:', homepage.createdBy);
        console.log('Published by ID:', homepage.publishedBy);
        console.log('Updated by ID:', homepage.updatedBy);
        
        const createdByUser = await getUserDataForMetryczka(res.locals.db, homepage.createdBy);
        const publishedByUser = await getUserDataForMetryczka(res.locals.db, homepage.publishedBy);
        const updatedByUser = await getUserDataForMetryczka(res.locals.db, homepage.updatedBy);
        
        console.log('Created by user:', createdByUser);
        console.log('Published by user:', publishedByUser);
        console.log('Updated by user:', updatedByUser);
        
        // Dodaj dane użytkownika do obiektu artykułu
        homepage.author = createdByUser ? createdByUser.fullName : '';
        homepage.responsible = publishedByUser ? publishedByUser.fullName : '';
        homepage.publishedBy = publishedByUser ? publishedByUser.fullName : '';
        homepage.updatedBy = updatedByUser ? updatedByUser.fullName : '';
        
        console.log('Final homepage data:', {
          author: homepage.author,
          responsible: homepage.responsible,
          publishedBy: homepage.publishedBy,
          updatedBy: homepage.updatedBy,
          createdAt: homepage.createdAt,
          publishedAt: homepage.publishedAt,
          updatedAt: homepage.updatedAt,
          viewCount: homepage.viewCount
        });
      } else {
        console.log('No homepage found');
      }
      
      // Pobierz najnowsze artykuły
      recentNews = await Article.getRecent(res.locals.db, 5);
    }

    console.log('DEBUG: About to render homepage with:', {
      hasHomepage: !!homepage,
      homepageTitle: homepage?.title,
      recentNewsCount: recentNews.length
    });
    
    // Set homepage breadcrumbs
    const homepageBreadcrumbs = [
      { title: 'Strona główna', url: '/', isActive: true }
    ];
    res.locals.breadcrumbs = homepageBreadcrumbs;
    
    res.render('page', {
      title: homepage ? `${homepage.title} - Powiatowy Inspektorat Weterynarii w Giżycku` : 'Powiatowy Inspektorat Weterynarii w Giżycku - Strona główna',
      page: homepage,
      recentNews,
      currentPath: '/',
      isHomepage: true,
      homepageSlug: homepage ? homepage.slug : null
    });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.status(500).render('error', {
      title: 'Błąd serwera',
      message: 'Wystąpił błąd podczas ładowania strony głównej.',
      error: {}
    });
  }
});

// Dynamic page routes
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Check if database is connected
    if (!res.locals.db) {
      return res.status(503).render('error', {
        title: 'Baza danych niedostępna',
        message: 'Baza danych jest obecnie niedostępna. Spróbuj ponownie później.',
        error: {}
      });
    }
    
    // Check if it's a news article (from articles table)
    if (slug.startsWith('aktualnosci/')) {
      const articleSlug = slug.replace('aktualnosci/', '');
      console.log('DEBUG: Looking for article with slug:', articleSlug);
      const article = await Article.findBySlug(res.locals.db, articleSlug);
      console.log('DEBUG: Found article:', !!article, article ? article.title : 'not found');
      
      if (article) {
        // Pobierz dane użytkownika dla metryczki
        console.log('Article IDs:', {
          createdBy: article.createdBy,
          publishedBy: article.publishedBy, 
          updatedBy: article.updatedBy
        });
        
        const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
        const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
        const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
        
        console.log('User data results:', {
          createdByUser,
          publishedByUser,
          updatedByUser
        });
        
        // Dodaj dane użytkownika do obiektu artykułu
        article.author = createdByUser ? createdByUser.fullName : '';
        article.responsible = publishedByUser ? publishedByUser.fullName : '';
        article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
        article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
        
        console.log('Final article user data:', {
          author: article.author,
          responsible: article.responsible,
          publishedBy: article.publishedBy,
          updatedBy: article.updatedBy
        });
        
        // Generate breadcrumbs for news article
        const customBreadcrumbs = [
          { title: 'Strona główna', url: '/', isActive: false },
          { title: 'Aktualności', url: '/aktualnosci', isActive: false }
        ];

        // Find the category for this article by menu_item_id
        if (article.menuItemId && res.locals.menuStructure) {
          const aktualnosciMenu = res.locals.menuStructure.find(item => item.slug === 'aktualnosci');
          
          if (aktualnosciMenu && aktualnosciMenu.children) {
            const categoryItem = aktualnosciMenu.children.find(child => child.id === article.menuItemId);
            
            if (categoryItem) {
              customBreadcrumbs.push({
                title: categoryItem.title,
                url: `/aktualnosci?kategoria=${encodeURIComponent(categoryItem.slug)}`,
                isActive: false
              });
            }
          }
        }

        // Add article title
        customBreadcrumbs.push({
          title: article.title,
          url: '',
          isActive: true
        });

        // Override breadcrumbs in res.locals
        res.locals.breadcrumbs = customBreadcrumbs;

        return res.render('page', {
          title: `${article.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
          page: article,
          currentPath: `/aktualnosci/${articleSlug}`
        });
      }
    }
    
    // Check if it's a menu item
    // Clear cache for problematic pages to ensure fresh data
    if ((slug === 'adresy-telefony-kontaktowe' || slug === 'deklaracja-dostepnosci') && res.locals.menuItems) {
      console.log('DEBUG: Clearing menu cache for problematic page');
      res.locals.menuItems.clearCache();
    }
    
    const menuItem = res.locals.menuItems ? await res.locals.menuItems.findBySlug(slug) : null;
    console.log('DEBUG: Found menu item:', !!menuItem, menuItem ? `${menuItem.title} (id: ${menuItem.id}, display_mode: ${menuItem.display_mode})` : 'not found');
    
    // If menu item not found by findBySlug, try direct database query as fallback
    if (!menuItem && (slug === 'adresy-telefony-kontaktowe' || slug === 'deklaracja-dostepnosci')) {
      console.log('DEBUG: Trying direct DB query for menu item:', slug);
      const [directMenuRows] = await res.locals.db.execute(
        'SELECT * FROM menu_items WHERE slug = ? AND is_active = 1 AND hidden = 0',
        [slug]
      );
      console.log('DEBUG: Direct DB query result:', directMenuRows.length > 0 ? directMenuRows[0] : 'not found');
      
      if (slug === 'deklaracja-dostepnosci') {
        console.log('DEBUG: Special handling for deklaracja-dostepnosci');
        console.log('DEBUG: directMenuRows:', directMenuRows);
      }
      
      if (directMenuRows.length > 0) {
        const directMenuItem = directMenuRows[0];
        console.log('DEBUG: Using direct menu item:', directMenuItem.title);
        
        // Check if it should show single article
        if (directMenuItem.display_mode === 'single' || directMenuItem.display_mode === 'article' || !directMenuItem.display_mode) {
          console.log('DEBUG: Direct menu item for single article:', directMenuItem.title);
          
          // Find article associated with this menu item
          console.log('DEBUG: Looking for article with menu_item_id:', directMenuItem.id);
          const articles = await Article.findByMenuItemId(res.locals.db, directMenuItem.id, 1, 0);
          console.log('DEBUG: Found articles count:', articles.length);
          
          if (articles.length === 0) {
            console.log('DEBUG: No published articles found, checking all articles (including drafts) with this menu_item_id');
            const [allArticlesRows] = await res.locals.db.execute(
              'SELECT * FROM articles WHERE menu_item_id = ?',
              [directMenuItem.id]
            );
            console.log('DEBUG: All articles (any status) for this menu_item_id:', allArticlesRows);
            
            // If there's a draft article, let's try to use it
            if (allArticlesRows.length > 0) {
              const Article = require('../models/Article');
              const draftArticle = new Article(allArticlesRows[0]);
              console.log('DEBUG: Using draft/unpublished article:', draftArticle.title, 'status:', draftArticle.status);
              
              // Pobierz dane użytkownika dla metryczki
              const createdByUser = await getUserDataForMetryczka(res.locals.db, draftArticle.createdBy);
              const publishedByUser = await getUserDataForMetryczka(res.locals.db, draftArticle.publishedBy);
              const updatedByUser = await getUserDataForMetryczka(res.locals.db, draftArticle.updatedBy);
              
              // Dodaj dane użytkownika do obiektu artykułu
              draftArticle.author = createdByUser ? createdByUser.fullName : '';
              draftArticle.responsible = draftArticle.responsiblePerson || (publishedByUser ? publishedByUser.fullName : '');
              draftArticle.publishedBy = publishedByUser ? publishedByUser.fullName : '';
              draftArticle.updatedBy = updatedByUser ? updatedByUser.fullName : '';
              
              // Generate breadcrumbs with article title
              const customBreadcrumbs = [
                { title: 'Strona główna', url: '/', isActive: false },
                { title: draftArticle.title, url: '', isActive: true }
              ];
              
              // Override breadcrumbs in res.locals
              res.locals.breadcrumbs = customBreadcrumbs;
              
              return res.render('page', {
                title: `${draftArticle.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
                page: draftArticle,
                currentPath: `/${slug}`
              });
            }
          }
          
          if (articles.length > 0) {
            const article = articles[0];
            console.log('DEBUG: Found article for direct menu item:', article.title);
            
            // Pobierz dane użytkownika dla metryczki
            const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
            const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
            const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
            
            // Dodaj dane użytkownika do obiektu artykułu
            article.author = createdByUser ? createdByUser.fullName : '';
            article.responsible = article.responsiblePerson || (publishedByUser ? publishedByUser.fullName : '');
            article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
            article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
            
            // Generate breadcrumbs with article title
            const customBreadcrumbs = [
              { title: 'Strona główna', url: '/', isActive: false },
              { title: article.title, url: '', isActive: true }
            ];
            
            // Override breadcrumbs in res.locals
            res.locals.breadcrumbs = customBreadcrumbs;
            
            return res.render('page', {
              title: `${article.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
              page: article,
              currentPath: `/${slug}`
            });
          }
        }
      }
    }
    
    if (menuItem && menuItem.display_mode === 'list') {
      // Handle menu item with display_mode: 'list' - show articles list
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      const articles = await Article.findByMenuItemId(res.locals.db, menuItem.id, limit, offset);
      const totalArticles = await Article.countByMenuItemId(res.locals.db, menuItem.id);
      const totalPages = Math.ceil(totalArticles / limit);

      // Populate author from created_by user id
      const authorIds = [...new Set(articles.map(a => a.createdBy).filter(Boolean))];
      if (authorIds.length > 0) {
        const idToUser = new Map();
        await Promise.all(authorIds.map(async (uid) => {
          const u = await User.findById(res.locals.db, uid);
          if (u) idToUser.set(uid, u);
        }));
        articles.forEach(a => {
          const u = idToUser.get(a.createdBy);
          a.author = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '';
        });
      }

      // Sprawdź czy to pozycja z parent menu (submenu)
      let parentMenuItem = null;
      if (menuItem.parent_id) {
        parentMenuItem = await res.locals.menuItems.findById(menuItem.parent_id);
      }

      // Generate breadcrumbs
      const customBreadcrumbs = [
        { title: 'Strona główna', url: '/', isActive: false }
      ];

      // If it's a submenu item, add parent to breadcrumbs
      if (parentMenuItem) {
        customBreadcrumbs.push({
          title: parentMenuItem.title,
          url: `/${parentMenuItem.slug}`,
          isActive: false
        });
      }

      // Add current menu item only if different from parent
      if (!parentMenuItem || (menuItem.title || '').trim() !== (parentMenuItem.title || '').trim()) {
        customBreadcrumbs.push({
          title: menuItem.title,
          url: '',
          isActive: true
        });
      }

      // Override breadcrumbs in res.locals
      res.locals.breadcrumbs = customBreadcrumbs;

      return res.render('articles-list', {
        title: `${menuItem.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
        articles,
        currentPage: page,
        totalPages,
        menuTitle: menuItem.title,
        menuItem: menuItem,
        parentMenuItem: parentMenuItem,
        currentPath: `/${slug}`
      });
    }
    
    // Check if it's a menu item with display_mode: 'article', 'single', or without display_mode (single article)
    if (menuItem && (menuItem.display_mode === 'article' || menuItem.display_mode === 'single' || !menuItem.display_mode)) {
      console.log('DEBUG: Menu item for single article:', menuItem.title);
      
      // Find article associated with this menu item
      console.log('DEBUG: Looking for article with menu_item_id:', menuItem.id);
      const articles = await Article.findByMenuItemId(res.locals.db, menuItem.id, 1, 0);
      console.log('DEBUG: Found articles count:', articles.length);
      
      if (articles.length > 0) {
        const article = articles[0];
        console.log('DEBUG: Found article for menu item:', article.title);
        
        // Pobierz dane użytkownika dla metryczki
        const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
        const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
        const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
        
        // Dodaj dane użytkownika do obiektu artykułu
        article.author = createdByUser ? createdByUser.fullName : '';
        article.responsible = article.responsiblePerson || (publishedByUser ? publishedByUser.fullName : '');
        article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
        article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
        
        // Generate breadcrumbs with article title
        const customBreadcrumbs = [
          { title: 'Strona główna', url: '/', isActive: false },
          { title: article.title, url: '', isActive: true }
        ];
        
        // Override breadcrumbs in res.locals
        res.locals.breadcrumbs = customBreadcrumbs;
        
        return res.render('page', {
          title: `${article.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
          page: article,
          currentPath: `/${slug}`
        });
      } else {
        console.log('DEBUG: No article found for menu item:', menuItem.title);
        return res.status(404).render('error', {
          title: 'Artykuł nie znaleziony',
          message: 'Nie znaleziono artykułu dla tej pozycji menu.',
          error: {}
        });
      }
    }
    
    // Check if it's an article
    console.log('DEBUG: Checking article with slug (non-aktualnosci):', slug);
    const article = await Article.findBySlug(res.locals.db, slug);
    console.log('DEBUG: Found article (non-aktualnosci):', !!article, article ? article.title : 'not found');
    
    // Special debug for problematic pages
    if (slug === 'adresy-telefony-kontaktowe' || slug === 'deklaracja-dostepnosci') {
      console.log('DEBUG: Checking problematic page:', slug);
      
      // Check if it exists as menu item
      if (!menuItem) {
        console.log('DEBUG: No menu item found, checking for similar menu items');
        const [menuRows] = await res.locals.db.execute(
          'SELECT slug, title, display_mode FROM menu_items WHERE slug LIKE ? OR slug LIKE ? OR slug LIKE ?',
          [`%adresy%`, `%telefony%`, `%deklaracja%`]
        );
        console.log('DEBUG: Similar menu items:', menuRows);
      }
      
      // Check if article exists directly (for fallback)
      const [articleRows] = await res.locals.db.execute(
        'SELECT slug, title, status, menu_item_id FROM articles WHERE slug LIKE ? OR slug LIKE ? OR slug LIKE ?',
        [`%adresy%`, `%telefony%`, `%deklaracja%`]
      );
      console.log('DEBUG: Similar articles:', articleRows);
    }
    
    if (article) {
      // Pobierz dane użytkownika dla metryczki (drugi route)
      console.log('DEBUG (route 2): Article IDs:', {
        createdBy: article.createdBy,
        publishedBy: article.publishedBy, 
        updatedBy: article.updatedBy,
        responsiblePerson: article.responsiblePerson
      });
      
      const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
      const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
      const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
      
      console.log('DEBUG (route 2): User data results:', {
        createdByUser,
        publishedByUser,
        updatedByUser
      });
      
      // Dodaj dane użytkownika do obiektu artykułu
      article.author = createdByUser ? createdByUser.fullName : '';
      article.responsible = article.responsiblePerson || (publishedByUser ? publishedByUser.fullName : '');
      article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
      article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
      
      console.log('DEBUG (route 2): Final article user data:', {
        author: article.author,
        responsible: article.responsible,
        publishedBy: article.publishedBy,
        updatedBy: article.updatedBy
      });
      
      // Generate simple breadcrumbs with article title
      const customBreadcrumbs = [
        { title: 'Strona główna', url: '/', isActive: false },
        { title: article.title, url: '', isActive: true }
      ];
      
      // Override breadcrumbs in res.locals
      res.locals.breadcrumbs = customBreadcrumbs;
      
      return res.render('page', {
        title: `${article.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
        page: article,
        currentPath: `/${slug}`
      });
    }
    
    // 404 if not found
    res.status(404).render('error', {
      title: 'Strona nie znaleziona',
      message: 'Strona, której szukasz, nie została znaleziona.',
      error: {}
    });
  } catch (error) {
    console.error('Error loading page:', error);
    res.status(500).render('error', {
      title: 'Błąd serwera',
      message: 'Wystąpił błąd podczas ładowania strony.',
      error: {}
    });
  }
});

// Route for hierarchical URLs (parent/child)
router.get('/:parentSlug/:childSlug', async (req, res) => {
  try {
    const { parentSlug, childSlug } = req.params;
    
    // Check if database is connected
    if (!res.locals.db) {
      return res.status(503).render('error', {
        title: 'Baza danych niedostępna',
        message: 'Baza danych jest obecnie niedostępna. Spróbuj ponownie później.',
        error: {}
      });
    }

    // First check if childSlug is a submenu item that should show articles list
    const MenuItems = require('../models/MenuItems');
    const menuItems = new MenuItems(res.locals.db);
    const menuStructure = await menuItems.getMenuStructure();
    
    // Find parent menu item
    const parentItem = menuStructure.find(item => item.slug === parentSlug);
    
    if (parentItem && parentItem.children) {
      // Check if childSlug matches a submenu item
      const submenuItem = parentItem.children.find(child => child.slug === childSlug);
      console.log(`DEBUG: Looking for submenu item with slug: ${childSlug}`);
      console.log(`DEBUG: Found submenu item:`, submenuItem ? `${submenuItem.title} (display_mode: ${submenuItem.display_mode})` : 'not found');
      
      if (submenuItem && (submenuItem.display_mode === 'list' || !submenuItem.display_mode)) {
        // Handle submenu items with 'list' mode or no display_mode set (default to list)
        console.log(`DEBUG: Found submenu item for list: ${submenuItem.title}`);
        
        // Handle submenu item with display_mode: 'list' - show articles list
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const articles = await Article.findByMenuItemId(res.locals.db, submenuItem.id, limit, offset);
        const totalArticles = await Article.countByMenuItemId(res.locals.db, submenuItem.id);
        const totalPages = Math.ceil(totalArticles / limit);

        // Populate author from created_by user id
        const authorIds = [...new Set(articles.map(a => a.createdBy).filter(Boolean))];
        if (authorIds.length > 0) {
          const idToUser = new Map();
          await Promise.all(authorIds.map(async (uid) => {
            const u = await User.findById(res.locals.db, uid);
            if (u) idToUser.set(uid, u);
          }));
          articles.forEach(a => {
            const u = idToUser.get(a.createdBy);
            a.author = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '';
          });
        }

        // Generate breadcrumbs for submenu list
        const customBreadcrumbs = [
          { title: 'Strona główna', url: '/', isActive: false },
          { title: parentItem.title, url: `/${parentItem.slug}`, isActive: false },
          { title: submenuItem.title, url: '', isActive: true }
        ];

        // Override breadcrumbs in res.locals
        res.locals.breadcrumbs = customBreadcrumbs;

        return res.render('articles-list', {
          title: `${submenuItem.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
          articles,
          currentPage: page,
          totalPages,
          menuTitle: submenuItem.title,
          menuItem: submenuItem,
          parentMenuItem: parentItem,
          currentPath: `/${parentSlug}/${childSlug}`
        });
      }
    }

    // If not a submenu list, try to find the article by childSlug
    const article = await Article.findBySlug(res.locals.db, childSlug);
    
    if (article) {
      // Pobierz dane użytkownika dla metryczki
      const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
      const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
      const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
      
      // Dodaj dane użytkownika do obiektu artykułu
      article.author = createdByUser ? createdByUser.fullName : '';
      article.responsible = publishedByUser ? publishedByUser.fullName : '';
      article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
      article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
      
      // Generate breadcrumbs with article title
      // MenuItems and menuStructure already loaded above
      
      const customBreadcrumbs = [
        { title: 'Strona główna', url: '/', isActive: false }
      ];
      
      if (parentItem) {
        customBreadcrumbs.push({
          title: parentItem.title,
          url: `/${parentItem.slug}`,
          isActive: false
        });
        
        // Find submenu item - first try by menuItemId, then by childSlug
        let submenuItem = null;
        console.log(`DEBUG: Looking for submenu item. Article menuItemId: ${article.menuItemId}, childSlug: ${childSlug}`);
        
        if (article.menuItemId) {
          // Try to find by menuItemId first
          submenuItem = await menuItems.findById(article.menuItemId);
          console.log(`DEBUG: Found submenu item by menuItemId:`, submenuItem ? submenuItem.title : 'not found');
        }
        
        if (!submenuItem && parentItem.children) {
          // Fallback: try to find by childSlug in parent's children
          submenuItem = parentItem.children.find(child => child.slug === childSlug);
          console.log(`DEBUG: Found submenu item by childSlug:`, submenuItem ? submenuItem.title : 'not found');
        }
        
        if (submenuItem) {
          // Avoid duplicating parent and submenu when titles are identical
          if ((submenuItem.title || '').trim() !== (parentItem.title || '').trim()) {
            console.log(`DEBUG: Adding submenu item to breadcrumbs: ${submenuItem.title}`);
            customBreadcrumbs.push({
              title: submenuItem.title,
              url: `/${parentItem.slug}/${submenuItem.slug}`,
              isActive: false
            });
          } else {
            console.log('DEBUG: Skipping submenu breadcrumb due to duplicate title with parent');
          }
        }
      }
      
      customBreadcrumbs.push({
        title: article.title,
        url: '',
        isActive: true
      });
      
      // Override breadcrumbs in res.locals
      res.locals.breadcrumbs = customBreadcrumbs;
      
      return res.render('page', {
        title: `${article.title} - Powiatowy Inspektorat Weterynarii w Giżycku`,
        page: article,
        currentPath: `/${parentSlug}/${childSlug}`
      });
    }
    
    // 404 if not found
    res.status(404).render('error', {
      title: 'Strona nie znaleziona',
      message: 'Strona, której szukasz, nie została znaleziona.',
      error: {}
    });
  } catch (error) {
    console.error('Error loading hierarchical page:', error);
    res.status(500).render('error', {
      title: 'Błąd serwera',
      message: 'Wystąpił błąd podczas ładowania strony.',
      error: {}
    });
  }
});

// Route for articles by menu item
router.get('/menu/:menuItemId', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Check if database is connected
    if (!res.locals.db) {
      return res.status(503).render('error', {
        title: 'Baza danych niedostępna',
        message: 'Baza danych jest obecnie niedostępna. Spróbuj ponownie później.',
        error: {}
      });
    }

    // Get menu item details to check display_mode
    const [menuItemRows] = await res.locals.db.execute(
      'SELECT * FROM menu_items WHERE id = ? AND is_active = 1',
      [menuItemId]
    );

    if (menuItemRows.length === 0) {
      return res.status(404).render('error', {
        title: 'Pozycja menu nie znaleziona',
        message: 'Pozycja menu, której szukasz, nie została znaleziona.',
        error: {}
      });
    }

    const menuItem = menuItemRows[0];
    
    // Sprawdź czy pozycja ma jakiekolwiek artykuły
    const totalArticles = await Article.countByMenuItemId(res.locals.db, menuItemId);
    
    if (totalArticles === 0) {
      // Jeśli brak artykułów, przekieruj na URL z slug
      return res.redirect(301, `/${menuItem.slug}`);
    }

    // Check display_mode - trasa /menu/:id obsługuje tylko display_mode: 'article'
    if (menuItem.display_mode === 'article') {
      // Show single article - find first article for this menu item
      const articles = await Article.findByMenuItemId(res.locals.db, menuItemId, 1, 0);
      
      if (articles.length > 0) {
        const article = articles[0];
        
        // Pobierz dane użytkownika dla metryczki
        const createdByUser = await getUserDataForMetryczka(res.locals.db, article.createdBy);
        const publishedByUser = await getUserDataForMetryczka(res.locals.db, article.publishedBy);
        const updatedByUser = await getUserDataForMetryczka(res.locals.db, article.updatedBy);
        
        // Dodaj dane użytkownika do obiektu artykułu
        article.author = createdByUser ? createdByUser.fullName : '';
        article.responsible = publishedByUser ? publishedByUser.fullName : '';
        article.publishedBy = publishedByUser ? publishedByUser.fullName : '';
        article.updatedBy = updatedByUser ? updatedByUser.fullName : '';
        
        // Generate breadcrumbs with article title
        const customBreadcrumbs = [
          { title: 'Strona główna', url: '/', isActive: false },
          { title: article.title, url: '', isActive: true }
        ];
        
        // Override breadcrumbs in res.locals
        res.locals.breadcrumbs = customBreadcrumbs;
        
        return res.render('page', {
          title: `${article.title} - Powiatowy Inspektorat Weterynarii w Piszu`,
          page: article,
          currentPath: `/menu/${menuItemId}`
        });
      } else {
        return res.status(404).render('error', {
          title: 'Artykuł nie znaleziony',
          message: 'Nie znaleziono artykułu dla tej pozycji menu.',
          error: {}
        });
      }
    } else {
      // Dla pozycji z display_mode: 'list' lub innych - przekieruj na slug
      return res.redirect(301, `/${menuItem.slug}`);
    }
  } catch (error) {
    console.error('Error loading articles by menu item:', error);
    res.status(500).render('error', {
      title: 'Błąd serwera',
      message: 'Wystąpił błąd podczas ładowania artykułów.',
      error: {}
    });
  }
});


// Accessibility helper routes
router.get('/wersja-kontrastowa', (req, res) => {
  const page = {
    title: 'Wersja kontrastowa',
    content: '<p>Ta wersja strony jest zoptymalizowana pod wysoki kontrast dla lepszej dostępności.</p>'
  };
  res.render('page', { title: `${page.title} - Powiatowy Inspektorat Weterynarii w Giżycku`, page, currentPath: '/wersja-kontrastowa' });
});

router.get('/wersja-tekstowa', (req, res) => {
  const page = {
    title: 'Wersja tekstowa',
    content: '<p>Minimalna wersja tekstowa treści serwisu dla czytników ekranu i prostych urządzeń.</p>'
  };
  res.render('page', { title: `${page.title} - Powiatowy Inspektorat Weterynarii w Giżycku`, page, currentPath: '/wersja-tekstowa' });
});

router.get('/slownik-skrotow', (req, res) => {
  const page = {
    title: 'Słownik skrótów',
    content: '<ul><li>PIW – Powiatowy Inspektorat Weterynarii</li><li>GIW – Główny Inspektorat Weterynaryjny</li></ul>'
  };
  res.render('page', { title: `${page.title} - Powiatowy Inspektorat Weterynarii w Giżycku`, page, currentPath: '/slownik-skrotow' });
});

// Sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    let articles = [];

    // Check if database is connected
    if (res.locals.db) {
      articles = await Article.findPublished(res.locals.db);
    }
    
    res.set('Content-Type', 'application/xml');
    res.render('sitemap', { pages: [], news: articles, appUrl: res.locals.appUrl });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
