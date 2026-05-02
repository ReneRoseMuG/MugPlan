# UC 21/06: Dokumentextraktion im Formular „Neuer Termin“ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../feature.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars „Neuer Termin“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

## Vorbedingungen

- Das Formular „Neuer Termin“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Terminanlage.
- Ein PDF-Dokument ist verfügbar.

## Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Terminformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

## Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverändert.

## Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neuer Termin“ zur Verfügung. Es wurden keine Termin- oder Projektdaten gespeichert.
