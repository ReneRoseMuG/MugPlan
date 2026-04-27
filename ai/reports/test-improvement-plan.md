# Verbesserungsplan für die bestehende Test-Suite

## 1. Kurzfazit

Die bestehende Suite schützt die Kernlogik vor allem dort gut, wo echte Systemgrenzen geprüft werden: serverseitige Integrationssuiten und Browser-E2E decken wichtige Termin-, Tour-, Monitoring-, Rollen-, Report-, Seed- und Backup-Pfade bereits belastbar ab. Die größte Schwäche liegt nicht in fehlender Testmenge, sondern in einer zu breiten UI-Unit-Schicht, die häufig nur Markup, TestIDs, Sichtbarkeit und Mock-Verdrahtung prüft und dadurch fachliche Sicherheit suggeriert, ohne Nutzerwirkung, Persistenz, Rollenverweigerung oder Negativpfade wirklich nachzuweisen.

Fachlich sinnvoll ist deshalb kein pauschaler Ausbau der Coverage, sondern eine kontrollierte Verschiebung der Sicherungswirkung: weg von renderToStaticMarkup-, Wiring- und Sichtbarkeitstests, hin zu realistischeren Daten, stärkeren Negativnachweisen, echter Serververweigerung, Persistenzbelegen, Reload-/Zweitansicht-Prüfungen und helperseitig ehrlicheren Testgrundlagen.

Zusätzlich gilt für alle späteren Umsetzungsaufträge: Erfolg wird nicht daran gemessen, dass Tests am Ende grün sind, sondern daran, dass ihre fachliche Aussagekraft steigt und sie bei einer verletzten Regel zuverlässig rot würden.

## 2. Leitplanken gegen Grünbiegen von Tests

Spätere Testverbesserungen dürfen nicht als „grün gelungen“ bewertet werden, wenn die fachliche Sicherungswirkung dabei sinkt. Ein Test ist nur dann verbessert, wenn er nach der Änderung klarer, belastbarer oder realistischer dieselbe oder eine stärkere Fachregel prüft als zuvor.

Verbindliche Leitplanken:

- Ein Test darf nicht dadurch grün gemacht werden, dass Assertions entfernt, verallgemeinert oder abgeschwächt werden. Aus `exakt dieses Objekt / dieser Fehler / dieser Persistenzzustand` darf nicht `irgendein Objekt / irgendein Text / irgendein erfolgreicher Render` werden.
- Ein Test darf nicht dadurch grün gemacht werden, dass konkrete fachliche Werte durch leere Arrays, leere Objekte, Dummy-Daten oder beliebige Platzhalter ersetzt werden, wenn die geprüfte Regel realistische Pflichtfelder, Relationen, Status oder Konkurrenzdaten voraussetzt.
- Ein Test darf nicht dadurch grün gemacht werden, dass ein Mock das erwartete Ergebnis schon fertig liefert und die eigentliche Fachlogik, Validierung, Filterung, Rollenprüfung oder Persistenzwirkung dadurch gar nicht mehr geprüft wird.
- Ein Test darf nicht dadurch grün gemacht werden, dass relevante Nutzeraktionen, Persistenzpfade, API-Aufrufe, Reloads, Zweitansichten oder Datenbankprüfungen umgangen werden, wenn genau dort die fachliche Wirkung liegt.
- Ein Test darf nicht dadurch grün gemacht werden, dass `test.skip`, `describe.skip`, `it.skip`, `todo`, bedingte Returns, Early-Exits oder ähnliche Mechanismen eingesetzt werden, um einen roten Fall aus dem Lauf zu entfernen.
- Ein Test darf nicht dadurch grün gemacht werden, dass Fehlermeldungen, Rollenprüfungen, Validierungen, Konflikte, Negativfälle oder Ausschlussbedingungen entfernt werden.
- Ein Test darf nicht dadurch grün gemacht werden, dass er nur noch prüft, ob eine Seite rendert oder ein Element vorhanden ist, obwohl fachlich Daten, Beziehungen, Rollen, Regeln, Reports oder Persistenzfolgen geprüft werden müssten.
- Eine Erwartung darf nur dann angepasst werden, wenn die bisherige Erwartung nachweislich fachlich falsch war. Dieser Nachweis muss im Umsetzungsprotokoll ausdrücklich benannt werden: Was war die alte Erwartung, warum war sie fachlich falsch, wodurch ist das belegt?
- Wenn ein fachlich sinnvoller Test rot wird, ist das nicht automatisch ein Problem des Tests. Es kann ein echter Bug, eine fehlende Implementierung oder eine unvollständige Testinfrastruktur sein. Die Ursache muss dann dokumentiert und eingeordnet werden, statt den Test reflexhaft weichzumachen.

Verbindliche Einordnung für spätere Umsetzungen:

| Fall | Bedeutung | Konsequenz |
|---|---|---|
| Test ist grün und fachlich stark | prüft reale Regel, reale Daten, klare Wirkung | beibehalten oder gezielt ausbauen |
| Test ist grün, aber nur Smoke-Test | kleiner technischer Render-/Wiring-Schutz ohne Fachanspruch | ehrlich als Smoke führen, nicht als Fachabsicherung zählen |
| Test ist grün, aber irreführend schwach | suggeriert Fachschutz, prüft aber nur Markup, Mock oder Sichtbarkeit | priorisiert nachschärfen oder herabstufen |
| Test wird rot, weil er eine echte Lücke sichtbar macht | Verhalten oder Schutz fehlt wirklich | Bug, fehlende Implementierung oder Infrastrukturlücke untersuchen |
| Test wird rot, weil seine Erwartung fachlich falsch ist | alte Erwartung war nicht mehr korrekt | Erwartung nur mit dokumentierter fachlicher Begründung anpassen |
| Test wurde unzulässig grün gebogen | Erfolg nur durch Abschwächung, Skip, triviale Daten oder Mock-Vorwegnahme | nicht akzeptieren, als Qualitätsfehler behandeln |

