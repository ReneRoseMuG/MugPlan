# UC 34/03: Gesetzliche Feiertage automatisch seeden

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)

## Akteur

System, Administrator

## Ziel

Gesetzliche Feiertage automatisch als gespeicherte Kalendermarker bereitstellen.

## Vorbedingungen

- Feiertagsberechnung für Deutschland ist verfügbar.
- Der Kalendermarker-Bestand ist beschreibbar.

## Ablauf

1. System startet den Feiertags-Seed über System-Seed oder nach dem ersten erfolgreichen Admin-Login des Tages.
2. System bestimmt den Zeitraum aktuelles Jahr bis aktuelles Jahr plus fünf Jahre.
3. System berechnet bundesweite und regionale gesetzliche Feiertage.
4. System bildet daraus Kalendermarker mit Quelle `automatic`.
5. System prüft je Marker, ob die fachliche Identität aus Datum, Typ, Quelle, Geltung und Bundesländern bereits existiert.
6. System ergänzt nur fehlende Marker und überschreibt vorhandene Marker mit identischer fachlicher Identität nicht.

## Alternativen

- Existiert ein Marker bereits, bleibt er unverändert.
- Läuft am selben Tag ein weiterer Admin-Login, wird kein erneuter Login-Seed ausgeführt.
- Nicht-Admin-Logins lösen keinen Feiertags-Seed aus.
- Schlägt der Seed technisch fehl, bleiben bereits vorhandene Marker unverändert nutzbar.

## Ergebnis

Gesetzliche Feiertage liegen als gespeicherte Kalendermarker vor. Editierte Werte bestehender Marker bleiben erhalten.
