# UC 02/02: Projekt bearbeiten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)

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
4. Optional ändert der Akteur strukturierte Auftragspositionen, darunter das Artikellistenfeld **Sauna**.
    1. Wenn dadurch ein anderes Sauna-Modell gewählt wird und der Projektname nicht bereits dem neuen Modell entspricht, bietet der Projekt-Speichern-Review an, den Projektname anzupassen.
    2. Bestätigt der Akteur, setzt das System den Projektnamen auf den Namen des gewählten Sauna-Modells.
    3. Lehnt der Akteur ab, bleibt der bisherige Projektname unverändert.
5. Optional ändert der Akteur projektbezogene Tag-Zuordnungen gemäß FT (28).
6. Wenn das Projekt aus einem Doc-Extract-Draft stammt und der Akteur nachträglich Projektdaten, Artikelliste oder Projekttitel manuell geändert hat, zeigt der Projekt-Speichern-Review nur die dadurch erneut offenen Speicherentscheidungen.
7. Das System prüft das Versionsmerkmal serverseitig. Bei Übereinstimmung speichert das System die Änderungen und erhöht die Version.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Änderungsrechte → HTTP 403.
- Projekt hat Termine → Kundenwechsel wird blockiert (HTTP 409 BUSINESS_CONFLICT).
- Neuer Kunde existiert nicht → HTTP 422.
- Neuer Kunde ist inaktiv → HTTP 409 INACTIVE_ENTITY_ASSIGNMENT.
- Versionskonflikt (Optimistic Locking) → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Sauna-Modell wird nicht fachlich geändert → System zeigt keine Projektnamen-Rückfrage.
- Abbruch → keine Änderung wird gespeichert.
- Technischer Fehler → HTTP 500, keine Änderung.

## Ergebnis

Das Projekt ist aktualisiert. Der Kundenwert bleibt stabil, solange das Projekt Termine besitzt. Bei einem zulässigen Kundenwechsel werden alle zugeordneten Termine auf den neuen Kunden aktualisiert. Alle abhängigen Ansichten sind konsistent.
