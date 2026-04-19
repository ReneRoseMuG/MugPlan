# Test-Isolation-Default-Rollout

**Datum:** 2026-04-18
**Branch:** test-isolation-plan
**Status:** In Arbeit

---

## Zweck

Die neue Test-Isolationsstrategie wurde von der reinen Planung in einen kontrollierten technischen Rollout überführt. Ziel dieser Arbeitsphase war, Fingerprints, Canaries, Alt-vs-Neu-Diagnostik und eine feste Rollout-Registry nicht nur für Piloten bereitzustellen, sondern ausgewählte Klasse-B-Suiten nach erfolgreicher Validierung tatsächlich als `candidate-default` in den normalen Testpfad zu heben.

---

## Scope

Betroffen sind Test-Infrastruktur, Testdokumentation und ausgewählte Integration- und Browser-Suiten. Keine Produktionslogik, keine Migration, keine Build- oder Dependency-Änderung.

| Bereich | Dateien / Schwerpunkte |
|---|---|
| Prüfkonzept und Regeln | `docs/TEST_ISOLATION_REBUILD_PLAN.md`, `agents.md`, `CLAUDE.md`, `docs/TEST_MATRIX.md` |
| Fingerprints / Canaries / Diagnostik | `tests/helpers/testIsolationFingerprint.ts`, `tests/helpers/testIsolationCanaries.ts`, `tests/helpers/testIsolationDiagnostics.ts`, `tests/helpers/testIsolationExecution.ts`, `script/run-test-isolation-pilot.ts` |
| Storage-Isolation | `tests/helpers/testStorageIsolation.ts`, `tests/helpers/browserE2e.ts`, `playwright.config.ts` |
| Rollout-Registry | `tests/helpers/testIsolationRegistry.ts`, `tests/unit/helpers/testIsolationRegistry.test.ts`, `tests/unit/helpers/testIsolationExecution.test.ts` |
| Pilotierte und gehärtete Suiten | `tests/integration/server/projects.paged-list.integration.test.ts`, `tests/integration/server/customers.paged-list.integration.test.ts`, `tests/integration/server/appointments.attachments.integration.test.ts`, `tests/integration/server/admin.system-seed.integration.test.ts`, `tests/integration/server/tourWeekEmployees.integration.test.ts`, `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`, `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`, `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts`, `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` |

---

## Technische Entscheidungen

**Rollout nicht mehr nur über Env-Flags, sondern über feste Registry.**
`tests/helpers/testIsolationRegistry.ts` hält pro validierter Suite Klasse, Baseline, Storage-Profil, Reset-Scope, Canary-Profil, Pilotstatus und Rollout-Modus. Damit ist sichtbar, welche Suite nur pilotiert ist und welche ohne zusätzliche Flags im Standardpfad auf `candidate-baseline` wechseln darf.

**Nur validierte Klasse-B-Suiten dürfen `candidate-default` werden.**
Es wurde ausdrücklich nicht breit umgestellt. Suiten mit harter Isolation, Seed-Sonderbehandlung oder Storage-Risiko bleiben `pilot-only`, auch wenn ihr Pilot grün war.

**Browser-Reset muss den echten Suite-Pfad kennen.**
Für Browser-Suiten reicht ein generischer Reset-Helper nicht, sobald die Baseline über Registry-Auflösung gesteuert wird. `resetBrowserSuiteState(testPath)` verwendet deshalb den echten Dateipfad, damit `seeded`- und `core`-Defaults im normalen Playwright-Pfad korrekt gefingerprintet werden.

**Assertion-Härtung nur nach realem Canary-Befund.**
Es wurden keine pauschalen Test-Umbauten vorgenommen. `projects.paged-list`, `customers.paged-list`, `appointments-list.filter-scope` und `tourWeekEmployees` wurden nur dort verschärft, wo Canaries echte False-Positive-Risiken sichtbar gemacht haben.

---

## Validierte Pilot-Ergebnisse

