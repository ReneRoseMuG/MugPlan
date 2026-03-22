# AppointmentForm auf EntityFormShell umgestellt

**Datum:** 2026-03-22
**Branch:** `design/appointmentform-shell`
**Status:** Umgesetzt

## Zweck

`AppointmentForm` nutzt jetzt `EntityFormShell` als Standard-Layout. Die bestehende Funktionalität bleibt erhalten, insbesondere die vollständige Sidebar in Create und Edit mit Anhängen, Tags und Notizen.

## Scope

- `client/src/components/AppointmentForm.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`
- `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.readOnlyFields.wiring.test.tsx`
- `tests/unit/ui/appointmentForm.relationSlots.test.tsx`
- `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- `EntityFormLayout` wurde in `AppointmentForm` durch `EntityFormShell` ersetzt.
- Header, Footer, Main und Sidebar werden direkt in `AppointmentForm` zusammengesetzt, damit bestehende Button-Verträge und `data-testid`-Anker erhalten bleiben.
- Die Sidebar bleibt bewusst in beiden Modi aktiv. Im Create-Modus bleiben Pending-Attachments, Draft-Tags und Draft-Notizen unverändert nutzbar.
- `AppointmentEmployeeSlot` wurde nicht geändert, weil der Ist-Zustand für Tour-Props und Tour-Picker bereits zum fachlichen Ziel passte.
- Zusätzliche AppointmentForm-Wiring-Tests mussten auf `EntityFormShell` umgestellt werden, weil sie bisher den alten Wrapper direkt gemockt haben.

## Tests

Seriell ausgeführt:

- `npm test -- tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx tests/unit/ui/appointmentForm.readOnlyFields.wiring.test.tsx tests/unit/ui/appointmentForm.relationSlots.test.tsx tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx`
- `npm run check`

## Bekannte Einschränkungen

- Kein voller Audit und kein voller Testlauf in diesem Auftrag.
- Kein `docs-sync` über Architektur- oder Implementierungsdokumente, da der Eingriff lokal auf Frontend-Layout und zugehörige Tests begrenzt blieb.
