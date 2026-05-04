# 04.05.26 | Feature | FT-04: Tour-KW-View

## Zusammenfassung

Die Tourenverwaltung hat einen neuen Tab `Wochenplanung` erhalten. Dort werden Tour-KW-Planungen als Vier-KW-Matrix mit Tour-Bahnen und KW-Kacheln angezeigt.

## Art der Änderung

Mehrschichtige Feature-Erweiterung mit neuem read-only API-Endpoint, neuer Frontend-View-Komponente und ergänzenden Unit- und Integrationstests.

## Betroffene Features

- FT (04): Tourenplanung  
  Notion: https://www.notion.so/746286ccf41d46629ec614541a871345
- Aufgabe: KW Tourenplanung View  
  Notion: https://www.notion.so/351da094354e80da810ee12b9f9f53bf

## Konkrete Änderungen

- Neuer Endpoint `GET /api/tours/week-planning?fromDate&toDate` liefert vier Wochen für alle Touren mit KW-Planung.
- Der Endpoint ist eine reine Projektion und legt beim Lesen keine neuen `tour_week`-Datensätze an.
- `Parkplatz`, `Abwesenheiten` und tourlose Pseudo-Bahnen werden aus der Tour-KW-Planung ausgeschlossen.
- Die Tourenübersicht wurde in Tabs `Touren` und `Wochenplanung` gegliedert.
- Die neue `TourWeekPlanningView` zeigt KW-Spalten, Tour-Bahnen, KW-Kacheln, Notizen-Schalter, Notiz-Menü, Mitarbeiteraktionen und Blockieren/Freigeben.
- Bestehende Mutationspfade und serverseitige Rollenregeln bleiben maßgeblich.

## Tests / Verifikation

- `npm run test:integration -- --reporter=verbose tests/integration/server/tours.week-planning-view.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/ui/tourManagement.role-readonly.smoke.test.tsx tests/unit/ui/tourManagement.versioning.test.tsx`
- `npx tsc --noEmit`
- `npm run check`
- Datumsformat-Suchlauf gemäß Projektregel; neue `yyyy-MM-dd`-Treffer sind technisch.

## Offene Punkte

- Die vollständige Vereinheitlichung der Wochenkalender-Kacheln aus Notion-Teil 3 bleibt offen.
