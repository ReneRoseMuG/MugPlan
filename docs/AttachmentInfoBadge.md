# AttachmentInfoBadge

## Zweck
`AttachmentInfoBadge` ist ein projektspezifisches InfoBadge für Anhänge. Es zeigt den Dateinamen, ein typabhängiges Icon und eine `–`-Action zum Löschen. Über Hover wird ein Preview-Popover geöffnet.

## Props
- `attachment: ProjectAttachment` – Datenquelle (Dateiname, MIME-Typ, ID).
- `onRemove?: () => void` – Delete-Action (UI-Event, keine Mutation im Badge).
- `actionDisabled?: boolean` – Deaktiviert die Delete-Action.
- `openUrl: string` – Link zum Öffnen im neuen Tab.
- `downloadUrl: string` – Link zum Download.
- `testId?: string` – Test-ID.

## Preview-Popover
- Verwendet die bestehende Popover-Struktur (`Popover`, `PopoverContent`, `PopoverTrigger`) über die InfoBadge-Preview.
- Hover-Delay und „stay open on hover“ entsprechen dem zentralen InfoBadge-Pattern.
- Toolbar enthält stets **Öffnen** und **Download**.
- Viewer ist scrollbar und zeigt vollständige Inhalte:
  - PDF: eingebettetes `<iframe>`.
  - Bilder: `<img>` in scrollbarer Fläche.
  - Word (DOC/DOCX): Fallback mit Hinweis + Öffnen/Download.

## Abhängigkeiten
- `InfoBadge` (Layout + Hover-Mechanik)
- `badge-preview-registry` (Preview-Rendering)
- `Popover`-Komponenten aus `client/src/components/ui/popover.tsx`
