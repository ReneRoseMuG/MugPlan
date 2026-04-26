# Test-Review und Aussagekraftanalyse der bestehenden Test-Suite

## 1. Gesamteinschätzung

Die Suite ist derzeit **teilweise belastbar**.

Stark ist sie dort, wo echte Systemgrenzen geprüft werden: serverseitige Integrationssuiten und Browser-E2E decken zentrale Domänenpfade wie Termine, Tour-/Wochenplanung, Parken/Storno, Monitoring, Reports, Backup/Dump und ausgewählte Rollenflüsse mit echter Persistenz und nachvollziehbaren Folgeeffekten ab. Das wird auch durch die Laufbeobachtung gestützt: `test:integration` lief mit **113/113 Dateien** und **627/631 Tests** grün (4 skip), `test:e2e` mit **3/3**, `test:e2e:browser` mit **286/286** grün.

Deutlich schwächer ist die UI-nahe Unit-Schicht. Ein großer Teil dieser Tests prüft vor allem statisches Markup, TestIDs, sichtbare Strings und Mock-Verdrahtung, nicht aber reale Nutzerinteraktion, State-Übergänge oder serverseitig erzwungene Folgen. Dafür sprechen mehrere harte Indikatoren aus dem Bestand:

| Kennzahl | Befund |
|---|---:|
| Testdateien gesamt | 456 |
| grob extrahierte `it`/`test`-Blöcke | 1.963 |
| `renderToStaticMarkup`-Dateien | 147 |
| `vi.mock(...)`-lastige Dateien | 168 |
| Dateien mit Supertest/API-Harness | 103 |
| Playwright-Dateien | 68 |
| Unit/UI-Dateien gesamt | 158 |
| davon `wiring` im Dateinamen | 51 |
| davon `render` im Dateinamen | 12 |
| davon `layout` im Dateinamen | 13 |
| davon `behavior` im Dateinamen | 18 |

Die strukturelle Datei-Klassifikation der Vollinventur ergibt:

| Klasse | Bedeutung | Anzahl Dateien |
|---|---|---:|
| A | fachlich stark | 159 |
| B | sinnvoll, aber begrenzt | 111 |
| C | technischer Smoke-Test | 69 |
| D | schwach / irreführend | 89 |
| E | unklar / nur strukturell zuordenbar | 28 |

Wichtig: Diese Verteilung ist **keine Qualitätsnote pro Testfall**, sondern eine belastbare Tendenz auf Dateiebene. Der zentrale Befund bleibt: **Die Suite schützt die Kernlogik über Integration und Browser deutlich besser als über die UI-Unit-Lage.** Viele grüne UI-Unit-Tests sollten deshalb nicht als fachliche Sicherheit fehlinterpretiert werden.

Ein zusätzlicher Warnhinweis aus dem Lauf: Der einzige rote Unit-Test (`tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`) scheitert an einer **CSS-Klassenreihenfolge** statt an einer fachlichen Regel. Das zeigt exemplarisch, dass Teile der UI-Unit-Suite eher markup-fragil als fachlich belastbar sind.

## 2. Testinventur

### Methodik der Inventur

- Wahrheitsquelle 1: tatsächlicher Testquelltext.
- Wahrheitsquelle 2: lokale Doku und Testarchitektur (`agents.md`, `package.json`, `vitest*.ts`, `playwright.config.ts`, `tests/setup*.ts`, `tests/helpers/*`, `docs/TEST_MATRIX.md`, `docs/TEST_ISOLATION_REBUILD_PLAN.md`, `docs/TEST_DB_SAFETY_INVENTORY.md`, relevante Abschnitte aus `docs/implementation.md` und `docs/architecture.md`).
- Wahrheitsquelle 3: informative Notion-Features / Use Cases aus `Lastenheft`, insbesondere FT01, FT04, FT06, FT28 und FT31.

### Tief geprüft vs. strukturell klassifiziert

Wegen der Größe der Suite wurde der Auftrag zweistufig umgesetzt:

- **Vollinventur:** alle 456 Testdateien sind erfasst, mit Testtyp, Datenqualität, tatsächlicher Assertionsebene, Datei-Klassifikation und extrahierten Testfallnamen.
- **Vertiefte Einzelprüfung:** inhaltlich besonders tief geprüft wurden risikoreiche Integrations- und Browser-Suiten sowie exemplarische schwache UI-Unit-Tests und meta-lastige Helferpfade.
- **Strukturelle Klassifikation:** ein Teil der breiten UI-Unit-Lage wurde bewusst strukturell klassifiziert, weil der Mehrwert einer noch tieferen Einzelzerlegung gering war und die Befundlage bereits sehr konsistent ausfiel: statisches Markup, viele Mocks, kaum echte Interaktion.

### Vertieft geprüfte Referenzbeispiele

| Test / Datei | Testtyp | Befund | Klasse | Begründung |
|---|---|---|---|---|
| `tests/integration/server/tourWeekEmployees.integration.test.ts` | Integration | prüft echte API-, DB-, Konflikt-, Lock-, Blockierungs- und Folgeeffekte rund um FT04-Wochenplanung | A | realistische Fixtures, echte Persistenz, Negativpfade, Versionierung und Folgeeffekte |
| `tests/integration/server/monitoring.ft31.integration.test.ts` | Integration | prüft FT31 mit Rollen, Konfiguration, Triggerkombination, Parken, Historienausschluss und FT04-Folgewirkung | A | starke End-to-End-Sicherung über API + Persistenz + Konfigurationspfad |
| `tests/unit/services/appointments.cancellation.test.ts` | Unit | isoliert serverseitige Storno-Endzustandslogik inkl. Version, Tag, Projektbetrag und Historiensperre | B | fachlich relevant, aber über Repositories gemockt und daher kein echter Persistenznachweis |
| `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts` | E2E Browser | prüft Leserfluss inkl. fehlender Mutations-UI und readonly Inputs im echten Browser | A | echte Nutzerwirkung statt bloßer Sichtbarkeitsmarker |
| `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx` | Unit/UI | statisches Markup mit hartem String-Match auf CSS-Klassenreihenfolge | D | hoher Fragilitätsgrad, geringe Fachsicherheit, bereits im Lauf rot |
| `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx` | Unit/UI | bestätigt nur, dass bestimmte Props nicht weitergereicht werden | D | Verdrahtungsnachweis, aber praktisch keine fachliche Aussage |
| `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx` | Unit/UI | prüft role-basierte Sichtbarkeit über vollständig gemocktes Markup | D | UI-Verstecken belegt, aber keine serverseitige Durchsetzung und keine echte Nutzerinteraktion |
| `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx` | Unit/UI | prüft API-Aufruf und Invalidierung über gemockte Seite | D | bestätigt Verdrahtung, aber nicht die fachliche Wirkung des Seeds |
| `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx` | „Integration“ | rendert nur statisches HTML des Renderers | C | der Dateiname verspricht mehr Integration als tatsächlich vorhanden ist |
| `tests/unit/ui/projectsTable.preview.test.tsx` | Unit/UI | bessere UI-Unit als viele Wiring-Tests, weil reale Preview-Komposition geprüft wird | C | erkennt Renderer-Regressionsfehler, bleibt aber markuplastig und mockintensiv |

### Vollinventur

Der vollständige Datei- und Testfallkatalog folgt als Appendix in diesem Bericht. Dort sind **alle Testdateien** und die aus dem Quelltext extrahierten Testfallnamen enthalten.

## 3. Lückenmatrix nach Features, Use Cases und Geschäftsregeln

| Feature / Regel | Zugeordnete Tests / Testfamilien | Absicherung | Verbleibende Lücke |
|---|---|---|---|
| FT01 Kalendertermine: Anlegen, Bearbeiten, Direkttermine, Validierung, Overlap, Historie, Optimistic Locking, Storno | zahlreiche `appointments.*`-Integrationsdateien, Browser-Flows, `appointments.cancellation.test.ts`, Invariants | **weitgehend vollständig** | UI-Units zu Formular-/Listenoberflächen sind oft nur markup- bzw. wiring-lastig und belegen reale Bearbeitungsinteraktion kaum |
| FT04 Tourenplanung / Wochenplanung | `tourWeekEmployees.integration`, `ft04.tour-employee-cascade.*`, `tour-week-form.browser`, Service-/UI-Regeltests | **weitgehend vollständig** | viele ergänzende UI-Unit-Tests rund um Karten/Formulare sind nur Verdrahtungsnachweise und sollten nicht als fachlicher Kernschutz gezählt werden |
| FT06 automatische Regeln (Geparkt, Parkplatz, Reklamation, Messe, Storno-Folgen) | `appointments.park.*`, `appointment-cancellation.*`, `tag-rule-engine.*`, `useTagRuleEngine.test.ts` | **weitgehend vollständig** | domänenübergreifende Konsistenz wird stark über Integration/Browser getragen; einige Unit-Teile sind stark gemockt |
| FT28 universelles Tagging-System | Tag-API-/Seed-/Picker-/Workflow-Tests, Browser-Tagging-Flows | **teilweise bis stark** | sehr viele Tag-UI-Unit-Tests prüfen nur Picker-/Badge-Markup, nicht den fachlichen Nutzen oder serverseitige Pickerfilterung als Gesamtverhalten |
| FT31 Monitoring | `monitoring.ft31.integration`, `monitoringService.ft31.test.ts`, Reader-/Navigation-/Browser-Flows | **stark** | Login-Hinweis, Counter, Triggerkombinationen und Konfiguration sind gut gesichert; Restlücke eher in UI-Unit-Tiefe als in Kernlogik |
| Rollen / Berechtigungen / Readonly | Reader-Browsertests, ausgewählte Visibility-Integrationen, einzelne readonly-/wiring-Units | **teilweise** | sehr viele Tests beweisen nur UI-Verstecken. Außerhalb expliziter Integrationspfade bleibt serverseitige Durchsetzung oft indirekt oder unbelegt |
| Reports / Druck / FT26 / Tourenplan | Browser-Reportflüsse, Integrationen, viele `tourenplan*.wiring`- und Registry-Tests | **teilweise bis stark** | eigentliche Report- und Datenpfade sind gut abgesichert; die breite Unit-Lage ist aber oft nur statischer Print-/Panel-Markupschutz |
| Backup / Dump / FT07 | `admin.dump.integration`, `settingsPage.backup.browser`, `dumpService.test.ts` | **stark** | Abhängigkeit von Testinfrastruktur bleibt hoch; echte Mehrnutzer-/Fehlerfallkombinationen sind begrenzt |
| Seed / Systemzustände / Testisolation | `admin.system-seed.integration`, `testIsolation*`, `resetDatabaseGuard`, `dbStartupGuard` | **teilweise bis stark** | sehr gute Meta-Absicherung der Testinfrastruktur, aber diese Meta-Tests ersetzen keine breite Pollution-Prüfung aller fachlichen Suiten |
| Migrationen / Schema-Synchronität | Guard- und Seed-Tests, Dump-/DB-Sicherheitsinventar | **oberflächlich** | es gibt keinen gleichwertig starken fachlichen Testbeleg für die gesamte Migrationskette auf Dev/Test wie in den Repo-Regeln gefordert |
| Mehrnutzer- / Parallelitätsrisiken | Optimistic-Locking- und ausgewählte Konflikttests | **teilweise** | punktuelle Abdeckung vorhanden, aber keine breite Konkurrenzteststrategie über mehrere Domänen |

### Dokumentation vs. Code / Tests

- Die Notion-Features FT01, FT04, FT06, FT28 und FT31 passen grundsätzlich gut zu den großen Integrations- und Browser-Suiten.
- Gleichzeitig suggerieren lokale Dokumente wie `docs/TEST_MATRIX.md` in vielen UI-Unit-Bereichen mehr fachliche Tiefe, als der Testquelltext tatsächlich trägt. Besonders `wiring`, `render`, `layout`, `preview` und ähnliche Dateien sind oft **ehrliche Regressionsmarker**, aber **keine** starken Feature-Nachweise.
- Die Abweichung ist daher weniger „Doku falsch“, sondern eher: **Metadokumente benennen Features, während der Quelltext oft nur Präsentationsverdrahtung prüft.**

## 4. Kritischste Scheinabsicherungen

### 1. `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`

- Wirkung: suggeriert FT04-/Terminlisten-Schutz im Standalone-Kontext.
- Tatsächlich geprüft: statisches HTML, TestIDs, ein Storno-Badge und eine konkrete CSS-Klassenreihenfolge.
- Problem: Der rote Lauf zeigt, dass der Test bereits an **Klassenreihenfolge** hängt, nicht an fachlichem Verhalten. Das ist ein fragiler Markup-Snapshot, kein belastbarer Nachweis für „nicht entfernbar“ im echten UI-/API-Zusammenspiel.

### 2. `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx`

- Wirkung: suggeriert Absicherung des Standalone-Fallback-Verhaltens.
- Tatsächlich geprüft: nur, dass bestimmte controlled Props nicht weitergereicht werden.
- Problem: Weder Datenanzeige noch Nutzerwirkung noch Serververhalten werden geprüft. Das ist ein reiner Plumbing-Test.

### 3. `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`

- Wirkung: suggeriert Rollen-/Readonly-Sicherheit für TourManagement.
- Tatsächlich geprüft: rein gerendertes Markup mit komplett gemockten Queries und Komponenten.
- Problem: Der Test beweist nur UI-Sichtbarkeit, nicht serverseitige Autorisierung, nicht Deep-Link-Verhalten und nicht den Schutz direkter Mutationen.

### 4. `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`

- Wirkung: suggeriert fachlichen Nachweis des HelpText-Seeds.
- Tatsächlich geprüft: POST-Aufruf und Query-Invalidierung in einer gemockten Page.
- Problem: Es wird nicht gezeigt, ob der Seed fachlich die richtigen Texte erzeugt oder wie sich das für Nutzer sichtbar auswirkt.

### 5. `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx`

- Wirkung: der Dateiname suggeriert einen Integrationsnachweis.
- Tatsächlich geprüft: `renderToStaticMarkup` eines isolierten Renderers.
- Problem: keine API, keine DB, keine Query, keine Nutzerinteraktion. Als UI-Renderer-Test okay, als „Integration“ irreführend.

### 6. Große Teile der `tests/unit/ui/*wiring*.test.tsx`-, `*render*.test.tsx`- und `*layout*.test.tsx`-Familien

- Wirkung: durch Feature-Titel in Scope-Kommentaren wirken diese Tests oft wie Feature-Sicherung.
- Tatsächlich geprüft: in vielen Fällen nur, dass TestIDs, Buttons, Überschriften oder Markup-Segmente auftreten.
- Problem: Diese Tests sind als technische Regressionsmarker brauchbar, aber sie sollten im Qualitätsbild nicht mit fachlicher Kernabsicherung verwechselt werden.

## 5. Priorisierte Empfehlungsliste

### Priorität 1: UI-Readonly- und Rollenpfade von reiner Sichtbarkeit auf echte Verweigerung heben

- Warum: Der größte systematische Blindspot ist die Verwechslung von „Button unsichtbar“ mit „Aktion sicher verboten“.
- Zuerst verbessern: Tour-, Projekt-, Kunden-, Mitarbeiter- und Wochenplan-Mutationspfade dort, wo bisher überwiegend UI-only-Readonly-Tests liegen.

### Priorität 2: Markup-lastige `renderToStaticMarkup`-Wiring-Tests selektiv durch echte DOM-/Interaktionstests ersetzen

- Warum: 147 Dateien mit statischem Markup und 168 mocklastige Dateien sprechen für eine zu breite Verdrahtungsschicht mit begrenzter Beweiskraft.
- Zuerst verbessern: Dateien, die Feature-Namen tragen und dennoch nur Überschriften, Badges oder TestIDs prüfen.

### Priorität 3: Berichtspfad „Integration“ enger definieren

- Warum: Dateien wie `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx` tragen das Label „Integration“, prüfen aber keine echte Systemgrenze.
- Empfehlung: solche Tests künftig entweder klar als Renderer-/Smoke-Tests benennen oder durch echte Integrationspfade ergänzen.

### Priorität 4: Meta-starke, fachlich schwache Testbereiche nicht übergewichten

- Warum: Testisolation-, Registry- und Fingerprint-Tests sind wichtig, beweisen aber primär die **Testinfrastruktur**, nicht die Produktlogik.
- Empfehlung: diese Tests als Infrastruktur-Absicherung ausweisen und nicht als Ersatz für Business-Coverage lesen.

### Priorität 5: CSS-/Markup-fragile Assertions abbauen

- Warum: Der einzige rote Unit-Lauf scheitert an der Reihenfolge von CSS-Klassen.
- Empfehlung: visuelle oder semantische Zustände lieber über robustere Marker, disabled-Zustände, ARIA, Datenattribute oder beobachtbare UI-Folgen absichern.

## 6. Fixtures, Testhelper, Seeds und Cleanup

## Stärkende Grundlagen

- `tests/helpers/resetDatabase.ts` ist positiv auffällig: Guard-Prüfung, SQL-Identität und Locking schützen den Resetpfad sauber.
- `tests/helpers/browserE2e.ts` sorgt zusammen mit `resetBrowserSuiteState()` für reproduzierbare Browser-Baselines inklusive optionalem System-Seed.
- `tests/helpers/testIsolationFingerprint.ts` und `tests/helpers/testIsolationCanaries.ts` sind für Meta-Qualität ungewöhnlich stark: Sie adressieren aktiv Pollution-, Seed- und Storage-Risiken.
- `tests/helpers/apiTestHarness.ts` ist ein sinnvoller echter Einstieg in die Express-/Route-Kette und verhindert proprietäre Mini-Apps in vielen Integrationstests.

## Problematische oder irreführende Grundlagen

- `tests/helpers/testDataFactory.ts` enthält neben guten Fixtures auch mindestens einen klaren Realismusbruch: `assignEmployeesToTourFixture()` ist faktisch ein **No-op** und persistiert die Relation nicht. Tests, die sich darauf verlassen oder dadurch realistischer wirken, als sie sind, müssen kritisch gelesen werden.
- Ein großer Teil der UI-Unit-Suite verwendet **eigene Mocks statt gemeinsamer realistischer Testpfade**. Dadurch werden Query-Lebenszyklen, Invalidierung, Interaktion und Seiteneffekte oft vollständig umgangen.
- Der Bestand enthält praktisch keine breite DOM-interaktive UI-Unit-Strategie; in der Stichprobe und im Dateiscan dominiert statisches Markup gegenüber echter Interaktion.
- Die Testisolation ist als Konzept und Meta-Testnetz gut dokumentiert und geprüft, aber die fachliche Suite bleibt trotzdem nur so stark wie ihre konkreten Assertions. Ein sauberer Reset ersetzt keine scharfe fachliche Prüfung.

## Gesamturteil zur Grundlage

Die Testinfrastruktur stärkt die Suite vor allem bei Integration und Browser deutlich. In der UI-Unit-Lage sind Fixtures und Mocks dagegen **häufig Teil des Problems**, weil sie die fachliche Realität oft zu stark vereinfachen und dadurch grüne, aber schwache Tests begünstigen.

## 7. Ausführungsprotokoll

### Gelesene lokale Dateien / Bereiche

- `agents.md`
- `architecture-index.md`
- `implementation-index.md`
- `package.json`
- `vitest.config.ts`
- `vitest.workspace.ts`
- `playwright.config.ts`
- `tests/setup.env.ts`
- `tests/setup.integration.ts`
- `tests/helpers/testDataFactory.ts`
- `tests/helpers/resetDatabase.ts`
- `tests/helpers/browserE2e.ts`
- `tests/helpers/apiTestHarness.ts`
- `tests/helpers/testIsolationExecution.ts`
- `tests/helpers/testIsolationFingerprint.ts`
- `tests/helpers/testIsolationCanaries.ts`
- `docs/TEST_MATRIX.md`
- `docs/TEST_ISOLATION_REBUILD_PLAN.md`
- `docs/TEST_DB_SAFETY_INVENTORY.md`
- relevante Abschnitte aus `docs/implementation.md` zu Testarchitektur, Sicherheitsgates und Sichtbarkeit
- relevante Abschnitte aus `docs/architecture.md` zu Rollen und fachlichen Invarianten
- zahlreiche repräsentative Testdateien aus `tests/unit/ui`, `tests/unit/services`, `tests/integration/server`, `tests/integration/ui`, `tests/e2e`, `tests/e2e-browser`

### Gelesene Notion-Seiten

- Datenbank `Lastenheft`
- `FT (01): Kalendertermine`
- `FT (04): Tourenplanung`
- `FT (06): Automatische Regeln`
- `FT (28): Universelles Tagging-System`
- `FT (31): Dispositions-Monitoring (Konflikte)`

### Ausgeführte Testbefehle

