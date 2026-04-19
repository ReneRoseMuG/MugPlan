# Auftragslog

## Zweck
Kleiner lokaler Fix an den Terminkarten im Wochenkalender, damit das Projekt-Panel im Darstellungsmodus Kompakt wieder eine Hover-Preview im Body öffnet und der Preview-Titel die gewünschte Projekt-/Auftragsnummer-Formatierung erhält.

## Scope
- Hover-Preview des Projekt-Panels im Wochenkalender-Kompaktmodus repariert
- Titel im Projekt-Preview wie im Kunden-Panel formatiert: Projektname hervorgehoben, Auftragsnummer dezent nach ` - `
- Leer-Nachricht im Projekt-Panel auf denselben dezenten Stil umgestellt
- Direkte Unit-Tests für Wochenpanel-Preview und ProjectInfoPanel angepasst

## Technische Entscheidungen
- Der Fix bleibt lokal im Renderer des Wochenkarten-Projekt-Panels und erweitert den kollabierten Kompaktzustand um einen Hover-Trigger statt die Wochenkartenstruktur breiter umzubauen.
- Die Titel- und Leerzustandsdarstellung wurde an die bestehende Semantik des allgemeinen `ProjectInfoPanel` angeglichen, um inkonsistente Header-Stile zu vermeiden.
- Verifiziert wurden nur die direkt betroffenen Unit-Tests, um den Eingriff bewusst klein zu halten.

## Betroffene Dateien
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/ui/project-info-panel.tsx`
- `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `tests/unit/ui/projectInfoPanel.render.test.tsx`

## Hinweise zum Testen
- `npx vitest run tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `npx vitest run tests/unit/ui/projectInfoPanel.render.test.tsx`

## Bekannte Einschränkungen
- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Browser-E2E für den Kompaktmodus des Wochenkalenders wurde in diesem Auftrag nicht ergänzt.
