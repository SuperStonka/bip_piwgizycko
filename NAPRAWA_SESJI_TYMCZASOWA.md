# 🚨 TYMCZASOWA NAPRAWA PĘTLI PRZEKIEROWAŃ

## 🔍 ZIDENTYFIKOWANE PROBLEMY:

1. **Session-file-store** może nie działać poprawnie
2. **Middleware loadCurrentUser** może powodować problemy z sesjami
3. **Konfiguracja proxy** w sesjach może być nieprawidłowa

---

## ✅ ROZWIĄZANIE - KROK PO KROKU:

### KROK 1: Backup aktualnego app.js
```bash
cd ~/bippiwgizycko
cp app.js app.js.backup
```

### KROK 2: Tymczasowo wyłącz problematyczne middleware

**Edytuj app.js:**
```bash
nano app.js
```

**Znajdź te linie i zakomentuj je (dodaj // na początku):**

**Linia ~360 (session middleware):**
```javascript
// app.use(session(sessionConfig));
```

**Linia ~57 w routes/admin.js (loadCurrentUser middleware):**
```javascript
// router.use(loadCurrentUser);
```

### KROK 3: Alternatywnie - użyj MemoryStore zamiast FileStore

**W app.js znajdź sekcję sesji (około linii 344-358) i zastąp:**

```javascript
// Use FileStore for production, MemoryStore for development
if (process.env.NODE_ENV === 'production') {
  try {
    const FileStore = require('session-file-store')(session);
    sessionConfig.store = new FileStore({
      path: './sessions',
      ttl: 24 * 60 * 60, // 24 hours
      retries: 5
    });
    if (IS_DEV) console.log('✅ Using FileStore for sessions (production)');
  } catch (error) {
    console.log('⚠️  FileStore not available, using MemoryStore (not recommended for production)');
  }
} else {
  if (IS_DEV) console.log('✅ Using MemoryStore for sessions (development)');
}
```

**Zastąp na:**
```javascript
// TYMCZASOWO: Używaj MemoryStore dla wszystkich środowisk
console.log('✅ Using MemoryStore for sessions (temporary fix)');
```

### KROK 4: Wyłącz proxy w sesjach

**Znajdź linię (około 340):**
```javascript
if (process.env.NODE_ENV === 'production') {
  sessionConfig.proxy = true;
}
```

**Zastąp na:**
```javascript
// TYMCZASOWO: Wyłącz proxy
// if (process.env.NODE_ENV === 'production') {
//   sessionConfig.proxy = true;
// }
```

### KROK 5: Zrestartuj aplikację
```bash
pm2 restart bippiwgizycko
pm2 logs bippiwgizycko --lines 20
```

### KROK 6: Test
```bash
# Test bezpośrednio
curl -v http://localhost:3002/statut

# Test przez domenę
curl -v http://bippiwgizycko.arstudio.atthost24.pl/statut
```

---

## 🔧 ALTERNATYWNE ROZWIĄZANIE - MINIMALNA KONFIGURACJA SESJI:

Jeśli powyższe nie pomoże, użyj tej minimalnej konfiguracji sesji:

**W app.js zastąp całą sekcję sessionConfig:**

```javascript
// Minimalna konfiguracja sesji (bez FileStore, bez proxy)
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'temporary-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'bip.sid',
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  }
  // Bez store (używa MemoryStore)
  // Bez proxy
};
```

---

## 📋 TESTY:

### Test 1: Sprawdź czy aplikacja się uruchamia
```bash
pm2 status
pm2 logs bippiwgizycko --lines 10
```

### Test 2: Sprawdź czy strona główna działa
```bash
curl -I http://bippiwgizycko.arstudio.atthost24.pl
```

### Test 3: Sprawdź czy podstrony działają
```bash
curl -I http://bippiwgizycko.arstudio.atthost24.pl/statut
```

### Test 4: Sprawdź w przeglądarce
- Otwórz stronę w trybie incognito
- Sprawdź czy nie ma pętli przekierowań

---

## 🔄 PRZYWRÓCENIE KONFIGURACJI:

Gdy problem zostanie rozwiązany, przywróć konfigurację:

```bash
cp app.js.backup app.js
pm2 restart bippiwgizycko
```

---

## 🆘 JEŚLI NADAL NIE DZIAŁA:

### Sprawdź czy to problem z bazą danych:
```bash
# Test połączenia z bazą
mysql -u 9518_piwgizyckob -p'Nz21n$VH!wxFB' -h arstudio.atthost24.pl -e "SHOW DATABASES;"
```

### Sprawdź czy to problem z Passenger:
```bash
# Sprawdź status Passenger
passenger-status

# Sprawdź logi Apache
tail -f /var/log/apache2/error.log
```

### Sprawdź czy to problem z routingiem:
```bash
# Test bezpośrednio na porcie Node.js
curl -v http://localhost:3002
```

---

**Wykonaj te kroki i daj znać co pokazują!** 🔍