| Befehl | Ergebnis |
|---|---|
| `npm run test:unit` | **rot**: 271/272 Dateien grün, 1102/1104 Tests grün, 1 skip, 1 Fehler in `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx` |
| `npm run test:integration` | **grün**: 113/113 Dateien, 627/631 Tests grün, 4 skip |
| `npm run test:e2e` | **grün**: 3/3 Dateien, 3/3 Tests |
| `npm run test:e2e:browser` | **grün**: 286/286 Tests |

### Fehlgeschlagene Befehle / Nebenbefunde

- Der erste Versuch, die Vollinventur direkt per komplexem PowerShell-Inlineparser zu erzeugen, scheiterte an Shell-Parsing. Daraus entstand **keine** Produktivänderung; die Inventur wurde anschließend stabil über einen kleinen Einweg-Generator in `.tmp-analysis/` erzeugt.
- Relevanter fachlicher Nebenbefund aus dem Testlauf: Der Unit-Fehler ist markup-fragil und hängt an `data-row-class="bg-amber-50/70 text-muted-foreground"` vs. der tatsächlich gerenderten Reihenfolge `text-muted-foreground bg-amber-50/70`.

### Nicht vollständig tief geprüft

- Nicht jeder der fast 2.000 `it`/`test`-Blöcke wurde manuell bis ins letzte Arrange-/Assert-Detail prose-seitig ausformuliert.
- Stattdessen wurde eine **vollständige Datei-Inventur** mit extrahierten Testfallnamen erzeugt und die inhaltlich tiefste Einzelanalyse auf fachlich riskante Integrations-, Browser- und ausgewählte Service-/UI-Pfade konzentriert.
- Diese Einschränkung ist bewusst und transparent; sie ändert nichts daran, dass alle Testdateien inventarisiert wurden und die wichtigsten fachlichen Lücken sowie Scheinabsicherungen klar sichtbar sind.

## Vollinventur (strukturell, alle Testdateien)

Hinweis: Alle Testdateien sind inventarisiert. Die Testfalllisten werden direkt aus it()/test()-Blöcken extrahiert; bei parametrierten oder dynamisch erzeugten Fällen bleibt die Klassifikation strukturell.

### `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] runs the browser cancellation flow from regular future appointment to cancelled report state; [A] Planung blockierte Termine bleiben im Browser sichtbar, aber read-only; [A] Geparkt-Tag erscheint nicht im Termin-Tag-Picker

### `tests/e2e-browser/appointment-direct-relations.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] opens an existing direct appointment with customer badge and empty project relation; [A] blocks save when neither project nor customer is set; [A] keeps project on an existing project appointment and offers no remove action

### `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a relation-complete single-day appointment from a tour lane and reloads the same values in edit mode; [A] creates a new appointment on Tour Messe, persists the managed Messe tag and follows the note suggestion; [A] persists tag, note and appointment attachment from the new appointment form and restores them on reopen; [A] shows an extracted document only as project attachment after successful project save; [A] keeps the extracted document as appointment draft when the project form is canceled; [A] opens an existing project overlay for duplicate order numbers and links it back to the appointment; [A] keeps unsaved appointment edit values after selecting a tag in edit mode

### `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows the tour picker inside the employee panel and persists a newly selected tour; [A] renders an existing tour as a separate badge and restores the picker after removal; [A] assigns a tour without week planning and keeps the existing employees unchanged; [A] rejects selecting a blocked tour week in the appointment form; [A] adds the managed Messe tag when an appointment is switched to Tour Messe; [A] removes the managed Messe tag when an appointment leaves Tour Messe; [A] opens the week preview for a new next-week appointment and applies the planned employee; [A] keeps the selected tour but no employees when the week preview is canceled for a new lane appointment; [A] marks conflicting week employees as non-selectable for new appointments; [A] uses the already confirmed preview decision when an existing appointment changes to another tour with week planning; [A] rechecks week planning when the start date moves into another ISO week on the same tour; [A] allows manually adding an employee to an existing appointment through the appointment form; [A] keeps existing employees when removing the tour from an existing appointment; [A] opens the week preview when an existing appointment without tour later gets a tour with week planning and keeps employees empty after cancel

### `tests/e2e-browser/appointment-multiday-edit.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a multi-day appointment from a tour lane and keeps start and end dates stable on reopen

### `tests/e2e-browser/appointment-park.workflow.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] parks a future appointment via the park button and shows correct state in calendar and form; [A] parks a future appointment via the calendar menu and refreshes monitoring immediately

### `tests/e2e-browser/appointment-with-article-list.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows project article items on a week card when the appointment is created via API with a project; [A] updates week card and calendar aggregation after assigning a project with article list in the appointment form; [A] detail week cards show the full project article list, clamp notes and keep lane heights uniform

### `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] appointment scopes keep the new all/default semantics and apply valid or invalid filters to real result sets; [A] all scope opens directly on the page of the next upcoming appointment, while earlier historical rows remain reachable; [A] all scope keeps historical-only result sets on their original first page without a false future highlight

### `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] filters with a fixed 2024 reference date and rejects impossible kw values in a 52-week year; [B] accepts kw 53 in a fixed 2026 reference date with a real 53-week year

### `tests/e2e-browser/appointments-list.tour-employee.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] tour form appointments table: date sorting persists across appointment scope toggles and no all-day column; [A] employee form appointments table: structure, scope toggle persistence and vertical inner scroll; [A] appointments table preview uses the detail week card and stays inside the viewport; [A] tour form jumps to the page of the next upcoming appointment and highlights it; [A] employee form jumps to the page of the next upcoming appointment and highlights it; [A] tour form leaves historical-only rows on page one without a false focus highlight; [A] employee form leaves historical-only rows on page one without a false focus highlight

### `tests/e2e-browser/attachment-context-invalidation.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] aktualisiert Hover und Terminformular nach weiterem Projektattachment ohne Reload

### `tests/e2e-browser/attachments.delete-workflow.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] Soft-Delete - Projekt: Anhang aus Liste entfernen, Counter und Hover-Preview aktualisieren; [A] Hard-Delete - Projekt: Anhang aus Liste und Counter entfernen; [A] Abbruch - Dialog schliessen ohne Loeschung; [A] Historischer Termin: nur Readonly-Ansicht und kein Action-Button fuer Anhaenge sichtbar

### `tests/e2e-browser/board-paging.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] customers board paginates large result sets and resets on filter; [B] projects board paginates large result sets and resets on filter

### `tests/e2e-browser/calendar-consistency.week-month-dates.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps same-day appointments aligned to the same visible day in week and month; [A] keeps visible month week numbers aligned with ISO weeks and preserves the cross-month span

### `tests/e2e-browser/calendar-consistency.week-month-presence.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows all expected appointments for the anchor month and excludes a next-month-only appointment; [A] shows the cross-month span in both affected months and excludes a previous-month-only appointment

### `tests/e2e-browser/calendar-consistency.week-month-tour-lanes.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps week appointments inside their tour lanes and sorted by start time; [A] keeps month bars on separate slot heights for different tours and separate subrows for overlaps

### `tests/e2e-browser/calendar-drag-drop.success.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] moves a regular future appointment onto another future day in the month sheet

### `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows the concrete server validation message after dragging an appointment onto today

### `tests/e2e-browser/calendar-month-sheet.navigation.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] opens the isolated month overview and keeps the single-month navigation deterministic

### `tests/e2e-browser/calendar-tour-color-refresh.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] refreshes the edited tour color in the week calendar; [B] refreshes the edited tour color in the month overview

### `tests/e2e-browser/calendar-week-attachments-aggregate.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] zeigt aggregierten Attachment-Badge und Herkunftslabels fuer Kunde, Projekt und Termin; [B] zeigt bei fehlenden akkumulierten Dokumenten einen sichtbaren 0-Badge mit leerem Hover-Zustand

### `tests/e2e-browser/calendar-week-customer-preview-phone.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] zeigt Telefonnummer im Kundendaten-Hover-Preview wenn am Kunden hinterlegt; [A] laesst den Kundendaten-Hover-Preview ohne Telefonzeile offen wenn keine Telefonnummer hinterlegt ist

### `tests/e2e-browser/calendar-week-drag-drop.dragstart.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] records a dragstart with the appointment id for a regular week-view appointment

### `tests/e2e-browser/calendar-week-drag-drop.drop-dispatch.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] dispatches a week-view drop with appointment data and persists the new target date

### `tests/e2e-browser/calendar-week-drag-drop.success.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] moves a regular future appointment onto another future day in the week view

### `tests/e2e-browser/calendar-week-grid-widths.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps one-day and two-day widths stable when the weekend is occupied in compact mode; [A] keeps three-day widths stable across weekday and weekend spans; [A] keeps the same Thursday day edges across tours in standard mode; [A] keeps the same two-day span edges across tours in detail mode; [A] aligns the internal Thursday boundary of a two-day tile with a Thursday single-day card in standard mode; [A] aligns the internal Thursday boundary of a two-day tile with a Thursday single-day card in detail mode; [A] keeps the lower overflow monday card aligned with the regular monday column in standard mode

### `tests/e2e-browser/calendar-week-lane-placement.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps back-to-back two-day appointments in the same top lane row; [A] keeps multi-day appointments aligned in the top row around a timed single-day gap

### `tests/e2e-browser/calendar-week-tour-lane-hover.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] shows week employees and additional day employees in the lane header hover

### `tests/e2e-browser/calendar.kw-jump.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows an error for invalid kw zero and still allows the next valid week jump

### `tests/e2e-browser/dispatcher-form-data-and-actions.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] lets dispatchers work with appointment form data and sidebar actions; [A] lets dispatchers edit project form data while keeping sidebar data visible; [A] lets dispatchers edit customer forms and use sidebar note actions; [A] lets dispatchers edit employee forms and keep appointments and week plans actionable; [A] lets dispatchers use tour and week actions with visible existing data

### `tests/e2e-browser/docs-followup.mojibake-regression.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] keeps changed calendar and project labels free of mojibake

### `tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] Test 1: Entfernen über Wochenplan-Dialog mit Datumsfilter; [A] Test 2: Hinzufügen über Wochenplan-Dialog mit Datumsfilter; [A] Test 3: Entfernen über Minus-Button im Mitarbeiterformular

### `tests/e2e-browser/employee-appointments-utilization.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] employee form switches from appointments list to utilization view and shows the appointment preview

### `tests/e2e-browser/employee-form-week-planning.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] employee form shows week-planning cards with visible assigned members

### `tests/e2e-browser/entity-appointments-hover-preview.cache-invalidation.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] A1 Mitarbeiter: zukünftiger Termin erscheint im Badge und Hover; [A] A2 Kunde: zukünftiger Termin erscheint im Badge und Hover; [A] A3 Projekt: zukünftiger Termin erscheint im Badge und Hover; [A] A4 Mitarbeiter: vergangener Termin erscheint im Badge und Hover (neue Regel); [A] A5 Mitarbeiter: gemischte Termine werden absteigend nach Datum sortiert; [A] A6 alle drei Parent-Typen: mehr als vier Termine zeigen den Hinweis auf weitere; [A] B1 Cache-Invalidierung: nach UI-Löschung zeigt der Hover keine veralteten Daten (kein Seitenreload)

### `tests/e2e-browser/entity-card-preview-freshness.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] Terminkarte und Tabellen-Preview zeigen nach Parent-Mutation die frischen Customer- und Projektdaten; [A] Projektkarte und Tabellen-Preview spiegeln frische Customer-Daten und Sidebar-Termine; [A] Kundenkarte und Tabellen-Preview spiegeln frische Stammdaten sowie verknuepfte Projekte und Termine; [A] Mitarbeiterkarte und Preview begrenzen Hover auf vier Termine, waehrend das Formular alle Termine zeigt

### `tests/e2e-browser/filter-state-persistence.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] projects keep filters after closing the project form; [A] customers keep filters after closing the customer form; [A] appointments keep filters and the selected scope after closing the overlay; [A] employees keep filters after closing the employee form; [A] appointments keep the focused target page in all-scope after returning from the overlay

### `tests/e2e-browser/ft04.tour-employee-cascade.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a new tour without a Wochenplanung tab in create mode; [A] hides employees that are already assigned to another tour in the same ISO week from the picker; [A] validates the footer week picker against min and max bounds; [A] shows overlap conflicts in the week preview and only applies the selectable appointments

### `tests/e2e-browser/ft11.team-management.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] removes team members persistently and refreshes the team card in the main view

### `tests/e2e-browser/list-empty-states-and-filter-messages.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] customers list: empty state is stable across board and table views; [A] projects list: empty state is stable across board and table views; [A] employees list: empty state is stable across board and table views; [A] tours list: empty state is visible on empty data; [A] teams list: empty state is visible on empty data; [A] appointments list: empty state is visible on empty data; [A] customers list: empty state disappears in board and table when data exists; [A] projects list: empty state disappears in board and table when data exists; [A] employees list: empty state disappears in board and table when data exists; [A] tours list: empty state disappears when data exists; [A] teams list: empty state disappears when data exists; [A] appointments list: empty state disappears when data exists; [A] customers list: filter message appears for no hits and disappears for hits; [A] projects list: filter message appears for no hits and disappears for hits; [A] employees list: filter message appears for no hits and disappears for hits; [A] appointments list: filter message appears for no hits and disappears for hits

### `tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] monitoring highlights the nearest filtered appointment and clears cleanly for empty filters

### `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates, counts and edits a project note with cardColor and print flag; [A] creates, counts and edits a customer note with cardColor and print flag; [A] creates, counts and edits an appointment note with cardColor and print flag; [A] shows cumulative customer, project and appointment notes in the week preview; [A] keeps the customer extraction overlay open on outside click and loads existing customer data

### `tests/e2e-browser/project-form.article-list-save-behavior.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] wählt Produkt im Create-Modus – kein DB-Eintrag vor dem Speichern; [B] speichert Produkt und Komponente beim Create-Save; [B] wechselt Produkt dreimal im Create-Modus – nach Save nur ein Item; [B] ändert Produkt im Edit-Modus – kein PUT vor dem Speichern; [B] ersetzt Produkt im Edit-Modus nach Save – kein Leichen-Eintrag in DB; [B] ändert Komponente im Edit-Modus, bricht ab – DB bleibt unverändert; [B] wählt Produkt ab (leer) und speichert – Item in DB entfernt; [B] Dirty-Check erscheint nach Artikellisten-Änderung ohne Save

### `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists tag, note and project attachment from the new project form and restores them on reopen; [A] sets the Anmerkungen tag when a new project is saved with visible description text; [A] shows an extracted document as pending project attachment before save and restores it after reopen; [A] sets the Anmerkungen tag when an existing project is saved with a newly added description; [A] keeps article dropdown selections stable in create mode after document extraction; [A] keeps project extraction usable without a selected customer and blocks save transparently until one is chosen; [A] opens an existing project in edit mode for duplicate order numbers and keeps the overlay path stable; [A] keeps the extraction overlay open when a duplicate project without appointments is canceled; [A] keeps the sidebar visible for existing project edit; [A] keeps unsaved project edit values after selecting a tag in edit mode

### `tests/e2e-browser/project-sidebar-all-appointments.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] project sidebar appointments: visible separation and descending by date; [A] customer sidebar appointments: visible separation and descending by date

### `tests/e2e-browser/projects.filter-scopes.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] project scopes keep the new all/default semantics and apply valid or invalid filters to real result sets

### `tests/e2e-browser/projects.ft02.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a project via UI after customer selection and keeps validation errors in the form; [A] creates a fully visible project, checks EntityFormShell and restores all values after reopen; [A] creates product and component entries in a new project form and restores them after reopen; [A] defaults to all projects and keeps filters inside the selected ground set while switching scopes; [A] creates product and component entries while editing an existing project and restores replacements after reopen; [A] creates and deletes a project note in the edit form; [A] deletes projects without appointments and keeps projects with appointments blocked

### `tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] hides create entrypoints in week and month calendar views for readers; [A] opens existing appointments from the week calendar in readonly mode for readers

### `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] hides the create entrypoint in the customer list for readers; [A] opens customer forms in readonly mode for readers

### `tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] hides the create entrypoint in the employee list for readers; [A] opens employee forms in readonly mode for readers

### `tests/e2e-browser/reader-form-data-visibility.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows existing appointment form data and sidebar content while staying readonly; [A] shows existing project form data and sidebar panels for readers; [A] shows customer form values and linked sidebar data for readers; [A] shows employee form values, notes, attachments and week data for readers; [A] shows tour and week data for readers while keeping week actions hidden

### `tests/e2e-browser/reader-navigation.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows monitoring but hides reports, journal, tour postal planning and employees in the sidebar; [A] opens monitoring in the main shell for readers; [A] loads standalone monitoring and blocks standalone tour postal plan for readers

### `tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] hides the create entrypoint in the project list for readers; [A] opens project forms in readonly mode for readers

### `tests/e2e-browser/reader-tours-readonly.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] hides the create entrypoint in tour management for readers; [A] opens tour edit and tour week forms in readonly mode for readers

### `tests/e2e-browser/refresh-button.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] refreshes customers in the main customers board via the sidebar button; [A] refreshes projects in the main projects board via the sidebar button; [A] refreshes appointments in the main appointments list via the sidebar button; [A] refreshes week calendar appointments in the main app via the sidebar button; [A] refreshes month calendar appointments in the main app via the sidebar button; [A] refreshes tours in the main tours view via the sidebar button; [A] refreshes employees in the main employees board via the sidebar button; [A] refreshes teams in the main teams view via the sidebar button; [A] refreshes the standalone customers popup opened via in-tab-open; [A] refreshes the standalone projects popup opened via in-tab-open; [A] refreshes the standalone appointments popup opened via in-tab-open; [A] refreshes the standalone week popup opened via in-tab-open; [A] refreshes the standalone month popup opened via in-tab-open; [A] refreshes the standalone tours popup opened via in-tab-open; [A] refreshes the standalone employees popup opened via in-tab-open; [A] refreshes the standalone teams popup opened via in-tab-open

### `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] covers visible FT26 report interactions, persistence, print preview and produktionsplanung output; [A] filters the Auftragsliste by reduced tags and Sauna Modell through overlay, print preview and browser print

### `tests/e2e-browser/reports.kw-input.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] clamps invalid free text in report kw inputs and keeps the spinner controls usable

### `tests/e2e-browser/reports.open-modes.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] opens the vorlaufliste both inline and in a standalone tab with real report rows; [A] opens the produktionsplanung both inline and in a standalone tab with real category and card content; [A] opens the auftragsliste both inline and in a standalone tab with real project cards

### `tests/e2e-browser/reports.tourenplan.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] renders the Tourenplan report with real tag, shortcode and print-note data; [A] builds a multi-tour print preview with hard page breaks between tour sections

### `tests/e2e-browser/reports.tourenplan.note-refresh.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] refreshes the Tourenplan preview after enabling print on an existing appointment note

### `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] zeigt Inner-Tab-Leiste mit drei Eintraegen; [A] Backups-Inner-Tab: Backup-Tabelle mit korrekten Spalten sichtbar; [A] Backups-Inner-Tab: backup_enabled-Switch sichtbar ohne Speichern-Button; [A] Backups-Inner-Tab: Backup erzeugen loest einen Backup-Lauf aus; [A] wechselt zum Dumps-Inner-Tab nach Klick; [A] Dumps-Inner-Tab: Dump erstellen fuegt Eintrag zur Liste hinzu; [A] wechselt zum Import-Inner-Tab nach Klick; [A] Import-Inner-Tab: Vorschau-Button ist ohne Datei deaktiviert

### `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: B
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] Oberflaeche: Datei-Vorschau-Groesse auf small setzen und persistieren; [B] Oberflaeche: Formular-Sidebar-Breite aendern und persistieren; [B] Sicherheit: 2FA-Toggle umschalten und persistieren; [B] Kalender: Wochenende-Spaltenbreite aendern und persistieren; [B] Sicherheit: System-Seed laesst ungecheckte Vorschau-Eintraege unangetastet

### `tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] zeigt die Einstellungsseite mit Sidebar-Navigation fuer Admin; [A] rendert alle vier Nav-Eintraege; [A] zeigt initial den Oberflaeche-Pane mit Datei-Vorschau-Setting; [A] wechselt zum Kalender-Pane nach Klick auf Kalender; [A] wechselt zum Sicherheits-Pane nach Klick auf Sicherheit; [A] wechselt zum Backup-Pane nach Klick auf Backup & Dump; [A] kehrt zum Oberflaeche-Pane zurueck nach weiterem Klick