## 3. Problemkategorien

### 2.1 Triviale Render- und Smoke-Tests

Der Review beschreibt große Teile von `tests/unit/ui/*wiring*.test.tsx`, `*render*.test.tsx` und `*layout*.test.tsx` als technische Regressionsmarker mit geringer Fachaussage. Gelesene Beispiele bestätigen das:

- `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx` prüft statisches HTML, TestIDs und sogar eine konkrete CSS-Klassenreihenfolge.
- `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx` prüft nur, dass bestimmte Props nicht weitergereicht werden.
- `tests/unit/ui/tourenplanReportPanel.wiring.test.tsx` sichert sichtbare Paneloptionen und Prop-Durchreichung, aber keine echte Reportwirkung.
- `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx` ist fachlich eher ein Renderer-/Smoke-Test als eine Integration.

Solche Tests sind weiterhin sinnvoll, wenn sie ehrlich als Smoke-, Wiring- oder Renderer-Tests geführt werden und nur eine kleine, klar begrenzte Layout- oder Render-Invariante absichern. Irreführend werden sie, wenn Dateiname, Scope-Kommentar oder Feature-Bezug den Eindruck erwecken, dass Fachregeln, Readonly-Schutz oder Reportlogik abgesichert seien.

Lösungsmuster:

- Smoke-Tests ausdrücklich als Smoke-/Renderer-/Wiring-Schicht kennzeichnen.
- Feature-Namen nur dort verwenden, wo tatsächlich Fachverhalten geprüft wird.
- Markuplastige Tests nur behalten, wenn sie einen billigen, klaren Nutzen haben.
- Relevante Fälle auf DOM-Interaktion, Persistenz, API-Antwort oder Reload-Nachweis heben.

### 2.2 Tests mit leeren oder unrealistischen Daten

Viele schwache UI-Units arbeiten mit minimalen oder künstlich zusammengesetzten Objekten, bei denen Beziehungen, Pflichtfelder und reale Zustandskombinationen fehlen. Beispiele:

- `tests/unit/ui/customersPage.readerReadonly.test.tsx` nutzt genau einen künstlichen Kunden ohne Termine, Notizen, Anhänge oder Tags.
- `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx` simuliert Touren und Mitarbeiter über vollständig gemockte Query-Ergebnisse.
- `tests/unit/ui/settingsPage.wiring.test.tsx` bestätigt nur das Vorhandensein einzelner Inputs und Buttons.
- `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx` bestätigt POST und Invalidierung, nicht aber fachlich korrekte Seed-Ergebnisse.

Realistische Mindestdaten je Domäne:

| Domäne | Realistische Mindestdaten |
|---|---|
| Kunden | `customerNumber`, Namens- oder Firmendarstellung, mindestens ein unterscheidbarer Such-/Listenwert; bei Preview-/Readonly-Tests zusätzlich reale Relationen oder bewusst leere Relationen |
| Projekte | zugeordneter Kunde, `name`, `orderNumber`, `type`; für Preview/Reports zusätzlich Artikel, Beschreibung oder Termine |
| Termine | entweder `projectId` oder `customerId`, gültiges Datum, ggf. `tourId`, `employeeIds`, `version`, Status-/Tag-Zustand für Parken/Storno/Blockierung |
| Touren | `name`, `color`, ggf. Wochenbezug, Mitarbeiterbezug und Terminbezug; reine Tour-IDs reichen für Wochenplanung oder Verfügbarkeit nicht |
| Mitarbeiter | `firstName`, `lastName`, `isActive`, `version`; bei Planungsfällen zusätzlich Team-, Tour- oder Terminbezug |
| Tags | persistente IDs, `name`, `color`, bei Ausschlusslogik zusätzlich reservierte System-Tags und Relationen |
| Rollen | echte Benutzer je Rolle; `localStorage`-Strings allein reichen nicht, wenn Serverregeln betroffen sind |
| Reports | Projekte, Kunden, Touren, Datumsfenster, Artikel, Notizen, Anhänge und Tags in der Kombination, die der Report wirklich nutzt |
| Kalenderdaten | vergangene und zukünftige Termine, ISO-Woche, mehrtägige Termine, gesperrte Wochen, Scope-Fremddaten |
| Einstellungen | gespeicherter Wert, Änderung, Persistenz und Reload; bloße Input-Sichtbarkeit reicht nicht |

Lösungsmuster:

- pro Domäne kleine, wiederverwendbare realistische Mindest-Factories definieren
- bei Listen/Filtern immer konkurrierende Fremddaten mitführen
- Seed-nahe Namen nicht als alleinigen Erfolgsbeleg zulassen

### 2.3 Selbstbestätigende Mocks, Fixtures oder Helper

Der Review benennt `tests/helpers/testDataFactory.ts` ausdrücklich als teilweise problematisch. Die Nachprüfung bestätigt den schärfsten Fall:

- `assignEmployeesToTourFixture()` in `tests/helpers/testDataFactory.ts` ist faktisch ein No-op.
- derselbe Name existiert auch in `tests/helpers/appointmentOverlapFixtures.ts` als No-op.
- Browser-Fixtures wie `createAppointmentBrowserFixture()` und `createProjectCreateEditBrowserFixture()` verwenden diesen Helper und wirken dadurch realistischer, als sie tatsächlich sind.

