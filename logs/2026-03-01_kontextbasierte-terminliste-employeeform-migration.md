# Kontextbasierte Terminliste + EmployeeForm-Migration

## Zweck
Diese Änderung konsolidiert die Wiederverwendung der Terminliste über einen zentralen Kontext-Mechanismus und ersetzt das bisherige Inline-Mitarbeiterformular durch eine eigenständige `EmployeeForm`-Komponente mit integrierter Terminliste.

## Scope
- Einführung eines stateless "Alle Termine"-Switches im `AppointmentsFilterPanel`.
- Einführung der diskriminierten `context`-Prop in `AppointmentsListPage` mit den Modi:
  - `standalone`
  - `tour`
  - `employee`
- Beibehaltung der bisherigen Tour-spezifischen Legacy-Props in `AppointmentsListPage` als kompatibler Fallback (`TODO(deprecated)`).
- Migration des Mitarbeiter-Detailflows:
  - Neues `EmployeeForm`.
  - `EmployeesPage` rendert bei Neu/Bearbeiten das Formular statt eines Dialogs.
- Tour-Formular auf `context` umgestellt.
- Entfernung verwaister Legacy-Komponenten.
- Anpassung relevanter Wiring-Tests und Aktualisierung der `docs/TEST_MATRIX.md`.

## Technische Entscheidungen
1. **Kontext priorisiert Legacy**
   - Wenn `context` gesetzt ist, steuert er Filter-/Spalten-/Close-Button-Verhalten.
   - Legacy-Props bleiben zur Rückwärtskompatibilität aktiv, falls `context` nicht gesetzt ist.

2. **"Alle Termine" fachlich zentral in `AppointmentsListPage`**
   - `AppointmentsFilterPanel` bleibt zustandslos.
   - `showAllAppointments=false` setzt `dateFrom` auf `getBerlinTodayDateString()`.
   - `showAllAppointments=true` setzt `dateFrom` auf `undefined`.

3. **Standalone-Default auf "ab heute"**
   - `standalone` startet mit Switch `Off`, damit `dateFrom` auf Berliner Heute gesetzt ist.

4. **Employee-Formular als eigene Komponente**
   - Create/Update/Toggle-Logik aus `EmployeesPage` in `EmployeeForm` verschoben.
   - Aktiv-Checkbox nur für Admin im Edit-Modus sichtbar.
   - Terminliste und Attachment-Panel nur im Edit-Modus (vorhandene `employeeId`).

5. **Cleanup inklusive unreferenzierter Legacy-Datei**
   - Zusätzlich zu den geplanten Komponenten wurde `client/src/components/ui/tour-edit-dialog.tsx` entfernt, um tote Imports auf gelöschte Komponenten zu vermeiden.

## Betroffene Dateien
- `client/src/components/ui/filter-panels/appointments-filter-panel.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/components/EmployeeForm.tsx` (neu)
- `client/src/components/EmployeesPage.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/pages/Home.tsx`
- `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
- `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`
- `tests/unit/ui/entityAppointmentsSidebarWithDialog.wiring.test.tsx`
- `tests/unit/ui/employeesPage.versioning.test.tsx`
- `tests/unit/ui/sidebar.backupDisabled.wiring.test.ts`
- `docs/TEST_MATRIX.md`

Gelöscht:
- `client/src/components/TourAppointmentsTableDialog.tsx`
- `client/src/components/TourAppointmentsPanel.tsx`
- `client/src/components/EntityAppointmentsSidebarWithDialog.tsx`
- `client/src/components/ui/tour-edit-dialog.tsx`

## Hinweise zum Testen
Durchgeführt:
- `npm run typecheck` erfolgreich.

Nicht vollständig ausführbar in der aktuellen Umgebung:
- `npm run check` bricht wegen fehlender Datei `docs/TEST_DB_SAFETY_INVENTORY.md` ab.
- `vitest`-Ausführung der geänderten Wiring-Tests bricht ohne gesetztes Test-Sicherheitsprofil ab (`MUGPLAN_MODE=test`).

Empfohlene Validierung im Ziel-Setup:
1. `npm run check` nach Bereitstellung der fehlenden Inventory-Datei.
2. `npm test` mit `NODE_ENV=test` und `MUGPLAN_MODE=test`.
3. Manuelle UI-Prüfung:
   - Hauptnavigation zeigt "Termine".
   - Standalone-Terminliste: Switch sichtbar, default Off = ab heute, On = alle.
   - Tour-Form: Tourfilter ausgeblendet, Tourspalte ausgeblendet, leerer Zustand bei `tourId=null`.
   - Employee-Form Edit: Terminliste eingebettet, keine alte Termine-Sidebar.
   - Employee-Form Create: keine Terminliste, keine Attachments.

## Bekannte Einschränkungen
- Der Repo-weite Check kann aktuell nicht vollständig laufen, solange `docs/TEST_DB_SAFETY_INVENTORY.md` fehlt.
- Testausführung ist an den projektspezifischen Safety-Gate-Kontext (`MUGPLAN_MODE=test`) gebunden.
