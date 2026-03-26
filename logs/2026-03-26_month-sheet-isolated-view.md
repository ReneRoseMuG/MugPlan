# Log: Isolierte Monatsblatt-Ansicht als neue globale Kalender-View

**Datum:** 2026-03-26  
**Ausgangsbranch:** `work`  
**Arbeitsbranch:** `feature/month-sheet-isolated-view`

---

## Zweck

In dieser Session wurde eine neue, isolierte Monatsblatt-Ansicht als zusätzliche globale Kalender-View umgesetzt. Ziel war ausdrücklich nicht die Reparatur oder Ablösung der bestehenden Monatsübersicht, sondern eine parallel erreichbare neue Ansicht mit fachlich korrekter Monatsmatrix, festem 3-Monats-Sichtfenster und wiederverwendeter Termin-Darstellung aus dem vorhandenen Monatskalender.

---

## Scope

Umgesetzt wurden:

- neue reine Monatsblatt-Datumslogik für Monatsmatrix und 3-Monats-Sichtfenster
- neue isolierte Rendering-Komponente für das Monatsblatt
- globale Navigationserweiterung um `Monatsblatt`
- Verdrahtung in `Home.tsx`, `CalendarWorkspace.tsx` und `Sidebar.tsx`
- eigener Scroll-Restore-Rückweg für die neue View
- neue Unit- und Browser-Tests sowie Aktualisierung von `docs/TEST_MATRIX.md`

Bewusst nicht umgesetzt wurden:

- Änderungen an der bestehenden Monatsübersicht
- Integration der neuen View in den projektgebundenen Kontextkalender
- neue API-, Contract-, Datenbank- oder Settings-Änderungen
- dynamisches Nachladen oder Rezentrieren des Sichtfensters beim Scrollen

---

## Technische Entscheidungen

**Reine Monatslogik separat vom Rendering**
Die fachliche Monatsberechnung wurde in `client/src/components/calendar/monthSheetModel.ts` ausgelagert. Dadurch sind Monatsgrenzen, Wochenraster, Randtage und das feste 3-Monats-Fenster unabhängig von der UI testbar.

**Fester 3-Monats-Container statt dynamischer Fensterlogik**
Die erste Version rendert immer Vormonat, Ankermonat und Folgemonat. Navigation verschiebt den Ankermonat deterministisch um genau einen Monat. Scrollen bleibt bewusst passiv, damit kein zusätzlicher Drift- oder Rezentrierungszustand entsteht.

**Wiederverwendung der bestehenden Monats-Terminlogik**
Die neue View verwendet weiterhin `monthLaneState.ts` für Tour-Slots, Segmentbildung und Reihenhöhen sowie `CalendarAppointmentCompactBar` für die eigentliche Termin-Darstellung. Dadurch bleibt das visuelle und fachliche Terminverhalten so nah wie möglich an der bestehenden Monatsansicht.

**Globale, aber nicht kontextuelle Integration**
`monthSheet` wurde nur in den globalen Kalenderpfad aufgenommen. Der projektgebundene Kontextkalender bleibt absichtlich bei `week` und `month`, um dort keine stillen Produktentscheidungen einzuführen.

**Eigener Scroll-Restore für die neue View**
Analog zur Wochenansicht wurde ein separater Rückweg für die horizontale Scrollposition der Monatsblatt-Ansicht ergänzt, damit Nutzer nach `Neu` oder `Öffnen` wieder in denselben sichtbaren Containerbereich zurückkehren können.

---

## Betroffene Dateien

**Neu**

- `client/src/components/calendar/monthSheetModel.ts`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/MonthSheetGrid.tsx`
- `tests/unit/ui/monthSheetModel.rules.test.ts`
- `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`
- `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts`
- `logs/2026-03-26_month-sheet-isolated-view.md`

**Geändert**

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/pages/Home.tsx`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/unit/ui/home.behavior.test.tsx`
- `docs/TEST_MATRIX.md`

---

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/monthSheetModel.rules.test.ts tests/unit/ui/calendarMonthSheetView.wiring.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/home.behavior.test.tsx tests/unit/ui/calendarMonthView.tourSlots.wiring.test.tsx tests/unit/ui/monthLaneState.rules.test.ts tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `npm run check`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts`

Nicht ausgeführt:

- voller Audit gemäß Abschnitt 12
- voller Testlauf gemäß Abschnitt 12

Diese beiden Schritte wurden in dieser Session nicht separat beauftragt.

---

## Bekannte Einschränkungen

- Das Monatsblatt nutzt bewusst ein fixes 3-Monats-Fenster ohne dynamisches Nachladen oder Rezentrieren.
- Die neue View ist nur global verfügbar; der projektgebundene Kontextkalender wurde absichtlich nicht erweitert.
- Es gibt bisher einen gezielten Browser-Test für Navigation und Driftfreiheit, aber noch keinen Browser-Test für Drag-and-drop oder Terminanlage direkt innerhalb der neuen Monatsblatt-View.
- Während der Session wurden keine Commits erstellt; der Branch ist angelegt und nach `origin` gepusht, die Änderungen liegen aktuell uncommittet im Arbeitsbaum.
