# Auftragslog: Wochenkalender Terminkarte Layout

## Auftrag

Gezielte Verbesserung des Rendering- und Layoutverhaltens der bestehenden Terminkarte im Wochenkalender bei starker horizontaler Komprimierung und im Detail-Modus.

## Analyse

- Betroffene Kartenstruktur liegt in `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx` mit den Subkomponenten `CalendarWeekAppointmentPanelHeader.tsx`, `CalendarWeekAppointmentPanelCustomer.tsx` und `CalendarWeekAppointmentPanelProject.tsx`.
- Das Kundenpanel delegiert sein Rendering an `client/src/components/ui/customer-info-panel.tsx`.
- Die Artikelliste im Projektpanel wird durch `client/src/components/ui/project-article-description-renderer.tsx` gerendert.
- Relevante bestehende Absicherung lag bereits in `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx` und `tests/unit/ui/customerInfoPanel.render.test.tsx`.

## Umsetzung

- Header der Einzelkarte auf nicht umbrechende Zeilen mit kontrollierter Trunkierung umgestellt.
- Im Header eine kleine, benennbare Responsive-Logik ergänzt, damit bei sehr schmaler Breite zuerst das Datum ausblendbar ist, während Startzeit, Kundennummer und PLZ länger stabil sichtbar bleiben.
- Kundenpanel auf strukturierte, bewusst getrennte Textzeilen mit konsistentem Innenabstand umgestellt.
- Im Detail-Modus des Wochenkarten-Kundenpanels wird der interne Header ausgeblendet, damit die Adress- und Kontaktdaten innen geordnet wie im Projektpanel starten.
- Projekt-Header und Artikellistenzeilen auf ruhiges `overflow-hidden`-/`whitespace-nowrap`-Verhalten umgestellt.

## Bewusst nicht verändert

- Keine neue Kartenkomponente, kein neuer Kalender-View, keine fachliche Erweiterung.
- Keine Änderungen an Datenfluss, Query-Verhalten, Backend, Contracts oder Persistenz.
- Keine Änderungen an Mehrtagespangen-Rendering außerhalb der bestehenden gemeinsamen Testabsicherung.

## Tests

- `npm run test:unit -- tests/unit/ui/customerInfoPanel.render.test.tsx`
- `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`

## Ergebnis

- Beide gezielten Unit-Testläufe erfolgreich.
- Visuelle Feinheiten wurden über die Renderstruktur und Klassen gezielt abgesichert.
- Restunsicherheit bleibt bei rein optischen Breakpoint-Eindrücken im echten Browser, da dafür in diesem Auftrag kein zusätzlicher Browser- oder Screenshot-Test ergänzt wurde.
