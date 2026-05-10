# UC 13/02: Notiz zu Kunde hinzufügen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notiz erstellen und eindeutig einem bestehenden Kunden zuordnen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Kundennotizen.
- Das System erzwingt eine eindeutige Parent-Zuordnung (Kunde).

## Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.
2. Der Akteur wählt die Funktion „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.
5. Optional wählt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese Kennzeichnungsfarbe einmalig in die neue Notiz.
8. Der Akteur erfasst oder ändert Titel und Beschreibung der Notiz.
9. Der Akteur bestätigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz ausschließlich auf den gewählten Kunden
    - Keine Projekt-Referenz
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz persistent.
13. Das System aktualisiert die Notizenliste in der Kundendetailansicht gemäß Sortierlogik.


## Alternativen


- Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler bei Speicherung → HTTP 500, keine persistente Notiz entsteht.


## Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist ausschließlich dem Kunden zugeordnet.
- Die Notiz erscheint in der Notizenliste des Kunden.
- Es entstehen keine zusätzlichen Referenzen oder Seiteneffekte in anderen Domänen.
