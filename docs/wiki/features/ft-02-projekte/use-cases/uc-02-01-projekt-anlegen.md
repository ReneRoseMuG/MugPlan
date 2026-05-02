# UC 02/01: Projekt anlegen

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Ein neues Projekt erfassen, einem aktiven Kunden zuordnen und mit einer Auftragsnummer versehen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Anlegerechte (Disponent oder Administrator).
- Der Ziel-Kunde existiert und ist aktiv.
- Optional: Projektbezogene Tags existieren gemäß FT (28), sofern sie bei der Anlage vergeben werden sollen.

## Ablauf

1. Der Akteur startet „Projekt anlegen".
2. Der Akteur wählt einen Kunden aus der Liste aktiver Kunden.
3. Der Akteur erfasst Titel, Auftragsnummer (Pflicht) und optional eine Beschreibung (Markdown).
4. Optional vergibt der Akteur projektbezogene Tags gemäß FT (28).
5. Das System validiert serverseitig:
    - Authentifizierung und Berechtigung,
    - Existenz und Aktivstatus des Kunden,
    - Auftragsnummer nicht leer.
6. Das System legt das Projekt an und persistiert Projektreferenz, Auftrag und Kundenzuordnung atomar.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401, keine Persistenz.
- Akteur ohne Anlegerechte → HTTP 403, keine Persistenz.
- Gewählter Kunde existiert nicht → HTTP 422, keine Persistenz.
- Gewählter Kunde ist inaktiv → HTTP 409, keine Persistenz.
- Auftragsnummer fehlt oder ist leer → HTTP 422, keine Persistenz.
- Abbruch durch den Akteur → keine Persistenz.
- Technischer Fehler → HTTP 500, keine Persistenz.

## Ergebnis

Das Projekt ist persistent angelegt, einem aktiven Kunden zugeordnet und mit einer Auftragsnummer versehen. Es kann für die Terminplanung genutzt werden.
