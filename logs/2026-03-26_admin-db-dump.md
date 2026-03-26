# Admin DB Dump & Import

**Datum:** 2026-03-26
**Branch:** `implement-admin-db-dump` → auf `refactor/calendar-month-tour-slots` fortgeführt
**Auftragsklasse:** 5 – Mehrschichtige Änderung / neues Feature

---

## Ziel

Export aller Anwendungsdaten aus der aktuellen Datenbank als ZIP-Datei (`data.json` + Uploads-Ordner), ListView der vorhandenen Dumps in der Admin-Einstellungsseite und Import mit einem Klick. Ausgeschlossene Tabellen: `users`, `roles`, `projectStatus`, `componentSpecifications`, `productComponent`, `projectProjectStatus`, `employeeAbsences`, `seedRuns`, `seedRunEntities`.

---

## Umgesetzte Funktionen

| Endpoint | Methode | Funktion |
|---|---|---|
| `/api/admin/dumps` | GET | Dump-Liste |
| `/api/admin/dumps/create` | POST | Dump erstellen |
| `/api/admin/dumps/:filename/download` | GET | Dump herunterladen |
| `/api/admin/dumps/import` | POST | Dump importieren |
| `/api/admin/dumps/:filename` | DELETE | Dump löschen |

---

## Betroffene Dateien

- `shared/routes.ts` – 5 neue Routen unter `api.dumps`
- `server/services/dumpService.ts` – neue Datei, Kernlogik Export/Import
- `server/controllers/dumpController.ts` – neue Datei, 5 Handler
- `server/routes/backupRoutes.ts` – 5 neue Route-Registrierungen
- `client/src/components/SettingsPage.tsx` – neue Sektion „Dumps"
- `package.json` – `archiver`, `unzipper`, `@types/archiver`, `@types/unzipper`
- `tests/unit/services/dumpService.test.ts` – neue Datei, 18 Unit-Tests
- `tests/integration/server/admin.dump.integration.test.ts` – neue Datei, 18 Integrationstests
- `docs/TEST_DB_SAFETY_INVENTORY.md` – Eintrag für `dumpService.ts`
- `docs/TEST_MATRIX.md` – 2 neue Einträge

---

## Probleme und Lösungen

### 1. TypeScript: `req.params.filename` hat Typ `string | string[]`

Express-Typdefinitionen erlauben Arrays in `req.params`. Der Controller musste explizit absichern:
```ts
const filename = Array.isArray(req.params["filename"])
  ? req.params["filename"][0]
  : req.params["filename"];
```

### 2. `ParsedMultipartFile` hat keine `.data`-Property

Beim Import wurde `file.data` statt `file.buffer` verwendet. Das ist der tatsächliche Feldname im `ParsedMultipartFile`-Interface aus `server/lib/multipart.ts`.

### 3. ESLint: Floating Promise auf `archive.finalize()`

`archive.finalize()` gibt ein Promise zurück. ESLint meldet einen Fehler, wenn dieses unbehandelt bleibt. Fix: `void archive.finalize()` mit explizitem `void`-Operator.

### 4. `check-destructive-inventory`-Skript schlägt fehl

`dumpService.ts` enthält `TRUNCATE TABLE`, war aber nicht in `docs/TEST_DB_SAFETY_INVENTORY.md` aufgeführt. Fix: Eintrag mit Status `partial` ergänzt (hat Admin-Guard und NODE_ENV-Guard, aber nicht die vollständige `assertSafeDestructiveOperationTarget`-Kette).

### 5. Integrationstests: 500 „Cannot resolve role for session user"

**Ursache:** `loginAdminAgent(app)` wurde in `beforeAll` aufgerufen. Das Setup-File `tests/setup.integration.ts` ruft in `beforeEach` `resetDatabase()` auf, das alle User-IDs zurücksetzt. Die gespeicherte Session-Cookie referenziert danach eine nicht mehr existierende User-ID.

**Muster aus funktionierenden Tests** (`appointments.cancellation.integration.test.ts`): `loginAdminAgent(app)` wird innerhalb jedes `it()`-Blocks aufgerufen.

**Fix:** Alle Tests auf lokale `const admin = await loginAdminAgent(app)` umgestellt.

### 6. Integrationstests: Tests 2 und 3 im `create`-Block schlagen fehl

**Ursache:** `resetIsolatedTestStorage()` in `beforeEach` löscht das gesamte `backups/`-Verzeichnis (inkl. aller Dumps) vor jedem Test. Tests 2 und 3 im `create`-Block haben den Dateinamen aus Test 1 via `createdFilename`-Variable referenziert – der Dump war aber bereits gelöscht.

