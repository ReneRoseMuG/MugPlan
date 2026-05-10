# UC 13/18: Notiz zu Mitarbeiter hinzufügen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notiz erstellen und eindeutig einem bestehenden Mitarbeiter zuordnen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen (Disponent oder Administrator).

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Mitarbeiters.
2. Der Akteur wählt die Funktion „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.
5. Optional wählt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese einmalig in die neue Notiz.
8. Der Akteur erfasst oder ändert Titel und Beschreibung der Notiz.
9. Der Akteur bestätigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz ausschließlich auf den gewählten Mitarbeiter
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz persistent.
13. Das System aktualisiert die Notizliste in der Mitarbeiter-Detailansicht gemäß Sortierlogik.


## Alternativen


- Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle (Leser) → HTTP 403, keine Speicherung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler bei Speicherung → HTTP 500, keine persistente Notiz entsteht.


## Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist ausschließlich dem Mitarbeiter zugeordnet.
- Die Notiz erscheint in der Notizliste der Mitarbeiter-Detailansicht.
- Es entstehen keine zusätzlichen Referenzen oder Seiteneffekte in anderen Domänen.