### `tests/e2e-browser/standalone-routing.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] opens the week calendar in the same tab; [A] opens the month overview in the same tab; [A] opens appointments in the same tab; [A] opens projects in the same tab; [A] opens customers in the same tab; [A] opens employees in the same tab; [A] opens tours in the same tab; [A] opens teams in the same tab; [A] keeps sequential navigation stable across views; [A] shows all ten standalone buttons in the sidebar; [A] uses the expected tooltip on the week standalone button; [A] opens the week calendar in a new tab and shows the created appointment; [A] opens the month overview in a new tab and shows the created appointment; [A] opens appointments in a new tab and shows the created appointment row; [A] opens monitoring in a new tab and shows the under-staffed appointment row; [A] opens reports in a new tab and shows the reports panel; [A] opens projects in a new tab and shows the created project; [A] opens customers in a new tab and shows the created customer; [A] opens employees in a new tab and shows the created employee; [A] opens tours in a new tab and shows the created tour; [A] opens teams in a new tab and shows the created team; [A] loads the week calendar without the sidebar; [A] loads the week calendar from kw and year query parameters; [A] falls back from invalid week query parameters without crashing; [A] writes week navigation back into the URL; [A] updates the URL correctly across an ISO year change; [A] loads the standalone month overview without the sidebar; [A] loads the standalone appointments view without the sidebar; [A] loads the standalone projects view without the sidebar; [A] loads the standalone customers view without the sidebar; [A] loads the standalone employees view without the sidebar; [A] loads the standalone tours view without the sidebar; [A] loads the standalone teams view without the sidebar; [A] loads the standalone reports view without the sidebar; [A] shows the app title and the current view title in the header; [A] refreshes appointments data from the standalone header; [A] opens and closes project edit from a standalone tab using the created project row; [A] opens and closes appointment edit from a standalone week tab using the created appointment card; [A] falls back to the 404 page for unknown standalone routes

### `tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] adds Reklamation-Tag from the week calendar card and suggestion dialog creates note on confirm; [A] adds Reklamation-Tag from the appointment form picker and opens the template-backed editor; [A] adds Reklamation-Tag from the project form picker and creates a project note from the suggestion; [A] adds Messe-Tag from the week calendar card and suggestion dialog is dismissed with skip so no note is created; [A] week card tag picker closes after successful add while calendar refetch is slow; [A] week card template note editor closes after successful save while notes refetch is slow; [A] removes Reklamation-Tag when note exists and removal dialog deletes note on confirm; [A] adding a regular custom tag from the week calendar card creates no dialog; [A] adding Reklamation from the week calendar card when a matching note already exists skips the suggestion dialog

### `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] shows the unified picker catalog and shortcode-first labels in a project edit form; [A] uses the same picker shell and unified catalog in the customer list view; [A] keeps visible tag rows on regular and spanning week appointment cards

### `tests/e2e-browser/tour-postal-plan.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] loads PLZ suggestions and opens appointment creation with date and tour prefill; [A] filters to weeks with a free weekday when the checkbox is enabled

### `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`

- Testtyp: E2E Browser
- Datei-Klassifikation: A
- Datenqualität: reale Browser-/API-Flows mit Test-DB und Reset
- Tatsächliche Assertions: UI-, Persistenz-, Reload- und Negativ-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] blocking from the tour week card parks appointments and keeps the KW visibly blocked; [A] blocking from the week calendar header parks appointments and shows the blocked lane; [A] blocking a week refreshes the parked appointment edit form after the appointment was opened before blocking; [A] blocked tour weeks remain visible in the month sheet after appointments are parked; [A] tour scope week form filters appointments by KW, keeps week notes isolated and reflects mutations immediately; [A] employee scope week form opens read-only employee planning and limits appointments to the selected employee and KW

### `tests/e2e/ft04.tour-employee-cascade.workflow.e2e.test.ts`

- Testtyp: E2E
- Datei-Klassifikation: A
- Datenqualität: reale API-Workflows mit Test-DB-Fixtures
- Tatsächliche Assertions: API-Resultate plus DB-/Join-Nachweise
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] adds and removes a member through the real cascade API flow

### `tests/e2e/project-appointments.sidebar-all.workflow.e2e.test.ts`

- Testtyp: E2E
- Datei-Klassifikation: A
- Datenqualität: reale API-Workflows mit Test-DB-Fixtures
- Tatsächliche Assertions: API-Resultate plus DB-/Join-Nachweise
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns past and future appointments for one project via panel source endpoint

### `tests/e2e/project-with-appointment.workflow.e2e.test.ts`

- Testtyp: E2E
- Datei-Klassifikation: A
- Datenqualität: reale API-Workflows mit Test-DB-Fixtures
- Tatsächliche Assertions: API-Resultate plus DB-/Join-Nachweise
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates customer, project, appointment and lists appointment by project

### `tests/integration/batch/batchRollback.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] rolls back complete batch when one item has stale version (no partial updates)

### `tests/integration/bootstrap/ensureSystemRoles.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] creates ADMIN/READER/DISPATCHER when roles table is empty; [B] is idempotent when called repeatedly

### `tests/integration/bootstrap/testIsolationCanaries.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] creates project-list confusion canaries with similar project labels; [B] creates week-plan confusion canaries with competing tours and employees; [B] creates seed-shadow canaries with seed-near labels

### `tests/integration/bootstrap/testIsolationFingerprint.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] accepts the reset baseline as core with empty storage; [B] accepts the explicit system seed as seeded fingerprint; [B] rejects unexpected business rows in the core fingerprint; [B] rejects leftover files in the storage fingerprint

### `tests/integration/extraction/documentProcessing.project.fixture.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] (keine materialisierbaren Testnamen per Regex)

### `tests/integration/extraction/documentTextExtractor.fixture.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] extracts text from fixture pdf (Gotthardt Anke 163214 AB)

### `tests/integration/joins/joinReplaceAtomicity.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] keeps join relations unchanged when replacement contains invalid employee id

### `tests/integration/server/admin.dump.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] blockiert fileHash mismatch und falsche Sicherheitsphrase; [A] Admin erhält 200 mit Array; [A] Nicht-Admin erhält 401 oder 403; [A] erzeugt einen versionierten Dump mit erlaubtem Tabellensatz; [A] stellt einen erzeugten Dump als echten Roundtrip wieder her; [A] akzeptiert Alt-Dumps mit fehlenden neuen Tabellen und ignoriert unbekannte Tabellen; [A] akzeptiert versionierte Dumps mit fehlenden neuen Tabellen im manifest.json als Warning; [A] normalisiert Attachment-storagePath beim Import auf den aktuellen Upload-Root; [A] lehnt Legacy-Dumps ohne versioniertes Format ab; [A] kein multipart-Body → 422; [A] korrupte ZIP → 422; [A] ZIP ohne data.json → 422; [A] Nicht-Admin erhält 401 oder 403

### `tests/integration/server/admin.system-seed.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 403 for non-admin on preview and apply; [A] reports missing system entries before apply and seeds only selected items; [A] is idempotent on repeated runs and keeps existing template bodies; [A] does not create preview candidates that are intentionally left unchecked

### `tests/integration/server/appointment.notes.card-color-print.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] inherits template cardColor and print for appointment notes; [A] keeps locked appointment note color immutable while allowing print change; [A] updates free appointment note cardColor and print; [A] keeps appointment notes intact when the appointment itself is updated; [A] cleans up appointment note relations when deleting an appointment

### `tests/integration/server/appointmentEmployee.composite-pk.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] rejects duplicate appointment/employee pair

### `tests/integration/server/appointments.attachments.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] supports admin/dispatcher upload plus list, open, download and soft-delete; [A] downloads attachments via current upload root even when storagePath still points to a legacy directory; [A] enforces 401, 403, 404 and 413 for invalid appointment attachment mutations

### `tests/integration/server/appointments.cancellation.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] filters protected system tags per picker domain, auto-creates them, and keeps them protected in admin master data; [A] blocks write paths for planning blocked appointments, protects manual tag assignment, and still allows cancel; [A] requires the seeded cancellation tag, then cancels versioniert and rejects stale repeats afterwards; [A] repairs pre-existing cancelled appointments by clearing lingering employee assignments

### `tests/integration/server/appointments.customer.sidebar-vs-all.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns only current+future for sidebar and full history for all-appointments across multiple customers; [A] allows fromDate override in test env for upcoming and ignores fromDate for all

### `tests/integration/server/appointments.direct-projections.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] includes direct appointments in customer scope=all alongside project appointments; [A] includes direct appointments in the calendar aggregation; [A] includes direct appointments in /api/appointments/list filtered by customerId; [A] removes appointment_employee joins when deleting a direct appointment

### `tests/integration/server/appointments.direct-relations.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a direct appointment with customer only; [A] rejects create when project and customer are both missing; [A] derives customer from project when only projectId is sent; [A] accepts matching customerId together with projectId; [A] rejects mismatching customerId for a project appointment; [A] assigns a same-customer project to an existing direct appointment; [A] rebinds customer to the project's customer when assigning a foreign-customer project; [A] removes projectId on update and keeps the derived customer; [A] changes customer on a direct appointment without project; [A] rejects changing customer on a project appointment to a foreign customer

### `tests/integration/server/appointments.dragdrop.overlap.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns EMPLOYEE_OVERLAP_CONFLICT when the moved appointment collides with an existing employee assignment

### `tests/integration/server/appointments.dragdrop.success.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] moves a future appointment to another future date via the public appointment patch endpoint; [A] moves a future appointment and applies a new tour in the same patch request

### `tests/integration/server/appointments.employee-overlap.flow.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps join operation conflict-safe across tour/team/manual sequence; [A] allows second save after reverting endDate when previous overlap update failed; [A] allows follow-up update when target hour differs from existing timed assignment

### `tests/integration/server/appointments.employee-overlap.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] Case 1: tour prefill reports conflicting employee and does not persist create; [A] Case 2: team assignment reports conflicting employee and keeps pre-update assignment unchanged; [A] Case 3: manual employee assignment reports conflict and leaves assignment unchanged; [A] Case 4: all-day and timed appointment on same day are allowed; [A] Case 5: timed appointments conflict only when start hour is equal

### `tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] multiday + tour: overlap blocks create completely when conflict exists on one day in span; [A] multiday + team: one-day conflict keeps existing assignment unchanged; [A] multiday + manual assignment: conflict keeps existing assignment unchanged; [A] multiday timed: overlap day with different hour is allowed; [A] multiday timed: overlap day with equal hour is blocked

### `tests/integration/server/appointments.employee-removal.versioning.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] removes an employee and bumps the appointment version when the version matches; [A] returns VERSION_CONFLICT when removing with a stale appointment version

### `tests/integration/server/appointments.employee.sidebar-vs-all.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns only current+future for sidebar and full history for all-appointments across multiple employees; [A] allows fromDate override in test env for upcoming and ignores fromDate for all; [A] returns an empty array for employee without appointments; [A] allows reader role to fetch employee appointments for active employee

### `tests/integration/server/appointments.entity-card-payload.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns complete payloads for calendar week cards, table previews and edit reopen; [A] reflects parent master-data and relation changes in the next calendar and table payload

### `tests/integration/server/appointments.historical-guards.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] H5.1 blocks create for past date and keeps persistence unchanged; [A] H5.2 blocks update for existing appointment in the past; [A] H5.3 blocks today date with startTime in the past

### `tests/integration/server/appointments.list.sorting.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns tour-filtered list ascending by date/time/id; [A] returns employee-filtered list ascending by date; [A] filters list by orderNumber using partial matches; [A] keeps availableRange on the full base set when date filters narrow the visible rows; [A] returns the focus appointment page for mixed historical and future rows across a page boundary; [A] omits focus metadata when only historical rows remain after filtering; [A] prefers a same-day appointment over later future appointments and keeps availableRange unchanged

### `tests/integration/server/appointments.park.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] setzt Tour Parkplatz, entfernt Mitarbeiter und setzt Tag Geparkt atomar; [A] schlaegt mit 409 ALREADY_PARKED fehl wenn Termin bereits geparkt ist; [A] schlaegt mit 409 VERSION_CONFLICT fehl bei veralteter Version; [A] schlaegt mit 409 CANCELLED_APPOINTMENT_READONLY fehl fuer stornierte Termine; [A] ist nur fuer DISPONENT und ADMIN erlaubt, nicht fuer READER (403); [A] entfernt Tag Geparkt still wenn Tour von Parkplatz auf regulaere Tour wechselt; [A] entfernt Tag Geparkt nicht wenn Tour nicht Parkplatz war; [A] setzt Tag Messe Aufbau/Abbau still wenn direkt auf Tour Messe angelegt wird; [A] setzt Tag Messe Aufbau/Abbau still wenn auf Tour Messe gewechselt wird; [A] entfernt Tag Messe Aufbau/Abbau still wenn von Tour Messe weg gewechselt wird; [A] Tag Geparkt erscheint nicht im Picker-Katalog (domain=appointment); [A] Tag Geparkt kann nicht manuell ueber POST /tags gesetzt werden; [A] Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden, auch ausserhalb der Parkplatz-Tour; [A] Tag Geparkt kann nicht manuell ueber DELETE /tags/:tagId entfernt werden, solange der Termin in Parkplatz liegt; [A] erlaubt Zukunftsumplanung eines historischen Parkplatz-Termins auf regulaere Tour; [A] erlaubt Rueckdatierung eines Parkplatz-Termins auf ein Datum vor heute; [A] erlaubt die Wochenplanungs-Vorschau fuer historische Parkplatz-Termine bei Datumswechsel; [A] erlaubt Tag-Mutationen fuer historische Parkplatz-Termine; [A] erlaubt Storno und Loeschen fuer historische Parkplatz-Termine

### `tests/integration/server/appointments.tour-change-preview.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] re-evaluates week planning when an appointment on the same tour moves into another ISO week; [A] returns planned employees when an existing appointment without tour later gets a tour with week planning

### `tests/integration/server/attachmentQueries.ft24.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] aggregates customer project attachments and appointment context, and reports duplicates

### `tests/integration/server/attachments.delete.ft19.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] entfernt Datensatz aus der Liste, HTTP 200; [A] lässt die physische Datei nach Soft-Delete im Upload-Verzeichnis; [A] liefert 404 bei unbekannter Attachment-ID; [A] liefert 403 für Leser-Rolle; [A] liefert 401 für unauthentifizierten Zugriff; [A] entfernt Datensatz aus der Liste, HTTP 200; [A] löscht die physische Datei beim Hard-Delete; [A] liefert 404 bei unbekannter Attachment-ID; [A] liefert 403 für Leser-Rolle; [A] liefert 401 für unauthentifizierten Zugriff; [A] Soft-Delete auf Attachment eines historischen Termins → 403; [A] Hard-Delete auf Attachment eines historischen Termins → 403; [A] GET (Anzeige) eines Attachments eines historischen Termins → weiterhin erlaubt; [A] GET-Liste eines historischen Termins → weiterhin erlaubt

### `tests/integration/server/auth.session.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns the authenticated user for an existing session; [A] returns 401 without an authenticated session

### `tests/integration/server/auth.two-factor.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps login single-step while global 2FA is disabled; [A] forces setup first and then code verification on later logins; [A] rejects non-admin writes to the global two-factor setting

### `tests/integration/server/calendar-week-notes.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] POST legt Notiz an (tourId=0) und gibt 201 zurück; [A] GET gibt angelegte Notizen der Woche zurück (tourId=0); [A] Notizen verschiedener tourId-Scopes sind voneinander getrennt; [A] DELETE mit korrekter Version entfernt Notiz (204); [A] DELETE mit falscher Version gibt 409; [A] POST als Leser gibt 403; [A] week_number außerhalb 1–53 wird mit 422 abgewiesen

### `tests/integration/server/calendar.appointments.attachment-counts.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns customer, project, appointment and total attachment counts per appointment

### `tests/integration/server/calendar.appointments.notes-counts.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns customer/project/appointment note counts per appointment with zero and mixed scenarios

### `tests/integration/server/calendar.project-article-items.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps structured project article items visible after product/component deactivation; [A] keeps product/component source metadata and shortcodes in calendar payloads

### `tests/integration/server/calendar.tour-postal-plan.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] liefert sortierte Vorschläge mit Score, Label und ohne unzugeordnete Termine; [A] klammert laufende Woche serverseitig auf den Beginn der kommenden Woche; [A] filtert bei aktivem Frei-Filter voll belegte Werktagwochen heraus und behaelt Wochen mit freiem Werktag

### `tests/integration/server/calendarAppointments.customer-contact-fields.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] liefert phone, email und company wenn am Kunden hinterlegt; [A] liefert null für phone, email und company wenn nicht hinterlegt; [A] liefert phone, email und company auch bei ?detail=full

### `tests/integration/server/calendarAppointments.customer-name-refresh.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns updated customer fullName for same appointment after customer patch

### `tests/integration/server/calendarAppointments.project-name-refresh.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns updated projectName for the same appointment after project patch

### `tests/integration/server/calendarWeekLaneEmployeePreviews.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] groups week employees separately from additional day employees and keeps week-only days; [A] hides legacy Parkplatz week assignments from the lane preview and does not seed week-only preview days

### `tests/integration/server/changeNotifications.routes.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] rejects unauthenticated requests; [A] allows READER to open the authenticated stream and sends the SSE handshake; [A] does not replay historical events on a fresh connection without Last-Event-ID; [A] replays only events newer than Last-Event-ID

### `tests/integration/server/customers.attachments.ft19.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] uploads, lists and downloads customer attachment; [A] returns 400 for invalid customerId in list and create routes; [A] returns 413 for oversized upload payload; [A] returns 404 for unknown customer attachment download id

### `tests/integration/server/customers.create-duplicate.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates customer with only customerNumber and supports patching optional fields to null; [A] returns 409 CUSTOMER_NUMBER_CONFLICT when service reports duplicate; [A] returns 409 CUSTOMER_NUMBER_CONFLICT for a real duplicate customer number insert

### `tests/integration/server/customers.entity-card-payload.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns complete customer board, detail and appointment preview payloads; [A] reflects customer master-data and new project/appointment relations in the next payload

### `tests/integration/server/customers.paged-list.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns only one board page from a larger result set; [A] applies filters before paging and includes appointment counters; [A] returns correct attachmentsCount per customer in paged list

### `tests/integration/server/customers.visibility.by-role.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps non-admin customer list on active scope even when inactive is requested; [A] returns active or inactive customer list for admin based on scope; [A] returns 404 for non-admin customer detail when customer is inactive; [A] returns 403 FORBIDDEN when non-admin tries to change customer isActive

### `tests/integration/server/documentExtraction.projectConflictFlow.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates customer and project when customerNumber does not exist; [A] uses existing customer and only creates a new project when customerNumber already exists; [A] resolves race conflict on customer create and still links project to existing customer; [A] aborts deterministically when resolve endpoint reports multiple

### `tests/integration/server/documentExtraction.routes.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 400 for invalid extraction scope; [A] returns 400 for non-pdf uploads; [A] returns 413 when multipart parser reports payload too large; [A] returns 422 when extraction has no extractable text; [A] returns 422 for validator structure errors (ZodError); [A] returns 409 when order number was already imported; [A] returns 500 on unexpected service errors; [A] returns normalized extraction on successful request; [A] accepts customer_form scope for extract route; [A] returns duplicate=false/count=0 for missing customer number; [A] returns duplicate=true/count=1 for existing customer number; [A] returns none/single/multiple in resolve-customer-by-number; [A] returns 401 for resolve-project-by-order-number without login; [A] returns 400 for resolve-project-by-order-number with missing orderNumber; [A] returns none/single/multiple in resolve-project-by-order-number

### `tests/integration/server/employee.notes.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] lists, creates and scoped-deletes employee notes with persisted join rows; [A] creates employee note from template and allows update plus pin toggle via generic note endpoints; [A] blocks reader role from mutating employee notes; [A] returns 404 for unknown employee note parent and 409 for stale scoped delete

### `tests/integration/server/employees.attachments.ft05.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] uploads, lists, downloads and soft-deletes employee attachment; [A] returns 400 for invalid employeeId in list and create routes; [A] returns 413 for oversized upload payload; [A] UC 05/06 Solltest: unknown employee upload should return 404; [A] UC 05/06 Solltest: reader role must be blocked for upload with 403; [A] returns 404 for unknown employee attachment delete

### `tests/integration/server/employees.current-appointments.ft05.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 200 and array payload for valid employee id; [A] returns 400 for non-numeric employee id; [A] returns 400 for invalid fromDate format; [A] documents non-admin behavior for inactive employee (IST); [A] documents behavior for non-existing employee id (IST)

### `tests/integration/server/employees.entity-card-payload.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns complete employee board, detail and appointment preview payloads; [A] reflects employee master-data, counts and appointment relation changes in the next payload