Verdächtige Testgruppen:

- Browser-Fixtures mit Tour-/Mitarbeiter-Kontext, die Tour-Mitgliedschaft voraussetzen könnten.
- stark gemockte UI-Unit-Dateien wie `tourWeekForm.render.test.tsx`, `tourManagement.role-readonly.wiring.test.tsx`, `tagPickerPanel.behavior.test.tsx`.
- Seed-/Invalidierungs-Tests wie `helpTextsPage.seed.wiring.test.tsx`, die nur Mock-Effekte verifizieren.

Lösungsmuster:

- Helper sollen Daten vorbereiten, aber keine erwartete Fachaussage schon im Setup „lösen“.
- No-op-Helper entweder real implementieren, umbenennen oder aus riskanten Fixtures entfernen.
- UI-Tests nicht primär gegen gemockte Child-Props schreiben, wenn das Fachziel Query-, Mutation- oder Rollenwirkung ist.

### 2.4 Unzureichende Integrationstests

Die starke Integrationsschicht ist der belastbarste Teil der Suite. Gerade deshalb sind Fälle problematisch, die Integrationswirkung nur im Namen tragen:

- `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx` rendert nur statisches HTML.
- einzelne UI-nahe „integration“- oder „layoutIntegration“-Dateien prüfen keine API, keine DB und keine Folgewirkung.

Belastbare Gegenbeispiele:

- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/integration/server/customers.visibility.by-role.test.ts`
- `tests/integration/server/admin.system-seed.integration.test.ts`

Lösungsmuster für echte Integrationstests:

- Arrange mit realistischen, konkurrierenden Datensätzen
- Act immer über echte Route oder Service-Grenze
- Assert auf HTTP-Status, Response-Payload und DB-Zustand vor/nach der Aktion
- bei Mutationen zusätzlich Version, Join-Tabellen, Folgeeffekte und Ausschluss unerlaubter Nebeneffekte prüfen
- Negativpfade nicht nur über Fehlerstatus, sondern auch über „nichts wurde persistiert“ absichern

### 2.5 Schwache Browser- und E2E-Tests

Die Browser-Lage ist insgesamt stark, aber Verbesserungsbedarf besteht dort, wo UI-Tests bisher nur Sichtbarkeit oder Navigation absichern und nicht die ganze Nutzerwirkung tragen. Gute Beispiele liegen bereits vor:

- `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts` prüft reale Daten, Scopewechsel, Filter, Reset und historische Treffer.
- `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts` prüft nicht nur fehlende Buttons, sondern readonly Inputs.
- `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts` verbindet Picker, Filter und Wochenansicht mit echten Tags.

Schwächer sind die vielen UI-Unit-Pendants, die ähnliche Bereiche nur als Markup prüfen.

Lösungsmuster:

- Browser-Tests sollen relevante Daten anlegen, speichern, wiederfinden und nach Reload oder in einer zweiten Ansicht erneut sehen
- nach Mutationen zusätzlich Listenanzahl, Zielobjekt-Identität oder Counter prüfen
- bei Readonly-/Rollenfällen zusätzlich Deep-Link oder direkte Mutationsversuche serverseitig absichern, nicht nur UI-Ausblendung

### 2.6 Fehlende oder oberflächliche Regelabdeckung

Die Kernregeln FT01, FT04, FT06, FT28 und FT31 sind laut Review in Integration/Browser weitgehend bis stark abgedeckt. Die Lücken liegen eher in flankierenden Bereichen:

- UI-nahe Form- und Listeninteraktion rund um Termine, Touren, Kunden, Mitarbeiter und Reports
- Systemgrenzen zwischen Readonly-Sichtbarkeit und echter Mutationsverweigerung
- Seed-/Report-/Tag-Hilfspfade, die oft nur als Wiring oder Renderer gesichert sind
- Migrations- und Schema-Synchronität, die laut Review nur oberflächlich abgesichert ist

Priorisierung der Regellücken:

- `P1`: Rollen-/Readonly-Verweigerung, Wochenplan-/Terminfolgen, Seed-/Systemzustände, kritische Listen-/Filter-Identität
- `P2`: Report- und Tagging-Nutzerwirkung, UI-Interaktionspfade mit echter Persistenz
- `P3`: reine Renderer-, Layout- und CSS-Invarianten

### 2.7 Rollen- und Berechtigungsrisiken

Betroffene Rollen: `ADMIN`, `DISPATCHER`, `READER`.

Bereits stark abgesichert:

- `tests/integration/server/customers.visibility.by-role.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- mehrere Reader-Browsertests wie `reader-customer-readonly.browser.e2e.spec.ts`

Zu schwach oder irreführend:

- `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`
- `tests/unit/ui/customersPage.readerReadonly.test.tsx`
- `tests/unit/ui/calendarYearView.readerReadOnly.test.tsx`

Erlaubte Sichtbarkeit und Aktionen sind in diesen UI-Tests nur indirekt über ausgeblendete Buttons modelliert. Die technische Durchsetzung bleibt dort unbewiesen, weil die Tests weder echte API-Zugriffe noch direkte Mutationspfade, Deep Links oder verweigerte Serveroperationen prüfen.

Risiko: UI-Sichtbarkeit wird mit Berechtigungsdurchsetzung verwechselt.

### 2.8 Seed-, Cleanup- und Isolationsprobleme