**Fix:** Jeder Test im `create`-Block erstellt jetzt seinen eigenen Dump (vollständig self-contained, kein geteilter Zustand zwischen Tests).

### 7. `INTERNAL_ERROR` beim Import: `value.toISOString is not a function`

**Ursache:** `db.select()` liefert für `MySqlTimestamp`- und `MySqlDate`-Spalten (ohne `mode:"string"`) JavaScript-`Date`-Objekte zurück. `JSON.stringify` serialisiert diese zu ISO-Strings (`"2026-03-26T09:36:46.000Z"`). Beim Reimport parsed `JSON.parse` die Strings korrekt zurück – aber Drizzles mysql2-Treiber ruft beim Insert `.toISOString()` auf dem String auf und wirft die Exception.

**Fix:** Neue Hilfsfunktion `coerceRowDates(table, rows)` in `dumpService.ts`:
- Nutzt `getTableColumns(table)` aus `drizzle-orm`
- Identifiziert alle Spalten mit `columnType === "MySqlTimestamp"` oder `columnType === "MySqlDate"` ohne `mode:"string"`
- Konvertiert ISO-Strings in diesen Spalten zurück zu `Date`-Objekten vor jedem Batch-Insert

Betroffene Spaltentypen in der Codebasis:
- `MySqlTimestamp`: `createdAt`, `updatedAt`, `lastLoginAt` (nahezu alle Tabellen)
- `MySqlDate` ohne `mode:"string"`: `appointments.startDate`, `appointments.endDate`

### 8. Offenes Problem: Tabelle „Touren" wird möglicherweise nicht übertragen

Nach erfolgreichem Import (HTTP 200) wurde beobachtet, dass die Tours-Tabelle leer sein könnte. Die Ursache ist noch nicht abschließend geklärt.

**Diagnose-Logging ergänzt** (temporär, `logInfo`):
- Jede übersprungene Tabelle wird mit Grund geloggt (`"leer"` oder `"kein Array"`)
- Jede erfolgreich eingespielt Tabelle wird mit Row-Anzahl geloggt

Mögliche Ursachen:
- `tableData["tours"]` ist in der `data.json` nicht vorhanden oder leer (Dump wurde aus einer DB ohne Touren erstellt)
- Der Dump stammt aus einer Version mit abweichendem Schlüsselnamen (unwahrscheinlich, da Dump und Import denselben Code nutzen)

**Nächster Schritt:** Import wiederholen, Serverlog auf `importDump: Tabelle übersprungen { key: 'tours' }` prüfen.

---

## Technische Entscheidungen

- **JSON via Drizzle statt `mysqldump`**: Plattformunabhängig, kein Systemaufruf, kein Shell-Escaping, leicht testbar.
- **FK-Checks deaktiviert via dedizierter PoolConnection**: `SET FOREIGN_KEY_CHECKS=0` muss auf derselben Verbindung laufen wie die TRUNCATEs und Inserts, da es eine Session-Variable ist.
- **`TRUNCATE TABLE` ist DDL und nicht transaktional in MySQL**: Nach dem ersten TRUNCATE befindet sich MySQL in Auto-Commit-Modus. `conn.beginTransaction()` vor den TRUNCATEs hat keine Wirkung auf die DDL-Operationen. Die Inserts laufen daher ebenfalls in Auto-Commit. Bei einem Insert-Fehler werden bereits committed Inserts nicht mehr rückgängig gemacht. Dies ist ein bekanntes Risiko bei größeren Imports.
- **Import-Guard für Production**: `process.env.NODE_ENV === "production"` → 403 Forbidden.
- **Dateinamen-Sicherheit**: Regex `/^dump_\d{4}-\d{2}-\d{2}T[\d-]+Z\.zip$/` verhindert Path-Traversal-Angriffe.
- **Batch-Insert à 500 Rows**: Verhindert zu große SQL-Statements bei umfangreichen Tabellen.

---

## Testergebnis

| Suite | Ergebnis |
|---|---|
| Unit (`dumpService.test.ts`) | 18/18 ✓ |
| Integration (`admin.dump.integration.test.ts`) | 18/18 ✓ |

---

## Bekannte Einschränkungen

- TRUNCATE-Operationen sind nicht transaktional (MySQL DDL). Ein fehlgeschlagener Import hinterlässt die DB in einem inkonsistenten Zustand (bereits truncated, nicht vollständig inseriert).
- Das Diagnose-Logging (`logInfo` pro Tabelle) ist temporär und sollte nach Klärung des Tours-Problems entfernt werden.
- `dumpService.ts` nutzt keinen vollständigen `assertSafeDestructiveOperationTarget`-Guard (nur Admin-Rolle + NODE_ENV-Check). Bei einer zukünftigen Härtung sollte der vollständige Guard-Chain eingebaut werden.
