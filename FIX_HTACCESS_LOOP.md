# Naprawa problemu pętli przekierowań (.htaccess)

## Problem:
Stary plik `.htaccess` zawierał reguły RewriteRule, które powodowały pętlę przekierowań w aplikacji Node.js z Phusion Passenger.

## Rozwiązanie:

### 1. Zaktualizuj kod z GitHub:

```bash
cd ~/bippiwgizycko
git pull origin main
```

### 2. Usuń stary plik .htaccess (backup):

```bash
cp .htaccess .htaccess.backup
```

### 3. Nowy .htaccess został już pobrany z git

Nowy plik `.htaccess` **NIE zawiera** reguł RewriteRule, które powodowały pętlę.

### 4. Zrestartuj aplikację:

```bash
# Metoda 1: Jeśli używasz PM2
pm2 restart bippiwgizycko

# Metoda 2: Jeśli używasz Passenger
touch tmp/restart.txt

# Metoda 3: Jeśli Passenger wymaga restart.txt w głównym folderze
touch restart.txt
```

### 5. Wyczyść cache przeglądarki:

**Firefox:**
1. Ctrl + Shift + Del
2. Zaznacz "Ciasteczka" i "Cache"
3. Kliknij "Wyczyść teraz"

**Chrome:**
1. Ctrl + Shift + Del
2. Zaznacz "Cookies" i "Cached images"
3. Kliknij "Clear data"

---

## Co zostało zmienione:

### ❌ STARA konfiguracja (powodowała pętlę):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/admin
RewriteRule ^(.*)$ / [QSA,L]  # ← To powodowało pętlę!
```

### ✅ NOWA konfiguracja (bez RewriteRule):
```apache
# Passenger obsługuje routing automatycznie
# Tylko nagłówki bezpieczeństwa i cache
```

---

## Dodatkowe opcje (jeśli potrzeba):

### Jeśli nadal występuje problem:

1. **Sprawdź czy Passenger jest włączony:**
   ```bash
   cat .htaccess | grep Passenger
   ```

2. **Sprawdź logi Apache:**
   ```bash
   tail -f /var/log/apache2/error.log
   # lub
   tail -f ~/logs/error.log
   ```

3. **Sprawdź status Passenger:**
   ```bash
   passenger-status
   ```

4. **Sprawdź czy aplikacja działa:**
   ```bash
   curl -I http://bippiwgizycko.arstudio.atthost24.pl
   ```

---

## Konfiguracja Passenger (opcjonalna)

Jeśli potrzebujesz dodatkowej konfiguracji Passenger, dodaj do `.htaccess`:

```apache
# Ścieżka do Node.js (znajdź: which node)
PassengerNodejs /usr/bin/node

# Typ aplikacji
PassengerAppType node

# Plik startowy
PassengerStartupFile app.js

# Root aplikacji
PassengerAppRoot /home/username/bippiwgizycko

# Włącz Passenger
PassengerEnabled on

# Environment
PassengerAppEnv production
```

---

## Testowanie:

```bash
# 1. Sprawdź czy aplikacja odpowiada
curl -v http://bippiwgizycko.arstudio.atthost24.pl

# 2. Sprawdź czy nie ma przekierowań w pętli
curl -L http://bippiwgizycko.arstudio.atthost24.pl 2>&1 | grep "Location:"

# 3. Sprawdź logi aplikacji
pm2 logs bippiwgizycko --lines 50
```

---

## Jeśli hosting NIE używa Passenger:

Jeśli serwer nie używa Phusion Passenger, tylko standardowy Apache jako reverse proxy, użyj tej konfiguracji:

```apache
RewriteEngine On

# Przekieruj wszystko na Node.js (port 3002)
RewriteRule ^$ http://127.0.0.1:3002/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3002/$1 [P,L]

ProxyPreserveHost On
ProxyPass / http://127.0.0.1:3002/
ProxyPassReverse / http://127.0.0.1:3002/
```

Ale **NIE używaj** tego razem z Passenger!

---

Powodzenia! 🚀

