# Test-Isolation

## Garantie: Jeder Integrationstest startet mit frischem Datenbankzustand

- Testtyp: Integration
- Test-DB: Ja
- Gepruefte Erwartung: Vor jedem Testfall wird `resetDatabase()` ausgefuehrt.
- Referenz:
  - [tests/setup.integration.ts](../../../tests/setup.integration.ts)
  - [vitest.integration.config.ts](../../../vitest.integration.config.ts)

## Garantie: Reset laeuft nur im sicheren Testkontext

- Testtyp: Unit
- Test-DB: Nein
- Gepruefte Erwartung: Der Reset bricht bei falschem `NODE_ENV` oder nicht-Test-DB ab und fuehrt dann keine DB-Aktionen aus.
- Referenz:
  - [tests/unit/invariants/resetDatabaseGuard.test.ts](../../../tests/unit/invariants/resetDatabaseGuard.test.ts)
  - [tests/helpers/resetDatabase.ts](../../../tests/helpers/resetDatabase.ts)

## Garantie: Reset ist fuer parallele Zugriffe abgesichert

- Testtyp: Integration-nahe Infrastrukturabsicherung
- Test-DB: Ja
- Gepruefte Erwartung: Der DB-Reset nutzt einen Named Lock, deaktiviert FK-Pruefungen waehrend Truncate und stellt Baseline-Rollen/Benutzer wieder her.
- Referenz:
  - [tests/helpers/resetDatabase.ts](../../../tests/helpers/resetDatabase.ts)

## Garantie: Testausfuehrung ist seriell konfiguriert

- Testtyp: Infrastrukturkonfiguration
- Test-DB: Indirekt
- Gepruefte Erwartung: Dateiparallelisierung und gleichzeitige Testsequenzen sind deaktiviert.
- Referenz:
  - [vitest.config.ts](../../../vitest.config.ts)