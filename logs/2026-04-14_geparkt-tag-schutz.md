# Auftragslog: Geparkt-Tag-Schutz

## Zweck

Die zwischenzeitliche Ausnahmeregel für das manuelle Entfernen des Tags `Geparkt` wurde zurückgenommen. `Geparkt` ist damit wieder vollständig auf den Parken-Workflow beschränkt und wird fachlich wie der geschützte System-Tag `Storniert` behandelt.

## Scope

- Schutzregel für das manuelle Entfernen des Tags `Geparkt` im Appointment-Service zurückgesetzt
- FT06-Integrationstest für den unerwünschten Ausnahmefall auf 409-Schutzverhalten zurückgedreht
- Keine Änderungen an Picker-Logik, Parken-Workflow, Tour-Wechsel-Logik oder UI-Strukturen

## Technische Entscheidungen

- Die Korrektur wurde zentral in `removeAppointmentTag()` umgesetzt, weil dort bereits die Schutzlogik für reservierte System-Tags gebündelt ist.
- Der automatische fachliche Entzug des Tags bei regulärem Tour-Wechsel weg von `Parkplatz` bleibt unverändert bestehen; blockiert wird nur der manuelle DELETE-Tag-Pfad.
- Der bestehende Picker-Schutz blieb unverändert, da `Geparkt` dort bereits nicht sichtbar ist.

## Betroffene Dateien

- `server/services/appointmentsService.ts`
- `tests/integration/server/appointments.park.integration.test.ts`

## Hinweise zum Testen

Ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.park.integration.test.ts`

Verifiziert wurde dabei insbesondere:

- `Geparkt` erscheint nicht im Termin-Tag-Picker
- `Geparkt` kann nicht manuell über POST `/api/appointments/:id/tags` gesetzt werden
- `Geparkt` kann nicht manuell über DELETE `/api/appointments/:id/tags/:tagId` entfernt werden, auch nicht außerhalb der Parkplatz-Tour
- der automatische Entzug bei Tour-Wechsel von `Parkplatz` auf eine reguläre Tour bleibt erhalten

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt
- Der separate offene FT06-Punkt zur Kopplung von Messe-Tour und Notizvorlagen-Flow ist nicht Teil dieses Fixes
