# Auftragslog: Editor Footer Docking

## Zweck

Der Footer in Editor-Formularen mit rechter Sidebar sollte unabhängig von der Höhe der linken Hauptspalte sichtbar am unteren Bildrand der rechten Spalte angedockt bleiben. Zusätzlich musste das eingebettete Projektformular im Termin-Overlay dieselbe stabile Höhenlogik wie die regulären Vollbildformulare erhalten.

## Scope

- `EntityFormShell` auf einen eigenen Sidebar-Scroll-Layer mit gedocktem Footer umgestellt.
- Footer-Höhe in der Shell dynamisch gemessen und als unterer Scroll-Abstand der Sidebar verwendet.
- Overlay-Host des eingebetteten Projektformulars in `AppointmentForm` auf eine belastbare `h-full min-h-0`-Höhenkette umgestellt.
- Relevante Unit- und Browser-Tests für Shell, Projektformular und Termin-Projekt-Overlay erweitert.
- `docs/TEST_MATRIX.md` passend zu den erweiterten Tests aktualisiert.

## Technische Entscheidungen

- Kein formularspezifischer Sonderweg pro Editor-Formular: Das Docking-Verhalten wurde zentral in `client/src/components/ui/entity-form-shell.tsx` umgesetzt.
- Der Footer der rechten Spalte bleibt innerhalb der Sidebar absolut unten gedockt; der eigentliche Scrollbereich liegt in einem separaten Container mit `data-testid="entity-form-shell-sidebar-scroll"`.
- Die Footer-Höhe wird nicht hart codiert, sondern per `ResizeObserver` gemessen, damit auch mehrzeilige Aktionsleisten korrekt Platz reservieren.
- Der bekannte Overlay-Sonderfall im Terminformular wurde lokal im Host behoben, statt zusätzliche Layoutlogik in `ProjectForm` einzubauen.

## Betroffene Dateien

- `client/src/components/ui/entity-form-shell.tsx`
- `client/src/components/AppointmentForm.tsx`
- `tests/unit/ui/entityFormShell.layout.test.tsx`
- `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npx vitest run --config vitest.workspace.ts --project unit tests/unit/ui/entityFormShell.layout.test.tsx`
  - `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test -c playwright.config.ts tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
  - `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test -c playwright.config.ts tests/e2e-browser/projects.ft02.browser.e2e.spec.ts --grep "creates a fully visible project|creates product and component entries in a new project form"`

## Bekannte Einschränkungen

- Ein breiterer Lauf der gesamten Datei `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts` enthält weiterhin einen bereits vorhandenen Lösch-Blockierungsfehler mit Runtime-Overlay bei `BUSINESS_CONFLICT`. Dieser Zustand wurde in diesem Auftrag nicht fachlich verändert.
