# UC 13/13: Wochen-Notiz anlegen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notiz erstellen und einer Kalenderwoche eindeutig zuordnen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen (keine Leser-Rolle).
- Die Kalenderwoche ist durch `year_number` und `week_number` eindeutig adressierbar.

## Ablauf

1. Der Akteur öffnet den Kalenderwochen-Kontext der gewünschten Woche.
2. Der Akteur wählt die Funktion „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.
5. Optional wählt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese einmalig in die neue Notiz.
8. Der Akteur erfasst oder ändert Titel und Beschreibung.
9. Der Akteur bestätigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz auf `year_number` und `week_number` der Zielwoche
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz und den Eintrag in `calendar_week_note` persistent.
13. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext gemäß Sortierlogik.

### Alternativabläufe

- Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt Leser-Rolle → HTTP 403, keine Speicherung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine persistente Notiz entsteht.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist über `calendar_week_note` eindeutig der Kalenderwoche zugeordnet.
- Die Notiz erscheint in der Notizliste des Kalenderwochen-Kontexts.
- Es entstehen keine Referenzen oder Seiteneffekte in anderen Domänen.
