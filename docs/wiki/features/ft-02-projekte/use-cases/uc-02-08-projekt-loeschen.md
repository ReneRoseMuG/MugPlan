# UC 02/08: Projekt löschen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)

## Akteur

Administrator, Disponent

## Ziel

Ein Projekt dauerhaft aus dem System entfernen, ohne fachliche Inkonsistenzen oder verwaiste Referenzen zu hinterlassen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte (Disponent oder Administrator).
- Dem Projekt sind **keine Termine zugeordnet** (zwingende Vorbedingung).
- Das Projekt besitzt ein Versionsmerkmal.

## Ablauf

1. Der Akteur öffnet das Projekt und wählt „Projekt löschen".
2. Das System prüft die Berechtigung des Akteurs.
3. Das System prüft, ob dem Projekt Termine zugeordnet sind.
    1. Falls **JA:** Das System blockiert die Löschung mit HTTP 409 BUSINESS_CONFLICT. Das Projekt bleibt vollständig erhalten.
    2. Falls **NEIN:** Fortfahren mit Schritt 4.
4. Das System setzt eine atomare Versionsverriegelung (write-lock) auf dem Projekt-Datensatz mit dem erwarteten Versionsmerkmal.
5. Das System führt innerhalb einer Transaktion durch:
    1. Alle projektbezogenen Tag-Zuordnungen werden entfernt.
    2. Alle projektbezogenen Notizen und deren Relationen werden physisch gelöscht (Cascade).
    3. Alle Anhang-Datensätze des Projekts werden entfernt (physische Dateien verbleiben im Upload-Verzeichnis).
    4. Alle Auftragspositionen (`project_order_items`) werden gelöscht.
    5. Der Projekt-Datensatz wird gelöscht.
6. Das System bestätigt die erfolgreiche Löschung und aktualisiert alle Projektlisten.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Löschrechte → HTTP 403.
- Projekt besitzt Termine → HTTP 409 BUSINESS_CONFLICT, kein Teilzustand entsteht.
- Versionskonflikt (Optimistic Locking) → HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Race Condition (Termin wird parallel angelegt) → atomare Prüfung erkennt neue Referenz → HTTP 409, Löschung wird abgebrochen.
- Technischer Fehler → HTTP 500, das Projekt bleibt vollständig erhalten, keine Teillöschung.

## Ergebnis

Das Projekt und alle zugeordneten Notizen sowie Auftragspositionen sind physisch gelöscht. Anhang-Datensätze sind entfernt; physische Dateien verbleiben im Upload-Verzeichnis. Es existieren keine verwaisten Referenzen. Alle Projektlisten sind aktualisiert.
