# System-Seed Prüfung, Checkboxen und selektive Ausführung

## Zweck

Der Admin-System-Seed für Tags, Touren und Notizvorlagen sollte um einen Sicherheits-Zwischenschritt erweitert werden. Vor der tatsächlichen Ausführung sollte das System zuerst prüfen, welche Soll-Einträge vorhanden sind oder fehlen, diese mit Checkboxen anzeigen und erst danach nur die bestätigten Einträge anlegen oder aktualisieren.

## Scope

- Preview-Endpoint für den System-Seed ergänzt
- Bestehenden Apply-Endpoint auf selektive Ausführung per `selectedKeys` erweitert
- Admin-Settings-UI von Sofort-Ausführung auf Prüfen → Checkboxen → Ausführen umgestellt
- Vorhandene Tests auf den neuen Flow angepasst
- Zusätzliche Negativtests ergänzt für bewusst nicht ausgewählte Einträge

Nicht geändert:

- Admin-only-Rollenbegrenzung des System-Seeds
- Fachliche Soll-Definitionen für Tags, Touren und Notizvorlagen
- Bestehende Seed-Invariante, dass Notizvorlagen-Bodies nicht überschrieben werden

## Technische Entscheidungen

- Preview und Apply nutzen dieselben zentralen Soll-Definitionen im Service, damit neue künftige Tags, Touren oder Notizvorlagen automatisch im Prüf- und Auswahlflow erscheinen.
- Der bisherige Service-Defaultlauf ohne explizite Auswahl bleibt intern kompatibel und führt weiterhin den vollständigen Seed aus.
- Die Auswahl wird über stabile Schlüssel pro Soll-Eintrag transportiert (`tag:*`, `tour:*`, `noteTemplate:*`).
- Die UI zeigt nur einen expliziten Ausführungsschritt für die selektierte Menge und verwendet Checkboxen als Sicherheitsnetz.

## Betroffene Dateien

- `server/services/systemSeedService.ts`
- `server/controllers/systemSeedController.ts`
- `server/routes/systemSeedRoutes.ts`
- `shared/routes.ts`
- `client/src/components/SettingsPage.tsx`
- `tests/unit/services/systemSeedService.test.ts`
- `tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`
- `tests/integration/server/admin.system-seed.integration.test.ts`
- `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/services/systemSeedService.test.ts tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/admin.system-seed.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts`
- `npm run check`

Zusätzlich neu abgesichert:

- Nicht-Admins dürfen weder Preview noch Apply ausführen.
- Preview meldet fehlende Soll-Einträge strukturiert.
- Apply führt nur explizit ausgewählte Soll-Einträge aus.
- Nicht ausgewählte Preview-Kandidaten werden nicht angelegt.
- Der Checkbox-Zwischenschritt funktioniert über echte Browser-UI bis in die Persistenz.

## Risiko

- Mittel. Die Änderung greift in einen bestehenden Admin-Flow ein, bleibt aber lokal auf System-Seed-Preview, Auswahl und Ausführung begrenzt. Das Risiko wurde durch Unit-, Integrations- und Browser-Tests über positive und negative Pfade begrenzt.
