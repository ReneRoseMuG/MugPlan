# UC 02/07: Projekte anzeigen (Liste)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent, Leser

## Ziel

Eine fÃ¼r die tÃ¤gliche Arbeit passende Projektliste einsehen und bei Bedarf filtern oder auf andere Grundmengen umschalten.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemÃ¤ÃŸ seiner Rolle.

## Ablauf

1. Der Akteur Ã¶ffnet die ProjektÃ¼bersicht.
2. Das System lÃ¤dt standardmÃ¤ÃŸig die Grundmenge â€žAktuelle Projekte" (mindestens ein Termin mit Startdatum â‰¥ heute), paginiert.
3. Jeder Listeneintrag zeigt: Titel, Kunde, Auftragsnummer, Anzahl Notizen, Anzahl AnhÃ¤nge, nÃ¤chstes Termindatum, Tags.
4. Der Akteur kann auf â€žOhne Termine" umschalten. Das System lÃ¤dt ausschlieÃŸlich Projekte ohne Termine.
5. ZusÃ¤tzliche Filter wirken immer nur auf die jeweils geladene Grundmenge:
    - Titelsuche (Substring, case-insensitiv)
    - Kundenname / Kundennummer
    - Auftragsnummer
    - Tag-Filter
    - Aktiv/Inaktiv-Status
6. Der Akteur blÃ¤ttert bei Bedarf durch Seiten (Paginierung).

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne Leserechte â†’ HTTP 403.
- Keine Projekte in der gewÃ¤hlten Grundmenge â†’ System zeigt eine leere Liste.
- Filter ergibt keine Treffer â†’ System zeigt eine leere Liste innerhalb der Grundmenge.

## Ergebnis

Der Akteur sieht die gewÃ¤hlte Grundmenge gefiltert und paginiert. Die Grundmengen â€žAktuelle Projekte" und â€žOhne Termine" sind disjunkt â€” es findet keine Vermischung statt. Es erfolgt keine fachliche DatenÃ¤nderung.

