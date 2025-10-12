# 🧪 TEST MINIMALNEJ WERSJI APLIKACJI

## 🎯 CEL:
Przetestować czy problem z pętlą przekierowań leży w middleware czy w routing.

## 🚀 KROKI TESTOWANIA:

### KROK 1: Backup aktualnego app.js
```bash
cd ~/bippiwgizycko
cp app.js app.js.backup
```

### KROK 2: Zastąp app.js minimalną wersją
```bash
cp app_minimal.js app.js
```

### KROK 3: Zrestartuj aplikację
```bash
pm2 restart bippiwgizycko
pm2 logs bippiwgizycko --lines 10
```

### KROK 4: Test podstawowy
```bash
# Test czy aplikacja się uruchamia
curl -I http://localhost:3002

# Test strony głównej
curl -I http://bippiwgizycko.arstudio.atthost24.pl

# Test podstrony
curl -I http://bippiwgizycko.arstudio.atthost24.pl/statut
```

### KROK 5: Test w przeglądarce
- Otwórz `http://bippiwgizycko.arstudio.atthost24.pl` w trybie incognito
- Sprawdź czy strona główna się ładuje
- Kliknij na podstronę (np. Statut)
- Sprawdź czy nie ma pętli przekierowań

---

## 📋 INTERPRETACJA WYNIKÓW:

### ✅ **Jeśli minimalna wersja DZIAŁA:**
- Problem jest w middleware (sesje, helmet, debug)
- Możemy stopniowo włączać middleware i znaleźć problematyczny

### ❌ **Jeśli minimalna wersja NIE DZIAŁA:**
- Problem jest w routing lub konfiguracji serwera
- Może być problem z .htaccess, Passenger, lub Apache

---

## 🔄 PRZYWRACANIE:

### Po teście przywróć oryginalną wersję:
```bash
cp app.js.backup app.js
pm2 restart bippiwgizycko
```

---

## 🔍 DODATKOWE TESTY:

### Jeśli minimalna wersja działa, testuj stopniowo:

#### Test 1: Włącz sesje
```bash
# Edytuj app.js - odkomentuj linię z session
nano app.js
# Znajdź: // app.use(session(sessionConfig));
# Zmień na: app.use(session(sessionConfig));
pm2 restart bippiwgizycko
```

#### Test 2: Włącz helmet
```bash
# Edytuj app.js - odkomentuj linię z helmet
nano app.js
# Znajdź: // app.use(helmet({...}));
# Zmień na: app.use(helmet({...}));
pm2 restart bippiwgizycko
```

#### Test 3: Włącz middleware bazy danych
```bash
# Edytuj app.js - odkomentuj middleware bazy danych
nano app.js
pm2 restart bippiwgizycko
```

---

## 📞 WYNIKI:

**Daj znać:**
1. Czy minimalna wersja działa?
2. Czy strona główna się ładuje?
3. Czy podstrony działają bez pętli?
4. Jakie błędy pokazują logi?

---

**To pomoże nam zidentyfikować dokładną przyczynę problemu!** 🔍