Die Infrastruktur ist grundsätzlich stark:

- `tests/helpers/resetDatabase.ts`
- `tests/helpers/browserE2e.ts`
- `tests/helpers/testIsolationFingerprint.ts`
- `tests/helpers/testIsolationCanaries.ts`
- `docs/TEST_ISOLATION_REBUILD_PLAN.md`

Trotzdem bleiben fachliche Risiken:

- Browser-Storage-Isolation war laut Plan historisch nicht gleichwertig zum Vitest-Pfad und bleibt ein Entscheidungs- und Kontrollpunkt.
- Ein sauberer Reset ersetzt keine präzisen Assertions.
- Seed-nahe Objekte können Tests grün machen, wenn sie nur auf Text oder Existenz prüfen.
- der No-op-Tour-Assign-Helper verwischt, welche Relationen ein Test wirklich vorbereitet.

Lösungsmuster:

- Fingerprint- und Canary-Ansatz aus dem vorhandenen Rebuild-Plan konsequent als Diagnoseinstrument nutzen
- unscharfe Listen-, Filter-, Seed- und Storage-Tests gezielt gegen Fremddaten härten
- Helper-Fidelity vor weiterer Suite-Ausweitung klären

### 2.9 Fehlende Negativ- und Grenzfalltests

In starken Integrationssuiten sind Negativfälle häufig vorhanden; in vielen UI-Unit-Dateien fehlen sie nahezu vollständig. Besonders wichtig sind fachlich:

- verweigerte Mutationen für unzulässige Rollen
- ungültige Pflichtfelder und Validierungen
- Konflikte bei Wochenplanung, Mitarbeiterzuweisung und Optimistic Locking
- leere Zustände mit fachlich korrekter Rückmeldung
- Seed-/Systemzustände, bei denen ein Objekt bewusst gerade nicht auswählbar sein darf
- Fremddaten-/Canary-Fälle in Listen, Filtern, Reports und Backups

Beste Testschicht:

- Rollen, Persistenz, Versionierung, Konflikte: Integration
- UI-Readonly, Formularpfade, Reload-/Zweitansicht: Browser
- reine Berechnungs- und Formatregeln: Unit

### 2.10 Redundante oder falsch gewichtete Tests

Mehrere Tests liefern ähnliche geringe Aussage, während wichtigere Wirkungen unzureichend belegt bleiben. Beispiele:

- `settingsPage.wiring.test.tsx` bestätigt viele Inputs und Buttons, aber keine echte Persistenz
- `customersPage.readerReadonly.test.tsx`, `calendarYearView.readerReadOnly.test.tsx`, `tourManagement.role-readonly.wiring.test.tsx` sichern jeweils nur Sichtbarkeit
- `tourenplanReportPanel.wiring.test.tsx` und ähnliche Report-Wiring-Dateien prüfen Panel-Markup statt Reportwirkung

Lösungsmuster:

- mehrere flache UI-Unit-Dateien je Domäne in eine kleine, ehrlich bezeichnete Smoke-Schicht bündeln
- echte Fachabsicherung in weniger, aber stärkeren Integration- oder Browsertests konzentrieren

## 4. Verbesserungsmatrix

