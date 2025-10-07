# Powiatowy Inspektorat Weterynarii w Piszu - Strona WWW

Responsywna strona internetowa z panelem CMS, zgodna z wytycznymi WCAG 2.1, stworzona w Node.js.

## Funkcjonalności

### Dostępność (WCAG 2.1)
- ✅ Wszystkie elementy graficzne mają tekst alternatywny (alt)
- ✅ Wszystkie pozycje menu są dostępne przez klawisz Tab
- ✅ Program odczytuje treści stron (screen reader support)
- ✅ Odpowiedni kontrast tekstu i tła
- ✅ Odpowiedni odstęp pomiędzy liniami tekstu
- ✅ Poprawna struktura z pozycjonowanymi warstwami (nie tabele)
- ✅ Responsywność - płynne dostosowanie do rozdzielczości
- ✅ Dostosowanie w poziomie
- ✅ Możliwość zmiany kontrastu i powiększenia tekstu
- ✅ Brak elementów animowanych i zabronionych plików
- ✅ Odnośniki mają dobrze widoczny focus
- ✅ Automatycznie generowana mapa strony
- ✅ Treści dostępne przy dowolnym powiększeniu
- ✅ Unikalne wartości znacznika "title" dla każdej strony
- ✅ Język polski określony w atrybucie "lang"
- ✅ Dodatkowy dostęp do głównych pozycji przez tabulator (skiplinks)

### Panel CMS
- Zarządzanie stronami
- Zarządzanie aktualnościami
- System kategorii aktualności
- Edytor treści
- System użytkowników i uprawnień

### Funkcjonalności techniczne
- Responsywny design
- Optymalizacja SEO
- Automatyczne generowanie sitemap.xml
- System breadcrumbs
- Lazy loading obrazów
- Kompresja i optymalizacja

## Wymagania systemowe

- Node.js 18.x lub nowszy
- MySQL 5.7+ lub MariaDB 10.3+
- npm lub yarn

## Instalacja

1. Sklonuj repozytorium:
```bash
git clone https://github.com/SuperStonka/bip_piwpisz2.git
cd bip_piwpisz2
```

2. Zainstaluj zależności:
```bash
npm install
```

3. Skonfiguruj zmienne środowiskowe:
```bash
cp env.example .env
```

Edytuj plik `.env` i ustaw:
```env
# Application Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_PORT=3306

# Application URLs
APP_URL=https://pisz.piw.gov.pl
BASE_URL=https://pisz.piw.gov.pl

# Security (IMPORTANT: Change these in production!)
SESSION_SECRET=your_very_secure_session_secret_here
JWT_SECRET=your_very_secure_jwt_secret_here
```

4. Uruchom aplikację:
```bash
# Tryb deweloperski
npm run dev

# Tryb produkcyjny
npm start
```

5. Otwórz przeglądarkę i przejdź do:
- Strona główna: http://localhost:3000
- Panel administracyjny: http://localhost:3000/admin

## Pierwsze uruchomienie

1. Utwórz pierwszego użytkownika administracyjnego:
```bash
node scripts/create-admin.js
```

2. Zaloguj się do panelu administracyjnego używając utworzonych danych

3. Utwórz stronę główną w panelu administracyjnym

## Struktura projektu

```
├── models/              # Modele bazy danych
│   ├── Page.js         # Model strony
│   ├── News.js         # Model aktualności
│   └── User.js         # Model użytkownika
├── routes/              # Routing
│   ├── main.js         # Główne trasy
│   ├── admin.js        # Trasy panelu administracyjnego
│   └── api.js          # API endpoints
├── views/               # Szablony EJS
│   ├── layout.ejs      # Główny layout
│   ├── index.ejs       # Strona główna
│   ├── page.ejs        # Szablon strony
│   ├── news-list.ejs   # Lista aktualności
│   ├── news-detail.ejs # Szczegóły aktualności
│   ├── sitemap.ejs     # Mapa strony
│   ├── error.ejs       # Strona błędu
│   └── admin/          # Szablony panelu administracyjnego
├── public/              # Zasoby statyczne
│   ├── css/            # Style CSS
│   ├── js/             # Skrypty JavaScript
│   └── images/         # Obrazy
├── app.js              # Główny plik serwera
└── package.json        # Konfiguracja npm
```

