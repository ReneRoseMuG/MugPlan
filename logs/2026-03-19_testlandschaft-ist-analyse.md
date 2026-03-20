# Testlandschaft Ist-Analyse

## Zweck

Belastbare Ist-Analyse der bestehenden Testlandschaft und des aktuellen Qualitaetszustands der Codebase.

Der Auftrag umfasste:

- Inventarisierung vorhandener Testarten
- Serielle Ausfuehrung der vorhandenen Hauptsuiten
- Ermittlung der vorhandenen Coverage mit den bestehenden Projektmitteln
- Fachliche Einordnung gegen die vorhandenen Feature- und Use-Case-Beschreibungen
- Benennung struktureller Schwaechen, sichtbarer Luecken und technischer Risiken

Es wurden keine Aenderungen an Produktivcode, Testcode oder Konfiguration vorgenommen.

## Scope

- Ausgefuehrt wurden die vorhandenen Hauptsuiten fuer Unit, Integration, E2E und Browser-E2E.
- Zusaetzlich wurde die vorhandene Coverage ermittelt.
- Zusaetzlich wurden sonstige relevante Testskripte soweit sicher und selbststaendig moeglich geprueft.
- Dokumentarisch einbezogen wurden `architecture-index.md`, `implementation-index.md`, gezielt `docs/architecture.md` Abschnitt 5/7/11, `docs/implementation.md` Abschnitt 2/8/Sichtbarkeit, `docs/TEST_MATRIX.md` sowie die relevanten Feature-Zusammenfassungen in `docs/Alle Features.md`.

## Technische Entscheidungen

- Kein neuer Branch: auf Nutzerwunsch wurde kein lokaler Branch von `work` abgezweigt.
- Testkommandos wurden strikt seriell ausgefuehrt.
- Die Demo-Seed-Verifikation wurde bewusst nicht ueber das unguarded Package-Skript ausgewertet, sondern in explizitem Testmodus gestartet, damit das Test-Safety-Modell eingehalten wird.
- Doppellaeufe wie `test`, `test:run`, `test:all`, `test:extraction` und `test:extraction:mock` wurden nicht separat gewertet, weil sie Teilmengen oder Alias-Kommandos bereits ausgefuehrter Suiten sind.

## Ausgefuehrte Kommandos

### Hauptsuiten

1. `npm run test:unit -- --reporter=default --reporter=json --outputFile=.tmp-analysis-unit.json`
2. `npm run test:integration -- --reporter=verbose --reporter=json --outputFile=.tmp-analysis-integration.json`
3. `npm run test:e2e -- --reporter=default --reporter=json --outputFile=.tmp-analysis-e2e.json`
4. `npm run test:e2e:browser -- --reporter=json`
5. `npm run test:coverage`

### Sonstige relevante Pruefungen

6. `npm run test:template-render`
7. `npm exec -- cross-env NODE_ENV=test MUGPLAN_MODE=test tsx script/verify-demo-seed.ts`

## Nicht separat ausgefuehrte Skripte

- `npm run test`
- `npm run test:run`
- `npm run test:all`
- `npm run test:extraction`
- `npm run test:extraction:mock`

Begruendung: Alias-, Teilmengen- oder Doppellaeufe ohne zusaetzlichen Erkenntnisgewinn.

- `npm run test:load:ft04`

Begruendung: nicht selbststaendig lauffaehig; benoetigt konkrete `FT04_LOAD_*`-Parameter und eine passende Zielumgebung.

## Test-Inventar

- Unit-Tests: 222 Dateien
- Integrationstests: 83 Dateien
- E2E-Tests: 3 Dateien
- Browser-E2E: 21 Dateien
- Summe erkannter Testdateien unter `tests/`: 329

Verteilung:

