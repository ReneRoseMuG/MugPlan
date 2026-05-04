# UC 21/14: Extraktion bei zwischenzeitlich gelöschtem Parent-Objekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass eine laufende Extraktion nicht zu inkonsistenten Referenzen führt, wenn das aufrufende Objekt zwischenzeitlich gelöscht wurde.

## Vorbedingungen

- Ein Extraktionsdialog ist geöffnet.
- Das zugrunde liegende Projekt- oder Terminformular wurde in einem anderen Browser oder durch einen anderen Akteur gelöscht oder geschlossen.

## Ablauf

1. Der Akteur bestätigt im Extraktionsdialog die Ãœbernahme der Daten.
2. Das System prüft vor Persistierung die Existenz des referenzierten Parent-Objekts.
3. Das System erkennt, dass das Parent-Objekt nicht mehr existiert.
4. Das System bricht den Vorgang ab.
5. Das System informiert den Akteur über den Konflikt.

## Alternativen

- Das Parent-Objekt existiert, aber wurde verändert → Das System prüft Versionsinformationen und behandelt einen Konflikt gemäÃŸ den jeweiligen Domänenregeln.

## Ergebnis

Es werden keine Daten mit ungültigen oder nicht existierenden Referenzen gespeichert. Die Systemkonsistenz bleibt gewahrt.

