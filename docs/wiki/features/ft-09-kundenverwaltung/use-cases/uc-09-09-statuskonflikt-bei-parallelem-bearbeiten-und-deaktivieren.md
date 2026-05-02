# UC 09/09: Statuskonflikt bei parallelem Bearbeiten und Deaktivieren

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass eine Kundenbearbeitung nicht erfolgreich gespeichert werden kann, wenn der Kunde zwischenzeitlich deaktiviert wurde.

## Vorbedingungen

- Ein Kunde existiert und ist aktiv (`is_active = true`).
- Zwei Akteure sind gleichzeitig authentifiziert.
- Akteur A besitzt Bearbeitungsrechte (Disponent oder Administrator).
- Akteur B besitzt Administratorrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

## Ablauf

1. Akteur A Ã¶ffnet die Kundendetailansicht und beginnt mit der Bearbeitung.
2. Akteur B Ã¶ffnet denselben Kunden.
3. Akteur B lÃ¶st â€žDeaktivierenâ€œ aus.
4. Das System prÃ¼ft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert die Ã„nderung und erhÃ¶ht die Versionskennung.
6. Akteur A speichert nun seine Ã„nderungen mit veralteter Versionskennung.
7. Das System prÃ¼ft:
    - Versionskennung,
    - aktuellen Status (`is_active`).
8. Das System erkennt den Konflikt.
9. Das System blockiert den Speichervorgang mit 409.
10. Das System fordert Akteur A zum Neuladen auf.

## Alternativen

- Akteur A lÃ¤dt vor dem Speichern neu â†’ das System zeigt den Kunden als deaktiviert an; Bearbeitung ist nur eingeschrÃ¤nkt mÃ¶glich oder blockiert.
- Akteur B bricht die Deaktivierung ab â†’ kein Konflikt.
- Technischer Fehler â†’ System antwortet mit 500.

## Ergebnis

- Ein deaktivierter Kunde kann nicht unbemerkt durch parallele Bearbeitung wieder verÃ¤ndert werden.
- Es entstehen keine inkonsistenten ZustÃ¤nde zwischen Aktiv-Status und Stammdaten.
- Optimistic Locking wird auch bei StatusÃ¤nderungen konsequent durchgesetzt.

