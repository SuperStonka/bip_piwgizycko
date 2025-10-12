# 🔄 PRZYWRACANIE ORYGINALNEJ KONFIGURACJI SESJI

## 📋 INFORMACJE O ZMIANACH:

W pliku `app.js` zostały wprowadzone **tymczasowe zmiany** w celu rozwiązania problemu z pętlą przekierowań:

### ✅ **Co zostało zmienione:**

1. **Wyłączono `session-file-store`** - teraz używany jest `MemoryStore`
2. **Wyłączono `proxy: true`** w konfiguracji sesji
3. **Dodano komentarze** wyjaśniające zmiany

### 🎯 **Dlaczego te zmiany:**

- `session-file-store` może powodować problemy z uprawnieniami na serwerze
- `proxy: true` może powodować problemy z przekierowaniami w niektórych konfiguracjach
- `MemoryStore` jest bardziej stabilny dla tymczasowego rozwiązania

---

## 🔄 PRZYWRACANIE ORYGINALNEJ KONFIGURACJI:

### Gdy problem zostanie rozwiązany, przywróć oryginalną konfigurację:

**W pliku `app.js` znajdź sekcję (około linii 338-359) i zastąp:**

```javascript
// TYMCZASOWO: Wyłącz proxy i FileStore aby rozwiązać problem z pętlą przekierowań
// if (process.env.NODE_ENV === 'production') {
//   sessionConfig.proxy = true;
// }

// TYMCZASOWO: Używaj MemoryStore dla wszystkich środowisk (bez FileStore)
console.log('✅ Using MemoryStore for sessions (temporary fix for redirect loop)');
// if (process.env.NODE_ENV === 'production') {
//   try {
//     const FileStore = require('session-file-store')(session);
//     sessionConfig.store = new FileStore({
//       path: './sessions',
//       ttl: 24 * 60 * 60, // 24 hours
//       retries: 5
//     });
//     if (IS_DEV) console.log('✅ Using FileStore for sessions (production)');
//   } catch (error) {
//     console.log('⚠️  FileStore not available, using MemoryStore (not recommended for production)');
//   }
// } else {
//   if (IS_DEV) console.log('✅ Using MemoryStore for sessions (development)');
// }
```

**Zastąp na oryginalną konfigurację:**

```javascript
// Add proxy setting only in production
if (process.env.NODE_ENV === 'production') {
  sessionConfig.proxy = true;
}

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

**Usuń też komentarz na górze pliku:**

```javascript
// TYMCZASOWA NAPRAWA PĘTLI PRZEKIEROWAŃ:
// - Wyłączono session-file-store (używany MemoryStore)
// - Wyłączono proxy w konfiguracji sesji
// - Te zmiany powinny rozwiązać problem z pętlą przekierowań
// - Po rozwiązaniu problemu można przywrócić oryginalną konfigurację
```

---

## 🚀 KROKI PRZYWRACANIA:

### 1. **Edytuj plik app.js:**
```bash
nano app.js
```

### 2. **Wprowadź zmiany** (jak opisano powyżej)

### 3. **Zrestartuj aplikację:**
```bash
pm2 restart bippiwgizycko
```

### 4. **Przetestuj:**
```bash
curl -v http://bippiwgizycko.arstudio.atthost24.pl/statut
```

---

## ⚠️ UWAGI:

- **MemoryStore** nie jest zalecany dla produkcji (sesje są tracone przy restarcie)
- **FileStore** jest lepszy dla produkcji, ale może wymagać odpowiednich uprawnień
- **Proxy** może być potrzebny w niektórych konfiguracjach serwera

---

## 🔍 MONITOROWANIE:

Po przywróceniu oryginalnej konfiguracji monitoruj:

```bash
# Sprawdź logi aplikacji
pm2 logs bippiwgizycko --lines 20

# Sprawdź czy sesje działają
curl -v -c cookies.txt http://bippiwgizycko.arstudio.atthost24.pl
curl -v -b cookies.txt http://bippiwgizycko.arstudio.atthost24.pl/admin
```

---

**Powodzenia! 🚀**
