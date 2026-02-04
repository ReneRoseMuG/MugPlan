# Block 8 – QA & Entscheidungen (Kalenderansichten)

## Abnahme-Checks (manuell vorgesehen)
- Termin anlegen über "+" in Monat/Woche/Jahr (Startdatum vorbelegt).
- Termin öffnen per Klick und speichern ohne Kontextverlust.
- Mouse-Over-Popover zeigt Projektdaten, Kundeninfo, Status, Mitarbeiter, Zeitraum.
- Drag & Drop verschiebt Termin inkl. Mehrtages-Spanne (Persistenz über API, Neuordnung durch Reload).
- Sperrlogik ab Startdatum: Nicht-Admins blockiert, Admins erlaubt.
- Mitarbeiterfilter reduziert alle Ansichten konsistent.
- Kalenderansicht im Dialog zeigt identisches Verhalten (nur Hülle).

## Entscheidungen
- Kalenderdaten werden über einen eigenen API-Endpunkt geladen, um Demo-Daten vollständig zu entfernen und Filterung serverseitig zu kapseln.
- Monat/Jahr verwenden denselben kompakten Terminbalken; bei Platzmangel wird im Jahr pro Tag deterministisch auf max. 2 Balken verdichtet.
- Wochenansicht zeigt detailreiche Panels; Popover bleibt für kompakte Ansichten zentral.

## Nicht umgesetzt (bewusst)
- Kartenansicht der Termine (benötigt Geokoordinaten, nicht im Schema vorhanden).
