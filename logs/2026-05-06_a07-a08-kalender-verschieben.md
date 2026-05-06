# Log: A-07/A-08 - Kalendertermine verschieben

**Datum:** 06.05.26
**Branch:** `feature/a07-a08-calendar-cut-insert`
**Auftragsklasse:** 5 - Mehrschichtige Änderung oder neues Feature

---

## Zweck

A-07 und A-08 wurden umgesetzt, damit Termine im Kalender nicht nur innerhalb einer Tour verschoben werden können. Der Wochenkalender unterstützt jetzt Tourwechsel per Drag & Drop auf reguläre Tour-Lanes. Zusätzlich können Termine per längerem Linksklick als Verschiebeauswahl markiert und anschließend in Wochen- oder Monatsansicht in ein reguläres Tour-Ziel eingefügt werden.

---

## Scope

- Tourwechsel per Drag & Drop im Wochenkalender.
- Markieren eines Termins per längerem Linksklick.
- Deselektion per Rechtsklick im Kalenderbereich.
- Sichtbare Statuskarte am oberen Rand des App-Screens, solange ein Termin zum Verschieben selektiert ist.
- Einfügen markierter Termine in Wochen- und Monatsansicht.
- Ausschluss von "Ohne Tour", "Parkplatz" und Abwesenheiten als Verschiebe- oder Einfügeziel.
- Gemeinsamer Preview-, Bestätigungs- und PATCH-Pfad für Drag & Drop und Mark-and-Insert.
- Serverseitige Rollenprüfung im Preview-Pfad.

Nicht umgesetzt wurde die ursprünglich in A-08 erwähnte Escape-/Click-Away-Deselektion, weil der aktuelle Auftrag die Deselektion ausdrücklich per Rechtsklick festgelegt hat.

---

## Technische Entscheidungen

- Der Kalender-Move-State liegt im `CalendarWorkspace` und wird an Wochen- und Monatsansicht durchgereicht.
- `client/src/lib/calendar-move.ts` bündelt Auswahltyp, Move-Request, Zielvalidierung und Preview-Auswahlhelfer.
- Week- und Month-Views nutzen die bestehenden Termin-Komponenten weiter und ergänzen nur Pointer-Handler sowie visuelle Markierung.
- Bei Tour- oder KW-Wechsel wird der vorhandene `tour-change-preview`-Endpoint genutzt.
- Die finale Mutation bleibt `PATCH /api/appointments/:id` mit Version, Datum, Tour und Mitarbeiterliste.
- Der Preview-Endpunkt erhält die Request-Rolle und blockiert Leser sowie historische Disponentenfälle serverseitig.
- Keine DB-Schemaänderung, keine Migration, keine neue Infrastruktur.

---

## Rollen und Sicherheit

Betroffene Rollen:

- `ADMIN`: darf Termine markieren, ziehen und einfügen, auch historische Fälle, soweit bestehende serverseitige Sperr- und Konfliktregeln dies erlauben.
- `DISPATCHER`/`DISPONENT`: darf aktuelle und zukünftige Termine markieren, ziehen und einfügen; historische Quell- oder Zieltermine werden blockiert.
- `READER`/`LESER`: bleibt read-only. Auswahl-, Einfüge- und Drag-Aktionen werden nicht angeboten; direkte Preview-Aufrufe werden serverseitig mit `FORBIDDEN` abgelehnt.

Die Durchsetzung erfolgt nicht nur über UI-Sichtbarkeit. Preview und finale PATCH-Mutation bleiben serverseitig maßgeblich.

---

## Betroffene Dateien

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/WeekGrid.tsx`
- `client/src/components/MonthSheetGrid.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`
- `client/src/lib/calendar-move.ts`
- `server/controllers/appointmentsController.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `shared/routes.ts`
- `tests/unit/ui/calendarMove.helpers.test.ts`
- `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
- `tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
- `tests/integration/server/appointments.tour-change-preview.integration.test.ts`
- `docs/wiki/tasks/a-07-ft03-dnd-tourwechsel.md`
- `docs/wiki/tasks/a-08-ft03-mark-and-insert.md`
- `docs/wiki/tasks/README.md`

---

## Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/calendarMove.helpers.test.ts tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`
- `npm run test:integration -- tests/integration/server/appointments.tour-change-preview.integration.test.ts --reporter=verbose`
- `npm run check`

Zusätzlich geprüft:

- Datumsformat-Suchlauf nach verbotenen sichtbaren Formaten; Treffer sind bestehende technische ISO-Werte, Testdaten, maschinenlesbare Keys oder bestehende Dokumentationshinweise.
- Lokaler Dev-Server wurde gestartet und ist unter `http://127.0.0.1:5000` erreichbar.
- Staged-Encoding-Guard: `aktuelle`, `Quell` und `visuelle` sind bestätigte positive Treffer und im Guard als legitime Schreibungen vermerkt.

---

## Bekannte Einschränkungen

- Keine vollständige Browser-E2E-Suite wurde ergänzt oder ausgeführt; die Absicherung erfolgte über gezielte Unit- und Integrationstests.
- A-09 zur gemeinsamen Dialog-Basiskomponente bleibt als separate Wiki-Aufgabe offen.
- Die ursprüngliche Escape-/Click-Away-Deselektion aus A-08 ist nicht Teil des finalen Zuschnitts; umgesetzt ist die beauftragte Rechtsklick-Deselektion.