### `tests/integration/server/employees.import-csv.uc23.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] imports valid rows and reports duplicates; [A] blocks non-admin users; [A] returns INVALID_CSV_HEADER for missing required headers; [A] returns INVALID_CSV_CONTENT for empty csv

### `tests/integration/server/employees.lifecycle.ft05.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] POST creates employee with version 1 and active default; [A] GET list includes created employee and GET detail returns matching payload; [A] PUT with valid version succeeds and increments version exactly by 1; [A] PUT with stale version returns 409 VERSION_CONFLICT; [A] PATCH active true->false and false->true increments version by 1 each time; [A] PATCH active is idempotent for already inactive employee and still returns 200; [A] PATCH active is idempotent for already active employee and still returns 200; [A] optimistic locking multi-user: second client update with old version returns 409; [A] documents update with identical values: version still increments in IST; [A] admin scope filter returns only active or only inactive; [A] non-admin requesting inactive scope still gets effective active list; [A] non-admin gets 404 for inactive employee detail; [A] error matrix: PUT without version returns 422 VALIDATION_ERROR; [A] error matrix: PUT with wrong version datatype returns 422 VALIDATION_ERROR; [A] error matrix: PATCH /active without version returns 422 VALIDATION_ERROR; [A] error matrix: PUT/PATCH on non-existing employee id returns 404 NOT_FOUND; [A] non-admin cannot change status via PATCH and via PUT; [A] reader cannot create employee via POST

### `tests/integration/server/employees.list-aggregates.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] reflects note and attachment mutations in the next employee list response

### `tests/integration/server/employees.tags.ft05.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] lists, adds and removes employee tags and reflects them in the employee list; [A] returns 409 VERSION_CONFLICT when removing with a stale relation version; [A] blocks reader role from mutating employee tags; [A] returns 404 for unknown employee tag list

### `tests/integration/server/employees.visibility.by-role.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] keeps non-admin employee list on active scope even when inactive is requested; [A] returns active or inactive employee list for admin based on scope; [A] returns 404 for non-admin employee detail when employee is inactive; [A] returns 403 FORBIDDEN when non-admin tries to toggle employee isActive

### `tests/integration/server/entity-appointments-preview.endpoint.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] liefert vergangene Termine bei scope=all; [A] liefert zuekuenftige Termine bei scope=all; [A] liefert gemischte Termine (vergangen + zukuenftig) bei scope=all; [A] schliesst Termine eines anderen Kunden aus; [A] liefert leeres Array wenn kein Termin vorhanden; [A] schliesst vergangene Termine bei scope=upcoming aus (Regressionssicherung); [A] liefert 400 fuer nicht-numerische Kunden-ID; [A] liefert 400 fuer ungueltigem fromDate-Format bei scope=upcoming; [A] liefert vergangene Termine bei scope=all; [A] liefert zukuenftige Termine bei scope=all; [A] liefert gemischte Termine (vergangen + zukuenftig) bei scope=all; [A] schliesst Termine eines anderen Mitarbeiters aus; [A] liefert leeres Array wenn kein Termin vorhanden; [A] schliesst vergangene Termine bei scope=upcoming aus (Regressionssicherung); [A] liefert 400 fuer nicht-numerische Mitarbeiter-ID; [A] liefert vergangene Termine bei fromDate=1900-01-01; [A] liefert zukuenftige Termine bei fromDate=1900-01-01; [A] liefert gemischte Termine (vergangen + zukuenftig) bei fromDate=1900-01-01; [A] schliesst Termine eines anderen Projekts aus; [A] liefert leeres Array wenn kein Termin vorhanden; [A] schliesst vergangene Termine bei fromDate=heute aus (Regressionssicherung); [A] liefert 400 fuer nicht-numerische Projekt-ID; [A] liefert 400 fuer ungueltigem fromDate-Format

### `tests/integration/server/ft01.full-uc-coverage.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 01/01 happy+negative: create with project and block only when project and customer are both missing; [A] UC 01/01 happy: create with customer only and no project persists a direct appointment; [A] UC 01/01 rule: startTime is only startTime and does not imply default duration; [A] UC 01/02 happy+negative: update project/customer projection and overlap rollback; [A] UC 01/02 rule: overlap uses all-day category and timed start hour; [A] UC 01/03 happy+negative: move keeps time and blocks historical move; [A] UC 01/04 happy+negative: delete clears join and stale version keeps state; [A] UC 01/05 + UC 01/06: tour assign/replace and remove keep join rules; [A] UC 01/05 negative: tour assignment overlap does not partially persist; [A] UC 01/07 + UC 01/08 + UC 01/09 + UC 01/16: team add, manual add, remove and no duplicates; [A] UC 01/07 negative: team style assignment overlap is blocked atomically; [A] UC 01/10 happy+negative: cross-view consistency and blocked write keeps all views stable; [A] UC 01/11 happy+negative: denormalized names refresh and stale version update does not leak; [A] UC 01/12 happy+negative: list filters and invalid date range; [A] UC 01/13 happy: color projection provides tourColor or null; [A] UC 01/13 rule: missing tour color uses server default in projection contract; [A] UC 01/14 happy+negative: historical create and historical time are blocked; [A] UC 01/14 rule: historical delete is blocked for ADMIN; [A] UC 01/15 happy+negative: optimistic locking success and stale conflict; [A] UC 01/16 negative: repeated assignment operations keep join deterministic and duplicate-free

### `tests/integration/server/ft02.full-uc-coverage.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 02/01 create project happy and basic validation negative; [A] UC 02/01a create project persists project_order row and defaults type for edit form selection; [A] UC 02/03: create project rejects inactive customer assignment; [A] UC 02/02 project update with optimistic lock conflict; [A] UC 02/04b: project customer reassignment to active customer succeeds; [A] UC 02/04c: project customer reassignment to inactive customer is blocked; [A] UC 02/04e: project customer reassignment is blocked after an appointment exists; [A] UC 02/04d detail payload exposes project type and project_order aggregate for form resolution; [A] UC 02/05 project notes create/list/delete; [A] UC 02/06 invariant surface: project attachment delete endpoint is active and returns 404 for unknown ids; [A] UC 02/08 delete rules: block when appointments exist and allow when empty; [A] UC 02/09 + UC 02/13: project update is reflected in calendar projection; [A] UC 02/14: two clients with same version cause stale conflict; [A] UC 02/16: assigning non-existing customer should be rejected; [A] UC 02/12: project detail aggregate uses the same source-of-truth as dedicated project endpoints; [A] UC 02/19: project detail aggregate stays traceable after mutations across dedicated endpoints; [A] UC 02/20: denormalized refresh contract stays consistent across calendar and project appointment projections

### `tests/integration/server/ft04.employee-tour-relationship.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] lists deduplicated employees from future tour appointments; [A] excludes employees that are only assigned on historical tour appointments; [A] ignores future appointments from other tours; [A] returns an empty list for tours without current or future appointments

### `tests/integration/server/ft04.full-uc-coverage.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 04/01 creates a tour with generated name and no active employees; [A] UC 04/02 updates tour name and color; [A] UC 04/03 derives active employees from future tour appointments; [A] UC 04/04 deletes a tour only when no appointments still reference it; [A] UC 04/05 blocks READER mutation on tour-employee cascade endpoints; [A] UC 04/06 reflects tour name and color changes in calendar projections without changing other tours; [A] UC 04/07 current-appointments endpoint returns only appointments of the requested tour; [A] UC 04/08 prevents silent overwrite on parallel tour edit; [A] UC 04/09 allows DISPATCHER to mutate tours but keeps delete reserved for ADMIN; [A] UC 04/10 blocks delete when appointment assignment exists before delete commit

### `tests/integration/server/ft04.multi-user.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] handles simultaneous updates on same tour with one success and one conflict; [A] documents stale edit after delete in another session; [A] keeps concurrent cascade add requests deduplicated on the appointment

### `tests/integration/server/ft04.role.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] enforces READER create/update/delete restrictions with server-side 403; [A] blocks READER on cascade preview and execute endpoints; [A] allows DISPATCHER to create/update tours and execute cascade add but blocks delete; [A] allows ADMIN to perform tour CRUD and cascade operations

### `tests/integration/server/ft04.tour-employee-cascade.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] preview excludes historical appointments and marks overlap and already-assigned rows; [A] execute mutates only selected future appointments and leaves others untouched; [A] execute skips appointments outside the tour or with late overlap conflicts; [A] preview lists only appointments that currently contain the employee; [A] execute removes the employee only from selected appointments; [A] execute skips non-assigned or foreign appointments during remove

### `tests/integration/server/ft04.tour-management.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a tour with valid color; [A] applies default color on empty create payload and rejects invalid color datatype; [A] creates a tour without active employees until appointments exist; [A] documents empty-name request handling on create; [A] updates tour name and color repeatedly and persists after reload; [A] renames a tour and refreshes the calendar projection with the new tour name; [A] returns BUSINESS_CONFLICT when a tour rename would duplicate an existing name; [A] reuses a freed numeric tour name after a previous rename; [A] updates tour color without side effects on referenced appointment data; [A] deletes a tour when no appointments reference it; [A] returns BUSINESS_CONFLICT when deleting a tour that is referenced by appointments; [A] returns NOT_FOUND when deleting non-existing tour id

### `tests/integration/server/ft05.full-uc-coverage.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 05/02: dispatcher updates employee master data without changing appointment relation history; [A] UC 05/07: employee detail, attachments and appointments are consistently readable; [A] UC 05/09: deactivated employee must not be assignable to a new appointment; [A] UC 05/11: stale update after reactivation returns 409 VERSION_CONFLICT; [A] UC 05/13: dispatcher gets consistent active employee query result across list and dialog sources; [A] UC 05/10: deletion is disabled and returns 405 METHOD_NOT_ALLOWED for ADMIN; [A] UC 05/12: unauthorized delete attempt is rejected with 403 FORBIDDEN

### `tests/integration/server/ft07.backup-and-caldav.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] blocks backup-log cleanup when destructive target guard fails; [A] creates real backup files and logs success, then skips on no_changes; [A] exposes backup logs and downloads via admin API; [A] runs forced backup via admin API even without data changes; [A] dispatches CalDAV PUT/DELETE on appointment create/update/delete against HTTPS test endpoint

### `tests/integration/server/ft11.team-management.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates a team, auto-generates name and ignores client-provided name; [A] returns 422 VALIDATION_ERROR for invalid create payload; [A] documents empty assign payload behavior as 200 with empty array; [A] adds and removes team members via dedicated team-employees endpoints; [A] allows assigning inactive employees (IST behavior); [A] returns VERSION_CONFLICT when duplicate employee is assigned twice in same batch; [A] updates team color, keeps team name unchanged and returns 404 for unknown id; [A] supports full member replacement workflow without stale relations; [A] deletes team and clears employee.teamId relation, unknown id returns 404

### `tests/integration/server/helpTexts.import-export.uc16.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] exports all help texts as valid YAML with exact fields; [A] imports new items, silently overwrites empty body, and applies overwrite/skip decisions for conflicts; [A] rejects invalid files and duplicate help_key without persistence; [A] blocks apply on fileHash mismatch and blocks non-admin on import/export

### `tests/integration/server/journal.contexts.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] propagates customer, project and appointment lifecycle mutations into parent detail journals; [A] propagates project note, attachment and order-item mutations into the customer journal; [A] propagates appointment note, attachment and employee delta mutations into project and customer journals; [A] rolls back the journal entry when context rows fail

### `tests/integration/server/journal.routes.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns journal items for admin in descending order and applies combined filters; [A] allows DISPATCHER to read the journal; [A] rejects READER with FORBIDDEN

### `tests/integration/server/legacyMasterDataSchemaRemoval.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] keeps removed legacy tables and columns absent from the active schema

### `tests/integration/server/masterData.ft27.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates, updates and deletes a product category as admin; [A] returns VERSION_CONFLICT on stale update version; [A] blocks deleting referenced category with BUSINESS_CONFLICT; [A] allows deleting default product category when it is unused; [A] allows deleting legacy product category name when it is not referenced; [A] blocks deleting used component category with BUSINESS_CONFLICT details; [A] returns FORBIDDEN for non-admin on FT27 list endpoint; [A] persists optional shortCode on product and component create update flows; [A] allows the same component name in different component categories; [A] rejects duplicate component names inside the same component category; [A] imports products into the selected product category idempotently; [A] reactivates existing component on component category import; [A] returns CSV validation errors and forbids non-admin category imports; [A] returns 404 for removed legacy component specification and component-product routes; [A] returns detailed BUSINESS_CONFLICT counts when deleting a component used in project order items

### `tests/integration/server/masterData.tags.ft28.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates, updates and deletes a tag as admin; [A] returns FORBIDDEN for non-admin on tag list endpoint; [A] blocks deleting tags with relations using BUSINESS_CONFLICT; [A] returns VERSION_CONFLICT for stale tag update version

### `tests/integration/server/masterData.visibility.by-role.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns active and inactive products/components/categories for admin; [A] defaults new products and components to active when isActive is omitted

### `tests/integration/server/monitoring.ft31.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns TR-01 only for under-staffed appointments and allows readers to read; [A] returns one row per parked appointment and combines both triggers on under-staffed parked appointments; [A] allows only admin to read and write the monitoring config and validates invalid payloads; [A] recomputes monitoring live after a relevant appointment update and honors allAppointments for far-future hits; [A] ignores cancelled and historical parked appointments; [A] keeps TR-02 stable while TR-01 reacts to config changes; [A] surfaces under-staffing after a FT04 week-plan removal

### `tests/integration/server/notes.create.transactional-readback.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 422 VALIDATION_ERROR when creating customer note without title; [A] returns 422 VALIDATION_ERROR when creating customer note without body; [A] creates customer note and returns 201 with persisted note payload; [A] creates project note and returns 201 with persisted note payload; [A] returns 404 NOT_FOUND for customer note when customer does not exist; [A] returns 404 NOT_FOUND for project note when project does not exist; [A] returns 404 when customer note template does not exist; [A] returns 404 when project note template does not exist

### `tests/integration/server/notes.joins-and-template-integrity.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] creates customer note from template and persists only customer_note join; [A] creates project note from template and persists only project_note join; [A] updates note title/body and exposes the changed values via readback; [A] persists free customer and project note cardColor/print on create; [A] keeps template-derived cardColor immutable while allowing print updates; [A] returns VERSION_CONFLICT on stale note update; [A] rejects duplicate project_note relation for the same project and note; [A] isolates customer notes by parent customer; [A] isolates project notes by parent project; [A] returns only active templates by default and returns active+inactive with active=false; [A] must not delete foreign customer note via parent-mismatch path; [A] must not delete foreign project note via parent-mismatch path; [A] deletes note rows and both joins when note is actually deleted while parent entities remain; [A] deletes orphan project notes when deleting a project; [A] keeps note when deleting project if note is still linked to customer; [A] keeps customer_note relation when customer is archived; [A] persists template creation in note_template table with versioning defaults

### `tests/integration/server/projectAppointments.sidebar-all.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns past and future appointments for the selected project

### `tests/integration/server/projectAppointments.version.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns version on project appointment list items

### `tests/integration/server/projects.attachments.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 02/06 happy path: list, upload, open, download and soft-delete from list; [A] UC 02/06 negative requirement: unknown project upload should return 404; [A] UC 02/06 negative requirement: READER upload should be blocked with 403

### `tests/integration/server/projects.customer-fk.constraint.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] rejects project insert when customer_id does not exist

### `tests/integration/server/projects.delete.race-condition.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 02/18: delete and concurrent appointment create keep referential integrity; [A] UC 02/18 explicit conflict expectation (may fail if implementation differs)

### `tests/integration/server/projects.delete.rules.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 204 when deleting project without appointments; [A] returns 409 BUSINESS_CONFLICT when project has at least one appointment; [A] returns 409 VERSION_CONFLICT when deleting with stale version; [A] returns 404 NOT_FOUND for unknown project

### `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 02/03 requirement: detail response contains full aggregate sections

### `tests/integration/server/projects.entity-card-payload.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns complete project board, detail and sidebar appointment payloads; [A] reflects customer, project and relation changes in the next board, detail and sidebar payload

### `tests/integration/server/projects.order-items.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists newly added product and component items for a newly created project; [A] replaces existing product-based sauna model items in the same project; [A] replaces items in the same component category and supports list/delete; [A] replaces persisted product and component items when editing an existing project; [A] rejects creating a new order item with an inactive product; [A] rejects creating a new order item with an inactive component; [A] rejects order items without a single valid product-or-component reference

### `tests/integration/server/projects.order-number-conflict.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns false for blank order numbers; [B] treats only active projects as order-number conflicts

### `tests/integration/server/projects.paged-list.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns only one board page from a larger upcoming result set; [A] filters before paging and returns board appointment summary fields; [A] returns projectArticleItems on GET /api/projects with stable item ordering and empty arrays; [A] returns projectArticleItems on GET /api/projects/:id with stable item ordering; [A] adds optional source and shortcode metadata to projectArticleItems without changing ordering; [A] returns empty projectArticleItems arrays on GET /api/projects/:id; [A] returns correct attachmentsCount per project in paged list

### `tests/integration/server/projects.replace-order-items.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 200 with empty list when replacing on a project with no existing items; [A] replaces empty project with two new items and persists them; [A] replaces existing items completely – old items are no longer present after replace; [A] replaces existing items with empty list – all items are deleted; [A] is idempotent: calling replace twice with the same list yields the same result; [A] returns 422 and leaves original items unchanged when one item is invalid (productId + componentId both set); [A] returns 409 INACTIVE_ENTITY_ASSIGNMENT when replacing with an inactive product; [A] returns 404 when project does not exist

### `tests/integration/server/projects.scope.mengenlogik.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] UC 02/07 + UC 02/17: partitions all projects into withAppointments and noAppointments while upcoming stays narrower; [A] scope=withAppointments: liefert Projekte mit Terminen (past+future), schliesst Projekte ohne Termine aus; [A] scope=all: liefert auch Projekte ohne Termine

### `tests/integration/server/reports.auftragsliste.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns filtered product and component categories and substitutes shortcodes; [A] excludes reklamation projects and falls back to the earliest cancelled appointment; [A] filters by report tags and Sauna Modell values and sorts by tour before date; [A] rejects readers

### `tests/integration/server/reports.defaults.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns the last available project appointment date and ignores customer-only appointments; [A] allows DISPONENT and rejects READER

### `tests/integration/server/reports.produktionsplanung.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] groups selected categories and rejects the removed sonderblockTagIds parameter; [A] uses the earliest appointment in range as representative and aggregates card data; [A] excludes cancelled and reklamation projects from groups and projectRows; [A] treats Gespiegelt as an additional project card trigger; [A] allows dispatcher access and rejects reader access; [A] fuegt Artikel mit identischem Shortcode bei useShortCodes=true zusammen und trennt sie bei false; [A] trennt gleiche Shortcodes strikt nach Kategorie und fuehrt sie nicht kategorie-uebergreifend zusammen; [A] summiert Mengen ueber 10 Projekte mit identischem Shortcode korrekt zur Gesamtmenge

### `tests/integration/server/reports.produktionsplanung.projectRowsConsistency.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] matches a DB reference with strict exclusion for Reklamation and Storno

### `tests/integration/server/reports.vorlaufliste.actualDate.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] uses the earliest active appointment when multiple active appointments are inside the report window; [A] keeps a past appointment as actualDate when only that appointment is inside the report window; [A] uses the earlier past appointment when past and future appointments are both inside the report window; [A] keeps the earliest in-range appointment when a follow-up request removes toDate

### `tests/integration/server/reports.vorlaufliste.dateRange.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] zeigt Termin genau auf fromDate im Report; [A] schliesst Termin einen Tag vor fromDate aus dem Report aus; [A] zeigt Termin genau auf toDate im Report; [A] schliesst Termin einen Tag nach toDate aus dem Report aus; [A] zeigt Termin zwischen fromDate und toDate im Report; [A] zeigt Termin genau auf fromDate in projectRows; [A] schliesst Termin einen Tag vor fromDate aus projectRows aus; [A] zeigt Termin genau auf toDate in projectRows; [A] schliesst Termin einen Tag nach toDate aus projectRows aus; [A] zeigt Termin zwischen fromDate und toDate in projectRows

### `tests/integration/server/reports.vorlaufliste.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns one row per project with earliest matching appointment and project metadata; [A] allows dispatcher access and includes appointments after fromDate when toDate is omitted; [A] returns all active categories and keeps empty active category values as null; [A] rejects reader access with forbidden; [A] pages server-side in chunks of 100 projects; [A] derives reportState and actualDate from active and cancelled appointments; [A] marks rows with Sondermaß when the system tag is attached to an appointment; [A] substitutes shortcodes for article names when useShortCodes is true; [A] excludes projects tagged with Reklamation on project or appointment level from the report; [A] keeps partial and empty article rows stable when all report categories are selected; [A] excludes projects without appointments in the window and refreshes mutable fields on follow-up fetches; [A] liefert alle 23 Felder einer Vorlaufliste-Zeile mit exakten Werten

