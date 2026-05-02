# UC 13/04: Notiz lÃ¶schen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notiz vollstÃ¤ndig und konsistent entfernen.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wÃ¤hlt eine bestehende Notiz aus.
3. Der Akteur wÃ¤hlt die Funktion â€žNotiz lÃ¶schen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt das LÃ¶schen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Ã¼bermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen Ã¼berein, lÃ¶scht das System die Notiz sowie die zugehÃ¶rige Parent-Relation endgÃ¼ltig.
8. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### AlternativablÃ¤ufe

- Der Akteur bricht die Sicherheitsabfrage ab â†’ Die Notiz bleibt unverÃ¤ndert bestehen.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt (Notiz wurde zwischenzeitlich geÃ¤ndert oder bereits gelÃ¶scht) â†’ Das System antwortet mit HTTP 409 Conflict, es erfolgt keine LÃ¶schung, der Akteur wird zum Neuladen aufgefordert.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung erfolgt.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall vollstÃ¤ndig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizenliste mehr.
- Parallele Aktionen fÃ¼hren nicht zu inkonsistenten ZustÃ¤nden oder unbeabsichtigten LÃ¶schungen.
- Die Konsistenz der Parent-Relation bleibt gewahrt.

