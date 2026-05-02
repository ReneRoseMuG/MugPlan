# UC 13/09: Notizvorlage bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notizvorlage Ã¤ndern, ohne bereits erstellte Notizen rÃ¼ckwirkend zu beeinflussen.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Das System lÃ¤dt die Vorlagendaten einschlieÃŸlich Versionsmerkmal.
4. Der Akteur Ã¤ndert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.
5. Optional Ã¤ndert der Administrator die Kennzeichnungsfarbe (`color`). Disponenten dÃ¼rfen die Kennzeichnungsfarbe nicht setzen oder Ã¤ndern.
6. Der Akteur bestÃ¤tigt die Ã„nderungen.
7. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder,
    - Ãœbereinstimmung des Versionsmerkmals.
8. Stimmen die Versionsinformationen Ã¼berein, speichert das System die Ã„nderungen.
9. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
10. Das System aktualisiert die Vorlagenliste gemÃ¤ÃŸ Sortierlogik.

### AlternativablÃ¤ufe

- Pflichtfelder ungÃ¼ltig â†’ Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Vorlage ist im Erfolgsfall aktualisiert.
- Bereits erstellte Notizen bleiben unverÃ¤ndert, einschlieÃŸlich ihrer Ã¼bernommenen Kennzeichnungsfarbe.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Die Vorlage steht weiterhin gemÃ¤ÃŸ `is_active` Status in Auswahllisten zur VerfÃ¼gung.

