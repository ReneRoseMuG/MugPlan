# Auftragslog: Attachment Previews — vereinheitlichtes Badge-, Einzel- und Galerie-Verhalten (FT-19/FT24)

**Datum:** 2026-03-24
**Branch:** fix/attachment-previews

---

## Zweck

Die Attachment-Previews verhielten sich je nach Einstiegspunkt unterschiedlich:
Formular-Badges, Einzel-Preview auf der Wochenkarte und Thumbnail-Galerie nutzten
nicht denselben Flow. Dadurch wurden Bild-Previews oft weit versetzt geöffnet und
die Mehrfach-Galerie im Wochenkalender unnötig breit dargestellt.

Ziel dieses Auftrags war:

- dieselbe Preview-Logik für Formular-Badges und Einzel-Preview auf der Wochenkarte,
- weiterhin große, draggable PDF-Previews,
- Bild-Previews in passender Größe nahe am Trigger,
- eine Galerie auf der Wochenkarte, die nur so breit wie ihr Inhalt ist.

---

## Scope

Betroffen war ausschließlich die Frontend-Preview-Logik für Attachments:

- Formular-Badges mit Attachment-Preview
- Wochenkalender-Terminkarte mit Attachment-Counter und Hover
- Thumbnail-Galerie bei mehreren Attachments
- zugehörige Unit-Tests und Test-Matrix

Nicht geändert wurden:

- Upload- oder Delete-Workflows
- serverseitige Attachment-Queries oder Counter-Berechnung
- Attachment-Datenmodelle, Contracts oder API-Routen

---

## Technische Entscheidungen

### 1. Gemeinsame Preview-Mechanik für Badge und Einzel-Preview

Die zentrale Logik bleibt in `attachment-info-badge-preview.tsx`.
Der bestehende draggable Preview-Trigger wurde so erweitert, dass er nicht nur das
Standard-Attachment-Preview rendern kann, sondern bei Bedarf auch generischen
Preview-Content annimmt. Dadurch kann die Wochenkarte für Einzel-Attachments
denselben Trigger- und Drag-Flow verwenden wie das Formular-Badge.

### 2. Bild-Previews werden nach realer Portalgröße positioniert

Die Startposition eines Previews wurde bisher mit der maximal möglichen Popover-Breite
berechnet. Für Bilder ist diese Annahme oft zu groß, weil Bild-Previews nur mit
`maxWidth` statt fixer Breite gerendert werden. Dadurch konnte das Portal beim
Linksausweichen weit vom Trigger entfernt landen.

Die Positionierungslogik wurde in eine eigene Hilfsfunktion ausgelagert und nach dem
Rendern per `useLayoutEffect` auf Basis der tatsächlichen Portalgröße nachkorrigiert.
So bleiben Bild-Previews näher am Mauszeiger bzw. Trigger.

### 3. Bilder erhalten keinen künstlichen maxHeight-Container mehr

Für Bilder wurde der `maxHeight`-Inline-Style am Content-Container entfernt.
Damit folgt das Rendering wieder dem bereits testseitig beschriebenen Soll:
natürliche Bilddarstellung innerhalb des Popovers statt zusätzlicher künstlicher
Höhenbegrenzung auf Container-Ebene.

### 4. Wochenkalender: Einzel-Preview direkt, Galerie nur für Mehrfachfall

Bei genau einem Attachment auf der Wochenkarte wird kein separater Gallery-/Hover-
Zwischenschritt mehr verwendet. Stattdessen öffnet der gemeinsame Attachment-Preview-
Trigger direkt das Preview.

Bei mehreren Attachments bleibt die Thumbnail-Galerie erhalten. Der Hover-Container
erzwingt dafür aber keine große Mindestbreite mehr.

### 5. Galeriebreite wieder inhaltsgetrieben

Die Galerie-Komponente wurde auf ein inhaltsgetriebenes Inline-Layout zurückgeführt.
Zusätzlich wurde im Hover-Wrapper die feste `minWidth` entfernt. Dadurch ist die
Mehrfachvorschau nicht mehr so breit wie ein großes PDF-Preview, sondern nur so breit
wie ihre tatsächlichen Thumbnails.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `client/src/components/ui/badge-previews/attachment-info-badge-preview.tsx` | Preview-Trigger erweitert, Portal-Positionierung extrahiert, Bild-Preview ohne maxHeight, Nachkorrektur per Layout-Effekt |
| `client/src/components/calendar/CalendarWeekAppointmentAttachmentsHover.tsx` | Einzel-Attachment auf gemeinsamen Preview-Trigger umgestellt, Mehrfachfall weiter als Hover-Galerie |
| `client/src/components/calendar/CalendarWeekAppointmentAttachmentsGallery.tsx` | Galerie-Container auf inhaltsgetriebene Breite umgestellt |
| `tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx` | Bild-Rendering und Portal-Positionierung erweitert abgesichert |
| `tests/unit/ui/attachmentPreview.drag.wiring.test.tsx` | Drag-Handle-Test auf verdrahteten Handler ausgerichtet |
| `tests/unit/ui/attachmentCounter.staleGuard.wiring.test.tsx` | Stale-Guard auf neuen Einzel-Preview-Trigger angepasst |
| `tests/unit/ui/calendarWeekAppointmentAttachmentsHover.previewModes.test.tsx` | neuer Test für Moduswechsel Einzel-Preview vs. Galerie-Hover |
| `docs/TEST_MATRIX.md` | neue/erweiterte Testeinträge gepflegt |

---

## Hinweise zum Testen

Gezielt ausgeführt wurde:

```bash
npm run test:unit -- tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx tests/unit/ui/attachmentPreview.drag.wiring.test.tsx tests/unit/ui/attachmentCounter.staleGuard.wiring.test.tsx tests/unit/ui/calendarWeekAppointmentAttachmentsHover.previewModes.test.tsx
```

Ergebnis:

- 4 Testdateien
- 25 Tests
- 25/25 grün

---

## Bekannte Einschränkungen

- Die gezielten Unit-Tests decken Rendering, Moduswechsel und Positionierungslogik ab,
  aber nicht die echte Mausinteraktion im Browser bis ins Pixel-Detail.
- Für das reale subjektive Verhalten von Bild-Previews nahe am Mauszeiger ist eine
  zusätzliche kurze manuelle Browser-Prüfung weiterhin sinnvoll.
- Ein voller Audit oder voller Testlauf wurde in diesem Auftrag noch nicht ausgeführt.
