# Auftragslog: Wochenplanung Mitarbeiterfilter und Listview

## Zweck

In der Tour-Wochenplanung sollte der Mitarbeiter-Picker zwei Probleme beheben: Die bestehende Listenansicht mit Checkbox-Sammelauswahl aus dem Terminformular fehlte im KW-Picker, und bei der Auswahl wurden weiterhin Mitarbeitende angeboten, die in derselben Kalenderwoche bereits auf einer anderen Tour verplant sind. Zusätzlich sollte die Änderung mit passenden Tests abgesichert werden.

## Scope

- Serverseitigen Verfügbarkeits-Endpunkt für Tour/KW ergänzt, der nur aktive und in der Zielwoche noch nicht zugeordnete Mitarbeitende liefert.
- KW-Mitarbeiter-Picker in `TourEditForm` auf den servergefilterten Datenpfad umgestellt.
- Listenansicht mit Sammelauswahl auch im KW-Picker aktiviert.
- Mehrfachauswahl in der Wochenplanung so verdrahtet, dass ausgewählte Mitarbeitende nacheinander durch den bestehenden Preview-/Bestätigungsfluss laufen.
- Relevante Unit-, Integrations- und Browser-Tests erweitert.
- `docs/TEST_MATRIX.md` passend zu den geänderten Tests aktualisiert.

## Technische Entscheidungen

- Keine neue Batch-Schreiblogik für die Wochenplanung eingeführt: Die Mehrfachauswahl nutzt weiterhin den vorhandenen Einzel-Preview- und Execute-Pfad pro Mitarbeiter.
- Die fachlich relevante Vorfilterung liegt serverseitig im Wochenplan-Pfad und nicht nur als lokale UI-Filterung im Dialog.
- Der neue Verfügbarkeits-Read-Pfad wurde im bestehenden Contract- und Schichtenmodell ergänzt: `shared/routes.ts` → Route → Controller → Service → Repository.
- Der bestehende persistente Listenmodus des `EmployeePickerDialogList` wurde wiederverwendet, statt einen separaten Wochenplan-Picker einzuführen.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/tourWeekEmployeesRoutes.ts`
- `server/controllers/tourWeekEmployeesController.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/repositories/tourWeekEmployeesRepository.ts`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourManagement.tsx`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `tests/unit/ui/tourManagement.versioning.test.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npm run test:unit -- tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourManagement.versioning.test.tsx`
  - `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
  - `npm run test:e2e:browser -- tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

## Bekannte Einschränkungen

- Die Mehrfachauswahl im KW-Picker verarbeitet ausgewählte Mitarbeitende bewusst sequentiell über den bestehenden Vorschaufluss. Wird eine Folge-Vorschau blockiert oder abgebrochen, werden nachfolgende Mitarbeitende nicht automatisch weiterverarbeitet.
