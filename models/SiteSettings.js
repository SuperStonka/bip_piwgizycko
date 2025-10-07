class SiteSettings {
    constructor(db) {
        this.db = db;
        this.cache = new Map();
        this.cacheTime = 5 * 60 * 1000; // 5 minut cache
    }

    async get(key) {
        try {
            // Sprawdź cache
            const cached = this.cache.get(key);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTime) {
                return cached.value;
            }

            // Pobierz z bazy
            const [rows] = await this.db.execute(
                'SELECT setting_value FROM site_settings WHERE setting_key = ?',
                [key]
            );

            const value = rows.length > 0 ? rows[0].setting_value : null;
            
            // Zapisz w cache
            this.cache.set(key, {
                value: value,
                timestamp: Date.now()
            });

            return value;
        } catch (error) {
            console.error(`Błąd pobierania ustawienia ${key}:`, error);
            return null;
        }
    }

    async getAll() {
        try {
            // Sprawdź cache dla wszystkich ustawień
            const cacheKey = 'all_settings';
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTime) {
                return cached.value;
            }

            // Pobierz wszystkie ustawienia z bazy
            const [rows] = await this.db.execute(
                'SELECT setting_key, setting_value FROM site_settings'
            );

            const settings = {};
            rows.forEach(row => {
                settings[row.setting_key] = row.setting_value;
            });

            // Zapisz w cache
            this.cache.set(cacheKey, {
                value: settings,
                timestamp: Date.now()
            });

            return settings;
        } catch (error) {
            console.error('Błąd pobierania wszystkich ustawień:', error);
            return {};
        }
    }

    async set(key, value, updatedBy = 1) {
        try {
            await this.db.execute(
                `INSERT INTO site_settings (setting_key, setting_value, updated_by) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?`,
                [key, value, updatedBy, value, updatedBy]
            );

            // Wyczyść cache
            this.cache.delete(key);
            this.cache.delete('all_settings');

            return true;
        } catch (error) {
            console.error(`Błąd zapisywania ustawienia ${key}:`, error);
            return false;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = SiteSettings;
