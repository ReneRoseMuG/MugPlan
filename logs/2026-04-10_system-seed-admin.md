# Auftragslog: Admin-System-Seed

## Zweck

Ein expliziter, nur fuer `ADMIN` verfuegbarer System-Seed wurde eingefuehrt, um definierte System-Stammdaten fuer Tags, Touren und Notizvorlagen idempotent auf Sollzustand zu bringen. Gleichzeitig wurde das bisherige implizite On-demand-Seeding fuer System-Tags aus regulaeren Lese- und Schreibpfaden entfernt.

## Scope

- Neuer Admin-Endpunkt `POST /api/admin/system-seed`
- Neuer orchestrierender Service fuer Tags, Touren und Notizvorlagen
- Erweiterung der Admin-Einstellungen im Pane `Sicherheit`
- Umbenennung der bisherigen `MANAGED_REPORT_EXCLUSION_*`-Bezeichner auf `MANAGED_COMPLAINT_*`
- Erweiterung der geschuetzten System-Tags um `Vakant`
- Anpassung und Erweiterung von Unit-, Integrations- und UI-Tests

## Technische Entscheidungen

- Umsetzung entlang der vorhandenen Struktur `Route -> Controller -> Service -> Repository`
- Keine kuenstliche Nachbildung nicht vorhandener Legacy-Seed-Services aus dem Aufgabenbrief
- Tags werden ueber `masterDataRepository.ensureTagDefinition(...)` idempotent angeglichen
- Touren werden bewusst direkt ueber `toursRepository` statt ueber `toursService.createTour()` gepflegt, um die Standard-Namenslogik zu vermeiden
- Notizvorlagen werden beim Update nur in Farbe, `print` und `sortOrder` angeglichen; bestehende `body`-Inhalte bleiben erhalten
- Der fruehere implizite Seed in `masterDataService` und `tagRelationsService` wurde entfernt; fehlende System-Tags werden nicht mehr nebenbei erzeugt
- Der Storno-Pfad erwartet das vorhandene System-Tag `Storniert` und liefert bei fehlendem Tag eine fachliche Fehlermeldung mit Verweis auf den Admin-System-Seed

## Betroffene Dateien

- `shared/appointmentCancellation.ts`
- `shared/routes.ts`
- `server/routes.ts`
- `server/controllers/systemSeedController.ts`
- `server/routes/systemSeedRoutes.ts`
- `server/services/systemSeedService.ts`
- `server/services/masterDataService.ts`
- `server/services/tagRelationsService.ts`
- `server/services/appointmentsService.ts`
- `server/repositories/reportsRepository.ts`
- `server/lib/appointmentCancellation.ts`
- `server/lib/reportProduktionsplanung.ts`
- `client/src/components/SettingsPage.tsx`
- `client/src/components/reports/tourenplan-model.ts`
- `client/src/lib/tag-utils.ts`
- `tests/unit/services/systemSeedService.test.ts`
- `tests/integration/server/admin.system-seed.integration.test.ts`
- `tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`
- weitere betroffene Bestands-Tests fuer Tag-/Report-Konstanten und Settings-Mocks
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgefuehrt:

- `npm run check`
- `npm run lint`
- `npm run test:unit`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.system-seed.integration.test.ts`

## Hinweise und bekannte Einschraenkungen

- Der Branch enthielt keinen der im Aufgabenbrief genannten alten Seed-Services; die Umsetzung basiert deshalb auf den real vorhandenen Services und Repositories.
- Fuer den erfolgreichen Gate-Lauf wurden zwei bestehende Repo-Blocker minimal mitkorrigiert:
  - ein Encoding-Fehler in `tests/integration/server/masterData.ft27.integration.test.ts`
  - ein fehlendes Feld `missingTableKeys` im Manifest-Bau von `server/services/dumpService.ts`
- Kein voller Audit und kein voller Testlauf wurden zusaetzlich ausgefuehrt; es lief nur der vereinbarte minimale Gate-Satz plus der gezielte neue Integrationstest.
