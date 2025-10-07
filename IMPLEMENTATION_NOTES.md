# Notatki implementacyjne - PIW Giżycko CMS

**Repozytorium GitHub:** https://github.com/SuperStonka/bip_piwgizycko.git

## Status implementacji (ostatnia aktualizacja: 2025-01-08)

### ✅ Ukończone funkcjonalności

#### 1. Sidebar Menu - Accordion (strona publiczna)
**Lokalizacja:** `views/layout.ejs`, `public/js/main.js`

**Implementacja:**
- Dodano atrybuty `data-menu-key` i `data-parent-key` do elementów sidebar w `views/layout.ejs` (linie ~193-197)
- Zaimplementowano logikę akordeonu w `public/js/main.js`:
  - Tylko jeden parent może być otwarty jednocześnie
  - Kliknięcie w `span.sidebar-arrow` steruje otwarciem/zamknięciem
  - Stan otwartego parenta zapisywany w `localStorage` (klucz: `sidebar-open-parent-key`)
  - Po przeładowaniu strony przywracany jest ostatni otwarty parent
  - Użytkownik może ręcznie zamknąć parent (wtedy żaden nie jest otwarty)

**Kluczowe funkcje:**
```javascript
// public/js/main.js
const OPEN_PARENT_KEY = 'sidebar-open-parent-key';
function saveOpenParentKey(parentKey) { ... }
function restoreAccordionState() { ... }
```

#### 2. Panel Admin - Podstrona Menu
**Lokalizacja:** `views/admin/menu.ejs`, `public/js/admin-menu.js`, `routes/admin.js`

**Problem rozwiązany:**
- **CSP (Content Security Policy)** blokował inline scripty
- Przeniesiono cały inline `<script>` z `views/admin/menu.ejs` do osobnego pliku `public/js/admin-menu.js`
- Teraz ładowany przez `<script src="/js/admin-menu.js"></script>`

**Funkcjonalność checkboxów:**
- **Checkbox "Aktywne"** → kolumna `is_active` (0/1) w tabeli `menu_items`
- **Checkbox "Widoczne"** → kolumna `hidden` (0=widoczne, 1=ukryte) w tabeli `menu_items`

**Backend endpoint:** `POST /admin/menu/:id/toggle`
```javascript
// routes/admin.js (linie ~503-531)
// Akceptuje: { field: 'active' | 'visible', value: boolean }
// Zwraca: { ok: true, state: { is_active, hidden } }
```

**Sortowanie:**
- Struktura menu w panelu admina renderowana według `sort_order` (rosnąco) + `id` (tie-breaker)
- Implementacja w `views/admin/menu.ejs` (linia ~15):
```javascript
const group = (byParent[parentId||0]||[]).slice().sort(function(a,b){ 
  return (a.sort_order||0) - (b.sort_order||0) || (a.id||0) - (b.id||0); 
});
```

**Formularze (Dodaj/Edytuj):**
- `is_active = checkbox ? 1 : 0`
- `hidden = checkbox_widoczne ? 0 : 1` (odwrotność)

**Stan po aktualizacji:**
- Frontend po toggle wywołuje `GET /admin/menu/:id` aby pobrać aktualny stan z DB
- UI synchronizuje się z faktycznymi wartościami w bazie
- Badge "Widoczne/Ukryte" aktualizuje się dynamicznie

---

## 🔄 Do zrobienia (kolejne zadania)

### 1. Panel Admin - Podstrona Ustawienia (`/admin/settings`)
**Plik:** `views/admin/settings.ejs`
- Weryfikacja i poprawki formularzy
- Walidacja pól
- CSP compliance (sprawdzić czy nie ma inline scriptów)

### 2. Panel Admin - Podstrona Użytkownicy (`/admin/users`)
**Plik:** `views/admin/users.ejs`
- CRUD użytkowników
- Role i uprawnienia
- CSP compliance

### 3. Panel Admin - Menu - dodatkowe poprawki
**Do ustalenia z klientem**
- Drag & drop dla zmiany `sort_order`?
- Masowe operacje (ukryj/pokaż wiele pozycji)?
- Podgląd struktury menu przed zapisem?

