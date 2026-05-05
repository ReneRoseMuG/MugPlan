# Auftragslog: Mitarbeiter-HelpKeys

## Zweck

Das Mitarbeiterformular sollte eine kontextbezogene Hilfe bekommen, deren HelpKey je nach aktivem Tab wechselt. Ziel war eine reine UI-Verdrahtung ohne Änderungen an Rollen, API, Datenmodell oder fachlicher Mitarbeiterlogik.

## Scope

- Dynamisches HelpKey-Mapping im Mitarbeiterformular ergänzt
- HelpIcon im Formular-Header an den berechneten HelpKey gebunden
- Tab-spezifische HelpKeys für Stammdaten, Termine, Abwesenheiten, Wochenplanung, Umsatz Übersicht, Auslastung und Journal ergänzt
- Bestehende HelpText-Infrastruktur unverändert weiterverwendet

## Technische Entscheidungen

- Die HelpKeys werden als literale `helpKey`-Objekte im Frontend hinterlegt, damit der vorhandene HelpText-Scanner sie erkennen kann.
- Die Berechnung erfolgt über `resolveEmployeeFormHelpKey(...)` in `EmployeeForm.tsx`.
- Bei unbekanntem Detail-Tab fällt das Formular auf `employees.form.stammdaten` zurück.
- Der Journal-Haupttab überschreibt den Detail-Tab und nutzt `employees.form.journal`.

## Rollen- und Rechtebezug

Die Änderung ist rein lesend und betrifft nur sichtbare Hilfetexte im bereits geöffneten Mitarbeiterformular.

- Betroffene Rollen: alle Rollen mit bestehender Sichtbarkeit des Mitarbeiterformulars
- Erlaubte Aktionen: Hilfetext anzeigen
- Nicht betroffen: Mutationen, API-Zugriffe auf Mitarbeiterdaten, Rollenlogik, Sichtbarkeitsgrenzen
- Technische Durchsetzung: unverändert über bestehende Formularsicht und bestehenden HelpText-Endpoint

## Betroffene Dateien

- `client/src/components/EmployeeForm.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`

## Hinweise zum Testen

Gezielt ausgeführt:

- `npm test -- --run tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`

Ergebnis:

- 1 Testdatei erfolgreich
- 4 Tests erfolgreich

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Die HelpKeys liefern nur dann ein sichtbares Icon, wenn im HelpText-System ein aktiver Hilfetext mit nicht leerem Body vorhanden ist.
