# Umsetzungs-Log – Projekt-Status-Filter

## Laufendes Log
- 2026-02-03: Log-Datei angelegt.
- 2026-02-03: Client-Filterzustand um Status-IDs erweitert, Query-Parameterableitung ergänzt und Status-Multiselect-UI (Badge + Popover) in der Projektliste eingebunden.
- 2026-02-03: Server-Endpunkt für Projekte um `statusIds`-Filter erweitert (Controller/Service/Repository, Filterung via Join-Tabelle mit EXISTS).
- 2026-02-03: Statische Prüfung `npm run check` ausgeführt; TypeScript meldet bestehende Fehler in ProjectForm/DialogHeader sowie server/db.ts und server/storage.ts (siehe Abschlussabschnitt für Details).
- 2026-02-03: Versuch, den Dev-Server zu starten (`npm run dev`), scheiterte wegen fehlendem `cross-env` (kein Screenshot möglich).

## Abschluss
### Geänderte Dateien
- `client/src/lib/project-filters.ts`: `ProjectFilters` um `statusIds` erweitert, Default ergänzt und `buildProjectFilterQueryParams` zur deterministischen Query-Param-Ableitung hinzugefügt.
- `client/src/components/ProjectList.tsx`: Filterzustand in die Projektliste angehoben, Status-Multiselect-UI (Badge + Popover) integriert, Projekt-Query an `statusIds` gebunden.
- `server/controllers/projectsController.ts`: Query-Parameter `statusIds` eingelesen und geparst.
- `server/services/projectsService.ts`: Status-IDs an Repository weitergereicht.
- `server/repositories/projectsRepository.ts`: Serverseitige Filterung über `project_project_status` via `EXISTS` ergänzt.
- `logs/2026-02-03_project_status_filter/*`: Planung, laufendes Log, kritische Hinweise.

### UI-Interaktion Statusfilter
- In der Filterzeile erscheint rechts neben dem Titel-Filter ein Status-Filterbereich.
- Ausgewählte Status werden als farbige Badges angezeigt; Entfernen erfolgt über den Minus-Button (`action="remove"`).
- Über den Plus-Button öffnet sich ein Popover mit einer vertikalen Liste der noch nicht ausgewählten Status; jedes Element ist ein Badge mit Plus-Button (`action="add"`).
- Das Popover bleibt nach dem Hinzufügen geöffnet, um mehrere Stati nacheinander zu wählen.

### API-Änderung & Semantik
- `GET /api/projects` akzeptiert optional `statusIds` als kommaseparierte Liste.
- Semantik: Es werden Projekte geliefert, die **mindestens einen** der selektierten Stati besitzen (OR-Logik) – realisiert via `EXISTS` gegen die Join-Tabelle `project_project_status`, wodurch Duplikate vermieden werden.
- Ungültige IDs werden beim Parsen verworfen; nur gültige, positive Zahlen werden zur Filterung verwendet.
- Der Statusfilter greift sowohl für die allgemeine Liste als auch für `customerId`-gefilterte Listen.

### Testbarkeit/Kapselung
- `ProjectFilters` enthält jetzt `statusIds` und `buildProjectFilterQueryParams` liefert deterministisch die Query-Parameter (UI-unabhängig).
- Titel-Filter bleibt clientseitig; Status-Filter erfolgt serverseitig und triggert ein Refetch durch den Query-Key.

### Prüfungen
- `npm run check` ausgeführt: TypeScript-Fehler bestehen in `client/src/components/ProjectForm.tsx` (fehlende DialogHeader/DialogTitle) sowie `server/db.ts` (fehlendes `mysql2/promise`) und `server/storage.ts` (fehlender Typ `UpdateHelpText`).
- `npm run dev` konnte nicht gestartet werden, da `cross-env` fehlt; manuelle UI-Prüfung und Screenshot waren nicht möglich.

### Offene Punkte / Risiken
- Keine inhaltlichen offenen Punkte zur Implementierung; lokale Umgebung verhindert aktuell Dev-Server-Start (fehlendes `cross-env`).
