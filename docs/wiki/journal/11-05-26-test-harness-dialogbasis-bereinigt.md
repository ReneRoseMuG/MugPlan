# 11.05.26 | Korrektur | Test-Harness nach Dialogbasis-Rollout bereinigt

## Zusammenfassung

Mehrere zuvor rote Tests waren fachlich nicht mehr auf dem aktuellen UI-Stand. Die Produktpfade waren inzwischen auf die gemeinsame Dialogbasis beziehungsweise den Projekt-Speichern-Review umgestellt, während einzelne Unit- und Browser-E2E-Tests noch alte direkte Alert- oder Sofortaktionspfade erwarteten.

Die Tests wurden gezielt an das bestehende Verhalten angepasst: Employee-Unit-Tests mocken die inzwischen benötigten Dialogbasis-Icons, der Terminnotiz-Test liest die Workflow-Notizaktionen aus dem neuen Button-Pfad, der alte Admin-Sauna-Browsertest wurde auf Preview und freigeschalteten Apply-Einstieg entschärft, und der FT-33-Abwesenheits-Browsertest bestätigt nun den Löschdialog, bevor er den DELETE erwartet.

## Konkrete Änderungen

- `tests/unit/ui/employeesPage.importDialog.wiring.test.tsx` und `tests/unit/ui/employeesPage.scopeUx.test.tsx`: lokale `lucide-react`-Mocks um die Icons der Dialogbasis ergänzt.
- `tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx`: Workflow-Notiz-Suggestion-Buttons werden aus dem `DialogBaseFooter`-/`Button`-Pfad gelesen.
- `tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts`: Browser-Test auf Admin-Preview und freigeschalteten Apply-Einstieg begrenzt; der Apply-Contract bleibt im Integrationstest abgedeckt, während der aktuelle Sauna-Titel-Nutzerflow über den Projekt-Speichern-Review läuft.
- `tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`: Löschung einer Abwesenheit bestätigt nun den gemeinsamen Bestätigungsdialog, bevor der DELETE erwartet wird.

## Verifikation

- `npm run test:unit -- tests/unit/ui/employeesPage.importDialog.wiring.test.tsx tests/unit/ui/employeesPage.scopeUx.test.tsx` erfolgreich mit 4 Tests in 2 Dateien.
- `npm run test:unit -- tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx` erfolgreich mit 6 Tests in 1 Datei.
- `npm run test:unit -- tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx tests/unit/ui/employeesPage.importDialog.wiring.test.tsx tests/unit/ui/employeesPage.scopeUx.test.tsx` erfolgreich mit 10 Tests in 3 Dateien.
- `npm run test:unit` erfolgreich mit 1269 Tests in 304 Dateien, 1 Test übersprungen.
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts --grep "übernimmt den Projektnamen"` erfolgreich mit 1 Browser-Test.
- `npm run test:e2e:browser -- tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts` erfolgreich mit 1 Browser-Test.
- `npm run test:e2e:browser -- tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts` erfolgreich mit 2 Browser-Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/admin-sauna-project-title-migration.browser.e2e.spec.ts tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts` erfolgreich mit 6 Browser-Tests.

## Rollen

- Die Änderungen betreffen ausschließlich Testcode und Journaldokumentation.
- Produktrollen, serverseitige Berechtigungen, Endpunkte und Sichtbarkeitsregeln wurden nicht verändert.
- FT-33 bleibt fachlich unverändert: Abwesenheiten sind außerhalb des Mitarbeiterformulars read-only, dürfen im Mitarbeiterformular aber durch berechtigte Rollen bearbeitet und gelöscht werden.

## Verknüpfungen

- Projekt: [P01 Dialog-Rollout](../projects/dialog-rollout.md)
- Feature: [FT (33): Abwesenheiten über interne Personalplanung](../features/ft-33-abwesenheiten-ueber-interne-personalplanung/ft-33-abwesenheiten-ueber-interne-personalplanung.md)
