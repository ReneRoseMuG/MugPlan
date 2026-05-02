# W-10 - Frontend-Cache-Strategie

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: App-weite Datenaktualisierung / Frontend-Architektur
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Die App nutzt eine langlebige React-Query-Cache-Strategie. Daten gelten unbegrenzt als frisch, bis Mutationen explizit passende Queries invalidieren.

## Optionen

- A) Status quo beibehalten und fehlende Invalidierungen weiterhin je Bug nachziehen
- B) Globale Cache-Strategie pauschal entschärfen, z. B. `staleTime: Infinity` entfernen oder stark reduzieren
- C) Gestufte Cache-Strategie einführen: zentrale Invalidierungshelfer pro Fachdomäne, volatile Listen gezielt frischer laden, statische Hilfsdaten weiter cachen
- D) Vorhandenen Änderungsmechanismus erweitern: `notifyMutationSuccess` / ChangeNotifications gezielt nutzen, um lokale Mutationen und Cross-Tab-Änderungen konsistenter zu behandeln

## Auswirkungen eines Eingriffs

Ein pauschaler Wechsel weg von `staleTime: Infinity` könnte viele Stale-Data-Fälle entschärfen, aber auch mehr Requests, Ladezustände und Flackern erzeugen. Besonders sensibel sind Kalender, Terminlisten, Reports, Stammdatenlisten und Standalone-Ansichten. Frischere Refetches dürfen Rollen und Berechtigungen nicht aufweichen; serverseitige Absicherung bleibt unverändert Pflicht.

## Schadenspotential

Mittel bis hoch. Der aktuelle Zustand kann dazu führen, dass Nutzer nach erfolgreichen Änderungen falsche oder alte Daten sehen. Ein zu grober globaler Cache-Umbau kann umgekehrt Performance, UX-Stabilität und bestehende Tests breit beeinflussen. Ein gestufter Eingriff reduziert dieses Risiko.

## Vorgeschlagene Maßnahme

Gestufte Cache-Strategie einführen: zentrale Invalidierungshelfer pro Fachdomäne, volatile Listen gezielt frischer laden und statische Hilfsdaten weiter cachen.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52