| Priorität | Problemkategorie | Betroffene Tests oder Bereiche | Fachliche Lücke | Empfohlene Verbesserung | Geeignete Testschicht | Benötigte Testdaten | Erwartete Assertions | Schutz gegen Grünbiegen | Risiko bei Nichtbehebung |
|---|---|---|---|---|---|---|---|---|---|
| P1 | Rollen- und Berechtigungsrisiken | `tourManagement.role-readonly.wiring`, `customersPage.readerReadonly`, `calendarYearView.readerReadOnly` | UI-Ausblendung beweist keine serverseitige Verweigerung | pro Domäne echte Verweigerung für `READER` und ggf. `DISPATCHER` über API- oder Browserpfad absichern | Integration + Browser | echte Benutzer je Rolle, aktive/inaktive Datensätze, direkte Mutationsziele | 403/404/409, kein Persistenzdelta, readonly Formzustand, Deep-Link bleibt gesperrt | Verbesserung zählt nur, wenn mindestens ein verweigerter Mutationspfad und ein unveränderter Persistenzzustand geprüft werden; reine Button-Ausblendung reicht nicht | Falsche Berechtigungen oder verdeckte Sicherheitslücken |
| P1 | Selbstbestätigende Helper | `tests/helpers/testDataFactory.ts`, `tests/helpers/appointmentOverlapFixtures.ts`, browser-nahe Factory-Nutzer | Tour-/Mitarbeiter-Relationen werden realistischer vorgetäuscht als vorbereitet | `assignEmployeesToTourFixture()` fachlich klären und konsequent bereinigen oder ersetzen | Testinfrastruktur-Entscheidung, danach Integration/Browser | Tour, Mitarbeiter, echte Join-Relationen | Relation tatsächlich in DB vorhanden oder Helper bewusst umbenannt/nicht mehr für Relationen verwendet | Verbesserung zählt nur, wenn der Test nicht länger auf No-op-Vorbereitung vertraut und die Relation fachlich nachvollziehbar nachweisbar ist | Grüne Tests mit falscher Ausgangslage |
| P1 | Schwache Listen-/Filter-Nachweise | UI-Units rund um Listen; Browserbereiche wie Termine/Kunden/Projekte sollen Vorbild sein | Treffer werden teils nur über Textsichtbarkeit statt Identität, Count oder Scope bewiesen | weitere Listen-/Filtertests mit konkurrierenden Fremddaten, Count- und Identity-Nachweisen schneiden | Browser + Integration | ähnliche Namen, historische und zukünftige Datensätze, zusätzliche Canary-Treffer | exakte Zeilenanzahl, Zielobjekt sichtbar, Fremdobjekt unsichtbar, Reset stellt Grundmenge exakt wieder her | Verbesserung zählt nur, wenn mindestens ein realistischer Fremddatensatz den Test bei unscharfer Assertion rot machen würde | Falsche Planung, falsche Reports, verdeckte Filterregressionen |
| P1 | Seed-/Systemzustandsrisiken | `helpTextsPage.seed.wiring`, `admin.system-seed.integration`, Isolationspfade | Seed-Wirkung wird teils nur über POST/Invalidierung oder Preview bestätigt | Seed-Fälle über Resultat, Idempotenz, Ausschluss nicht ausgewählter Einträge und Nutzerwirkung absichern | Integration + Browser | fehlende und bestehende Seed-Ziele, bewusst nicht ausgewählte Ziele, Seed-nahe Fremddaten | erwartete Einträge entstehen exakt, nicht ausgewählte fehlen, zweiter Lauf erzeugt keine Duplikate | Verbesserung zählt nur, wenn echte Seed-Ergebnisse und Nicht-Ergebnisse geprüft werden; ein bloßer erfolgreicher Request genügt nicht | Falsche Systemstammdaten, grüne Seed-Tests ohne echte Wirkung |
| P1 | Fehlende Negativpfade in kritischen Mutationen | Tour-/Wochenplanung, Termine, Rollen, Reports mit Eingriffen | erfolgreiche Standardpfade sind da, aber UI-nahe Negativpfade sind ungleichmäßig | pro Kernmutation mindestens ein verweigerter, konfliktärer oder leerer Gegentest | Integration zuerst, Browser für Nutzerwirkung | Versionen, Konfliktpartner, gesperrte Wochen, historische Daten | Fehlercode, unveränderte DB, unveränderte Listen-/Counterstände | Verbesserung zählt nur, wenn der Negativfall bei entfernter Validierung oder Rollenprüfung verlässlich rot würde | Datenverlust, stille Überschreibungen, inkonsistente Planung |
| P2 | Triviale Render-/Smoke-Tests | `appointmentsListPage.tourLocking.wiring`, `standaloneDomainViews.listFallback`, `settingsPage.wiring`, viele `*render*`/`*layout*` | Feature-Kommentare und Dateinamen überhöhen die Fachaussage | Smoke-Schicht ehrlich benennen und nur dort behalten, wo klare Render-Invariante abgesichert wird | Unit/Smoke | minimale Renderdaten | Präsenz klar definierter Render-Invariante, keine Fachbehauptung | Verbesserung zählt nur, wenn die Datei ausdrücklich als Smoke/Wiring eingeordnet wird und keine versteckte Fachbehauptung zurückbleibt | Fehlgewichtung der Testqualität |
| P2 | Falsch benannte „Integrationen“ | `projectArticleDescriptionRenderer.integration` und ähnliche UI-nahe Integrationsnamen | Integrationslabel ohne echte Systemgrenze | Renderer-/Smoke-Tests umbenennen oder durch echte Integrationspfade ergänzen | Unit/Smoke oder echte Integration | Projektdaten mit Artikeln, Beschreibung, Reportkontext | entweder nur Render-Invariante oder echte API-/Persistenzwirkung | Verbesserung zählt nur, wenn entweder der Name ehrlich wird oder eine echte Systemgrenze mit realem Arrange/Act/Assert hinzukommt | Fehlgeleitete Priorisierung künftiger Arbeit |
| P2 | Unrealistische UI-Daten | `customersPage.readerReadonly`, `tourWeekForm.render`, `tourManagement.role-readonly`, `tagPickerPanel.behavior` | Pflichtbeziehungen und reale Zustandskombinationen fehlen | domänenspezifische Mindest-Factories für Kunden/Projekte/Termine/Touren/Mitarbeiter/Tags einsetzen | Unit mit realistischeren Daten oder besser Browser/Integration | vollständige Minimalobjekte mit Beziehungen | UI zeigt relevante Inhalte, Aktionen wirken auf echte Zustände oder bleiben gesperrt | Verbesserung zählt nur, wenn mindestens ein realistischer Datensatz mit Pflichtfeldern und Beziehungen verwendet wird; leere Platzhalter sind nicht zulässig | Tests bleiben grün, obwohl reale Kombinationsfehler unentdeckt bleiben |
| P2 | Tagging nur als Picker-Markup | `tagPickerPanel.behavior`, `tagBadge.*`, diverse `*.tagsSidebar.wiring` | Picker- und Badge-Markup ersetzt nicht den Nachweis von Auswahl-, Filter- und Ausschlussregeln | Tagging pro Domäne mit echter Auswahl, Speicherung und Wiederauffindbarkeit absichern | Browser + Integration | reservierte Tags, normale Tags, Relationen zu Kunde/Projekt/Termin | auswählbar/nicht auswählbar, gespeichert, gefiltert, in Zweitansicht sichtbar | Verbesserung zählt nur, wenn nicht nur Badge-/Popover-Markup, sondern auch ein echter Auswahl- und Wiederfinde-Pfad geprüft wird | Falsche Tag-Filter, falsche Ausschlüsse, inkonsistente UI |
| P2 | Report-/Druckpfade nur als Wiring | `tourenplanReportPanel.wiring`, weitere Report-Wiring-Dateien | Panel- und Vorschau-Markup beweisen nicht die fachliche Reportausgabe | wenige echte Report-Workflows pro Reporttyp statt vieler Panel-Wiring-Tests | Browser + Integration | Projekte, Termine, Touren, Artikel, Notizen, Datumsfenster | Inhalt, Reihenfolge, Filterwirkung, Reload/Druckvorschau-Konsistenz | Verbesserung zählt nur, wenn fachliche Reportdaten und ihre Filter-/Ausgabe-Regeln rot würden, falls die Reportlogik falsch ist | Falsche Reports trotz grüner UI-Units |
| P3 | CSS-/Markup-fragile Assertions | `appointmentsListPage.tourLocking.wiring` und ähnliche Klassen-/String-Prüfungen | semantisch korrekter Zustand kann wegen Markup-Reihenfolge rot werden | Klassenreihenfolge durch semantische Marker, Disabled-Zustände oder Nutzerfolgen ersetzen | Unit/Smoke oder Browser | beliebige Minimaldaten | disabled, nicht klickbar, Badge sichtbar, Aktion verweigert | Verbesserung zählt nur, wenn die neue Assertion semantisch enger ist als die alte und nicht bloß allgemeiner oder vager | unnötige Flakiness, falscher Alarm |
| P3 | Redundante geringe Aussage | viele kleine Readonly-/Settings-/Layout-Dateien | mehrfach dieselbe schwache Aussage, wenig zusätzlicher Schutz | schwache Einzeltests bündeln, herabstufen oder später ersetzen | Unit/Smoke | kleine Minimaldaten | wenige klare Smoke-Nachweise statt vieler Duplikate | Verbesserung zählt nur, wenn keine Fachwirkung verloren geht und der verbleibende Testtyp ehrlich als Smoke ausgewiesen ist | Wartungslast ohne proportionalen Nutzen |

