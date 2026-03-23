# Dokumentextraktion Overlays und Duplikatauflösung

## Zweck

Umsetzung der angefragten FT21/FT24-Anpassungen für die Dokumentextraktion:

- Extraktionsergebnisse werden nicht mehr als klick-outside-schließbarer Dialog, sondern als echte Overlays gerendert.
- Doppelte Kundennummern und Auftragsnummern werden nachgelagert freundlich aufgelöst.
- Bestehende Projekte werden im Duplikatfall im Edit-Modus geöffnet statt im Create-Modus vorbefüllt.
- Extrahierte PDFs bleiben in den betroffenen Overlay-Pfaden sichtbar und werden im erfolgreichen Duplikatpfad an das bestehende Projekt übernommen.

## Scope

Enthalten:

- Frontend-Anpassungen in `DocumentExtractionDialog`, `CustomerData`, `ProjectForm`, `AppointmentForm` und `ProjectAttachmentsPanel`
- Neuer Contract und Serverpfad `POST /api/document-extraction/resolve-project-by-order-number`
- Projektauflösung per Auftragsnummer im Server
- Erweiterte Unit-, Integration- und Browser-E2E-Absicherung
- Aktualisierung der `docs/TEST_MATRIX.md`

Nicht enthalten:

- Allgemeine Refactorings außerhalb der Extraktions- und Overlay-Pfade
- Änderungen an den übrigen Radix-Dialogen im System
- Vollständiger Audit oder voller Gesamttestlauf

## Technische Entscheidungen

- `DocumentExtractionDialog` rendert jetzt nur noch bei `open=true` und verwendet ein explizites `fixed inset-0`-Overlay mit eigenem Close-Button.
- Der bisherige frühe `ORDER_NUMBER_ALREADY_IMPORTED`-Abbruch in der Extraktion wurde für die nachgelagerte Frontend-Auflösung entfernt, damit die Duplikatpfade im UI überhaupt erreichbar sind.
- Für Projektduplikate wurde ein eigener Resolve-Endpoint eingeführt, analog zur bestehenden Kundennummer-Auflösung.
- Im Termin-Flow verwendet `pendingProjectDraft` jetzt einen diskriminierten Union-Typ:
  - `mode: "create"` für neuen Projektentwurf
  - `mode: "existing"` für vorhandenes Projekt im Edit-Modus
- Im Standalone-`ProjectForm` führt eine erkannte doppelte Auftragsnummer nicht zu einer gefährlichen Vorbefüllung im Create-Modus, sondern zu einem Wechsel auf das vorhandene Projekt.
- `ProjectAttachmentsPanel` zeigt im Edit-Modus zusätzlich noch nicht persistierte Draft-Anhänge an, damit die extrahierte PDF auch im bestehenden Projekt-Overlay sichtbar bleibt, bevor gespeichert wird.

## Betroffene Dateien

- `client/src/components/DocumentExtractionDialog.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/ProjectAttachmentsPanel.tsx`
- `shared/routes.ts`
- `server/routes/documentExtractionRoutes.ts`
- `server/controllers/documentExtractionController.ts`
- `server/services/documentProcessingService.ts`
- `server/services/projectsService.ts`
- `server/repositories/projectsRepository.ts`
- `tests/unit/ui/documentExtractionDialog.ui.test.tsx`
- `tests/unit/ui/documentExtractionDialog.overlayRendering.test.tsx`
- `tests/unit/services/documentProcessing.projectResolution.test.ts`
- `tests/integration/server/documentExtraction.routes.test.ts`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/ui/documentExtractionDialog.ui.test.tsx tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx tests/unit/ui/documentExtractionDialog.overlayRendering.test.tsx tests/unit/services/documentProcessing.customerResolution.test.ts tests/unit/services/documentProcessing.projectResolution.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/documentExtraction.routes.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`

Gezielt abgesicherte Pfade:

- Extraktions-Overlay bleibt bei Outside-Click offen
- Schließen per X und per Abbrechen
- Bestehender Kunde wird in das Kundenformular geladen
- Bestehendes Projekt wird im Projekt- und Termin-Flow im Edit-Modus geöffnet
- Extrahierte PDF bleibt im Overlay sichtbar und wird im erfolgreichen Duplikatpfad dem bestehenden Projekt zugeordnet

## Bekannte Einschränkungen

- Der Contract-Fall `resolution: "multiple"` für Projekte bleibt defensiv bestehen, ist wegen der Unique-Constraint auf `project_order.order_number` im realen DB-Istzustand aber regulär nicht erwartbar.
- Es wurde kein voller Audit und kein voller Gesamttestlauf über alle verpflichtenden Kommandos durchgeführt; dokumentiert sind nur die gezielten Verifikationen für diesen Auftrag.
