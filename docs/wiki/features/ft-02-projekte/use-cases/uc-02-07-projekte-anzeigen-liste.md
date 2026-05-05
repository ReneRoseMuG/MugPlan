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
3. Jeder Listeneintrag zeigt: Titel, Kunde, Auftragsnummer, Anzahl Notizen, Anzahl Anhänge, nächste Termininformation, Tags.
4. Bei mehreren Terminen zeigt das System den nächsten Termin ab heute.
5. Der Akteur kann zwischen den Grundmengen `Alle`, `Geplante` und `Ohne Termin` umschalten.
6. Bei `Geplante` lädt das System Projekte mit mindestens einem aktuellen oder zukünftigen Termin. Bei `Ohne Termin` lädt das System ausschließlich Projekte ohne Termine.
7. Zusätzliche Filter wirken immer nur auf die jeweils geladene Grundmenge:
    - Titelsuche (Substring, case-insensitiv)
    - Kundenname / Kundennummer
    - Auftragsnummer
    - Tag-Filter
    - Artikellistenfilter nach Sauna-Produkten und Komponenten-Kategorien
    - Aktiv/Inaktiv-Status
8. Der Akteur kann die Spalte **Nächster Termin** sortieren. Projekte ohne nächsten Termin bleiben bei dieser Sortierung am Ende.
9. Der Akteur blättert bei Bedarf durch Seiten (Paginierung).

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Leserechte → HTTP 403.
- Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.
- Filter ergibt keine Treffer → System zeigt eine leere Liste innerhalb der Grundmenge.

## Ergebnis

Der Akteur sieht die gewählte Grundmenge gefiltert, sortiert und paginiert. Die Grundmengen sind fachlich getrennt; es erfolgt keine fachliche Datenänderung.
