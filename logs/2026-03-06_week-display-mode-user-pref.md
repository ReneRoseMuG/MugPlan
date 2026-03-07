# Wochenkalender Darstellungsmodus als User-Pref

## Zweck

Vorbereitung eines globalen Darstellungsmodus fuer die Wochenansicht als benutzerspezifische Praeferenz fuer Disponenten und Admins. Die bisherige terminbezogene Umschaltung aus der Wochenkarte wurde aus der UI entfernt.

## Scope

- Neues `USER`-Setting `calendar.weekAppointmentDisplayMode`
- Verdrahtung eines kleinen Wochenmodus-Panels im Kalenderfilter neben dem Mitarbeiterfilter
- Entfernen des pro-Termin-Modus-Schalters aus der Wochenkarte
- Entfernen des alten Wochen-Write-Pfads auf `/api/appointments/:id/display-mode`
- Keine Aenderung des Kartenlayouts selbst

## Technische Entscheidungen

- Das Panel wurde in die bestehende Toolbar des `CalendarWorkspace` integriert, weil dort der Mitarbeiterfilter tatsaechlich gerendert wird.
- Die Karten-Darstellung bleibt bewusst unveraendert; die neue Praeferenz ist in diesem Auftrag nur Persistenz- und UI-Vorbereitung.
- Bestehende Appointment-Contracts, Schemafelder und Backend-Endpunkte fuer terminbezogenen `displayMode` bleiben unberuehrt.

## Betroffene Dateien

- `server/settings/registry.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/unit/settings/useSettings.weekAppointmentDisplayMode.test.ts`
- `tests/unit/ui/calendarFilterPanel.weekDisplayMode.wiring.test.tsx`
- `tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `tests/integration/server/userSettings.weekAppointmentDisplayMode.persistence.test.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm test -- tests/unit/settings/useSettings.weekAppointmentDisplayMode.test.ts tests/unit/ui/calendarFilterPanel.weekDisplayMode.wiring.test.tsx tests/unit/settings/userSettingsResolvedMapping.test.ts tests/integration/server/userSettings.weekAppointmentDisplayMode.persistence.test.ts`
- `npm run typecheck`

## Bekannte Einschraenkungen

- Der globale Wochenmodus hat aktuell noch keine sichtbare Auswirkung auf das Kartenlayout.
- `standard`, `compact` und `detail` sind fuer die Wochenkarten noch nicht fachlich ausdefiniert.
- Leser sehen den Schreibpfad nicht interaktiv, das Setting bleibt aber als vorbereitete Infrastruktur im System vorhanden.
