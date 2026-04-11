# Log: refactor-forms-filters

**Branch:** `refactor-forms-filters`
**Datum:** 2026-04-11

---

## Zweck

Visuelle und strukturelle Überarbeitung von Form-Layouts (Tour, Team), Filter-Panels (Terminlisten) und der Monitoring-Seite. Kein fachliches Verhalten wurde geändert.

---

## Scope

### Tour- und Team-Form: Sidebar-Spalte ergänzt

- `TourEditForm` und `TeamEditForm` erhalten eine leere rechte Sidebar über den `EntityFormShell`-`sidebar`-Prop — identisches Layout wie `EmployeeForm`, `ProjectForm` etc.
- Beide Forms erhalten `contentMaxWidth={99999}` → Hauptinhalt nutzt volle verfügbare Breite.
- Team-Form: Hauptinhalt mit `mx-auto` zentriert.
- Tour-Form: Footer-Buttons in zwei Zeilen organisiert — „KW einfügen" oben allein, „Löschen / Zurück / Speichern" darunter.

### Filter-Panels: Reihenfolge und Beschriftung

- `AppointmentsFilterPanel`: Filterreihenfolge auf Nachname Kunde → Kunde Nr. → Projektname → Auftrag Nr. geändert.
- Toggle-Labels: „Alle Termine" → „Alle", „Geplante Termine" → „Geplante" (wurde später im Picker wieder auf Langform zurückgestellt).

### Monitoring-Seite

**Backend-Erweiterungen:**
- `listAppointmentsForMonitoring` im Repository um `LEFT JOIN` auf `projects` und `customers` erweitert.
- Neue Felder in SELECT: `startTime`, `projectName` (`projects.name`), `customerName` (`customers.lastName`).
- `groupBy` um die neuen Felder erweitert.
- `MonitoringItem`-Typ im Service und `monitoringItemSchema` im Contract entsprechend ergänzt.
- `allAppointments`-Schalter entfernt: Service lädt immer alle zukünftigen Termine (`toDate` nicht mehr übergeben).

**Frontend-Änderungen:**
- Spalten neu: Startzeit (hh:mm, nur wenn vorhanden), Startdatum (dd.MM.yy), Tour (keine feste `minWidth` + `minWidth: 20` nachträglich), Trigger, Problem.
- Entfernte Spalten: Enddatum, Mitarbeiter.
- Konfigurationspanel in `footerSlot` der `ListLayout` verschoben (sticky, unterhalb der Tabelle).
- Switch „alle Termine" und `handleToggleAllAppointments` entfernt.

### Neuer `AppointmentPeriodPicker`

Neue Komponente `client/src/components/ui/appointment-period-picker.tsx`:
- Popover-Trigger mit kompakter Periodenangabe als Button-Label.
- Popup-Inhalt: Header-Zeile „Basis" mit Toggle „Alle Termine / Geplante Termine", darunter `DateRangeKwRangePanel` (Datum- und KW-Modus).
- Im KW-Modus: KW-Start + Anzahl Wochen werden in `dateFrom`/`dateTo` umgerechnet (ISO-Woche → Montag/Sonntag des jeweiligen Jahres).
- Beim Öffnen ohne gesetztes `dateFrom`: automatisch heutiges Datum als Start gesetzt.
- `PopoverContent` mit `collisionPadding={8}` gegen Viewport-Überlauf.

`AppointmentsFilterPanel`:
- Bisherige Datumsfelder (Datum von / Datum bis), Scope-Toggle und `splitDateRangeRow`-Mechanismus entfernt.
- Durch `AppointmentPeriodPicker` ersetzt.
- `appointmentScopeHelpKey`-Prop entfernt.

`AppointmentsListPage`:
- `splitDateRangeRow`-Prop entfernt.

`TourEditForm`:
- `splitDateRangeRow`-Übergabe entfernt.

---

## Betroffene Dateien

| Datei | Art |
|---|---|
| `client/src/components/TourEditForm.tsx` | Geändert |
| `client/src/components/TeamEditForm.tsx` | Geändert |
| `client/src/components/ui/entity-form-shell.tsx` | Unverändert (nur genutzt) |
| `client/src/components/ui/filter-panels/appointments-filter-panel.tsx` | Geändert |
| `client/src/components/ui/appointment-period-picker.tsx` | Neu |
| `client/src/components/AppointmentsListPage.tsx` | Geändert |
| `client/src/components/MonitoringPage.tsx` | Geändert |
| `server/services/monitoringService.ts` | Geändert |
| `server/repositories/appointmentsRepository.ts` | Geändert |
| `shared/routes.ts` | Geändert (`monitoringItemSchema`) |

