# UC 21/11: Extraktionsvorgang abbrechen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen gestarteten Extraktionsvorgang ohne Persistierung fachlicher Daten kontrolliert abbrechen.

## Vorbedingungen

- Ein Extraktionsdialog mit Vorschlagsdaten ist geÃ¶ffnet.
- Es wurden noch keine fachlichen Stammdaten gespeichert.

## Ablauf

1. Der Akteur wÃ¤hlt im Extraktionsdialog die Funktion â€žAbbrechenâ€œ.
2. Das System verwirft alle extrahierten, nicht bestÃ¤tigten Vorschlagsdaten.
3. Das System schlieÃŸt den Extraktionsdialog.
4. Das System stellt den ursprÃ¼nglichen Zustand des aufrufenden Formulars wieder her.

## Alternativen

- Der Akteur schlieÃŸt den Dialog Ã¼ber die Fenstersteuerung â†’ Das System behandelt dies identisch zum aktiven Abbruch.

## Ergebnis

Es wurden keine fachlichen Stammdaten angelegt oder verÃ¤ndert. Das System verbleibt im Zustand vor Beginn der Extraktion.

