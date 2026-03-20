# Auftragslog: Gruppe A Konflikttests

## Zweck

Gezielte Nacharbeit der ersten Test-Arbeitsgruppe aus der Inventarliste.

Die Bearbeitung wurde fachlich zugeschnitten:

- FT30-nahe Tests wurden entfernt
- verbleibende Kernabsicherung fuer echte Termin- und Mitarbeiterkonflikte blieb erhalten
- schwache Source-Tests wurden in diesem Paket nicht gerettet, sondern nur dort ersetzt, wo noch relevantes Verhalten abgesichert werden musste

## Scope

Bearbeitet wurden ausschliesslich:

- betroffene Testdateien der ersten Arbeitsgruppe
- `docs/TEST_MATRIX.md`
- das Follow-up unter `logs/testing/2026-03-20_gruppe-a-kollisionen-follow.md`

Nicht bearbeitet wurden:

- Produktivcode
- Konfiguration, Build, Infrastruktur
- andere Testgruppen ausserhalb dieser Gruppe

## Technische Entscheidungen

- FT30 wurde als fachlich entfernt behandelt; zugehoerige Testdateien wurden daher nicht reaktiviert, sondern geloescht.
- Die verbleibende Kernlogik wurde auf drei Restpfade konzentriert:
  - Unit: Drag-Sperre fuer stornierte Termine in Woche und Monat
  - Integration: `EMPLOYEE_OVERLAP_CONFLICT` beim Verschieben eines Termins
  - Browser: konkrete sichtbare `VALIDATION_ERROR`-Meldung beim Kalender-Drag-and-drop
- Der bisherige Source-Test fuer Kalender-Drag-and-drop wurde durch einen Laufzeit-Test ersetzt.
- Ein gemischter Availability-/Overlap-Integrationstest wurde auf den relevanten Overlap-Fall reduziert und fachlich neu benannt.

## Betroffene Dateien

Neu oder ersetzt:

- `tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `tests/integration/server/appointments.dragdrop.overlap.integration.test.ts`
- `logs/testing/2026-03-20_gruppe-a-kollisionen-follow.md`

Aktualisiert:

- `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

Entfernt:

- alle FT30- und FT30-nahen Tests der ersten Gruppe, inklusive `employeeAbsences*`, `employeeAvailabilityService.test.ts`, `appointmentForm.availability-feedback.wiring.test.ts`, `employeePickerDialogList.availability.wiring.test.tsx`, `appointments.availability.ft30-ft01.integration.test.ts` sowie der frueheren FT30-Browserflows

## Test-Hinweise

Gezielt und seriell ausgefuehrt:

- `npm run test:unit -- tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.dragdrop.overlap.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`

Ergebnis:

- alle drei gezielten Restlaeufe gruen
- beim Integrationstest erschien ein nicht blockierender Sourcemap-Hinweis aus `node-cron`

## Bekannte Einschraenkungen

- Die Inventargruppe enthielt historisch falsche oder irrefuehrende FT-Labels; diese wurden fuer die Bearbeitung nicht als fachliche Wahrheit verwendet.
- Wenn Abwesenheit, Krankheit oder austrittsbasierte Ausschlusslogik doch weiterhin Soll sein sollten, braucht das einen separaten Folgeauftrag mit neuer fachlicher Klaerung.