## 5. Domänenbezogene Lücken

### Kalender

- Stark: Wochen-/Monatskonsistenz und Drag-and-Drop im Browser.
- Lücke: Readonly und Create-Verbote in UI-Units wie `calendarYearView.readerReadOnly.test.tsx` bleiben auf Sichtbarkeitsebene.
- Priorität: `P2`.

### Termine

- Stark: FT01, Overlap, Parken, Storno, Listen-/Scope-Browserpfade.
- Lücke: viele Formular-/Listen-UI-Units prüfen Markup statt echter Bearbeitungsinteraktion.
- Priorität: `P1` für Negativpfade und Rollen, `P2` für UI-Interaktion.

### Projekte

- Stark: Projekt-API, Browser-Flows, Auftragsnummern- und Sidebar-Pfade.
- Lücke: Preview-/Renderer-/Reportnähe ist oft nur über statisches HTML gesichert (`projectsTable.preview`, `projectArticleDescriptionRenderer.integration`).
- Priorität: `P2`.

### Kunden

- Stark: Rollen- und Sichtbarkeitsintegration, Reader-Browserpfad.
- Lücke: schwache UI-Readonly-Tests und kaum Nutzerwirkungsnachweise in der Unit-Schicht.
- Priorität: `P1`.

### Touren und Wochenplanung

- Stark: `tourWeekEmployees.integration.test.ts`, Browser-Wochenplanung.
- Lücke: viele ergänzende Unit-Dateien wie `tourWeekForm.render` oder `tourManagement.role-readonly.wiring` sind reine Verdrahtung.
- Priorität: `P1`.

### Mitarbeiter

- Stark: Überlappung, Sichtbarkeit, aktuelle Termine, Import-/Lifecycle-Integrationen.
- Lücke: Readonly-/Picker-/Board-Units arbeiten oft mit künstlicher Verdrahtung.
- Priorität: `P2`.

### Tags

- Stark: Admin-CRUD-Integration und Browser-Workflow `tag-selection-unification`.
- Lücke: breite Picker-/Badge-Unit-Lage bestätigt oft nur Popover- und Badge-Markup.
- Priorität: `P2`.

### Reports

- Stark: Browser- und Integrationspfade für FT26, Tourenplan, Vorlaufliste, Auftragsliste.
- Lücke: viele Reportpanel- und Print-Wiring-Tests sind fachlich schwach gewichtet.
- Priorität: `P2`.

### Rollen

- Stark: einzelne Integrationen und Browsertests.
- Lücke: systematischer Blindspot bei UI-only-Readonly-Sicherung.
- Priorität: `P1`.

### Einstellungen

- Stark: Teile der Browser-Persistenz.
- Lücke: `settingsPage.wiring.test.tsx` und verwandte Tests sichern vor allem Input-Existenz.
- Priorität: `P3` für Smoke-Ehrlichkeit, `P2` falls echte Persistenzlücken offen sind.

## 6. Empfohlene Umsetzungsreihenfolge

Die Reihenfolge folgt ausdrücklich dem Schadenspotenzial, nicht dem geringsten Aufwand. Höher priorisiert werden deshalb Bereiche, in denen heute grüne, aber schwache Tests kritische Fachregeln nur scheinbar absichern und dadurch Rollenfehler, Persistenzfehler, falsche Terminplanung, fehlerhafte Tourzuordnung, kaputte Kunden-/Projektbeziehungen oder falsche Reports verdecken könnten.

