# UC 21/10: Projekt Ã¼bernehmen â€“ Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Projektinformationen im Kontext â€žNeuer Terminâ€œ Ã¼bernehmen und ein neues Projekt erzeugen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Kein Projekt ist im Terminformular ausgewÃ¤hlt.

## Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Projektdaten.
2. Das System legt ein neues Projekt an.
3. Das System setzt den Projekttitel auf das erkannte Modell oder den erkannten Projektnamen.
4. Das System setzt die Projektbeschreibung auf die extrahierte HTML-Artikelliste.
5. Das System verknÃ¼pft das neue Projekt mit dem Termin.
6. Das System verknÃ¼pft den zugehÃ¶rigen Kunden mit dem Projekt.
7. Das System speichert alle Ã„nderungen transaktional.

## Alternativen

- Der Akteur bricht vor BestÃ¤tigung ab â†’ Kein Projekt wird angelegt; das Terminformular bleibt unverÃ¤ndert.
- WÃ¤hrend der Anlage tritt ein Validierungs- oder Versionskonflikt auf â†’ Das System bricht ab; es werden keine TeilzustÃ¤nde gespeichert.

## Ergebnis

Ein neues Projekt ist persistent angelegt und korrekt mit Termin und Kunde verknÃ¼pft. Alle Referenzen sind konsistent. AnschlieÃŸend wird die Dokumentendatei als Projekt-Attachment verknÃ¼pft (siehe UC 21/17)

