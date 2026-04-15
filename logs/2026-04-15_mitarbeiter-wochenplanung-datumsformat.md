# Auftragslog: Mitarbeiter-Wochenplanung Datumsformat

## Zweck

Die Datumsbeschriftung der Karten in `Mitarbeiter -> Wochenplanung` sollte von ISO-Datumswerten auf das feste Kurzformat `dd.MM.yy` umgestellt werden.

## Scope

- Wochenbereich in den Karten der Mitarbeiter-Wochenplanung formatieren
- Die Datumsdarstellung über eine zentrale Frontend-Hilfsfunktion absichern
- Vorhandenen UI-Test auf das konkrete Format erweitern

## Technische Entscheidungen

- Die Anzeige in `EmployeeForm` nutzt nicht mehr die rohen Werte `weekStartDate` und `weekEndDate`, sondern eine zentrale Range-Hilfsfunktion.
- Dafür wurde in `client/src/lib/list-display-format.ts` `formatListDateRange()` ergänzt, die auf dem bestehenden Listenformat `dd.MM.yy` aufbaut.
- Die Regel für diese Karten lautet damit fest: Datumsspannen in diesem UI-Kontext werden über `formatListDateRange()` gerendert.

## Betroffene Dateien

- `client/src/components/EmployeeForm.tsx`
- `client/src/lib/list-display-format.ts`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt: `npm run test:unit -- tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- Abgesichert wird dabei sowohl das erwartete Kurzformat `27.04.26 - 03.05.26` als auch das Ausbleiben der alten ISO-Anzeige.

## Bekannte Einschränkungen

- Die Zentralisierung wurde bewusst minimal gehalten und betrifft nur den bereits vorhandenen Listen-/Kartenformatkontext.
- Andere UI-Bereiche mit Datumsausgabe wurden in diesem Auftrag nicht umgestellt.
