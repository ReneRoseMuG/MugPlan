# UC 13/21: Notizen eines Termins anzeigen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator, Leser

## Ziel

Alle einem Termin eindeutig zugeordneten Notizen vollständig und konsistent einsehen.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte.

## Ablauf

1. Der Akteur öffnet einen Terminkontext (Terminformular, Kalenderansicht, Terminkarte oder Preview).
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt ausschließlich die Notizen, die eindeutig diesem Termin zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen kontextabhängig:
    - Im Terminformular als vollständige vertikale Kärtchenliste.
    - In Kalenderansichten, Terminkarten und Previews als kompakte Darstellung (z. B. Notiz-Counter oder Vorschau).
6. Jede Notiz zeigt im Vollkontext mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Besitzt der Akteur ausschließlich Leserechte oder ist der Termin historisch, werden keine Bearbeitungs- oder Löschfunktionen angezeigt.


## Alternativen


- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste oder einen Counter mit 0 ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.


## Ergebnis

- Alle Termin-Notizen sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieses Termins angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Darstellung passt sich dem jeweiligen Terminkontext an.
- Die Anzeige verändert keine persistierten Daten.
