# Log: FT06 Paket 1 – Automatische Regeln / Parken-Implementierung

**Datum:** 2026-04-12
**Branch:** `feature/ft06-automatische-regeln` (von `work` abgezweigt)
**Auftragsklasse:** 5 — mehrschichtige Änderung, neues Feature

---

## Zweck

Umsetzung von FT-06 „Automatische Regeln" Paket 1 gemäß Brief `ft06-automatische-regeln-brief-v2.md`.

Scope Paket 1: Abschnitte 1–6 des Briefs plus zugehörige Unit- und Integrationstests.

---

## Umfang der Änderungen

### Shared

- **`shared/appointmentCancellation.ts`**
  - `RESERVED_VACANT_TAG_NAME` auf `"Geparkt"` umgestellt (war `"Vakant"`)
  - `isReservedVacantTagName(value: string): boolean` hinzugefügt
  - `isProtectedSystemTagName()` nutzt nun `isReservedVacantTagName()`
  - `isPickerVisibleForDomain()` blendet Geparkt-Tag aus

- **`shared/routes.ts`**
  - Neuer Route-Contract `appointments.park`: `POST /api/appointments/:id/park`, Input `{ version: z.number().int().min(1) }`, Responses 204 / 403 / 404 / 409 / 422

### Server — Repositories

- **`server/repositories/appointmentsRepository.ts`**
  - `removeAppointmentTagByTagIdTx()` — löscht Tag-Verknüpfung innerhalb einer Transaktion
  - `setAppointmentParkTx()` — setzt `tour_id` und bumpt `version` atomar in einem SQL-UPDATE mit optimistischem Lock

### Server — Lib

- **`server/lib/appointmentCancellation.ts`**
  - `isReservedVacantTag()` und `hasReservedVacantTag()` hinzugefügt

### Server — Services

- **`server/services/systemSeedService.ts`**
  - `SYSTEM_TOURS`: Eintrag `"Vakant"` → `"Parkplatz"` (neuer Name)
  - `seedTags()`: Migration Vakant→Geparkt vor der regulären Ensure-Schleife
  - `seedTours()`: Migration Vakant→Parkplatz vor der regulären Ensure-Schleife; nach Migration wird `currentTours` neu geladen (Idempotenz)

- **`server/services/appointmentsService.ts`**
  - `AppointmentError.code`-Union erweitert um `"ALREADY_PARKED"`
  - Hilfsfunktionen `normalizeTourName()` und `findParkplatzTour()` (hoisted function declarations)
  - `parkAppointment(appointmentId, expectedVersion, roleKey)`: neuer Endpunkt-Service
    - Guard: `requireDispatcherOrAdmin` → `FORBIDDEN`
    - Guard: historische Termine → `PAST_APPOINTMENT_READONLY`
    - Guard: stornierte Termine → `CANCELLED_APPOINTMENT_READONLY`
    - Guard: Parkplatz-Tour fehlt → `BUSINESS_CONFLICT`
    - Guard: Geparkt-Tag fehlt → `BUSINESS_CONFLICT`
    - Transaktion: bereits geparkt → `ALREADY_PARKED`; Versionskonflikt → `VERSION_CONFLICT`
    - Atomar: `setAppointmentParkTx` + `replaceAppointmentEmployeesTx([])` + `addAppointmentTagTx(geparktTagId)`
  - `updateAppointment()`: Geparkt-Tag wird still entfernt wenn Tour von Parkplatz auf andere wechselt (innerhalb der bestehenden Transaktion via `removeAppointmentTagByTagIdTx`)
  - `addAppointmentTag()` / `removeAppointmentTag()`: Guard für Geparkt-Tag → `CANCELLATION_TAG_PROTECTED`

### Server — Controller und Routes

- **`server/controllers/appointmentsController.ts`** — `parkAppointment` Handler (analog zu `cancelAppointment`)
- **`server/routes/appointmentsRoutes.ts`** — Route `POST /api/appointments/:id/park` registriert

### Client

