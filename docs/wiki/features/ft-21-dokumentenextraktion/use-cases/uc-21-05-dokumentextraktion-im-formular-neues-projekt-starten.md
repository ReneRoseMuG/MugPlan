# UC 21/05: Dokumentextraktion im Formular „Neues Projekt“ starten

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../feature.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Innerhalb des Formulars „Neues Projekt“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

## Vorbedingungen

- Das Formular „Neues Projekt“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Projektanlage.
- Ein PDF-Dokument ist verfügbar.

## Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Formulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

## Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Projektformular bleibt unverändert.

## Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neues Projekt“ zur Verfügung. Es wurden keine Projektdaten gespeichert.
