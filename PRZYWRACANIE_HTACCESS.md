# 🔄 PRZYWRACANIE KONFIGURACJI .HTACCESS

## 📋 INFORMACJE O ZMIANACH:

W pliku `.htaccess` zostały **tymczasowo wyłączone** reguły, które powodowały konflikt z Passenger:

### ✅ **Co zostało wyłączone:**

1. **`<FilesMatch>` dla plików statycznych** - powodowało konflikt z Passenger
2. **`mod_deflate` (Gzip Compression)** - powodowało konflikt z Passenger

### 🎯 **Dlaczego te zmiany:**

- **Passenger** automatycznie obsługuje pliki statyczne
- **Apache** próbował też obsłużyć te same pliki
- To powodowało **konflikt i pętlę przekierowań**
- Wyłączenie tych reguł pozwala Passenger obsłużyć wszystko

---

## 🔄 PRZYWRACANIE ORYGINALNEJ KONFIGURACJI:

### Gdy problem zostanie rozwiązany, możesz przywrócić oryginalną konfigurację:

**W pliku `.htaccess` znajdź sekcję (około linii 21-41) i zastąp:**

```apache
# TYMCZASOWO WYŁĄCZONE - powodowały konflikt z Passenger
# Cache Control dla plików statycznych
# <FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
#     ExpiresActive On
#     ExpiresDefault "access plus 1 month"
#     Header set Cache-Control "public, immutable"
# </FilesMatch>

# Gzip Compression
# <IfModule mod_deflate.c>
#     AddOutputFilterByType DEFLATE text/plain
#     AddOutputFilterByType DEFLATE text/html
#     AddOutputFilterByType DEFLATE text/xml
#     AddOutputFilterByType DEFLATE text/css
#     AddOutputFilterByType DEFLATE application/xml
#     AddOutputFilterByType DEFLATE application/xhtml+xml
#     AddOutputFilterByType DEFLATE application/rss+xml
#     AddOutputFilterByType DEFLATE application/javascript
#     AddOutputFilterByType DEFLATE application/x-javascript
#     AddOutputFilterByType DEFLATE application/json
# </IfModule>
```

**Zastąp na oryginalną konfigurację:**

```apache
# Cache Control dla plików statycznych
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>
```

**Usuń też komentarz na górze pliku:**

```apache
# TYMCZASOWA NAPRAWA PĘTLI PRZEKIEROWAŃ:
# - Wyłączono FilesMatch i mod_deflate (konflikt z Passenger)
# - Passenger obsługuje pliki statyczne automatycznie
```

---

## 🚀 KROKI PRZYWRACANIA:

### 1. **Edytuj plik .htaccess:**
```bash
nano .htaccess
```

### 2. **Wprowadź zmiany** (jak opisano powyżej)

### 3. **Zrestartuj aplikację:**
```bash
pm2 restart bippiwgizycko
```

### 4. **Przetestuj:**
```bash
curl -I http://bippiwgizycko.arstudio.atthost24.pl/css/main.css
```

---

## ⚠️ UWAGI:

- **Passenger** automatycznie obsługuje pliki statyczne
- **Apache** może nie być potrzebny do obsługi plików CSS/JS
- **Cache i Gzip** mogą być obsługiwane przez Passenger lub Node.js
- **Security Headers** nadal działają (nie zostały wyłączone)

---

## 🔍 MONITOROWANIE:

Po przywróceniu oryginalnej konfiguracji monitoruj:

```bash
# Sprawdź czy pliki CSS/JS się ładują
curl -I http://bippiwgizycko.arstudio.atthost24.pl/css/main.css
curl -I http://bippiwgizycko.arstudio.atthost24.pl/js/main.js

# Sprawdź czy nie ma pętli przekierowań
curl -v http://bippiwgizycko.arstudio.atthost24.pl/statut
```

---

**Powodzenia! 🚀**
