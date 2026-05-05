# UC 21/11: Extraktionsvorgang abbrechen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)

## Akteur

Disponent, Administrator

## Ziel

Einen gestarteten Extraktionsvorgang ohne Persistierung fachlicher Daten kontrolliert abbrechen.

## Vorbedingungen

- Ein Extraktionsdialog mit Vorschlagsdaten ist geöffnet.
- Es wurden noch keine fachlichen Stammdaten gespeichert.

## Ablauf

1. Der Akteur wählt im Extraktionsdialog die Funktion „Abbrechen“.
2. Das System verwirft alle extrahierten, nicht bestätigten Vorschlagsdaten.
3. Das System schließt den Extraktionsdialog.
4. Das System stellt den ursprünglichen Zustand des aufrufenden Formulars wieder her.

## Alternativen

- Der Akteur schließt den Dialog über die Fenstersteuerung → Das System behandelt dies identisch zum aktiven Abbruch.

## Ergebnis

Es wurden keine fachlichen Stammdaten angelegt oder verändert. Das System verbleibt im Zustand vor Beginn der Extraktion.
