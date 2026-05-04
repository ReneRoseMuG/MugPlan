# UC 21/08: Kundendaten übernehmen – Scope Neuer Termin

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext „Neuer Termin" übernehmen und korrekt mit Termin und ggf. Projekt verknüpfen.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular „Neuer Termin" ist geöffnet.
- Kein Projekt ist im Terminformular ausgewählt.

## Ablauf

1. Der Akteur wählt die Ãœbernahme der Kundendaten.
2. Das System führt eine Duplikatsprüfung gemäÃŸ Kundenregeln durch.
3. Falls ein Duplikat gefunden wird (Kunde mit gleichen Identifikationskriterien existiert):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Das System setzt den aktualisierten Kunden im Terminformular.
    - Keine Benachrichtigung oder Bestätigungsdialog wird angezeigt.
4. Falls kein Duplikat gefunden wird:
    - Das System legt einen neuen Kunden mit den extrahierten Daten an.
    - Das System setzt den neu angelegten Kunden im Terminformular.
5. Das System aktualisiert das Terminformular, um die Kundenverknüpfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab → Keine Kundenanlage, keine Formularänderung.
- Kunde existiert bereits und alle Felder sind bereits befüllt → Das System setzt den bestehenden Kunden still im Terminformular, ohne Aktualisierungen vorzunehmen.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Terminentwurf referenziert einen Kunden (neu angelegt oder aktualisiert). Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden still aufgefüllt. Es existieren keine verwaisten Referenzen.

