# Auftragslog: Attachment Preview — Bilder in Originalgröße (FT-19)

**Datum:** 2026-03-24
**Branch:** work

---

## Zweck

Bilder im Attachment-Preview-Popover wurden bisher in denselben Container mit
`maxHeight`-Inline-Style eingebettet wie PDFs und Dokumente. Das führte dazu,
dass kleine Bilder gestreckt oder in einem zu großen Container angezeigt wurden
und große Bilder willkürlich abgeschnitten wurden.

Ziel: Bilder erscheinen in ihrer natürlichen Größe. Die einzige Obergrenze ist
der Popover selbst (`popoverMaxHeight` der gewählten Preview-Size), der bereits
über `options.maxHeight` gesteuert wird. `overflow-auto` sorgt dafür, dass sehr
große Bilder scrollbar bleiben.

---

## Technische Entscheidung

Der `isImage`-Zweig wurde aus dem gemeinsamen Content-Container herausgezogen.
Statt eines gemeinsamen `<div style={{ maxHeight }}>` für alle Typen gibt es
jetzt zwei Zweige:

- **Bilder:** `<div className="overflow-auto …">` — kein `maxHeight`-Inline-Style
- **Alle anderen (PDF, Word, Txt, Fallback):** `<div … style={{ maxHeight: dimensions.contentMaxHeight }}>` — unverändert

Die Funktion `resolveAttachmentPreviewDimensions` und `createAttachmentInfoBadgePreview`
wurden nicht verändert. `hover-preview.tsx` und `attachment-info-badge.tsx` wurden
nicht angefasst.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `client/src/components/ui/badge-previews/attachment-info-badge-preview.tsx` | Bild-Zweig aus gemeinsamen Container extrahiert, kein `maxHeight` für Bilder |
| `tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx` | Scope-Kommentar ergänzt, 3 neue Tests hinzugefügt |

---

## Testergebnis

```
✓ resolves explicit option sizes for small, medium and large
✓ keeps size profiles ordered from small to large
✓ renders dynamic container and iframe heights from the selected profile  (PDF — unverändert grün)
✓ renders image without a maxHeight constraint on the content container   (neu)
✓ renders image the same way regardless of previewSize                    (neu)
✓ renders PDF with maxHeight on content container                         (neu)

6/6 Tests grün
```

---

## Bekannte Einschränkungen

Keine. Der Fix ist vollständig in einer Datei eingekapselt.
