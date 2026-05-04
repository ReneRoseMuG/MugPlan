# UC 13/10: Notizvorlage deaktivieren/aktivieren

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Den Aktivstatus einer bestehenden Notizvorlage ändern, ohne sie physisch zu löschen.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäÃŸ Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Der Akteur wählt die Funktion „Deaktivieren" oder „Aktivieren".
4. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher Prüfung setzt das System das Feld `is_active` entsprechend auf TRUE oder FALSE.
6. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System speichert die Ã„nderung persistent.
8. Das System aktualisiert die Vorlagenliste.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Ã„nderung.
- Versionskonflikt → HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Der Aktivstatus der Vorlage ist aktualisiert.
- Nur Vorlagen mit `is_active = true` erscheinen in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverändert.
- Es entsteht keine physische Löschung der Vorlage.