| Suite | Ergebnis | Konsequenz |
|---|---|---|
| `tests/integration/server/projects.paged-list.integration.test.ts` | Canary-Fund im Paging, danach legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/integration/server/customers.paged-list.integration.test.ts` | Canary-Fund im Paging, danach legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/integration/server/appointments.list.sorting.integration.test.ts` | legacy/candidate/repeat/canary für Sortierung, Filter und `availableRange` grün | `candidate-default` |
| `tests/integration/server/projects.scope.mengenlogik.integration.test.ts` | legacy/candidate/repeat/canary für die Scope-Partition `all`/`withAppointments`/`upcoming`/`noAppointments` grün | `candidate-default` |
| `tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts` | legacy/candidate/repeat/canary über Kunden-, Mitarbeiter- und Projekt-Preview grün | `candidate-default` |
| `tests/integration/server/appointments.direct-projections.integration.test.ts` | legacy/candidate/repeat/canary für Direkttermin-Projektionen in Listen, Kalender und Delete-Pfad grün | `candidate-default` |
| `tests/integration/server/reports.auftragsliste.integration.test.ts` | legacy/candidate/repeat/canary für Kategorienfilter, Reklamationsausschluss und Storno-Fallback grün | `candidate-default` |
| `tests/integration/server/reports.vorlaufliste.integration.test.ts` | nach Idempotenz-Härtung für wiederholte Artikel- und Rollenfixtures legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts` | legacy/candidate/repeat/canary für Vollmenge und Listenparität grün | `candidate-default` |
| `tests/integration/server/appointments.tour-change-preview.integration.test.ts` | legacy/candidate/repeat/canary für KW-Wechsel und spätere Tourzuordnung grün | `candidate-default` |
| `tests/integration/server/masterData.visibility.by-role.test.ts` | legacy/candidate/repeat/canary für Rollenfilter und Aktiv-Defaults grün | `candidate-default` |
| `tests/integration/server/customers.visibility.by-role.test.ts` | nach Härtung gegen feste Dispatcher-Logins und testweise Zähler-Resets legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/integration/server/employees.visibility.by-role.test.ts` | nach Härtung gegen feste Dispatcher-Logins legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | Canary-Fund im Reset-/Mengenverhalten, danach legacy/candidate/repeat/canary grün | `candidate-default` |
| `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts` | legacy/candidate/repeat/canary direkt grün | `candidate-default` |
| `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen, keine relevante Canary-Angriffsfläche | `candidate-default` |
| `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen, keine relevante Canary-Angriffsfläche | `candidate-default` |
| `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/standalone-routing.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; von altem per-test-Reset auf echten Suite-Pfad im Browser-Reset umgestellt | `candidate-default` |
| `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/refresh-button.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts` | legacy/candidate/repeat/canary grün; echter Suite-Pfad im Browser-Reset nachgezogen | `candidate-default` |
| `tests/integration/server/appointments.attachments.integration.test.ts` | stabil im Storage-Sonderfall | bleibt `pilot-only` |
| `tests/integration/server/admin.system-seed.integration.test.ts` | `per-suite` ungeeignet, `per-test` stabil | bleibt `pilot-only` |
| `tests/integration/server/tourWeekEmployees.integration.test.ts` | Klasse A, Canary-Fund behoben, danach `per-test` stabil | bleibt `pilot-only` |
| `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` | stabil im Backup-Sonderfall | bleibt `pilot-only` |
| `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts` | komplexer Browser-Wochenplan unter `per-test` stabil | bleibt `pilot-only` |

---

## Hinweise zum Testen

- Unit:
  - `npm run test:unit -- tests/unit/helpers/testStorageIsolation.test.ts`
  - `npm run test:unit -- tests/unit/helpers/testIsolationDiagnostics.test.ts`
  - `npm run test:unit -- tests/unit/helpers/testIsolationCanaries.test.ts`
  - `npm run test:unit -- tests/unit/helpers/testIsolationExecution.test.ts tests/unit/helpers/testIsolationRegistry.test.ts`
- Integration:
  - `npm run test:integration -- tests/integration/bootstrap/testIsolationFingerprint.integration.test.ts --reporter=verbose`
  - `npm run test:integration -- tests/integration/bootstrap/testIsolationCanaries.integration.test.ts --reporter=verbose`
  - `npm run test:integration -- tests/integration/server/projects.paged-list.integration.test.ts --reporter=verbose`
  - `npm run test:integration -- tests/integration/server/customers.paged-list.integration.test.ts --reporter=verbose`
- Browser:
  - `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
  - `npm run test:e2e:browser -- tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- Pilot-Runner:
  - `npx tsx script/run-test-isolation-pilot.ts --project integration --suite tests/integration/server/customers.paged-list.integration.test.ts --baseline core --storage none --canary project-list-confusion`
  - `npx tsx script/run-test-isolation-pilot.ts --project browser --suite tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts --baseline seeded --storage none --canary project-list-confusion`

---

## Umgesetzte Änderungen

1. Prüfkonzept, Canary-Katalog, Fingerprint-Modell, Pilot-Matrix und verbindliche Regeln für neue Tests im Repo verankert.
2. Fingerprint-, Canary- und Diagnose-Helfer plus Pilot-Runner gebaut.
3. Browser-Storage-Isolation mit der isolierten Test-Storage-Strategie gleichgezogen.
4. Rollout-Registry eingeführt und `testIsolationExecution` auf Registry-basierte Default-Auflösung umgestellt.
5. Die ersten echten `candidate-default`-Suiten im normalen Testpfad freigeschaltet:
   - `projects.paged-list`
   - `customers.paged-list`
   - `appointments.list.sorting`
   - `projects.scope.mengenlogik`
   - `entity-appointments-preview.endpoint`
   - `appointments.direct-projections`
   - `reports.auftragsliste`
   - `reports.vorlaufliste`
   - `reports.vorlaufliste.printPreview`
   - `appointments.tour-change-preview`
   - `masterData.visibility.by-role`
   - `customers.visibility.by-role`
   - `employees.visibility.by-role`
   - `appointments-list.filter-scope`
   - `projects.filter-scopes`
   - `appointments-list.period-picker`
   - `settingsPage.navigation`
   - `settingsPage.controls`
   - `filter-state-persistence`
   - `reports.open-modes`
   - `standalone-routing`
   - `appointments-list.tour-employee`
   - `calendar-month-sheet.navigation`
   - `reports.ft26`
   - `reports.tourenplan`
   - `refresh-button`
   - `tag-selection-unification`
6. Mehrere echte Canary-Funde über gezielte Assertion-Härtung geschlossen, ohne Tests abzuschwächen.
7. Den Browser-Reset so verdrahtet, dass `seeded`-Default-Suiten im normalen Playwright-Lauf korrekt gefingerprintet werden.
8. Die letzte große Integrationswelle abgeschlossen und dabei per-suite Idempotenzlücken in `reports.vorlaufliste`, `customers.visibility.by-role` und `employees.visibility.by-role` gezielt geschlossen, statt die Suiten als Sonderfälle draußen zu lassen.

---

## Relevante Commits

- `82adc67` `Add test isolation pilot framework`
- `a294926` `Harden week plan pilot assertions`
- `f1965f6` `Roll out test isolation defaults`
- `2c40207` `Expand test isolation default rollout`

---

## Bekannte Einschränkungen

- Klasse-A- und Klasse-S-Suiten bleiben bewusst konservativ und sind noch nicht breit umgestellt.
- Die anschlussfähigen Klasse-B-Integrationssuiten sind jetzt weitgehend ausgerollt; offen bleiben im Wesentlichen nur die bewusst konservativen `pilot-only`-Sonderfälle und der canary-inkompatible Empty-State-Browserfall.
- Die Browser-Default-Auflösung ist bislang nur für die bereits freigegebenen Suiten explizit über echte Dateipfade verdrahtet; weitere Browser-Kandidaten brauchen denselben Nachweis.
- `tests/e2e-browser/list-empty-states-and-filter-messages.browser.e2e.spec.ts` bleibt vorerst außerhalb des Default-Rollouts, weil der `project-list-confusion`-Canary die bewusst leeren Ausgangsmengen fachlich bricht und die Suite im aktuellen Zuschnitt daher kein sauberer Klasse-B-Canary-Kandidat ist.
- `npm run typecheck` hatte in dieser Session weiterhin einen bestehenden, nicht im Auftrag behobenen Fehler in `client/src/components/MonitoringPage.tsx` wegen einer ungenutzten Funktion.
- Ein voller Audit und voller Testlauf über das gesamte Repository wurde in dieser Arbeitsphase nicht als Serien-Report abgeschlossen; geprüft wurden gezielte Infrastruktur-, Pilot- und Default-Rollout-Läufe.
---

## Nachtrag 2026-04-19

- Die letzte groÃŸe Restwelle der anschlussfÃ¤higen Klasse-B-Integrationssuiten ist abgeschlossen und dokumentiert.
- Der Rollout-Stand ist damit fachlich konsolidiert: `candidate-default` deckt jetzt den breit anschlussfÃ¤higen Integrations- und Browser-Bestand ab; offen bleiben nur noch bewusst konservative SonderfÃ¤lle und der bekannte canary-inkompatible Empty-State-Browserfall.
- Als nÃ¤chster Schritt wurde ein vollstÃ¤ndiger Audit- und Test-Report Ã¼ber das gesamte Repository angefordert und wird anschlieÃŸend seriell ausgefÃ¼hrt.