## Dostępność

### Kontrolki dostępności
- **Kontrast**: Przełączanie trybu wysokiego kontrastu
- **Rozmiar czcionki**: A-, A, A+ (zmniejsz, domyślny, zwiększ)
- **Nawigacja klawiaturą**: Wszystkie elementy dostępne przez Tab

### Skróty klawiszowe
- `Alt + 1`: Przejdź do treści głównej
- `Alt + 2`: Przejdź do menu głównego
- `Alt + 3`: Przejdź do informacji kontaktowych
- `Alt + C`: Przełącz kontrast
- `Alt + Plus`: Zwiększ rozmiar czcionki
- `Alt + Minus`: Zmniejsz rozmiar czcionki
- `Alt + 0`: Resetuj rozmiar czcionki

### Funkcje dla czytników ekranu
- Skip links (przeskakiwanie do głównych sekcji)
- Semantyczne znaczniki HTML5
- ARIA labels i role
- Ogłoszenia o zmianach treści
- Opisowe teksty alternatywne

## API

### Endpoints dla stron
- `GET /api/pages` - Lista wszystkich stron
- `POST /api/pages` - Utwórz nową stronę
- `PUT /api/pages/:id` - Aktualizuj stronę
- `DELETE /api/pages/:id` - Usuń stronę

### Endpoints dla aktualności
- `GET /api/news` - Lista wszystkich aktualności
- `POST /api/news` - Utwórz nową aktualność
- `PUT /api/news/:id` - Aktualizuj aktualność
- `DELETE /api/news/:id` - Usuń aktualność

## Wdrażanie na serwerze

### 1. Przygotowanie serwera
```bash
# Zainstaluj Node.js (zalecana wersja 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Zainstaluj MySQL
sudo apt-get install mysql-server

# Zainstaluj PM2 dla zarządzania procesami
sudo npm install -g pm2
```

### 2. Klonowanie i konfiguracja
```bash
# Sklonuj repozytorium
git clone https://github.com/SuperStonka/bip_piwpisz2.git
cd bip_piwpisz2

# Zainstaluj zależności
npm install

# Skonfiguruj zmienne środowiskowe
cp env.example .env
nano .env
```

### 3. Konfiguracja bazy danych
```bash
# Utwórz bazę danych
mysql -u root -p
CREATE DATABASE bip_piwpisz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bip_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON bip_piwpisz.* TO 'bip_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Uruchom skrypt inicjalizacyjny
node scripts/create-admin.js
```

### 4. Konfiguracja Nginx (opcjonalnie)
```nginx
server {
    listen 80;
    server_name pisz.piw.gov.pl;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Uruchomienie aplikacji
```bash
# Uruchom z PM2
pm2 start app.js --name "bip-cms"

# Zapisz konfigurację PM2
pm2 save
pm2 startup

# Sprawdź status
pm2 status
pm2 logs bip-cms
```

### Zmienne środowiskowe produkcyjne
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=bip_user
DB_PASSWORD=secure_password
DB_NAME=bip_piwpisz
APP_URL=https://pisz.piw.gov.pl
SESSION_SECRET=very_secure_session_secret_here
```

### Optymalizacje produkcyjne
- ✅ Kompresja gzip
- ✅ Cache headers
- ✅ Helmet.js dla bezpieczeństwa
- ✅ Trust proxy dla prawidłowego wykrywania IP
- ✅ Optymalizacja obrazów
- ✅ Minifikacja CSS/JS

## Licencja

MIT License - zobacz plik LICENSE dla szczegółów.

## Wsparcie

W przypadku problemów lub pytań, skontaktuj się z zespołem deweloperskim.

---

**Powiatowy Inspektorat Weterynarii w Piszu**  
al. Józefa Piłsudskiego 15A/1, 12-200 Pisz  
Tel: 87 423 27 53
