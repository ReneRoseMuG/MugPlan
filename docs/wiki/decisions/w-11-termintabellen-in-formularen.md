# W-11 - Termintabellen in Formularen vereinheitlichen

## Metadaten

- Status: erledigt
- Priorität: Mittel
- Feature: Formular- und Detailansichten für Kunden, Projekte, Touren und Mitarbeiter
- Entdeckt: 01.05.26
- Art: Design-Entscheidung

## Befund

Touren und Mitarbeiter zeigen Termine tabellarisch im Hauptbereich. Kunden und Projekte zeigen Termine in einem kompakten Seitenpanel. Dadurch entstehen Sonderpfade für Darstellung, Navigation und Vorschau.

## Optionen

- A) Status quo beibehalten: Kunde/Projekt weiter mit kompaktem Terminpanel, Tour/Mitarbeiter weiter mit Haupttabellen
- B) Kunde und Projekt ebenfalls auf einen Haupttab `Termine` mit tabellarischer Darstellung umstellen und die Sidebar nur noch für kompakte Zusammenfassungen nutzen
- C) Alle Formkontexte auf ein gemeinsames, konfigurierbares Terminlistenmuster vereinheitlichen und daraus Haupt- und Kompaktvarianten ableiten

## Auswirkungen eines Eingriffs

Eine Vereinheitlichung auf Haupttabellen würde UX und Testpfade vereinfachen und die Zahl der Spezialdarstellungen reduzieren. Gleichzeitig ändern sich Aufbau und Gewohnheiten in Kunden- und Projektformularen sichtbar. Rollen, Berechtigungen und serverseitige Terminlogik wären fachlich nicht betroffen; der Eingriff liegt vor allem in Informationsarchitektur, Layout und Frontend-Verkabelung.

## Schadenspotential

Mittel. Das Risiko liegt primär in UI-Regressionen, geänderten Fokus- und Öffnungswegen sowie nachzuziehenden Browser-Tests. Fachliche oder sicherheitsrelevante Risiken bleiben gering, solange Rechte und Endpunkte unverändert bleiben.

## Vorgeschlagene Maßnahme

Kunde und Projekt bevorzugt auf einen Haupttab `Termine` mit tabellarischer Darstellung prüfen. Die Sidebar soll danach nur noch Zusammenfassungen tragen oder entfallen.

## Entscheidung und Abschluss

Variante C wurde am 28.05.26 umgesetzt. Alle Formular-Haupttabellen für Termine nutzen `AppointmentsListPage` mit kontextbezogenen festen Filtern. Kunden- und Projektformulare haben im Edit-Modus einen Haupttab `Termine`; die bestehenden kompakten Sidebar-Panels bleiben als Zusammenfassungen erhalten.

## Quelle