### `tests/integration/server/reports.vorlaufliste.printPreview.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns the full 105-row report without list pagination; [A] matches article values, reportState and highlightTag with the list endpoint; [A] allows dispatcher access and rejects readers

### `tests/integration/server/systemSeed.migration.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] benennt bestehenden Tag Vakant in Geparkt um; [A] benennt bestehende Tour Vakant in Parkplatz um; [A] ist idempotent: zweiter Aufruf nach Migration aendert nichts; [A] schlaegt nicht fehl wenn kein Vakant-Tag existiert; [A] schlaegt nicht fehl wenn keine Vakant-Tour existiert

### `tests/integration/server/teamsTours.versioning.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns VERSION_CONFLICT for stale team update/delete; [B] returns VALIDATION_ERROR for invalid team versions; [B] returns VERSION_CONFLICT for stale tour update/delete; [B] returns VALIDATION_ERROR for invalid tour versions

### `tests/integration/server/tour-print-preview.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] aggregates sauna model and print-only notes for the preview payload; [A] returns 404 for unknown tours; [A] returns appointments without tour assignment when tourId is 0; [A] liefert appointmentTag korrekt in appointmentTags der Response; [A] liefert customerTag korrekt in customerTags der Response; [A] liefert projectTag korrekt in projectTags der Response; [A] liefert leere Tag-Arrays wenn Termin keine Tags hat; [A] liefert Tags aus zwei Quellen korrekt in die richtigen Arrays; [A] liefert leeren projectName wenn Termin ohne Projekt angelegt ist

### `tests/integration/server/tour-print-preview.note-refresh.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] includes an appointment note after its print flag is enabled and the preview is requested again

### `tests/integration/server/tourWeekEmployees.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] lists week-planning cards for an employee grouped by tour and ISO week; [A] projects appointment and note counters for tour and employee week cards strictly by ISO week; [A] adds a week assignment, applies it to selected appointments and exposes it in the week list; [A] seeds the upcoming four tour weeks when the tour week list is opened; [A] keeps Parkplatz out of week-plan lists, availability and employee week plans without seeding a horizon; [A] blocks assigning the same employee to a second tour in the same ISO week; [A] filters the available week employee picker server-side to active and unassigned employees of the target ISO week; [A] rejects add preview and execute for current and past ISO weeks; [A] rejects add preview and execute for the system tour Parkplatz; [A] suppresses assignment previews and week mutations for the system tour Parkplatz; [A] marks understaffing in remove preview and removes the assignment plus employee from selected appointments; [A] uses the existing appointment overlap logic in assignment previews; [A] limits week previews to appointments inside the selected ISO week for single-day appointments; [A] creates a week assignment even when the selected week has no tour appointments; [A] keeps legacy assignment weeks visible alongside the seeded planning horizon; [A] keeps repeated add executes idempotent for the same employee in the same tour week; [A] blocks a week, parks appointments plus clears week assignments, exposes the blocked calendar feed and suppresses active week-plan previews; [A] unblocks a blocked week without restoring parked appointment state; [A] leaves cancelled appointments in the blocked tour week and excludes them from affected count; [A] keeps the assignment when all appointments conflict and only leaves future appointments untouched; [A] removes a week assignment even when no appointment in that week currently contains the employee; [A] bumps the appointment version so stale saves are rejected after a week-plan removal

### `tests/integration/server/tours.current-appointments.ft04.integration.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] returns 200 and array payload for valid tour id; [A] returns 400 for non-numeric tour id; [A] returns 400 for invalid fromDate format; [A] returns 200 with empty array for non-existing tour id

### `tests/integration/server/userSettings.categoryLayout.persistence.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists the global layout and exposes it through resolved settings; [A] rejects dispatcher writes to the global layout setting; [A] rejects invalid layout payloads for admins

### `tests/integration/server/userSettings.reportsProduktionsplanung.persistence.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists the slim produktionsplanung selection user-specifically; [A] persists the new range settings across reloads; [A] persists the auftragsliste selection and range settings across reloads; [A] keeps the legacy produktvorlauf selection readable as resolved fallback data

### `tests/integration/server/userSettings.reportsVorlaufliste.persistence.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists the user-specific column configuration across reloads; [A] normalizes legacy category fields out of the resolved setting

### `tests/integration/server/userSettings.weekLaneCollapse.persistence.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists lane settings user-specifically and keeps values across reload; [A] supports correction flow from invalid to valid expandedLaneId

### `tests/integration/server/userSettings.weekTileBodyMode.persistence.test.ts`

- Testtyp: Integration
- Datei-Klassifikation: A
- Datenqualität: echte API-/DB-Fixtures via Test-Helper
- Tatsächliche Assertions: HTTP-Status, Payload, DB- und Side-Effect-Assertions
- Kurzbegründung: starker fachlicher oder workflowbezogener Nachweis über Systemgrenzen
- Testfälle: [A] persists the week tile body mode user-specifically and keeps values across reload; [A] supports distinct persisted values across users

### `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx`

- Testtyp: Integration
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders article list before the notes section and highlights category labels; [C] renders the article list as a standalone section with headline; [C] renders components only when the selective section is asked to filter components; [C] renders no article section when components-only filtering removes every item; [C] uses shortcodes when explicitly enabled; [C] falls back to item names when shortcodes are missing or blank; [C] supports combined component filtering and shortcode substitution via the main renderer; [C] renders the notes as a standalone section with headline; [C] renders only the article section when description is empty; [C] renders only the description when article items are empty; [C] renders only the description when article filtering removes all items; [C] renders nothing when both fields are empty; [C] skips article items with missing values and keeps resolvable entries; [C] keeps article ordering stable after filtering and value substitution

### `tests/unit/TourenplanPrintPageNotes.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] rendert zwei Strip-Instanzen wenn zwei print=true-Notizen vorhanden; [E] rendert keinen Notizblock wenn keine print=true-Notizen vorhanden; [E] filtert print=false-Notizen heraus

### `tests/unit/TourenplanWeekNoteStrip.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] rendert im Farbdruck einen Hintergrundtint (cardColor + 1a); [E] rendert im Spardruck weißen Hintergrund (#ffffff); [E] rendert keinen Header-Bereich wenn title leer ist; [E] rendert die Header-Zeile wenn title gesetzt ist; [E] verwendet Fallback-Farbe #cbd5e1 wenn cardColor null; [E] rendert den Body-Text ohne HTML-Tags (stripHtmlToText)

### `tests/unit/auth/authController.logging.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] logs login_success after authenticated login; [B] logs login_failed on auth errors; [B] logs 2fa_success after verifyTwoFactor success; [B] logs 2fa_failed on auth errors; [B] logs quick_login after successful quick login; [B] logs logout after successful session destroy

### `tests/unit/auth/loginIdentifier.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] authenticates by email identifier

### `tests/unit/auth/monitoringSummary.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns a plain authenticated payload for dispatcher logins; [B] returns a plain authenticated payload for readers

### `tests/unit/auth/passwordHash.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] hashes and verifies a password

### `tests/unit/auth/quickLogin.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns quick-login targets with role availability; [B] logs in with the first active user of the requested role; [B] throws QUICK_LOGIN_DISABLED when feature flag is off; [B] throws USER_NOT_FOUND_FOR_ROLE when role has no active user; [B] throws TWO_FACTOR_REQUIRED when global 2FA is active

### `tests/unit/auth/twoFactorFlow.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns setup status when global 2FA is on and user has no secret; [B] stores encrypted secret after successful setup verification; [B] rejects verify when challenge is missing

### `tests/unit/authorization/roleGuards.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] rejects listUsers for non-admin context with 403; [E] rejects changeUserRole for non-admin context with 403; [E] prevents self-demotion of last admin with BUSINESS_CONFLICT; [E] prevents demotion when no other active admin remains; [E] maps roleCode to canonical roleKey and sets req.userContext; [E] fails deterministically when request userId is missing

### `tests/unit/authorization/userCreate.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] rejects non-admin context; [E] validates password length; [E] creates user and returns refreshed list; [E] maps duplicate repository error to BUSINESS_CONFLICT

### `tests/unit/config/runtimeEnv.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] loads development env exactly from .env.dev; [B] loads test env exactly from .env.test; [B] accepts changed .env.test allowlist database names without code changes; [B] fails fast with cwd and expected path for missing development env file; [B] fails fast with cwd and expected path for missing test env file; [B] does not load file in production and uses process env

### `tests/unit/config/storagePaths.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] resolves relative paths in development against process.cwd(); [B] resolves relative paths in test and production against process.cwd(); [B] keeps absolute paths unchanged; [B] fails on missing env variables; [B] fails on empty env value after trim

### `tests/unit/extraction/documentTextExtractor.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] extracts and normalizes text across pages; [E] throws deterministic error when no extractable text exists

### `tests/unit/ft04/TourTests.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] creates tours with deterministic generated names; [E] reuses freed numeric tour names after a previous tour was renamed; [E] updates an existing tour name and color; [E] rejects duplicate tour names case-insensitively; [E] rejects update with invalid version; [E] rejects delete with invalid version; [E] returns null when the requested tour no longer exists; [E] throws VERSION_CONFLICT when stale version hits existing tour; [E] maps delete conflict to NOT_FOUND when entity no longer exists; [E] returns BUSINESS_CONFLICT when appointments reference the tour; [E] throws typed ToursError for direct type checks

### `tests/unit/helpers/testIsolationCanaries.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] describes database and storage canary expectations; [B] writes upload canaries into the isolated attachment path; [B] writes backup canaries into the isolated backup path

### `tests/unit/helpers/testIsolationDiagnostics.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] reports candidate-only-green when legacy fails but candidate passes; [B] reports candidate-only-flaky when only the candidate run flakes; [B] reports fingerprint and failure-shape mismatches; [B] returns equivalent for matching stable runs

### `tests/unit/helpers/testIsolationExecution.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] normalizes windows paths and keeps stable metadata; [B] reads candidate execution config from env; [B] defaults validated rollout suites to candidate baseline without env overrides; [B] defaults validated browser rollout suites to seeded candidate baseline without env overrides; [B] defaults validated customer paging suites to core candidate baseline without env overrides; [B] defaults validated project scope browser suites to seeded candidate baseline without env overrides; [B] uses candidate baseline only for the targeted suite

### `tests/unit/helpers/testIsolationRegistry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] marks the paged projects suite as the first default rollout candidate; [B] marks the browser scope suite as a seeded default rollout candidate; [B] marks the paged customers suite as a core default rollout candidate; [B] marks the project scope browser suite as a seeded default rollout candidate; [B] matches registered suites by absolute path suffix; [B] contains the validated pilot suites

### `tests/unit/helpers/testStorageIsolation.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] configures stable isolated upload and backup env paths; [B] removes leftover files during reset

### `tests/unit/hooks/useListFilters.paging.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] resets paging to 1 when a filter changes or filters are reset; [B] passes the current page into query param construction

### `tests/unit/hooks/useSettings.produktionsplanungCategoryLayout.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] falls back to an empty layout for missing or invalid values; [B] keeps valid category entries unchanged; [B] maps the legacy block format to category entries with derived block numbers; [B] drops duplicate categories across multiple blocks

### `tests/unit/hooks/useSettings.vorlaufliste.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns empty defaults for invalid input; [B] normalizes configured columns, hidden columns and widths; [B] drops invalid configured arrays instead of partially keeping them; [B] ignores legacy category id fields from the old payload shape

### `tests/unit/hooks/useTagRuleEngine.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] loest Vorschlag aus fuer Reklamation ohne existierende Notiz; [B] loest keinen Vorschlag aus wenn Notiz mit Titel Reklamation bereits existiert; [B] loest Vorschlag aus fuer Messe Aufbau/Abbau ohne existierende Notiz; [B] loest keinen Vorschlag aus wenn Notiz mit Titel Messe Aufbau/Abbau bereits existiert; [B] loest Vorschlag aus wenn targetId null ist; [B] loest Vorschlag aus wenn targetId undefined ist; [B] loest keinen Vorschlag aus fuer unbekannte Tag-Namen; [B] loest keinen Vorschlag aus fuer Anmerkungen; [B] normalisiert Gross/Kleinschreibung beim Duplikat-Vergleich; [B] normalisiert fuehrende und nachfolgende Leerzeichen beim Duplikat-Vergleich; [B] loest Entfernen-Dialog aus fuer Reklamation wenn Notiz existiert; [B] loest keinen Dialog aus fuer Reklamation wenn keine Notiz existiert; [B] loest Entfernen-Dialog aus fuer Messe Aufbau/Abbau wenn Notiz existiert; [B] loest keinen Dialog aus fuer Messe wenn Notiz fehlt; [B] loest keinen Dialog aus fuer andere Tags; [B] normalisiert Titel-Vergleich case-insensitiv

### `tests/unit/invariants/adminMaintenancePolicy.dumpImportSafety.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] allows production dump import apply when the target matches the production allowlist; [B] allows other admin write endpoints to continue through the middleware in production; [B] blocks production dump import apply when the target is not allowlist-safe

### `tests/unit/invariants/attachmentRules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns 403 for project attachment delete when role is not allowed; [B] soft-deletes an existing project attachment for privileged roles; [B] uses inline disposition for PDF when download is not forced; [B] uses inline disposition for image mime types when download is not forced; [B] uses attachment disposition for non-inline mimes when download is not forced; [B] forces attachment disposition regardless of mime type when download flag is set

### `tests/unit/invariants/conflictPriority.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] throws EMPLOYEE_OVERLAP_CONFLICT with conflictEmployees metadata when overlap exists; [B] aborts before version-update path and employee writes when overlap exists; [B] still surfaces deterministic VERSION_CONFLICT if optimistic lock fails; [B] uses hour-based overlap key for timed updates

### `tests/unit/invariants/dbStartupGuard.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] accepts allowed database + host and creates pool; [B] fails fast when database is outside allowlist; [B] fails fast when host is outside allowlist

### `tests/unit/invariants/legacyMasterDataWiringScan.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] contains no removed FT27 legacy tokens in client/server/shared source files

### `tests/unit/invariants/lockingRules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] blocks update for non-admin on locked appointment with deterministic PAST_APPOINTMENT_READONLY; [B] blocks delete for non-admin on locked appointment with deterministic PAST_APPOINTMENT_READONLY; [B] blocks admin update on locked appointment with PAST_APPOINTMENT_READONLY; [B] blocks admin delete on locked appointment; [B] allows admin update for historical Parkplatz appointments; [B] allows delete for historical Parkplatz appointments

### `tests/unit/invariants/optimisticLocking.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] appointment update succeeds with matching version; [B] appointment update returns 409 VERSION_CONFLICT for stale version; [B] appointment delete returns 409 VERSION_CONFLICT for wrong version; [B] project update returns 409 VERSION_CONFLICT when repository reports version_conflict; [B] project delete returns 409 VERSION_CONFLICT when repository reports version_conflict; [B] project delete returns 409 BUSINESS_CONFLICT when repository reports business_conflict; [B] note update returns 409 VERSION_CONFLICT when repository reports version_conflict; [B] note delete returns 409 VERSION_CONFLICT when repository reports version_conflict

### `tests/unit/invariants/resetAbsoluteStateSqlGuard.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] contains SQLSTATE 45000 guard and *_test-only database rule

### `tests/unit/invariants/resetDatabaseGuard.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] throws when runtime mode differs from expected test mode; [B] accepts database and host from allowlists; [B] rejects database outside allowed list; [B] rejects host outside allowed list; [B] requires MUGPLAN_MODE=test for test operations; [B] rejects test write target without *_test suffix; [B] checks destructive targets with combined mode and target guards; [B] allows admin destructive operations in development when target is allowlisted; [B] rejects admin destructive operations in development when target is not allowlisted; [B] blocks admin destructive operations in production; [B] requires strict test guards for admin destructive operations in test mode; [B] accepts SQL identity when active database matches expected test db; [B] rejects SQL identity when active database differs from expected test db; [B] rejects SQL identity when active database cannot be resolved

### `tests/unit/lib/appointmentCancellation.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] detects the reserved cancellation tag name case-insensitively; [B] detects the managed FT26 report tags and keeps remarks unprotected; [B] detects managed tags across server-side helpers; [B] filters only the reserved cancellation tag from visible picker collections

### `tests/unit/lib/auftragsliste-print-model.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] moves a full card to the next page when it no longer fits; [B] returns an empty first page for empty reports

### `tests/unit/lib/calendar-utils.tour-order.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] sorts numeric tours before renamed tours and keeps unassigned last; [B] treats null or blank names as unassigned and keeps them after renamed tours

### `tests/unit/lib/calendarConsistency.date-kw.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] keeps ISO week numbers and ISO week years stable around month and year boundaries; [B] resolves end dates and durations for same-day, overlapping and cross-week appointments; [B] sorts same-day appointments by time and falls back to ID for identical timestamps

### `tests/unit/lib/employeeAppointmentsUtilization.rules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] builds a fixed six-week ISO window from the current week; [B] groups weeks by the month of their week start and sorts day segments deterministically; [B] creates visible continuation segments for each day of a multi-day appointment

### `tests/unit/lib/isoWeekInput.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] sanitizes free text down to numeric iso week input; [B] normalizes numeric iso week values without inventing week zero; [B] parses only strict numeric iso week values; [B] parses only valid iso week input strings; [B] steps iso week values within the bounded range

### `tests/unit/lib/kwJump.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns null for invalid base values; [B] rejects kw 53 in a short iso year and allows kw 52; [B] allows kw 53 in a long iso year; [B] returns the correct monday across iso year boundaries

### `tests/unit/lib/masterDataPdfMining.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] partitions files by maxFiles and maxTotalBytes and rejects oversized files locally; [B] merges batch results deterministically across product groups

### `tests/unit/lib/monitoring.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] shows a toast when the monitoring result gets worse; [B] does not show a toast when the monitoring result stays the same or improves; [B] refreshes monitoring for reader roles as well

### `tests/unit/lib/monitoringFilters.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] filters monitoring rows by combined text and number matches; [B] matches customer and order identifiers case-insensitively without requiring separator input; [B] filters tours exactly and matches trigger filters against combined trigger rows; [B] formats customer names from explicit parts first and falls back to the legacy name

### `tests/unit/lib/printText.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] normalizes HTML text into plain text; [B] keeps employee short names stable

### `tests/unit/lib/produktionsplanungCategoryLayout.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] sorts the full list alphabetically before it fills multiple columns

### `tests/unit/lib/projectArticleList.render-options.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] keeps all valid items by default; [B] filters to components only when requested; [B] drops entries without explicit component source in components-only mode; [B] uses shortcodes when enabled and present; [B] falls back to item names when shortcodes are missing, null or blank; [B] trims labels and resolved values and removes empty rows after resolution; [B] returns an empty list for nullish inputs; [B] resolves single display values with safe fallback semantics

### `tests/unit/lib/projectArticleList.reports.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] recognizes sauna product category aliases for reports; [B] keeps component category aliases compatible with report columns

### `tests/unit/lib/projectFilters.orderNumber.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] filters projects by partial order number match; [B] does not filter when order number filter is empty

### `tests/unit/lib/projectProductForm.description.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] builds article lines in slot order; [B] persists the editor description unchanged; [B] returns the persisted description unchanged back into the editor; [B] matches project component fields through normalized category aliases; [B] maps product and component order items into the article slots

### `tests/unit/lib/reportProduktionsplanung.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] merges quantities by shortcode when enabled; [B] keeps items separate when shortcodes are disabled; [B] collects only managed card reason tags from project and appointment tags

### `tests/unit/lib/reportRangeFromKw.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] gibt undefined für undefined zurück; [B] gibt undefined für Nicht-Ganzzahlen zurück; [B] verwirft Werte unterhalb von 1; [B] klemmt auf Maximum 53; [B] gibt gültige Werte unverändert zurück; [B] gibt 1 für undefined zurück; [B] gibt 1 für Nicht-Ganzzahlen zurück; [B] klemmt auf Minimum 1; [B] klemmt auf Maximum 52; [B] gibt gültige Werte unverändert zurück; [B] gibt null zurück wenn kwStart undefined ist; [B] gibt null zurück wenn kwStart 0 ist; [B] gibt null zurück wenn KW 53 im Kurzjahr nicht existiert; [B] berechnet KW 14 2026 mit 1 Woche korrekt; [B] berechnet KW 14 2026 mit 2 Wochen korrekt; [B] normalisiert weekCount undefined auf 1 und liefert Einwochenfenster; [B] erlaubt KW 53 in einem Langjahr

