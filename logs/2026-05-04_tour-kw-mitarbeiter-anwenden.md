# Tour-KW-Mitarbeiter anwenden und Termindialog erweitern

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `9d9abbfb`

## Zweck

Dieses Log dokumentiert die Erweiterung der Tour-KW-Mitarbeiterplanung im Wochenkalender und im Tourformular. Ziel war, die bestehende Funktion zum Ausrollen von Tour-KW-Mitarbeitern sichtbar an den Tour-KW-Planungen anzubieten und die Terminkarten-Funktion `Mitarbeiter hinzufügen` wieder auf eine freie, konfliktgeprüfte Mitarbeiterauswahl zu erweitern.

## Scope

- Die Tour-KW-Spalte im Wochenkalender erhält je Tour-Lane neben dem bestehenden `+` eine Anwenden-Aktion.
- Die Tour-KW-Entity-Cards im Tourformular erhalten dieselbe Anwenden-Aktion rechts neben dem bestehenden `+`.
- Die Anwenden-Aktion nutzt den vorhandenen sequenziellen Flow der Tour-KW-Planung und rollt die Mitarbeiter der geklickten Tour/KW auf die passenden Termine aus.
- Die Terminkarten-Funktion `Mitarbeiter hinzufügen` fordert jetzt zusätzlich konfliktfrei zuweisbare aktive Mitarbeiter an.
- Bei vorhandener Tour-KW-Planung zeigt der Dialog zuerst Tour-KW-Mitarbeiter und darunter weitere konfliktfreie Mitarbeiter.
- Ohne vorhandene oder bei leerer Tour-KW-Planung zeigt der Dialog nur konfliktfrei zuweisbare Mitarbeiter.
- Zusätzlich lagen offene Änderungen zu Notiz-Kontrasten, Notizvorschauen, Kalenderkarten-Tests und zugehörigen Logs im Arbeitsbaum. Diese offenen Änderungen werden beim anschließenden `save` bewusst mitgesichert.

## Rollen und Sperren

- Die sichtbaren Aktionen bleiben im bestehenden Admin-/Disponentenpfad.
- Reader erhalten keine neue ausführbare Anwenden-Aktion.
- Die serverseitige Durchsetzung bleibt maßgeblich über die vorhandenen Tour-KW- und Termin-Mutationspfade.
- Die Konfliktprüfung für zusätzliche Mitarbeiter erfolgt serverseitig vor der Auswahl.
- Bestehende Lock-, Rollen- und Konfliktregeln wurden nicht aufgeweicht.

## Technische Entscheidungen

- Der bestehende Assignment-Preview-Contract wurde kompatibel erweitert: Preview-Items können eine Quelle tragen und die Anfrage kann konfliktfreie verfügbare Mitarbeiter einschließen.
- Die konfliktfreie Restmenge wird im Backend aus aktiven Mitarbeitern gebildet, wobei bereits zugewiesene, Tour-KW-geplante und konfliktbehaftete Mitarbeiter ausgeschlossen werden.
- Der bestehende `TourEmployeeCascadeDialog` wurde für Terminvorschauen gruppiert, statt einen zweiten Dialogtyp einzuführen.
- Die Anwenden-Aktion im Wochenkalender und im Tourformular verwendet den bereits vorhandenen sequenziellen Mitarbeiter-Flow.
- Für das Icon wurde `ListChecks` aus `lucide-react` verwendet.

## Betroffene Dateien

- `shared/routes.ts`
- `server/services/tourWeekEmployeesService.ts`
- `client/src/components/TourEmployeeCascadeDialog.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourManagement.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx`
- Zusätzlich offen und mitzusichern: Notiz-Kontrast- und Kalenderkarten-Dateien aus dem bestehenden Arbeitsbaum sowie die vorhandenen Logs vom 04.05.26.

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx --reporter=verbose`
- Safety-Gate für `.env.test`, `NODE_ENV=test`, `MUGPLAN_MODE=test`, Test-Datenbank-Allowlist und Test-Host-Allowlist
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`

## Bekannte Einschränkungen

- Ein vollständiger Browser-E2E-Lauf wurde für diesen Auftrag nicht ausgeführt.
- Beim Kalender-Layout-Test erschien eine bestehende React-SSR-Warnung zu `useLayoutEffect` im Hover-Preview-Umfeld; der Testlauf selbst war grün.
- Die bereits offenen Notiz- und Kalenderkarten-Änderungen wurden nicht erneut fachlich auditiert, sondern gemäß Auftrag `save für alle offenen Änderungen` mitgesichert.
