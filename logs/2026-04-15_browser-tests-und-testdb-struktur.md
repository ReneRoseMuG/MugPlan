# Auftragslog: Browser-Tests und Test-DB-Struktur

## Zweck

Analyse und Teilbehebung einer breit gestreuten Browser-Testauffälligkeit im Wochenkalender sowie Dokumentation der dabei sichtbar gewordenen Test-DB-, Migrations- und Strukturproblematik.

## Scope

- Korrektur der nicht mehr klickbaren `+`-Buttons im Wochenkalender
- Testseitige Nachführung der direkt betroffenen Unit- und Browser-Tests
- Analyse der Test-DB, der Migrationshistorie und der realen DB-Struktur
- Keine neue Produktivlogik außerhalb des Wochenheader-Fixes
- Keine neue Migration und keine Änderung an Backend-Persistenzpfaden

## Technische Entscheidungen

### Wochenheader-Regression

- Die Ursache der primären Browser-Regressionsgruppe lag nicht in der Test-DB, sondern im Wochenheader:
  - `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
  - Der Label-Bereich fing Pointer-Events ab und überdeckte dadurch die sichtbaren `+`-Buttons der Wochenansicht.
- Der Fix wurde bewusst klein gehalten:
  - nicht-interaktive Label-Fläche pointer-technisch durchlässig gemacht
  - linke Menü-/Notizspalte kompakter gemacht
  - Tour-Label ohne den zuletzt eingeführten dunklen Hintergrund-Effekt gerendert
- Die Header-Geometrie und die generelle Wochenansichtslogik wurden nicht umgebaut.

### Test-Fixes

- Mehrere Tests waren nach UI- und Vertragsänderungen veraltet und wurden gezielt nachgeführt, ohne neue Produktivlogik einzuführen.
- Dabei wurden insbesondere folgende Muster korrigiert:
  - unvollständige React-Query-Mocks in Unit-Tests
  - veraltete DOM-Reihenfolgeannahmen
  - geänderte Callback- und Restore-Contracts
  - Browser-Tests, die unnötig über den `KW einfügen`-Dialog gingen, obwohl die Zielwoche bereits als Karte sichtbar war
  - Browser-Assertions, die zu breit auf Notification- und Dialogtext gleichzeitig matchten

### Test-DB- und Migrationsproblematik

- `mugplan_dev` war während der Analyse migrationssynchron mit dem Repo-Stand.
- `mugplan_test` war zwischenzeitlich nicht in einem sauber bootstrapbaren Zustand.
- Die Repo-Migrationskette ist für einen echten Neuaufbau aus leerem Zustand aktuell nicht verlässlich:
  - `migrations/0000_nice_bulldozer.sql` scheitert auf leerer DB mit einer FK-Abhängigkeit auf `project`
  - `migrations/0023_drop_seed_run_tables.sql` setzt `seed_run_entity` voraus und ist nicht robust gegen bereits fehlende Tabellen
- Die Test-DB wurde deshalb temporär über eine bekannte lauffähige Referenzstruktur aus `mugplan_dev` wiederhergestellt, damit Integration und Browser-E2E erneut belastbar geprüft werden konnten.

### Besondere Bedeutung von `__drizzle_migrations`

- `tests/helpers/resetDatabase.ts` leert per `DELETE FROM` jede Tabelle, die über `SHOW TABLES` gefunden wird.
- Dadurch wird auch `__drizzle_migrations` geleert.
- Ergebnis:
  - Während oder nach einem Testlauf erscheint `mugplan_test` formal oft als „unsynchron“, obwohl die Tabellenstruktur weiter vorhanden ist.
  - Dieser Zustand ist aktuell eine Eigenschaft des Reset-Mechanismus und darf nicht vorschnell als alleinige Ursache eines Testfehlers interpretiert werden.
- Für reine Migrationsstatus-Prüfungen direkt nach Test-Resets ist dieser Effekt zu berücksichtigen.

### Struktur-Drift zwischen realer DB und `shared/schema.ts`

- Ein bereitgestellter Struktur-Dump sowie die laufende DB zeigten, dass die reale Datenbankstruktur nicht vollständig mit `shared/schema.ts` übereinstimmt.
- Sichtbare Drift-Punkte:
  - `tours.description` existiert in der realen DB, wird vom aktuellen Code aber nicht verwendet
  - `appointments.project_id` ist real mit `ON DELETE CASCADE` hinterlegt, in `shared/schema.ts` aber als `set null` modelliert
  - `appointments.tour_id` ist real mit `ON DELETE SET NULL` hinterlegt, in `shared/schema.ts` aber als `restrict` modelliert
  - `users.created_by` hat real einen FK auf `users.id`, der in `shared/schema.ts` nicht modelliert ist
- Diese Drift war nicht die Hauptursache des hier bearbeiteten Browser-Problems, bleibt aber ein Wartungs- und Vertrauensproblem für künftige Migrationen, Tests und Direktzugriffe.

## Betroffene Dateien

### Direkt geändert

- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `tests/e2e-browser/appointment-direct-relations.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/calendarWeekView.laneHoverFallback.test.tsx`
- `tests/unit/ui/home.behavior.test.tsx`

### Für die Analyse relevant

- `tests/helpers/resetDatabase.ts`
- `shared/schema.ts`
- `migrations/0000_nice_bulldozer.sql`
- `migrations/0023_drop_seed_run_tables.sql`
- `logs/2026-04-13_wochenkalender-notizheader.md`
- `logs/2026-04-14_wochenheader_follow_polish.md`

## Hinweise zum Testen

- Erfolgreich geprüft wurden gezielt:
  - die betroffenen Wochenheader-/`+`-Browser-Flows
  - die drei angepassten Unit-Dateien
  - die beiden ursprünglich problematischen Browser-Dateien `employee-appointment-mutation-tracking` und `ft04.tour-employee-cascade`
- Der volle Integrationstestlauf war während der Analyse grün und sprach damit gegen ein akutes generelles Test-DB-Problem als Hauptursache der Browser-Gruppe.

## Bekannte Einschränkungen

- Die Test-DB-/Migrationslage ist weiterhin technisch unsauber dokumentiert:
  - leerer Bootstrap über die Repo-Migrationskette ist nicht zuverlässig
  - `__drizzle_migrations` wird im Test-Reset geleert
  - reale DB-Struktur und `shared/schema.ts` driften in einzelnen FK- und Zusatzspaltenfragen auseinander
- Beim späteren Zusammenlauf der beiden Browser-Dateien tauchte zusätzlich noch ein separater FT04-Rest auf:
  - eine zu breite Text-Assertion auf `Kalenderwoche zu klein`
  - das ist kein DB-Fehler, sondern ein weiterer testseitiger Selektor-Fall
- Für die hier dokumentierte DB-Strukturproblematik wurde in diesem Auftrag keine fachliche Bereinigung oder neue Migration umgesetzt.
