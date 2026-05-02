# UC 21/08: Kundendaten Ã¼bernehmen â€“ Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext â€žNeuer Termin" Ã¼bernehmen und korrekt mit Termin und ggf. Projekt verknÃ¼pfen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular â€žNeuer Termin" ist geÃ¶ffnet.
- Kein Projekt ist im Terminformular ausgewÃ¤hlt.

## Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Kundendaten.
2. Das System fÃ¼hrt eine DuplikatsprÃ¼fung gemÃ¤ÃŸ Kundenregeln durch.
3. Falls ein Duplikat gefunden wird (Kunde mit gleichen Identifikationskriterien existiert):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Das System setzt den aktualisierten Kunden im Terminformular.
    - Keine Benachrichtigung oder BestÃ¤tigungsdialog wird angezeigt.
4. Falls kein Duplikat gefunden wird:
    - Das System legt einen neuen Kunden mit den extrahierten Daten an.
    - Das System setzt den neu angelegten Kunden im Terminformular.
5. Das System aktualisiert das Terminformular, um die KundenverknÃ¼pfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab â†’ Keine Kundenanlage, keine FormularÃ¤nderung.
- Kunde existiert bereits und alle Felder sind bereits befÃ¼llt â†’ Das System setzt den bestehenden Kunden still im Terminformular, ohne Aktualisierungen vorzunehmen.
- Validierung der Kundendaten schlÃ¤gt fehl â†’ Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Terminentwurf referenziert einen Kunden (neu angelegt oder aktualisiert). Es entstehen keine doppelten KundeneintrÃ¤ge. Fehlende Kundenfelder wurden still aufgefÃ¼llt. Es existieren keine verwaisten Referenzen.

