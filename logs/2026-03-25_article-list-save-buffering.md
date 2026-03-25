# Auftragslog – Artikellisten-Persistierung: Save-Event-Buffering

**Datum:** 2026-03-25
**Branch:** `refactor-product-item-list` (von `work` abgezweigt)
**Auftragsklasse:** Klasse 5 – Mehrschichtige Änderung / neues Feature
**Commits:** 3 (je ein Commit pro Teilaufgabe)

---

## Zusammenfassung

Drei zusammenhängende Teilaufgaben wurden auf demselben Branch umgesetzt:

1. **Task 01** – Neuer Endpunkt `PUT /api/projects/:id/order-items` (atomarer Artikellisten-Ersatz)
2. **Task 02** – Client-Umstellung: Artikelliste wird erst bei Save persistiert
3. **Task 03** – Browser-E2E-Tests für das neue Save-Event-Verhalten

Das Kernziel: Im Edit-Modus des `ProjectForm` werden Dropdown-Auswahlen in der Artikelliste
nicht mehr sofort per API-Call persistiert. Stattdessen verhalten sich Create- und Edit-Modus
identisch – Auswahlen leben im React-State und werden erst beim Klick auf „Projekt speichern"
über einen einzigen atomaren `PUT`-Aufruf geschrieben.

---

## Task 01 – Neuer Endpunkt: PUT /api/projects/:id/order-items

### Zweck

Einen Endpunkt bereitstellen, der die gesamte Artikelliste eines Projekts in einer einzigen
DB-Transaktion atomar ersetzt: alle bestehenden `project_order_items` löschen, danach die
übergebene Liste neu einfügen.

### Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `shared/routes.ts` | `api.projects.orderItems.replace` ergänzt |
| `server/repositories/projectsRepository.ts` | `replaceProjectOrderItems()` angehängt |
| `server/services/projectsService.ts` | `replaceProjectOrderItems()` angehängt |
| `server/controllers/projectsController.ts` | Handler `replaceProjectOrderItems()` angehängt |
| `server/routes/projectsRoutes.ts` | Eine `router.put()`-Zeile ergänzt |
| `tests/integration/server/projects.replace-order-items.integration.test.ts` | Neue Datei, 8 Tests |
| `docs/TEST_MATRIX.md` | Neuer Eintrag |

### Technische Entscheidungen

- **Contract-First**: Route wurde zuerst in `shared/routes.ts` definiert, bevor Controller oder
  Route registriert wurden.
- **Kein Versions-Check**: Der Replace-Endpunkt ist bewusst nicht versionsbasiert. Er ersetzt
  blind. Gleichzeitig schreibende Clients können sich überschreiben – das ist per Aufgabe so
  spezifiziert.
- **Keine Kategorie-Exclusivity-Logik**: Die `deleteConflicting*`-Hilfsfunktionen aus
  `createProjectOrderItem` werden beim Replace nicht benötigt – die übergebene Liste wird 1:1
  geschrieben.
- **Pfad-Kollision ausgeschlossen**: `PUT /api/projects/:id/order-items` vs.
  `PUT /api/projects/:id/order-items/:itemId` – Express unterscheidet beide durch unterschiedliche
  Pfad-Segment-Anzahl. Der `update`-Eintrag wurde vor `replace` registriert; da `:itemId` ein
  nicht-leeres Segment verlangt, trifft Express immer den richtigen Handler.
- **Kein `insertProjectOrderItemSchema`-Import im Controller**: Statt direktem Import wurde
  `api.projects.orderItems.replace.input.parse(req.body)` verwendet – konsistent mit dem
  bestehenden Muster aller anderen Order-Items-Handler.

### Integrationstests (8 Testfälle, alle grün)

1. PUT mit leerer Liste auf Projekt ohne Items → 200, leere Liste
2. PUT mit zwei Items (Produkt + Komponente) auf leeres Projekt → 200, GET bestätigt zwei Items
3. PUT überschreibt bestehende Items vollständig → altes Item nicht mehr vorhanden
4. PUT mit leerer Liste löscht alle bestehenden Items
5. Idempotenz: zweimaliger PUT mit gleicher Liste liefert dasselbe Ergebnis
6. Atomarität: ungültiges Item (productId + componentId beide gesetzt) → 422, ursprünglicher
   Stand erhalten
