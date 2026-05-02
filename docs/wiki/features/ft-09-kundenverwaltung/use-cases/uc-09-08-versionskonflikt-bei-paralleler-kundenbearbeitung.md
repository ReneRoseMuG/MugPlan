# UC 09/08: Versionskonflikt bei paralleler Kundenbearbeitung

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Kunden keine stillen DatenÃ¼berschreibungen (Lost Updates) entstehen.

## Vorbedingungen

- Ein Kunde existiert.
- Zwei Akteure sind gleichzeitig authentifiziert.
- Beide Akteure haben Bearbeitungsrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

## Ablauf

1. Akteur A Ã¶ffnet die Kundendetailansicht.
2. Akteur B Ã¶ffnet dieselbe Kundendetailansicht.
3. Beide erhalten denselben Versionsstand (z. B. `version = 5`).
4. Akteur A Ã¤ndert Kundendaten und speichert.
5. Das System prÃ¼ft die Versionskennung.
6. Das System persistiert die Ã„nderung.
7. Das System erhÃ¶ht die Versionskennung auf `version = 6`.
8. Akteur B speichert nun seine Ã„nderungen mit veralteter Versionskennung (`version = 5`).
9. Das System prÃ¼ft die Versionskennung.
10. Das System erkennt die Abweichung.
11. Das System blockiert den Speichervorgang mit 409 (Konflikt).
12. Das System fordert Akteur B zum Neuladen auf.

## Alternativen

- Akteur B lÃ¤dt vor dem Speichern neu â†’ kein Konflikt.
- Akteur B bricht ab â†’ keine Ã„nderung.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

- Es kommt zu keinem stillen Ãœberschreiben von Kundendaten.
- Der zuletzt gespeicherte, valide Stand bleibt erhalten.
- Das System garantiert Optimistic Locking fÃ¼r KundenÃ¤nderungen.

