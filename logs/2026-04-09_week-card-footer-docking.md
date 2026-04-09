# Wochenkarten-Footer unten andocken

## Zweck

Die Footer-Zeile von Wochenkarten sollte auch bei Mehrtagesterminen sichtbar unten angedockt bleiben. In einzelnen Kacheln saß der Footer trotz freier Höhe zu weit oben.

## Scope

- Korrektur der Höhen- und Flex-Struktur für Wochenkarten mit Fokus auf Mehrtagestermine
- kleiner begleitender Footer-Inhalts-Fix für normale und mehrtägige Wochenkarten
- Erweiterung des zugehörigen Layout-Regressionsschutzes
- Aktualisierung der Test-Matrix

## Technische Entscheidungen

- Die eigentliche Ursache lag nicht nur im Footer-Inhalt, sondern im Wrapper der Mehrtagestermin-Kachel.
- `CalendarWeekSpanningTile` füllt die verfügbare Kartenhöhe jetzt als Flex-Spalte sauber aus, damit der Footer unten andocken kann.
- Der bereits eingebaute Footer-Inhalts-Fix in `CalendarWeekAppointmentPanel` bleibt bestehen, weil er das Bottom-Docking unterstützt und keinen fachlichen Seiteneffekt erzeugt.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`

## Bekannte Einschränkungen

- Es wurde nur der direkt betroffene Unit-Test erneut ausgeführt.
- Eine erneute Browser-Sichtprüfung oder ein voller Testlauf sind in diesem Schritt nicht erfolgt.

## Branch

- Arbeitsbranch: `cleanup/remove-legacy-calendar-print`