---

## 🛠️ Kluczowe zasady implementacji

### Content Security Policy (CSP)
**Problem:** Inline scripty (`<script>...</script>`) są blokowane przez CSP.

**Rozwiązanie:**
1. Zawsze przenoś inline scripty do osobnych plików w `public/js/`
2. Ładuj przez `<script src="/js/nazwa-pliku.js"></script>`
3. Pliki dozwolone w CSP: `script-src 'self' https://cdn.jsdelivr.net`

**Przykład błędu w konsoli:**
```
Content-Security-Policy: Ustawienia strony zablokowały wykonanie wbudowanego skryptu (script-src-elem)
```

### Struktura plików admin
```
views/admin/
  _header.ejs       - wspólny header + topbar + tabs
  _footer.ejs       - zamknięcie layoutu
  dashboard.ejs
  articles.ejs
  menu.ejs          - ✅ GOTOWE
  settings.ejs      - 🔄 TODO
  users.ejs         - 🔄 TODO
  analytics.ejs

public/js/
  admin.js          - główna logika admina (artykuły, tabele)
  admin-menu.js     - ✅ GOTOWE - dedykowany dla menu
  
routes/
  admin.js          - wszystkie endpointy /admin/*
```

### Debugowanie
Gdy coś nie działa:
1. Sprawdź Console przeglądarki (F12) - czy są błędy CSP lub JS?
2. Sprawdź Console serwera (terminal) - czy endpoint jest wywoływany?
3. Dodaj tymczasowe `console.log()` w obu miejscach
4. Usuń logi po naprawie

---

## 📊 Baza danych

### Tabela `menu_items`
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
title           VARCHAR(255)
slug            VARCHAR(255)
parent_id       INT NULL              -- FK do menu_items.id
sort_order      INT DEFAULT 0         -- kolejność wyświetlania
display_mode    ENUM('single','list')
is_active       TINYINT(1) DEFAULT 1  -- 1=aktywne, 0=nieaktywne
hidden          TINYINT(1) DEFAULT 0  -- 0=widoczne, 1=ukryte
show_excerpts   TINYINT(1) DEFAULT 0
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Uwaga:** `hidden` jest odwrotnością `visible` w UI:
- `hidden=0` → Widoczne ✅
- `hidden=1` → Ukryte ❌

---

## 🔍 Jak kontynuować pracę (dla nowego chatu)

### Krok 1: Przeczytaj ten plik
```
Przeczytaj IMPLEMENTATION_NOTES.md aby poznać aktualny stan projektu
```

### Krok 2: Zidentyfikuj zadanie
Sprawdź sekcję "🔄 Do zrobienia" powyżej.

### Krok 3: Sprawdź CSP
Jeśli pracujesz nad stroną admin, **zawsze** testuj czy inline scripty nie są zablokowane.

### Krok 4: Wzoruj się na gotowych rozwiązaniach
- Menu (`views/admin/menu.ejs` + `public/js/admin-menu.js`) - ✅ wzorcowa implementacja
- Sidebar accordion (`views/layout.ejs` + `public/js/main.js`) - ✅ localStorage + single-open

---

## 🎯 Najczęstsze problemy i rozwiązania

### Problem: Checkbox nie zmienia wartości w bazie
**Przyczyna:** Inline script zablokowany przez CSP
**Rozwiązanie:** Przenieś do osobnego pliku .js

### Problem: Stan checkboxa nie zgadza się z bazą
**Przyczyna:** Frontend i backend używają różnych konwencji (true/false vs 0/1)
**Rozwiązanie:** 
- Backend zawsze parsuje: `boolValue = (rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1')`
- Backend zwraca aktualny stan z DB po UPDATE
- Frontend synchronizuje checkbox z odpowiedzią: `cb.checked = (state.hidden == 0)`

### Problem: Menu nie sortuje się według sort_order
**Przyczyna:** Brak sortowania w renderowaniu
**Rozwiązanie:** Dodaj `.sort()` przed `.forEach()`:
```javascript
const group = (byParent[parentId||0]||[]).slice().sort((a,b) => 
  (a.sort_order||0) - (b.sort_order||0) || (a.id||0) - (b.id||0)
);
```

