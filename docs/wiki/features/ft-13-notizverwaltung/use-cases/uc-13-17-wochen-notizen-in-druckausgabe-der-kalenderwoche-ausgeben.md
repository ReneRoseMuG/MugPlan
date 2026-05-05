# UC 13/17: Wochen-Notizen in Druckausgabe der Kalenderwoche ausgeben

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator, Leser

## Ziel

Sicherstellen, dass alle einer Kalenderwoche zugeordneten Notizen in der Druckausgabe dieser Woche erscheinen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte.
- Die Druckausgabe für die Kalenderwoche wird ausgelöst.
- Die Woche ist durch `year_number` und `week_number` eindeutig adressiert.

## Ablauf

1. Der Akteur löst die Druckausgabe für die gewünschte Kalenderwoche aus.
2. Das System lädt alle Druckdaten dieser Woche einschließlich der Wochen-Notizen über `calendar_week_note`.
3. Das System sortiert die Wochen-Notizen deterministisch:
    - Angepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
4. Das System bettet die Wochen-Notizen an einer konsistenten Position in die Druckausgabe ein, orientiert am vorhandenen Aufbau der Wochendruckansicht.
5. Jede Notiz wird in der Druckausgabe mit Titel und Beschreibung dargestellt.
6. Das System erzeugt die Druckausgabe und stellt sie dem Akteur bereit.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Druckausgabe.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Druckausgabe.
- Es existieren keine Wochen-Notizen → Der Notizbereich in der Druckausgabe bleibt leer oder wird ausgeblendet; kein Fehler.
- Technischer Fehler → HTTP 500, keine Druckausgabe.

## Alternativen


## Ergebnis

- Wochen-Notizen sind Bestandteil der Druckausgabe der Kalenderwoche.
- Die Darstellung ist konsistent mit den übrigen Wocheninformationen in der Druckansicht.
- Es entsteht kein neues, paralleles Drucksystem.
- Die Druckausgabe verändert keine persistierten Daten.
