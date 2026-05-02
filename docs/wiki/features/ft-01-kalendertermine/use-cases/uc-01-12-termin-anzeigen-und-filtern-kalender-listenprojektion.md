# UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Termine in Kalender- und Listenansichten anzeigen und Ã¼ber Filter so einschrÃ¤nken, dass das System konsistent genau die Termine liefert, die zum gewÃ¤hlten Zeitraum und zu den gewÃ¤hlten Kriterien passen. Die Projektion muss dabei die fachlich korrekten Beziehungen berÃ¼cksichtigen, insbesondere dass jeder Termin einem Projekt zugeordnet ist und der Kunde indirekt Ã¼ber das Projekt bestimmt wird.

## Vorbedingungen

- Es existieren Termine in der Datenbank.
- Jeder Termin ist direkt einem Kunden zugeordnet (customer_id, NOT NULL).
- Termine kÃ¶nnen optional einem Projekt zugeordnet sein (project_id, NULLABLE).
- Es existiert mindestens ein API-Endpunkt, der Termine als Kalender-/Listenprojektion ausliefert.

## Ablauf

1. Der Akteur Ã¶ffnet eine Kalender- oder Terminlistenansicht.
2. Das System lÃ¤dt die Termine fÃ¼r einen gewÃ¤hlten Zeitraum, zum Beispiel fÃ¼r einen Tag, eine Woche oder einen frei wÃ¤hlbaren Zeitraum.
3. Der Akteur setzt optional Filterkriterien, zum Beispiel nach Projekt, nach Tour oder nach Mitarbeiter.
4. Das System lÃ¤dt die Termine erneut und liefert dabei nur die Termine aus, die sowohl im Zeitraum liegen als auch alle gesetzten Filterkriterien erfÃ¼llen.
5. Der Akteur Ã¤ndert Filterkriterien oder den Zeitraum, und das System aktualisiert die Ergebnisliste entsprechend.

## Alternativen

- Keine Treffer: Wenn im Zeitraum oder mit den gesetzten Filtern keine Termine existieren, liefert das System eine leere Liste und die Ansicht bleibt stabil bedienbar.
- UngÃ¼ltiger Zeitraum: Wenn ein ungÃ¼ltiger Zeitraum Ã¼bergeben wird, blockiert das System die Anfrage mit einer eindeutigen Fehlermeldung und liefert keine Teilantwort.
- FilterÃ¤nderung wÃ¤hrend paralleler Ã„nderungen: Wenn sich Termine wÃ¤hrend der Nutzung durch andere Benutzer Ã¤ndern, muss das System beim nÃ¤chsten Laden konsistent den aktuellen Stand ausliefern.

## Ergebnis

Die Ansicht zeigt die vom System gelieferten Termine konsistent und reproduzierbar an. Die Terminmenge entspricht dem gewÃ¤hlten Zeitraum und den gesetzten Filtern. Alle in der Projektion angezeigten Kunden- und Projektinformationen entsprechen den aktuellen Daten. Der Kundenbezug ergibt sich direkt aus customer_id am Termin; Projektinformationen werden zusÃ¤tzlich angezeigt, sofern project_id gesetzt ist.

