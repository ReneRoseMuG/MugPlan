# 05.05.26 | Implementierung | Mitarbeiterformular: tababhängige HelpKeys ergänzt

## Zusammenfassung

Im Mitarbeiterformular wurde die Hilfetext-Verdrahtung um tababhängige HelpKeys erweitert. Das HelpIcon im Formular-Header verwendet nun je nach aktivem Bereich einen spezifischen Key für Stammdaten, Termine, Abwesenheiten, Wochenplanung, Umsatz Übersicht, Auslastung oder Journal.

## Betroffene Features

- [FT (05): Mitarbeiterverwaltung](../features/ft-05-mitarbeiterverwaltung/ft-05-mitarbeiterverwaltung.md)
- FT (16): Hilfetexte

## Technische Umsetzung

Die Berechnung liegt in `resolveEmployeeFormHelpKey(...)` in `EmployeeForm.tsx`. Die HelpKeys sind als literale `helpKey`-Objekte hinterlegt, damit sie vom bestehenden Frontend-Scanner für Hilfetexte erkannt werden können.

## Rollenbezug

Die Änderung ist rein lesend. Sie erweitert keine Mitarbeiterrechte, keine Mutationen und keine API-Sichtbarkeit. Das HelpIcon erscheint nur im Rahmen der bestehenden Formularsicht.

## Verifikation

Gezielt erfolgreich ausgeführt:

- `npm test -- --run tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`

## Offene Punkte

Für die neuen Keys müssen bei Bedarf noch konkrete Hilfetext-Inhalte im HelpText-System gepflegt werden.
