# 13.05.26 | Implementierung | Doc Extract, Projekt- und Termin-Save-Flow

## Zusammenfassung

Der Doc-Extract-Workflow für Projekt- und Terminformular wurde fachlich vom späteren Speichern getrennt. Der Importdialog sammelt jetzt Kundendaten, Projektvorschau, Mängelhinweise, optionale Dokumenttextübernahme und eine bewusst getroffene Reklamationsentscheidung. Projektbezogene Restentscheidungen laufen anschließend über den `ProjectSaveReviewDialog`; terminbezogene Restentscheidungen laufen über den neuen `AppointmentSaveReviewDialog`.

Der ursprünglich problematische Fall `BSP PLZ.pdf` ist im Browserpfad abgesichert: Adresse, Ort, Land und die sechsstellige PLZ werden im Dialog angezeigt und übernommen; die auffällige PLZ bleibt ein Mangelhinweis, aber kein Abbruchgrund.

## Art der Änderung

- Mehrschichtige Änderung über Doc Extract, Projektformular, Terminformular, Reklamationsnotizen, Kundenauflösung, Rollenprüfung und Tests.
- Keine DB-Migration.
- Keine neue externe Abhängigkeit.

## Betroffene Features

- Projekte und Projektanlage mit Dokumentextraktion.
- Termine mit Projektanlage aus Dokumentextraktion.
- Reklamationsworkflow in Projekt- und Terminformular.
- Kundendatenanlage und Stammdaten-Ergänzung aus extrahierten Dokumenten.
- Termin-Speichern mit Mitarbeiter- und Ressourcenentscheidungen.

## Konkrete Änderungen

- `ProjectDocumentExtractionWorkflowDialog` wurde in getrennte Schritte für Kunde, Projekt, Mängel, optionale Reklamationsnotiz und Abschluss aufgeteilt.
- Die Kundenauflösung läuft automatisch per Kundennummer; der Button „Kunde prüfen“ wurde entfernt.
- Bestehende Kunden werden verknüpft. Optional und standardmäßig aktiv werden nur leere Stammdaten aus dem Dokument ergänzt; vorhandene Werte bleiben unverändert.
- Neue Kunden werden im Dialog angekündigt und erst beim Übernehmen angelegt.
- Reklamation wird nicht aus einer fehlenden Artikelliste abgeleitet, sondern nur nach bewusster Nutzerentscheidung gesetzt.
- Bei positiver Reklamationsentscheidung fragt der Doc-Extract-Dialog im nächsten Schritt nach der Notiz und zeigt den Editor direkt im Dialog.
- `ProjectForm` übernimmt den Doc-Extract-Draft inklusive Reklamationsnotiz und unterdrückt doppelte Reklamationsfragen beim späteren Speichern.
- `ProjectSaveReviewDialog` bleibt für offene projektbezogene Speicherentscheidungen zuständig: Artikelliste, Projekttitel, Reklamationsnotiz außerhalb abgeschlossener Doc-Extract-Pfade und PDF-Duplikate.
- `AppointmentForm` nutzt denselben Doc-Extract-Projektworkflow und führt nach erfolgreicher Projektspeicherung das Projekt in das Terminformular zurück.
- `AppointmentSaveReviewDialog` bündelt save-relevante Terminentscheidungen, insbesondere „ohne Mitarbeiter speichern“ und Ressourcen-/Wochenplanprüfungen.
- Die Termin-Reklamation bleibt eine Sofortaktion. Wenn das Projekt bereits Reklamation ist, fragt der Terminbutton sichtbar, ob auch der Termin als Reklamation markiert werden soll.

## Rollen

- `ADMIN` und `DISPATCHER` dürfen Kunden, Projekte, Termine, Tags, Notizen und Anhänge mutieren.
- `READER`/`LESER` darf diese Mutationen nicht ausführen.
- Kundenanlage und Kundenaktualisierung sind serverseitig abgesichert; UI-Sichtbarkeit wird nicht als Berechtigung gewertet.

## Verifikation

- `npm run check` erfolgreich.
- `git diff --check` erfolgreich.
- `npx vitest run tests/unit/ui/projectDocumentExtractionWorkflowDialog.render.test.tsx tests/unit/ui/projectSaveReviewDialog.render.test.tsx tests/unit/ui/appointmentSaveReviewDialog.render.test.tsx tests/integration/extraction/documentProcessing.project.fixture.test.ts tests/integration/server/customers.create-duplicate.test.ts` erfolgreich mit 22 Tests in 5 Dateien.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts` erfolgreich mit 22 Tests.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts` erfolgreich mit 10 Tests.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts` erfolgreich mit 9 Tests.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts` erfolgreich mit 17 Tests.
- Wiki-Render über `node scripts/build-wiki-site.mjs` erfolgreich; Kontrollbericht mit 0 Fehlern und 0 Warnungsgruppen.
- Audit ohne Coverage gemäß Nutzerwunsch ausgeführt: `npm run check`, `npm run lint`, `npm run audit`, `npm run secrets`, `npm run analyze:arch`, `npm run analyze:boundaries` und `npm run analyze:knip` liefen mit Exit-Code 0.
- `npm run analyze:coverage` wurde im Audit bewusst nicht ausgeführt, weil der Auftrag ausdrücklich „ohne coverage“ lautete.
- Voller Testlauf ohne Coverage ausgeführt. `npm run test:integration` und `npm run test:e2e` waren erfolgreich. `npm run test:unit` und `npm run test:e2e:browser` meldeten einzelne Fehlschläge, die im Chatbericht benannt wurden.

## Offene Punkte

- `npm run test:unit` ist rot: `tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx` erwartet im Create-Modus einen Draft-Notiz-Setter-Aufruf, der nicht erfolgt.
- `npm run test:e2e:browser` ist rot mit vier Browser-Fehlschlägen: Multi-Day-Termin speichern, Monatskalender-Drag-Validation, Wochenkalender-Drop-Persistenz und Dispatcher-Tour-Wochenaktion.
- `npm run analyze:arch` meldet bestehende Architektur-Warnungen und `npm run analyze:knip` meldet Inventarlisten für ungenutzte Dateien, Dependencies und Exports; beide Kommandos beenden mit Exit-Code 0.
- Die bereits vorhandenen Wiki- und Aufgabenänderungen bleiben im Arbeitsbaum erhalten und wurden nicht zurückgesetzt.
