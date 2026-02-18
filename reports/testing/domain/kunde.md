# Kunde

## Regel: Kundenlisten sind fuer Nicht-Admins auf aktive Datensaetze begrenzt

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht-Admins erhalten bei Scope-Anfragen effektiv nur aktive Kunden; Admins koennen aktiv/inaktiv gezielt abrufen.
- Referenz:
  - [tests/integration/server/customers.visibility.by-role.test.ts](../../../tests/integration/server/customers.visibility.by-role.test.ts)
  - [tests/unit/ui/customersPage.scopeUx.test.tsx](../../../tests/unit/ui/customersPage.scopeUx.test.tsx)

## Regel: Inaktive Kunden sind fuer Nicht-Admins im Detail nicht verfuegbar

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Detailzugriff auf inaktive Kunden liefert fuer Nicht-Admins `404`.
- Referenz:
  - [tests/integration/server/customers.visibility.by-role.test.ts](../../../tests/integration/server/customers.visibility.by-role.test.ts)

## Regel: Aktiv/Inaktiv-Aenderung ist fuer Nicht-Admins gesperrt

- Testtyp: Integration und Unit
- Test-DB: Ja (Integration), Nein (Unit)
- Gepruefte Erwartung: Nicht-Admins erhalten bei Statuswechsel `403 FORBIDDEN`; UI-Wiring behandelt Konflikt-/Forbidden-Meldungen separat.
- Referenz:
  - [tests/integration/server/customers.visibility.by-role.test.ts](../../../tests/integration/server/customers.visibility.by-role.test.ts)
  - [tests/unit/ui/customerData.versioning.test.tsx](../../../tests/unit/ui/customerData.versioning.test.tsx)

## Regel: Kundenaenderungen sind versionsgebunden

- Testtyp: Unit
- Test-DB: Nein
- Gepruefte Erwartung: Update-Mutationen uebergeben die aktuelle Kundenversion im Payload.
- Referenz:
  - [tests/unit/ui/customerData.versioning.test.tsx](../../../tests/unit/ui/customerData.versioning.test.tsx)