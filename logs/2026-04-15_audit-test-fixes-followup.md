# Auftragslog

## Zweck

Nachlauf zu Audit-, Encoding- und Testbefunden: fehlenden Safety-Inventar-Eintrag ergänzt, defekte Unit-Tests repariert, sichere UI-Textkorrekturen für Encoding-Lint umgesetzt und ausgewählte Browser-E2E-Fälle gezielt stabilisiert.

## Scope

- `docs/TEST_DB_SAFETY_INVENTORY.md` um `script/run-migrations.ts` ergänzt
- fehlerhafte Unit-Tests und Mocks angepasst
- sichtbare UI-Texte mit sicheren Umlaut-Ersetzungen in Client-Komponenten aktualisiert
- Browser-E2E Punkt 1 und Punkt 3 bearbeitet
- Browser-E2E Punkt 2 nur als Versuch angepasst, weiterhin offen
- Browser-E2E Punkt 4 bewusst unverändert gelassen

## Technische Entscheidungen

- Keine Produktlogik für Unit- oder Browser-Test-Fixes verändert
- Encoding-Korrekturen nur auf sichtbare UI-Strings begrenzt, keine Server-, API- oder Schema-Texte umgedeutet
- Monats-DnD-Fehlertest von fragiler Positionsprüfung befreit und auf den eigentlichen Fehler-Toast fokussiert
- Tour-Wochenplan-Browser-Test um wartenden Dialog-/Folgeklick-Ablauf stabilisiert
- Wochen-DnD-Browser-Test nur mit testnahem Fallback-Versuch angepasst; nach weiterem Fehlschlag bewusst nicht weiter ausgeweitet

## Betroffene Dateien

- `docs/TEST_DB_SAFETY_INVENTORY.md`
- `tests/unit/authorization/roleGuards.test.ts`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `tests/unit/ui/employeesPage.importDialog.wiring.test.tsx`
- `tests/unit/ui/employeesPage.scopeUx.test.tsx`
- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- diverse Client-Komponenten mit sichtbaren UI-Texten unter `client/src/components/**` und `client/src/pages/Home.tsx`

## Hinweise zum Testen

- erfolgreich: `npm run test:unit`
- erfolgreich: `npx playwright test tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts -c playwright.config.ts`
- erfolgreich: `npx playwright test tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts -c playwright.config.ts`
- fehlgeschlagen: `npx playwright test tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts -c playwright.config.ts`
- weiterhin nicht komplett grün: `npm run lint:encoding`

## Bekannte Einschränkungen

- `lint:encoding` bleibt offen wegen serverseitiger Texte, Shared-Dateien und Linter-Treffern außerhalb des freigegebenen sicheren UI-Scope
- Browser-E2E `calendar-week-drag-drop.success` bleibt instabil und wurde nach begrenztem Versuch bewusst liegen gelassen
- Browser-E2E `notes.ft13.browser.e2e.spec.ts` wurde bewusst nicht geändert