7. Inaktives Produkt → 409 `INACTIVE_ENTITY_ASSIGNMENT`
8. Nicht existierendes Projekt → 404

### Verifikation

```
npm run test:integration -- projects.replace-order-items --reporter=verbose  → 8/8 grün
npm run lint  → grün
npm run check  → grün
```

---

## Task 02 – Client: Artikelliste wird erst bei Save persistiert

### Zweck

Im Edit-Modus des `ProjectForm` werden Dropdown-Auswahlen nicht mehr sofort per API persistiert.
Create- und Edit-Modus verhalten sich danach identisch: Auswahlen leben im React-State, Speichern
schreibt die gesamte Liste atomar über `PUT /api/projects/:id/order-items`.

### Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `client/src/components/ProjectForm.tsx` | Hauptänderung – 134 Zeilen entfernt, 81 hinzugefügt |

### Technische Entscheidungen

**Entfernt:**

- `upsertExistingProjectSelection` (POST auf `/order-items` bei Dropdown-Auswahl im Edit-Modus
  für feste Felder)
- `upsertExistingDynamicSelection` (analog für dynamische Slots)
- DELETE-Calls beim Abwählen im Edit-Modus in `handleFieldSelection` und
  `handleDynamicFieldSelection`
- Edit-Modus-Zweige (`if (isEditing && effectiveProjectId)`) in beiden Selection-Handlern

**Vereinfacht:**

- `handleFieldSelection` ist jetzt synchron (kein `async` mehr nötig), behandelt Create- und
  Edit-Modus identisch: State setzen, `itemId` und `version` bleiben `null`.
- `handleDynamicFieldSelection` analog vereinfacht.

**Neu hinzugefügt:**

- `persistArticleList(targetProjectId, orderNumber)`: Baut die Items-Liste aus `productSelections`
  und `dynamicProductSelections` auf und ruft `PUT /api/projects/:id/order-items` auf. Bei
  Fehler wird ein `toast` mit Fehlermeldung ausgegeben, das Projekt ist aber bereits gespeichert.
- In `handleSubmit` Edit-Zweig: nach `updateMutation.mutateAsync` wird `persistArticleList`
  aufgerufen (mit eigenem try-catch).

**Bewusst unverändert gelassen:**

- `persistBufferedOrderItems` (Create-Modus bleibt wie bisher)
- `handleCreateForField` / `handleCreateForSlot`: Diese Funktionen POST-en beim Anlegen eines
  neuen Artikels über den Dialog sofort auf `/order-items`. Das ist eine bewusste Ausnahme vom
  Buffering-Prinzip: Der neu angelegte Artikel muss direkt dem Projekt zugeordnet werden, weil
  er sonst beim nächsten PUT (Save) nicht im State wäre und verloren ginge.
- `didInitializeCreateFormRef`: Ref-Guard für den Create-Initialisierungseffekt – schützt
  `productSelections` vor erneutem Reset bei Re-Render. Nicht angefasst.
- `mapProjectOrderItemsToSelections`: Wird beim Laden verwendet, bleibt unverändert.

**Import ergänzt:**

- `InsertProjectOrderItem` zu `@shared/schema`-Import hinzugefügt.

### Risiken und bekannte Einschränkungen

- Die Funktion `persistArticleList` prüft die `orderNumber` nicht gegen das Projekt (kein
  `BUSINESS_CONFLICT`-Check wie in `createProjectOrderItem`). Das ist bewusst: Im Edit-Modus
  ist die `orderNumber` aus `projectData.project.orderNumber` bereits die gültige, gespeicherte
  Nummer. Ein Mismatch ist nicht möglich.
- `quantity` wird fest auf `1` gesetzt – identisch mit dem bisherigen Create-Verhalten.

### Verifikation

```
npm run check  → grün
npm run lint   → grün
```

Manuelle Verifikation (DevTools Network-Tab) steht noch aus:
1. Edit-Modus: Produkt A wählen, Produkt B wählen → kein Netzwerk-Call
2. Edit-Modus: Speichern → genau ein PUT auf `/api/projects/:id/order-items`
3. Edit-Modus: Schließen ohne Speichern nach Auswahländerung → Close-Confirm erscheint
4. Edit-Modus: Schließen, wieder öffnen → ursprüngliche Werte aus DB geladen

