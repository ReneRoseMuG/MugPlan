# 13.05.26 | Nacharbeit | Termin-Save-Review: Notizprüfung bei Terminverschiebung

## Zusammenfassung

Der neue Termin-Save-Review berücksichtigt jetzt Terminnotizen bei Terminverschiebungen. Wenn Startdatum, Enddatum oder Startzeit geändert werden und der Termin eigene Terminnotizen enthält, erscheint im `AppointmentSaveReviewDialog` ein eigener Schritt „Terminnotizen prüfen“. Das Speichern bleibt blockiert, bis der Nutzer bestätigt, dass die Terminnotizen geprüft wurden.

Damit wird die in dieser Session neu aufgebaute Save-Dialogstruktur weiterverwendet. Es wurde kein zusätzlicher Einzelalert neben dem Review-Dialog eingeführt.

## Art der Änderung

- Erweiterung des bestehenden Termin-Save-Reviews.
- Keine DB-Migration.
- Keine neue externe Abhängigkeit.
- Keine automatische Änderung von Notizinhalten.

## Konkrete Änderungen

- `AppointmentSaveReviewDialog` hat einen neuen Step `notes` erhalten.
- Der Step zeigt bisherigen und neuen Terminzeitraum im Kurzdatum `dd.MM.yy`.
- Der Step listet die betroffenen Terminnotizen mit Titel.
- Die Checkbox „Terminnotizen geprüft, Termin trotzdem speichern“ ist verpflichtend.
- `AppointmentForm` erzeugt diesen Review-Step nur bei echter Änderung von Startdatum, Enddatum oder Startzeit und vorhandenen Terminnotizen.
- Projekt- und Kundennotizen lösen den Step bewusst nicht aus, weil sie nicht eindeutig an den konkreten Terminzeitraum gebunden sind.

## Rollen

- Die Rollenlogik bleibt unverändert.
- `ADMIN` und `DISPATCHER` dürfen Terminänderungen speichern.
- `READER`/`LESER` bleibt von Terminmutationen ausgeschlossen.
- Die neue Notizprüfung ist ein zusätzlicher UI-Speicherschritt und ersetzt keine serverseitige Berechtigungsprüfung.

## Verifikation

- `npx tsc --noEmit` erfolgreich.
- `npx vitest run tests/unit/ui/appointmentSaveReviewDialog.render.test.tsx` erfolgreich mit 3 Tests.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts --grep "requires checking appointment notes"` erfolgreich.
- `npx playwright test -c playwright.config.ts tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts` erfolgreich mit 18 Tests.
- `npm run check` erfolgreich.
- `git diff --check` erfolgreich.
- Datumsformat-Suchlauf gemäß Projektregel ausgeführt; neue sichtbare Ausgabe nutzt `dd.MM.yy`, verbleibende Treffer sind technische ISO-/Test-/Regeltext-Kontexte.

## Offene Punkte

- Der zuvor angeforderte volle Testlauf ohne Coverage hatte weiterhin unabhängige rote Tests in Unit- und Browser-E2E-Gesamtläufen. Diese wurden nicht in dieser Nacharbeit bereinigt.
