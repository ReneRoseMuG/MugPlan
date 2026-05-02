# UC 13/13: Wochen-Notiz anlegen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notiz erstellen und einer Kalenderwoche eindeutig zuordnen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Notizen (keine Leser-Rolle).
- Die Kalenderwoche ist durch `year_number` und `week_number` eindeutig adressierbar.

## Ablauf

1. Der Akteur Ã¶ffnet den Kalenderwochen-Kontext der gewÃ¼nschten Woche.
2. Der Akteur wÃ¤hlt die Funktion â€žNotiz hinzufÃ¼gen".
3. Das System Ã¶ffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschlieÃŸlich aktive Notizvorlagen zur Auswahl an.
5. Optional wÃ¤hlt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewÃ¤hlt, Ã¼bernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewÃ¤hlte Vorlage eine Kennzeichnungsfarbe (`color`), Ã¼bernimmt das System diese einmalig in die neue Notiz.
8. Der Akteur erfasst oder Ã¤ndert Titel und Beschreibung.
9. Der Akteur bestÃ¤tigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz auf `year_number` und `week_number` der Zielwoche
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz und den Eintrag in `calendar_week_note` persistent.
13. Das System aktualisiert die Notizliste im Kalenderwochen-Kontext gemÃ¤ÃŸ Sortierlogik.

### AlternativablÃ¤ufe

- Pflichtfelder fehlen â†’ Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Speicherung.
- Der Akteur besitzt Leser-Rolle â†’ HTTP 403, keine Speicherung.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine persistente Notiz entsteht.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist Ã¼ber `calendar_week_note` eindeutig der Kalenderwoche zugeordnet.
- Die Notiz erscheint in der Notizliste des Kalenderwochen-Kontexts.
- Es entstehen keine Referenzen oder Seiteneffekte in anderen DomÃ¤nen.

