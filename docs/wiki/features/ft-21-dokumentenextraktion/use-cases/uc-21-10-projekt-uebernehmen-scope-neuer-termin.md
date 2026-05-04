# UC 21/10: Projekt übernehmen – Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext „Neuer Termin“ übernehmen und ein neues Projekt erzeugen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Kein Projekt ist im Terminformular ausgewählt.

## Ablauf

1. Der Akteur wählt die Ãœbernahme der Projektdaten.
2. Das System legt ein neues Projekt an.
3. Das System setzt den Projekttitel auf das erkannte Modell oder den erkannten Projektnamen.
4. Das System setzt die Projektbeschreibung auf die extrahierte HTML-Artikelliste.
5. Das System verknüpft das neue Projekt mit dem Termin.
6. Das System verknüpft den zugehörigen Kunden mit dem Projekt.
7. Das System speichert alle Ã„nderungen transaktional.

## Alternativen

- Der Akteur bricht vor Bestätigung ab → Kein Projekt wird angelegt; das Terminformular bleibt unverändert.
- Während der Anlage tritt ein Validierungs- oder Versionskonflikt auf → Das System bricht ab; es werden keine Teilzustände gespeichert.

## Ergebnis

Ein neues Projekt ist persistent angelegt und korrekt mit Termin und Kunde verknüpft. Alle Referenzen sind konsistent. AnschlieÃŸend wird die Dokumentendatei als Projekt-Attachment verknüpft (siehe UC 21/17)