---

## Hinweise zum Testen

- Tour-Form: Alle drei Tabs prüfen, insbesondere Footer auf Tab „Wochenplanung" (zwei Zeilen).
- Team-Form: Sidebar sichtbar, Controls zentriert.
- Terminlisten (Standalone, Mitarbeiter-Form, Tour-Form): Zeitraum-Picker öffnen, Datum- und KW-Modus testen, Basis-Toggle prüfen.
- Monitoring: Tabelle auf neue Spalten prüfen, Config-Panel in Fußzeile, keine Fehler bei leerem Datensatz.

## Bekannte Einschränkungen

- Im KW-Modus des Pickers wird immer das aktuelle ISO-Jahr verwendet — kein Jahr-Wahlfeld.
- `projectName` und `customerName` sind im Monitoring-Response vorhanden, aber noch nicht als Tabellenspalten sichtbar.
- Der `allAppointments`-Wert wird weiterhin beim Speichern der Monitoring-Config mit `true` übermittelt (rückwärtskompatibel mit bestehendem Settings-Schema).
---

## Nachtrag: Zeitraum-Picker der Terminliste fachlich korrigiert

### Zweck

Die neue Zeitraum-Komponente der Terminliste wurde nach dem Refactor fachlich nachgeschärft, weil der tatsächliche Startzustand, die Scope-Umschaltung und die Date-/KW-Vorbelegung nicht konsistent genug waren.

### Umgesetzte Änderungen

- Startzustand der Terminliste ist jetzt tatsächlich **Alle Termine**.
- Der Picker setzt beim Öffnen nicht mehr still `dateFrom = heute`.
- Neuer Button **„Zurücksetzen“** im Picker-Header.
- Reset setzt die freien Terminfilter vollständig auf die verfügbare Grundmenge zurück:
  - `appointmentScope = "all"`
  - freie Textfilter leer
  - Tag-Filter leer
  - Tour-Filter auf Standard
  - Paging zurück auf Seite 1
- Feste Kontextbindungen wie Tour- oder Mitarbeiter-Kontext bleiben erhalten.
- `AppointmentPeriodPicker` leitet Date-/KW-Anzeige nicht mehr nur aus lokalem Einmal-State ab, sondern aus aktuellem Filterzustand oder `availableRange`.
- Scope-Toggle im Picker ist wieder mit stabilen Test-IDs `toggle-appointments-scope-all` und `toggle-appointments-scope-planned` verdrahtet.

### Contract-/Server-Nachtrag

- `/api/appointments/list` liefert jetzt zusätzlich:
  - `availableRange.dateFrom`
  - `availableRange.dateTo`
- `availableRange` wird serverseitig ohne aktive Zeitraumfilter berechnet.
- Die Range respektiert den aktuellen Listenkontext und sonstige Nicht-Zeitraum-Filter.

### Zusätzlich betroffene Dateien

| Datei | Art |
|---|---|
| `client/src/components/AppointmentsListPage.tsx` | Weiter ergänzt |
| `client/src/components/ui/appointment-period-picker.tsx` | Weiter ergänzt |
| `client/src/components/ui/filter-panels/appointments-filter-panel.tsx` | Weiter ergänzt |
| `server/repositories/appointmentsRepository.ts` | Weiter ergänzt |
| `server/services/appointmentsService.ts` | Geändert |
| `shared/routes.ts` | Weiter ergänzt (`appointments.list` Response mit `availableRange`) |
| `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx` | Erweitert |
| `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx` | Erweitert |
| `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx` | Aktualisiert |
| `tests/integration/server/appointments.list.sorting.integration.test.ts` | Erweitert |
| `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` | Erweitert |
| `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts` | Aktualisiert |
| `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts` | Aktualisiert |
| `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts` | Aktualisiert |
| `docs/TEST_MATRIX.md` | Aktualisiert |

### Tatsächlich ausgeführte Verifikation

- `npm run test:unit -- tests/unit/ui/appointmentsListPage.controlled-state.test.tsx tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.list.sorting.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`
