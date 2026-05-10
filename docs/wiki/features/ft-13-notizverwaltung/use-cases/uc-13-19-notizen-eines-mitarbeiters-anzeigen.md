# UC 13/19: Notizen eines Mitarbeiters anzeigen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator, Leser

## Ziel

Alle einem Mitarbeiter eindeutig zugeordneten Notizen vollständig und konsistent einsehen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte.

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Mitarbeiters.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt ausschließlich die Notizen, die eindeutig diesem Mitarbeiter zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale Kärtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Besitzt der Akteur ausschließlich Leserechte, werden keine Bearbeitungs- oder Löschfunktionen angezeigt.


## Alternativen


- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.


## Ergebnis

- Alle Mitarbeiter-Notizen sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieses Mitarbeiters angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verändert keine persistierten Daten.
