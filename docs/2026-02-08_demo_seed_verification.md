# Demo-Seed Erweiterung: Implementations- und Verifikationsstand (2026-02-08)

## Scope
Umgesetzt wurden die offenen Restpunkte der Demo-Seed-Erweiterung:
- realistische Stammdaten (Mitarbeiter/Kunden) via Faker (DE)
- Sauna-CSV-Kopplung inkl. Ofen-Mapping
- 1 Projekt = genau 1 Montage-Termin
- zusätzliche projektgebundene Rekla-Termine
- Template-Rendering über Settings-Keys
- robuste Seed-Run/Purge-Verifikation inklusive Datei-Checks

## Technische Entscheidungen
- CSV-Pfad robust gemacht: `.ai/Demodaten` und `.ai/demodata` werden unterstützt.
- Mapping-Fix: `fasssauna_modelle_ofen_mapping.csv` kann `oven_name` liefern; wird deterministisch auf `ovenId` (Slug) gemappt.
- Rekla-Datum: deterministische Auswahl innerhalb des konfigurierten Delay-Fensters mit Werktag-Prüfung.
- Rekla-Mindestszenario: Falls `reklShare > 0` und Share-Auswahl leer wäre, wird deterministisch 1 Rekla erzwungen (sofern Ofen-Zuordnung verfügbar).

## Neue/angepasste Artefakte
- `server/services/demoSeedService.ts`
- `server/services/demoDataFiller.ts`
- `server/seed/csvLoader.ts`
- `server/lib/templateRender.ts`
- `server/settings/registry.ts`
- `server/services/userSettingsService.ts`
- `server/repositories/demoSeedRepository.ts`
- `client/src/components/DemoDataPage.tsx`
- `script/test-template-render.ts`
- `script/verify-demo-seed.ts`
- `migrations/2026-02-07_demo_seed_runs.sql`
- `package.json`

## Ausgeführte Verifikation
- `npm run check` -> erfolgreich
- `npm run test:template-render` -> erfolgreich
- `npm run verify:demo-seed` -> erfolgreich

## Abnahme-Checkliste
- [x] Seed läuft end-to-end ohne Fehler
- [x] `fasssauna_modelle.csv` wird aus `.ai/Demodaten`/`.ai/demodata` geladen
- [x] Pro seeded Projekt existiert genau 1 Montage-Termin (`appointment_mount`)
- [x] Rekla-Termine sind projektgebunden (`projectId = project.id`)
- [x] Rekla liegt nach Montage im Fenster `14..42` Tage
- [x] Ofen-Konsistenz: Rekla-Titel-Ofen ist in Projektbeschreibung enthalten
- [x] Templates werden über resolved Settings gelesen (Defaults greifen bei fehlender User-Settings-Auflösung)
- [x] Renderer entfernt leere Bullet-Zeilen
- [x] Purge entfernt DB-Objekte, Join-Records und erzeugte Dateien
- [x] Zweiter Purge ist idempotent (`noOp: true`)

## Hinweis
- In der aktuellen DB-Konfiguration erscheint die Warnung von `mysql2` zu `ssl-mode` als "invalid configuration option". Funktional waren alle Verifikationen erfolgreich.
