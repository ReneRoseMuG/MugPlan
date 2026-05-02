# UC 02/02: Projekt bearbeiten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Projektdaten Ã¤ndern, mit strikter Kundenkonsistenz und Schutz vor parallelen Ãœberschreibungen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- Das Projekt besitzt ein Versionsmerkmal (Optimistic Locking).

## Ablauf

1. Der Akteur Ã¶ffnet ein Projekt.
2. Der Akteur Ã¤ndert zulÃ¤ssige Felder (Titel, Beschreibung, Aktiv-Status).
3. Der Akteur versucht, den Kunden des Projekts zu Ã¤ndern.
    1. Das System prÃ¼ft: Hat das Projekt mindestens einen Termin zugeordnet?
    2. Falls **JA:** Das System blockiert den Kundenwechsel mit Fehlermeldung. Der Kundenwert ist readonly.
    3. Falls **NEIN:** Der Akteur wÃ¤hlt einen neuen Kunden. Das System prÃ¼ft Existenz und Aktivstatus des neuen Kunden. Das System speichert die KundenÃ¤nderung und aktualisiert den `customer_id`-Wert aller zugeordneten Termine kaskadierend.
4. Optional Ã¤ndert der Akteur projektbezogene Tag-Zuordnungen gemÃ¤ÃŸ FT (28).
5. Das System prÃ¼ft das Versionsmerkmal serverseitig. Bei Ãœbereinstimmung speichert das System die Ã„nderungen und erhÃ¶ht die Version.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Ã„nderungsrechte â†’ HTTP 403.
- Projekt hat Termine â†’ Kundenwechsel wird blockiert (HTTP 409 BUSINESS_CONFLICT).
- Neuer Kunde existiert nicht â†’ HTTP 422.
- Neuer Kunde ist inaktiv â†’ HTTP 409 INACTIVE_ENTITY_ASSIGNMENT.
- Versionskonflikt (Optimistic Locking) â†’ HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Abbruch â†’ keine Ã„nderung wird gespeichert.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

## Ergebnis

Das Projekt ist aktualisiert. Der Kundenwert bleibt stabil, solange das Projekt Termine besitzt. Bei einem zulÃ¤ssigen Kundenwechsel werden alle zugeordneten Termine auf den neuen Kunden aktualisiert. Alle abhÃ¤ngigen Ansichten sind konsistent.

