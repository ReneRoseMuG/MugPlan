# UC 02/03: Projekt anzeigen

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Alle fachlichen Informationen eines Projekts einsehen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemäß seiner Rolle.

## Ablauf

1. Der Akteur öffnet ein Projekt.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System zeigt Projektdaten (Titel, Beschreibung, Auftragsnummer, Aktiv-Status) und den zugeordneten Kunden mit seinen Stammdaten an.
4. Das System zeigt alle dem Projekt zugeordneten Tags an.
5. Das System zeigt die Notizenliste an, sortiert nach: angepinnte Notizen (`is_pinned = true`) zuerst, innerhalb beider Gruppen nach `updated_at` absteigend. Jede Notiz zeigt Titel, Inhalt (Richtext) und ggf. Kennzeichnungsfarbe (`color`).
6. Das System zeigt die Anhangsliste mit Metadaten (Originaldateiname, Dateigröße, MIME-Typ, Erstellungszeitpunkt) an.
7. Das System zeigt alle zugehörigen Termine an.

## Alternativen

- Projekt nicht vorhanden → HTTP 404.
- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Leserechte → HTTP 403.
- Projekt besitzt keine Tags → Tagbereich bleibt leer.
- Projekt besitzt keine Notizen → Notizliste ist leer.
- Projekt besitzt keine Anhänge → Anhangsliste ist leer.
- Projekt besitzt keine Termine → Terminliste ist leer.

## Ergebnis

Vollständiger Überblick über das Projekt. Alle projektbezogenen Informationen (Kunde, Tags, Notizen, Anhänge, Termine) werden konsistent angezeigt. Die Notizliste ist deterministisch sortiert. Es erfolgt keine fachliche Datenänderung.
