# UC 21/14: Extraktion bei zwischenzeitlich gelÃ¶schtem Parent-Objekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass eine laufende Extraktion nicht zu inkonsistenten Referenzen fÃ¼hrt, wenn das aufrufende Objekt zwischenzeitlich gelÃ¶scht wurde.

## Vorbedingungen

- Ein Extraktionsdialog ist geÃ¶ffnet.
- Das zugrunde liegende Projekt- oder Terminformular wurde in einem anderen Browser oder durch einen anderen Akteur gelÃ¶scht oder geschlossen.

## Ablauf

1. Der Akteur bestÃ¤tigt im Extraktionsdialog die Ãœbernahme der Daten.
2. Das System prÃ¼ft vor Persistierung die Existenz des referenzierten Parent-Objekts.
3. Das System erkennt, dass das Parent-Objekt nicht mehr existiert.
4. Das System bricht den Vorgang ab.
5. Das System informiert den Akteur Ã¼ber den Konflikt.

## Alternativen

- Das Parent-Objekt existiert, aber wurde verÃ¤ndert â†’ Das System prÃ¼ft Versionsinformationen und behandelt einen Konflikt gemÃ¤ÃŸ den jeweiligen DomÃ¤nenregeln.

## Ergebnis

Es werden keine Daten mit ungÃ¼ltigen oder nicht existierenden Referenzen gespeichert. Die Systemkonsistenz bleibt gewahrt.

