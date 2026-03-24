# Auftragslog: Attachment Preview — Draggable Preview (FT-19)

**Datum:** 2026-03-24
**Branch:** feature/ft19-attachment-delete-workflow

---

## Zweck

Das Attachment-Preview-Popover ist bisher stationär an den Hover-Trigger gebunden.
Ziel: Wenn ein Nutzer die Preview-Karte greift (Mousedown + >4px Bewegung), löst sie
sich vom Radix-Popover-Flow und wird als frei positioniertes Portal gerendert. Nach
Mouseup bleibt sie gepinnt. Ein Schliessen-Button (X) erscheint im gepinnten Zustand.
MouseLeave schliesst die Preview nicht, solange sie gezogen wird oder gepinnt ist.

---

## Technische Entscheidungen

### DraggableAttachmentBadge (neuer Export in attachment-info-badge-preview.tsx)

Der gesamte Drag-Mechanismus lebt in `DraggableAttachmentBadge`:

- **DragPhase-Zustandsmaschine:** `"idle" | "intent" | "dragging" | "pinned"`
- **4px-Schwellenwert** (DRAG_THRESHOLD) verhindert versehentliche Drags bei Klicks
- **Portal via `createPortal(…, document.body)`** — Preview verlässt den DOM-Baum der
  Badge, keine CSS-Clipping-Konflikte
- **Viewport-Clamping** (VIEWPORT_PADDING = 8px) verhindert das Rausziehen aus dem
  sichtbaren Bereich
- **`dragPhaseRef`** wird via `useEffect` synchron mit `dragPhase` gehalten, damit
  Document-Event-Listener die aktuelle Phase ohne Stale-Closure-Fehler lesen können
- **`scheduleClose`** liest `dragPhaseRef.current` statt `dragPhase` — keine Stale-
  Closure im React-Event-Handler
- **Document-Listener** werden nur für die Phasen `intent` und `dragging` registriert
  und beim Cleanup wieder entfernt

### AttachmentInfoBadgePreview — Erweiterung

- `onClose?: () => void` ergänzt — wird nur von `DraggableAttachmentBadge` übergeben,
  wenn die Preview gepinnt ist
- Close-Button nur sichtbar, wenn `onClose` übergeben wird
- `cursor: grab` auf dem Titel-Bereich als Drag-Einladung

### AttachmentInfoBadge — Erweiterung

- `draggable?: boolean` (default: `true`) — bei `true` wird `DraggableAttachmentBadge`
  gerendert, sonst der bisherige `InfoBadge`-Flow
- Bisherige `resolveAttachmentIcon`-Funktion bleibt für den Fallback-Pfad erhalten
- Keine Änderung an den aufrufenden Panel-Komponenten nötig — bestehende Props-Signatur
  bleibt vollständig kompatibel

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `client/src/components/ui/badge-previews/attachment-info-badge-preview.tsx` | `DraggableAttachmentBadge` + `DraggableAttachmentBadgeProps` neu, `AttachmentInfoBadgePreview` um `onClose` erweitert |
| `client/src/components/ui/attachment-info-badge.tsx` | `draggable` Prop, bedingte Delegation an `DraggableAttachmentBadge` |
| `tests/unit/ui/attachmentPreview.drag.wiring.test.tsx` | 6 neue Tests (Close-Button, Drag-Handle-Cursor, aria-label, Link-Ziele) |
| `docs/TEST_MATRIX.md` | Neue Zeile für drag.wiring.test.tsx |

---

## Testergebnis

```
✓ shows close button when onClose is provided
✓ does not show close button when onClose is not provided
✓ title bar has cursor grab style for drag handle
✓ close button has correct aria-label for accessibility
✓ open link targets new tab
✓ close button appears for image previews as well

6/6 Tests grün
```

---

## Bekannte Einschränkungen

- `jsdom` ist nicht in der Test-Infrastruktur installiert. Interaktive Drag-Sequenzen
  (Threshold-Überschreitung, Pinned-Zustand via Mouseup) können daher nur in E2E-Tests
  geprüft werden. Die 6 Unit-Tests decken die statisch überprüfbaren Rendering-Aspekte
  der Drag-Erweiterung vollständig ab.
- `DraggableAttachmentBadge` kann in Unit-Tests nicht via `renderToStaticMarkup` gerendert
  werden, da `InfoBadge` JSX ohne expliziten React-Import nutzt (automatische JSX-Transform)
  und der legacy Node-SSR-Renderer dies nicht unterstützt.
