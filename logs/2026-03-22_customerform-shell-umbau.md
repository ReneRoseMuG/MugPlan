# CustomerForm Shell Umbau

## Zweck

- `CustomerData` auf das neue Standard-Layout `EntityFormShell` umstellen.
- Header und Footer sticky ueber volle Breite nutzen.
- Die rechte Sidebar in Create und Edit mit derselben Panel-Reihenfolge verfuegbar halten.

## Scope

- Umbau von `client/src/components/CustomerData.tsx` von `EntityFormLayout` auf `EntityFormShell`.
- Sidebar in beiden Modi auf dieselbe Reihenfolge festziehen:
  - `LinkedProjectsPanel`
  - `CustomerAppointmentsPanel`
  - `CustomerAttachmentsPanel`
  - `TagPickerPanel`
  - `NotesSection`
- Create-Drafts fuer Kunden-Tags, Kunden-Notizen und Kunden-Anhaenge lokal puffern und nach erfolgreicher Kundenanlage persistieren.
- `CustomerAttachmentsPanel` fuer Pending-Anhaenge im Create-Modus erweitern.
- Unit- und Browser-Abdeckung fuer das neue Shell-Layout und die Kunden-Notizen nachziehen.

## Technische Entscheidungen

- Kein neuer Customer-spezifischer Shell-Wrapper: `EntityFormShell` bleibt die einzige Layout-Grundlage.
- Die Create-Sidebar nutzt lokale Draft-Zustaende fuer Tags, Notizen und Attachments, analog zum bereits umgestellten Projektformular.
- Bestehende Edit-Mutationen fuer Tags und Notizen bleiben unveraendert; nur die Create-Pfade wurden lokal ergaenzt.
- `LinkedProjectsPanel` und `CustomerAppointmentsPanel` bleiben auch ohne `customerId` sichtbar und zeigen ihre bestehenden leeren Zustandsmeldungen.

## Betroffene Dateien

- `client/src/components/CustomerData.tsx`
- `client/src/components/CustomerAttachmentsPanel.tsx`
- `tests/unit/ui/customerData.tagsSidebar.wiring.test.tsx`
- `tests/unit/ui/customerData.layoutShellIntegration.test.tsx`
- `docs/TEST_MATRIX.md`

## Test-Hinweise

- `npm test -- tests/unit/ui/customerData.tagsSidebar.wiring.test.tsx tests/unit/ui/customerData.layoutShellIntegration.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `npm run check`
- `npm run lint`

## Bekannte Einschraenkungen

- Fuer Kunden gibt es weiterhin keine Delete-Aktion im Footer; das Verhalten bleibt absichtlich unveraendert.
- Der Dokumenten-Extraktionsflow im Kundenformular uebernimmt weiterhin nur Formulardaten. Die neue Create-Attachment-Sidebar ergaenzt separate manuelle Pending-Anhaenge, aendert aber die bestehende Extraktionssemantik nicht.
