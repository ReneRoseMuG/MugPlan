# UC 02/02: Projekt bearbeiten

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Projektdaten ändern, mit strikter Kundenkonsistenz und Schutz vor parallelen Überschreibungen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).
- Das Projekt besitzt ein Versionsmerkmal (Optimistic Locking).

## Ablauf

1. Der Akteur öffnet ein Projekt.
2. Der Akteur ändert zulässige Felder (Titel, Beschreibung, Aktiv-Status).
3. Der Akteur versucht, den Kunden des Projekts zu ändern.
    1. Das System prüft: Hat das Projekt mindestens einen Termin zugeordnet?
    2. Falls **JA:** Das System blockiert den Kundenwechsel mit Fehlermeldung. Der Kundenwert ist readonly.
    3. Falls **NEIN:** Der Akteur wählt einen neuen Kunden. Das System prüft Existenz und Aktivstatus des neuen Kunden. Das System speichert die Kundenänderung und aktualisiert den `customer_id`-Wert aller zugeordneten Termine kaskadierend.
4. Optional ändert der Akteur projektbezogene Tag-Zuordnungen gemäß FT (28).
5. Das System prüft das Versionsmerkmal serverseitig. Bei Übereinstimmung speichert das System die Änderungen und erhöht die Version.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte → HTTP 403.
- Projekt hat Termine → Kundenwechsel wird blockiert (HTTP 409 BUSINESS_CONFLICT).
- Neuer Kunde existiert nicht → HTTP 422.
- Neuer Kunde ist inaktiv → HTTP 409 INACTIVE_ENTITY_ASSIGNMENT.
- Versionskonflikt (Optimistic Locking) → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Abbruch → keine Änderung wird gespeichert.
- Technischer Fehler → HTTP 500, keine Änderung.

## Ergebnis

Das Projekt ist aktualisiert. Der Kundenwert bleibt stabil, solange das Projekt Termine besitzt. Bei einem zulässigen Kundenwechsel werden alle zugeordneten Termine auf den neuen Kunden aktualisiert. Alle abhängigen Ansichten sind konsistent.
