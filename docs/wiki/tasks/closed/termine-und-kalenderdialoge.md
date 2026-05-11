# Termine- und Kalenderdialoge

Dialog-, Bestätigungs- und Meldungspfade für Termine und Kalenderflächen nach Abschluss der Grundlagen einheitlich strukturieren. Komplexe Terminverschiebungen mit Tour/KW-Bezug bleiben primär in Tour-KW- und Termin-Mutationsdialoge. Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Termine und Kalenderflächen nach Abschluss der Grundlagen einheitlich strukturieren. Komplexe Terminverschiebungen mit Tour/KW-Bezug bleiben primär in Tour-KW- und Termin-Mutationsdialoge.

## Ausgangslage

Die Ausgangslage wird nach der nächsten fachlichen Klärung konkretisiert.

## Umfang

- Der konkrete Umfang ist noch zu konkretisieren.

## Umsetzungshinweise

- Die Umsetzungshinweise sind noch zu konkretisieren.
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/AppointmentCancelConfirmDialog.tsx`
- `client/src/components/AppointmentAttachmentsPanel.tsx`
- `client/src/components/AttachmentDeleteAction.tsx`
- `client/src/components/AppointmentsListPage.tsx`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`

## Blocker und offene Fragen

Keine bekannt.

---

## Abschluss 11.05.26

Die für Ressourcenplanung relevanten Termin- und Kalenderdialoge sind umgesetzt. Terminformular, Kalender-Drag-&-Drop, Markieren und Einfügen sowie direkte Termin-Mitarbeiteraktionen nutzen den gemeinsamen Ressourcenplanungsdialog für Vorschau, Konflikte, Auswahl und Bestätigung. Tour-KW-Blockieren nutzt in Tourformular und Wochenkalender einen gemeinsamen Bestätigungsdialog.

Nicht verändert wurden fachlich unabhängige Termin-Dialoge außerhalb des Ressourcenplanungsthemas, etwa Storno-, Attachment- oder allgemeine Notizpfade. Diese bleiben in ihren eigenen Aufgaben oder bereits abgeschlossenen P-01-Schritten verortet.

### Verifikation

- `npm run check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-week-planning.browser.e2e.spec.ts tests/e2e-browser/ft33-absence-readonly.browser.e2e.spec.ts`
- `git diff --check`

## Beziehungen

- Features: [FT-01 - Kalendertermine](../../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- Entscheidungen: —
- Journal: [P01 Ressourcenplanung-Dialoge abgeschlossen](../../journal/11-05-26-p01-ressourcenplanung-dialoge-abgeschlossen.md)
- Weitere Bezüge: [Dialog-Rollout-Masterplan](../dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md) · [Tour-KW- und Termin-Mutationsdialoge](tour-kw-termin-mutationsdialoge.md)
