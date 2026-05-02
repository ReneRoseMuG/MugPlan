# UC 02/26: Auftragspositionen verwalten

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Positionen eines Projektauftrags (StÃ¼ckliste) anlegen, bearbeiten und lÃ¶schen, um den Auftragsumfang und geplante Lieferungen zu dokumentieren.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).

### Ablauf â€” Position anlegen

1. Der Akteur Ã¶ffnet das Projekt und navigiert zum Bereich â€žAuftragspositionen".
2. Der Akteur wÃ¤hlt â€žPosition hinzufÃ¼gen" und erfasst Bezeichnung, Menge und ggf. Einheit.
3. Das System validiert Pflichtfelder und legt die Position mit Projektreferenz an.

### Ablauf â€” Position bearbeiten

1. Der Akteur wÃ¤hlt eine bestehende Position und Ã¤ndert Felder.
2. Das System speichert die Ã„nderung atomar.

### Ablauf â€” Position lÃ¶schen

1. Der Akteur entfernt eine Position.
2. Das System lÃ¶scht den Datensatz. Alle Positionen werden bei ProjektlÃ¶schung automatisch via Cascade entfernt (siehe UC 02/08).

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Rechte â†’ HTTP 403.
- Pflichtfeld fehlt â†’ HTTP 422.
- Technischer Fehler â†’ HTTP 500.

## Ergebnis

Die Auftragspositionen sind persistiert und dem Projekt zugeordnet. Sie dienen der internen Dokumentation des Auftragsumfangs und sind in der Projekt-Detailansicht sichtbar.

