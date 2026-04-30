# Auftragslog: Admin-Historische-Termine

## Zweck

Historische Termine waren bisher serverseitig auch für `ADMIN` gesperrt. Fachlich wurde ein Kompromiss festgelegt: Die bestehende Sperrlogik bleibt für `DISPONENT` erhalten, aber `ADMIN` darf historische Termine mutieren.

Ein typischer Fall ist ein gestern geplatzter Aufbautermin, bei dem ein Admin das Projekt vom Termin entfernt und stattdessen den Kunden direkt als Relation verknüpft.

## Branch

- Arbeitsbranch: `refactor/isdefault-workflow-tags`
- Es wurde auf dem bestehenden Branch weitergearbeitet.

## Umsetzung

- Die zentrale historische Termin-Sperre in `appointmentsService` berücksichtigt nun die Rolle.
- `ADMIN` ist von der historischen Sperre ausgenommen.
- `DISPONENT` bleibt für historische Termine gesperrt.
- `LESER` bleibt readonly.
- Der Create-Pfad erhält den serverseitigen Rollenkontext, damit auch historische Neuanlagen rollenabhängig geprüft werden.
- Terminformular, Wochenkalender und Monatsübersicht geben historische Mutationsaktionen für Admins frei.
- Tests wurden auf die neue Rollenlogik angepasst.
- Architektur- und Implementierungsdokumentation wurden gezielt aktualisiert.

## Rollen und Rechte

- `ADMIN`: darf historische Termin-Mutationen ausführen.
- `DISPONENT`: darf historische Termine weiterhin nicht mutieren.
- `LESER`: bleibt ausschließlich lesend.
- Die Freigabe ist serverseitig durchgesetzt und nicht nur eine UI-Sichtbarkeit.

Unverändert aktiv bleiben:

- Relationspflicht: Termin braucht Projekt oder Kunde.
- Versionsschutz.
- Mitarbeiter-Overlap-Prüfung.
- Sperre stornierter Termine.
- Sperre blockierter Tourwochen.
- Inaktivitätsprüfungen für zugewiesene Entitäten.

## Tests und Nachweise

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/invariants/lockingRules.test.ts tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx tests/unit/services/appointments.employee-removal.versioning.test.ts tests/unit/services/appointments.park.test.ts tests/unit/services/appointments.cancellation.test.ts tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.historical-guards.integration.test.ts tests/integration/server/ft01.full-uc-coverage.integration.test.ts`
- `npm run typecheck`
- `npm run check`

## Ergebnis

Admins können historische Termine bearbeiten, löschen, verschieben, stornieren, parken und weitere bestehende Termin-Mutationspfade nutzen, solange die übrigen fachlichen Terminregeln erfüllt sind. Disponenten und Leser erhalten dadurch keine zusätzlichen Rechte.
