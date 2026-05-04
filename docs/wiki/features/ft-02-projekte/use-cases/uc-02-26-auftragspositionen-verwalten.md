# UC 02/26: Auftragspositionen verwalten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Positionen eines Projektauftrags (Stückliste) anlegen, bearbeiten und löschen, um den Auftragsumfang und geplante Lieferungen zu dokumentieren.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).

### Ablauf — Position anlegen

1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Auftragspositionen".
2. Der Akteur wählt „Position hinzufügen" und erfasst Bezeichnung, Menge und ggf. Einheit.
3. Das System validiert Pflichtfelder und legt die Position mit Projektreferenz an.

### Ablauf — Position bearbeiten

1. Der Akteur wählt eine bestehende Position und ändert Felder.
2. Das System speichert die Ã„nderung atomar.

### Ablauf — Position löschen

1. Der Akteur entfernt eine Position.
2. Das System löscht den Datensatz. Alle Positionen werden bei Projektlöschung automatisch via Cascade entfernt (siehe UC 02/08).

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Rechte → HTTP 403.
- Pflichtfeld fehlt → HTTP 422.
- Technischer Fehler → HTTP 500.

## Ergebnis

Die Auftragspositionen sind persistiert und dem Projekt zugeordnet. Sie dienen der internen Dokumentation des Auftragsumfangs und sind in der Projekt-Detailansicht sichtbar.

