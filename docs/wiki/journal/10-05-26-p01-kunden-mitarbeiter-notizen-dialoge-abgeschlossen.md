# 10.05.26 | Abschluss | P01 Kunden-, Mitarbeiter- und Notizen-Dialoge

## Zusammenfassung

Die P-01-Schritte Kunden-Dialoge, Mitarbeiter-Dialoge und Notizen-Dialoge sind technisch umgesetzt und als Wiki-Aufgaben abgeschlossen. Kunden- und Mitarbeiterformulare zeigen normalisierte Inline-Fehler, Notizlöschungen nutzen den gemeinsamen Bestätigungsdialog, Mitarbeiterlöschung und Abwesenheitskonflikte laufen über die gemeinsame Dialogbasis, und Notizvorlagen sind serverseitig rollenbeschränkt.

## Verifikation

- Typecheck: `npm run typecheck` erfolgreich.
- Unit-Tests: `npm run test:unit -- tests/unit/ui/customerData.layoutShellIntegration.test.tsx tests/unit/ui/customersPage.controlled-state.test.tsx tests/unit/ui/customersPage.readerReadonly.smoke.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx tests/unit/ui/employeesPage.controlled-state.test.tsx tests/unit/ui/employeesPage.readerReadonly.test.tsx tests/unit/ui/employeeUtilizationView.wiring.test.tsx tests/unit/ui/employeeAppointmentAbsencesPanel.dateFormat.test.tsx tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/notesSection.prefillDraft.behavior.test.tsx tests/unit/ui/notesSection.readOnly.wiring.test.tsx tests/unit/ui/notesPreviewInvalidation.wiring.test.tsx` erfolgreich mit 30 bestandenen Tests in 12 Dateien.
- Integrationstests: `npm run test:integration -- tests/integration/server/customers.paged-list.integration.test.ts tests/integration/server/customers.visibility.by-role.test.ts tests/integration/server/appointments.customer.sidebar-vs-all.integration.test.ts tests/integration/server/employees.lifecycle.ft05.integration.test.ts tests/integration/server/employees.visibility.by-role.test.ts tests/integration/server/employeeAppointmentAbsences.integration.test.ts tests/integration/server/notes.create.transactional-readback.integration.test.ts tests/integration/server/notes.joins-and-template-integrity.integration.test.ts tests/integration/server/calendar-week-notes.integration.test.ts tests/integration/server/employee.notes.integration.test.ts --reporter=verbose` erfolgreich mit 83 bestandenen Tests in 10 Dateien.
- Browser-E2E: Der P-01-Browserlauf für Kunden, Mitarbeiter und Notizen bestand in allen fachlichen Pfaden; ein Kalender-Inline-Notiztest wurde nach der bewusst geänderten Dialogerwartung aktualisiert und anschließend mit `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts` erfolgreich mit 6 bestandenen Tests erneut geprüft.
- Ergänzende Browser-E2E: Der durch `NotesSection` betroffene Projektnotiz-Löschtest wurde mit `npm run test:e2e:browser -- tests/e2e-browser/projects.ft02.browser.e2e.spec.ts -g "creates and deletes a project note in the edit form"` erfolgreich geprüft.
- Ergänzende Browser-E2E: Der durch `NotesSection` betroffene Tour-Wochenformular-Notizpfad war im Zusatzlauf erfolgreich; derselbe Zusatzlauf brach davor in einem bestehenden Produktdialog-Test der Projektdatei ab.
- Encoding: `npm run check:encoding` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 erfolgreich.

## Rollen

- `ADMIN` darf Kunden und Mitarbeiter gemäß bestehenden Regeln verwalten, Mitarbeiter löschen, Aktivstatus ändern, Notizen verwalten, Notizvorlagen inklusive Vorlagenfarbe verwalten und Abwesenheiten im bestehenden Regelrahmen pflegen.
- `DISPONENT` darf Kunden und Mitarbeiter gemäß bestehenden Regeln bearbeiten, Tags und Notizen verwalten, Abwesenheiten im bestehenden Regelrahmen pflegen und Notizvorlagen ohne Vorlagenfarbe verwalten.
- `LESER` darf Kunden, Mitarbeiter, aktive Notizvorlagen und Notizen lesen, erhält aber keine Kunden-, Mitarbeiter-, Notiz-, Notizvorlagen- oder Abwesenheitsmutation.
- Die neue Notizvorlagen-Serverregel lässt aktive Vorlagen rollenübergreifend lesbar, blockiert aber `active=false`-Verwaltungslisten und Mutationen für `LESER`.
- UI-Sichtbarkeit bleibt reine Bedienführung; die serverseitigen Guards sind die verbindliche Durchsetzung.

## Verknüpfungen

- Aufgabe: [Kunden-Dialoge](../tasks/closed/kunden-dialoge.md)
- Aufgabe: [Mitarbeiter-Dialoge](../tasks/closed/mitarbeiter-dialoge.md)
- Aufgabe: [Notizen-Dialoge](../tasks/closed/notizen-dialoge.md)
- Projekt: [P01 Dialog-Rollout Masterplan](../projects/dialog-rollout.md)
