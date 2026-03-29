# Log: Info-Panels & Board-/Table-Views überarbeiten

**Datum:** 2026-03-28
**Branch:** `feature/info-panels-board-table-views`
**Auftragsklasse:** 5 – Mehrschichtige Änderung / neues Feature

---

## Zweck

Wiederverwendbare UI-Panel-Komponenten für Kunden- und Projektdaten einführen, `attachmentsCount` serverseitig in beiden paginierten List-Endpunkten aggregieren und Board-/Table-Views auf die neuen Panels umstellen. Attachment-HoverPreviews direkt in Board-Karten und Table-Previews integrieren.

---

## Scope

### Neue Dateien

- `client/src/components/ui/customer-info-panel.tsx`
  Drei Modi (`collapsed` / `semiexpanded` / `expanded`). `collapsed` ist in `HoverPreview` eingebettet (zeigt `expanded`-Inhalt als Vorschau). `hideHeader` blendet die `<h5>`-Zeile aus. Felder `addressLine1`, `postalCode`, `city`, `phone`, `email` sind optional und werden nur gerendert wenn befüllt.

- `client/src/components/ui/project-info-panel.tsx`
  Zwei Modi (`collapsed` / `expanded`). `collapsed` ist in `HoverPreview` eingebettet. `expanded` rendert `ProjectArticleDescriptionRenderer` mit `showSectionTitles={true}`.

- `client/src/components/ui/ProjectAttachmentsHover.tsx`
  Büroklammer-Badge mit Lazy-Loading-HoverPreview gegen `GET /api/projects/:projectId/attachments`. Bei `count === 1` wird `AttachmentPreviewTrigger` direkt verwendet; bei `count > 1` die `CalendarWeekAppointmentAttachmentsGallery`.

- `client/src/components/ui/CustomerAttachmentsHover.tsx`
  Analog zu `ProjectAttachmentsHover` gegen `GET /api/customers/:customerId/attachments`.

- `tests/unit/ui/customerInfoPanel.render.test.tsx`
  Unit-Tests für alle drei Modi, `hideHeader` und optionale Felder.

- `tests/unit/ui/projectInfoPanel.render.test.tsx`
  Unit-Tests für beide Modi, `hideHeader` und Artikel-Renderer.

### Geänderte Dateien

- `shared/routes.ts`
  `customerBoardListItemSchema` und `projectBoardListItemSchema` um `attachmentsCount: z.number().int().min(0)` ergänzt.

- `server/repositories/projectsRepository.ts`
  `ProjectBoardListItem`-Typ um `attachmentsCount: number` erweitert. In `getProjectsPaged`: neuer COUNT-Batch-Query auf `project_attachment` via `inArray + groupBy`, Ergebnis als Map, in der Mapping-Schleife zugewiesen.

- `server/repositories/customersRepository.ts`
  Analog für `customer_attachment`-Tabelle.

- `client/src/components/ProjectsPage.tsx`
  `ProjectListItem` um `attachmentsCount` erweitert. Board-View-Content durch `CustomerInfoPanel collapsed` + `ProjectInfoPanel expanded hideHeader` ersetzt. `ProjectAttachmentsHover` im Footer ergänzt. Entfernte Importe: `HoverPreview`, `ProjectArticleDescriptionRenderer`, `hasVisibleProjectCardContent`. Table-`rowPreviewRenderer` auf neues `ProjectTableHoverPreview`-Interface umgestellt.

- `client/src/components/CustomersPage.tsx`
  `CustomerListItem` um `attachmentsCount` erweitert. Board-View-Content (Building2/Phone/Mail/MapPin-Blöcke) durch `CustomerInfoPanel mode="expanded" hideHeader={true}` ersetzt. `CustomerAttachmentsHover` im Footer ergänzt. Entfernte Importe: `Building2`, `Phone`, `Mail`, `MapPin`. Table-`rowPreviewRenderer` auf neues `CustomerTableHoverPreview`-Interface umgestellt (Felder `company/phone/email/city` entfernt, `plannedAppointmentsCount`, `attachmentsCount`, `nextAppointment` ergänzt, `historicalAppointments` entfernt).

