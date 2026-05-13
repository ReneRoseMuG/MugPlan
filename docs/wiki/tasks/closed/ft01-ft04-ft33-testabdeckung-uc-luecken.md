# FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken schließen

Die priorisierten Use-Case-Lücken und relevanten Testlücken für FT-01, FT-04 und FT-33 sollen fachlich belastbar geschlossen werden. W-19 beschreibt bereits eine konkrete Reihenfolge: zuerst FT-04-Use-Cases vervollständigen, danach priorisierte FT-01-, FT-04- und FT-33-Testlücken prüfen und ergänzen. Damit ist der Punkt besser als Aufgabe denn als Decision aufgehoben.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Kalender/Touren/Abwesenheiten | Testabdeckung | 06.05.26 |

---

## Ziel

Die priorisierten Use-Case-Lücken und relevanten Testlücken für FT-01, FT-04 und FT-33 sollen fachlich belastbar geschlossen werden.

## Ausgangslage

W-19 beschreibt bereits eine konkrete Reihenfolge: zuerst FT-04-Use-Cases vervollständigen, danach priorisierte FT-01-, FT-04- und FT-33-Testlücken prüfen und ergänzen. Damit ist der Punkt besser als Aufgabe denn als Decision aufgehoben.

## Umfang

- Zur Aufgabe gehören die Ausarbeitung von UC 04/12, UC 04/13 und UC 04/14, die Ergänzung oder bewusste Einordnung von UC 04/03 sowie priorisierte Tests zu historischen Storno-Aktionen, Tour-Preview-Abbruch, 4-KW-Matrix und Abwesenheitsdarstellungen.
- Nicht Teil der Aufgabe ist die stillschweigende fachliche Umdeutung von Code-Spec-Widersprüchen. Solche Widersprüche müssen als eigene Decision oder Blocker behandelt werden.

## Umsetzungshinweise

- Rollenfälle müssen ausdrücklich mit Sichtbarkeit, erlaubter Aktion und serverseitiger Durchsetzung beschrieben oder getestet werden.
- Reine UI-Sichtbarkeit reicht nicht als Berechtigungsnachweis.
- FT-01 enthält bekannte Spannungen bei historischen Terminen und inaktiven Kunden.
- FT-33 muss Leser-Blockaden sowie Admin-/Disponent-Flows sauber abgrenzen.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 14.05.26
- Ergebnis: Die priorisierten FT-01-, FT-04- und FT-33-Testlücken wurden tests-only geschlossen. Storno ist rollenbezogen über API-Pfade abgesichert, die Tour-KW-Planung deckt Vier-KW-Matrix und Dialogabbruch ab, und Abwesenheiten sind browserseitig für Anzeige, Readonly-Pfade, Typwechsel und Tour-KW-Abzug geprüft.
- Verifikation: `npm run test:integration -- tests/integration/server/appointments.cancellation.integration.test.ts --reporter=verbose`; `npm run test:unit -- tests/unit/ui/tourManagement.versioning.test.tsx tests/unit/ui/tourWeekPlanningView.render.test.tsx --reporter=verbose`; `npm run test:e2e:browser -- tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts --project=chromium`.
- Rollen: `ADMIN` und `DISPATCHER` sind für zulässige Storno- und Planungsmutationen geprüft; `READER` wird serverseitig blockiert. Historische Storno-Aktionen bleiben für `DISPATCHER` gesperrt.
- Folgeaufgaben: Keine. Die inaktive-Kunden-Frage wurde nicht fachlich umgedeutet.

---

## Beziehungen

- Features: FT-01 Kalendertermine · FT-04 Tourenplanung · FT-33 Abwesenheiten
- Use Cases: UC 04/12 · UC 04/13 · UC 04/14 · Fehlender oder anders einzuordnender UC 04/03
- Entscheidungen: [W-08 - Storno historischer Termine](../../decisions/w-08-storno-historischer-termine.md) · [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md)
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../../projects/feature-testabdeckung-uc-luecken.md)
- Journal: [14.05.26 - P02: Feature-Testabdeckung und UC-Lücken abgeschlossen](../../journal/14-05-26-p02-feature-testabdeckung-uc-luecken-abgeschlossen.md)
