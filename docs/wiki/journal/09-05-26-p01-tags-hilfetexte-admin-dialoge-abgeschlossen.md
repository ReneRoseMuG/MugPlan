# 09.05.26 | Abschluss | P01 Tags, Hilfetexte und Admin-Dialoge

## Zusammenfassung

Die P01-Schritte A-28, A-30 und A-31 sind technisch umgesetzt. Tags, Hilfetexte, Import-/Export-Pfade, Einstellungen, Dump-Aktionen, Monitoring-Bezüge und administrative Korrekturworkflows verwenden nun gemeinsame Dialog-, Bestätigungs- und Inline-Fehlerstrukturen, soweit diese Aufgabe sie berührt.

## Verifikation

- Typecheck: `npm run typecheck` erfolgreich.
- UI-Tests: 44 bestandene Tests, 1 übersprungener Test für die betroffenen Tag-, Hilfetext-, Settings-, Monitoring- und Admin-Komponenten.
- Integrationstests: 28 bestandene Tests für Tags, Hilfetexte, Monitoring, Korrekturworkflow und Settings-Persistenz.
- Browser-E2E: 33 bestandene Tests für Tag-Auswahl, Tag-Regelpfade, Settings-Navigation, Settings-Bedienung und Monitoring-Fokus.
- Nachprüfung am 10.05.26: `npm run test:unit -- tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/tagManagementPage.dialogs.test.tsx tests/unit/hooks/useTagRuleEngine.test.ts` erfolgreich mit 20 bestandenen Tests.
- Nachprüfung am 10.05.26: `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts` erfolgreich mit 17 bestandenen Browser-Tests.
- Nachprüfung am 10.05.26: Die zentrale Dialogbasis richtet normale Dialogtitel zwischen Icon und Schließen-Button aus, trennt Body-Text vom Header und vereinheitlicht Dialog-Icons inklusive Hintergrund; destruktive Bestätigungsdialoge bleiben als begründete Ausnahme ohne Schließen-Button.
- Encoding: `npm run check:encoding` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.
- Wiki-Build: `node scripts/build-wiki-site.mjs` erfolgreich; Kontrollbericht mit 0 Fehlern und 57 bestehenden Warnungsgruppen.
- Datumsformat-Suchlauf: Treffer verbleiben in bestehenden technischen ISO-Pfaden, Testdaten, generierten Coverage-Dateien und Regeltexten.
- App-Prüfung: Übergabe mit manueller Pfadliste am 09.05.26; Nutzerprüfung steht noch aus.

## Rollen

- `ADMIN` darf Tags, Hilfetexte, Hilfetext-Import/-Export, globale Einstellungen, Dump-Aktionen und administrative Korrekturworkflows verwalten.
- `DISPONENT` darf die bestehenden Termin-Tag- und Monitoring-Lesepfade sowie persönliche Einstellungen nutzen, erhält aber keine neuen Admin-Aktionen.
- `LESER` darf aktive Hilfetexte und persönliche Einstellungen nutzen, erhält aber keine Verwaltungs-, Monitoring- oder Admin-Aktionen.
- Die Hilfetext-Verwaltungsendpunkte wurden ausdrücklich serverseitig auf `ADMIN` begrenzt; die aktive Hilfetextanzeige per Key bleibt rollenübergreifend nutzbar.
- Nachtrag: Das Reklamations-Tag ist kein manuell zu setzendes Tag im Tag-Picker, sondern wird über den Workflow „Reklamation melden“ gesetzt beziehungsweise aufgehoben.

## Verknüpfungen

- Aufgabe: [Tags-Dialoge](../tasks/closed/tags-dialoge.md)
- Aufgabe: [Hilfetexte-, Import- und Export-Dialoge](../tasks/closed/hilfetexte-import-export-dialoge.md)
- Aufgabe: [Einstellungen-, Monitoring- und Admin-Dialoge](../tasks/closed/einstellungen-monitoring-admin-dialoge.md)
- Projekt: [P01 Dialog-Rollout Masterplan](../projects/dialog-rollout.md)
