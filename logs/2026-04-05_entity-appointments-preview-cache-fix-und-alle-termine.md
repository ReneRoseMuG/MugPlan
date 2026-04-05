# Log: Entity-Appointments-Preview — Cache-Fix, Alle-Termine-Semantik, Umbenennung

**Datum:** 2026-04-05
**Branch:** (fortlaufend auf work_version_2-Arbeitsbranch)
**Auftragsklasse:** 5 — Mehrschichtige Änderung

---

## Zweck

Drei zusammenhängende Änderungen wurden als eine kohärente Lieferung umgesetzt:

1. **Cache-Bug-Fix**: Der Query-Key `["/api/entity-appointments-preview", ...]` wurde nach keiner Appointment-Mutation invalidiert. Hover-Previews zeigten veraltete Daten bis zum nächsten Seitenreload.

2. **Neue Sichtbarkeitsregel**: Badge-Zähler und Hover-Previews zeigen nun **alle Termine des Parents** (vergangen + zukünftig), absteigend sortiert, auf vier Einträge begrenzt. Zuvor wurden nur Termine ab heute gezählt und angezeigt.

3. **Umbenennung**: `plannedAppointmentsCount` → `appointmentsCount` im Entity-Karten-Kontext. Der Reports-Kontext (`reportsRepository`, `vorlauflistePreview`, `ReportsPage`) behält `plannedAppointmentsCount` unverändert — dort ist die Semantik „zukünftige Projekttermine" weiterhin korrekt.

---

## Scope

Schichten: Client-Komponente, Client-lib, Server-Repositories, Shared-Contract, Unit-Tests, Integrationstests, Browser-E2E-Tests, TEST_MATRIX.md.

**Geänderte Dateien:**

| Datei | Art | Änderung |
|---|---|---|
| `client/src/lib/tag-invalidation.ts` | Fix | `\|\| firstKey === "/api/entity-appointments-preview"` im Predicate ergänzt |
| `client/src/components/ui/entity-appointments-hover-preview.tsx` | Änderung | Endpoints auf `scope=all` / `fromDate=1900-01-01`, Sort auf `sortAppointmentsByDateDesc`, `footerHint` für alle Entity-Typen |
| `server/repositories/customersRepository.ts` | Änderung | Datumsfilter aus `appointmentRows`-Query entfernt, `plannedAppointmentsCount` → `appointmentsCount` (4 Stellen) |
| `server/repositories/projectsRepository.ts` | Änderung | Datumsfilter aus `appointmentRows`-Query entfernt, `plannedAppointmentsCount` → `appointmentsCount` (4 Stellen) |
| `client/src/components/EmployeesPage.tsx` | Änderung | Clientseitigen Datumsfilter aus Zählerberechnung entfernt, Umbenennung an 4 Stellen, Tabellenspalte „Alle Termine" |
| `shared/routes.ts` | Umbenennung | Customer-List-Schema + Project-List-Schema (2 von 3 Schemas); Reports-Schema unverändert |
| `client/src/components/CustomersPage.tsx` | Umbenennung | 1 Stelle |
| `client/src/components/ProjectsPage.tsx` | Umbenennung | 1 Stelle |
| `client/src/components/ui/entity-preview-cards.tsx` | Umbenennung | 6 Stellen (3 Typen + 3 Props) |
| `client/src/components/ui/table-hover-previews.tsx` | Umbenennung | 3 Typen |
| `client/src/components/LinkedProjectCard.tsx` | Umbenennung | 1 Stelle |
| `client/src/components/LinkedProjectsPanel.tsx` | Umbenennung | 1 Stelle |
| 11 Testdateien (Entity-Karten-Kontext) | Umbenennung | je 1–3 Stellen |
| `tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts` | Neu | 23 Tests über 3 describe-Blöcke |
| `tests/e2e-browser/entity-appointments-hover-preview.cache-invalidation.browser.e2e.spec.ts` | Neu | 7 serielle Browser-E2E-Tests |
| `docs/TEST_MATRIX.md` | Aktualisierung | 2 neue Zeilen |

---

## Technische Entscheidungen

### Cache-Fix (tag-invalidation.ts)
Alle Appointment-Mutations rufen bereits `invalidateRelatedAppointmentQueries()` → `invalidateTagProjectionQueries()` auf. Durch Ergänzung von `"/api/entity-appointments-preview"` im Predicate sind alle Mutations ohne weitere Änderungen abgedeckt. Die Einwahl in den bestehenden Predicate-Block ist die kleinstmögliche, sicher rückwärtskompatible Änderung.

