# Offener Blocker: notes.ft13 cumulative Browser-E2E

**Datum:** 2026-03-18
**Test:** `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
**Testname:** "shows cumulative customer, project and appointment notes in the week preview"

---

## Symptom

Test 4 schlägt fehl. Tests 1–3 in derselben Datei laufen grün.

**Fehler:** `week-appointment-panel-${fixture.appointment.id}` not found
**Beobachtung:** Playwright-Snapshot zeigt nach `page.goto("/")` die Login-Seite statt den Wochenkalender.

---

## Testfluss (Test 4)

1. `loginAsAdmin(page)` ✓
2. `nav-projekte` → Projekt-Karte öffnen → Notiz anlegen → Projekt speichern ✓
3. `nav-kunden` → Kunden-Karte öffnen → Notiz anlegen → Kunde speichern ✓
4. `page.goto("/")` → **Login-Seite statt Kalender**

---

## Hypothesen

**A — Session-Cookie verloren:**
Der Cookie sollte über die gesamte `page`-Instanz erhalten bleiben. Möglicherweise
invalidiert ein serverseitiger Mechanismus die Session nach mehreren SPA-Navigationen.

**B — Navigations-Seiteneffekt nach Formular-Speichern:**
`button-save-customer` schließt das Formular. Das neue EntityFormLayout könnte dabei
intern eine Navigation auslösen. Die folgende `page.goto("/")` käme in eine Race
Condition oder Double-Navigation und verlöre den Auth-State.

**C — StaleDataBanner oder Query-Fehler:**
Der Poller trifft auf einen Fehler-State nach mehreren Mutationen und löst einen
Logout aus, bevor `page.goto("/")` abgeschlossen ist.

---

## Warum liegen lassen

- Kein Bezug zum aktuellen Refactoring (FT13 Notizen, nicht angefasst)
- Tests 1–3 laufen grün, Kern-Feature ist abgesichert
- Test 4 testet das kumulative Anzeigen — wertvoller Test, aber kein Release-Blocker
- Ursache unklar, Debugging erfordert Playwright-Trace-Analyse

---

## Nächste Schritte (später)

- `playwright test --trace on` für notes.ft13 ausführen und Trace in Playwright UI öffnen
- Prüfen ob nach `button-save-customer` eine interne Navigation zu "/" oder "/login" stattfindet
- Prüfen ob `useDataVersionPoller` nach mehreren Mutationen einen Logout-Pfad auslöst
- Als Workaround: `page.goto("/")` durch `page.getByTestId("nav-kalender").click()` ersetzen
  und prüfen ob das die Login-Seite vermeidet
