# UC 13/10: Notizvorlage deaktivieren/aktivieren

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Den Aktivstatus einer bestehenden Notizvorlage Ã¤ndern, ohne sie physisch zu lÃ¶schen.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Der Akteur wÃ¤hlt die Funktion â€žDeaktivieren" oder â€žAktivieren".
4. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher PrÃ¼fung setzt das System das Feld `is_active` entsprechend auf TRUE oder FALSE.
6. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System speichert die Ã„nderung persistent.
8. Das System aktualisiert die Vorlagenliste.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Der Aktivstatus der Vorlage ist aktualisiert.
- Nur Vorlagen mit `is_active = true` erscheinen in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverÃ¤ndert.
- Es entsteht keine physische LÃ¶schung der Vorlage.

