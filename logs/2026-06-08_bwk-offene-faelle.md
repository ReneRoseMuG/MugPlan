# Log: Offene Fälle – Wochenplan-Konflikte im Verschiebe-Dialog

**Datum:** 08.06.26  
**Branch:** `work`  
**Uncommittete Änderungen:** ja (siehe Abschnitt 5)

---

## 1. Hintergrund

Ausgangspunkt war MS-57: Beim Verschieben eines Termins soll der Dialog den Nutzer informieren,
wenn alle Mitarbeiter aus der Wochenplanung am Zieltermin durch doppelte Planung gesperrt sind
und der Termin deshalb ohne Mitarbeiter gespeichert/verschoben wird.

Bisher fehlte dieser Hinweistext im Auswahl-Schritt. Er wurde ergänzt.
Zusätzlich wurden Browser-E2E-Tests (BWK-01 bis BWK-03) angelegt, die die drei Mutations-Pfade
(Formular-Speichern, Wochenkalender-D&D, Monatskalender-D&D) absichern.

---

## 2. Bereits implementiert (uncommittet)

### 2.1 Konsequenztext im ersten Dialog-Schritt

**Datei:** `client/src/components/AppointmentMoveDialog.tsx`  
**Datei:** `client/src/components/AppointmentSaveReviewDialog.tsx`

Wenn alle Mitarbeiter aus der Wochenplanung am Zieltermin gesperrt sind (`willHaveNoEmployees = true`),
erscheint jetzt im Auswahl-Schritt (MoveDialog) bzw. Ressourcen-Schritt (SaveReviewDialog) ein
`description`-Text:

- Move-Dialog: „Der Termin wird ohne Mitarbeiter verschoben."
- SaveReview-Dialog: „Der Termin wird ohne Mitarbeiter gespeichert."

### 2.2 BWK-Tests angelegt

**Datei:** `tests/e2e-browser/calendar-move.blocked-week-plan.browser.e2e.spec.ts`

Drei Tests:
- BWK-01: Formular-Speichern (Datumswechsel innerhalb selber Tour + KW)
- BWK-02: Wochenkalender Cross-Tour-D&D
- BWK-03: Monatskalender Cross-KW-D&D

---

## 3. Offenes Problem 1 – Unique-Constraint-Fix (aktuell in Arbeit, unterbrochen)

**Status:** Edit lief, als die Session unterbrochen wurde. `beforeAll` ist halb geändert,
BWK-02-Assertion noch nicht angepasst.

**Problem:** Die DB-Tabelle `tour_week_employees` hat den Unique-Constraint
`uq_twe_year_week_employee` auf `(iso_year, iso_week, employee_id)` – ohne `tour_id`.
Ein Mitarbeiter kann also nur in EINER Tour-Wochenplanung pro KW stehen.

Das ursprüngliche `beforeAll` versuchte, denselben `blockedEmployee` in KW1 in zwei
verschiedene Tour-Wochenpläne einzutragen:

```
insertTourWeekEmployee(sourceTour.id, week1.isoYear, week1.isoWeek, blockedEmployee.id)  // BWK-01
insertTourWeekEmployee(targetTour.id, week1.isoYear, week1.isoWeek, blockedEmployee.id)  // BWK-02 → FEHLER
```

**Lösung (noch nicht fertig committed):**  
Zwei separate Mitarbeiter:
- `blockedEmployee` → sourceTour KW1 (BWK-01) + sourceTour KW2 (BWK-03)
- `blockedEmployee2` → targetTour KW1 (BWK-02)

**Was noch fehlt:**
- BWK-02-Assertion auf `blockedEmployee2.id` umstellen (Zeile ~167 in der Testdatei)
- Dann Tests ausführen und verifizieren, dass BWK-01/02/03 grün sind
- Danach `save`

---

## 4. Offenes Problem 2 – Zweiter Dialog-Schritt „Ohne Mitarbeiter" überflüssig?

**Status:** Offen, noch nicht entschieden.

