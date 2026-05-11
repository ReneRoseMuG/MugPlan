# 11.05.26 | Implementierung | P01 Dialog-Rollout: A-14 Mitarbeiter-Auswahl als Basiskomponente

## Zusammenfassung

Die vorhandene `EmployeePickerDialogList` wurde als app-weite Basiskomponente für Mitarbeiter-Auswahl stabilisiert. Sie bleibt reine Auswahl-UI für Filterung, Sortierung, Board-Ansicht, Listenansicht, Checkbox-Auswahl und Bestätigung; Dialograhmen, Datenladen, Berechtigungen und Mutationen bleiben weiterhin bei den aufrufenden Screens beziehungsweise serverseitigen Endpunkten.

## Art der Änderung

- Frontend-Refactoring einer bestehenden zentralen Auswahlkomponente.
- Rückwärtskompatible Props-Erweiterung ohne neue API, ohne DB-Änderung, ohne neue Rollenlogik und ohne neue Datenquelle.
- Gezielt erweiterte UI-Wiring-Tests für zentrale Picker-Funktionen und betroffene Konsumenten.

## Betroffene Features

- Projekt: [Dialog-Rollout](../projects/dialog-rollout.md)
- Aufgabe: [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](../tasks/mitarbeiter-auswahl-dialogstruktur.md)
- Angrenzend: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](../tasks/ft04-dialog-basiskomponente.md), [FT-04 mehrstufiger Tour-KW-Dialog](../tasks/ft04-multistep-tour-kw-dialog.md), [FT-04 Multiselect für KW-Planung im Wochenkalender](../tasks/ft04-multiselect-kw-planung-wochenkalender.md)

## Konkrete Änderungen

- `EmployeePickerDialogList` exportiert nun eine klare Props-Schnittstelle mit `selectionMode: "single" | "multiple"`.
- `allowBulkSelection` bleibt als Kompatibilitätsalias erhalten.
- `teams` und `tours` sind optional; `tours` bleibt ohne fachliche Wirkung im Picker.
- Mehrfachauswahl unterstützt kontrollierte und initiale Auswahl über `selectedEmployeeIds`, `defaultSelectedEmployeeIds` und `onSelectionChange`.
- Ungültige, nicht verfügbare oder doppelte Mitarbeiter-IDs werden vor Anzeige, Auswahländerung und Bestätigung bereinigt.
- Bestehende Mehrfachauswahl-Pfade in Terminformular, Teamformular, Tourformular, Tour-KW-Formular und Tour-KW-Planungsansicht nutzen jetzt `selectionMode="multiple"`.
- Ein bestehender Mojibake-Literal in der Tournamen-Normalisierung von `TourEditForm` wurde von `/ÃŸ/g` auf `/ß/g` korrigiert.

## Rollen

- `ADMIN` und `DISPONENT` dürfen Mitarbeiter nur in den bereits bestehenden erlaubten Termin-, Team- und Tour-KW-Aktionen auswählen.
- `READER` beziehungsweise `LESER` erhält durch den Picker keine neue Schreibaktion.
- Die technische Durchsetzung bleibt serverseitig über bestehende Termin-, Tour-KW- und Rollenregeln maßgeblich; UI-Gates wie `readOnly`, gesperrte Wochen oder ausgeblendete Buttons bleiben nur zusätzliche Bediengrenzen.

## Tests / Verifikation

- Unit-Tests: `npm run test:unit -- tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourWeekForm.smoke.test.tsx tests/unit/ui/tourWeekPlanningView.render.test.tsx` erfolgreich mit 25 Tests in 5 Dateien.
- Typecheck: `npm run typecheck` erfolgreich.
- Check: `npm run check` erfolgreich.
- Browser-E2E: `npm run test:e2e:browser -- tests/e2e-browser/employee-form-week-planning.browser.e2e.spec.ts tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts` erfolgreich mit 5 Chromium-Tests.
- Encoding: gezielte Mojibake-Suche in den berührten Dateien ohne Treffer; `npm run check:encoding` erfolgreich.

## Offene Punkte

- Die FT-04-Bestätigungsbasis, der mehrstufige Tour-KW-Dialog und der Wochenkalender-Multiselect bleiben separate Aufgaben.
- Es wurden keine serverseitigen Berechtigungen, keine Preview-Contracts und keine Mutationsflüsse geändert.