1. Rollen- und Readonly-Pfade je Domäne von UI-Sichtbarkeit auf echte Verweigerung heben, beginnend mit Kunden, Touren/Wochenplanung und Kalender.
2. Problematische Helper-Fidelity klären, insbesondere `assignEmployeesToTourFixture()` und browsernahe Tour-/Mitarbeiter-Fixtures.
3. Termin-, Projekt- und Kundenlisten dort nachschärfen, wo heute Textsichtbarkeit statt Identität, Count und Negativbeweis dominiert.
4. Seed- und Systemzustandsfälle fachlich härten: HelpText-Seed, System-Seed, Seed-nahe Ausschlussfälle.
5. Tagging- und Report-Nutzerwirkung in wenige stärkere Browser-/Integrationspfade bündeln.
6. Irreführende `integration`-, `wiring`- und `render`-Tests umbenennen, herabstufen oder durch ehrliche Smoke-Schicht ersetzen.
7. CSS-fragile Assertions und redundante geringe Aussage zuletzt aufräumen.

Diese Reihenfolge hält die Arbeitspakete klein: erst sicherheits- und planungsrelevante Lücken, dann Testgrundlagen, dann Qualitäts- und Benennungsbereinigung.

## 7. Vorschläge für spätere Codex-Aufträge

Verbindliche Zusatzregel für jeden dieser Folgeaufträge: Tests dürfen nicht durch Abschwächung, Skips, triviale Testdaten, künstliche Mocks oder Erwartungsanpassungen grün gemacht werden. Jeder Abschlussbericht des jeweiligen Folgeauftrags muss ausdrücklich benennen:

- Welche Tests wurden fachlich verschärft oder ergänzt?
- Welche konkreten Fachregeln oder Nutzerwirkungen werden jetzt geprüft?
- Welche Testdaten wurden verwendet und warum sind sie realistisch?
- Welche Assertions würden bei einem echten Regelbruch rot werden?
- Wurden Assertions, Mocks, Fixtures oder Helper abgeschwächt? Erwartete Antwort: nein. Falls doch, einzeln begründen und als Risiko markieren.
- Wurden Tests übersprungen, gelöscht oder umbenannt? Erwartete Antwort: nein. Falls doch, einzeln begründen und als Risiko markieren.
- Wurde Produktionscode geändert? Erwartete Antwort bei reinen Testaufträgen: nein.

1. `Kunden Rollenverweigerung härten`: Ergänze oder ersetze die schwachen Reader-UI-Unit-Tests für Kunden durch einen kleinen Auftrag nur für Kunden-Readonly mit Browser- und Integrationsnachweisen für Deep-Link, Detailansicht und gesperrte Mutation. Pflicht gegen Grünbiegen: keine Reduktion auf bloße UI-Ausblendung, kein Skip, keine leeren Platzhalterdaten.
2. `TourManagement Readonly echt absichern`: Erzeuge einen abgegrenzten Auftrag nur für `TourManagement`, der UI-Ausblendung, Deep-Link-Verhalten und verweigerte Mutationen für `READER` fachlich zusammenzieht. Pflicht gegen Grünbiegen: mindestens ein verweigerter Server- oder Persistenzpfad muss rot werden, wenn die Rollenregel entfernt wird.
3. `Kalender-Readonly von Sichtbarkeit auf Wirkung heben`: Prüfe für Jahres-/Wochenansichten nur die Leser-Sperre und direkte Anlagepfade, ohne andere Kalenderfunktionen mitzuziehen. Pflicht gegen Grünbiegen: reine Render- oder Button-Präsenz reicht nicht, die gesperrte Aktion muss fachlich nachweisbar sein.
4. `Tour-/Mitarbeiter-Fixtures bereinigen`: Kläre und korrigiere ausschließlich die Testhelper rund um Tour-Mitgliedschaft; keine Produktivlogik, keine breite Testsanierung im selben Auftrag. Pflicht gegen Grünbiegen: keine kosmetische Umbenennung ohne fachliche Klärung, keine scheinbar realistischen No-op-Helfer beibehalten.
5. `Terminlisten-Nachweise schärfen`: Migriere einen kleinen Satz markuplastiger Terminlisten-Unit-Tests auf echte DOM-/Browser-Nachweise mit konkurrierenden historischen und zukünftigen Daten. Pflicht gegen Grünbiegen: kein Wechsel auf allgemeinere Textprüfungen, sondern stärkere Identity-, Count- und Negativnachweise.
6. `HelpText-Seed fachlich absichern`: Ergänze nur die Seed-Wirkung und Idempotenz im HelpText-Bereich; keine allgemeinen HelpText-Refactorings. Pflicht gegen Grünbiegen: POST und Invalidierung allein genügen nicht, fachliche Seed-Ergebnisse und Nicht-Ergebnisse müssen sichtbar rot werden können.
7. `Tag-Picker-Markup durch Nutzerwirkung ergänzen`: Wähle nur eine Domäne, z. B. Kunden oder Projekte, und sichere dort Auswahl, Speicherung und Wiederauffinden realistisch ab. Pflicht gegen Grünbiegen: kein Mock darf die Auswahl oder Filterwirkung schon vorwegnehmen.
8. `Reportpanel-Wiring entschlacken`: Überführe einen kleinen Reportbereich, z. B. Tourenplan oder Auftragsliste, von statischen Wiring-Tests auf wenige echte Report-Workflows. Pflicht gegen Grünbiegen: Panel-Markup darf nicht als Ersatz für fachliche Reportdaten oder Filterwirkung gewertet werden.
9. `Smoke-Schicht ehrlich benennen`: Reiner Umbenennungs-/Einordnungsauftrag für irreführende `integration`-, `wiring`- und `render`-Dateien, ohne gleichzeitig neue Tests zu schreiben. Pflicht gegen Grünbiegen: keine Umbenennung darf einen fachlich schwachen Test höherwertig erscheinen lassen.

