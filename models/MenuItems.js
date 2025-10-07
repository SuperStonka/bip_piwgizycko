class MenuItems {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.cacheTime = 5 * 60 * 1000; // 5 minut cache
    }

    async getAll() {
        try {
            // Sprawdź cache
            const cacheKey = 'all_menu_items';
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTime) {
                return cached.value;
            }

            // Pobierz wszystkie aktywne pozycje menu z bazy
            const [rows] = await this.db.execute(`
                SELECT id, title, slug, parent_id, sort_order, display_mode, show_excerpts, hidden
                FROM menu_items 
                WHERE is_active = 1 AND hidden = 0
                ORDER BY parent_id IS NULL DESC, sort_order ASC, id ASC
            `);

            // Zapisz w cache
            this.cache.set(cacheKey, {
                value: rows,
                timestamp: Date.now()
            });

            return rows;
        } catch (error) {
            console.error('Błąd pobierania pozycji menu:', error);
            return [];
        }
    }

    async getMenuStructure() {
        try {
            const allItems = await this.getAll();
            
            // Rozdziel na główne pozycje i submenu
            const mainItems = allItems.filter(item => item.parent_id === null);
            const subItems = allItems.filter(item => item.parent_id !== null);
            
            // Dodaj submenu do głównych pozycji
            const menuStructure = mainItems.map(mainItem => {
                const children = subItems
                    .filter(subItem => subItem.parent_id === mainItem.id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(child => ({
                        ...child,
                        parentSlug: mainItem.slug // Dodaj slug rodzica do child
                    }));
                
                return {
                    ...mainItem,
                    children: children
                };
            });

            return menuStructure;
        } catch (error) {
            console.error('Błąd tworzenia struktury menu:', error);
            return [];
        }
    }

    async findBySlug(slug) {
        try {
            const [rows] = await this.db.execute(
                'SELECT * FROM menu_items WHERE slug = ? AND is_active = 1 AND hidden = 0',
                [slug]
            );

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error(`Błąd pobierania pozycji menu dla slug ${slug}:`, error);
            return null;
        }
    }

    generateUrl(item, parentSlug = null) {
        // Generuj URL na podstawie slug z bazy danych
        // Wszystkie pozycje menu (niezależnie od parent_id) używają swojego slug
        if (item.display_mode === 'article') {
            // Jeśli display_mode to 'article', użyj /menu/:id
            return `/menu/${item.id}`;
        } else {
            // Dla 'list', NULL lub innych - użyj slug (bez względu na parent_id)
            return `/${item.slug}`;
        }
    }

    // Metoda do sprawdzania czy pozycja ma artykuły
    async hasArticles(item) {
        if (!this.db || !item.id) return false;
        
        try {
            const [rows] = await this.db.execute(
                'SELECT COUNT(*) as count FROM articles WHERE menu_item_id = ? AND status = "published"',
                [item.id]
            );
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error checking articles for menu item:', error);
            return false;
        }
    }

    // Znajdź pozycję menu po ID
    async findById(id) {
        try {
            const [rows] = await this.db.execute(
                'SELECT * FROM menu_items WHERE id = ? AND is_active = 1 AND hidden = 0',
                [id]
            );

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error(`Błąd pobierania pozycji menu dla id ${id}:`, error);
            return null;
        }
    }

    // Znajdź pozycję menu po ID (niezależnie od is_active/hidden) — używane w panelu admina
    async findByIdAny(id) {
        try {
            const [rows] = await this.db.execute(
                'SELECT * FROM menu_items WHERE id = ?',
                [id]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error(`Błąd pobierania pozycji menu (ANY) dla id ${id}:`, error);
            return null;
        }
    }

    // Generuj pełny URL dla artykułu z kontekstem menu
    generateArticleUrl(article, menuItem, parentMenuItem = null) {
        if (parentMenuItem) {
            // Jeśli artykuł jest w submenu, użyj hierarchii parent/child
            return `/${parentMenuItem.slug}/${article.slug}`;
        } else if (menuItem) {
            // Jeśli artykuł jest w głównym menu
            return `/${menuItem.slug}/${article.slug}`;
        } else {
            // Fallback - tylko slug artykułu
            return `/${article.slug}`;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = MenuItems;
