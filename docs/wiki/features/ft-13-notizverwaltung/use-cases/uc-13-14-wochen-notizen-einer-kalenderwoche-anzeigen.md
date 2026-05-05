# UC 13/14: Wochen-Notizen einer Kalenderwoche anzeigen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator, Leser

## Ziel

Alle einer Kalenderwoche zugeordneten Notizen vollständig und konsistent einsehen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte.
- Die Kalenderwoche ist durch `year_number` und `week_number` eindeutig adressiert.

## Ablauf

1. Der Akteur öffnet den Kalenderwochen-Kontext der gewünschten Woche.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt alle Notizen, die über `calendar_week_note` dieser Woche zugeordnet sind.
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

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.

## Alternativen


## Ergebnis

- Alle Wochen-Notizen dieser Kalenderwoche sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieser Woche angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verändert keine persistierten Daten.
