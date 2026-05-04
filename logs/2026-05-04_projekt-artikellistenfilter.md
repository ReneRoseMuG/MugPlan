# Projektfilter für Artikellisten-Items

Datum: 04.05.26
Branch: `work`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `cbca019f`

## Zweck

Dieses Log dokumentiert den neuen Projektfilter `Artikelliste`. Ziel war, Projekte anhand der strukturierten Auftragspositionen aus `project_order_items` nach konkreten Sauna-Produkten und Komponenten-Kombinationen filtern zu können.

## Scope

- Im Projektfilter-Panel wurde vor dem Tagfilter ein kompakter Artikellistenfilter ergänzt.
- Der Filter öffnet einen Konfigurationsdialog mit Suche, scrollbaren Gruppen und staged Auswahl.
- Der Dialog zeigt `Sauna` aus Produkten sowie Komponenten aus den festen Artikellisten-Kategorien wie `Ofen`, `Fenster`, `Dach` und `Tür`.
- Der X-Button neben dem Toggle setzt ausschließlich den Artikellistenfilter zurück.
- `ProjectFilters` wurde um `articleProductIds` und `articleComponentIds` erweitert.
- `/api/projects` und `/api/projects/list` akzeptieren die neuen Query-Parameter.
- Die Filterlogik läuft serverseitig über `project_order_items`.
- In `docs/implementation.md` und FT-02 wurde die neue Filtersemantik dokumentiert.

## Rollen und Sichtbarkeit

- Der Filter ist rein lesend und führt keine Mutation aus.
- Alle authentifizierten Rollen, die die Projektliste sehen dürfen, dürfen den Filter sehen und nutzen.
- Admins laden Masterdaten für den Dialog mit `active=all`.
- Disponenten und Leser laden die Masterdaten weiterhin nur mit `active=active`.
- Bestehende Projektlisten-, Masterdaten- und Rollenregeln wurden nicht aufgeweicht.

## Technische Entscheidungen

- Produktauswahl bildet die Artikellisten-Kategorie `Sauna`.
- Komponenten werden über `components.categoryId` und `component_categories.name` den festen `PROJECT_ARTICLE_FIELDS` zugeordnet.
- Innerhalb einer Artikellisten-Kategorie gilt ODER.
- Zwischen mehreren Artikellisten-Kategorien gilt UND.
- Nicht zuordenbare Komponenten-IDs führen nicht zu breiteren Treffermengen.
- Die bestehende Projektlisten-Pagination bleibt erhalten; die neuen Filter wirken vor Count und Page-Schnitt.
- Es wurde keine Schemaänderung und keine Migration erstellt.

## Betroffene Dateien

- `client/src/components/filters/project-article-filter-input.tsx`
- `client/src/components/ProjectsPage.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `client/src/lib/project-filters.ts`
- `shared/routes.ts`
- `server/controllers/projectsController.ts`
- `server/services/projectsService.ts`
- `server/repositories/projectsRepository.ts`
- `tests/unit/ui/projectArticleFilterInput.render.test.tsx`
- `tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`
- `tests/unit/ui/projectsPage.controlled-state.test.tsx`
- `tests/unit/ui/home.listStatePersistence.wiring.test.tsx`
- `tests/integration/server/projects.paged-list.integration.test.ts`
- `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- `docs/implementation.md`
- `docs/wiki/features/ft-02-projekte/ft-02-projekte.md`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/projectArticleFilterInput.render.test.tsx tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx tests/unit/ui/projectsPage.controlled-state.test.tsx tests/unit/ui/projectsPage.orderNumberWiring.test.tsx tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx tests/unit/ui/projectsTable.preview.test.tsx tests/unit/ui/home.listStatePersistence.wiring.test.tsx --reporter=verbose`
- `npm run test:integration -- tests/integration/server/projects.paged-list.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`
- `git diff --check`

Zusätzlich wurde nach Mojibake in allen geänderten Dateien gesucht; dabei gab es keine Treffer.

## Bekannte Einschränkungen

- `npm run check:encoding` schlägt weiterhin wegen bereits vorhandener Mojibake-Muster in älteren Wiki-Dateien fehl. Die geänderten Dateien waren in der gezielten Prüfung sauber.
- Kein vollständiger `npm run test:all` wurde ausgeführt; getestet wurden die betroffenen Unit-, Integration- und Browserpfade.
