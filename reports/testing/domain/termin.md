# Termin

## Regel: Historische Termine duerfen nicht neu angelegt werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Erstellung mit Startdatum in der Vergangenheit wird blockiert; bei Fehlerfall erfolgt keine Persistierung.
- Referenz:
  - [tests/integration/server/appointments.historical-guards.integration.test.ts](../../../tests/integration/server/appointments.historical-guards.integration.test.ts)
  - [tests/unit/ui/appointmentForm.historical-validation.test.tsx](../../../tests/unit/ui/appointmentForm.historical-validation.test.tsx)
  - [tests/unit/ui/calendar.historical-create-controls.test.tsx](../../../tests/unit/ui/calendar.historical-create-controls.test.tsx)

## Regel: Historische Termine duerfen nicht geaendert werden

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Update von bereits historischen Terminen wird abgewiesen; auch Tageszeit in der Vergangenheit (heute) wird blockiert.
- Referenz:
  - [tests/integration/server/appointments.historical-guards.integration.test.ts](../../../tests/integration/server/appointments.historical-guards.integration.test.ts)
  - [tests/unit/ui/appointmentForm.historical-validation.test.tsx](../../../tests/unit/ui/appointmentForm.historical-validation.test.tsx)

## Regel: Mitarbeiter duerfen nicht ueberlappend auf Terminen verplant werden

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Konfliktfaelle aus Tour-, Team- und manueller Zuweisung werden gemeldet; geblockte Mitarbeiter werden nicht teilweise gespeichert.
- Referenz:
  - [tests/integration/server/appointments.employee-overlap.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.integration.test.ts)
  - [tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts)
  - [tests/integration/server/appointments.employee-overlap.flow.integration.test.ts](../../../tests/integration/server/appointments.employee-overlap.flow.integration.test.ts)

## Regel: Terminlisten liefern Versionsinformation fuer konfliktfreie Folgeaenderungen

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Projektbezogene Terminlisten enthalten die `version` je Terminobjekt.
- Referenz:
  - [tests/integration/server/projectAppointments.version.test.ts](../../../tests/integration/server/projectAppointments.version.test.ts)