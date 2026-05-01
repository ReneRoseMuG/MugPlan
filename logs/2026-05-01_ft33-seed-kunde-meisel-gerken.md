# FT-33 Seed-Kunde Meisel & Gerken

## Anlass

In dieser Session wurde die fachliche Entscheidung umgesetzt, dass FT-33-Abwesenheiten keinen separaten internen Kunden `MuG Personalplanung` mehr verwenden. Stattdessen soll der bestehende Seed-Kunde mit Kundennummer `001` genutzt werden.

Verbindlicher Sollzustand:

- Kundennummer: `001`
- Vorname: leer
- Nachname: leer
- Firma: `Meisel & Gerken`
- Vollname: `Meisel & Gerken`
- Straße: `Handwerkerhof 20`
- PLZ: `28857`
- Ort: `Syke`
- Land: `Deutschland`

## Umsetzung

### FT-33-Abwesenheiten

- [shared/absenceAppointments.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/shared/absenceAppointments.ts) um feste Kundenkonstanten für `001 · Meisel & Gerken` erweitert.
- [server/services/employeeAppointmentAbsencesService.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/server/services/employeeAppointmentAbsencesService.ts) auf den Seed-Kunden `001` umgestellt.
- Die bisherige Sonderlogik für `MuG Personalplanung` und die Ableitung über `MuG Messebau` wurde entfernt.
- Der Service akzeptiert jetzt nur noch den erwarteten Sollzustand des Seed-Kunden; bei Abweichungen wird serverseitig ein `BUSINESS_CONFLICT` mit Hinweis auf den System-Seed geworfen.

### System-Seed

- [server/services/systemSeedService.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/server/services/systemSeedService.ts) erweitert den Admin-System-Seed um den Entitätstyp `customer`.
- Der Seed kennt jetzt den festen Systemkunden `001 · Meisel & Gerken` und kann ihn prüfen, anlegen oder aktualisieren.
- [shared/routes.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/shared/routes.ts) erweitert den Preview-Contract um `kind = "customer"`.
- [client/src/components/SettingsPage.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/SettingsPage.tsx) zeigt Systemkunden im Seed-Preview an und invalidiert zusätzlich Kunden-Queries nach erfolgreichem Apply.

## Tests

Aktualisiert:

- [tests/unit/services/systemSeedService.test.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/unit/services/systemSeedService.test.ts)
- [tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx)
- [tests/integration/server/admin.system-seed.integration.test.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/integration/server/admin.system-seed.integration.test.ts)
- [tests/integration/server/employeeAppointmentAbsences.integration.test.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/tests/integration/server/employeeAppointmentAbsences.integration.test.ts)

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project unit tests/unit/services/systemSeedService.test.ts tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/admin.system-seed.integration.test.ts tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`

## Rollen und Sicherheit

- Keine Rollenänderung umgesetzt.
- Admin-System-Seed bleibt ADMIN-only.
- FT-33-Abwesenheitsmutationen bleiben serverseitig auf `ADMIN` und `DISPONENT` beschränkt.
- Lesende Sichtbarkeit für `LESER` wurde nicht erweitert oder verändert.

## Dev-Datenbank

Geprüft und bereinigt:

- Vor Bereinigung existierte noch der Alt-Kunde `MuG Personalplanung` mit `id = 1959` und genau einem referenzierenden Termin.
- Der referenzierende Termin `2430` wurde auf den Seed-Kunden `1776` umgehängt.
- Der Alt-Kunde `1959` wurde anschließend gelöscht.
- Abschließend wurde verifiziert, dass kein Datensatz `MuG Personalplanung` mehr in der Dev-Datenbank existiert.

## Ergebnis

FT-33 verwendet jetzt durchgängig den bestehenden Seed-Kunden `001 · Meisel & Gerken`. Ein zusätzlicher Kunde `MuG Personalplanung` wird weder im Code noch in der Dev-Datenbank weitergeführt.
