# Auftragslog: Geparkt-Tag manuell entfernbar

## Zweck

Altbestände bereinigen, bei denen Termine fälschlich das Tag `Geparkt` tragen, obwohl sie nicht in der Tour `Parkplatz` liegen.

## Scope

- Gezielte Anpassung der bestehenden Backend-Regel für das Entfernen von Termin-Tags
- Keine Änderung am manuellen Hinzufügen des Tags `Geparkt`
- Keine Änderung an der Sichtbarkeit des Tags im Picker
- Keine UI-Neugestaltung

## Technische Entscheidungen

- `Geparkt` bleibt ein geschütztes System-Tag.
- Das manuelle Entfernen wird nur dann erlaubt, wenn der Termin nicht mehr in der Tour `Parkplatz` liegt.
- Für Termine, die weiterhin in `Parkplatz` liegen, bleibt die bestehende Sperre aktiv.

## Betroffene Dateien

- `server/services/appointmentsService.ts`
- `tests/integration/server/appointments.park.integration.test.ts`

## Hinweise zum Testen

- Gezielter Integrationstest:
  `npm run test:integration -- tests/integration/server/appointments.park.integration.test.ts --reporter=verbose`

## Bekannte Einschränkungen

- Der Fix bereinigt keine Altbestände automatisch, sondern erlaubt deren manuelle Korrektur.
- Die Arbeit erfolgte direkt auf `work`, da kein Arbeitsbranch gewünscht war.