- Unit: klarer Schwerpunkt auf `tests/unit/ui` mit 145 Dateien, danach `services` mit 28, `settings` mit 12, `lib` mit 9 und `invariants` mit 8.
- Integration: klarer Schwerpunkt auf `tests/integration/server` mit 78 von 83 Dateien.
- E2E: sehr schmale API-nahe Workflow-Schicht mit 3 Dateien.
- Browser-E2E: 21 Dateien mit 65 Specs.

## Testergebnisse

### Erfolgreich

- `test:unit`: 796 bestanden, 39 uebersprungen
- `test:integration`: 397 bestanden, 19 uebersprungen
- `test:e2e`: 3 bestanden
- `test:e2e:browser`: 58 bestanden, 7 uebersprungen
- `test:coverage`: erfolgreich abgeschlossen
- `test:template-render`: erfolgreich abgeschlossen

### Fehlgeschlagen

- Guarded `verify-demo-seed`: fehlgeschlagen mit `Keine aktiven Produkte fuer den Demo-Seed verfuegbar.`

### Auffaellig

- Die beobachteten Skips sind explizit markiert (`describe.skip` / `test.skip`), nicht das Ergebnis instabiler Laeufe.
- Die Skips clustern sich fachlich fast vollstaendig um FT30 und FT01-Availability.
- Mehrere Integrationssuiten erzeugen erwartete `WARN`- bzw. `ERROR`-Logs im gruennen Lauf, etwa fuer absichtlich provozierte 500er, 403er oder FK-Konflikte. Das erschwert die Lesbarkeit der Runs.

### Detailergebnisse pro Suite

#### Unit (`npm run test:unit`)

- 222 Unit-Dateien wurden gestartet.
- 796 Tests liefen erfolgreich.
- 39 Tests wurden uebersprungen.
- Die Skips betreffen fast ausschliesslich den FT30-/FT01-Komplex:
  - `tests/unit/services/employeeAbsencesService.bulk.unit.test.ts`
  - `tests/unit/services/employeeAbsencesService.ft30.test.ts`
  - `tests/unit/services/employeeAvailabilityService.test.ts`
  - `tests/unit/validation/employeeAbsences.dto.validation.ft30.test.ts`
  - `tests/unit/ui/appointmentForm.availability-feedback.wiring.test.ts`
  - `tests/unit/ui/calendarDragDrop.validationMessage.wiring.test.tsx`
  - `tests/unit/ui/employeeAbsencesNavigation.wiring.test.ts`
  - `tests/unit/ui/employeeAbsencesPanel.preview.wiring.test.ts`
  - `tests/unit/ui/employeeAbsencesPanel.wiring.test.ts`
  - `tests/unit/ui/employeeForm.absencesTab.wiring.test.ts`
  - `tests/unit/ui/employeePickerDialogList.availability.wiring.test.tsx`
- Beispiele der deaktivierten Testaussagen:
  - `employeeAbsencesService` soll READER sperren, Create validieren, Past-Start blockieren sowie Version-Konflikte korrekt mappen.
  - `employeeAvailabilityService` soll Konflikte deduplizieren und bei Multiday-Ranges verfuegbare gegen unverfuegbare Mitarbeiter sauber trennen.
  - Die UI-Wiring-Tests sollen explizite Availability-Confirm-Flows, Unavailable-Listen und FT30-Panels absichern.

#### Integration (`npm run test:integration -- --reporter=verbose`)

- 83 Integrationsdateien wurden gestartet.
- 397 Tests liefen erfolgreich.
- 19 Tests wurden uebersprungen.
- Die Skip-Cluster im Detail:
  - `tests/integration/server/appointments.availability.ft30-ft01.integration.test.ts`
    - 9 deaktivierte Faelle zu Confirm-Pflicht, Preview/Bulk-Replacement, Multiday-Absence-Konflikten und Exit-Date-Konflikten
  - `tests/integration/server/appointments.dragdrop.availability.integration.test.ts`
    - 3 deaktivierte Faelle zu Drag-and-drop-Confirm, partieller Bereinigung unverfuegbarer Mitarbeiter und Multiday-Zielbereichspruefung
  - `tests/integration/server/employeeAbsences.ft30.integration.test.ts`
    - 6 deaktivierte Faelle zu CRUD, Sichtbarkeit nach Rolle, Versionskonflikt und Historienfilterung
  - `tests/integration/server/demoSeed.appointments.constraints.integration.test.ts`
    - 1 deaktivierter Fall zu negativem `seedWindowDaysMin`
