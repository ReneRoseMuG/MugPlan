# ProjectAttachmentsPanel

## Zweck
`ProjectAttachmentsPanel` ist der Kontext-Wrapper für Projektanhänge im Projektformular. Er lädt die Attachments, führt Upload- und Delete-Mutationen aus und rendert die Liste in einem `SidebarChildPanel`.

## Props
- `projectId?: number | null` – Projekt-ID für die Attachment-Abfragen.
- `isEditing: boolean` – Steuert, ob Daten geladen und Aktionen angezeigt werden.

## Datenladung & Mutationen
- **Liste**: `GET /api/projects/<projectId>/attachments`
- **Upload**: `POST /api/projects/<projectId>/attachments` (Multipart-Upload, Feld `file`)
- **Delete**: `DELETE /api/project-attachments/<id>`
- Invalidierung: Query-Key `['/api/projects', projectId, 'attachments']`

## UI-Struktur
- Hülle: `SidebarChildPanel` (FT17-Konventionskomponente)
- Header-Action: `addAction` erzeugt den `+`-Button (kein Body-CTA)
- Body: Liste aus `AttachmentInfoBadge` + leere Zustandsanzeige

## Zählerdarstellung
- Der Zähler wird im Titel angezeigt (z.?B. „Dokumente (3)“), analog zum Termin-Panel.
- Es wird **kein** `count`-Badge von `SidebarChildPanel` verwendet.

## Interaktionen
- `+` im Header öffnet den Upload (native File-Input)
- `–` am Badge ruft Delete-Mutation auf

## Hinweise
- Keine Upload-Logik in Präsentationskomponenten.
- Kein Body-Button „Dokument hinzufügen“.
