# Stryker Test Runner isoliert einführen

StrykerJS soll als bewusst manuell startbarer lokaler Mutation-Testlauf mit eigener Konfiguration, eigenem npm-Skript und kleinem Startbereich eingeführt werden. W-16 beschreibt keinen offenen Produktentscheid mehr, sondern einen eng begrenzten Infrastrukturauftrag: Mutation Testing isoliert einführen, ohne bestehende Audit-, Check-, Build- oder normale Testläufe zu verändern.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Testinfrastruktur | Infrastruktur | 06.05.26 |

---

## Ziel

StrykerJS soll als bewusst manuell startbarer lokaler Mutation-Testlauf mit eigener Konfiguration, eigenem npm-Skript und kleinem Startbereich eingeführt werden.

## Ausgangslage

W-16 beschreibt keinen offenen Produktentscheid mehr, sondern einen eng begrenzten Infrastrukturauftrag: Mutation Testing isoliert einführen, ohne bestehende Audit-, Check-, Build- oder normale Testläufe zu verändern.

## Umfang

- Zur Aufgabe gehören Analyse des genutzten Test-Runners, Auswahl eines kleinen ersten Mutationsbereichs, Stryker-Konfiguration, dediziertes manuelles Skript und optional eine klar benannte VS-Code-Task.
- Nicht Teil der Aufgabe ist die Kopplung an CI, Audit, Check, Build oder normale Test-Runs.

## Umsetzungshinweise

- Bestehende Testarchitektur semantisch unverändert lassen.
- Mutationsfläche klein halten.
- Keine produktive Fachlogik ändern.
- Neue Dependencies oder Tooling-Änderungen brauchen im konkreten Umsetzungsauftrag ausdrückliche Freigabe.

## Blocker und offene Fragen

- Konkreter erster Mutationsbereich ist vor Umsetzung anhand der aktuellen Teststruktur festzulegen.

---

## Beziehungen

- Features: —
- Entscheidungen: [W-16 - Stryker Test Runner](../decisions/w-16-stryker-test-runner.md)