- Fachlich starke gruene Bereiche im Integrationslauf:
  - FT01 direkte Terminbeziehungen und Projektionen
  - FT02 Projekte, Order-Items, Mengenlogik, Detailaggregation
  - FT13 Notizen inklusive Druck-/Farbverhalten
  - FT24 Attachments und Sicherheitsgrenzen
  - FT26 Reports
  - FT31 Tour-Print-Preview und Monitoring-nahe Pfade

#### E2E (`npm run test:e2e`)

- 3 Workflow-Dateien wurden gestartet.
- 3 von 3 Tests liefen erfolgreich.
- Gestartete Dateien:
  - `tests/e2e/ft04.tour-employee-cascade.workflow.e2e.test.ts`
  - `tests/e2e/project-appointments.sidebar-all.workflow.e2e.test.ts`
  - `tests/e2e/project-with-appointment.workflow.e2e.test.ts`
- Diese Suite ist stabil, aber sehr schmal. Sie deckt nur wenige End-to-End-Gesamtablaeufe ab.

#### Browser-E2E (`npm run test:e2e:browser`)

- 21 Browser-Dateien wurden gestartet.
- 58 Tests liefen erfolgreich.
- 7 Tests wurden uebersprungen.
- Die deaktivierten Browser-Flows im Detail:
  - `tests/e2e-browser/availability-check-appointment-form.browser.e2e.spec.ts`
    - Confirm-Dialog bei Availability-Konflikt
    - Startdatumspflicht vor Employee-Picker-Nutzung
    - Anzeige unverfuegbarer Mitarbeiter nur in der informativen Liste
  - `tests/e2e-browser/calendar-drag-drop.validation-message.browser.e2e.spec.ts`
    - Availability-Confirm-Dialog bei Drag-and-drop
  - `tests/e2e-browser/employee-absences.ft30.browser.e2e.spec.ts`
    - FT30-CRUD im Mitarbeiterformular
    - Preview schliessen und spaeter explizites Bulk-Replacement
  - `tests/e2e-browser/employee-absences.navigation.browser.e2e.spec.ts`
    - FT30-Navigation mit Mitarbeiterwahl und tabellenbasiertem CRUD
- Browserseitig sind damit erneut genau die fachlich riskanten FT30-/Availability-Pfade ausgeklammert.

### Relevante Fehlermeldung im Wortlaut

- `verify-demo-seed` endete mit:
  - `Keine aktiven Produkte fuer den Demo-Seed verfuegbar.`
- Einordnung:
  - Das Skript ist aktuell kein selbstgenuegsamer Verifikationscheck.
  - Es haengt von vorbereiteten aktiven Produkt-Stammdaten ab.
  - Als allgemeiner Qualitaetscheck ist es daher im Ist-Zustand nur eingeschraenkt belastbar.

## Coverage

Gesamt-Coverage laut `tests/coverage/index.html`:

- Statements: 56.5% (8905/15760)
- Branches: 44.76% (4925/11001)
- Functions: 55.62% (1805/3245)
- Lines: 58.01% (8394/14469)

Wichtige Einschraenkungen:

- Browser-E2E fliesst nicht in die Coverage ein.
- `script/` und `tests/helpers` sind in der Coverage enthalten und beeinflussen die Gesamtzahl.
- Die Coverage ist daher brauchbar als technischer Indikator, aber nicht als reiner Fachabdeckungswert.

Sichtbar schwache Bereiche:

