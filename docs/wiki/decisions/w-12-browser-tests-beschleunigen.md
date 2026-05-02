# W-12 - Browser-Tests gezielt beschleunigen

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: Testarchitektur / Browser-E2E
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Der Browser-Pfad ist seriell und stützt sich auf Sicherheitsanker wie Datenbank-Guards, Reset-Locks und Storage-Isolation. Gleichzeitig ist die Laufzeit reset- und login-lastig.

## Vorgeschlagene Maßnahme

Zuerst bestehende Kandidatenpfade ausbauen, `beforeEach`-Suiten klassifizieren und kontrolliert auf `per-suite`-Piloten heben. Worker-Parallelisierung erst später prüfen.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52
