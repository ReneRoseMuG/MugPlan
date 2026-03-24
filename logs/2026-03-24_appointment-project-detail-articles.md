# Projekt-Artikelliste nach Overlay-Rückkehr im Terminformular

## Zweck

Behebung eines Fehlers im Workflow `neuer Termin -> Dokumentextrakt -> neues Projekt als Overlay`, bei dem der Projektslot nach dem Speichern des Projekts im Terminformular auf einen unvollständigen Detail-Fallback zurückfiel und deshalb statt der Artikelliste den Fallback `nicht hinterlegt` zeigte.

## Scope

- Detailvertrag `GET /api/projects/:id` um `projectArticleItems` erweitert
- Repository-/Service-Pfad für `getProjectWithCustomer` an die bestehende Listenaggregation angeglichen
- Terminformular-Fallback im `AppointmentForm` auf den erweiterten Detailvertrag umgestellt
- gezielte Regressionstests für Integration, Unit und Browser-E2E ergänzt
- `docs/TEST_MATRIX.md` aktualisiert

Nicht enthalten:

- Änderungen an der Mengenlogik von `/api/projects?filter=all&scope=all`
- zusätzliche Cache- oder Overlay-Refactorings
- allgemeine UI-Anpassungen außerhalb des betroffenen Projektslots

## Technische Entscheidungen

- Der Fix bleibt minimal-invasiv und verwendet keinen neuen Endpoint und keinen neuen Query-Parameter.
- Die serverseitige Wahrheit für `projectArticleItems` bleibt die bestehende Aggregation aus den Projekt-Order-Items; der Detailpfad nutzt jetzt dieselbe Quelle wie die Projektlisten.
- Im Frontend bleibt die Priorität unverändert: Listenprojekt vor Detailprojekt. Der sichtbare Fehler wird allein durch den vollständigen Detailvertrag behoben.
- Der bestehende Rückweg aus dem Projekt-Overlay bleibt funktional unverändert und setzt weiterhin nur die Projekt-ID zurück in das Terminformular.

## Betroffene Dateien

- `server/repositories/projectsRepository.ts`
- `server/services/projectsService.ts`
- `server/storage.ts`
- `shared/routes.ts`
- `client/src/components/AppointmentForm.tsx`
- `tests/integration/server/projects.paged-list.integration.test.ts`
- `tests/unit/ui/appointmentForm.relationSlots.test.tsx`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Erfolgreich ausgeführt:

- `npm run check`
- `npm run test:unit -- tests/unit/ui/appointmentForm.relationSlots.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/projects.paged-list.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`

Gezielt abgesicherte Fälle:

- `/api/projects/:id` liefert `projectArticleItems` in stabiler Reihenfolge
- `/api/projects/:id` liefert bei leeren Projektdaten `projectArticleItems: []`
- `AppointmentForm` kann ein Projekt außerhalb von `scope=all` per Detailpfad mit Artikelliste nachladen
- Nach dem Save des im Termin-Overlay angelegten Projekts zeigt der Projektslot wieder die sichtbare Artikelliste statt `nicht hinterlegt`

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Gesamttestlauf über alle Pflichtkommandos aus `agents.md` durchgeführt, sondern nur die für diesen Fix relevanten Verifikationen.
- Die bestehende Regel, dass `scope=all` Projekte ohne Termine nicht liefert, bleibt unverändert und wird weiterhin über den Detail-Fallback abgefangen.