- `server/services/employeeAvailabilityService.ts`: 0%
- `server/services/employeeAbsencesService.ts`: 0.7%
- `server/services/seedToursService.ts`: 2.94%
- `server/services/seedUsersService.ts`: 6.81%
- `server/services/bulkImportService.ts`: 11.06%
- `server/controllers/appointmentsController.ts`: 49.62%
- `server/controllers/projectsController.ts`: 41.71%
- `server/controllers/customersController.ts`: 37.57%
- `server/controllers/helpTextsController.ts`: 32.19%
- `client/src/components`: 18.84%
- `client/src/components/calendar`: 16.87%
- `client/src/components/filters`: 16.66%
- `client/src/components/notes`: 0%
- `client/src/hooks`: 22.72%

### Einordnung der Coverage-Zahlen

- Die Gesamtzahlen sehen auf den ersten Blick mittelmaessig aus, aber die Branch-Coverage von 44.76% ist fuer kritische Geschaeftslogik schwach.
- Besonders problematisch ist nicht nur die absolute Zahl, sondern die Verteilung:
  - In fachlich kritischen Bereichen wie Availability und Mitarbeiterabwesenheiten ist die Abdeckung praktisch nicht vorhanden.
  - Im Frontend gibt es viele gruene UI-Dateien, die aber oft nur Source-Wiring statt echtes Verhalten pruefen.
  - Die Browser-E2E-Suite hilft fachlich, verbessert die offiziellen Coverage-Zahlen jedoch nicht.
- Die Coverage darf deshalb nicht als Beleg fuer breite fachliche Absicherung gelesen werden.

## Fachliche Abdeckungsanalyse

### Gut abgedeckte Bereiche

- FT01 Kalendertermine: starke technische und fachliche Abdeckung in Kernpfaden
- FT02 Projekte: Kernprozesse, Detailverhalten, Order-Items und Querprojektionen sind breit vertreten
- FT03 Kalenderansichten: viele UI- und Integrationspruefungen zu Darstellung, Persistenz und Drilldown
- FT04 Tourenplanung: starker Fokus auf Versionierung, Kaskaden, CRUD und Browser-Flows
- FT07 Backup / CalDAV
- FT13 Notizen
- FT27 / FT28 Stammdaten und Tags
- FT31 Monitoring

### Teilweise abgedeckte Bereiche

- FT09 Kunden
- FT15 Projektstatus
- FT16 Hilfetexte
- FT19 Attachments
- FT29 Zwei-Faktor-Authentisierung

### Klar erkennbare Luecken

- FT30 Mitarbeiterabwesenheiten: fachlich vorhanden, aber in allen Ebenen grossenteils deaktiviert
- FT01 Availability-Unterfaelle: fachlich relevant, aber durch deaktivierte FT30- und Availability-Suiten nicht belastbar abgesichert
- FT12 Dispositionsuebersicht: keine direkt tracebare Feature-Abdeckung in der Test-Matrix
- FT14 Benutzer- und Rollenverwaltung: keine direkt tracebare FT14-Abdeckung in der Test-Matrix; nur indirekte Absicherung ueber Auth-/Authorization-Tests
- FT22 Kartenansicht / Maps: keine sichtbare Testabdeckung

### Kritische Regeln / Use Cases mit schwacher Absicherung

- Abwesenheits-CRUD
- Confirm-pflichtige Availability-Konflikte
- Availability bei Drag-and-drop
- Unavailable-Employee-Listen und Picker-Verhalten
- Multiday-Conflicts fuer Abwesenheit / `exit_date`
- Rollen-/Rechteverhalten als sauber rueckverfolgbare FT14-Absicherung

## Strukturelle Schwaechen der Testlandschaft