**Beobachtung des Users:** Da Step 1 (Auswahl-/Ressourcen-Schritt) jetzt bereits
„Der Termin wird ohne Mitarbeiter verschoben/gespeichert." zeigt, ist Step 2
(„Der Termin hat keine geplanten Mitarbeiter.") redundant und erzeugt einen
unnötigen Klick.

**Mögliche Lösung:** Step 2 überspringen, wenn Step 1 bereits die Konsequenz benannt hat
(also wenn `willHaveNoEmployees = true` nach dem Auswahl-Schritt feststeht).

**Noch zu klären:** Gibt es Fälle, in denen Step 2 weiterhin nötig ist?
(z.B. wenn der Termin von vornherein keine Mitarbeiter hatte und keine Wochenplanung
vorhanden ist – Step 1 erscheint dann gar nicht.)

---

## 5. Neuer Fall A – Termin MIT Mitarbeitern, selbe KW + selbe Tour

**Status:** Noch gar nicht implementiert oder getestet.

**Ausgangslage:**
- Termin hat Mitarbeiter (z.B. Harm Bruns)
- Termin wird innerhalb derselben KW und derselben Tour verschoben
- Wochenplanung enthält einen ANDEREN Mitarbeiter, der am Zieltermin gesperrt ist

**Erwartetes Verhalten:**
- Harm Bruns bleibt am Termin (`employeeCarryoverMode = "preserve"`, `status: "current_only"`)
- Checkbox für Harm Bruns ist vorselektiert (CHECKED)
- Der gesperrte Wochenplan-Mitarbeiter wird als Konflikt angezeigt

**Aktuelles Problem:**
1. Checkbox für `current_only`-Mitarbeiter ist NICHT vorselektiert – muss CHECKED sein
2. Label „Bleibt nur durch bestehende Terminzuweisung erhalten" ist im same-tour-same-week-Kontext
   missverständlich; der Nutzer könnte denken, er wird entfernt

**Was zu tun ist:**
- UX-Fix: Checkbox für `current_only` standardmäßig selektiert
- Label klarer formulieren, z.B. „Bleibt am Termin (gleiche Tour und KW)"
- Tests anlegen: D&D in Woche (same-tour, Datumswechsel innerhalb KW) +
  Formular-Speichern

---

## 6. Neuer Fall B – Termin MIT Mitarbeitern, andere KW oder andere Tour

**Status:** Noch gar nicht implementiert oder getestet.

**Ausgangslage:**
- Termin hat Mitarbeiter (z.B. Harm Bruns)
- Termin wechselt KW ODER Tour

**Erwartetes Verhalten:**
- Harm Bruns wird ZWINGEND entfernt (`employeeCarryoverMode = "replace"`)
- Mitarbeiter = 0 → Konsequenztext erscheint im Dialog-Schritt
- Kein Checkbox für Harm Bruns (er wird ohne Auswahl abgezogen)

**Was zu tun ist:**
- UX: Wenn durch den Tourwechsel/KW-Wechsel alle bisherigen Mitarbeiter entfallen und
  keine Wochenplanung greift (oder alle gesperrt), muss die Konsequenz im Dialog sichtbar sein
- Tests anlegen: D&D Tourwechsel im Wochenkalender + D&D Tourwechsel im Monatskalender
  (Stichwort: „wir testen D&D nur den Tourwechsel in Woche und Monat")

---

## 7. Empfohlene Reihenfolge für die nächste Session

1. **Unique-Constraint-Fix abschließen** (Abschnitt 3):
   - BWK-02-Assertion auf `blockedEmployee2.id` umstellen
   - `npm run test:e2e:browser -- "calendar-move.blocked-week-plan"` ausführen
   - Bei Grün: `save`

2. **Entscheidung zum zweiten Dialog-Schritt** (Abschnitt 4):
   - Mit User klären, ob Step 2 wegfallen soll oder bleibt

3. **Fall A umsetzen** (Abschnitt 5):
   - UX-Fix Checkbox + Label
   - Tests schreiben

4. **Fall B umsetzen** (Abschnitt 6):
   - UX: Konsequenztext wenn bisherige Mitarbeiter durch Tourwechsel entfallen
   - Tests schreiben (D&D Tourwechsel Woche + Monat)
