# UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass extrahierte Kundendaten im Kontext â€žNeuer Termin" korrekt mit einem bereits gesetzten Kunden abgestimmt werden.

## Vorbedingungen

- Das Formular â€žNeuer Termin" ist geÃ¶ffnet.
- Ein Kunde ist bereits im Terminformular ausgewÃ¤hlt.
- Ein Extraktionsvorschlag mit Kundendaten liegt vor.

## Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der extrahierten Kundendaten.
2. Das System fÃ¼hrt eine DuplikatsprÃ¼fung durch.
3. Falls die extrahierten Kundendaten zu dem bereits gesetzten Kunden matchen (gleiche Identifikationskriterien):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Der bereits gesettzte Kunde bleibt im Terminformular erhalten.
    - Keine Warnung oder BestÃ¤tigungsdialog wird angezeigt.
4. Falls die extrahierten Kundendaten nicht zu dem bereits gesetzten Kunden matchen:
    - Das System fÃ¼hrt eine erneute DuplikatsprÃ¼fung fÃ¼r die extrahierten Daten durch.
    - Wenn ein anderer existierender Kunde matcht: Das System aktualisiert fehlende Felder bei diesem Kunden still und ersetzt die Kundenreferenz im Terminformular still.
    - Wenn kein Duplikat matcht: Das System legt einen neuen Kunden an und ersetzt die Kundenreferenz im Terminformular still.
5. Das System aktualisiert das Terminformular.

## Alternativen

- Der Akteur bricht ab â†’ Die bestehende Kundenreferenz bleibt unverÃ¤ndert, keine neuen Kunden werden angelegt.
- Validierung der Kundendaten schlÃ¤gt fehl â†’ Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert und die bestehende Kundenreferenz bleibt unverÃ¤ndert.

## Ergebnis

Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es entstehen keine doppelten KundeneintrÃ¤ge. Fehlende Kundenfelder wurden still aufgefÃ¼llt. Es existieren keine stillen oder unerwarteten Ãœberschreibungen ohne explizite BestÃ¤tigung durch das System.