- 120 von 145 `tests/unit/ui`-Dateien verwenden `readFileSync` und Source-String-Pruefungen. Das ist schnell, aber fragil und stark implementation-coupled.
- `docs/TEST_MATRIX.md` ist nicht vollstaendig synchron:
  - 8 vorhandene Testdateien fehlen in der Matrix
  - 1 Matrix-Eintrag ist veraltet
- 13 Testdateien enthalten nicht den geforderten `Test Scope`-Kommentar.
- Die Feature-Taxonomie ist inkonsistent:
  - Dokumentextraktion ist in der Fachdoku FT21, in vielen Tests und Matrix-Eintraegen aber FT20
  - In der Matrix tauchen FT08, FT17, FT23, FT24 und FT32 auf, die in `docs/Alle Features.md` nicht in derselben Form gefuehrt werden

### Konkrete Matrix-Abweichungen

Fehlende Testdateien in `docs/TEST_MATRIX.md`:

- `tests/e2e-browser/calendar-week-customer-preview-phone.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-appointment-mutation-tracking.browser.e2e.spec.ts`
- `tests/integration/server/calendarAppointments.customer-contact-fields.integration.test.ts`
- `tests/unit/hooks/useListFilters.paging.test.ts`
- `tests/unit/ui/employeeForm.removeFromAppointment.wiring.test.tsx`
- `tests/unit/ui/entityFormShell.layout.test.tsx`
- `tests/unit/ui/home.sidebarHiddenOnFormEdit.wiring.test.ts`
- `tests/unit/ui/tourEmployeeCascadeDialog.dateRangeFilter.wiring.test.tsx`

Veralteter Matrix-Eintrag:

- `tests/unit/hooks/useListFilters.paging.test.tsx`

### Fehlende Pflichtkommentare

Folgende Testdateien enthalten keinen `Test Scope`-Kommentar gemaess Repo-Vorgabe:

- `tests/integration/bootstrap/ensureSystemRoles.test.ts`
- `tests/integration/extraction/documentTextExtractor.fixture.test.ts`
- `tests/integration/joins/joinReplaceAtomicity.test.ts`
- `tests/unit/auth/loginIdentifier.test.ts`
- `tests/unit/auth/passwordHash.test.ts`
- `tests/unit/authorization/roleGuards.test.ts`
- `tests/unit/authorization/userCreate.test.ts`
- `tests/unit/extraction/documentTextExtractor.test.ts`
- `tests/unit/invariants/attachmentRules.test.ts`
- `tests/unit/invariants/conflictPriority.test.ts`
- `tests/unit/invariants/lockingRules.test.ts`
- `tests/unit/invariants/optimisticLocking.test.ts`
- `tests/unit/ui/tableView.stickyHeader.test.tsx`

## Sichtbare technische Risiken

- `tests/helpers/resetDatabase.ts` heilt fehlende 2FA-Spalten per `ALTER TABLE` im Test-Reset. Das maskiert potenzielle Schema- oder Migrationsdrift, statt fail-fast zu reagieren.
- `tests/integration/server/ft11.team-management.integration.test.ts` dokumentiert als gruene Erwartung, dass READER / DISPATCHER Team-Routen ohne serverseitige 403-Grenze mutieren duerfen.
- `tests/unit/ft04/TourTests.test.ts` dokumentiert bewusst aktuelles Contract-Verhalten fuer leeren Namen und ignorierte Namensaenderungen statt eines klar fachlichen Soll-Verhaltens.
- Attachment-Suiten dokumentieren teils bewusst bekannte Soll-Luecken ausserhalb der gruener Suite.
- `verify-demo-seed` ist als Verifikationsskript nicht selbstgenuegsam und scheitert ohne vorbereitete aktive Produkt-Stammdaten.

### Weitere gruen laufende, aber fachlich heikle Festschreibungen

- `tests/integration/server/ft11.team-management.integration.test.ts`
  - Der Test dokumentiert explizit das aktuelle Rollenverhalten der FT11-Routen ohne serverseitige 403-Guards.
  - Wenn dieses Verhalten fachlich nicht gewollt ist, konserviert die Suite einen Fehlzustand statt eine Soll-Regel.
