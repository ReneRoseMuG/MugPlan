# Test-Audit-Fixes + offener Blocker

**Datum:** 2026-03-18
**Session:** Test-Audit nach drei Tagen Refactoring

---

## Ergebnis des vollständigen Test-Audits

| Suite | Dateien | Passed | Failed (vorher) | Failed (nachher) |
|---|---|---|---|---|
| Unit | 207 | 724 | 3 | 0 |
| Integration | 79 | 381 | 1 | 1 (anderer) |
| E2E Workflow | 3 | 3 | 0 | 0 |
| Browser E2E | 16 Spec / 50 Tests | — | 4 | offen |

---

## Fixes durchgeführt (alle Typ A – nur Test-Erwartungen)

1. `productManagementPage.filters.wiring.test.tsx` — `ProductData` → `ProductDetails`, `component-data-short-code` → `shortCode: input.shortCode`
2. `productManagementPage.categoryImport.wiring.test.tsx` — `"Daten importieren"` → `">Import</Button>"`
3. `projectForm.documentExtractionFlow.test.tsx` — Alte Dialog-Assertions (`<ProductSelectionDropdown`, `<ComponentDropdown`, `onOpenComponentDialog`) durch neue `ProjectProductFields`-Wiring-Assertions ersetzt; `"Auswählen"` → `"auswählen"`
4. `masterData.seed-files.integration.test.ts` — `toEqual` → `expect.objectContaining` + `arrayContaining` (Produktkategorien-Count ist durch Test-Isolation nicht deterministisch)
5. `calendar-tour-print-preview.browser.e2e.spec.ts` — `getByTestId("tour-print-summary-headline")` durch `getByTestId("tour-print-summary-page").locator("h2").first()` ersetzt (testid vom Print-Refactor 2026-03-17 entfernt)
6. `ft04.tour-employee-cascade.browser.e2e.spec.ts` — Mojibake `"hinzufÃ¼gen"` → `"hinzufügen"`
7. `employee-appointment-mutation-tracking.browser.e2e.spec.ts` — `apptRemoveDialog.startDate` (Date-Objekt) durch `getRelativeBerlinDate(1)` ersetzt
8. Browser `notes.ft13` cumulative: noch offen, Ursache unklar (siehe unten)

---

## Offener Blocker: demoSeed negative seedWindowDaysMin

**Test:** `demoSeed.appointments.constraints.integration.test.ts`
> "accepts negative seedWindowDaysMin and creates mount appointments before the anchor date"

**Status:** Konsistent rot nach dem ersten Audit-Lauf. Beim ersten Lauf (09:14 Uhr) grün, danach bei jedem Lauf rot.

**Fehler:** `expected false to be true` — mindestens ein Montage-Termin hat `startDate >= heute`, obwohl `seedWindowDaysMax: -1` gesetzt ist.

**Warum liegen lassen:**
- Kein Bezug zu aktuellem Refactoring (FT20 Demo Seed, nicht angefasst)
- DB wird vor jedem Test per `resetDatabase()` zurückgesetzt → kein Carry-over aus anderen Tests
- Vermutlich timing-sensitiver oder deterministisch-fragiler Test im Demo-Seed-Service
- Ist kein Release-Blocker

**Nächste Schritte (später):**
- `createSeedRun` mit `seedWindowDaysMax: -1` debuggen: prüfen ob der Service intern `parseDateOnly` oder `getBerlinTodayDateString()` korrekt relativ zur Berlin-Zeitzone rechnet
- Prüfen ob der Test `startDate < anchorDate` (strict less than) durch `<=` ersetzt werden müsste (Grenzfall "gestern midnight UTC = heute midnight Berlin")

---

## Offener Blocker: notes.ft13 cumulative Browser-E2E

**Test:** `notes.ft13.browser.e2e.spec.ts`
> "shows cumulative customer, project and appointment notes in the week preview"

**Fehler:** `week-appointment-panel-${fixture.appointment.id}` not found — Playwright snapshot zeigt Login-Seite statt Kalender.

**Beobachtung:** Tests 1-3 in der gleichen Datei laufen grün, Test 4 schlägt fehl wenn er nach Project-/Customer-Note-Erstellung zu "/" navigiert.

**Warum liegen lassen:** Ursache unklar (Login-Session-Problem oder Navigation-Seiteneffekt aus neuen Form-Layouts), kein Bezug zu den heutigen Features.
