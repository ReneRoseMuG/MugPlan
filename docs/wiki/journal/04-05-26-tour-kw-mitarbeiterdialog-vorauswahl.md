# 04.05.26 | Änderung | Kalender/Tour-KW: Mitarbeiterdialog und Anwenden-Flow

## Zusammenfassung

Die Wochenkalender- und Tour-KW-Mitarbeiterlogik wurde in dieser Session erweitert und anschließend korrigiert. Tour-KW-Planungen können jetzt aus der Wochenkalender-Tour-KW-Spalte und aus den Tour-KW-Karten im Tourformular auf die Termine der passenden Tour/KW angewendet werden. Die Terminkarten-Funktion `Mitarbeiter hinzufügen` zeigt bei vorhandener Tour-KW-Planung einen kombinierten Dialog aus Tour-KW-Mitarbeitern und weiteren konfliktfrei zuweisbaren Mitarbeitern.

Die Nachkorrektur stellt sicher, dass im Dialog nicht alle konfliktfreien Mitarbeiter vorausgewählt sind. Initial markiert werden nur konfliktfrei übernehmbare Tour-KW-Mitarbeiter, die noch nicht am Termin hängen. Die konfliktfreie Restmenge bleibt sichtbar, aber nicht ausgewählt.

## Art der Änderung

- Frontend-Verhalten im Wochenkalender korrigiert.
- Bestehenden Tour-KW-Anwenden-Flow sichtbar in Wochenkalender und Tourformular angebunden.
- Backend-Preview kompatibel um Quellenangaben und konfliktfreie Restmenge erweitert.
- Tests für Preview, Dialoggruppierung und Vorauswahl ergänzt.
- Wiki-Hauptseiten zu Kalenderansichten und Tourenplanung aktualisiert.

## Betroffene Features

- [FT-01: Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- [FT-03: Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- [FT-04: Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)

Notion-Featureseiten wurden in dieser Session nicht erneut herangezogen, weil die lokalen Wiki-Featureseiten für die konkrete Dokumentationsprüfung ausreichten.

## Konkrete Änderungen

- Der Terminkarten-Dialog `Mitarbeiter hinzufügen` unterscheidet zwischen Tour-KW-Mitarbeitern und weiteren konfliktfrei zuweisbaren Mitarbeitern.
- Ohne Tour-KW-Planung oder bei leerer Planung wird nur die konfliktfreie Mitarbeitermenge angezeigt.
- Die Initialauswahl markiert nur noch auswählbare Tour-KW-Mitarbeiter mit Status `will_add`.
- Die Anwenden-Aktion nutzt die bestehenden Vorschau-/Bestätigungsflüsse und führt keine neue Rollen- oder Konfliktlogik ein.
- FT-03 dokumentiert das kombinierte Dialogverhalten und die neue Anwenden-Aktion in der Wochenansicht.
- FT-04 dokumentiert das Anwenden einer bestehenden Tour-KW-Planung aus Wochenkalender und Tourformular.

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm exec tsc`
- `npm run test:unit -- tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx --reporter=verbose`
- Safety-Gate für `.env.test`, `NODE_ENV=test`, `MUGPLAN_MODE=test`, Test-Datenbank-Allowlist und Test-Host-Allowlist
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.compactHeader.test.ts --reporter=verbose`

## Offene Punkte

- Ein vollständiger Browser-E2E-Lauf wurde für diese Session nicht ausgeführt.
- Der detaillierte Use Case `UC 01/08` wurde geprüft, aber nicht geändert; die relevante Fachregel steht in den Feature-Hauptseiten.