- **`client/src/hooks/useTagRuleEngine.ts`** (neue Datei)
  - Exportierte Pure Functions: `computeTagAddedAction()`, `computeTagRemovedAction()`
  - Logik: Reklamation und Messe Aufbau/Abbau lösen Notiz-Vorschlag aus; Entfernen löst Notiz-Entfernen-Dialog aus; alle anderen Tags → noop
  - Titelvergleich normalisiert (case-insensitiv, trim)
  - Hook `useTagRuleEngine()` wraps die Pure Functions für React-Verwendung

---

## Tests

### Unit-Tests (erweitert / neu)

| Datei | Zustand | Inhalt |
|---|---|---|
| `tests/unit/lib/appointmentCancellation.test.ts` | erweitert | Geparkt-Konstante, isReservedVacantTagName, Picker-Sichtbarkeit |
| `tests/unit/services/systemSeedService.test.ts` | erweitert | +5 Migrationstests: Tag/Tour Vakant→neu, Idempotenz |
| `tests/unit/services/appointments.park.test.ts` | neu | parkAppointment (10 Tests), updateAppointment Geparkt-Entzug (2 Tests) |
| `tests/unit/hooks/useTagRuleEngine.test.ts` | neu | computeTagAddedAction (10 Tests), computeTagRemovedAction (5 Tests) |

### Integrationstests (neu)

| Datei | Inhalt |
|---|---|
| `tests/integration/server/appointments.park.integration.test.ts` | POST /park (success, ALREADY_PARKED, VERSION_CONFLICT, CANCELLED, 403), Geparkt-Entzug, Picker-Schutz |
| `tests/integration/server/systemSeed.migration.integration.test.ts` | Vakant→Geparkt, Vakant→Parkplatz, Idempotenz, kein Fehler ohne Vakant-Einträge |

### Dokumentation

- `docs/TEST_MATRIX.md` — 4 neue Zeilen für die neuen Testdateien, `appointmentCancellation.test.ts` auf FT28/FT06 aktualisiert

---

## Gate-Status am Ende der Session

| Kommando | Ergebnis |
|---|---|
| `npm run check` | ✓ grün (encoding + destructive-inventory + tsc) |
| `npm run lint` | ✓ grün (0 Fehler) |
| `npm run test:unit` | ⏸ nicht ausgeführt (Session unterbrochen) |
| `npm run test:integration` | ⏸ nicht ausgeführt |

---

## Noch ausstehend (Paket 1)

- UI-Abschnitte 4 und 6 des Briefs:
  - AppointmentForm: Anmerkungen-Tag-Dialog bei Projekt-Speichern
  - Kalender-Karte und Sidebar: Parken/Stornieren-Menü-Einträge
- `useTagRuleEngine` noch nicht in `AppointmentForm.tsx` oder `CalendarWeekAppointmentTagPicker.tsx` integriert
- Gate-Kommandos `test:unit` und `test:integration` noch zu laufen lassen und freizugeben

## Explizit verschoben

- **Paket 2** (Browser-E2E-Tests): `appointment-park.workflow.browser.e2e.spec.ts`, erweiterte `appointment-cancellation`-Tests, `tag-rule-engine.workflow.browser.e2e.spec.ts` — erst nach expliziter Freigabe von Paket 1.

---

## Technische Entscheidungen

- `setAppointmentParkTx` kombiniert `tour_id`-Update und `version`-Bump in **einem** SQL-Statement für echte Atomizität
- `computeTagAddedAction` / `computeTagRemovedAction` als **reine exportierte Funktionen** (nicht nur Hook-intern), um Testbarkeit ohne React-Infrastruktur zu gewährleisten
- Migration in SystemSeed läuft **vor** der regulären Ensure-Schleife und ist **idempotent**: zweiter Aufruf findet kein „Vakant" mehr und loggt nichts
- `geparktTagIdForRemoval` wird in `updateAppointment` **außerhalb** der Transaktion vorgeladen, um keine verschachtelten async-Aufrufe im Transaction-Callback zu benötigen