---

## Task 03 – Browser-E2E-Tests: Artikellisten-Persistierung

### Zweck

Das neue Save-Event-Verhalten der Artikelliste im Projektformular end-to-end im Browser absichern.

### Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts` | Neue Datei, 8 Tests |
| `docs/TEST_MATRIX.md` | Neuer Eintrag |

### Technische Entscheidungen

- **Stil**: Analog zu `projects.ft02.browser.e2e.spec.ts` – gleiche Struktur, gleiche Helpers.
- **Kein Network-Intercept**: `page.on("request", ...)` wird bewusst nicht verwendet; API-Prüfungen
  über `page.request.get()` sind in seriellen Playwright-Suites robuster.
- **DB-Stand-Prüfung**: Jeder Test prüft nach UI-Aktionen den tatsächlichen DB-Stand über
  `GET /api/projects/:id/order-items`, nicht nur den UI-State.
- **`expect.poll`**: Wird für asynchrone DB-Checks nach Save-Aktionen eingesetzt.
- **Dirty-Check-Test**: Wartet explizit auf `toHaveValue(String(productA.id))` bevor die neue
  Auswahl getroffen wird – notwendig, weil der initiale Snapshot erst nach Laden der
  Order-Items-Query gesetzt wird. Ohne dieses Warten würde der Dirty-Check nicht greifen.

### Testfälle (8)

| Nr | Modus | Beschreibung |
|---|---|---|
| 1 | Create | Dropdown-Auswahl erzeugt keinen DB-Eintrag vor dem Speichern |
| 2 | Create | Save schreibt Produkt und Komponente in die DB |
| 3 | Create | Dreifachwechsel → nach Save genau ein Item (das zuletzt gewählte) |
| 4 | Edit | Dropdown-Auswahl erzeugt keinen PUT vor dem Speichern |
| 5 | Edit | Save ersetzt altes Item durch neues, kein Leichen-Eintrag |
| 6 | Edit | Abbrechen ohne Speichern → DB bleibt unverändert, Reopen zeigt Original |
| 7 | Edit | Abwahl (leerer Wert) + Save → Item aus DB entfernt |
| 8 | Edit | Dirty-Check erscheint nach Artikellisten-Änderung ohne Save |

### Hinweis zum Ausführen

```
npm run test:e2e:browser -- --grep "article-list-save-behavior"
```

Voraussetzung: laufender Dev-Server (`npm run dev`). Die Tests sind in `serial` mode – sie
teilen einen DB-Reset in `beforeAll` und laufen sequenziell.

**Noch zu bestätigen** bei Ausführung gegen laufenden Server:
- `button-close-project` Test-ID existiert im ProductForm
- Confirm-Dialog für Dirty-Check enthält Text der auf `/verwerfen/i` matcht
- `select-project-product-saunaModel` / `select-project-product-oven` Test-IDs

---

## Bekannte Einschränkungen / Offene Punkte

- Browser-E2E-Tests wurden noch nicht gegen einen laufenden Server ausgeführt (Voraussetzung:
  laufender Dev-Server). Test-IDs in den Selektoren müssen bei der ersten Ausführung bestätigt
  werden.
- `persistBufferedOrderItems` im Create-Modus könnte auf `persistArticleList` umgestellt werden
  (Vereinheitlichung) – ist explizit nicht Teil dieser Aufgaben.
- Die bestehenden POST/PUT/:itemId/DELETE/:itemId-Endpunkte werden clientseitig nach Task 02
  nicht mehr für reguläre Dropdown-Auswahlen aufgerufen, aber serverseitig nicht entfernt
  (außerhalb des Aufgabenscopes).

---

## Git-Historie (Branch `refactor-product-item-list`)

```
f265d84  test(e2e): browser tests for article list save buffering
f1fb975  feat: buffer article list in state, persist on save (edit mode)
5b52e26  feat: add PUT /api/projects/:id/order-items replace endpoint
33ef311  (work) Merge branch 'fix/attachment-context-invalidation' into work
```
