# Projekt Products Refactor und Unit-Fix

## Zweck

Umsetzung der angeforderten Umstrukturierung des Projektformulars mit echter Artikelliste auf Basis von `project_order_items`, neuem komponentenbasiertem Auswahl-Dialog, geänderter Beschreibungspersistenz, angepasstem Dokument-Extrakt-Workflow für Projekt- und Terminformular sowie anschließender Stabilisierung des Unit-Testbestands.

## Scope

- Lokalen Branch `refactor/project-products` angelegt und nach `origin/refactor/project-products` gepusht
- Projektformular um fünf Produktslots erweitert: `Saunamodell`, `Ofen`, `Steuerung`, `Dach`, `Fenster`
- Neue UI-Komponente `ComponentDropdown` auf Basis von `CollectionDropDown` eingeführt
- Artikelliste serverseitig und clientseitig über `project_order_items` angebunden
- Neues Verhalten für Projekte ohne ID: Produktauswahl lokal puffern und nach Projektanlage nachpersistieren
- Projektbeschreibung in zusammengesetztes HTML aus `Artikelliste` und `Beschreibung` überführt
- Dokument-Extrakt im Terminformular auf modal geöffnetes, vorbefülltes Projektformular umgestellt
- Temporäre Anzeige `Extrahierte Artikelliste` ergänzt, ohne Persistenz
- Kategorienamen im Stammdatenbereich auf die neuen Zielkategorien vereinheitlicht
- Migration, Tests und Test-Matrix ergänzt bzw. angepasst
- Abschließend alle Unit-Tests ausgeführt und die roten Tests auf den refaktorierten Ist-Stand korrigiert

## Technische Entscheidungen

- Die bestehende Architektur Route → Controller → Service → Repository blieb erhalten; die vorhandenen `projects.orderItems.*`-Contracts wurden statt neuer Parallel-API serverseitig verdrahtet.
- `ProjectForm` führt die Artikelliste als strukturierten Formularzustand und nicht als aus `descriptionMd` abgeleitete Darstellung.
- Für neue Projekte werden Produktslots lokal gehalten, bis eine echte `projectId` und `project_order.orderNumber` vorliegen; danach erfolgt die serielle Persistenz in `project_order_items`.
- Die Beschreibung wird beim Speichern als HTML in dieser Reihenfolge aufgebaut:
  - `<h2>Artikelliste</h2>` plus gerenderte Artikelliste
  - `<h2>Beschreibung</h2>` plus Inhalt des Rich-Text-Editors
- Beim Laden wird nur der Bereich ab `H2 Beschreibung` zurück in den Editor extrahiert; die sichtbare Artikelliste wird aus `project_order_items` aufgebaut.
- Der Dokument-Extrakt im Terminformular legt kein Projekt mehr direkt an, sondern öffnet ein neues modales `ProjectForm` mit Vorbelegung.
- Die Extraktionsdatei bleibt im neuen Flow erhalten und wird beim erfolgreichen Speichern des neuen Projekts weiterhin per bestehender Duplikatprüfung und Upload-Endpoint als Projekt-Attachment verknüpft; die Upload-Logik liegt nun im `ProjectForm`.
- Die Komponentenkategorien wurden fachlich auf die Zielnamen vereinheitlicht; dafür wurde eine neue Migration angelegt.

## Betroffene Dateien

- `client/src/components/AppointmentForm.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/ProjectOrderForm.tsx`
- `client/src/components/ui/component-dropdown.tsx`
- `client/src/lib/project-product-form.ts`
- `server/bootstrap/ensureMasterDataDefaults.ts`
- `server/controllers/projectsController.ts`
- `server/repositories/projectsRepository.ts`
- `server/routes/projectsRoutes.ts`
- `server/seed/productComponentSeeder.ts`
- `server/services/masterDataService.ts`
- `server/services/projectsService.ts`
- `shared/routes.ts`
- `migrations/0007_project_product_categories_and_order_items.sql`
- `migrations/meta/0007_snapshot.json`
- `migrations/meta/_journal.json`
- `tests/integration/server/masterData.ft27.integration.test.ts`
- `tests/integration/server/projects.order-items.integration.test.ts`
- `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
- `tests/unit/lib/projectProductForm.description.test.ts`
- `tests/unit/services/masterDataService.ft27.test.ts`
- `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
- `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
- `tests/unit/ui/projectForm.amountWiring.test.tsx`
- `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests und Prüfungen

Ausgeführt am 10. März 2026:

- `npm run check`
  - erfolgreich
- `npm run test:unit -- tests/unit/lib/projectProductForm.description.test.ts tests/unit/ui/projectForm.documentExtractionFlow.test.tsx tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx tests/unit/services/masterDataService.ft27.test.ts`
  - erfolgreich
- `npm run test:integration -- tests/integration/server/projects.order-items.integration.test.ts tests/integration/server/masterData.ft27.integration.test.ts`
  - erfolgreich
- `npm run test:integration -- tests/integration/server/projects.order-items.integration.test.ts tests/integration/server/masterData.ft27.integration.test.ts tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
  - nicht vollständig erfolgreich; zwei bestehende Testdefekte in `demoSeed.appointments.constraints.integration.test.ts` greifen auf `projects.orderNumber` zu, obwohl die Auftragsnummer über `project_order` läuft
- `npm run test:unit`
  - zunächst fehlgeschlagen mit zwei roten Tests:
    - `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
    - `tests/unit/ui/projectForm.amountWiring.test.tsx`
  - danach Testanpassung auf den refaktorierten Ist-Stand
  - erneuter Lauf erfolgreich: `164` Testdateien, `600` Tests grün

## Bekannte Einschränkungen

- Die breitere Integrationssuite enthält weiterhin zwei bereits bestehende Defekte in `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`; diese wurden in diesem Auftrag nicht fachlich umgebaut.
- Im erfolgreichen Unit-Lauf bleibt ein nicht blockierender Sourcemap-Hinweis zu `node-cron` aus `node_modules`.
- Die Logik für das Attachment-Linking beim Termin-Extrakt liegt nach dem Refactor nicht mehr im `AppointmentForm`, sondern im `ProjectForm`; deshalb musste die Unit-Absicherung auf den tatsächlichen Ort der Logik angepasst werden.
