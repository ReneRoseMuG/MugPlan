# Einstellungen-, Monitoring- und Admin-Dialoge

Dialog-, Meldungs- und Fehlerpfade für Einstellungen, Settings-Provider, Monitoring und administrative Korrekturworkflows einheitlich strukturieren. Die Aufgabe ist Teil von P-01 Schritt 7 und richtet sich auf adminnahe Sicherheits- und Bestätigungspfade.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Meldungs- und Fehlerpfade für Einstellungen, Settings-Provider, Monitoring und administrative Korrekturworkflows einheitlich strukturieren.

## Ausgangslage

Einstellungen, Monitoring und administrative Korrekturworkflows nutzen bestehende Rollen- und API-Pfade. Besonders Dump-Löschung, Dump-Import-Anwendung und administrative Migrationen sind schadensrelevante Aktionen, deren Bestätigung und Fehleranzeige vor dem P-01-Schritt noch nicht durchgehend über die gemeinsame Dialogbasis liefen.

## Umfang

- Dump-Löschungen im Einstellungsbereich laufen über einen gemeinsamen Bestätigungsdialog.
- Dump-Import-Anwendungen erhalten eine ausdrückliche Bestätigung vor der Ausführung und zeigen Fehler inline im Importbereich.
- Administrative Korrekturworkflows normalisieren Preview- und Apply-Fehler und verlangen vor der Ausführung eine gemeinsame Bestätigung.
- Monitoring-Pfade bleiben fachlich unverändert; bestehende Tests sichern Fokus- und Navigationsverhalten.
- Nicht Teil der Aufgabe sind neue Backupfunktionen, neue Monitoringregeln, Schemaänderungen oder Änderungen der Rollenmatrix.

## Umsetzungshinweise

- `ADMIN` darf globale Einstellungen, Dump-Löschung, Dump-Import-Anwendung und administrative Korrekturworkflows ausführen.
- `DISPONENT` darf Monitoring lesen und persönliche Einstellungen nutzen, erhält aber keine Admin-Dump- oder Korrekturworkflow-Aktionen.
- `LESER` darf persönliche Einstellungen nutzen, aber keine Monitoring- oder Adminaktionen ausführen.
- Die serverseitige Durchsetzung bleibt maßgeblich; UI-Dialoge ergänzen Bedienführung und Schadensvermeidung.
- `client/src/components/SettingsPage.tsx`
- `client/src/providers/SettingsProvider.tsx`
- `client/src/components/MonitoringPage.tsx`
- `client/src/components/CorrectionWorkflowAdminPanel.tsx`

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Dump-Löschung, Dump-Import-Anwendung und administrative Korrekturworkflow-Ausführung nutzen gemeinsame Bestätigungsdialoge. Fehler aus Dump- und Korrekturworkflow-Pfaden werden normalisiert und inline angezeigt.
- Automatisierte Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/settingsPage.navigation.test.tsx tests/unit/ui/settingsPage.controls.smoke.test.tsx tests/unit/ui/monitoringPage.behavior.test.tsx tests/unit/ui/correctionWorkflowAdminPanel.render.test.tsx`; `npm run test:integration -- tests/integration/server/monitoring.ft31.integration.test.ts tests/integration/server/admin.correction-workflow.integration.test.ts tests/integration/server/userSettings.categoryLayout.persistence.test.ts --reporter=verbose`; `npm run test:e2e:browser -- tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts`; `npm run check:encoding`; `git diff --check`.
- App-Prüfung: Automatisierte Browserprüfung bestanden; manuelle Nutzerprüfung erfolgt anhand der Abschlussliste.
- Verwendete Testdaten: synthetische Settings-, Monitoring-, Dump- und Korrekturworkflow-Fixtures sowie Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Tests.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern und bestehenden Warnungsgruppen ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für P-01 Schritt 7; manuelle Sichtprüfung der adminnahen Bestätigungspfade steht noch aus.
- Folgeaufgaben: Reports- und Druck-Dialoge bleiben als nächster P-01-Schritt offen.

---

## Beziehungen

- Features: [FT-18 - User Preferences](../../features/ft-18-user-preferences/ft-18-user-preferences.md) · [FT-31 - Dispositions-Monitoring Konflikte](../../features/ft-31-dispositions-monitoring-konflikte/ft-31-dispositions-monitoring-konflikte.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Tags, Hilfetexte und Admin-Dialoge abgeschlossen](../../journal/09-05-26-p01-tags-hilfetexte-admin-dialoge-abgeschlossen.md)
