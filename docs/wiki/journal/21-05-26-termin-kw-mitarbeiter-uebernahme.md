# 21.05.26 | Implementierung | FT-04: Termin-/KW-Mitarbeiter-Übernahme vereinfacht

## Zusammenfassung

Die Übernahme von Mitarbeitern aus der Tour-KW-Planung in Termine wurde vereinfacht. Die bisherige Additiv/Ersetzen-Auswahl erscheint nicht mehr bei neuen Terminen oder bei fachlich eindeutigen Umplanungen.

Bei Tourwechsel oder KW-Wechsel eines bestehenden Termins werden direkte Termin-Mitarbeiter nun als zu entfernende Mitarbeiter angezeigt. Übernommen werden nur ausgewählte Mitarbeiter aus der Ziel-KW-Planung. Bleibt ein bestehender Termin in derselben Tour und derselben KW, bleibt die Additiv/Ersetzen-Entscheidung erhalten, sofern die KW-Planung zusätzliche Mitarbeiter anbietet.

## Art der Änderung

- Fachliche Vereinfachung eines bestehenden Termin-/Tour-KW-Flows.
- Erweiterung des bestehenden Preview-Contracts um einen expliziten Mitarbeiter-Mitnahmemodus.
- UI-Anpassung bestehender Vorschau- und Save-Review-Dialoge.
- Erweiterung vorhandener Unit-, Integration- und Browser-E2E-Tests.
- Keine DB-Migration, keine neue Abhängigkeit und keine neue Infrastruktur.

## Betroffene Features

- FT-04 Tour-KW-Planung und Terminübernahme.
- Terminformular bei neuer Tourauswahl, Tourwechsel und KW-Wechsel.
- Termin-Save-Review bei Ressourcenprüfung.
- Kalender-Drag-and-drop in der Wochenansicht.
- Notion-Links wurden im Auftrag nicht belastbar angegeben; Grundlage waren lokale FT-04-Codepfade und bestehende Tests.

## Konkrete Änderungen

- Der Preview-Endpunkt `/api/appointments/:id/tour-change-preview` akzeptiert optional `employeeCarryoverMode` mit `preserve` oder `replace`.
- Im Modus `replace` liefert die Preview vorhandene direkte Termin-Mitarbeiter als `will_remove`.
- Die gemeinsame Ressourcenlogik erkennt geplante Entfernungen, aktuelle Konflikte und echte KW-Planungsentscheidungen getrennt.
- `AppointmentForm` verwendet bei Tour- oder KW-Wechsel bestehender Termine feste Ersetzung und bei gleicher Tour/KW weiterhin die echte Additiv/Ersetzen-Entscheidung.
- Neue Termine mit KW-Planung zeigen keine Additiv/Ersetzen-Auswahl mehr.
- Tour komplett entfernen behält weiterhin direkte Termin-Mitarbeiter.
- Ziel-Touren ohne KW-Planung öffnen bei bestehenden Termin-Mitarbeitern einen Dialog, der die Entfernung kommuniziert; nach Bestätigung wird ohne Mitarbeiter gespeichert.
- `CalendarWorkspace` verwendet dieselbe Regelmatrix für Kalender-Drag-and-drop.
- `ResourcePlanningDialog`, `TourEmployeeCascadeDialog` und `AppointmentSaveReviewDialog` zeigen bei festen Ersetzungen einen Hinweis statt der Additiv/Ersetzen-Auswahl.

## Rollen

- Sichtbarkeit und Ausführung bleiben auf die bestehenden Rollenpfade beschränkt: `ADMIN` und `DISPONENT` können zulässige Termin- und KW-Pfade nutzen.
- `LESER` bleibt read-only; Preview- und Mutationspfade bleiben serverseitig gesperrt.
- Historische Terminlocks, Tour-KW-Sperren und Mitarbeiter-Overlap-Prüfung bleiben serverseitig aktiv.
- Es wurden keine Berechtigungen erweitert und keine neue Rollenlogik eingeführt.

## Tests / Verifikation

- `npm run typecheck` erfolgreich.
- `npm run test:unit -- tests/unit/lib/resource-planning.test.ts tests/unit/ui/calendarMove.helpers.test.ts tests/unit/ui/appointmentSaveReviewDialog.render.test.tsx tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx` erfolgreich mit 18 Tests.
- `npm run test:integration -- tests/integration/server/appointments.tour-change-preview.integration.test.ts` erfolgreich mit 6 Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts` erfolgreich mit 20 Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts` erfolgreich mit 2 Tests.
- `npm run check` erfolgreich.
- Playwright Chromium wurde lokal mit `npx playwright install chromium` nachinstalliert, weil die Browser-Binary für den E2E-Lauf fehlte.

## Offene Punkte

- Kein vollständiger `npm run test:all`-Lauf wurde in dieser Session ausgeführt.
- Keine offenen fachlichen Punkte aus der Umsetzung bekannt.
