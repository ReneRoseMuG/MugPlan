# W-12 - Browser-Tests gezielt beschleunigen

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: Testarchitektur / Browser-E2E
- Entdeckt: 01.05.26
- Art: Architektur-Refaktoring

## Befund

Der Browser-Pfad ist seriell und stützt sich auf Sicherheitsanker wie Datenbank-Guards, Reset-Locks und Storage-Isolation. Gleichzeitig ist die Laufzeit reset- und login-lastig.

## Optionen

- A) Zuerst Playwright-Parallelisierung oder mehr Worker, Resets sonst weitgehend unverändert lassen
- B) Zuerst den bestehenden Kandidatenpfad ausbauen: Browser-Suiten sauber klassifizieren, `beforeEach`-Kandidaten auf `per-suite` heben, Fingerprint- und Canary-Nachweise verpflichtend halten und Storage-Fingerprints im Browser-Pfad ausdrücklich mitführen
- C) Zuerst Session- und Login-Kosten senken, z. B. pro Suite oder Rolle kontrolliert wiederverwendbare Auth-Setups auf derselben Baseline aufbauen
- D) Snapshot-, Restore- oder DB-Klon-Strategie für Browser-Tests einführen

## Auswirkungen eines Eingriffs

B hält die Sicherheitsarchitektur intakt und nutzt vorhandene Mechanismen statt eines neuen Parallelisierungsmodells. C kann danach zusätzliche Laufzeit sparen, solange Session-Artefakte strikt an dieselbe Suite-Baseline gebunden bleiben und keine Rollen- oder Zustandsdrift verdecken. A oder D versprechen potenziell größere Beschleunigung, erhöhen aber das Risiko, dass DB-Altlasten, Storage-Reste oder Cache- beziehungsweise Session-Leaks über Testgrenzen driften und nur noch schwer reproduzierbar sichtbar werden. Produktrollen ändern sich fachlich nicht; betroffen ist nur die Testinfrastruktur. Serverseitige Guards bleiben Pflicht und dürfen nicht durch UI- oder Session-Abkürzungen ersetzt werden.

## Schadenspotential

Hoch. Ein zu aggressiver Beschleunigungsschritt kann False Positives erzeugen, Sicherheitsgrenzen zwischen Tests aufweichen und Browser-Flakiness verstecken. Besonders sensibel sind Wochenplanung, Seed-nahe Flows, Upload- und Backup-Suiten sowie alle Pfade mit systemgesteuerten Tags, Touren oder globalen Kalenderzuständen.

## Vorgeschlagene Maßnahme

Zuerst bestehende Kandidatenpfade ausbauen, `beforeEach`-Suiten klassifizieren und kontrolliert auf `per-suite`-Piloten heben. Worker-Parallelisierung erst später prüfen.

## Konkreter nächster Schnitt

- `tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-form-week-planning.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-revenue-overview.browser.e2e.spec.ts`

Diese Suiten sind wegen `beforeEach`-Reset zuerst zu prüfen. `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` bleibt vorerst Klasse A mit `per-test`; `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` bleibt Storage-Sonderfall.

## Quelle
