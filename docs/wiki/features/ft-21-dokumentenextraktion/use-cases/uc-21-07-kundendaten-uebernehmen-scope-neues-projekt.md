# UC 21/07: Kundendaten Ã¼bernehmen â€“ Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext â€žNeues Projekt" Ã¼bernehmen und einen Kunden korrekt anlegen oder aktualisieren.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular â€žNeues Projekt" ist geÃ¶ffnet.

## Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Kundendaten.
2. Das System fÃ¼hrt eine DuplikatsprÃ¼fung gemÃ¤ÃŸ Kundenregeln durch.
3. Falls ein Duplikat gefunden wird (Kunde mit gleichen Identifikationskriterien existiert):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Das System verknÃ¼pft den aktualisierten Kunden mit dem Projekt.
    - Keine Benachrichtigung oder BestÃ¤tigungsdialog wird angezeigt.
4. Falls kein Duplikat gefunden wird:
    - Das System legt einen neuen Kunden mit den extrahierten Daten an.
    - Das System verknÃ¼pft den neu angelegten Kunden mit dem Projekt.
5. Das System aktualisiert das Projektformular, um die KundenverknÃ¼pfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab â†’ Es erfolgt keine Kundenanlage und keine Ã„nderung der Projektzuordnung.
- Kunde existiert bereits und alle Felder sind bereits befÃ¼llt â†’ Das System verknÃ¼pft den bestehenden Kunden still mit dem Projekt, ohne Aktualisierungen vorzunehmen.
- Validierung der Kundendaten schlÃ¤gt fehl â†’ Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Projektentwurf ist mit einem Kunden verknÃ¼pft (neu angelegt oder aktualisiert). Es entstehen keine doppelten KundeneintrÃ¤ge. Fehlende Kundenfelder wurden still aufgefÃ¼llt. Alle Referenzen sind konsistent.

