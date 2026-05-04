# UC 21/07: Kundendaten übernehmen – Scope Neues Projekt

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Extrahierte Kundendaten im Kontext „Neues Projekt" übernehmen und einen Kunden korrekt anlegen oder aktualisieren.

## Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular „Neues Projekt" ist geöffnet.

## Ablauf

1. Der Akteur wählt die Ãœbernahme der Kundendaten.
2. Das System führt eine Duplikatsprüfung gemäÃŸ Kundenregeln durch.
3. Falls ein Duplikat gefunden wird (Kunde mit gleichen Identifikationskriterien existiert):
    - Das System aktualisiert fehlende Felder am bestehenden Kunden still (z. B. Telefon, E-Mail, Adressteile, sofern diese leer sind).
    - Das System verknüpft den aktualisierten Kunden mit dem Projekt.
    - Keine Benachrichtigung oder Bestätigungsdialog wird angezeigt.
4. Falls kein Duplikat gefunden wird:
    - Das System legt einen neuen Kunden mit den extrahierten Daten an.
    - Das System verknüpft den neu angelegten Kunden mit dem Projekt.
5. Das System aktualisiert das Projektformular, um die Kundenverknüpfung widerzuspiegeln.

## Alternativen

- Der Akteur bricht ab → Es erfolgt keine Kundenanlage und keine Ã„nderung der Projektzuordnung.
- Kunde existiert bereits und alle Felder sind bereits befüllt → Das System verknüpft den bestehenden Kunden still mit dem Projekt, ohne Aktualisierungen vorzunehmen.
- Validierung der Kundendaten schlägt fehl → Das System zeigt eine Fehlermeldung an; es werden keine Daten persistiert.

## Ergebnis

Der Projektentwurf ist mit einem Kunden verknüpft (neu angelegt oder aktualisiert). Es entstehen keine doppelten Kundeneinträge. Fehlende Kundenfelder wurden still aufgefüllt. Alle Referenzen sind konsistent.

