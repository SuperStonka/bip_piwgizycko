# 🧪 TEST KONFIGURACJI SERWERA

## 🎯 CEL:
Sprawdzić czy problem jest w konfiguracji Apache/Passenger czy w aplikacji Node.js.

## 🚀 KROKI TESTOWANIA:

### KROK 1: Test bezpośrednio na porcie 3002
```bash
# Test czy aplikacja Node.js odpowiada
curl -I http://localhost:3002
curl -I http://127.0.0.1:3002

# Test pliku CSS bezpośrednio
curl -I http://localhost:3002/css/main.css
curl -I http://127.0.0.1:3002/css/main.css

# Test podstrony bezpośrednio
curl -I http://localhost:3002/statut
curl -I http://127.0.0.1:3002/statut
```

### KROK 2: Test przez domenę (Apache/Passenger)
```bash
# Test strony głównej przez domenę
curl -I http://bippiwgizycko.arstudio.atthost24.pl

# Test pliku CSS przez domenę
curl -I http://bippiwgizycko.arstudio.atthost24.pl/css/main.css

# Test podstrony przez domenę
curl -I http://bippiwgizycko.arstudio.atthost24.pl/statut
```

### KROK 3: Sprawdź logi aplikacji
```bash
pm2 logs bippiwgizycko --lines 20
```

### KROK 4: Sprawdź logi Apache
```bash
# Sprawdź logi błędów Apache
tail -f /var/log/apache2/error.log
# lub
tail -f ~/logs/error.log
```

---

## 📋 INTERPRETACJA WYNIKÓW:

### ✅ **Jeśli localhost:3002 DZIAŁA, ale domena NIE:**
- Problem jest w konfiguracji Apache/Passenger
- Aplikacja Node.js działa poprawnie
- Trzeba naprawić konfigurację serwera web

### ❌ **Jeśli localhost:3002 NIE DZIAŁA:**
- Problem jest w aplikacji Node.js
- Trzeba naprawić kod aplikacji

### 🔄 **Jeśli oba NIE DZIAŁAJĄ:**
- Problem jest w aplikacji Node.js
- Trzeba naprawić kod aplikacji

---

## 🛠️ ALTERNATYWNE ROZWIĄZANIA:

### Jeśli problem jest w Apache/Passenger:

#### Opcja 1: Użyj konfiguracji reverse proxy
```bash
# Zastąp .htaccess
cp .htaccess .htaccess.backup
cp .htaccess_proxy .htaccess
```

#### Opcja 2: Sprawdź konfigurację Passenger
```bash
# Sprawdź czy Passenger jest włączony
apache2ctl -M | grep passenger

# Sprawdź status Passenger
passenger-status
```

#### Opcja 3: Sprawdź konfigurację wirtualnego hosta
```bash
# Sprawdź konfigurację Apache
cat /etc/apache2/sites-available/*bippiwgizycko*
```

---

## 🔍 DODATKOWE TESTY:

### Test z nagłówkami:
```bash
curl -v http://bippiwgizycko.arstudio.atthost24.pl/css/main.css 2>&1 | grep -E "(Location:|HTTP/)"
```

### Test z różnymi metodami:
```bash
# GET request
curl -X GET http://bippiwgizycko.arstudio.atthost24.pl/css/main.css

# HEAD request
curl -X HEAD http://bippiwgizycko.arstudio.atthost24.pl/css/main.css
```

---

## 📞 WYNIKI:

**Daj znać:**
1. Czy `localhost:3002` działa?
2. Czy `localhost:3002/css/main.css` działa?
3. Czy domena działa?
4. Jakie błędy pokazują logi?

---

**To pomoże nam zidentyfikować czy problem jest w aplikacji czy w konfiguracji serwera!** 🔍
