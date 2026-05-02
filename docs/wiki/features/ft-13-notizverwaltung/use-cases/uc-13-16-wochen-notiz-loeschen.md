# UC 13/16: Wochen-Notiz lÃ¶schen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Wochen-Notiz vollstÃ¤ndig und konsistent entfernen.

## Vorbedingungen

- Die Notiz existiert und ist einer Kalenderwoche zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r Notizen (keine Leser-Rolle).
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Notizliste im Kalenderwochen-Kontext.
2. Der Akteur wÃ¤hlt eine bestehende Notiz aus.
3. Der Akteur wÃ¤hlt die Funktion â€žNotiz lÃ¶schen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt das LÃ¶schen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Ã¼bermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen Ã¼berein, lÃ¶scht das System die Notiz sowie den zugehÃ¶rigen Eintrag in `calendar_week_note` endgÃ¼ltig.
8. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext.

### AlternativablÃ¤ufe

- Der Akteur bricht die Sicherheitsabfrage ab â†’ Die Notiz bleibt unverÃ¤ndert bestehen.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt Leser-Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine LÃ¶schung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall vollstÃ¤ndig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizliste mehr.
- Parallele Aktionen fÃ¼hren nicht zu inkonsistenten ZustÃ¤nden.
- Die Konsistenz der `calendar_week_note`-Relation bleibt gewahrt.

