# 🔧 Naprawa problemu "Firefox wykrył, że serwer przekierowuje żądanie w pętli"

## Przyczyna problemu:
Aplikacja działająca za Nginx proxy nie mogła poprawnie obsługiwać sesji/ciasteczek.

## ✅ Rozwiązanie - Krok po kroku:

### 1. Zaktualizuj kod na serwerze:

```bash
cd ~/bippiwgizycko  # lub /var/www/bippiwgizycko

# Pobierz najnowsze zmiany
git pull origin main

# Zainstaluj zależności (jeśli potrzeba)
npm install
```

### 2. Zaktualizuj plik .env na serwerze:

```bash
nano .env
```

Dodaj lub zaktualizuj linię:
```env
HTTPS=false
```

Jeśli używasz HTTPS (certyfikat SSL), ustaw:
```env
HTTPS=true
```

### 3. Upewnij się, że Nginx jest poprawnie skonfigurowany:

```bash
sudo nano /etc/nginx/sites-available/bippiwgizycko
```

Konfiguracja Nginx powinna zawierać:

```nginx
server {
    listen 80;
    server_name bippiwgizycko.arstudio.atthost24.pl;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        
        # WAŻNE: Nagłówki proxy
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Ważne dla sesji
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }

    client_max_body_size 10M;
}
```

Jeśli masz HTTPS (SSL):

```nginx
server {
    listen 443 ssl http2;
    server_name bippiwgizycko.arstudio.atthost24.pl;

    ssl_certificate /etc/letsencrypt/live/bippiwgizycko.arstudio.atthost24.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bippiwgizycko.arstudio.atthost24.pl/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;  # WAŻNE dla HTTPS
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }

    client_max_body_size 10M;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name bippiwgizycko.arstudio.atthost24.pl;
    return 301 https://$server_name$request_uri;
}
```

### 4. Sprawdź konfigurację Nginx:

```bash
sudo nginx -t
```

Jeśli OK, zrestartuj:

```bash
sudo systemctl restart nginx
```

### 5. Zrestartuj aplikację:

```bash
pm2 restart bippiwgizycko
pm2 logs bippiwgizycko
```

### 6. Wyczyść ciasteczka w przeglądarce:

**Firefox:**
1. Ctrl + Shift + Del
2. Zaznacz "Ciasteczka"
3. Kliknij "Wyczyść teraz"

**Lub specyficznie dla Twojej domeny:**
1. F12 → Application/Storage
2. Cookies → gizycko.piw.gov.pl
3. Usuń wszystkie

**Chrome:**
1. F12 → Application
2. Clear storage → Clear site data

### 7. Testowanie:

```bash
# Sprawdź czy aplikacja działa
curl -I http://localhost:3002

# Sprawdź nagłówki przez Nginx
curl -I http://bippiwgizycko.arstudio.atthost24.pl

# Sprawdź logi
pm2 logs bippiwgizycko --lines 50
```

## 🔍 Co zostało naprawione w kodzie:

### app.js:
1. **Dodano trust proxy:**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     app.set('trust proxy', 1);
   }
   ```

2. **Poprawiono konfigurację sesji:**
   ```javascript
   const sessionConfig = {
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: { 
       secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
       maxAge: 24 * 60 * 60 * 1000,
       httpOnly: true,
       sameSite: 'lax',
       path: '/'
     },
     proxy: process.env.NODE_ENV === 'production'
   };
   ```

## ❓ Dalsze problemy?

### Problem: Nadal przekierowania w pętli

**Sprawdź folder sessions:**
```bash
cd ~/bippiwgizycko
ls -la sessions/
```

Jeśli folder nie istnieje lub nie ma uprawnień:
```bash
mkdir -p sessions
chmod 755 sessions
chown your_user:your_user sessions
```

### Problem: "Cannot set headers after they are sent"

Sprawdź logi:
```bash
pm2 logs bippiwgizycko
```

Może być problem z wielokrotnymi przekierowaniami w kodzie.

### Problem: "Session store failed"

Zainstaluj session-file-store:
```bash
npm install session-file-store
pm2 restart bippiwgizycko
```

## 📞 Kontakt
Jeśli problem nadal występuje, sprawdź:
- Logi Nginx: `sudo tail -f /var/log/nginx/error.log`
- Logi aplikacji: `pm2 logs bippiwgizycko`
- Status PM2: `pm2 status`

