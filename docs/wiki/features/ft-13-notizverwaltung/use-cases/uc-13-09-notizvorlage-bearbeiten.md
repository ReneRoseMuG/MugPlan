# UC 13/09: Notizvorlage bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notizvorlage ändern, ohne bereits erstellte Notizen rückwirkend zu beeinflussen.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäÃŸ Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Das System lädt die Vorlagendaten einschlieÃŸlich Versionsmerkmal.
4. Der Akteur ändert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.
5. Optional ändert der Administrator die Kennzeichnungsfarbe (`color`). Disponenten dürfen die Kennzeichnungsfarbe nicht setzen oder ändern.
6. Der Akteur bestätigt die Ã„nderungen.
7. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder,
    - Ãœbereinstimmung des Versionsmerkmals.
8. Stimmen die Versionsinformationen überein, speichert das System die Ã„nderungen.
9. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
10. Das System aktualisiert die Vorlagenliste gemäÃŸ Sortierlogik.

### Alternativabläufe

- Pflichtfelder ungültig → Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Ã„nderung.
- Versionskonflikt → HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Vorlage ist im Erfolgsfall aktualisiert.
- Bereits erstellte Notizen bleiben unverändert, einschlieÃŸlich ihrer übernommenen Kennzeichnungsfarbe.
- Parallele Ã„nderungen führen nicht zu stillen Ãœberschreibungen.
- Die Vorlage steht weiterhin gemäÃŸ `is_active` Status in Auswahllisten zur Verfügung.

