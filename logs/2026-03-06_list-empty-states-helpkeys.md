# List Empty States mit HelpKeys

## Zweck

Dekorierte Empty-States fuer Listenansichten mit Unterscheidung zwischen leerer Datenbasis und 0 Treffern unter aktiven Filtern. Fehlende oder leere Hilfetexte sollen dabei den erwarteten `helpKey` direkt im UI sichtbar machen.

## Scope

Umgesetzt wurde ausschliesslich Frontend-Logik im bestehenden Listen-Layout-System:

- gemeinsamer Empty-State-Baustein fuer Listen
- definierte Leerflaeche in `TableView`
- Verdrahtung in den betroffenen Listen-Seiten
- begleitende UI-Dokumentation und Unit-Tests

Nicht Teil des Scopes:

- Backend-, Contract- oder Datenmodell-Aenderungen
- neue API-Endpunkte
- Aenderungen ausserhalb der betroffenen Listen-/UI-Komponenten

## Technische Entscheidungen

- Wiederverwendung des bestehenden Help-Text-Systems ueber abgeleitete Keys:
  - `<basisKey>.empty`
  - `<basisKey>.emptyFiltered`
- Neuer gemeinsamer UI-Baustein `ListEmptyState` statt duplizierter Empty-State-Logik je Seite.
- Fallback-Regel:
  - Help-Text nur verwenden, wenn `body` als nicht-leerer String vorliegt
  - sonst statischer Fallback plus sichtbarer `helpKey`
- `TableView` behaelt im Leerzustand den Header und rendert den Empty-State in einer Mindesthoehe statt als schmale Einzelzeile.
- Betroffene Seiten verwenden explizite Literal-Keys, damit der bestehende Frontend-HelpKey-Scan sie weiterhin fuer Seed/Bestandsabgleich erkennen kann.

## Betroffene Dateien

- `client/src/components/ui/list-empty-state.tsx`
- `client/src/components/ui/table-view.tsx`
- `client/src/components/CustomersPage.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/EmployeesPage.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/HelpTextsPage.tsx`
- `docs/UI-Komponenten-Referenz.md`
- `docs/TEST_MATRIX.md`
- `tests/unit/ui/listEmptyState.helpFallback.wiring.test.tsx`
- `tests/unit/ui/listLayouts.emptyStateHelpKeys.wiring.test.ts`
- `tests/unit/ui/tableView.emptyStateSurface.test.tsx`

## Testen

Ausgefuehrt:

- `npm run typecheck`
- `npm test -- --run tests/unit/ui/listEmptyState.helpFallback.wiring.test.tsx tests/unit/ui/tableView.emptyStateSurface.test.tsx tests/unit/ui/listLayouts.emptyStateHelpKeys.wiring.test.ts tests/unit/ui/tableView.stickyHeader.test.tsx tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx`

Abgedeckt werden insbesondere:

- Fallback bei fehlendem/leerem Help-Text
- sichtbarer `helpKey` im Fallback
- Literal-Verdrahtung der `.empty`- und `.emptyFiltered`-Keys
- definierte Leerflaeche der `TableView`
- bestehende Sticky-Header-/Preview-Verdrahtung der `TableView`

## Bekannte Einschraenkungen

- Die fachliche Trennung zwischen `appointments.empty` und `appointments.emptyFiltered` basiert auf lokaler Heuristik fuer nutzergesteuerte Filter gegenueber Kontext-/Defaultfiltern.
- Die neuen Empty-HelpKeys sind nur dann inhaltlich nutzbar, wenn passende Hilfetexte gepflegt werden; bis dahin erscheint bewusst der Fallback mit sichtbarem Key.
- Die Loesung wurde nur fuer die im Scope enthaltenen Listen verdrahtet, nicht global fuer alle potentiellen `BoardView`-/`TableView`-Verwendungen.