### `tests/unit/lib/reportVorlaufliste.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] strips html descriptions down to normalized text

### `tests/unit/lib/tag-utils.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] builds a title-cased short label for single-word tags with an abbreviation dot only when needed; [B] builds uppercase initials for multi-word tags; [B] deduplicates merged tag collections by tag id while preserving first occurrence order; [B] keeps only Sondermaß and Reklamation for the tour print info pills

### `tests/unit/lib/tourDisplayOrder.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] sorts numbered tours before custom tour names

### `tests/unit/lib/tourPostalPlan.navigation.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] startet immer am Beginn der kommenden ISO-Woche; [B] liefert ohne max.-KW keine Begrenzung; [B] berechnet die max.-KW im laufenden ISO-Jahr; [B] interpretiert kleinere KWs als Ziel im nächsten ISO-Jahr; [B] kappt das sichtbare Fenster an der max.-KW

### `tests/unit/lib/tourPostalPlan.rules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] priorisiert stärkere PLZ-Präfixe vor schwächeren; [B] nutzt die Trefferzahl als Tie-Breaker innerhalb derselben Woche; [B] ignoriert Termine ohne explizite Tour; [B] ignoriert Touren ausserhalb des Musters Tour Zahl

### `tests/unit/lib/tourenplan.model.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] resolves tags with the required priority order; [B] keeps helper-based employee badges and project descriptions stable after helper extraction; [B] builds week-based print pages with a marker entry per week; [B] merges note and description text into the page model without raw HTML leftovers; [B] moves the next calendar week to a new page when the current page is already filled; [B] accounts for long print notes as a separate height block during pagination; [B] fills the current page with the next week when the measured card heights still fit; [B] starts every selected tour section on a new page and keeps page numbers continuous

### `tests/unit/lib/vorlauflistePrintModel.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] splits rows into stable ISO-week sections and carries long weeks onto follow-up pages; [B] scales widths proportionally for the available print width; [B] returns an empty page list for empty rows

### `tests/unit/logger.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] logError writes to daily log and error.log; [E] logInfo writes only to the daily log; [E] logAuth writes to the daily log and auth.log; [E] uses YYYY-MM-DD.log for the daily file name; [E] respects LOG_DIR overrides

### `tests/unit/script/migrateProjectNamesWithCustomerNumber.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns update when prefix customer number matches related customer; [E] returns skip on mismatching embedded customer number; [E] returns skip when no prefix pattern is present

### `tests/unit/services/appointments.cancellation.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] clears employees and adds the reserved cancellation tag for active appointments; [B] repairs already-cancelled direct appointments without touching project amounts; [B] rejects cancellation when the appointment version is stale; [B] blocks cancellation for historical appointments before changing relations; [B] allows cancellation for historical appointments on Parkplatz

### `tests/unit/services/appointments.employee-removal.versioning.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] removes an employee when the appointment version matches; [B] returns VERSION_CONFLICT when the appointment version is stale; [B] rejects invalid appointment versions; [B] blocks employee removal for historical non-Parkplatz appointments; [B] allows employee removal for historical Parkplatz appointments; [B] blocks employee removal for planning blocked appointments

### `tests/unit/services/appointments.park.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] entfernt alle Mitarbeiter, setzt Parkplatz-Tour und Geparkt-Tag atomar; [B] gibt ALREADY_PARKED zurueck wenn Termin bereits in Parkplatz-Tour ist; [B] gibt VERSION_CONFLICT zurueck bei veralteter Version; [B] blockiert historische Termine mit PAST_APPOINTMENT_READONLY; [B] blockiert stornierte Termine mit CANCELLED_APPOINTMENT_READONLY; [B] blockiert planung blockierte Termine mit PLANNING_BLOCKED_APPOINTMENT_READONLY; [B] gibt BUSINESS_CONFLICT zurueck wenn Parkplatz-Tour fehlt; [B] gibt BUSINESS_CONFLICT zurueck wenn Geparkt-Tag fehlt; [B] verweigert Parken fuer LESER mit FORBIDDEN; [B] gibt { found: false } zurueck wenn Termin nicht existiert; [B] verweigert Parken mit ungültiger Version; [B] setzt Messe-Tag still wenn ein Termin direkt auf Tour Messe angelegt wird; [B] entfernt Geparkt-Tag still wenn Tour von Parkplatz auf andere Tour wechselt; [B] erlaubt historische Parkplatz-Termine fuer Update, Zukunftsumplanung und Rueckdatierung; [B] entfernt Geparkt-Tag nicht wenn Tour nicht Parkplatz war; [B] setzt Messe-Tag still wenn auf Tour Messe gewechselt wird; [B] entfernt Messe-Tag still wenn von Tour Messe auf andere Tour gewechselt wird; [B] veraendert Messe-Tag nicht wenn kein Messe-Tourwechsel stattfindet

### `tests/unit/services/backupRetentionService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] removes backup folders older than 30 days and keeps newer ones

### `tests/unit/services/backupScheduler.disabled.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] writes skipped disabled log when backup_enabled is false; [B] does not write disabled skipped log when backup_enabled is true

### `tests/unit/services/bulkImportService.limits.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] rejects analyze when file count exceeds maxFiles; [B] rejects analyze when a single file exceeds maxFileSizeBytes; [B] converts only pdf files to bulk import inputs

### `tests/unit/services/customersService.country-forwarding.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] trims and forwards country during create; [B] normalizes blank country to null and forwards it during update

### `tests/unit/services/customersService.duplicateCustomerNumber.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] maps mysql duplicate entry on customer_number to CUSTOMER_NUMBER_CONFLICT; [B] maps drizzle query errors with duplicate mysql cause to CUSTOMER_NUMBER_CONFLICT; [B] rethrows non-duplicate errors

### `tests/unit/services/documentArticleDeterministicParser.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] extracts item count and merges multiline descriptions; [B] removes price and tax content from descriptions; [B] throws when marker range is missing; [B] extracts normalized total amount from Gesamtbetrag line; [B] returns null when Gesamtbetrag line is missing or unparsable

### `tests/unit/services/documentArticleMasterDataParser.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] extracts product name from marker and keeps component descriptions separate; [B] throws when no product marker exists

### `tests/unit/services/documentHeaderDeterministicParser.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] extracts inline label-value header fields in one line; [B] extracts phone from label Kunden - Tel.; [B] extracts phone from inline label Kunden Tel.; [B] extracts phone from Telefon label without customer prefix; [B] extracts customer number, order number and mobile; [B] allows missing mobile number and returns null; [B] parses WaWi address lines with spaced house number token; [B] parses address block when salutation line is missing; [B] skips interleaved generic lines and still maps correct numeric values; [B] returns null mobile when mobil label has no valid number; [B] prefers mobile when both mobile and tel labels contain different valid numbers; [B] selects first valid mobile when multiple mobile numbers exist; [B] selects first valid tel when no mobile number exists; [B] does not map date values as mobile numbers; [B] does not map date values as tel numbers; [B] ignores free text after mobile label; [B] ignores free text after tel label; [B] parses company-only identity without forcing person names; [B] parses inline salutation person plus dedicated company line; [B] parses person identity with unicode letters and OCR accent artifacts; [B] parses slash-separated surname line without forcing a first name; [B] throws deterministic address-pattern error when street line is missing; [B] parses a foreign address block with a leading house number and country line; [B] returns partial project extraction with warning when only the customer address line is unreadable; [B] throws when customer number is missing; [B] throws when multiple customer numbers are found

### `tests/unit/services/documentProcessing.customerResolution.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns none when no customer exists; [B] returns single when exactly one customer exists; [B] returns multiple when more than one customer exists; [B] maps duplicate flag from resolution count

### `tests/unit/services/documentProcessing.projectResolution.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns none when no project exists; [B] returns single with the latest appointment when exactly one project exists; [B] returns single with null latestAppointment when the project has no appointments; [B] returns multiple when more than one project exists

### `tests/unit/services/dumpService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] createDump: LESER erhält 403; [B] listDumps: LESER erhält 403; [B] resolveDumpDownloadPath: LESER erhält 403; [B] importDump: LESER erhält 403; [B] deleteDump: LESER erhält 403; [B] previewDumpImport returns warning for legacy dumps in development; [B] previewDumpImport toleriert fehlende bekannte Tabellen in manifest.json mit Warnung; [B] previewDumpImport blocks legacy dumps in production; [B] applyDumpImport blocks hash mismatch and wrong confirmation phrase; [B] importDump: wirft 403 wenn Laufzeitmodus production ist; [B] importDump: scheitert in development am ZIP-Parsing statt am Environment-Guard; [B] enthält tours im erlaubten Dump-Satz; [B] schließt users und roles explizit aus; [B] resolveDumpDownloadPath: gültiger Dateiname ohne Datei → 404; [B] resolveDumpDownloadPath: Path-Traversal-Versuch → 422; [B] deleteDump: vorhandene Datei wird gelöscht; [B] lehnt ZIP ohne versioniertes Format ab; [B] ignoriert unbekannte Tabellen und loggt sie einmal; [B] füllt fehlende bekannte Tabellen tolerant mit leeren Arrays auf; [B] lehnt bekannte Tabellen mit ungültigem Datentyp weiter ab; [B] fällt beim Upload-Restore bei EXDEV von rename auf copy zurück

### `tests/unit/services/employees.importCsv.ft23.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] imports valid semicolon csv rows and returns summary; [B] accepts comma delimiter and trims values; [B] marks duplicate against existing employees case-insensitive; [B] marks duplicate within CSV file; [B] marks invalid row when name too long; [B] marks invalid row on broken quotes; [B] throws INVALID_CSV_HEADER when required header is missing; [B] syncs CSV idempotently, returns employee ids and skips invalid rows

### `tests/unit/services/employeesService.ft05.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] createEmployee builds fullName and returns repository employee; [B] listEmployees enforces active scope for non-admin and respects requested scope for admin; [B] getEmployeeWithRelations returns null for non-admin when employee is inactive; [B] getEmployeeWithRelations returns employee with team but without direct tour for admin; [B] updateEmployee rejects version < 1; [B] updateEmployee returns null when employee does not exist; [B] updateEmployee forbids non-admin isActive change; [B] updateEmployee maps stale version to VERSION_CONFLICT; [B] updateEmployee with identical values documents delegated version behavior; [B] toggleEmployeeActive rejects non-admin; [B] toggleEmployeeActive rejects invalid version; [B] toggleEmployeeActive maps stale version to VERSION_CONFLICT; [B] toggleEmployeeActive returns null when conflict path finds no employee; [B] toggleEmployeeActive updates and increments version for admin

### `tests/unit/services/extractionFallback.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] removes common EUR/price patterns from text block; [B] builds resilient fallback extraction with non-empty essentials

### `tests/unit/services/helpTextFrontendKeyScanService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] collects static keys and reports duplicate usage counts; [B] ignores dynamic key expressions; [B] returns warning when frontend root does not exist

### `tests/unit/services/helpTextsService.seedMissing.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] creates only missing keys and skips existing keys; [B] is effectively idempotent when all keys already exist; [B] returns warnings when scanner yields no keys

### `tests/unit/services/journalService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] adds self context, deduplicates contexts, expands parent hierarchy and stores a raw fallback when no message is provided; [B] resolves appointment parent contexts from the current snapshot without an extra repository lookup; [B] logs repository failures and does not rethrow them; [B] allows ADMIN to list journal messages and forwards the repository result; [B] rejects LESER when listing journal messages; [B] rejects invalid pagination when listing journal messages; [B] maps note owners to journal contexts including transitive parent contexts; [B] builds a stable calendar week context key

### `tests/unit/services/masterDataPdfMiningService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] skips single-entry and non-sauna article lists, but keeps Schlaffass/Gartenfass single-item products

### `tests/unit/services/masterDataService.ft27.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] blocks non-admin access with FORBIDDEN; [B] normalizes undefined filter to active; [B] maps duplicate category create to BUSINESS_CONFLICT; [B] maps product update version conflict to VERSION_CONFLICT; [B] maps referenced category delete to BUSINESS_CONFLICT; [B] allows deleting default product category when it is unused; [B] does not block deleting legacy category name by default protection; [B] blocks deleting component category with usage counts; [B] returns detailed BUSINESS_CONFLICT metadata when deleting a component used in project order items; [B] maps product create FK conflict to BUSINESS_CONFLICT; [B] maps drizzle duplicate cause on component create to BUSINESS_CONFLICT; [B] normalizes empty or trimmed shortCode values before persisting; [B] imports products for a category with create update reactivate and defaults; [B] rejects product import without Name header; [B] rejects component import for missing category; [B] imports components idempotently and marks duplicate rows inside csv as invalid; [B] accepts single-column Name csv for component import

### `tests/unit/services/masterDataService.ft28.tags.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] blocks non-admin access with FORBIDDEN; [B] listet Tags ohne implizites Nachziehen von System-Tags; [B] creates tags with isDefault=false; [B] maps duplicate create to BUSINESS_CONFLICT; [B] blocks delete when relations exist; [B] maps delete version conflict to VERSION_CONFLICT; [B] maps duplicate update to BUSINESS_CONFLICT; [B] blocks updating the reserved cancellation tag; [B] blocks deleting the reserved cancellation tag; [B] blocks updating the managed report exclusion tag; [B] blocks deleting the managed report exclusion tag; [B] blocks updating the managed special measure tag; [B] blocks deleting the managed special measure tag; [B] erzwingt den System-Seed nicht mehr beim Tag-Listing

### `tests/unit/services/monitoringService.ft31.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns exactly one monitoring row per appointment with combined trigger information; [B] loads all future appointments when all-appointments is enabled; [B] skips cancelled and historical appointments for both triggers; [B] allows readers to list monitoring items; [B] builds a summary only for dispatcher or admin and groups by trigger

### `tests/unit/services/projectsService.projectNameNormalization.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] persists plain project name on create; [B] trims name on explicit update; [B] keeps name unchanged when only customer changes; [B] returns VALIDATION_ERROR when customer cannot be resolved

### `tests/unit/services/projectsService.requiredFields.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] returns VALIDATION_ERROR when customerId is missing; [B] returns VALIDATION_ERROR when customerId does not exist; [B] returns VALIDATION_ERROR when orderNumber is empty

### `tests/unit/services/systemSeedService.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] legt fehlende Tags an und protokolliert sie; [B] meldet fehlende Soll-Einträge in der Preview als anlegbar; [B] behandelt vorhandene Tags idempotent; [B] legt fehlende Touren an; [B] führt nur explizit ausgewählte Seed-Schritte aus; [B] aktualisiert bestehende Tour-Farben auf den Sollzustand; [B] legt fehlende Notizvorlagen an; [B] ueberschreibt bestehende Notizvorlagen-Bodies beim Update nicht; [B] migriert Tag Vakant zu Geparkt und protokolliert die Migration; [B] migriert Tour Vakant zu Parkplatz und protokolliert die Migration; [B] laeuft fehlerfrei wenn kein Vakant-Tag existiert (idempotent); [B] laeuft fehlerfrei wenn keine Vakant-Tour existiert (idempotent); [B] legt Parkplatz-Tour nach Migration als regulaere Soll-Tour an wenn nicht vorhanden; [B] arbeitet in fester Reihenfolge: Tags, Touren, Notizvorlagen

### `tests/unit/services/teamEmployeesService.ft11.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] rejects assign when at least one item has invalid version; [B] rejects remove when version is invalid; [B] returns NOT_FOUND on assign when employee does not exist; [B] returns VERSION_CONFLICT on assign when employee exists but version is stale; [B] aborts transactional batch assign on conflict without returning partial success; [B] returns null on remove conflict when employee is already missing

### `tests/unit/services/teamsService.ft11.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] generates team name on server and ignores client-provided name; [B] keeps generated names unique when existing names already contain next slot; [B] rejects update when version is invalid; [B] rejects delete when version is invalid; [B] maps update version conflict to null when team no longer exists; [B] maps update version conflict to VERSION_CONFLICT when team still exists; [B] maps delete version conflict to NOT_FOUND when team is gone; [B] maps delete version conflict to VERSION_CONFLICT when team still exists

### `tests/unit/services/tourEmployeesService.ft04.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] maps eligible, already assigned and overlap-blocked appointments for add preview; [B] filters remove preview down to future appointments that still contain the employee

### `tests/unit/services/tourWeekEmployeesService.weekRules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] resolves ISO week bounds across the year boundary; [B] treats current and past weeks as locked; [B] keeps future weeks editable

### `tests/unit/settings/authTwoFactor.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] defines global two-factor toggle with default false

### `tests/unit/settings/backupEnabled.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] defines backup_enabled as GLOBAL boolean with default true; [E] validates only boolean values; [E] defines backup_lane_tour_ids as GLOBAL string; [E] accepts only csv values with max 3 positive unique ids

### `tests/unit/settings/entityFormShellWidths.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] defines the user shell width settings with stable defaults

### `tests/unit/settings/monitoring.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] defines the global TR-01 settings with stable defaults

### `tests/unit/settings/reportsAuftragsliste.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] stores the selection key as user-scoped json with categories and shortcode flag; [E] validates the dedicated range config

### `tests/unit/settings/reportsProduktionsplanungCategoryLayout.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] uses a GLOBAL-scoped json setting with an empty-array default; [E] accepts valid category entries with unique ids and blocks; [E] accepts the legacy block format for bestehende persisted values; [E] rejects invalid payloads, duplicate ids and invalid columns

### `tests/unit/settings/reportsProduktionsplanungSelection.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] stores reports.produktionsplanung.selection as a slim USER-scoped json setting; [E] validates the new range settings for both reports; [E] keeps the legacy produktvorlauf selection key valid for old payloads

### `tests/unit/settings/reportsTourenplan.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] validates the user-scoped range config; [E] stores the print mode as a global enum; [E] stores the font size as a user enum

### `tests/unit/settings/reportsVorlauflisteCategorySelection.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] uses a USER-scoped json setting with an empty object default; [E] accepts the new column configuration shape; [E] rejects invalid arrays, non-boolean flags and invalid widths; [E] ignores legacy category fields instead of rejecting the payload

### `tests/unit/settings/settingsProvider.versioning.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] resolves version by selected scope; [E] falls back to version 1 when scope is allowed but no persisted scope value exists; [E] increments the optimistic scope version for consecutive updates; [E] keeps optimistic first-write version at 1 when no persisted scope value exists; [E] retries once after VERSION_CONFLICT using refreshed version; [E] sends version 1 when current scope version is missing but scope is allowed; [E] does not send fallback version when setting is unknown; [E] detects VERSION_CONFLICT from error message

### `tests/unit/settings/useSettings.attachmentPreviewSize.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns valid enum values unchanged; [E] falls back to large for missing values; [E] falls back to large for invalid values

### `tests/unit/settings/useSettings.auftragsliste.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] normalizes the selection payload; [E] normalizes the range config payload

### `tests/unit/settings/useSettings.entityFormShellWidths.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns valid width values unchanged; [E] falls back to defaults for missing values; [E] falls back to defaults for invalid values

### `tests/unit/settings/useSettings.helpTextPreviewSize.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns valid enum values unchanged; [E] falls back to large for missing values; [E] falls back to large for invalid values

### `tests/unit/settings/useSettings.reportsRangeConfig.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] normalizes the vorlaufliste range config including legacy columns values and persisted dates; [E] normalizes the produktionsplanung range config without allowing the columns tab; [E] keeps the new and legacy produktionsplanung selection resolvers separate; [E] normalizes the tourenplan settings for range config and print mode

### `tests/unit/settings/useSettings.toastDesktopPosition.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns valid enum values unchanged; [E] falls back to bottom-right for missing values; [E] falls back to bottom-right for invalid values

### `tests/unit/settings/useSettings.weekTileBodyMode.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] returns valid enum values unchanged; [E] falls back to semiexpanded for missing values; [E] falls back to semiexpanded for invalid values

### `tests/unit/settings/userSettingsResolvedMapping.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: kontrollierte Stubdaten / gemockte Repositories
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] maps scope versions and resolvedVersion for USER resolved values; [E] keeps version fields undefined when only default value resolves; [E] maps global version and resolved value for hoverPreviewOpenDelayMs; [E] maps global version and resolved value for toastDesktopPosition; [E] maps FT03 week lane settings with USER scope and versions; [E] maps week tile body mode with USER scope and version; [E] maps user version and resolved value for helpTextPreviewSize; [E] maps user versions and resolved values for entity form shell widths

### `tests/unit/settings/weekTileBodyMode.registry.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] registers the week tile body mode as a user enum with semiexpanded default

### `tests/unit/standaloneRouting.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: E
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: unklar oder nur strukturell zuordenbar
- Testfälle: [E] translates the KW query parameters into the expected currentDate; [E] writes the currentDate back into stable kw and year query parameters; [E] maps a year change from the last ISO week into the next ISO year correctly; [E] falls back to today when the week query is missing or invalid

