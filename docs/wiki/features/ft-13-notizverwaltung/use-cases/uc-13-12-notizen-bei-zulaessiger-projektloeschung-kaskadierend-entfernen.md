# UC 13/12: Notizen bei zulässiger Projektlöschung kaskadierend entfernen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass bei einer fachlich zulässigen Löschung eines Projekts alle eindeutig zugeordneten Projektnotizen konsistent und automatisch entfernt werden.

## Vorbedingungen

- Das Projekt existiert.
- Dem Projekt sind eine oder mehrere Notizen eindeutig zugeordnet.
- Mit dem Projekt ist **kein Termin verbunden**.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte für Projekte.
- Das Projekt verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Projekts.
2. Der Akteur wählt die Funktion „Löschen".
3. Das System prüft vor Anzeige der Sicherheitsabfrage, ob mit dem Projekt Termine verknüpft sind.
4. Sind keine Termine verknüpft, zeigt das System eine Sicherheitsabfrage an.
5. Der Akteur bestätigt die Löschung.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des Versionsmerkmals des Projekts,
    - weiterhin das Nichtvorhandensein verknüpfter Termine.
7. Stimmen alle Prüfungen, löscht das System das Projekt.
8. Das System entfernt automatisch alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
9. Das System stellt sicher, dass keine verwaisten Projektnotizen verbleiben.
10. Das System bestätigt den erfolgreichen Löschvorgang.

### Alternativabläufe

- Mit dem Projekt sind Termine verknüpft → HTTP 409 Conflict, keine Löschung.
- Der Akteur bricht die Sicherheitsabfrage ab → Keine Löschung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt → HTTP 409 Conflict, keine Löschung.
- Technischer Fehler → HTTP 500, keine Löschung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Projekt ist im Erfolgsfall vollständig gelöscht.
- Alle zugeordneten Projektnotizen sind vollständig entfernt.
- Kundennotizen bleiben unverändert bestehen.
- Es existieren keine verwaisten Notizen.
- Die referenzielle Integrität bleibt gewahrt.
