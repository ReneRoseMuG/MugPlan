# UC 13/05: Notizen eines Projekts anzeigen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator, Leser

## Ziel

Alle einem Projekt eindeutig zugeordneten Notizen vollständig und konsistent einsehen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte für das Projekt.

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Projekts.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale Kärtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Die Darstellung enthält keine Bearbeitungselemente, sofern der Akteur ausschließlich Leserechte besitzt.


## Alternativen


- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.


## Ergebnis

- Alle projektbezogenen Notizen sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieses Projekts angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verändert keine persistierten Daten.
