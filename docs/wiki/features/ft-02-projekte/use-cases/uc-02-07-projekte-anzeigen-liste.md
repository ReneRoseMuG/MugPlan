# UC 02/07: Projekte anzeigen (Liste)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)

## Akteur

Administrator, Disponent, Leser

## Ziel

Eine für die tägliche Arbeit passende Projektliste einsehen und bei Bedarf filtern oder auf andere Grundmengen umschalten.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte gemäß seiner Rolle.

## Ablauf

1. Der Akteur öffnet die Projektübersicht.
2. Das System lädt standardmäßig die Grundmenge „Aktuelle Projekte" (mindestens ein Termin mit Startdatum ≥ heute), paginiert.
3. Jeder Listeneintrag zeigt: Titel, Kunde, Auftragsnummer, Anzahl Notizen, Anzahl Anhänge, nächstes Termindatum, Tags.
4. Der Akteur kann auf „Ohne Termine" umschalten. Das System lädt ausschließlich Projekte ohne Termine.
5. Zusätzliche Filter wirken immer nur auf die jeweils geladene Grundmenge:
    - Titelsuche (Substring, case-insensitiv)
    - Kundenname / Kundennummer
    - Auftragsnummer
    - Tag-Filter
    - Aktiv/Inaktiv-Status
6. Der Akteur blättert bei Bedarf durch Seiten (Paginierung).

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Leserechte → HTTP 403.
- Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.
- Filter ergibt keine Treffer → System zeigt eine leere Liste innerhalb der Grundmenge.

## Ergebnis

Der Akteur sieht die gewählte Grundmenge gefiltert und paginiert. Die Grundmengen „Aktuelle Projekte" und „Ohne Termine" sind disjunkt — es findet keine Vermischung statt. Es erfolgt keine fachliche Datenänderung.
