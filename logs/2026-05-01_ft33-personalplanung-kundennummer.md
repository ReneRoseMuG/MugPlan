# Auftragslog: FT33 Kundennummer MuG Personalplanung

## Zweck

Im FT-33-Abwesenheitsworkflow war der interne Kunde `MuG Personalplanung` bisher mit der festen textuellen Kundennummer `MUG-PERSONALPLANUNG` verdrahtet. In dieser Session wurde die Annahme korrigiert, dass die interne Kundennummer frei textuell sein dürfe. Ziel war, die Ermittlung der Kundennummer an den realen Dev-Bestand anzupassen und den bestehenden Datensatz in der Dev-DB zu bereinigen.

## Ausgangsbefund

- `customer_number` ist im aktuellen Repo technisch ein `varchar`, nicht `int`.
- Die bisherige FT-33-Implementierung nutzte dennoch eine fachlich unpassende feste Zeichenkette als Kundennummer.
- Die gewünschte neue Regel lautet:
  - Wenn ein Referenzkunde `MuG Messebau` existiert, seine Kundennummer numerisch lesen und `+1` vergeben.
  - Falls kein solcher Referenzkunde existiert, Kundennummer `1` verwenden.
- Beim Prüfen des realen Dev-Bestands zeigte sich, dass `MuG Messebau` nicht über `fullName = 'MuG Messebau'` oder `company = 'MuG Messebau'` identifizierbar war, sondern als:
  - `firstName = 'MUG'`
  - `lastName = 'Messebau'`
  - `fullName = 'Messebau, MUG'`
  - `customerNumber = '001'`

## Umsetzung

- Die feste Konstante `ABSENCE_CUSTOMER_NUMBER` wurde aus `shared/absenceAppointments.ts` entfernt.
- Der FT-33-Service `server/services/employeeAppointmentAbsencesService.ts` ermittelt die Kundennummer für `MuG Personalplanung` jetzt dynamisch:
  - bestehenden internen Kunden `MuG Personalplanung` per Anzeigename wiederverwenden
  - sonst Referenzkunde `MUG` / `Messebau` per Namensbestandteilen suchen
  - dessen Kundennummer numerisch parsen
  - inkrementieren und mit derselben Stellenbreite wieder ausgeben (`001 -> 002`)
  - falls kein Referenzkunde existiert, auf `1` zurückfallen
- Wenn die Referenzkundennummer nicht numerisch ist oder die abgeleitete Zielnummer bereits von einem anderen Kunden belegt ist, bricht der FT-33-Flow jetzt mit `BUSINESS_CONFLICT` statt mit still falschen Daten ab.
- `server/repositories/customersRepository.ts` wurde um eine gezielte Suche nach exakten Namensbestandteilen erweitert.

## Dev-DB-Korrektur

Zusätzlich zum Codefix wurde der bestehende Dev-Datensatz direkt bereinigt:

- Referenzkunde `MuG Messebau` gefunden als Kunde `id=1776` mit Kundennummer `001`
- bestehender interner FT-33-Kunde `MuG Personalplanung` gefunden als Kunde `id=1959`
- `MuG Personalplanung` in der Dev-DB auf Kundennummer `002` umgestellt

Geprüfter Endstand in Dev:

- `MuG Messebau` → `001`
- `MuG Personalplanung` → `002`

## Tests und Nachweise

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/employeeAppointmentAbsences.integration.test.ts --reporter=verbose`

Zusätzlich geprüft:

- Dev-Bestand von `MuG Messebau` und `MuG Personalplanung`
- Verifikation nach der Dev-DB-Korrektur, dass beide Kunden mit `001` bzw. `002` vorhanden sind

## Betroffene Dateien

- `server/repositories/customersRepository.ts`
- `server/services/employeeAppointmentAbsencesService.ts`
- `shared/absenceAppointments.ts`
- `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`

## Hinweise zum Save-Stand

- Im Worktree lagen zusätzlich bereits offene Änderungen in:
  - `client/src/components/SettingsPage.tsx`
  - `tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`
- Diese Dateien wurden in dieser Session nicht fachlich bearbeitet, gehören aber zum durch den Nutzer angeforderten globalen `save`-Stand des aktuellen Branches.
