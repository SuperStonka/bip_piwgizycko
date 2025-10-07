# Folder Backupów - PIW Giżycko CMS

Ten folder zawiera skompresowane kopie zapasowe aplikacji i bazy danych w formacie ZIP.

## Struktura backupu

Każdy backup to skompresowany plik ZIP o nazwie `backup_YYYY-MM-DDTHH-MM-SS.zip`:

```
backup_2025-10-07T20-52-17.zip
├── database_2025-10-07T20-52-17.sql  # Kopia bazy danych (SQL dump)
├── app/                               # Kod aplikacji
│   ├── app.js
│   ├── package.json
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── views/
│   ├── public/
│   └── scripts/
├── uploads/                          # Pliki przesłane przez użytkowników
│   ├── image/
│   └── file/
└── backup_info.json                  # Metadane backupu
```

**Korzyści z kompresji:**
- Oszczędność miejsca (~35% kompresji)
- Łatwiejsze przenoszenie i archiwizacja
- Pojedynczy plik zamiast wielu folderów

## Jak wykonać backup?

Uruchom skrypt backup:

```bash
node scripts/backup.js
```

## Jak przywrócić backup?

### 0. Rozpakuj archiwum ZIP

**Windows:**
- Kliknij prawym przyciskiem na plik ZIP
- Wybierz "Wyodrębnij wszystko..." / "Extract all..."
- Lub użyj 7-Zip, WinRAR

**Linux/Mac:**
```bash
unzip backups/backup_YYYY-MM-DDTHH-MM-SS.zip -d restore_temp/
```

### 1. Przywrócenie bazy danych

**Opcja A: Użycie mysql (command line)**
```bash
mysql -h HOST -u USERNAME -p DATABASE_NAME < restore_temp/database_YYYY-MM-DDTHH-MM-SS.sql
```

**Opcja B: Użycie phpMyAdmin**
1. Zaloguj się do phpMyAdmin
2. Wybierz bazę danych
3. Przejdź do zakładki "Import"
4. Wybierz plik `.sql` z rozpakowanego archiwum
5. Kliknij "Wykonaj"

### 2. Przywrócenie plików aplikacji

**Uwaga:** Przed przywróceniem zrób kopię obecnej wersji!

```bash
# 1. Zatrzymaj aplikację
pm2 stop bip_www_cms

# 2. Skopiuj pliki z backupu
cp -r restore_temp/app/* .

# 3. Przywróć node_modules
npm install

# 4. Skopiuj uploady
cp -r restore_temp/uploads/* public/uploads/

# 5. Uruchom aplikację
pm2 start bip_www_cms

# 6. Usuń folder tymczasowy
rm -rf restore_temp/
```

## Automatyzacja backupów

### Cron (Linux/Mac)

Edytuj crontab:
```bash
crontab -e
```

Dodaj linię (backup codziennie o 2:00 w nocy):
```
0 2 * * * cd /ścieżka/do/aplikacji && node scripts/backup.js >> logs/backup.log 2>&1
```

### Task Scheduler (Windows)

1. Otwórz "Harmonogram zadań" (Task Scheduler)
2. Kliknij "Utwórz zadanie podstawowe"
3. Nazwa: "Backup CMS PIW"
4. Wyzwalacz: Codziennie o 2:00
5. Akcja: Uruchom program
   - Program/skrypt: `node`
   - Argumenty: `scripts/backup.js`
   - Rozpocznij w: `D:\_code\bip_www_cms_piwg`

## Zarządzanie backupami

### Usuwanie starych backupów

Zaleca się okresowe czyszczenie starych backupów aby zaoszczędzić miejsce:

**Strategia 3-2-1:**
- 3 kopie (produkcja + 2 backupy)
- 2 różne nośniki (lokalny + zdalny)
- 1 kopia off-site (np. cloud)

**Przykładowe zasady retencji:**
- Zachowaj ostatnie 7 dziennych backupów
- Zachowaj ostatnie 4 tygodniowe backupy
- Zachowaj ostatnie 12 miesięcznych backupów

## Backup info

Każdy backup zawiera plik `backup_info.json` z informacjami:
- Data i czas wykonania backupu
- Parametry bazy danych (host, nazwa)
- Wersja Node.js
- Lista zbackupowanych elementów
- Rozmiar backupu

## Bezpieczeństwo

⚠️ **UWAGA:** Backupy zawierają wrażliwe dane!

- Nie commituj backupów do repozytorium Git (dodane do `.gitignore`)
- Przechowuj backupy w bezpiecznym miejscu
- Szyfruj backupy przed przesłaniem do chmury
- Regularnie testuj proces przywracania

## Testowanie backupu

Zaleca się regularne testowanie czy backupy są prawidłowe:

1. Co miesiąc sprawdź czy plik SQL otwiera się poprawnie
2. Co kwartał wykonaj pełny test przywracania na środowisku testowym
3. Dokumentuj wyniki testów

## Wsparcie

W razie problemów z backupem lub przywracaniem danych:
- Sprawdź logi: `logs/backup.log`
- Skontaktuj się z administratorem systemu
- Zobacz dokumentację: `IMPLEMENTATION_NOTES.md`

