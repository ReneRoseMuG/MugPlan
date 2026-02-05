# FT17 - Attachments Panel Umsetzung

## Bestandsaufnahme (vor Implementierung)
- Popover-Struktur vorhanden: `client/src/components/ui/popover.tsx` und Hover-Preview in `client/src/components/ui/info-badge.tsx`.
- Attachment-Endpunkte vorhanden: GET `/api/projects/:projectId/attachments`, DELETE `/api/project-attachments/:id`.
- Attachment-Create in `shared/routes.ts` definiert, aber serverseitig nicht implementiert.
- Dokumente-UI befindet sich aktuell in `client/src/components/ProjectForm.tsx` inklusive Body-Button "Dokument hinzufügen".
- Keine bestehende Upload-Logik, kein Storage-Serving, keine Word-PDF-Preview-Strategie.
- Storage-Entscheidung: `server/uploads` als Upload-Ziel, Download über `/api/project-attachments/:id/download`.

## Umsetzung & Wiederverwendung
- Popover-Pattern wiederverwendet: `client/src/components/ui/popover.tsx` + Hover-Logik aus `InfoBadge` (Preview-Registry).
- Attachment-Preview in `badge-preview-registry` ergänzt; keine neue Popover-Architektur.
- Neuer Wrapper: `ProjectAttachmentsPanel` nutzt `SidebarChildPanel` und ersetzt die bisherige Dokumente-Sektion in `ProjectForm`.
- Neuer Badge: `AttachmentInfoBadge` nutzt `InfoBadge` und liefert `badgeType="attachment"`.

## API/Backend Änderungen
- POST `/api/projects/:projectId/attachments` implementiert (Multipart-Upload, Feld `file`, 10 MB Limit).
- GET `/api/project-attachments/:id/download` implementiert (inline für PDF/Bilder, sonst attachment).
- Repository/Service/Storage um `getProjectAttachmentById` und `createProjectAttachment` erweitert.

## Upload/Preview/Delete Check
- Manuelle Prüfung nicht durchgeführt (keine laufende UI/Runtime in dieser Sitzung).
- Prüfpunkte laut Plan: Upload PDF/Bild/DOCX, Preview-Scroll, Delete via `–`, Header-Action `+`.
