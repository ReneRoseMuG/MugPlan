# PKG-05 Testliste

## Ziel von PKG-05
PKG-05 sichert die Attachment-Sicherheitslogik (P1):

1. Attachment-Delete ist serverseitig deaktiviert (`405`).
2. Download-Disposition wird deterministisch und sicher gesetzt (`inline` vs `attachment`).

Alle Faelle sind Unit-Tests mit Mocks.

## Abdeckungsuebersicht
- Datei `tests/unit/invariants/attachmentRules.test.ts`: 5 Tests

## Datei `tests/unit/invariants/attachmentRules.test.ts`

### 1) `returns 405 for project attachment delete endpoint`
- Service/Funktion: `projectAttachmentsController.deleteProjectAttachment`
- Given:
  - Ein beliebiger Request auf die Delete-Funktion.
  - Gemocktes `res` mit `status/json`.
- When:
  - Delete-Handler wird ausgefuehrt.
- Then:
  - Antwort ist `405`.
  - Payload: `{ message: "Attachment deletion is disabled" }`.
  - `next` wird nicht aufgerufen.
- Kontext:
  - Dieser Test verankert die systemweite Policy, dass Attachment-Delete aktuell verboten ist.

### 2) `uses inline disposition for PDF when download is not forced`
- Service/Funktion: `sendAttachmentDownload`
- Given:
  - MIME-Type `application/pdf`.
  - `forceDownload = false`.
- When:
  - Download-Helfer wird aufgerufen.
- Then:
  - `Content-Disposition` ist `inline`.
  - `Content-Type` bleibt `application/pdf`.
- Kontext:
  - PDFs sollen im Browser darstellbar bleiben, wenn kein expliziter Download erzwungen wird.

### 3) `uses inline disposition for image mime types when download is not forced`
- Service/Funktion: `sendAttachmentDownload`
- Given:
  - MIME-Type `image/png`.
  - `forceDownload = false`.
- When:
  - Download-Helfer wird aufgerufen.
- Then:
  - `Content-Disposition` ist `inline`.
- Kontext:
  - Bilddateien folgen derselben Inline-Regel wie PDFs.

### 4) `uses attachment disposition for non-inline mimes when download is not forced`
- Service/Funktion: `sendAttachmentDownload`
- Given:
  - MIME-Type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
  - `forceDownload = false`.
- When:
  - Download-Helfer wird aufgerufen.
- Then:
  - `Content-Disposition` ist `attachment`.
- Kontext:
  - Nicht-inline-faehige Dateitypen sollen nicht im Browser gerendert, sondern heruntergeladen werden.

### 5) `forces attachment disposition regardless of mime type when download flag is set`
- Service/Funktion: `sendAttachmentDownload`
- Given:
  - MIME-Type waere inline-faehig (`application/pdf`).
  - `forceDownload = true`.
- When:
  - Download-Helfer wird aufgerufen.
- Then:
  - `Content-Disposition` ist immer `attachment`.
- Kontext:
  - Das explizite Download-Flag muss Vorrang vor MIME-basierten Inline-Regeln haben.

## Warum diese Tests wichtig sind
- Sie verhindern unbeabsichtigte Loeschpfade fuer Attachments.
- Sie sichern ein konsistentes, vorhersehbares Browser-/Downloadverhalten.
- Sie dokumentieren die Sicherheits- und UX-Regeln rund um Dateiauslieferung.
