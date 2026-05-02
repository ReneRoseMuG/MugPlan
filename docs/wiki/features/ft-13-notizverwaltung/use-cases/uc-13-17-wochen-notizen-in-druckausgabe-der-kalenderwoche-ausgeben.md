# UC 13/17: Wochen-Notizen in Druckausgabe der Kalenderwoche ausgeben

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator, Leser

## Ziel

Sicherstellen, dass alle einer Kalenderwoche zugeordneten Notizen in der Druckausgabe dieser Woche erscheinen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte.
- Die Druckausgabe fÃ¼r die Kalenderwoche wird ausgelÃ¶st.
- Die Woche ist durch `year_number` und `week_number` eindeutig adressiert.

## Ablauf

1. Der Akteur lÃ¶st die Druckausgabe fÃ¼r die gewÃ¼nschte Kalenderwoche aus.
2. Das System lÃ¤dt alle Druckdaten dieser Woche einschlieÃŸlich der Wochen-Notizen Ã¼ber `calendar_week_note`.
3. Das System sortiert die Wochen-Notizen deterministisch:
    - Angepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
4. Das System bettet die Wochen-Notizen an einer konsistenten Position in die Druckausgabe ein, orientiert am vorhandenen Aufbau der Wochendruckansicht.
5. Jede Notiz wird in der Druckausgabe mit Titel und Beschreibung dargestellt.
6. Das System erzeugt die Druckausgabe und stellt sie dem Akteur bereit.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Druckausgabe.
- Der Akteur besitzt keine Leserechte â†’ HTTP 403, keine Druckausgabe.
- Es existieren keine Wochen-Notizen â†’ Der Notizbereich in der Druckausgabe bleibt leer oder wird ausgeblendet; kein Fehler.
- Technischer Fehler â†’ HTTP 500, keine Druckausgabe.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Wochen-Notizen sind Bestandteil der Druckausgabe der Kalenderwoche.
- Die Darstellung ist konsistent mit den Ã¼brigen Wocheninformationen in der Druckansicht.
- Es entsteht kein neues, paralleles Drucksystem.
- Die Druckausgabe verÃ¤ndert keine persistierten Daten.

