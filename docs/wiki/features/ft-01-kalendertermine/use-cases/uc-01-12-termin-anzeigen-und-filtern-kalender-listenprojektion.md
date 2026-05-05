# UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Termine in Kalender- und Listenansichten anzeigen und über Filter so einschränken, dass das System konsistent genau die Termine liefert, die zum gewählten Zeitraum und zu den gewählten Kriterien passen. Die Projektion muss dabei die fachlich korrekten Beziehungen berücksichtigen, insbesondere dass jeder Termin einem Projekt zugeordnet ist und der Kunde indirekt über das Projekt bestimmt wird.

## Vorbedingungen

- Es existieren Termine in der Datenbank.
- Jeder Termin ist direkt einem Kunden zugeordnet (customer_id, NOT NULL).
- Termine können optional einem Projekt zugeordnet sein (project_id, NULLABLE).
- Es existiert mindestens ein API-Endpunkt, der Termine als Kalender-/Listenprojektion ausliefert.

## Ablauf

1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.
2. Das System lädt die Termine für einen gewählten Zeitraum, zum Beispiel für einen Tag, eine Woche oder einen frei wählbaren Zeitraum.
3. Der Akteur setzt optional Filterkriterien, zum Beispiel nach Projekt, nach Tour oder nach Mitarbeiter.
4. Das System lädt die Termine erneut und liefert dabei nur die Termine aus, die sowohl im Zeitraum liegen als auch alle gesetzten Filterkriterien erfüllen.
5. Der Akteur ändert Filterkriterien oder den Zeitraum, und das System aktualisiert die Ergebnisliste entsprechend.

## Alternativen

- Keine Treffer: Wenn im Zeitraum oder mit den gesetzten Filtern keine Termine existieren, liefert das System eine leere Liste und die Ansicht bleibt stabil bedienbar.
- Ungültiger Zeitraum: Wenn ein ungültiger Zeitraum übergeben wird, blockiert das System die Anfrage mit einer eindeutigen Fehlermeldung und liefert keine Teilantwort.
- Filteränderung während paralleler Änderungen: Wenn sich Termine während der Nutzung durch andere Benutzer ändern, muss das System beim nächsten Laden konsistent den aktuellen Stand ausliefern.

## Ergebnis

Die Ansicht zeigt die vom System gelieferten Termine konsistent und reproduzierbar an. Die Terminmenge entspricht dem gewählten Zeitraum und den gesetzten Filtern. Alle in der Projektion angezeigten Kunden- und Projektinformationen entsprechen den aktuellen Daten. Der Kundenbezug ergibt sich direkt aus customer_id am Termin; Projektinformationen werden zusätzlich angezeigt, sofern project_id gesetzt ist.
