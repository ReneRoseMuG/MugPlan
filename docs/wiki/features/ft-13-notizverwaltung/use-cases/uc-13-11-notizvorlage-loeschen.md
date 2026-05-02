# UC 13/11: Notizvorlage lÃ¶schen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notizvorlage endgÃ¼ltig aus dem System entfernen, ohne bereits erstellte Notizen zu verÃ¤ndern.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Der Akteur wÃ¤hlt die Funktion â€žLÃ¶schen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt das LÃ¶schen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
7. Stimmen die Versionsinformationen Ã¼berein, lÃ¶scht das System die Vorlage endgÃ¼ltig aus der Persistenz.
8. Das System aktualisiert die Vorlagenliste.

### AlternativablÃ¤ufe

- Der Akteur bricht die Sicherheitsabfrage ab â†’ Die Vorlage bleibt unverÃ¤ndert bestehen.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine LÃ¶schung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Vorlage ist im Erfolgsfall vollstÃ¤ndig aus dem System entfernt.
- GelÃ¶schte Vorlagen erscheinen nicht mehr in der Vorlagenverwaltung und nicht in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverÃ¤ndert bestehen.
- Es entstehen keine verwaisten Referenzen oder Seiteneffekte in bestehenden Notizen.

