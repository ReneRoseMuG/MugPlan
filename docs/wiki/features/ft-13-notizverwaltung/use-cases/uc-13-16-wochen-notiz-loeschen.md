# UC 13/16: Wochen-Notiz löschen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Wochen-Notiz vollständig und konsistent entfernen.

## Vorbedingungen

- Die Notiz existiert und ist einer Kalenderwoche zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte für Notizen (keine Leser-Rolle).
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Notizliste im Kalenderwochen-Kontext.
2. Der Akteur wählt eine bestehende Notiz aus.
3. Der Akteur wählt die Funktion „Notiz löschen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestätigt das Löschen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, löscht das System die Notiz sowie den zugehörigen Eintrag in `calendar_week_note` endgültig.
8. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext.

### Alternativabläufe

- Der Akteur bricht die Sicherheitsabfrage ab → Die Notiz bleibt unverändert bestehen.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt Leser-Rolle → HTTP 403, keine Löschung.
- Versionskonflikt → HTTP 409 Conflict, keine Löschung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Löschung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall vollständig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizliste mehr.
- Parallele Aktionen führen nicht zu inkonsistenten Zuständen.
- Die Konsistenz der `calendar_week_note`-Relation bleibt gewahrt.