---

## 📝 Changelog

### 2025-01-07
- ✅ Zaimplementowano accordion w sidebar (strona publiczna)
- ✅ Naprawiono checkboxy "Aktywne" i "Widoczne" w panelu admin/menu
- ✅ Przeniesiono inline script do `public/js/admin-menu.js` (CSP fix)
- ✅ Dodano sortowanie według `sort_order` w renderowaniu menu
- ✅ Backend zwraca aktualny stan po toggle
- ✅ Frontend synchronizuje UI z bazą danych
- ✅ Zamieniono przyciski "Edytuj" i "Usuń" na ikony SVG w panelu admin/menu
  - Użyto inline SVG (bezpieczne dla CSP)
  - Ikona ołówka (edit) - niebieski kolor strony (`--admin-primary`) z hover
  - Ikona kosza (delete) - czerwona z hover
  - Dodano style `.btn-icon`, `.btn-icon-primary` i `.btn-icon-danger` w `public/css/admin.css`
- ✅ Niestandardowe checkboxy "Aktywne" i "Widoczne" z kolorami
  - Zaznaczone (ON) - zielone tło (#22c55e) z białym checkmarkiem ✓
  - Odznaczone (OFF) - żółte tło (#fef3c7) z pomarańczowym borderem
  - Klasa `.toggle-green-yellow` z custom styling (appearance: none)
  - Labelki "Aktywne" i "Widoczne" zmieniają kolor:
    - Zielony (#16a34a) gdy włączone
    - Pomarańczowy (#d97706) gdy wyłączone
  - Dynamiczna zmiana koloru labelek przez JavaScript przy toggle
- ✅ Automatyczne ustawianie `sort_order` przy dodawaniu nowej pozycji menu
  - Backend pobiera max(sort_order) z tej samej grupy (parent_id)
  - Nowa pozycja otrzymuje sort_order = max + 1
  - Pozycje dodawane zawsze na końcu swojej grupy
- ✅ Separatory (pionowe kreski) oddzielające sekcje akcji
  - Cienka linia (1px) w kolorze #d1d5db
  - Padding left i right po 5px
  - Klasa `.icon-separator`
  - Separator po checkboxach, przed ikoną Edytuj
  - Separator między ikonami Edytuj i Usuń
- ✅ Drag & Drop do zmiany kolejności menu (sort_order)
  - Natywne HTML5 drag and drop API (bezpieczne dla CSP)
  - Ikona ⋮⋮ jako handle (cursor: move)
  - Można przeciągać tylko w obrębie tej samej grupy (parent_id)
  - Wizualne efekty: opacity podczas drag, niebieski border przy hover
  - Backend endpoint: `POST /admin/menu/reorder`
  - Automatyczne przeładowanie po zmianie kolejności
  - Style: `.menu-item-draggable`, `.dragging`, `.drag-over`

- ✅ Podstrona Ustawienia - nowy układ z sekcjami
  - Usunięto główny `.card`, formularz bezpośrednio w `.page-content`
  - Każda grupa pól w osobnej sekcji `.settings-section` z białym tłem
  - Nagłówki sekcji w `.settings-section-header` (szare tło #f9fafb)
  - Zawartość w `.settings-section-body` (białe tło, padding 1rem)
  - Layout: 2 kolumny w grid, każda sekcja jako osobny box
  - Style: border-radius 8px, border #e5e7eb
  - Przeniesiono inline script do `public/js/admin-settings.js` (CSP fix)
  - Dodano debug logi do sprawdzania zapisywania ustawień
  - Backend: `POST /admin/settings` - update lub insert do `site_settings`

#### 5. Panel Admin - Podstrona Użytkownicy
**Lokalizacja:** `views/admin/users.ejs`, `public/js/admin-users.js`, `routes/admin.js`

**Wzorowane na:** Podstrona Artykuły (tabela, wyszukiwanie, filtrowanie, paginacja)

**Implementacja:**
- ✅ Tabela użytkowników z pełnym zarządzaniem (CRUD)
  - Kolumny: Login, Imię i nazwisko, Email, Rola, Data utworzenia, Akcje
  - Tabela rozciągnięta na pełną szerokość (style="width:100%")
  - Ikony Edytuj (niebieski) i Usuń (czerwony) wzorowane na Menu
  - Badge dla roli: zielony (Administrator), szary (Edytor)
- ✅ Wyszukiwanie w czasie rzeczywistym (debounce 300ms)
  - Przeszukuje: login (username), imię+nazwisko, email
  - Input z placeholderem "Szukaj po loginie, nazwie, emailu..."
- ✅ Filtrowanie po roli
  - Dropdown: Wszystkie role / Administrator / Edytor
  - Działa wraz z wyszukiwaniem
- ✅ Sortowanie kliknięciem w nagłówki kolumn
  - Sortowalne: Login, Email, Rola, Data utworzenia
  - Wskaźniki kierunku: ↕ (domyślnie), ↑ (rosnąco), ↓ (malejąco)
  - Domyślne sortowanie: Data utworzenia DESC
  - Poprawne etykiety kolumn po zmianie sortowania
- ✅ Paginacja
  - Wybór rozmiaru strony: 10/25/50/100
  - Przyciski ‹ › do nawigacji
  - Numeracja stron z kropkami (...) dla długich list
- ✅ Modale CRUD (zgodne z CSP - bez inline scripts)
  - **Dodaj użytkownika:** Login, Imię, Nazwisko, Email, Hasło, Rola
    - Ikona generowania hasła (16 znaków: małe, duże, cyfry, znaki specjalne)
    - Ikona pokaż/ukryj hasło (toggle visibility)
  - **Edytuj użytkownika:** Wszystkie pola + opcjonalna zmiana hasła
  - **Zmień hasło:** Modal dostępny tylko dla administratorów
    - Ikona w tabeli (żółty kolor, symbol kłódki)
    - Generowanie hasła z taką samą logiką jak w formularzu dodawania
    - Toggle visibility dla hasła
  - **Usuń użytkownika:** Potwierdzenie z nazwą użytkownika (login)
- ✅ Backend endpoints (routes/admin.js)
  - `GET /admin/users` - Lista użytkowników (ORDER BY created_at DESC)
  - `POST /admin/users` - Tworzenie nowego użytkownika
    - Walidacja: username, email, password wymagane
    - Sprawdzanie duplikatów username/email
    - Hashowanie hasła przez model User
  - `GET /admin/users/:id` - Pobieranie danych pojedynczego użytkownika
  - `PUT /admin/users/:id` - Aktualizacja użytkownika
    - Walidacja: username, email wymagane
    - Sprawdzanie duplikatów (exclude current user)
    - Hasło opcjonalne (jeśli puste, nie zmienia)
  - `POST /admin/users/:id/change-password` - Zmiana hasła użytkownika
    - Dostępne tylko dla administratorów
    - Walidacja: hasło wymagane
    - Hashowanie hasła przez model User
  - `DELETE /admin/users/:id` - Usuwanie użytkownika
    - Ochrona: nie można usunąć własnego konta
    - Walidacja: sprawdzanie czy użytkownik istnieje
- ✅ Frontend JavaScript (public/js/admin-users.js)
  - Stan aplikacji: allUsers, filteredUsers, pagination state
  - Funkcje filtrowania, sortowania, renderowania
  - Obsługa modali (open/close)
  - Fetch API dla komunikacji z backendem
  - Alert messages (success/error) z auto-hide (3s)
  - Debounce dla wyszukiwania
  - Generator hasła: `generatePassword()` - 16 znaków, mix wszystkich typów
  - Toggle visibility dla pól hasła
- ✅ Wykorzystanie istniejących styli z admin.css
  - `.btn-icon`, `.btn-icon-primary`, `.btn-icon-danger`
  - `.modal-overlay`, `.modal-card`, `.modal-header`, `.modal-body`, `.modal-footer`
  - `.alert-success`, `.alert-error`
  - `.badge-success`, `.badge-draft`
  - `.login-input`, `.login-label`, `.req-star`

**Pliki zmodyfikowane:**
- `views/admin/users.ejs` - kompletna przebudowa (było tylko "w przygotowaniu")
  - Dodano ikony generowania hasła i toggle visibility
  - Dodano ikonę zmiany hasła (tylko dla admina, żółty kolor)
  - Modal zmiany hasła z funkcjami generowania
- `public/js/admin-users.js` - nowy plik z całą logiką frontendu
  - Funkcja `generatePassword()` - bezpieczne hasła 16 znaków
  - Obsługa 4 modali: dodaj, edytuj, zmień hasło, usuń
- `routes/admin.js` - dodano 5 endpointów (linie ~692-835)
  - CRUD użytkowników + endpoint zmiany hasła

#### 6. Panel Admin - Dashboard
**Lokalizacja:** `views/admin/dashboard.ejs`

**Poprawki:**
- ✅ Poprawiono linki w "Szybkie akcje"
  - "Zarządzaj menu" → `/admin/menu`
  - "Ustawienia strony" → `/admin/settings`
  - Wcześniej były puste linki `href="#"`

#### 7. Skrypt Backup - Kopia zapasowa aplikacji i bazy danych
**Lokalizacja:** `scripts/backup.js`

**Funkcjonalność:**
- ✅ Automatyczne tworzenie skompresowanej kopii zapasowej (.zip) do folderu `/backups/`
- ✅ Backup bazy danych MySQL:
  - Próba użycia `mysqldump` (jeśli dostępny)
  - Alternatywna metoda: eksport przez mysql2 (Node.js)
  - Format SQL z CREATE TABLE i INSERT statements
  - Eksportuje wszystkie tabele: articles, users, menu_items, site_settings, article_versions
- ✅ Backup plików aplikacji:
  - Kod źródłowy: app.js, package.json, config, models, routes, views
  - Style i skrypty: public/css, public/js, public/images
  - Pliki konfiguracyjne: env.development, env.example
- ✅ Backup plików użytkowników:
  - public/uploads/image (zdjęcia przesłane w artykułach)
  - public/uploads/file (pliki przesłane w artykułach)
  - public/download (dokumenty do pobrania, np. formularze)
- ✅ Kompresja ZIP:
  - Maksymalny poziom kompresji (level 9)
  - Oszczędność miejsca ~35%
  - Automatyczne usuwanie folderu tymczasowego
- ✅ Zawartość archiwum ZIP:
  ```
  backup_YYYY-MM-DDTHH-MM-SS.zip
    ├── database_YYYY-MM-DDTHH-MM-SS.sql
    ├── app/ (kod aplikacji)
    ├── uploads/ (zdjęcia i pliki z artykułów)
    ├── download/ (dokumenty do pobrania)
    └── backup_info.json (metadane)
  ```
- ✅ Plik backup_info.json zawiera:
  - Datę i timestamp backupu
  - Informacje o bazie danych (host, nazwa)
  - Wersję Node.js
  - Listę zbackupowanych elementów
  - Rozmiar backupu (przed kompresją)

**Wymagane pakiety:**
- `archiver` - tworzenie archiwów ZIP

**Użycie:**
```bash
node scripts/backup.js
```

**Przykładowy output:**
```
📦 Tworzę kopię plików użytkowników...
  ✅ uploads/ → 131184 bytes
  ✅ download/ → 230860 bytes
✅ Kopia plików użytkowników zakończona

✅ KOPIA ZAPASOWA ZAKOŃCZONA POMYŚLNIE!
📂 Lokalizacja: D:\_code\bip_www_cms_piwg\backups\backup_2025-10-07T20-54-07.zip
💾 Rozmiar: 1.45 MB
📊 Kompresja: 33%
📅 Data: 7.10.2025, 22:54:08
```

### Następne kroki
- 🔄 Dalsze poprawki według potrzeb

---

**Kontakt z developerem:**
- Ten plik jest dokumentacją techniczną dla AI assistant
- Aktualizuj go po każdej większej zmianie w projekcie
- Zachowaj spójny format i jasne opisy

