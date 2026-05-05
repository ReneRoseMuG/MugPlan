# UC 01/13: Termin-Farbdarstellung ableiten

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Termine in Kalender- und Listenansichten mit einer konsistent abgeleiteten Farbe darstellen. Wenn ein Termin einer Tour zugeordnet ist, wird die Tourfarbe verwendet. Wenn keine Tour zugeordnet ist, wird eine definierte Standardfarbe verwendet. Diese Ableitung muss in allen Sichten identisch funktionieren und darf sich nicht zwischen Kalender, Listenprojektionen und Detailansichten widersprechen.

## Vorbedingungen

- Es existieren Termine in der Datenbank.
- Es existieren Touren mit definierter Farbe.
- Ein Termin kann einer Tour zugeordnet sein oder keine Tourzuordnung besitzen.
- Es existiert mindestens eine Sicht (Kalender oder Liste), die Termine farblich darstellt oder eine Farbe als Feld aus der Projektion bezieht.

## Ablauf

1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.
2. Das System lädt Termine als Projektion und stellt sie dar.
3. Für jeden Termin leitet das System die Darstellungsfarbe nach einer festen Regel ab.
    1. Wenn der Termin einer Tour zugeordnet ist, verwendet das System die Farbe dieser Tour.
    2. Wenn der Termin keiner Tour zugeordnet ist, verwendet das System eine definierte Standardfarbe.
4. Der Akteur weist einem Termin eine Tour zu oder entfernt die Tourzuweisung.
5. Das System aktualisiert die Darstellung, sodass sich die Farbe des Termins entsprechend der Regel sofort und konsistent ändert.

## Alternativen

- Tour ohne Farbe: Wenn eine Tour keine gültige Farbe besitzt, muss das System eine robuste Fallback-Regel anwenden, zum Beispiel die Standardfarbe, und darf keine fehlerhafte oder leere Darstellung erzeugen.
- Abbruch oder Blockade: Wenn eine Änderung (Tour setzen oder Tour entfernen) abgebrochen oder wegen Konflikt blockiert wird, darf sich die angezeigte Farbe nicht dauerhaft ändern, weil kein persistierter Zustand entstanden ist.

## Ergebnis

Jeder Termin wird in allen Sichten konsistent mit der korrekten Farbe dargestellt. Termine mit Tourzuordnung nutzen die Tourfarbe, Termine ohne Tourzuordnung nutzen die Standardfarbe. Nach Änderungen an der Tourzuordnung ist die Darstellung ohne Inkonsistenzen aktualisiert.
