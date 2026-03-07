# Browser-E2E fuer List Empty States und Filter-Messages

## Zweck

Browser-E2E-Nachweis fuer Empty-States und Filter-Messages in den Auflistungen Kunden, Projekte, Mitarbeiter, Teams, Touren und Termine.

## Scope

Umgesetzt wurden:

- neue Browser-E2E-Suite fuer Empty-/Filter-Messages
- zentraler Team-Fixture-Helper fuer testseitige Datenerzeugung
- Pflege der Test-Matrix

Bereits bestehende Empty-State-Produktivarbeit blieb Bestandteil desselben Arbeitsstands, wurde fuer diese Task aber nicht funktional erweitert.

## Technische Entscheidungen

- Browser-E2E unter `tests/e2e-browser/`, weil echte Sichtbarkeitsassertions und View-Wechsel gefordert waren.
- Reset-Standard pro Testfall:
  - `resetTestDataFactoryState()`
  - `await resetDatabase()`
- Testdaten ausschliesslich ueber zentrale Fixture-Helper.
- Abdeckung gegen den realen Repo-Stand:
  - Kunden/Projekte/Mitarbeiter: Board + Tabelle
  - Teams/Touren: nur Board
  - Termine: nur Tabelle
- Filtertests nur fuer Listen mit realer Filter-UI:
  - Kunden
  - Projekte
  - Mitarbeiter
  - Termine

## Betroffene Dateien

- `tests/e2e-browser/list-empty-states-and-filter-messages.browser.e2e.spec.ts`
- `tests/helpers/testDataFactory.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm run typecheck`
- `npm run test:e2e:browser -- tests/e2e-browser/list-empty-states-and-filter-messages.browser.e2e.spec.ts`

Ergebnis:

- 16/16 Browser-E2E-Tests gruen

## Bekannte Einschraenkungen

- Die Suite prueft bewusst nicht den `helpKey`-Fallback selbst, sondern nur Sichtbarkeit und Verschwinden der Messages.
- Teams und Touren besitzen aktuell keinen Tabellenmodus; Termine besitzen aktuell keinen Board-Modus. Die Suite testet deshalb nur vorhandene Views.