### `tests/unit/ui/allComponentList.shortcode-labels.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders shortcode labels for components with and without shortcode

### `tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders pending appointment attachments in create mode alongside customer and project groups; [D] uses dedicated appointment download routes in edit mode; [D] disables the appointment upload action in readonly mode

### `tests/unit/ui/appointmentCancelConfirmDialog.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders shared cancellation copy and default action label; [D] renders pending label and disables actions while request is running

### `tests/unit/ui/appointmentCountBadge.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] zeigt standardmaessig den Text 'Geplante Termine'; [D] uebernimmt ein explizites Label fuer Tourkarten

### `tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders visible team, tour and assignment sections while no tour is selected; [D] hides the tour picker after a tour is selected and shows assigned employees; [D] hides team and tour selection actions in readonly mode while keeping assigned employees visible

### `tests/unit/ui/appointmentForm.follow-save-result.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] offers follow when the start date changes within the same calendar week; [C] offers follow when the tour changes; [C] does not offer follow for unchanged edit saves

### `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps create mode flow in the main column and routes tour selection through AppointmentEmployeeSlot; [D] renders attachments, tags and notes inside the sidebar in create mode; [D] renders attachments, tags and notes inside the sidebar in edit mode; [D] keeps cancel and park actions in edit mode without rendering the former tooltip texts; [D] keeps document extraction in create mode only, while edit mode stays focused on sidebar content; [D] keeps the start date section before the project slot inside the shell main column; [D] keeps editable shell actions in header and footer for create mode; [D] keeps the tour picker inside the employee panel when no tour is selected

### `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders a visible back button only when overlay mode requests it; [C] passes one shared close handler into close and cancel slots; [C] uses onSaved after a successful cancellation mutation; [C] sends the fresh appointment version in the cancellation request body

### `tests/unit/ui/appointmentForm.readOnlyFields.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the project slot as readonly when the project field is context-locked; [D] renders the customer slot as readonly when the customer field is explicitly locked

### `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders future appointments for readers as pure readonly mode

### `tests/unit/ui/appointmentForm.relationSlots.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] loads projects via scope=all and renders project/customer cards for a selected project; [C] falls back to the project detail query with article items when the list response does not contain the project; [C] keeps both relation slots selectable when no project context exists

### `tests/unit/ui/appointmentForm.tourenplanInvalidation.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] invalidates appointment and hover preview queries after an appointment note update

### `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders a visible project header with project name and trailing order number; [D] renders the hover trigger only when full description preview is enabled; [D] renders den Projekt-Fallback mit Hover-Trigger und dezenter Leer-Nachricht im kollabierten Body; [D] renders a hover-enabled collapsed project header in compact mode; [D] renders full detail content with a wrapped article list and four-line notes clamp

### `tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] returns fallback width when no value is stored; [D] returns stored width when a valid value exists; [D] rejects invalid stored values; [D] uses at least 320px for sidebar/table profile when no width is stored; [D] uses measured width for sidebar/table profile when it is larger than 320px; [D] renders weekly appointment previews in detail body mode with cursor positioning

### `tests/unit/ui/appointmentsFilterPanel.tourOrder.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders all tours before numbered and custom tours in display order

### `tests/unit/ui/appointmentsListPage.controlled-state.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prefers controlled filters, paging, sorting and appointment scope; [C] keeps the standalone fallback defaults when no controlled props are passed; [C] resets scope and free filters back to the base appointments set; [C] does not clear a standalone tour filter back to all tours; [C] marks the focused appointment row when the focus metadata points to the current page

### `tests/unit/ui/appointmentsListPage.fixedDateRange.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] passes fixed week dates to filters and hides the period picker

### `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] hides tour filter and tour column in tour context; [D] keeps the tour column in standalone mode and marks cancelled rows as non-removable

### `tests/unit/ui/attachmentCounter.staleGuard.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] zeigt den aktualisierten Counter nach Soft-Delete (3 -> 2); [D] zeigt den aktualisierten Counter nach Hard-Delete (2 -> 1); [D] zeigt einen sichtbaren `0`-Counter mit leerem Preview, wenn das letzte Attachment gelöscht wurde; [D] normalisiert negative totalAttachmentsCount auf 0 und zeigt denselben leeren Preview-Zustand; [D] listet das gelöschte Attachment nach Soft-Delete nicht mehr auf; [D] zeigt keinen veralteten Dateinamen nach Löschung des letzten Attachments; [D] zeigt nach Hard-Delete nur noch die verbleibenden Anhänge in der Hover-Preview; [D] nutzt den Query-Key '/api/appointments/:id/attachment-context' für Counter und Preview; [D] zeigt 'Keine Anhänge vorhanden.' wenn Query-Daten nicht vorhanden sind

### `tests/unit/ui/attachmentInfoBadgePreview.sizing.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] resolves explicit option sizes for small, medium and large; [D] keeps size profiles ordered from small to large; [D] renders dynamic container and iframe heights from the selected profile; [D] renders image without a maxHeight constraint on the content container; [D] renders image the same way regardless of previewSize; [D] renders PDF with maxHeight on content container; [D] positions image previews with their actual rendered width instead of the maximum width; [D] keeps image previews pinned inside the viewport vertically

### `tests/unit/ui/attachmentPreview.drag.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] shows close button when onClose is provided; [D] does not show close button when onClose is not provided; [D] title bar has cursor grab style when a drag handle is wired; [D] close button has correct aria-label for accessibility; [D] open link targets new tab; [D] close button appears for image previews as well

### `tests/unit/ui/attachmentProjectionInvalidation.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] invalidiert nach Projektattachment-Upload lokale Liste, Kalender und Appointment-Context; [D] invalidiert nach Kundenattachment-Upload lokale Liste, Kalender und Appointment-Context

### `tests/unit/ui/attachmentsPanel.delete.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] invalidiert nach Soft-Delete den Projekt-Query-Key, die Kalenderprojektion und den Appointment-Context; [D] invalidiert nach Hard-Delete den Projekt-Query-Key, die Kalenderprojektion und den Appointment-Context; [D] invalidiert nach Soft-Delete den Kunden-Query-Key, die Kalenderprojektion und den Appointment-Context; [D] invalidiert nach Soft-Delete den Mitarbeiter-Query-Key, die Mitarbeiterlistenprojektion und die Kalenderprojektion; [D] invalidiert nach Soft-Delete den Termin-Query-Key, die Kalenderprojektion und den Appointment-Context; [D] zeigt 'Projekt' fuer Projektanhaenge; [D] zeigt 'Kunde' fuer Kundendokumente; [D] zeigt 'Mitarbeiter' fuer Mitarbeiteranhaenge; [D] zeigt 'Termin' fuer Terminanhaenge; [D] invalidiert nichts ohne erfolgreichen Abschluss; [D] rendert keinen Action-Button ohne Edit-Rechte; [D] rendert keinen Action-Button bei historischen Terminen; [D] rendert den Action-Button mit Delete-Optionen bei editierbaren Attachments; [D] invalidiert bei Mutation-Fehler nicht

### `tests/unit/ui/attachmentsPanels.helpIcon.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps panel-specific help keys for project, customer and employee attachments

### `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the reordered header without a footer row

### `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders description, article labels and generalized footer; [D] omits the body wrapper when article values and description are empty

### `tests/unit/ui/calendarAppointmentCompactBar.conflictBadge.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders a high-contrast conflict badge on conflict bars; [C] does not render a conflict badge when the bar is not marked as conflict; [C] dims blocked compact bars so the slot overlay stays readable

### `tests/unit/ui/calendarAppointmentCompactBar.menuSlot.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] menuSlot wird gerendert wenn übergeben; [C] menuSlot fehlt wenn nicht übergeben; [C] menuSlot wird mit showPopover=true gerendert; [C] menuSlot wird mit showPopover=false gerendert

### `tests/unit/ui/calendarDragDrop.conflict-feedback.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] blocks cancelled appointments from being dragged in the month sheet while regular appointments stay draggable; [C] blocks cancelled appointments from being dragged in the week view while regular appointments stay draggable; [C] blocks planning blocked appointments from being dragged in month sheet and week view; [C] keeps historical Parkplatz appointments draggable while other historical appointments stay blocked; [C] blocks drag interactions for reader readonly mode in month sheet and week view

### `tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps month-sheet appointments draggable and writes the appointment id into dataTransfer; [D] keeps week-view appointments draggable and writes the appointment id into dataTransfer; [D] keeps historical Parkplatz appointments draggable in month sheet and week view

### `tests/unit/ui/calendarFilterPanel.conflictHighlight.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders no conflict control when no conflicts are available; [C] renders an inactive button without badge and shows the badge when active; [C] toggles the callback when the button is clicked

### `tests/unit/ui/calendarFilterPanel.kwJump.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the kw spinner only when week jumping is enabled; [C] submits on enter and blur and renders the back button when enabled; [C] marks the kw spinner visibly when kwJumpError is set; [C] renders the kw input as a text-based numeric spinner field

### `tests/unit/ui/calendarFilterPanel.weekActionRow.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the compact week footer grid with KW next to the employee filter; [C] keeps kw and conflict controls without a second footer row

### `tests/unit/ui/calendarMonthSheetView.blockedSlotInteraction.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] detects a blocked slot for the matching tour and ISO week; [C] keeps adjacent weeks and different tours unblocked; [C] never marks unassigned slots as blocked

### `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders exactly one visible month sheet for the active month; [D] renders the last visible week of a six-week month inside the dedicated week scroller; [D] marks adjacent-month days separately from current-month days in the rendered month sheet; [D] keeps the reused compact-bar segment flags intact for clipped continuation segments; [D] passes the conflict marker into compact bars for monitored appointments; [D] renders a blocked-week overlay and suppresses conflict markers inside blocked weeks

### `tests/unit/ui/calendarWeekAppointmentAttachmentsHover.previewModes.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] uses the shared attachment preview trigger when exactly one attachment exists; [D] keeps multiple attachments on the gallery hover without a fixed minimum width

### `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps standard and spanning cards on the same footer height budget; [D] renders the same compact content insets and tinted footer on both card types; [D] keeps the tag action slot local to week cards and opt-in for editing; [D] keeps the footer tag row bottom-docked on both week card variants; [D] renders the schraffierte conflict overlay on both week card variants; [D] dims the colored header chrome on blocked week card variants; [D] keeps both sub panels visible in collapsed body mode while reducing the card shell height; [D] keeps single-day collapsed body cards on the reduced shell and removes the extra body height; [D] hides the header menu trigger for historical non-Parkplatz appointments on both card types; [D] keeps the header menu trigger for historical Parkplatz appointments on both card types; [D] renders the delete menu action for editable week appointments on both card types; [D] passes expanded week cards through the existing expanded customer panel path and keeps project panel rendering local; [D] marks the single-card header date as the first responsive hide target while keeping key identifiers no-wrap

### `tests/unit/ui/calendarWeekNotesButton.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] verwendet Query-Key [calendarWeekNotes, yearNumber, weekNumber, tourId=null]; [D] verwendet Query-Key [calendarWeekNotes, yearNumber, weekNumber, tourId=42]; [D] countSlot enthält die Anzahl der geladenen Notizen; [D] Render-Prop liefert iconSlot, countSlot und dialog; [D] liefert passive Anzeige-Slots ohne cursor-pointer

### `tests/unit/ui/calendarWeekSpanningTile.utils.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prioritizes real multi-day appointments before single-day appointments; [C] clips start column to the current week start; [C] clips spanning width to the visible week range

### `tests/unit/ui/calendarWeekTourLaneDayHoverPreview.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders both employee groups with labels and employees; [D] renders fallback texts for empty groups

### `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders compact single-row header without day-counter markup; [C] does not render status or member count text when lane is collapsed; [C] renders the menu slot before the notes segment; [C] supports a reduced preview mode without notes segment or legacy grid split

### `tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] keeps menu and note markers visible without lifting the entire header above day controls

### `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] shows the blocked overlay and freigeben menu while keeping day controls and suppressing conflict markers

### `tests/unit/ui/calendarWeekView.headerControls.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] keeps the title row and renders the tile mode toggle left of the lane toggle

### `tests/unit/ui/calendarWeekView.laneHoverFallback.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the empty lane day preview for a tour without appointments and without week assignments

### `tests/unit/ui/calendarWeekView.lanePlacement.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] reuses the top spanning row for back-to-back multi-day appointments without overlap; [C] places a single-day appointment into a free spanning-row gap before overflow; [C] keeps surrounding multi-day appointments in the same top row around a free single-day gap; [C] creates one implicit tile row for lanes with only single-day appointments; [C] moves additional same-day appointments into the lower day-cell row when the spanning row is occupied; [C] keeps overlapping multi-day appointments separated when a real collision exists

### `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps a compact lane minimum height and places spanning tiles inside a width-safe wrapper; [D] keeps weekend columns narrow when the weekend is empty; [D] widens weekend columns to weekday width across header and lane grids when a weekend appointment exists

### `tests/unit/ui/calendarWeekView.visibleWeekSync.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] picks the horizontally nearest week section for the header; [C] falls back to the base week when no section metrics are available

### `tests/unit/ui/calendarWorkspace.kwSync.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] preloads the current iso week into the kw input in week mode; [D] updates the kw input when the visible week changes; [D] does not pass kw jump controls in month mode

### `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the week grid in week mode and forwards week callbacks with return context; [D] builds a restore request from the last reported viewport only in week mode; [D] renders the month sheet grid in month mode and forwards month callbacks with month return context; [D] renders the month sheet grid in monthSheet mode and forwards the monthSheet return context; [D] keeps week and month sheet calendars readonly for reader roles

### `tests/unit/ui/calendarYearView.readerReadOnly.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] hides future create buttons when the year view is readonly; [D] keeps future create buttons for writable roles

### `tests/unit/ui/customerData.layoutShellIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders shell layout with ordered sidebar panels in edit mode; [D] renders draft-capable sidebar panels in create mode with the same order; [D] renders edit mode as readonly for reader roles

### `tests/unit/ui/customerData.tagsSidebar.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the customer tag picker with the customer domain catalog in edit mode; [D] renders the customer tag picker with empty draft tags in create mode; [D] renders the customer tag picker as readonly for reader roles

### `tests/unit/ui/customerDetailCard.relationCompact.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders only compact slot fields and truncates customer number and postal code

### `tests/unit/ui/customerInfoPanel.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] collapsed: rendert Name und Nummer im Trigger und HoverPreview-Wrapper im DOM; [D] collapsed: Preview-Content enthaelt erweiterte Informationen; [D] semiexpanded: kein HoverPreview-Wrapper, zeigt Header und Adressblock; [D] expanded: zeigt alle Felder inklusive Telefon und E-Mail; [D] expanded mit hideHeader: kein h5-Name im Output und feste Informationszeilen; [D] expanded mit hideHeader fuellt fehlende Zeilen mit Platzhaltern auf; [D] phone und email fehlen im Output wenn nicht befuellt und der Header sichtbar bleibt

### `tests/unit/ui/customersPage.controlled-state.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prefers controlled filters, paging and scope over internal defaults; [C] sorts table rows from the controlled sort props

### `tests/unit/ui/customersPage.currentAppointmentsCounter.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders appointments, notes and attachments in the visible customer card footer; [D] keeps the notes badge visible with count 0; [D] keeps the entity card footer explicitly visible

### `tests/unit/ui/customersPage.readerReadonly.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] hides the create entrypoint for reader roles

### `tests/unit/ui/customersPage.scopeUx.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] wires admin-only customer scope switch and active scope query; [C] keeps non-admin users on active scope without filter toggle; [C] uses the stable toggle label for inactive customers

### `tests/unit/ui/dateRangeKwRangePanel.kwBounds.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] ignores invalid kw free text beyond the year-specific maximum; [C] keeps spinner clicks clamped to the year-specific maximum

### `tests/unit/ui/documentExtractionCustomerSection.ui.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the country field in the editable customer form

### `tests/unit/ui/documentExtractionDialog.fieldReport.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders recognized and missing report blocks between warnings and edit sections

### `tests/unit/ui/documentExtractionDialog.overlayRendering.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders nothing when open is false; [D] renders a full overlay with close and cancel controls when open is true

### `tests/unit/ui/documentExtractionDialog.ui.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders split customer/project apply actions and forwards editable project props; [C] renders single apply mode for project-only adoption without the customer section

### `tests/unit/ui/documentExtractionDropzone.ui.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders footer label, plus action and hidden pdf input; [C] shows a processing label while extraction is running

### `tests/unit/ui/employeeAppointmentsUtilizationBoard.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders an explicit empty state when no appointments exist in the visible range; [D] renders visible board structure and keeps appointment cards wired to onOpenAppointment

### `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders shell layout with ordered sidebar panels in edit mode; [D] renders draft-capable sidebar panels in create mode with the same order; [D] renders edit mode as readonly for reader roles

### `tests/unit/ui/employeeForm.notesSidebar.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders loaded employee notes in edit mode; [D] renders an editable empty draft notes section in create mode; [D] renders employee notes readonly for reader roles

### `tests/unit/ui/employeeForm.tagsSidebar.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the employee tag picker in edit mode with loaded relations and catalog; [D] renders the employee tag picker in create mode with empty draft tags

### `tests/unit/ui/employeePickerDialogList.bulkSelection.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the persisted list mode with sorted checkbox rows and a shared confirm action; [D] keeps the board view active by default even when bulk selection is enabled

### `tests/unit/ui/employeeUtilizationView.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] Heute-Button ist disabled wenn weekOffset === 0 (Initialzustand); [D] Früher- und Später-Buttons sind im Initialzustand vorhanden; [D] CalendarMonthSheetView erhält readOnly=true und visibleWeekCount=4; [D] CalendarMonthSheetView erhält die employeeId als employeeFilterId; [D] NavBar oben und unten sind beide vorhanden; [D] weekOffset-Reset: beide Renders starten mit currentDate der aktuellen Woche; [D] Tab-Trigger Auslastung hat korrekten data-testid

### `tests/unit/ui/employeesPage.controlled-state.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prefers controlled filters and scope over internal defaults; [C] sorts table rows from the controlled sort props

### `tests/unit/ui/employeesPage.importDialog.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders import entry point and closed dialog for admins; [D] hides the import entry point for non-admin users

### `tests/unit/ui/employeesPage.readerReadonly.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] hides the create entrypoint for reader roles

### `tests/unit/ui/employeesPage.scopeUx.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] shows the inactive scope toggle only for admins; [C] hides the inactive scope toggle for non-admin users

### `tests/unit/ui/employeesPage.tagsFooter.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the unified employee footer badges with list-projected counters

### `tests/unit/ui/entityAppointmentsHoverPreview.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] requests all customer appointments (scope=all); [D] requests all employee appointments (scope=all); [D] requests all project appointments (fromDate=1900-01-01), sorts descending and limits the preview to four items; [D] shows the overflow hint for all entity types when more than four appointments exist

### `tests/unit/ui/entityCard.layout.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps footer content hidden by default; [D] renders visible footer content when requested, also through ColoredEntityCard

### `tests/unit/ui/entityFormShell.layout.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders footer by default while header and sidebar stay optional; [D] renders optional header and sidebar with settings-based default width; [D] lets explicit props override settings values for sidebar and content width; [D] renders a dedicated sidebar scroll layer with docked footer markup

### `tests/unit/ui/entityTagFooterRow.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] zeigt bei leerer Tag-Liste den sichtbaren Fallbacktext; [D] rendert vorhandene Tags weiter als sichtbare Footer-Badges

### `tests/unit/ui/footerChildCollectionBadge.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] expands the label state via hover handlers and calls the hover-start hook; [B] keeps inactive zero badges visually muted but hoverable

### `tests/unit/ui/helpTextsPage.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] shows the help key in the table preview and routes row double clicks into editing; [C] blocks the layout only during the initial load, not during an active search; [C] keeps the dedicated helptexts empty-state when no rows are available; [C] treats null helptext responses as an empty list instead of crashing; [C] forwards table row double clicks and renders the preview fallback for empty bodies

### `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] delegates board create/edit actions to the parent callbacks; [D] delegates table row editing through onRowDoubleClick

### `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] triggers seed and invalidates the help text list while showing the help key on the card

### `tests/unit/ui/helpUi.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders HelpIcon only when a non-empty help body exists and applies the preview size class; [C] suppresses HelpIcon while loading, on errors or with an empty help body; [C] renders ListEmptyState with help content when a non-empty help text exists; [C] falls back to visible title/body without exposing the internal help key

