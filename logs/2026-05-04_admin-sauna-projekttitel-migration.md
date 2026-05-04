# Admin-Sauna-Projekttitel-Migration

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `0e9b29e8`

## Zweck

Dieses Log dokumentiert die Session zur Verankerung der einmaligen Datenmigration `Projekt-Titel aus Sauna-Modell` im Admin-Bereich. Ziel war, die bereits vorbereitete generische Korrekturworkflow-Struktur so anzubinden, dass ein Admin eine Vorschau erzeugen, Ausgangsmenge und Ergebnismenge prüfen und die Migration anschließend kontrolliert ausführen kann.

## Scope

- Die bestehende Korrekturworkflow-Engine wurde für die konkrete Sauna-Projekttitel-Migration registriert.
- Für den Admin-Bereich wurden Preview- und Apply-Endpunkte ergänzt.
- Die Migration bleibt in Entwicklung und Test erlaubt und ist in Produktion durch die Workflow-Sicherheitslogik blockiert.
- Im Admin-Bereich wurde unter `Backup & Dump` der Tab `Migrationen` ergänzt.
- Der neue View zeigt Ausgangsmenge, Ergebnismenge, Statuszusammenfassung, Ziel-Datenbank, Erzeugungszeitpunkt und Kandidaten.
- Apply nutzt das Manifest aus der Vorschau inklusive Hash-Prüfung.
- Fehler aus Preview und Apply werden serverseitig geloggt und in der UI angezeigt.
- Nach einem gemeldeten Browserfehler wurde die UI-Antwortverarbeitung robuster gemacht, damit unerwartete Nicht-JSON-Antworten nicht mehr als roher JSON-Parse-Fehler erscheinen.

## Rollen und Sperren

- Sichtbarkeit: Der neue Migrationsbereich ist fachlich für `ADMIN` vorgesehen.
- Ausführung: Preview und Apply sind serverseitig auf `ADMIN` begrenzt.
- Nicht-Admins erhalten bei direktem API-Aufruf `403`.
- Die Apply-Route ist in der Admin-Maintenance-Policy als destruktive Admin-Aktion klassifiziert.
- Es wurde keine Berechtigung für `DISPONENT`, `LESER` oder andere Rollen erweitert.

## Technische Entscheidungen

- Die konkrete Sauna-Migration wurde als registrierter Correction Workflow umgesetzt, statt eine freie Sonderroute mit eigener Mutationslogik zu bauen.
- Die Vorschau schreibt ein Manifest und einen Preview-Report; Apply akzeptiert nur das konkrete Manifest inklusive passendem Hash.
- Die Mutation setzt ausschließlich `project.name` auf das eindeutig ermittelte Sauna-Modell.
- Drift-Erkennung und Feld-Verifikation bleiben Aufgabe der generischen Workflow-Engine.
- Die UI invalidiert nach erfolgreichem Apply Projekt-, Termin- und Report-Queries, weil der Projektname in diesen Bereichen sichtbar werden kann.
- Die Fehlermeldung im Browser deutete auf eine unerwartete Nicht-JSON-Antwort hin; deshalb liest die UI Antworten jetzt kontrolliert als Text und parst erst danach JSON.

## Betroffene Dateien

- `script/correction-workflows/project-title-sauna-model.ts`
- `script/correction-workflows/workflows.ts`
- `script/run-correction-workflow.ts`
- `script/correction-workflows/engine.ts`
- `script/correction-workflows/sql.ts`
- `shared/routes.ts`
- `server/services/correctionWorkflowService.ts`
- `server/controllers/correctionWorkflowController.ts`
- `server/routes/correctionWorkflowRoutes.ts`
- `server/routes.ts`
- `server/middleware/adminMaintenancePolicy.ts`
- `client/src/components/CorrectionWorkflowAdminPanel.tsx`
- `client/src/components/SettingsPage.tsx`
- `tests/integration/server/admin.correction-workflow.integration.test.ts`
- `tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts`
- `tests/unit/ui/correctionWorkflowAdminPanel.render.test.tsx`
- `tests/unit/ui/settingsPage.backup.innerTabs.test.tsx`
- `tests/helpers/testStorageIsolation.ts`
- `tests/helpers/testIsolationRegistry.ts`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit -- tests/unit/ui/correctionWorkflowAdminPanel.render.test.tsx tests/unit/ui/settingsPage.backup.innerTabs.test.tsx tests/unit/script/correctionWorkflowEngine.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.correction-workflow.integration.test.ts tests/integration/script/correctionWorkflowEngine.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/correctionWorkflowAdminPanel.render.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts`
- `npm run check:destructive-inventory`
- `git diff --check`

Zusätzlich wurde die Test-Safety vor den Testläufen geprüft: `.env.test` war vorhanden, die Test-Env enthielt die erwarteten Test-Allowlists, und die Testbefehle liefen mit `NODE_ENV=test` und `MUGPLAN_MODE=test`.

## Testlandschaft

- Unit: `tests/unit/script/correctionWorkflowEngine.test.ts` prüft Definition-Validierung, stabile Manifest-Serialisierung, Drift-Erkennung und erlaubte Feld-Diffs.
- Integration Engine: `tests/integration/script/correctionWorkflowEngine.integration.test.ts` prüft Preview-Artefakte, Apply mit echter Test-Datenbank, Drift-Skip und Rollback bei fehlgeschlagener Verifikation.
- Integration Admin API: `tests/integration/server/admin.correction-workflow.integration.test.ts` prüft `ADMIN`-only, Preview-Ausgangsmenge, Ergebnismenge, Kandidatendetails, Apply gegen reales Manifest und Hash-Mismatch.
- Browser E2E: `tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts` prüft den echten Admin-Klickpfad mit sichtbaren Testdaten: Migrationstab öffnen, Vorschau erzeugen, sichtbare Projekt-/Auftrags-/Sauna-Daten prüfen, Apply ausführen und den neuen Projekttitel im Projektformular sehen.
- Unit UI: `tests/unit/ui/correctionWorkflowAdminPanel.render.test.tsx` sichert statisch den neuen Admin-Migrationsview und die stabilen Preview-/Apply-Aktionsbuttons.
- Unit Settings: `tests/unit/ui/settingsPage.backup.innerTabs.test.tsx` sichert die Backup-&-Dump-Inner-Tab-Struktur inklusive `Migrationen`.

## Bekannte Einschränkungen

- Die UI-Tests sind bewusst statische Render-Tests und ersetzen keine echte Browser-Interaktion.
- `npm run check` war nicht vollständig grün, weil bestehende Encoding-/Umlaut-Treffer außerhalb dieses Auftrags gemeldet wurden.
- Beim lokalen Browser-Test muss der Dev-Server nach der Routenänderung neu gestartet werden, damit Frontend und Backend denselben Code-Stand bedienen.
