# UC 13/06: Notizen eines Kunden anzeigen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator, Leser

## Ziel

Alle einem Kunden eindeutig zugeordneten Notizen vollstÃ¤ndig und konsistent einsehen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte fÃ¼r den Kunden.

## Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Kunden.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System lÃ¤dt ausschlieÃŸlich die Notizen, die eindeutig diesem Kunden zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale KÃ¤rtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. EnthÃ¤lt der Akteur ausschlieÃŸlich Leserechte, werden keine Bearbeitungs- oder LÃ¶schfunktionen angezeigt.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte â†’ HTTP 403, keine Anzeige.
- Es existieren keine Notizen â†’ Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler â†’ HTTP 500, keine Anzeige.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Alle kundenspezifischen Notizen sind konsistent sichtbar.
- Es werden ausschlieÃŸlich Notizen dieses Kunden angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verÃ¤ndert keine persistierten Daten und hat keine Seiteneffekte auf Projektnotizen.

