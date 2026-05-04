# Tour-KW-View

## Zweck

Umsetzung der Notion-Aufgabe `KW Tourenplanung View` mit Fokus auf den neuen Tour-KW-View in der Tourenverwaltung.

## Scope

- Neuer Tab `Wochenplanung` in der Tourenübersicht.
- Vier-KW-Matrix mit Tour-Bahnen und KW-Kacheln.
- Read-only API-Projektion für Tour-KW-Daten über alle planbaren Touren.
- Wiederverwendung bestehender Tour-KW-Mutationen für Mitarbeiter, Anwenden, Blockieren/Freigeben und Notizen.
- Ausschluss von `Parkplatz`, `Abwesenheiten` und tourlosen Pseudo-Bahnen aus der KW-Planung.

Nicht umgesetzt wurden die vollständigen Aufräumarbeiten aus Notion-Teil 3 am Wochenkalender.

## Technische Entscheidungen

- Neuer Endpoint `GET /api/tours/week-planning?fromDate&toDate` als reine Leseprojektion.
- Keine DB-Migration und kein automatisches Anlegen von `tour_week` beim Lesen des neuen Views.
- Rollen bleiben serverseitig durch bestehende Mutationsguards abgesichert:
  - `ADMIN` und `DISPONENT` dürfen editierbare KW-Planungen ändern.
  - `LESER` darf lesen, aber keine Mutationen ausführen.
- Die sichtbaren Datumsbereiche im View verwenden `formatListDateRange`; `yyyy-MM-dd` bleibt nur für Query- und API-Werte.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/toursRoutes.ts`
- `server/controllers/toursController.ts`
- `server/services/toursService.ts`
- `server/repositories/tourWeeksRepository.ts`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourWeekPlanningView.tsx`
- `client/src/components/TourWeekCard.tsx`
- `client/src/components/TourEmployeeCascadeDialog.tsx`
- `tests/integration/server/tours.week-planning-view.integration.test.ts`
- `tests/unit/ui/tourWeekPlanningView.render.test.tsx`

## Tests und Verifikation

- `npm run test:integration -- --reporter=verbose tests/integration/server/tours.week-planning-view.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/ui/tourManagement.role-readonly.smoke.test.tsx tests/unit/ui/tourManagement.versioning.test.tsx`
- `npx tsc --noEmit`
- `npm run check`
- Datumsformat-Suchlauf gemäß `agents.md`; neue Treffer sind technische Query-/API- und Testdatenpfade.

## Bekannte Einschränkungen

- Der Wochenkalender wurde nicht vollständig auf die neue Kachelstruktur refaktoriert.
- Der neue View zeigt vier Wochen ab aktueller ISO-KW und blättert in Vier-Wochen-Schritten.
