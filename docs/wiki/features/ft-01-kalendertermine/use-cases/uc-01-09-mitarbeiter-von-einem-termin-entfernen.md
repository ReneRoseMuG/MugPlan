# UC 01/09: Mitarbeiter von einem Termin entfernen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen einem Termin zugeordneten Mitarbeiter wieder entfernen, sodass der Mitarbeiter im Termin nicht mehr als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in den relevanten Sichten dieses Mitarbeiters nicht mehr auftaucht.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Dem Termin ist mindestens ein Mitarbeiter zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur entfernt im Bereich â€žZugeordnete Mitarbeiterâ€œ einen konkreten Mitarbeiter, zum Beispiel Ã¼ber eine Entfernen-Aktion am Listeneintrag.
3. Das System entfernt den Mitarbeiter aus der Mitarbeiterliste des Termins.
4. Das System speichert den Termin.
5. Das System aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Mitarbeiter nicht (mehr) zugeordnet: Wenn der Mitarbeiter zum Zeitpunkt des Speicherns nicht mehr zugeordnet ist, muss das System sicherstellen, dass kein Fehler durch inkonsistente ZwischenzustÃ¤nde entsteht, und der Termin bleibt konsistent gespeichert.

## Ergebnis

Der Mitarbeiter ist dem Termin nicht mehr zugeordnet und erscheint im Termin nicht mehr in der Liste der zugeordneten Mitarbeiter. Die entsprechende Zuordnung ist in der Join-Tabelle Terminâ€“Mitarbeiter entfernt.

Der Termin ist fÃ¼r diesen Mitarbeiter nicht mehr in der Mitarbeiter-Terminliste sichtbar. FÃ¼r andere weiterhin zugeordnete Mitarbeiter bleibt der Termin sichtbar. Der Termin bleibt in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

