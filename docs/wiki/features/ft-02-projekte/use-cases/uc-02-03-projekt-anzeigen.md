# UC 02/03: Projekt anzeigen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Alle fachlichen Informationen eines Projekts einsehen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemÃ¤ÃŸ seiner Rolle.

## Ablauf

1. Der Akteur Ã¶ffnet ein Projekt.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System zeigt Projektdaten (Titel, Beschreibung, Auftragsnummer, Aktiv-Status) und den zugeordneten Kunden mit seinen Stammdaten an.
4. Das System zeigt alle dem Projekt zugeordneten Tags an.
5. Das System zeigt die Notizenliste an, sortiert nach: angepinnte Notizen (`is_pinned = true`) zuerst, innerhalb beider Gruppen nach `updated_at` absteigend. Jede Notiz zeigt Titel, Inhalt (Richtext) und ggf. Kennzeichnungsfarbe (`color`).
6. Das System zeigt die Anhangsliste mit Metadaten (Originaldateiname, DateigrÃ¶ÃŸe, MIME-Typ, Erstellungszeitpunkt) an.
7. Das System zeigt alle zugehÃ¶rigen Termine an.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Leserechte â†’ HTTP 403.
- Projekt besitzt keine Tags â†’ Tagbereich bleibt leer.
- Projekt besitzt keine Notizen â†’ Notizliste ist leer.
- Projekt besitzt keine AnhÃ¤nge â†’ Anhangsliste ist leer.
- Projekt besitzt keine Termine â†’ Terminliste ist leer.

## Ergebnis

VollstÃ¤ndiger Ãœberblick Ã¼ber das Projekt. Alle projektbezogenen Informationen (Kunde, Tags, Notizen, AnhÃ¤nge, Termine) werden konsistent angezeigt. Die Notizliste ist deterministisch sortiert. Es erfolgt keine fachliche DatenÃ¤nderung.