### `tests/unit/ui/home.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] opens the appointment form from the standalone appointments list with return context; [C] hides the sidebar while the employees form is visible; [C] opens the contextual calendar from the project form with project-bound return context; [C] passes contextual mode into CalendarWorkspace when the contextual calendar is active; [C] renders the appointment overlay and closes it via the overlay save handler; [C] restores the week scroll position when returning from the fullscreen appointment form; [C] passes pending week scroll restore into the global week workspace; [C] passes monitoring items into the global calendar workspace; [C] renders the journal page inside the main view switch; [C] opens the appointment form from the tour postal plan with date and tour prefill; [C] renders monitoring for reader roles; [C] blocks the tour postal plan view for reader roles; [C] passes the year calendar into readonly mode for reader roles

### `tests/unit/ui/home.listStatePersistence.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] passes controlled project state from Home into ProjectsPage; [D] passes controlled customer state from Home into CustomersPage; [D] passes controlled appointments state from Home into AppointmentsListPage; [D] passes controlled employee state from Home into EmployeesPage

### `tests/unit/ui/hoverPreview.delaySetting.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prefers global setting over component openDelay; [C] uses component openDelay when global setting is missing; [C] falls back to default when both values are missing; [C] normalizes negative values to zero; [C] places cursor previews above and left when the preferred corner has no room; [C] caps cursor preview height to the viewport when full content is taller than the screen

### `tests/unit/ui/journalRecordsView.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] builds the journal query from context, filters and paging state and resets filters; [C] renders the empty state when no journal items are returned; [C] renders the error state when the query fails

### `tests/unit/ui/linkedProjectCard.preview.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] rendert die kompakte Karte im HoverPreview und verdrahtet die Projekt-Entity-Card als Preview

### `tests/unit/ui/linkedProjectsPanel.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] loads linked projects via projects/list and renders compact sidebar cards in appointment order

### `tests/unit/ui/monitoringFilterPanel.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] forwards customer and order identifier patches and converts the selected tour to a number; [D] resets tour and trigger filters back to undefined for the all state

### `tests/unit/ui/monitoringPage.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the admin config panel, forwards row opens and exposes trigger row styling - skipped because the save button is intentionally removed from the Monitoring UI; [C] forwards full-height weekly appointment preview options to the monitoring table; [C] keeps only the focus outline on the nearest filtered appointment

### `tests/unit/ui/monthLaneState.rules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] builds named tour slots alphabetically and appends the unassigned slot; [C] uses the per-slot weekly maximum and keeps empty slots at one sub row; [C] clips bars to the visible week and keeps multi-day bars ahead of single-day bars

### `tests/unit/ui/monthSheetModel.rules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] builds a month that already starts on monday without shifting the visible start; [C] extends months that start mid-week back to monday and marks leading edge days outside the target month; [C] extends months that end mid-week to sunday and marks trailing edge days outside the target month; [C] supports 4, 5 and 6 visible week months without hard-coded row counts; [C] keeps leap-year and non-leap-year february month boundaries exact; [C] keeps march 2026 and april 2026 as explicit regression months stable and deterministic; [C] assigns iso week numbers and current-month markers per visible week cell; [C] marks today only on the actual current date inside the matrix

### `tests/unit/ui/notesPreviewInvalidation.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] invalidates the shared notes preview cache after project note deletion; [D] invalidates the shared notes preview cache after customer note deletion

### `tests/unit/ui/notesSection.readOnly.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] shows visible note actions in editable mode; [D] hides visible note actions in readonly mode

### `tests/unit/ui/plusActionButton.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders a compact ghost icon button and forwards interaction props

### `tests/unit/ui/printComponents.primitives.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] PrintPageShell portrait und landscape nutzen echte A4-Maße; [C] PrintPageShell rendert einen optionalen Footer-Slot; [C] PrintDayColumn rendert label im generischen Spaltenkopf; [C] PrintAppointmentSlot rendert header, body und footer wenn übergeben; [C] PrintDocumentRoot erzeugt einen dedizierten Print-Root mit mehreren Seiten; [C] PrintDocumentRoot uebernimmt bei Bedarf Hochformat; [C] PrintPreviewDialog zeigt Seitenzähler, Titel und aktive Seite; [C] PrintPreviewDialog rendert optionale Header-Aktionen; [C] PrintPreviewDialog reicht die Seitenausrichtung an den Druckroot weiter; [C] PrintPreviewDialog rendert keinen dedizierten Druckroot, solange die Vorschau geschlossen ist; [C] PrintPreviewDialog hebt den dedizierten Druckroot im Print-CSS aus dem Offscreen-Modus

### `tests/unit/ui/printSlimFooter.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] rendert die Seitennummer; [C] setzt testId wenn uebergeben

### `tests/unit/ui/printSlimHeader.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] rendert das Label; [C] rendert label und context in einer Zeile; [C] setzt testId wenn uebergeben

### `tests/unit/ui/productDropDown.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] preselects the first category so add and delete-all stay available without product selection; [C] renders shortcode labels while keeping name-based sort order

### `tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders category blocks and project cards without legacy table sections

### `tests/unit/ui/produktionsplanungProjectCard.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders article list, plain-text description and generalized footer triggers without header reason tags; [D] omits the body wrapper when neither article items nor description are present

### `tests/unit/ui/projectAttachmentsPanel.grouping.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders grouped project and customer sections in edit mode; [D] uses pending project attachments and direct customer context in create mode

### `tests/unit/ui/projectDetailCard.orderNumber.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders split top row fields for project name, order number and amount; [C] renders article items and notes together via the combined renderer; [C] renders fallback text when project content fields are empty

### `tests/unit/ui/projectDuplicateResolutionDialog.ui.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the latest appointment details when a duplicate project already has appointments; [C] renders the explicit no-appointment hint when no planning exists yet

### `tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the shared row with customer and project filters in the expected order; [D] keeps visible number labels and the normalized number placeholder; [D] keeps constrained field widths and forwards the tag picker wiring

### `tests/unit/ui/projectForm.customerRelationSlot.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders an active customer slot with the loaded project customer; [C] keeps customer required validation on submit for a new project without customer; [C] renders the customer slot as readonly for reader roles

### `tests/unit/ui/projectForm.layoutShellIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders shell main and sidebar with the same sidebar order in create mode; [D] renders shell main and sidebar with the same sidebar order in edit mode; [D] keeps footer actions split and shows delete only in edit mode; [D] renders edit mode as readonly for reader roles

### `tests/unit/ui/projectForm.tabs.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the Anmerkungen tab and separate description/article panels

### `tests/unit/ui/projectInfoPanel.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] collapsed: rendert Projektname und Auftragsnummer im Trigger und HoverPreview-Wrapper im DOM; [D] collapsed: Preview-Content enthaelt Artikel-Renderer; [D] expanded: rendert Artikel-Renderer und Header; [D] expanded: reicht zusaetzliche Klassen an die Panel-Huelle durch; [D] expanded im kompakten Modus begrenzt das Panel wieder auf die feste Kartenhoehe; [D] expanded mit hideHeader: kein h5-Projektname im Output; [D] expanded ohne Projektinhalt zeigt den Fallbacktext im Panel; [D] fehlende Auftragsnummer wird als Strich dargestellt; [D] normalisiert den Fallbacktext '--Ohne Projekt' zu 'Kein Auftrag hinterlegt' und oeffnet dann kein Preview

### `tests/unit/ui/projectOrderForm.shortcode-labels.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders product and component select labels with shortcode suffix while keeping name sort

### `tests/unit/ui/projectsPage.controlled-state.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] prefers controlled filters, paging and scope over internal defaults; [C] sorts table rows from the controlled sort props; [C] uses all as the uncontrolled default scope

### `tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders appointments, notes and attachments in the project card footer; [D] keeps the notes badge visible with count 0; [D] keeps the entity card footer explicitly visible; [D] shows the fallback text and disables the project hover preview when no project content exists

### `tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] wires order number filter handlers into the filter panel; [D] keeps order number and amount available in the table view; [D] renders html description in board cards and wires project/customer previews; [D] omits the notes trigger when the project has no notes

### `tests/unit/ui/projectsTable.preview.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the shared project table hover preview with footer badges and tags

### `tests/unit/ui/relationSlot.actions.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders add action for empty slot; [C] renders remove action for active slot; [C] renders no actions for readonly slot

### `tests/unit/ui/reportsPage.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the generate buttons disabled when fromDate starts empty; [C] derives the date and kw defaults from the latest available project appointment week; [C] keeps the fallback default when no latest project appointment date is available; [C] omits toDate from the vorlaufliste URL when the field was cleared; [C] builds the dedicated print-preview URL without paging or category filters; [C] builds the produktionsplanung URL without removed sonderblock parameters; [C] builds the auftragsliste URL with product and component categories plus shortcodes; [C] builds the standalone reports URL with report type and current filters

### `tests/unit/ui/reportsPage.produktionsplanungArticles.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] groups non-empty category values into highlighted row sections with one item per line; [C] maps grouped values into renderer-ready label-value items and skips empty categories; [C] uses project article labels when a category is known and falls back to the category name otherwise

### `tests/unit/ui/reportsPage.refreshRequest.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] adds a refreshKey while preserving the selected filters; [C] keeps the print-preview URL free from list-specific parameters

### `tests/unit/ui/reportsPage.vorlauflistePreview.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] builds project table preview data from a vorlaufliste row; [C] keeps wrapped report text clamped to three lines

### `tests/unit/ui/reportsPage.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the new prototype toggles and action buttons; [D] renders the auftragsliste categories as one article list with product categories first; [D] renders the latest appointment week sunday as default end date in both panels; [D] renders the auftragsliste print preview in portrait with a narrower dialog shell; [D] passes an indicator column to the table and no rowClassName callback; [D] shows product and component category columns in the actual report table definition before report data exists; [D] removes the legacy produktionsplanung config blocks for non-admins; [D] shows the admin category-layout entry and warning when no global layout is configured

### `tests/unit/ui/settingsPage.backup.innerTabs.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] rendert den Nav-Eintrag Backup & Dump mit korrektem data-testid; [C] zeigt den Label-Text 'Backup' im Nav-Eintrag; [C] zeigt keinen Speichern-Button fuer backup_enabled (direktes Persistieren); [C] zeigt den switch-setting-backup-enabled nicht im Oberflaeche-Standardpane; [C] rendert backup-inner-tabs, backup-inner-tab-backups, -dumps und -import nicht im Standardpane; [C] rendert dump-import-section nicht im Standardpane; [C] rendert backups-monitoring-table nicht im Standardpane

### `tests/unit/ui/settingsPage.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] rendert die Sidebar-Navigation mit allen vier Eintraegen; [C] zeigt den Oberflaeche-Pane als Standard beim ersten Laden mit allen Save-Controls; [C] zeigt die anderen Panes im Standard-Render nicht

### `tests/unit/ui/settingsPage.navigation.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] rendert den Nav-Container mit data-testid settings-nav; [D] rendert alle vier Nav-Eintraege mit korrekten data-testid; [D] zeigt die Gruppen-Labels Anzeige und System in der Navigation; [D] setzt aria-current=page auf den initialen Nav-Eintrag Oberflaeche; [D] setzt kein aria-current auf die anderen Nav-Eintraege im Ausgangszustand; [D] rendert initial nur den Oberflaeche-Pane und nicht die anderen

### `tests/unit/ui/settingsPage.panes.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] zeigt den Pane-Container settings-pane-oberflaeche; [C] zeigt alle fuenf USER-Settings im Oberflaeche-Pane; [C] zeigt beide GLOBAL-Settings im Oberflaeche-Pane; [C] zeigt USER-Badge-Text im Oberflaeche-Pane; [C] zeigt GLOBAL-Badge-Text im Oberflaeche-Pane; [C] zeigt resolved Value fuer attachmentPreviewSize und USER-Badge; [C] zeigt resolved Value fuer toastDesktopPosition und GLOBAL-Badge; [C] zeigt den korrekten Label-Text fuer jede Setting-Row

### `tests/unit/ui/settingsPage.systemSeed.securityPane.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders the system seed section in the security pane; [C] shows the pending label while the system seed preview runs

### `tests/unit/ui/settingsPage.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] attachmentPreviewSize: Select und Speichern-Button vorhanden; [D] helpTextPreviewSize: Select und Speichern-Button vorhanden; [D] cardListColumns: Number-Input mit korrekten Grenzen (min=2, max=6); [D] entityFormShell.sidebarWidthPx: Number-Input mit korrekten Grenzen (min=260, max=480); [D] entityFormShell.contentMaxWidthPx: Number-Input mit korrekten Grenzen (min=640, max=1100); [D] toastDesktopPosition: Select und Speichern-Button vorhanden; [D] hoverPreviewOpenDelayMs: Number-Input mit korrekten Grenzen (min=0, max=2000); [D] zeigt die Optionen small, medium, large; [D] zeigt alle vier Positionsoptionen

### `tests/unit/ui/sidebar.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] shows reports and monitoring plus trigger pills below the monitoring navigation entry for dispatcher; [C] shows monitoring but hides reports, journal and tour postal planning for reader roles

### `tests/unit/ui/spinField.strictTextBounds.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] ignores invalid free text when strict bounds are enabled; [C] keeps spinner button clamping active

### `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps all four standalone list views uncontrolled

### `tests/unit/ui/tableEntityCardPreviews.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] wraps the project table preview with the shared project entity card; [D] wraps the customer table preview with the shared customer entity card; [D] wraps the employee table preview with the shared employee entity card

### `tests/unit/ui/tableView.columnResize.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders a resize handle for resizable columns

### `tests/unit/ui/tableView.emptyStateSurface.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps the table header and renders a minimum-height empty surface

### `tests/unit/ui/tableView.infoBadgePreviewOptions.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] forwards InfoBadgePreview options into HoverPreview

### `tests/unit/ui/tableView.rowTooltip.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders hover preview content only for rows with rowTitle

### `tests/unit/ui/tableView.stickyFrame.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders footer content and shared footer scrollbar when overflow is active; [C] keeps compact cell padding and row class names in the rendered table

### `tests/unit/ui/tableView.stickyHeader.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] applies sticky header classes on header cells when stickyHeader=true; [C] does not apply sticky header classes when stickyHeader=false; [C] keeps header alignment/base classes while sticky header is enabled; [C] keeps width and minWidth styles on header cells with sticky header

### `tests/unit/ui/tagBadge.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] uses the trimmed label and forwards preview and actions; [C] renders picker labels as shortcode with full name in parentheses

### `tests/unit/ui/tagBadge.readonlyWidth.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] does not reserve action width for read-only tags

### `tests/unit/ui/tagPickerPanel.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] renders assigned tags as removable and keeps only unassigned tags in the add list; [C] falls back to read-only badges when editing is disabled

### `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] keeps the shared employee picker wiring for board and list selection; [D] renders the expected create elements in shell mode with the sidebar; [D] keeps delete and existing member badges visible in edit mode

### `tests/unit/ui/teamManagement.versioning.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] submits versioned update and employee assignment payloads through the edit form; [C] removes deselected team members before reassigning the remaining selection; [C] sends a versioned delete from the dialog delete action for admins; [C] shows a destructive conflict toast when the update was changed concurrently

### `tests/unit/ui/toaster.behavior.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] passes the resolved desktop position from the setting into the toaster viewport; [C] maps all supported desktop positions to visible viewport classes

### `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] passes the tour context, help key and empty state into the embedded appointments list; [D] keeps the appointments list bound to the edited tour id and forwards open handlers

### `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the expected create elements in shell mode with the sidebar; [D] keeps delete and existing week planning cards visible in edit mode; [D] shows an explicit unsupported hint instead of week planning cards for Parkplatz; [D] keeps the week employee picker wired for bulk list selection; [D] shows the corrected blocked week notice in edit mode; [D] renders edit mode as readonly for reader roles

### `tests/unit/ui/tourEmployeeCascadeDialog.selectionButtons.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] selects only eligible appointments in add mode; [C] clears the complete selection in remove mode; [C] selects only eligible appointments in remove mode as well

### `tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders add mode with sharpened copy, range summary and contextual preview rows; [D] renders remove mode with the dedicated removal copy

### `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] hides the create button for readonly users; [D] keeps the create button visible for mutating roles

### `tests/unit/ui/tourManagement.versioning.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] creates a tour without direct employee assignment and closes the dialog; [C] sends the edited tour name in the versioned update payload and closes the dialog; [C] keeps an admin delete action in the edit dialog and sends a versioned delete; [C] keeps the next generated tour name gap when a numeric tour name was renamed away; [C] opens week planning dialogs with a preselected conflict-free selection after preview loading; [C] queues bulk-selected week employees behind the first preview; [C] executes week planning updates, refreshes dependent views and opens the next queued preview; [C] confirms week blocking without surfacing silent appointment-adjustment counts; [C] confirms week unblocking without surfacing silent appointment-adjustment counts

### `tests/unit/ui/tourPostalPlanWeekPreview.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders week label and reduced weekday headers while keeping compact week cards plus create actions

### `tests/unit/ui/tourWeekCard.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders date line, employee scope tour label and footer counters; [D] keeps blocked warning and badge wired in tour scope

### `tests/unit/ui/tourWeekForm.render.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders the tour scope with notes sidebar, tabs and employee picker wiring; [D] keeps the employee scope read-only while preserving week-fixed employee appointments; [D] renders the tour scope as readonly for reader roles

### `tests/unit/ui/tourenplanAppointmentCard.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders component-only article items and employee badges in farbdruck mode; [D] uses shortcodes and the spar header separator in spardruck mode; [D] keeps Reklamation out of the header while showing the note content; [D] renders a fallback dash when description and visible notes are empty after normalization

### `tests/unit/ui/tourenplanPrintPage.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] renders a kw marker per week and keeps the chrome minimal

### `tests/unit/ui/tourenplanReportPanel.wiring.test.tsx`

- Testtyp: Unit
- Datei-Klassifikation: D
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Markup-, TestID- und String-Containment-Assertions
- Kurzbegründung: stark mock-/markup-getrieben; eher Verdrahtung als belastbare Fachabsicherung
- Testfälle: [D] shows the panel options and forwards the same orientation to dialog and print page

### `tests/unit/ui/weekLaneState.rules.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: C
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: technischer Regressionsschutz mit begrenzter Fachaussage
- Testfälle: [C] normalizes empty expandedLaneId to null; [C] expanded mode keeps all lanes open and ignores expandedLaneId; [C] collapsed mode keeps exactly one lane open when lane id is valid; [C] falls back to first lane and marks correction when lane id is invalid; [C] falls back to first lane and marks correction when lane id is empty; [C] returns stable empty state when no lanes exist

### `tests/unit/validation/dtoValidators.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: künstliche Mock-/Markupdaten, stark isoliert
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] maps invalid payload errors to 400 validation response; [B] returns false for non-zod errors; [B] extractFromPdf maps new article parser output while keeping header-based customer data; [B] extractFromPdf maps appointment_form through the mining parser as well; [B] extractFromPdf returns extracted total amount when Gesamtbetrag is present; [B] keeps customer_form on the legacy article parser path; [B] falls back to the legacy article parser when the mining parser cannot derive a product; [B] throws deterministic extraction error when parser fails; [B] returns project data with warning when customer address is only partially readable; [B] resolves successfully when order number already exists – conflict is handled by the client

### `tests/unit/validation/employees.dto.validation.ft05.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] create dto accepts valid minimal payload; [B] create dto rejects missing required fields; [B] create dto rejects invalid datatypes; [B] create dto rejects overlong firstName (IST); [B] update dto rejects missing version; [B] update dto rejects version <= 0; [B] update dto rejects invalid version datatype; [B] update dto rejects invalid payload structure; [B] update dto currently allows overlong firstName (IST documentation); [B] toggle dto rejects missing version; [B] toggle dto rejects negative version; [B] toggle dto rejects missing isActive or invalid type

### `tests/unit/validation/extractionFieldReport.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Funktionsrückgaben, Zustands- und Vergleichs-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] limits customer_form to customer fields and marks missing values with fixed reasons; [B] includes project fields for project_form and uses the company-specific person hint

### `tests/unit/validation/extractionValidator.structure.test.ts`

- Testtyp: Unit
- Datei-Klassifikation: B
- Datenqualität: direkte Funktions- und Regeltestdaten
- Tatsächliche Assertions: Fehlercode-, Guard- und Endzustands-Assertions
- Kurzbegründung: relevanter Regel- oder Service-Nachweis, aber isoliert bzw. teilrealistisch
- Testfälle: [B] normalizes optional fields and trims warnings; [B] accepts missing firstName and lastName as nullable fields; [B] categorizes articles and generates flat semantic html; [B] keeps article html flat across multiple categories; [B] escapes html-sensitive text; [B] throws when required structure is missing; [B] keeps field report generation as explicit follow-up step

