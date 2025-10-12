# 🧪 TEST REVERSE PROXY

## 🎯 CEL:
Przetestować czy reverse proxy rozwiązuje problem z pętlą przekierowań.

## 🚀 KROKI TESTOWANIA:

### KROK 1: Sprawdź czy aplikacja działa na porcie 3002
```bash
# Test bezpośrednio na porcie 3002
curl -I http://localhost:3002
curl -I http://localhost:3002/css/main.css
curl -I http://localhost:3002/js/main.js
```

### KROK 2: Sprawdź czy reverse proxy działa
```bash
# Test przez domenę (reverse proxy)
curl -I http://bippiwgizycko.arstudio.atthost24.pl
curl -I http://bippiwgizycko.arstudio.atthost24.pl/css/main.css
curl -I http://bippiwgizycko.arstudio.atthost24.pl/js/main.js
```

### KROK 3: Test w przeglądarce
- Otwórz `http://bippiwgizycko.arstudio.atthost24.pl`
- Sprawdź czy CSS się ładuje (strona powinna mieć style)
- Sprawdź czy JS się ładuje (F12 → Console, nie powinno być błędów)
- Sprawdź czy obrazki się wyświetlają

### KROK 4: Test podstron
- Kliknij na link do podstrony (np. Statut)
- Sprawdź czy nie ma pętli przekierowań
- Sprawdź czy podstrona się ładuje normalnie

---

## 📋 INTERPRETACJA WYNIKÓW:

### ✅ **Jeśli wszystko działa:**
- Reverse proxy rozwiązuje problem
- Aplikacja Node.js obsługuje wszystkie pliki statyczne
- Pętla przekierowań została naprawiona

### ❌ **Jeśli nadal są problemy:**

#### Problem 1: localhost:3002 nie działa
```bash
# Sprawdź status aplikacji
pm2 status
pm2 logs bippiwgizycko --lines 20
```

#### Problem 2: Reverse proxy nie działa
```bash
# Sprawdź czy mod_proxy jest włączony
apache2ctl -M | grep proxy

# Sprawdź logi Apache
tail -f /var/log/apache2/error.log
```

#### Problem 3: Nadal pętla przekierowań
- Problem może być w kodzie aplikacji
- Sprawdź czy wykluczenia w routes/main.js działają

---

## 🔍 DODATKOWE TESTY:

### Test z nagłówkami:
```bash
curl -v http://bippiwgizycko.arstudio.atthost24.pl/css/main.css 2>&1 | grep -E "(Location:|HTTP/)"
```

### Test z różnymi plikami:
```bash
# Test CSS
curl -I http://bippiwgizycko.arstudio.atthost24.pl/css/main.css

# Test JS
curl -I http://bippiwgizycko.arstudio.atthost24.pl/js/main.js

# Test obrazka
curl -I http://bippiwgizycko.arstudio.atthost24.pl/images/polish-coat-of-arms.png
```

### Test podstron:
```bash
# Test podstrony
curl -I http://bippiwgizycko.arstudio.atthost24.pl/statut

# Test z nagłówkami
curl -v http://bippiwgizycko.arstudio.atthost24.pl/statut 2>&1 | grep -E "(Location:|HTTP/)"
```

---

## 🛠️ ROZWIĄZANIA PROBLEMÓW:

### Jeśli mod_proxy nie jest włączony:
```bash
# Włącz mod_proxy
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

### Jeśli nadal są problemy z plikami statycznymi:
- Sprawdź czy wykluczenia w routes/main.js działają
- Sprawdź czy express.static jest poprawnie skonfigurowany

### Jeśli nadal jest pętla przekierowań:
- Problem może być w kodzie aplikacji
- Sprawdź logi aplikacji: `pm2 logs bippiwgizycko`

---

## 📞 WYNIKI:

**Daj znać:**
1. Czy `localhost:3002` działa?
2. Czy pliki CSS/JS się ładują przez domenę?
3. Czy strona ma style w przeglądarce?
4. Czy podstrony działają bez pętli?
5. Jakie błędy pokazują logi?

---

**To powinno rozwiązać problem z pętlą przekierowań!** 🚀
