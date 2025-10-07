const mysql = require('mysql2/promise');
const axios = require('axios');
const cheerio = require('cheerio');

// Konfiguracja bazy danych
const dbConfig = {
  host: 'arstudio.atthost24.pl',
  user: '9518_piwgizyckob',
  password: 'Nz21n$VH!wxFB',
  database: '9518_piwgizyckob',
  port: 3306
};

class ArticleMigrator {
  constructor() {
    this.db = null;
    this.migratedCount = 0;
    this.errorCount = 0;
    this.menuItems = new Map();
    this.baseUrl = 'http://bip.gizycko.piw.gov.pl';
  }

  async connect() {
    this.db = await mysql.createConnection(dbConfig);
    console.log('✅ Połączono z bazą danych');
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      console.log('✅ Rozłączono z bazą danych');
    }
  }

  // Pobierz pozycje menu z bazy danych
  async loadMenuItems() {
    try {
      console.log('📋 Pobieranie pozycji menu z bazy danych...');
      
      const [rows] = await this.db.execute(`
        SELECT id, title, slug 
        FROM menu_items 
        WHERE is_active = 1 AND hidden = 0
        ORDER BY id
      `);

      for (const row of rows) {
        this.menuItems.set(row.title.toLowerCase().trim(), {
          id: row.id,
          slug: row.slug
        });
      }

      console.log(`📋 Załadowano ${this.menuItems.size} pozycji menu`);
      return true;

    } catch (error) {
      console.error('❌ Błąd pobierania pozycji menu:', error.message);
      throw error;
    }
  }

  // Generowanie slug z tytułu
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, (char) => {
        const map = {
          'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
          'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Znajdź odpowiednią pozycję menu
  findMenuItemId(articleTitle) {
    const title = articleTitle.toLowerCase().trim();
    
    if (this.menuItems.has(title)) {
      return this.menuItems.get(title).id;
    }

    for (const [menuTitle, data] of this.menuItems) {
      if (title.includes(menuTitle) || menuTitle.includes(title)) {
        return data.id;
      }
    }

    console.log(`⚠️  Nie znaleziono dopasowania dla "${articleTitle}", przypisuję do "Strona główna"`);
    return 1;
  }

  // Pobieranie menu ze strony
  async fetchMenuFromOldSite() {
    try {
      console.log('🔍 Pobieranie menu ze strony...');
      
      const response = await axios.get(this.baseUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const menuContainer = $('.moduletable_menu ul.menu');
      
      if (menuContainer.length === 0) {
        throw new Error('Nie znaleziono menu na stronie');
      }

      const menuItems = [];
      menuContainer.find('a').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const title = $link.text().trim();
        
        if (title && href && !href.startsWith('http')) {
          const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : `${this.baseUrl}/${href}`;
          menuItems.push({
            title: title,
            url: fullUrl,
            slug: this.generateSlug(title)
          });
        }
      });

      console.log(`📄 Znaleziono ${menuItems.length} pozycji menu`);
      return menuItems;

    } catch (error) {
      console.error('❌ Błąd pobierania menu:', error.message);
      return [];
    }
  }

  // Pobieranie treści artykułu z Joomla
  async fetchArticleContent(url) {
    try {
      console.log(`  📄 Pobieranie treści z: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Selektory dla Joomla
      let content = '';
      const contentSelectors = [
        '.item-page .article-content',
        '.item-page .content',
        '.item-page',
        '.article-content',
        '.content',
        '.main-content',
        'article',
        '.post-content'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.html();
          console.log(`    ✅ Treść znaleziona w: ${selector}`);
          break;
        }
      }

      if (!content) {
        console.log('    ⚠️  Używam całego body');
        content = $('body').html();
      }

      // Wyczyść HTML
      content = content
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<nav[^>]*>.*?<\/nav>/gi, '')
        .replace(/<header[^>]*>.*?<\/header>/gi, '')
        .replace(/<footer[^>]*>.*?<\/footer>/gi, '')
        .replace(/<div[^>]*class="[^"]*moduletable[^"]*"[^>]*>.*?<\/div>/gi, '')
        .trim();

      // Usuń atrybuty class, style, id z wszystkich tagów HTML
      content = this.cleanHtmlAttributes(content);

      return content || 'Treść artykułu nie została znaleziona.';

    } catch (error) {
      console.error(`    ❌ Błąd pobierania treści: ${error.message}`);
      return 'Błąd pobierania treści artykułu.';
    }
  }

  // Sprawdź czy to kategoria czy artykuł
  isCategory(url) {
    return url.includes('view=category') || url.includes('layout=blog');
  }

  // Pobierz artykuły z kategorii
  async fetchArticlesFromCategory(categoryUrl) {
    try {
      console.log(`  📂 Pobieranie artykułów z kategorii: ${categoryUrl}`);
      
      const response = await axios.get(categoryUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const articles = [];

      // Znajdź kontener blog
      const blogContainer = $('.blog');
      
      if (blogContainer.length === 0) {
        console.log('    ⚠️  Nie znaleziono kontenera .blog');
        return [];
      }

      console.log('    ✅ Znaleziono kontener .blog');

      // Znajdź wszystkie artykuły w .items-row
      blogContainer.find('.items-row').each((index, element) => {
        const $row = $(element);
        
        // Znajdź link do artykułu w tym wierszu
        const $link = $row.find('a[href*="view=article"]').first();
        
        if ($link.length > 0) {
          const href = $link.attr('href');
          const title = $link.text().trim();
          
          if (title && href) {
            const fullUrl = href.startsWith('/') ? `${this.baseUrl}${href}` : `${this.baseUrl}/${href}`;
            articles.push({
              title: title,
              url: fullUrl,
              slug: this.generateSlug(title)
            });
            
            console.log(`    📄 Znaleziono artykuł: "${title}"`);
          }
        }
      });

      console.log(`    📄 Znaleziono ${articles.length} artykułów w kategorii`);
      return articles;

    } catch (error) {
      console.error(`    ❌ Błąd pobierania kategorii: ${error.message}`);
      return [];
    }
  }

  // Funkcja do czyszczenia atrybutów HTML
  cleanHtmlAttributes(html) {
    return html
      .replace(/\s+(class|style|id|data-[^=]*|on\w+|tabindex|role|aria-[^=]*|title|alt|width|height|border|cellpadding|cellspacing|align|valign|colspan|rowspan|target|rel|type|name|value|checked|selected|disabled|readonly|multiple|required|autocomplete|placeholder|maxlength|minlength|pattern|min|max|step|size|lang|dir|contenteditable|spellcheck|translate|hidden|inert|popover)\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  // Zapisywanie artykułu do bazy danych
  async saveArticle(articleData) {
    try {
      const { title, content, slug, menuItemId } = articleData;
      
      const [existing] = await this.db.execute(
        'SELECT id FROM articles WHERE slug = ?',
        [slug]
      );

      if (existing.length > 0) {
        console.log(`    ⚠️  Artykuł "${title}" już istnieje, pomijam...`);
        return false;
      }

      await this.db.execute(
        `INSERT INTO articles (
          title, slug, content, excerpt, status, 
          menu_category, responsible_person, created_by, 
          published_by, updated_by, published_at, 
          created_at, updated_at, menu_item_id, view_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), ?, 0)`,
        [
          title,
          slug,
          content,
          content.substring(0, 200) + '...',
          'published',
          null,
          null,
          1,
          1,
          1,
          menuItemId
        ]
      );

      console.log(`    ✅ Zapisano: "${title}" (menu_item_id: ${menuItemId})`);
      this.migratedCount++;
      return true;

    } catch (error) {
      console.error(`    ❌ Błąd zapisywania "${articleData.title}": ${error.message}`);
      this.errorCount++;
      return false;
    }
  }

  // Główna funkcja migracji
  async migrate() {
    try {
      await this.connect();
      await this.loadMenuItems();
      
      console.log('\n🚀 Rozpoczynam migrację artykułów...');
      
      const menuItems = await this.fetchMenuFromOldSite();
      
      if (menuItems.length === 0) {
        console.log('❌ Nie znaleziono pozycji menu do migracji');
        return;
      }

      for (const menuItem of menuItems) {
        console.log(`\n📄 Przetwarzam: ${menuItem.title}`);
        
        if (this.isCategory(menuItem.url)) {
          // To jest kategoria - pobierz artykuły z kategorii
          const articles = await this.fetchArticlesFromCategory(menuItem.url);
          
          for (const article of articles) {
            console.log(`  📄 Artykuł: ${article.title}`);
            const content = await this.fetchArticleContent(article.url);
            const menuItemId = this.findMenuItemId(menuItem.title);
            
            await this.saveArticle({
              title: article.title,
              content: content,
              slug: article.slug,
              menuItemId: menuItemId
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          // To jest pojedynczy artykuł
          const content = await this.fetchArticleContent(menuItem.url);
          const menuItemId = this.findMenuItemId(menuItem.title);
          
          await this.saveArticle({
            title: menuItem.title,
            content: content,
            slug: menuItem.slug,
            menuItemId: menuItemId
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`\n🎉 Migracja zakończona!`);
      console.log(`✅ Przeniesiono: ${this.migratedCount} artykułów`);
      console.log(`❌ Błędy: ${this.errorCount} artykułów`);

    } catch (error) {
      console.error('❌ Błąd migracji:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Uruchom migrację
if (require.main === module) {
  const migrator = new ArticleMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = ArticleMigrator;