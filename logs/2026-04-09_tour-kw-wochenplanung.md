# Auftragslog: KW-basierte Tour-Mitarbeiterplanung

## Zweck

Mehrschichtige Umsetzung der neuen KW-basierten Mitarbeiterplanung für Touren mit persistierter Wochenplanung, neuen Preview-/Execute-Flows im Backend, angepasster Tour- und Termin-UI sowie umfangreicher Testanpassung inklusive Browser-E2E.

Der Auftrag hatte zwei harte Leitplanken:

- Die bestehende Konfliktprüfung Mitarbeiter/Termin darf fachlich nicht verändert werden.
- Migrationen müssen früh auf Dev und Test laufen, damit Folgefehler durch Schema-Mismatch vermieden werden.

## Scope

Umgesetzt wurde eine neue persistierte Soll-Ebene `tour_week_employees`, die Touren mit ISO-Jahr, ISO-KW und Mitarbeitenden verknüpft.

Darauf aufbauend wurden folgende Bereiche ergänzt oder umgebaut:

- Datenmodell und Migration
- zentrale Contracts für Wochenplanung und Termin-Previews
- neue Backend-Schicht für Listen, Add-/Remove-Preview, Execute und Termin-Tour-Previews
- Tour-Bearbeitung mit Tab `Wochenplanung`
- AppointmentForm mit Vorschau-Dialogen für Tour-/KW-bezogene Wochenplan-Übernahmen
- Umstellung relevanter Tests auf den neuen Wochenplan-Ansatz

Bewusst nicht umgesetzt wurde eine Herkunftsmodellierung auf `appointment_employee`. Es gibt weiterhin keine serverseitige Unterscheidung zwischen `manual`, `team` oder `tour-kw`. Stattdessen wird im Terminformular explizit zwischen `Additiv` und `Ersetzen` gewählt.

## Technische Entscheidungen

### Persistenz

Neue Tabelle:

- `tour_week_employees`

Spalten:

- `id`
- `tour_id`
- `iso_year`
- `iso_week`
- `employee_id`
- `created_at`

Zentrale fachliche Constraint:

- eindeutige Kombination `(iso_year, iso_week, employee_id)`

Damit wird die neue organisatorische KW-Unique-Regel serverseitig und zusätzlich auf DB-Ebene abgesichert.

### Konfliktlogik

Die bestehende Mitarbeiter-/Termin-Overlap-Prüfung wurde nicht neu modelliert. Für neue Typ-2-Konflikte wird weiterhin ausschließlich die vorhandene Overlap-Logik aus dem Appointment-Bereich wiederverwendet.

Neu hinzugekommen ist nur die vorgelagerte KW-Regel:

- Ein Mitarbeiter darf in derselben ISO-KW nur einer Tour zugeordnet sein.

Diese Regel ersetzt nicht die Termin-Konfliktprüfung, sondern ergänzt sie auf Planungsebene.

### Historische Sperre

Wochenplanung ist für aktuelle und vergangene Wochen serverseitig read-only. Die UI zeigt dies an, die fachliche Durchsetzung liegt aber im Backend.

### Dialogstrategie

Es wurden keine neuen UI-Basis-Komponenten eingeführt. Der bestehende Tour-Kaskaden-Dialog wurde fachlich erweitert und deckt jetzt sowohl Wochenplan-Flows als auch Termin-Preview-Flows ab.

### Terminformular

Beim Zuweisen oder Wechseln einer Tour wird die Wochenplanung nicht still übernommen, sondern über serverseitige Preview-Endpunkte sichtbar gemacht.

Im Terminformular gibt es dafür jetzt:

- `Additiv`
- `Ersetzen`

`Additiv` ergänzt nur konfliktfreie Wochenplan-Mitarbeiter.

`Ersetzen` baut die Termin-Mitarbeiterliste auf Basis der bestätigten Zielmenge neu auf.

## Betroffene Dateien

### Schema / Migration

- `shared/schema.ts`
- `migrations/0022_tour_week_employees.sql`
- `migrations/meta/0022_snapshot.json`
- `migrations/meta/_journal.json`

### Contracts

- `shared/routes.ts`

### Backend

- `server/routes.ts`
- `server/routes/appointmentsRoutes.ts`
- `server/routes/tourWeekEmployeesRoutes.ts`
- `server/controllers/appointmentsController.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/repositories/employeesRepository.ts`
- `server/repositories/tourWeekEmployeesRepository.ts`

### Frontend

- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourEmployeeCascadeDialog.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/ui/colored-entity-card.tsx`
- `client/src/components/ui/entity-card.tsx`

### Tests / Doku

- `tests/unit/services/tourWeekEmployeesService.weekRules.test.ts`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/tourManagement.versioning.test.tsx`
- `docs/TEST_MATRIX.md`

## Früh ausgeführte Migrationen

Gemäß Auftrag und Repo-Regel wurde die Migration frühzeitig auf Dev und Test ausgeführt.

Erfolgreich gelaufen:

- `npm run db:migrate:dev`
- `npm run db:migration-status:dev`
- `npm run db:migrate:test`
- `npm run db:migration-status:test`

Ergebnis:

- Dev ist migrationssynchron
- Test ist migrationssynchron
- kein bekannter Schema-Mismatch zum aktuellen Code

## Testarbeiten

### Neu oder gezielt angepasst

- neue Unit-Absicherung für ISO-KW-Regeln und Wochen-Lock
- neue Integrationstests für Listen, Add-/Remove-Preview, Execute, Unterbesetzung, KW-Unique und Overlap-Reuse
- Browsertests für:
  - Wochenplanung im Tour-Edit
  - KW-Unique-Blockade
  - Konfliktmarkierung im Wochenplan-Preview
  - selektives Hinzufügen/Entfernen mit Datumsfilter
  - AppointmentForm mit Wochenplan-Preview
  - AppointmentForm-Konfliktfall
  - AppointmentForm `Ersetzen`

### Bisher im Arbeitslauf erfolgreich ausgeführt

- `npm run check`
- `npm run test:unit -- tests/unit/services/tourWeekEmployeesService.weekRules.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Alte FT04-Legacy-Pfade im Backend sind nicht vollständig entfernt, sondern bestehen für Übergang und Kompatibilität fort.
- Ein voller Audit und voller Testlauf über die komplette Suite war zum Zeitpunkt dieses Logs noch nicht gelaufen; das wurde im Anschluss separat angefordert.
- Herkunft von Termin-Mitarbeiterzuweisungen bleibt weiterhin bewusst unmodelliert.

## Ergebnis in der App

Nach dem Umbau können Disponenten Mitarbeitende pro Tour und ISO-KW planen, diese Planung konfliktbewusst auf Tour-Termine anwenden und dieselbe Wochenplanung im Terminformular sichtbar übernehmen.

Der Nutzer erkennt den erfolgreichen Umbau daran, dass:

- Touren einen eigenen Tab `Wochenplanung` besitzen
- zukünftige KWs dort gezielt pflegbar sind
- aktuelle und vergangene KWs gesperrt sind
- Konflikte vor der Mutation sichtbar gemacht werden
- die bestehende Mitarbeiter-/Termin-Overlap-Regel weiterhin greift
- Browser-E2E die konfliktfreien und konfliktbehafteten Hauptpfade abdecken
