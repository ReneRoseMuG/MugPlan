# UC 13/08: Notizvorlage erstellen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine neue Notizvorlage anlegen, die bei der Erstellung von Notizen ausgewählt werden kann.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.

## Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt die Funktion „Vorlage hinzufügen".
3. Das System öffnet einen Editor zur Erfassung der Vorlagendaten.
4. Der Akteur erfasst mindestens Titel und vordefinierten Inhalt.
5. Optional legt der Akteur eine Sortierreihenfolge fest.
6. Optional legt der Administrator eine Kennzeichnungsfarbe (`color`) fest. Disponenten können die Kennzeichnungsfarbe nicht setzen oder ändern.
7. Der Akteur bestätigt die Eingabe.
8. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder.
9. Das System erstellt die Vorlage mit folgenden Initialwerten:
    - `is_active = true`,
    - Setzen von `created_at` und `updated_at`.
10. Das System speichert die Vorlage persistent.
11. Das System aktualisiert die Vorlagenliste gemäß definierter Sortierlogik.

### Alternativabläufe

- Pflichtfelder fehlen → Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Persistierung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Persistierung.
- Technischer Fehler → HTTP 500, keine Persistierung.
- Abbruch durch den Akteur → Keine Persistierung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Eine neue Notizvorlage existiert persistent.
- Die Vorlage ist aktiv (`is_active = true`) und erscheint in der Auswahlliste bei der Notizerstellung.
- Die Kennzeichnungsfarbe ist ausschließlich gesetzt, wenn sie durch einen Administrator definiert wurde.
- Es entstehen keine Seiteneffekte auf bereits bestehende Notizen.