### Endpoint-Strategie für „alle Termine"
- **Customer + Employee**: Server-Endpunkte unterstützen bereits `scope=all` → keine Serveränderung nötig, nur URL-Parameter geändert.
- **Project**: Kein `scope`-Parameter am Project-Endpoint. Sentinel `fromDate=1900-01-01` als Workaround ohne Serveränderung — der Server liefert alle Termine ab diesem weit zurückliegenden Datum.

### getBerlinTodayDateString-Import beibehalten
Zunächst irrtümlich entfernt (war für `todayBerlin`-Prop des `AllAppointmentsPanel`). Nach Erkennung des Fehlers sofort wiederhergestellt. `AllAppointmentsPanel` nutzt `todayBerlin` intern für die visuelle Trennung vergangener/zukünftiger Termine.

### footerHint für alle Entity-Typen
Vorher: `source.type === "employee" && totalLoadedAppointments > 4`. Jetzt: `totalLoadedAppointments > 4`. Die Bedingung war rein historisch und hatte keine fachliche Begründung für die Einschränkung auf Mitarbeiter.

### Umbenennung-Grenze Reports-Kontext
`shared/routes.ts` Zeile 386 (Reports-Schema) wurde explizit nicht umbenannt. `plannedAppointmentsCount` zählt dort zukünftige Projekttermine für die Vorlaufliste — semantisch korrekt und absichtlich von der Entity-Karten-Semantik getrennt.

### Employee-Asymmetrie
Kunden und Projekte haben server-seitige Zähler in den Repositories. Mitarbeiter-Appointment-Counts werden client-seitig in `EmployeesPage.tsx` aus der `employees-page-appointments`-Query berechnet (die schon `fromDate=1900-01-01` nutzt). Es waren daher zwei separate Stellen zu ändern: der `employeeRows`-useMemo und der Board-Renderpfad.

---

## Neue Testdateien

### Integrationstests (23 Tests)
`tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts`

Drei `describe`-Blöcke (Customer, Employee, Project), je mit:
- Vergangener Termin erscheint in `scope=all`
- Zukünftiger Termin erscheint in `scope=all`
- Gemischte Termine — beide erscheinen
- Fremdentity-Isolation — nicht vorhanden
- Keine Termine → `[]`
- `scope=upcoming`-Regression — vergangener Termin ausgeschlossen
- Ungültige ID → 400

### Browser-E2E-Tests (7 Tests, seriell)
`tests/e2e-browser/entity-appointments-hover-preview.cache-invalidation.browser.e2e.spec.ts`

| Test | Prüfung |
|---|---|
| A1 | Employee: zukünftiger Termin in Badge + Hover |
| A2 | Kunde: zukünftiger Termin in Badge + Hover |
| A3 | Projekt: zukünftiger Termin in Badge + Hover |
| A4 | Employee: vergangener Termin in Badge + Hover (neue Regel) |
| A5 | Employee: gemischte Termine absteigend sortiert (boundingBox-Vergleich) |
| A6 | Alle 3 Parent-Typen: >4 Termine → 4 sichtbar, Ältester ausgeblendet, „… weitere im Formular" |
| B1 | Cache-Invalidierung nach UI-Löschung ohne `page.reload()` |

---

## Testregression-Grenze

Folgende Testdateien wurden **absichtlich nicht geändert** (Reports-Kontext, semantisch korrekt):
- `tests/integration/server/reports.vorlaufliste.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.dateRange.integration.test.ts`
- `tests/unit/ui/reportsPage.vorlauflistePreview.test.ts`
- `tests/unit/ui/reportsPage.wiring.test.tsx`

---

## Hinweise zum Testen

```bash
npm run test:integration -- entity-appointments-preview --reporter=verbose
npm run test:integration -- customers.entity-card-payload --reporter=verbose
npm run test:integration -- projects.entity-card-payload --reporter=verbose
npm run test:e2e:browser
npm run check
```

Manuell: Termin anlegen/löschen → alle drei Kartentypen hovern → Zähler und Preview korrekt, kein Reload nötig.

---

## Bekannte Einschränkungen

- `npm run test:e2e:browser` wurde in dieser Session nicht ausgeführt.
- TypeScript-Prüfung (`npm run check`) wurde nicht explizit ausgeführt — sollte vor Merge laufen.
- Test B1 (Cache-Invalidierung) basiert auf dem Verhalten von React Query v5 mit `staleTime: Infinity`: Nach `invalidateQueries` gilt die Daten als stale; da der Query-Key bei Count=0 deaktiviert bleibt, zeigt der nächste Hover keine cached Appointment-Daten mehr aus dem invalidated Cache-Eintrag.
