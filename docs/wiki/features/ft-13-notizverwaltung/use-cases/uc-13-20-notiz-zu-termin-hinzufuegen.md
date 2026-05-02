# UC 13/20: Notiz zu Termin hinzufügen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notiz erstellen und eindeutig einem bestehenden Termin zuordnen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Der Termin ist nicht historisch (Startdatum liegt nicht in der Vergangenheit).
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen (Disponent oder Administrator).

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur navigiert zum Bereich „Notizen" und wählt „Notiz hinzufügen".
3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.
5. Optional wählt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese einmalig in die neue Notiz.
8. Der Akteur erfasst oder ändert Titel und Beschreibung der Notiz.
9. Der Akteur bestätigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System prüft, dass der Termin nicht historisch ist.
12. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz ausschließlich auf den Termin
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
13. Das System speichert die Notiz persistent.
14. Das System aktualisiert die Notizliste im Terminformular und in allen Terminkontexten gemäß Sortierlogik.

### Alternativabläufe

- Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle (Leser) → HTTP 403, keine Speicherung.
- Der Termin ist historisch → Das System blockiert die Aktion; Notizen an historischen Terminen können nicht angelegt werden.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler bei Speicherung → HTTP 500, keine persistente Notiz entsteht.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist ausschließlich dem Termin zugeordnet.
- Die Notiz erscheint in der Notizliste im Terminformular und in allen Terminkontexten (Kalenderansichten, Terminkarten, Previews).
- Es entstehen keine zusätzlichen Referenzen oder Seiteneffekte in anderen Domänen.
