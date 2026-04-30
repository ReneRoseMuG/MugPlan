# Auftragslog: Terminformular-Kartentags

## Zweck

Im Wochenkalender zeigt die Terminkarte die zusammengeführte Tag-Sicht aus Termin-, Projekt- und Kunden-Tags. Im Terminformular waren bisher nur direkte Termin-Tags sichtbar. Dadurch entstand insbesondere bei `Reklamation` eine Irritation, wenn der Tag vom Projekt kam und deshalb auf der Terminkarte erschien, im Terminformular aber nicht im Termin-Tag-Picker stand.

Ziel war eine kleine Lösung ohne neue Fachlogik: Die sichtbaren Tags der Terminkarte sollen im Terminformular nachvollziehbar sein, ohne Projekt- oder Kunden-Tags zu direkten Termin-Tags umzudeuten.

## Branch

- Arbeitsbranch: `refactor/isdefault-workflow-tags`
- Es wurde auf dem bestehenden Branch weitergearbeitet.

## Umsetzung

- Das Terminformular zeigt unter dem bestehenden Termin-Tag-Picker einen read-only Bereich `Tags auf Terminkarte`.
- Direkte Termin-Tags bleiben im vorhandenen editierbaren `TagPickerPanel`.
- Projekt-Tags werden im neuen Bereich als `Vom Projekt` angezeigt.
- Kunden-Tags werden im neuen Bereich als `Vom Kunden` angezeigt.
- Bereits direkt am Termin vorhandene Tags werden in der übernommenen Anzeige nicht doppelt wiederholt.
- Es wurden keine Tag-Zuweisungen kopiert, keine Persistenz geändert und keine neuen Endpunkte ergänzt.

## Rollen und Rechte

- Die neue Anzeige ist rein lesend.
- Es wurden keine neuen Aktionen eingeführt.
- Termin-Tag-Mutationen bleiben wie bisher auf die bestehenden Berechtigungen beschränkt.
- Projekt-Tags bleiben nur über Projekt-Pfade änderbar.
- Kunden-Tags bleiben nur über Kunden-Pfade änderbar.
- Eine reine Anzeige im Terminformular hebt keine serverseitige Berechtigung auf und ersetzt keine bestehende Rollenprüfung.

## Tests und Nachweise

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:unit -- --run tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `npm run test:integration -- --run tests/integration/server/appointments.direct-projections.integration.test.ts --reporter=verbose`
- `git diff --check`

Zusätzliche Abdeckung:

- UI-Test für die read-only Anzeige von Projekt- und Kunden-Tags im Terminformular.
- Logiktest gegen doppelte Anzeige direkter Termin-Tags im übernommenen Bereich.
- Integrationstest, dass `/api/appointments/:id` und `/api/calendar/appointments` die getrennten Tag-Quellen für Termin, Kunde und Projekt konsistent liefern.

## Ergebnis

Die Tags, die auf der Terminkarte sichtbar sind, sind im Terminformular jetzt ebenfalls nachvollziehbar sichtbar. Gleichzeitig bleibt klar, welche Tags direkt am Termin bearbeitet werden können und welche vom Projekt oder Kunden übernommen sind.
