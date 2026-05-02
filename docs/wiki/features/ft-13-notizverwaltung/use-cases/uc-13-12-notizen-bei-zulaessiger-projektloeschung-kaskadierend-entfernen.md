# UC 13/12: Notizen bei zulÃ¤ssiger ProjektlÃ¶schung kaskadierend entfernen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass bei einer fachlich zulÃ¤ssigen LÃ¶schung eines Projekts alle eindeutig zugeordneten Projektnotizen konsistent und automatisch entfernt werden.

## Vorbedingungen

- Das Projekt existiert.
- Dem Projekt sind eine oder mehrere Notizen eindeutig zugeordnet.
- Mit dem Projekt ist **kein Termin verbunden**.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r Projekte.
- Das Projekt verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Projekts.
2. Der Akteur wÃ¤hlt die Funktion â€žLÃ¶schen".
3. Das System prÃ¼ft vor Anzeige der Sicherheitsabfrage, ob mit dem Projekt Termine verknÃ¼pft sind.
4. Sind keine Termine verknÃ¼pft, zeigt das System eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt die LÃ¶schung.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals des Projekts,
    - weiterhin das Nichtvorhandensein verknÃ¼pfter Termine.
7. Stimmen alle PrÃ¼fungen, lÃ¶scht das System das Projekt.
8. Das System entfernt automatisch alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
9. Das System stellt sicher, dass keine verwaisten Projektnotizen verbleiben.
10. Das System bestÃ¤tigt den erfolgreichen LÃ¶schvorgang.

### AlternativablÃ¤ufe

- Mit dem Projekt sind Termine verknÃ¼pft â†’ HTTP 409 Conflict, keine LÃ¶schung.
- Der Akteur bricht die Sicherheitsabfrage ab â†’ Keine LÃ¶schung.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine LÃ¶schung.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Das Projekt ist im Erfolgsfall vollstÃ¤ndig gelÃ¶scht.
- Alle zugeordneten Projektnotizen sind vollstÃ¤ndig entfernt.
- Kundennotizen bleiben unverÃ¤ndert bestehen.
- Es existieren keine verwaisten Notizen.
- Die referenzielle IntegritÃ¤t bleibt gewahrt.