## 8. Entscheidungsbedarf

- Soll die bestehende UI-Unit-Wiring-Schicht bewusst als kleine Smoke-Schicht erhalten bleiben, oder sollen größere Teile gezielt ersetzt werden?
- Soll `assignEmployeesToTourFixture()` echte Relationen persistieren, klar umbenannt oder aus browsernahen Fixtures entfernt werden?
- Welche domänenspezifischen Mindestdaten gelten künftig verbindlich für Kunden, Projekte, Termine, Touren, Mitarbeiter, Tags und Reports?
- Sollen UI-nahe Dateien mit `integration` im Namen umbenannt werden, oder möchte das Team das Label nur für echte Systemgrenzen reservieren?
- Wie weit sollen Readonly-/Rollenregeln browserseitig nachgewiesen werden, und wo genügt eine serverseitige Integration mit zusätzlichem UI-Smoke?
- Soll die Tag-/Report-Absicherung primär über Browser oder stärker über serverseitige Integration ergänzt werden?
- Welche Teile des vorhandenen Isolations-Rebuild-Plans sind Vorbedingung, bevor weitere Browser-/Seed-/Storage-Suiten umgebaut werden?

## 9. Ausführungsprotokoll

### Umfang dieses Korrekturauftrags

- Geändert wurde ausschließlich `ai/reports/test-improvement-plan.md`.
- Nicht geändert wurden Produktionsdateien, Tests, Fixtures, Helper, Seeds, Cleanup-Skripte oder Testkonfigurationen.
- Ziel dieses Korrekturauftrags war ausschließlich die textliche Härtung des Verbesserungsplans gegen Missverständnisse zum „Grünbiegen“.

### Gelesene Dateien

- Primärquelle: `ai/reports/test-review-aussagekraft.md`
- Helper und Isolation:
  - `tests/helpers/testDataFactory.ts`
  - `tests/helpers/appointmentOverlapFixtures.ts`
  - `tests/helpers/resetDatabase.ts`
  - `tests/helpers/browserE2e.ts`
  - `tests/helpers/apiTestHarness.ts`
  - `tests/helpers/testIsolationFingerprint.ts`
  - `tests/helpers/testIsolationCanaries.ts`
  - `tests/helpers/testIsolationExecution.ts`
  - `docs/TEST_ISOLATION_REBUILD_PLAN.md`
- Schwache Referenztests:
  - `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
  - `tests/unit/ui/standaloneDomainViews.listFallback.test.tsx`
  - `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`
  - `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`
  - `tests/unit/ui/projectsTable.preview.test.tsx`
  - `tests/unit/ui/tourWeekForm.render.test.tsx`
  - `tests/unit/ui/settingsPage.wiring.test.tsx`
  - `tests/unit/ui/tagPickerPanel.behavior.test.tsx`
  - `tests/unit/ui/tourenplanReportPanel.wiring.test.tsx`
  - `tests/unit/ui/customersPage.readerReadonly.test.tsx`
  - `tests/unit/ui/calendarYearView.readerReadOnly.test.tsx`
  - `tests/integration/ui/projectArticleDescriptionRenderer.integration.test.tsx`
- Starke Referenztests:
  - `tests/integration/server/tourWeekEmployees.integration.test.ts`
  - `tests/integration/server/monitoring.ft31.integration.test.ts`
  - `tests/integration/server/customers.visibility.by-role.test.ts`
  - `tests/integration/server/admin.system-seed.integration.test.ts`
  - `tests/integration/server/masterData.tags.ft28.integration.test.ts`
  - `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`
  - `tests/e2e-browser/appointments-list.filter-scope.browser.e2e.spec.ts`
  - `tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts`

Diese Auswahl war ausreichend, weil der Auftrag ausdrücklich kein erneuter Vollaudit war. Gelesen wurden nur die im Review hervorgehobenen Problemfälle, deren Gegenbeispiele und die dafür relevanten Helper-/Isolationspfade.

### Ausgeführte Befehle

- `Get-ChildItem -Force ai\reports | Select-Object Name,Length,LastWriteTime`
- `Get-Content -Raw -Encoding UTF8 ai\reports\test-review-aussagekraft.md`
- mehrere gezielte `Get-Content -Raw -Encoding UTF8 ...`-Aufrufe auf die oben gelisteten Helper- und Testdateien
- `rg -n "^## |^### " ai/reports/test-review-aussagekraft.md`
- `rg -o "tests/[A-Za-z0-9_./-]+\.(test|spec)\.[A-Za-z0-9]+" ai/reports/test-review-aussagekraft.md | Sort-Object -Unique`
- `rg -n "assignEmployeesToTourFixture\(" tests`

### Ausgeführte Testbefehle

- Keine. Für diesen Auftrag wurden die im vorhandenen Review bereits dokumentierten Testläufe als Primärgrundlage verwendet.

### Nicht verifizierte Annahmen

- Es wurde nicht erneut geprüft, welche der im Review erwähnten Vollinventur-Klassifikationen sich seit Erstellung des Berichts verändert haben könnten.
- Es wurde nicht erneut die komplette Suite gelesen oder ausgeführt.
- Für einige Helper-Nutzer wurde nur die Struktur und nicht jeder einzelne Aufrufer bis ins letzte Detail manuell nachverfolgt; das ist für die Planungsstufe ausreichend, muss aber in Umsetzungsaufträgen ggf. je Bereich konkretisiert werden.
