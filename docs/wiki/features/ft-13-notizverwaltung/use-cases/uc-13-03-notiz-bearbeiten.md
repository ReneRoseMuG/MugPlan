# UC 13/03: Notiz bearbeiten

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notiz Ã¤ndern, ohne parallele Ã„nderungen anderer Akteure still zu Ã¼berschreiben.

## Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Parent-Objekt zugeordnet (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur Ã¶ffnet die Notiz aus der Notizenliste des jeweiligen Parent-Kontexts.
2. Das System lÃ¤dt die vollstÃ¤ndigen Notizdaten einschlieÃŸlich des aktuellen Versionsmerkmals.
3. Der Akteur Ã¤ndert Titel und/oder Beschreibung der Notiz.
4. Ã„nderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestÃ¤tigt die Ã„nderungen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Ã¼bermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen Ã¼berein, speichert das System die Ã„nderungen.
8. Das System erhÃ¶ht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### AlternativablÃ¤ufe

- Pflichtfelder ungÃ¼ltig â†’ Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Speicherung.
- Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geÃ¤ndert oder gelÃ¶scht) â†’ Das System antwortet mit HTTP 409 Conflict, speichert keine Ã„nderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung wird gespeichert.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Die Notiz bleibt konsistent dem ursprÃ¼nglichen Parent-Objekt zugeordnet.
- Es entstehen keine inkonsistenten ZwischenzustÃ¤nde oder Lost Updates.

