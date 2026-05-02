# UC 21/06: Dokumentextraktion im Formular â€žNeuer Terminâ€œ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars â€žNeuer Terminâ€œ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

## Vorbedingungen

- Das Formular â€žNeuer Terminâ€œ ist geÃ¶ffnet.
- Der Akteur besitzt die Berechtigung zur Terminanlage.
- Ein PDF-Dokument ist verfÃ¼gbar.

## Ablauf

1. Der Akteur lÃ¤dt ein PDF in den definierten Extraktionsbereich des Terminformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemÃ¤ÃŸ UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

## Alternativen

- Das Dokument ist nicht geeignet â†’ Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverÃ¤ndert.

## Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars â€žNeuer Terminâ€œ zur VerfÃ¼gung. Es wurden keine Termin- oder Projektdaten gespeichert.

