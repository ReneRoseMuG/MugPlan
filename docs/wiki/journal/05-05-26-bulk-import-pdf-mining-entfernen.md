# 05.05.26 | Cleanup | Bulk-Import und PDF-Mining entfernt

## Zusammenfassung

Der verwaiste Bulk-Import- und Admin-PDF-Mining-Stack wurde entfernt. FT-21 Dokumentenextraktion bleibt unverändert.

## Art der Änderung

Mehrschichtiger technischer Cleanup in Server, Shared-Contracts, Client und Tests. Es wurden keine Datenbankmigrationen, keine Persistenzänderungen und keine neuen UI-Flows eingeführt.

## Betroffene Features

- W-18: Bulk-Import und PDF-Mining entfernen
- FT-21: Dokumentenextraktion als Schutzgrenze

## Konkrete Änderungen

- Die Admin-Bulk-Routen wurden aus `server/routes.ts` ausgehängt.
- Bulk-Import-Service, PDF-Mining-Service, Admin-Controller und Admin-Routendatei wurden gelöscht.
- Bulk-Import- und PDF-Mining-Contracts wurden aus `shared/routes.ts` entfernt.
- Verwaiste Client-Dateien für Kunden-Bulk-Import, Projekt-Bulk-Import und Admin-PDF-Mining wurden gelöscht.
- Bulk-/PDF-Mining-spezifische Unit-Tests wurden entfernt.
- `ProjectDuplicateResolutionDialog` und FT-21 Doc-Extract-Dateien blieben unangetastet.

## Rollen

Die entfernten Endpunkte sind nach der Änderung für keine Rolle mehr ausführbar, weil sie serverseitig nicht mehr registriert sind. Bestehende globale API-Middlewares und FT-21-Routen wurden nicht verändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run audit:local -- --skip-coverage`: Nicht-Coverage-Schritte erfolgreich; der Runner führte trotz Skip-Argument zusätzlich `analyze:coverage` aus.
- `npm run test:extraction`
- `npm run test:integration -- --reporter=verbose tests/integration/server/projects.order-number-conflict.integration.test.ts tests/integration/server/documentExtraction.routes.test.ts`

Fehlgeschlagen, ohne nachträgliche Fixes:

- `npm run audit:local -- --skip-coverage`: Gesamtstatus fehlgeschlagen, weil der lokale Runner trotz Skip-Argument `analyze:coverage` ausführte. Coverage meldete zwei fehlgeschlagene EmployeeForm-Testdateien.
- `npm run test:run`: zwei fehlgeschlagene EmployeeForm-Testdateien, fünf fehlgeschlagene Tests, Ursache laut Report `HelpIcon` mit `Cannot read properties of undefined (reading 'trim')`.

## Offene Punkte

- Die Decision W-18 sollte später redaktionell korrigiert werden, weil `ProjectDuplicateResolutionDialog` nicht verwaist ist.
- Die fehlgeschlagenen EmployeeForm-Tests liegen außerhalb des Bulk-/PDF-Mining-Cleanups und wurden gemäß Auftrag nicht repariert.
