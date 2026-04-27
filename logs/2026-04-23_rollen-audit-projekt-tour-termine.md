# Rollen-Audit Projekt, Tour und Termine

## Zweck

Dieses Log dokumentiert die bestätigten Berechtigungsfunde aus einer gezielten Analyse der Rollenlogik für Leser (`LESER`) in den Bereichen Termine, Projekte und Touren.

Ziel der Analyse war zu prüfen, ob Leser schreibende Aktionen ausführen können, obwohl laut Repository-Regeln ausschließlich lesender Zugriff erlaubt sein soll.

## Scope

Geprüft wurden gezielt:

- Termin-Mutationen im Backend und zugehörige UI-Pfade
- Projekt-Stammdaten, Projekt-Tags, Projekt-Notizen und Projekt-Auftragspositionen
- Tour-Stammdaten, Tour-Wochen, Tour-Wochen-Mitarbeiter und Tour-Wochen-Notizen
- generische Notiz-Mutationen, soweit sie Projekt- oder Tour-Kontexte wieder öffnen können
- vorhandene Rollen- und Integrationstests in den betroffenen Domänen

Nicht geprüft wurde das gesamte System über alle Domänen hinweg.

## Technische Entscheidungen

- Die Analyse wurde klein und auftragsnah gestartet und dann nur auf direkt angrenzende Schreibpfade erweitert.
- Maßgeblich bewertet wurden serverseitige Guards in Controller- und Service-Einstiegen; UI-Sichtbarkeit wurde ergänzend geprüft, aber nicht als alleinige Autorisierungsquelle gewertet.
- Vorhandene Integrationstests wurden als Absicherung herangezogen, um bestätigte Schutzpfade von ungetesteten oder offenen Pfaden zu trennen.
- Für Touren wurde zwischen echten Tour-Stammdatenpfaden und Tour-Wochen-Kontexten unterschieden, weil letztere separat geroutet und abgesichert sind.

## Funde

### Termine

- `LESER` kann serverseitig Termine anlegen.
  - `server/controllers/appointmentsController.ts`
  - `server/services/appointmentsService.ts`
  - `createAppointment` hat keine Rollenprüfung; der Service erhält keinen `roleKey`.

- `LESER` kann serverseitig Termine bearbeiten.
  - `server/controllers/appointmentsController.ts`
  - `server/services/appointmentsService.ts`
  - `updateAppointment` prüft nur auf vorhandenen Rollenkontext, nicht auf Schreibberechtigung.

- `LESER` kann serverseitig den Anzeige-Modus eines Termins ändern.
  - `server/controllers/appointmentsController.ts`
  - `server/services/appointmentsService.ts`
  - `setAppointmentDisplayMode` hat dieselbe Lücke wie `updateAppointment`.

- `LESER` kann serverseitig Termine löschen.
  - `server/controllers/appointmentsController.ts`
  - `server/services/appointmentsService.ts`
  - `deleteAppointment` erhält zwar einen `roleKey`, nutzt ihn aber nicht zur Autorisierung.

- Das Termin-UI behandelt `READER` nicht sauber als read-only.
  - `client/src/components/AppointmentForm.tsx`
  - Schreibaktionen bleiben im Formular an mehreren Stellen sichtbar oder erreichbar, solange kein fachlicher Read-only-Zustand wie `historical`, `cancelled` oder `planningBlocked` greift.

- Für `cancel` wurde in diesem Stand keine bestätigte Server-Lücke gefunden.
  - `cancelAppointment` ist serverseitig geschützt.
  - Es fehlt aber ein expliziter Reader-Negativtest für diesen Pfad.

## Projekte

- `LESER` kann Projekt-Stammdaten serverseitig anlegen, ändern und löschen.
  - `server/controllers/projectsController.ts`
  - `server/services/projectsService.ts`
  - Für `createProject`, `updateProject` und `deleteProject` fehlt die zentrale Schreibsperre komplett.

- `LESER` kann Projekt-Auftragspositionen serverseitig ändern.
  - `server/controllers/projectsController.ts`
  - `server/services/projectsService.ts`
  - Betroffen sind `createProjectOrderItem`, `updateProjectOrderItem`, `deleteProjectOrderItem` und `replaceProjectOrderItems`.

- Projekt-Tags sind serverseitig bereits geschützt.
  - `server/controllers/projectsController.ts`
  - `server/services/projectsService.ts`
  - `addProjectTag` und `removeProjectTag` verwenden bereits eine Rollenprüfung über `requireDispatcherOrAdmin`.

- `LESER` kann Projektnotizen serverseitig erstellen und löschen.
  - `server/controllers/projectNotesController.ts`
  - `server/services/projectNotesService.ts`
  - Für `createProjectNote` und `deleteProjectNote` fehlt eine Rollenprüfung.

