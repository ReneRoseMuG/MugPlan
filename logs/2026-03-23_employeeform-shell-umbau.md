# EmployeeForm Shell Umbau

## Zweck

- `EmployeeForm` auf das neue Standard-Layout `EntityFormShell` umstellen.
- Header und Footer sticky ueber volle Breite nutzen.
- Die rechte Sidebar in Create und Edit mit derselben Panel-Reihenfolge verfuegbar halten.

## Scope

- Umbau von `client/src/components/EmployeeForm.tsx` von `EntityFormLayout` auf `EntityFormShell`.
- Sidebar in beiden Modi auf dieselbe Reihenfolge festziehen:
  - `EmployeeAttachmentsPanel`
  - `TagPickerPanel`
  - Tour-Block
  - Team-Block
- Create-Drafts fuer Mitarbeiter-Tags und Mitarbeiter-Anhaenge lokal puffern und nach erfolgreicher Mitarbeiteranlage persistieren.
- `EmployeeAttachmentsPanel` fuer Pending-Anhaenge im Create-Modus erweitern.
- Unit-Abdeckung fuer das neue Shell-Layout und die Employee-Tag-Sidebar nachziehen.

## Technische Entscheidungen

- Kein neuer Employee-spezifischer Shell-Wrapper: `EntityFormShell` bleibt die einzige Layout-Grundlage.
- Die Create-Sidebar nutzt lokale Draft-Zustaende fuer Tags und Attachments, analog zu den bereits umgestellten Formularen.
- Tour und Team bleiben read-only Anzeigeelemente und erhalten keine neue Create-Zuordnungslogik.
- Der Termine-Tab bleibt im Main-Bereich und wird nicht in die Sidebar verschoben.
- Validierungsfehler im Save-Flow werden per Toast und fruehem `return` behandelt statt per geworfener `validation`-Exception.

## Betroffene Dateien

- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeeAttachmentsPanel.tsx`
- `tests/unit/ui/employeeForm.tagsSidebar.wiring.test.tsx`
- `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Test-Hinweise

- `npm test -- tests/unit/ui/employeeForm.tagsSidebar.wiring.test.tsx tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `npm run check`
- `npm run lint`

## Bekannte Einschraenkungen

- Im Create-Modus bleiben Tour und Team weiterhin reine Leer-/Info-Zustaende ohne Zuordnungsaktionen.
- Fuer EmployeeForm wurde kein neuer Browser-Flow ergaenzt, weil im Repo kein bestehender Employee-Form-Browser-Workflow mit Sidebar-/Save-Regression existiert.
