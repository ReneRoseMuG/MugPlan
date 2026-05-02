# UC 34/06: Unberechtigte Marker-Pflege blockieren

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

Disponent, Leser

## Ziel

Verhindern, dass nicht berechtigte Rollen Kalendermarker oder globale Marker-Settings verÃ¤ndern.

## Vorbedingungen

- Akteur ist angemeldet.
- Akteur besitzt nicht die Rolle Administrator.

## Ablauf

1. Akteur ruft einen Admin-Pflegepfad fÃ¼r Kalendermarker direkt auf.
2. System prÃ¼ft die Rolle serverseitig.
3. System lehnt die Mutation ab.
4. Akteur ruft den Schreibpfad fÃ¼r den globalen Visualisierungsstil direkt auf.
5. System lehnt auch diese Ã„nderung serverseitig ab.

## Alternativen

- Akteur liest aktive Marker Ã¼ber den Kalenderpfad.
- Diese Leseoperation ist erlaubt, sofern die Rolle Kalenderlesen darf.

## Ergebnis

Unberechtigte Rollen kÃ¶nnen Kalendermarker sehen, aber nicht pflegen und keine globale Marker-Darstellung Ã¤ndern.