- Zusätzlich öffnet die generische Notiz-API Projekt-Notizen wieder für Mutationen.
  - `server/controllers/notesController.ts`
  - `server/services/notesService.ts`
  - `updateNote` und `toggleNotePin` prüfen keine Rollen und keine Domänenberechtigung.

- Das Projekt-UI führt `READER` auf mehrere Schreibpfade.
  - `client/src/components/ProjectForm.tsx`
  - Speichern, Löschen und Notizbearbeitung sind nicht zentral an `ADMIN` oder `DISPATCHER` gebunden.
  - Die Tag-Bearbeitung ist im UI enger geschützt als andere Projekt-Mutationen.

## Touren

- Tour-Stammdaten wirken serverseitig korrekt geschützt.
  - `server/controllers/toursController.ts`
  - `createTour` und `updateTour` sind auf `ADMIN` oder `DISPONENT` begrenzt.
  - `deleteTour` ist auf `ADMIN` begrenzt.

- Tour-Wochen und Tour-Wochen-Mitarbeiter wirken serverseitig korrekt geschützt.
  - `server/controllers/tourWeeksController.ts`
  - `server/controllers/tourWeekEmployeesController.ts`
  - Die schreibenden Endpunkte blockieren `LESER` mit `403/FORBIDDEN`.

- Es gibt keine bestätigten aktiven klassischen Tour-Tag-Endpunkte.

- Es gibt keine bestätigten aktiven normalen Tour-Notiz-Endpunkte auf Tour-Stammdatenebene.

- Tour-Wochen-Notizen sind in ihren eigenen Create/Delete-Pfaden korrekt gegen `LESER` geschützt.
  - `server/controllers/calendarWeekNotesController.ts`
  - Für `createCalendarWeekNote` und `deleteCalendarWeekNote` wird `LESER` explizit geblockt.

- Die generische Notiz-API öffnet aber vermutlich auch Tour-Wochen-Notizen wieder.
  - `server/controllers/notesController.ts`
  - `updateNote` und `toggleNotePin` haben keine kontextbezogene Rollenprüfung.

- Das Tour-UI wirkt für Stammdaten grundsätzlich sauberer als das Projekt-UI.
  - `client/src/components/TourManagement.tsx`
  - `canMutateTours` wird aus der Rolle abgeleitet und für Tour-Stammdatenmutationen verwendet.

- Das Tour-Wochen-UI verdrahtet aktive Notiz-Mutationen.
  - `client/src/components/TourWeekForm.tsx`
  - Sicherheit hängt hier an den Backend-Guards der Wochennotizen und der generischen Notiz-API.

## Betroffene Dateien

- `server/controllers/appointmentsController.ts`
- `server/services/appointmentsService.ts`
- `client/src/components/AppointmentForm.tsx`
- `server/controllers/projectsController.ts`
- `server/services/projectsService.ts`
- `server/controllers/projectNotesController.ts`
- `server/services/projectNotesService.ts`
- `client/src/components/ProjectForm.tsx`
- `server/controllers/notesController.ts`
- `server/services/notesService.ts`
- `server/controllers/toursController.ts`
- `server/services/toursService.ts`
- `server/controllers/tourWeeksController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/controllers/calendarWeekNotesController.ts`
- `server/services/calendarWeekNotesService.ts`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourWeekForm.tsx`
- `tests/integration/server/ft04.role.integration.test.ts`
- `tests/integration/server/calendar-week-notes.integration.test.ts`

## Hinweise zum Testen

- Für jeden schreibenden Projekt-Endpunkt sollte ein expliziter Reader-Negativtest mit `403/FORBIDDEN` ergänzt werden.
- Für Termin-Mutationen sollten explizite Reader-Negativtests für `create`, `update`, `display-mode` und `delete` ergänzt werden.
- Für die generische Notiz-API sollten Reader-Negativtests gegen Notizen in Projekt- und Tour-Wochen-Kontexten ergänzt werden.
- UI-seitig sollte geprüft werden, dass `READER` in `ProjectForm` und `AppointmentForm` keine schreibenden Aktionen mehr sieht oder auslösen kann.
- Bereits vorhandene Tour-Rollentests und Kalenderwochen-Notiztests sind gute Referenzpfade für das gewünschte Schutzverhalten.

## Bekannte Einschränkungen

- Das Ergebnis ist kein Voll-Audit über alle Domänen des Systems.
- Die Bewertung basiert auf Codeanalyse und vorhandenen Tests, nicht auf einem vollständigen manuellen Durchklicken aller UI-Flows.
- Für einige Pfade, insbesondere die generische Notiz-API, ist die Domänenauswirkung fachlich sehr wahrscheinlich, aber erst nach gezielten Reader-Integrationstests vollständig verifiziert.
