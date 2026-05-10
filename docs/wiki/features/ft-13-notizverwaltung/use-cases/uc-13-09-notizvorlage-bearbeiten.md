# UC 13/09: Notizvorlage bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notizvorlage ändern, ohne bereits erstellte Notizen rückwirkend zu beeinflussen.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Das System lädt die Vorlagendaten einschließlich Versionsmerkmal.
4. Der Akteur ändert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.
5. Optional ändert der Administrator die Kennzeichnungsfarbe (`color`). Disponenten dürfen die Kennzeichnungsfarbe nicht setzen oder ändern.
6. Der Akteur bestätigt die Änderungen.
7. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder,
    - Übereinstimmung des Versionsmerkmals.
8. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.
9. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
10. Das System aktualisiert die Vorlagenliste gemäß Sortierlogik.


## Alternativen


- Pflichtfelder ungültig → Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.
- Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Änderung.


## Ergebnis

- Die Vorlage ist im Erfolgsfall aktualisiert.
- Bereits erstellte Notizen bleiben unverändert, einschließlich ihrer übernommenen Kennzeichnungsfarbe.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Die Vorlage steht weiterhin gemäß `is_active` Status in Auswahllisten zur Verfügung.
