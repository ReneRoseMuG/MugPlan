# Auftragslog: Wochenkarte Kundenpanel Detailmodus Fix

## Auftrag

Korrektur eines Regressionsfehlers nach der Layoutanpassung der Wochenkalender-Terminkarte:

- Im Modus `Details` war der Header im Kundenpanel verschwunden.
- Der Adressblock im Kundenpanel sollte links so eingerückt werden, dass sein Textbeginn vertikal bündig zur Artikelliste im Projektpanel liegt.

## Analyse

- Der verlorene Header entstand durch `hideHeader={mode === "expanded"}` in `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`.
- Die gewünschte visuelle Bündigkeit lässt sich lokal im gemeinsamen Kundenpanel-Renderer herstellen, ohne das Projektpanel oder andere Kartenvarianten umzubauen.

## Umsetzung

- Entfernt: automatische `hideHeader`-Aktivierung für das expandierte Wochenkarten-Kundenpanel.
- Ergänzt: gezielter Detail-Textblock unterhalb des Headers mit linker Einrückung in `client/src/components/ui/customer-info-panel.tsx`.
- Erweitert: Unit-Test-Absicherung für sichtbaren Detailblock und Einrückung.

## Bewusst nicht verändert

- Keine Änderungen an Projektpanel-Logik oder Artikellisten-Rendering.
- Keine neuen Komponenten oder neuen Darstellungsmodi.
- Keine Änderungen an Backend, Contracts, Datenfluss oder Persistenz.

## Tests

- `npm run test:unit -- tests/unit/ui/customerInfoPanel.render.test.tsx`

## Ergebnis

- Der Header ist im Kundenpanel des Detailmodus wieder sichtbar.
- Der Detailtextblock startet bewusst eingerückt unterhalb des Headers und ist auf die Textkante der Artikelliste ausgerichtet.
- Der gezielte Unit-Testlauf war erfolgreich.