- `tests/unit/ft04/TourTests.test.ts`
  - `documents current contract behavior for empty name input`
  - `documents that update contract ignores name changes`
  - Auch hier wird ein Ist-Zustand eingefroren, ohne dass klar wird, ob das Fachverhalten so beabsichtigt ist.
- `tests/integration/server/projects.detail.aggregate-contract.integration.test.ts`
  - In der Datei gibt es Kommentar-Drift, weil die Beschreibung noch auf einen bewusst fehlschlagenden Test verweist, der Lauf inzwischen aber gruen ist.
  - Das ist kein roter Fehler, aber ein Wartbarkeitsrisiko fuer die Aussagekraft der Tests.

## Betroffene Dateien und Artefakte

- `docs/TEST_MATRIX.md`
- `docs/Alle Features.md`
- `tests/helpers/resetDatabase.ts`
- `tests/integration/server/ft11.team-management.integration.test.ts`
- `tests/unit/ft04/TourTests.test.ts`
- `tests/coverage/`
- `.tmp-analysis-unit.json`
- `.tmp-analysis-integration.json`
- `.tmp-analysis-e2e.json`
- `.tmp-analysis-e2e-browser.json`

## Hinweise zum Testen

- Das Test-Safety-Modell war erfuellt: `../../shared/.env.test` war vorhanden, `NODE_ENV=test` und `MUGPLAN_MODE=test` wurden gesetzt, und die DB-Reset-Pfade liefen ueber die zentralen Guards.
- Die Integrationssuite wurde repo-konform mit `--reporter=verbose` ausgefuehrt.
- Browser-E2E lief mit Playwright gegen die bestehende Testkonfiguration.

## Bekannte Einschraenkungen

- Kein Audit-Lauf (`check`, `lint`, `audit`, `secrets`) im Rahmen dieses Logs.
- Keine Mehrfachlaeufe zur Flaky-Erkennung; die Stabilitaetsbewertung basiert auf einem serielle Einmallauf.
- Keine Code- oder Testaenderungen; alle Befunde sind reine Ist-Beobachtungen.
- Die Reporter-Dateien `.tmp-analysis-*.json` wurden nur als Auswertungsartefakte fuer diesen Bericht genutzt; sie sind kein offizieller Projekt-Output.

## Gesamtfazit

Die Hauptsuite ist aktuell gruenn und deckt Kernbereiche wie Termine, Projekte, Touren, Notizen, Teile der Stammdaten und Monitoring gut ab. Die eigentliche Qualitaet ist jedoch deutlich ungleichmaessig: Branch-Coverage ist schwach, grosse Frontendflaechen bleiben technisch duenn, und genau der fachlich riskante Komplex aus Verfuegbarkeit und Mitarbeiterabwesenheiten ist sichtbar vorhanden, aber absichtlich deaktiviert.

## Priorisierte Handlungsbedarfe

1. FT30- und FT01-Availability-Cluster reaktivieren oder konsequent bereinigen.
2. Feature-Traceability zwischen Fachdoku, Test-Matrix und Testlabels harmonisieren.
3. Kritische UI-Wiring-Tests schrittweise von Source-Inspection auf Verhaltenspruefung umstellen.
4. Testinfra bei Schema-Drift fail-fast machen statt Tabellen im Reset zu reparieren.
5. `verify-demo-seed` reproduzierbar und selbstgenuegsam machen.
6. Schwache Controller-/Service-Bereiche gezielt absichern, vor allem `employeeAbsences*`, `employeeAvailability*`, `bulkImportService`, `helpTexts*`.
7. Rollenverhalten fuer Team-Routen fachlich klaeren und nicht nur als IST einfrieren.
8. `docs/TEST_MATRIX.md` und die Pflichtkommentare in Testdateien nachziehen.
