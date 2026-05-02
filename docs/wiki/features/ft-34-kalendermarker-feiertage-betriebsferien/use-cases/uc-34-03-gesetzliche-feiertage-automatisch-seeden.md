# UC 34/03: Gesetzliche Feiertage automatisch seeden

## Metadaten

- Feature: [FT (34): Kalendermarker, Feiertage und Betriebsferien](../ft-34-kalendermarker-feiertage-betriebsferien.md)
- Notion-Quelle: Nicht vorhanden
- Importstatus: Neu im Repo-Wiki erfasst

## Akteur

System, Administrator

## Ziel

Gesetzliche Feiertage automatisch als gespeicherte Kalendermarker bereitstellen.

## Vorbedingungen

- Feiertagsberechnung fÃ¼r Deutschland ist verfÃ¼gbar.
- Der Kalendermarker-Bestand ist beschreibbar.

## Ablauf

1. System startet den Feiertags-Seed Ã¼ber System-Seed oder nach dem ersten erfolgreichen Admin-Login des Tages.
2. System bestimmt den Zeitraum aktuelles Jahr bis aktuelles Jahr plus fÃ¼nf Jahre.
3. System berechnet bundesweite und regionale gesetzliche Feiertage.
4. System bildet daraus Kalendermarker mit Quelle `automatic`.
5. System prÃ¼ft je Marker, ob die fachliche IdentitÃ¤t aus Datum, Typ, Quelle, Geltung und BundeslÃ¤ndern bereits existiert.
6. System ergÃ¤nzt nur fehlende Marker und Ã¼berschreibt vorhandene Marker mit identischer fachlicher IdentitÃ¤t nicht.

## Alternativen

- Existiert ein Marker bereits, bleibt er unverÃ¤ndert.
- LÃ¤uft am selben Tag ein weiterer Admin-Login, wird kein erneuter Login-Seed ausgefÃ¼hrt.
- Nicht-Admin-Logins lÃ¶sen keinen Feiertags-Seed aus.
- SchlÃ¤gt der Seed technisch fehl, bleiben bereits vorhandene Marker unverÃ¤ndert nutzbar.

## Ergebnis

Gesetzliche Feiertage liegen als gespeicherte Kalendermarker vor. Editierte Werte bestehender Marker bleiben erhalten.

