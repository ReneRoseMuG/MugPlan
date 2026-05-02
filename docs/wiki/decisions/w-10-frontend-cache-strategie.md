# W-10 - Frontend-Cache-Strategie

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: App-weite Datenaktualisierung / Frontend-Architektur
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Die App nutzt eine langlebige React-Query-Cache-Strategie. Daten gelten unbegrenzt als frisch, bis Mutationen explizit passende Queries invalidieren.

## Vorgeschlagene Maßnahme

Gestufte Cache-Strategie einführen: zentrale Invalidierungshelfer pro Fachdomäne, volatile Listen gezielt frischer laden und statische Hilfsdaten weiter cachen.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52