- `client/src/components/ui/table-hover-previews.tsx`
  Beide Komponenten vollständig ersetzt. `ProjectTableHoverPreview` erhält neues Prop-Interface mit `header`, `customer`, `project`, `plannedAppointmentsCount`, `attachmentsCount`, `notes`, `tags`. `CustomerTableHoverPreview` erhält `customer` (mit Adressfeldern), `notesCount`, `plannedAppointmentsCount`, `attachmentsCount`, `tags`, `nextAppointment`. `historicalAppointments` entfällt als Prop.

- `tests/integration/server/projects.paged-list.integration.test.ts`
  Neues `it`: direkter DB-Insert in `project_attachment`, prüft `attachmentsCount === 1` vs. `=== 0` in der Listantwort.

- `tests/integration/server/customers.paged-list.integration.test.ts`
  Analog für `customer_attachment`.

- `docs/TEST_MATRIX.md`
  Vier neue Einträge ergänzt: `customerInfoPanel.render.test.tsx`, `projectInfoPanel.render.test.tsx`, sowie aktualisierte Beschreibungen beider Integration-Testdateien.

---

## Technische Entscheidungen

- **Keine neuen Server-Endpunkte**: `GET /api/projects/:id/attachments` und `GET /api/customers/:id/attachments` existierten bereits. Neue Hover-Komponenten nutzen diese direkt via `useQuery`.
- **`CalendarWeekAppointmentAttachmentsHover` nicht wiederverwendbar**: Diese Komponente nimmt nur `appointmentId`. Statt eines generischen Refactors wurden zwei schlanke neue Komponenten nach gleichem Muster angelegt.
- **`attachmentsCount` additiv**: Das neue Feld ändert keine bestehenden Felder. Bestehende Clients, die es ignorieren, sind nicht betroffen.
- **`hasVisibleProjectCardContent` entfernt**: Die Funktion war nötig, weil der alte Inhalt unter bestimmten Bedingungen leer sein konnte. `ProjectInfoPanel` rendert immer eine sinnvolle Ausgabe, die Funktion wurde ersatzlos entfernt.
- **Board-View-Lücke in `CustomerInfoPanel` (collapsed)**: Im Table-Preview steht für den Kunden nur `{id, number, name}` zur Verfügung (kein Adressblock). Das `collapsed`-Modus-HoverPreview rendert daher nur Name + Nummer — kein Server-Change nötig, da der Adressblock einfach fehlt wenn nicht übergeben.

---

## Hinweise zum Testen

- **Unit-Tests**: `npm run test:unit -- customerInfoPanel projectInfoPanel`
- **Integration-Tests**: `npm run test:integration -- projects.paged-list customers.paged-list --reporter=verbose`
- **Visuell (Board-View)**: Projektkarten und Kundenkarten im Board zeigen jetzt strukturierte Panel-Inhalte statt rohe Icon-Blöcke. Anhänge-Badge erscheint im Footer nur bei `attachmentsCount > 0`.
- **Visuell (Table-Hover)**: Hover-Preview für Projekte und Kunden zeigt Header-Band + Panel-Inhalte + Footer mit allen Badges.

---

## Bekannte Einschränkungen

- `historicalAppointments` wird nicht mehr an `CustomerTableHoverPreview` übergeben. Der Server liefert das Feld weiterhin im API-Response (kein Breaking Change), es wird clientseitig nur nicht mehr genutzt. Falls das Feld künftig wieder benötigt wird, muss es als Prop ergänzt werden.
- In der Projekt-Table-Preview steht im `CustomerInfoPanel collapsed` nur Name + Nummer (kein Adressblock), weil `ProjectBoardListItem.customer` nur `{id, customerNumber, fullName, lastName}` enthält.
