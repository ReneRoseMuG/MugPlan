# Datumsformat Kurzregel

## Datum
01.05.26

## Anlass

Die projektweite Datumsregel sollte verbindlich und dauerhaft auf das sichtbare Kurzformat `dd.MM.yy` festgezogen werden. Gleichzeitig sollten bestehende sichtbare Datumsstellen im Code auf diese Regel vereinheitlicht und eine klare Prüfanweisung für Abweichungen ergänzt werden.

## Umsetzung

Geändert in:

- [agents.md](/C:/Users/schro/source/repos/Plan/Releases/version02/agents.md)
- [CLAUDE.md](/C:/Users/schro/source/repos/Plan/Releases/version02/CLAUDE.md)
- [client/src/lib/date-display-format.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/lib/date-display-format.ts)
- [client/src/lib/list-display-format.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/lib/list-display-format.ts)
- [client/src/lib/calendar-utils.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/lib/calendar-utils.ts)
- [client/src/components/ReportsPage.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/ReportsPage.tsx)
- [client/src/components/SettingsPage.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/SettingsPage.tsx)
- [client/src/components/JournalRecordsView.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/JournalRecordsView.tsx)
- [client/src/components/TourEditForm.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/TourEditForm.tsx)
- [client/src/components/calendar/CalendarWeekAppointmentNotesPreview.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/calendar/CalendarWeekAppointmentNotesPreview.tsx)
- [client/src/components/reports/ProduktionsplanungPrintLayout.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/reports/ProduktionsplanungPrintLayout.tsx)
- [client/src/components/reports/ReportProjectCard.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/reports/ReportProjectCard.tsx)
- [client/src/components/reports/TourenplanReportPanel.tsx](/C:/Users/schro/source/repos/Plan/Releases/version02/client/src/components/reports/TourenplanReportPanel.tsx)
- [server/services/exportService.ts](/C:/Users/schro/source/repos/Plan/Releases/version02/server/services/exportService.ts)

Technische Entscheidungen:

- Neue zentrale Frontend-Helfer `formatDisplayDate` und `formatDisplayTimestamp` eingeführt.
- Bestehende sichtbare Datumsdarstellungen auf den zentralen Helfer oder auf das feste Kurzformat `dd.MM.yy` vereinheitlicht.
- Die Projektanweisungen für Codex und Claude auf dieselbe Kurzregel gebracht.
- Für `journal` ausdrücklich festgelegt, dass der Journaltitel und der Eintrag das Format `dd.MM.yy` verwenden und direkt auf der Journal-Seite ohne Unterseiten landen.
- Eine Suchanweisung ergänzt, um verbotene sichtbare Datumsformate gezielt zu finden.

## Rollen und Sichtbarkeit

- Keine Rollenänderung.
- Keine Änderung an serverseitigen Berechtigungen.
- Keine Änderung an API-Contracts, Datenbankwerten oder internen ISO-Datumsfeldern.

## Hinweise zum Testen

Gezielt geprüft:

- `rg -n "dd\\.MM\\.yyyy|yyyy-MM-dd|MM/DD/YYYY|dd/MM/yyyy|toLocaleDateString\\(|toLocaleString\\(\"de-DE\"\\)" client/src server tests docs agents.md CLAUDE.md`
- `npm run typecheck`

## Bekannte Einschränkungen

- Der volle Audit und der volle Testlauf stehen noch aus und werden separat seriell ausgeführt.
- Die Suchprüfung unterscheidet technisch zwischen verbotenen sichtbaren Treffern und erlaubten Erwähnungen in Regeltexten. Die verbliebenen `dd.MM.yyyy`-Treffer stammen aus den Verbotsregeln selbst.

## Ergebnis

Die Projektregel für sichtbare Datumsangaben ist jetzt dauerhaft dokumentiert, auf `dd.MM.yy` vereinheitlicht und über eine zentrale Anzeige-Hilfe im Frontend besser durchsetzbar. ISO bleibt auf technische Kontexte begrenzt.
