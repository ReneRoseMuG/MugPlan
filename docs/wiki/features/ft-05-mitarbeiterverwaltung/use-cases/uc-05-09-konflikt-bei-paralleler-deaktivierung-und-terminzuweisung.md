# UC 05/09: Konflikt bei paralleler Deaktivierung und Terminzuweisung

## Metadaten

- Feature: [FT (05): Mitarbeiterverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Verhindern, dass ein zwischenzeitlich deaktivierter Mitarbeiter einem Termin neu zugewiesen wird.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist aktiv.
- Ein Termin existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Der Mitarbeiter ist im Terminformular auswählbar.

## Ablauf

1. Akteur A öffnet das Terminformular.
2. System lädt aktive Mitarbeiter zur Auswahl.
3. Akteur A wählt den Mitarbeiter aus.
4. Vor dem Speichern deaktiviert Akteur B denselben Mitarbeiter.
5. System setzt `is_active = false`.
6. Akteur A speichert den Termin.
7. System prüft beim Speichern:
    - ob alle ausgewählten Mitarbeiter weiterhin aktiv sind.
8. System erkennt, dass der Mitarbeiter deaktiviert wurde.
9. System blockiert den Speichervorgang.

## Alternativen

- Deaktivierung erfolgt nach erfolgreicher Termin-Speicherung →
    
    Termin bleibt gültig, da Zuweisung vor Deaktivierung erfolgte.
    
- Akteur A lädt das Formular neu →
    
    Der deaktivierte Mitarbeiter erscheint nicht mehr in der Auswahl.
    
- Einer der Akteure bricht ab →
    
    Kein Konflikt.

## Ergebnis

- Ein deaktivierter Mitarbeiter kann nicht neu einem Termin zugewiesen werden.
- Das System antwortet mit HTTP 409 Conflict oder 400 Validation Error.
- Die Fehlermeldung weist auf den zwischenzeitlich deaktivierten Mitarbeiter hin.
- Es entsteht kein inkonsistenter Zustand.
- Bereits bestehende Terminzuweisungen bleiben unverändert.
- Historische Termine bleiben unverändert.
