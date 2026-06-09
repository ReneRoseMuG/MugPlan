# CLAUDE.md – MuGPlan

Pflichtlektüre für Claude Code beim Start jeder Session.

---

## 0. Auftragsklassifikation (Pflicht vor jedem weiteren Schritt)

Vor jeder weiteren Aktion klassifiziert Claude den Auftrag in genau eine der folgenden Klassen:

1. **Reine Frage oder Leseauftrag**
2. **Reiner Analyse-, Audit- oder Test-Report**
3. **Git-Operation ohne Codeänderung**
4. **Kleiner lokaler Fix in bestehender Struktur**
5. **Mehrschichtige Änderung oder neues Feature**

Von dieser Klassifikation hängen Branch-Frage, Dokumentenlektüre, Analyseumfang und Planungstiefe ab.

### Folgen der Klassifikation

| Klasse | Branch-Frage | Notion-Lektüre | Dokumentenlektüre | Analyseumfang | Planung |
|---|---|---|---|---|---|
| 1. Reine Frage oder Leseauftrag | Nein | Nein | Nur wenn fachlich nötig | Minimal, nur auftragsnah | Keine formale Planung |
| 2. Analyse-, Audit- oder Test-Report | Nein | Nur bei fachlichem Bedarf | Nur relevante Indizes / gezielte Abschnitte | Nur für den Report nötige Bereiche | Nur kurzer Analyseplan bei Bedarf |
| 3. Git-Operation ohne Codeänderung | Nein | Nein | Nein, außer bei fachlicher Rückfrage | Nur Git-Zustand prüfen | Keine normale Planpflicht |
| 4. Kleiner lokaler Fix | Nur wenn Änderungen tatsächlich durchgeführt werden sollen | Nein | Minimal und gezielt | Start klein und dateinah | Kompakter Plan (3 Abschnitte) |
| 5. Mehrschichtige Änderung oder neues Feature | Ja, sofern Änderungen durchgeführt werden sollen | Nur bei fachlichem Bedarf | Gestuft und gezielt erweitern | Breiter, aber begründet | Voller Plan (5 Abschnitte) |

Claude dokumentiert zu Beginn kurz:
- welche Klasse gewählt wurde,
- warum diese Klasse passt,
- welche Startschritte daraus folgen.

---

## 1. Projektkontext

MuGPlan ist eine webbasierte Dispositions- und Planungsanwendung.
Stack: Node.js / TypeScript, Express, Drizzle ORM, Vite/React, MySQL.

Verbindliche Leitplanken für alle Coding Agents: `agents.md` — vollständig lesen vor jedem Task.

---

## 2. Dokumentenstrategie — Kontext sparsam nutzen

**Niemals** automatisch `architecture.md` oder `implementation.md` vollständig laden.

Stattdessen gilt immer diese Eskalationsreihenfolge:

1. `docs/architecture-index.md` lesen (20 Zeilen)
2. `docs/implementation-index.md` lesen (25 Zeilen)
3. Nur die Abschnitte laden, die der Index als relevant ausweist
4. Weitere Abschnitte nur dann laden, wenn die erste gezielte Lektüre nachweislich nicht ausreicht
5. Vollständige Lektüre großer Dokumente nur dann, wenn der Auftrag ausdrücklich Architekturarbeit verlangt

**Schnellcheck vor jedem Task:**

| Situation | Dokument nötig? |
|---|---|
| Reine Frage, kein Code | Nein |
| Git-Operation ohne Codeänderung | Nein |
| Isolierter Fix in einer Datei | Nur relevante Checkliste oder direkt betroffene Abschnitte |
| Neuer Endpunkt / Schichtenänderung | Relevante Architektur- und Implementierungsabschnitte gezielt |
| Termin- / Mitarbeiter-Mutation | Relevante Fach- und Implementierungsabschnitte gezielt |
| Auth / Rollen / Sicherheit | Alle einschlägigen Auth- und Sicherheitsabschnitte gezielt |
| Neues Feature über mehrere Schichten | Index lesen, relevante Abschnitte gezielt laden, nur bei echter Notwendigkeit eskalieren |
| Unklare Zuordnung | Index lesen, dann gezielt erweitern — nicht raten |

Claude dokumentiert kurz:
- welche Abschnitte gelesen wurden,
- warum diese Auswahl genügt,
- warum keine weitere Lektüre nötig ist.

### 2.1 Notion als fachlicher Einstiegspunkt

Notion wird **nicht** zu Beginn jeder Session automatisch gelesen. Notion wird nur dann konsultiert, wenn für einen Auftrag fachliche Projektkontexte, Feature-Listen oder Statusstände benötigt werden und die lokalen Repo-Dokumente dafür nicht ausreichen.

Bevorzugter Einstiegspunkt:

- `https://www.notion.so/Meisel-Gerken-Tourenplaner-303da094354e80ba83a5f0a1659bd723`

Von dort aus ist insbesondere die Datenbank `Lastenheft` relevant. Sie enthält Feature-Dokumente mit der Eigenschaft `Status` (`geplant`, `Entfernt`, `Abgeschlossen`).

Feature-Dokumente und Use-Case-Beschreibungen sind als informative Arbeitsgrundlage zu lesen, nicht als absolute Wahrheit. Sie können veraltet oder gegenüber dem aktuellen Fachverhalten im Code anders ausgelegt sein. Abweichungen zwischen Doku und Code werden nicht automatisch als Bug behandelt — bei Unklarheiten fragt Claude nach.

Koordinationsseiten (nur bei explizitem Bedarf):

- Release 01 Aufgaben: `https://www.notion.so/Release-01-Aufgaben-326da094354e809ea174d7c13738958b`
- Test Coverage Projekt: `https://www.notion.so/Test-Coverage-Projekt-326da094354e80f59180c16c6b040229`

---

## 3. Analyse vor der Umsetzung (Pflicht, aber klein starten)

Bevor Änderungen vorgenommen werden, startet Claude die Analyse **immer klein und auftragsnah**.

Zuerst werden nur untersucht:

- direkt betroffene Dateien,
- naheliegende Einstiegspunkte,
- bestehende Muster im betroffenen Bereich,
- direkt benachbarte Funktionen, Komponenten, Controller, Services oder Repositories.

Eine breitere Analyse ist nur zulässig, wenn die enge Analyse nachweislich nicht ausreicht. Dieser Grund muss kurz dokumentiert werden.

Neue Dateien, Controller, Services, Endpoints oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind.

---

## 4. Planung

### 4.1 Branch-Frage

Claude fragt nur dann nach einem lokalen Branch von `work`, wenn der Auftrag voraussichtlich Änderungen an Produktivcode, Tests, Konfiguration oder Dokumentation erfordert (Klasse 4 oder 5).

**Keine Branch-Frage bei:** reinen Leseaufträgen, Analyse-/Audit-/Test-Reports, Git-Operationen ohne inhaltliche Änderung, reinen Rückfragen oder Erklärungen.

Wenn eine Branch-Frage erforderlich ist:

> „Soll für diesen Auftrag ein lokaler Branch von `work` abgezweigt werden?"

- Bei **ja**: Branch-Namen erfragen, Branch anlegen, Remote-Tracking einrichten und den Branch sofort pushen (`git push -u origin <branch>`). Git-Aktionen ausschließlich seriell (siehe Abschnitt 5.1).
- Bei **nein**: direkt mit der Planung fortfahren.

### 4.2 Planformat

Pläne werden als klarer, lesbarer Fließtext im Chat präsentiert — kein Code, keine Diffs, keine Codeblöcke, keine Datei.

**Für Auftragsklasse 4 (kleiner lokaler Fix)** genügt ein kompakter Plan mit drei Abschnitten:

**Was ich plane**
Kurze Beschreibung des lokalen Eingriffs, des Ansatzes und der betroffenen Stelle.

**Betroffene Funktionen, Komponenten und Dateien**
Kurze Einordnung der betroffenen Datei oder Funktion und warum genau dort geändert wird.

**Erwartetes Ergebnis in der App**
Beobachtbares Ergebnis aus Nutzersicht sowie kurz benannte Risiken, falls überhaupt relevant.

---

**Für Auftragsklasse 5 (mehrschichtige Änderung oder neues Feature)** enthält jeder Plan diese fünf Abschnitte:

**Was ich plane**
Beschreibung des geplanten Lösungswegs in zusammenhängenden Sätzen. Der Abschnitt erklärt nicht nur die Maßnahme, sondern auch den fachlichen und technischen Ansatz. Es muss erkennbar sein, warum dieser Weg gewählt wird und welche Alternativen bewusst nicht verwendet werden.

**Betroffene Funktionen, Komponenten und Dateien**
Zu jeder betroffenen Stelle: ihre aktuelle Rolle im System, was konkret geändert werden soll und warum genau diese Stelle betroffen ist. Der Nutzer muss erkennen können, ob eine Änderung lokal, bereichsbezogen oder schichtenübergreifend wirkt.

**Auswirkungen der Änderung**
Welche fachlichen, technischen und strukturellen Auswirkungen die geplanten Änderungen voraussichtlich haben: welches Verhalten sich ändert, welche Abläufe unberührt bleiben sollen, ob sich Contracts, Datenflüsse, Persistenz, Rollenlogik, UI-Verhalten oder Validierungen verändern.

**Risiken und Schadenspotential**
Bewertung der Risiken in verständlicher Sprache: Schadenspotential niedrig / mittel / hoch mit Begründung. Was im ungünstigen Fall kaputtgehen könnte, welche Bereiche besonders sensibel sind und wodurch das Risiko begrenzt wird. Bei Eingriffen in zentrale Logik, Persistenz, Rollen, Terminplanung, Aggregationen, Contracts, Kalenderlogik oder Sicherheitsmechanismen ist das Risiko grundsätzlich ausdrücklich zu thematisieren.

**Erwartetes Ergebnis in der App**
Das erwartete beobachtbare Ergebnis aus Nutzersicht: was nach der Änderung anders funktioniert, welche Fälle ausdrücklich abgedeckt sein sollen und woran der Nutzer oder Tester erkennen kann, dass die Änderung gelungen ist.

### 4.3 Planinhalt

Jeder Plan muss ausreichend Kontext enthalten, damit der Nutzer die Tragweite der Änderung beurteilen kann. Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Weitet sich der Eingriff während der Analyse oder Umsetzung aus, muss Claude diese Ausweitung vorab benennen und neu einordnen.

### 4.4 Kurzkommandos

`branch <n>`
Claude legt vor der weiteren Arbeit einen lokalen Branch von `work` mit dem angegebenen Namen an, richtet das Remote-Tracking ein und pusht den Branch sofort mit `git push -u origin <n>`. Alle Git-Schritte werden seriell ausgeführt.

`plan`
Claude klassifiziert den Auftrag gemäß Abschnitt 0, führt die Analyse gemäß Abschnitt 3 aus und erstellt danach direkt den Plan im Format aus Abschnitt 4.2, ohne die Branch-Frage erneut zu stellen.

`audit`
Claude führt den vollen Audit gemäß Abschnitt 13 als reinen Report-Auftrag aus und berichtet die Ergebnisse vollständig.

`test`
Claude führt den vollen Testlauf gemäß Abschnitt 13 als reinen Report-Auftrag aus. Während dieses Auftrags nimmt Claude keine Code-, Test-, Konfigurations- oder Dokumentationsänderungen vor.

`save`
Claude führt ausschließlich seriell `git add`, `git commit` und `git push` für alle offenen Änderungen des aktuellen Arbeitsstands aus. Falls Commit oder Push durch Konflikte, fehlende Inhalte oder andere Git-Blocker nicht sauber möglich sind, bricht Claude kontrolliert ab und dokumentiert den Grund.

`log <kurztitel>`
Claude erstellt das Auftragslog gemäß Abschnitt 15.2 unter `logs/<yyyy-mm-dd>_<kurztitel>.md` und hängt zusätzlich einen zusammenfassenden Kommentar an das Projekt-Manager-Projekt `PROJ-1` (numerische `id: 1`, dieser MugPlan-Worktree) via `add_comment_to_parent` (`parentType: "project"`, `parentId: 1`).

`docs-sync`
Claude prüft `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität im Kontext des erledigten Auftrags und aktualisiert sie bei Bedarf gezielt.

`cleanup`
Claude führt den Abschluss des aktuellen Arbeitsbranches ausschließlich seriell aus:
0. Wenn sich Claude bereits auf einem Arbeitsbranch ungleich `work` befindet und dieser noch uncommittete, auftragsbezogene Änderungen enthält, darf Claude genau diese Änderungen vor dem eigentlichen Cleanup seriell stagen, committen und nach `origin` pushen, sofern dies nur der Herstellung eines cleanup-fähigen Zustands dient.
1. Sicherstellen, dass der aktuelle Branch nicht `work` ist, keine uncommitteten Änderungen enthält und vollständig nach `origin` gepusht ist.
2. Auf `work` wechseln.
3. Sicherstellen, dass `work` keine uncommitteten Änderungen enthält und vollständig mit `origin/work` synchronisiert ist.
4. Den Arbeitsbranch in `work` mergen.
5. Das Ergebnis auf `work` prüfen.
6. `work` pushen.
7. Nur den lokalen Arbeitsbranch löschen. Der Remote-Branch wird nicht gelöscht.
8. Unzulässig: zusätzliche inhaltliche Änderungen, Refactorings oder Dokumentationsarbeiten, die nicht bereits Teil des Arbeitsbranches sind.
9. Bei uncommitteten Änderungen außerhalb des erlaubten Vorbereitungsfalls, fehlendem Push, Divergenzen, Merge-Konflikten oder anderen Blockern: kontrolliert abbrechen und den Grund dokumentieren.

---

## 5. Änderungsdisziplin

Claude arbeitet minimal-invasiv und verändert nur den Code, der zur Erfüllung des Auftrags zwingend erforderlich ist:

- Keine stillen Refactorings
- Keine kosmetischen Anpassungen
- Keine Umbenennungen, Verschiebungen oder Formatierungen „zur Verbesserung"
- Keine Änderungen an Dateien, die nicht klar zum Auftrag gehören
- Keine bestehende Funktionalität nebenbei entfernen

Erkannter Verbesserungs- oder Refactoring-Bedarf wird dokumentiert, aber nicht umgesetzt.

### 5.1 Git-Kommandos nur seriell

Git-Aktionen werden ausschließlich **seriell** ausgeführt. Kein paralleles Ausführen von `git add`, `git commit`, `git status`, `git diff`, `git push` oder ähnlichen Kommandos. Vor dem nächsten Git-Schritt ist immer das Ergebnis des vorherigen abzuwarten.

---

## 6. Architektur- und Konfigurationsgrenzen

- Trennung im Backend nach Route → Controller → Service → Repository
- Contract-First-Regel über den zentralen Contract-Index — keine API-Änderungen „frei Hand"
- Fachliche Regeln werden serverseitig implementiert, nie nur im Frontend
- React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung
- Kalenderrelevante Daten bevorzugt in der serverseitigen Kalender-Aggregation ergänzen

Ohne explizite Anweisung im Auftrag darf Claude nicht:

- Architekturentscheidungen treffen oder ändern
- Neue Patterns, Frameworks oder Infrastruktur-Änderungen einführen
- Build-, Tooling- oder Konfigurationsdateien verändern
- Abhängigkeiten hinzufügen, entfernen oder aktualisieren

Wenn eine Aufgabe ohne solche Änderungen nicht sauber lösbar ist, wird dies als Blocker dokumentiert.

---

## 7. UI-Grenzen

UI-Elemente darf Claude nur ändern oder ergänzen, wenn dies **explizit im Auftrag** enthalten ist:

- Keine UI-Komponenten verändern oder neu entwerfen
- Kein CSS anpassen oder neu anlegen
- UI-Arbeit folgt dem vorhandenen Code und den existierenden Komponenten

---

## 8. Fachliche Invarianten

- Ein Termin ist fachlich nur gültig, wenn ihm entweder ein Projekt oder direkt ein Kunde zugeordnet ist
- Blockierende Überschneidungsregel für Mitarbeiterzuweisungen ist einzuhalten
- Keine Umgehung von Rollen- und Lock-Regeln

---

## 9. Daten- und Sicherheitsregeln

- Keine Zugangsdaten, Tokens oder Secrets in Quellcode, Logs oder Dokumentation
- Für Beispiele, Tests oder Platzhalter ausschließlich synthetische, eindeutig nicht-produktive Daten verwenden
- Für alle sichtbaren und menschenlesbaren Datumsangaben ist projektweit zwingend das Kurzformat `dd.MM.yy` zu verwenden
- Das gilt ausdrücklich auch für UI-Texte, Labels, Hinweise, Tooltips, Fehlermeldungen, Kommentare im Code, Testbeschreibungen, Testkommentare, Logs, Journaltexte, Notion-Einträge, Dokumentation und sonstige menschenlesbare Ausgaben
- ISO `yyyy-MM-dd` ist ausschließlich für interne Speicherung, Datenbankwerte, API-Payloads, Query-Parameter, maschinenlesbare Werte, technische IDs, Dateinamen, Contracts, SQL, Migrationsnamen, Log-Schlüssel, Testdaten-Token und andere technisch fest vorgegebene Kontexte zulässig
- Sichtbare Datumsangaben in `yyyy-MM-dd`, `MM/DD/YYYY`, `dd/MM/yyyy`, `dd.MM.yyyy`, englischen Monatsnamen oder anderen davon abweichenden Menschenformaten gelten ausdrücklich als Fehler
- Für Frontend-Anzeigeformate sind zentrale Helfer verpflichtend zu verwenden; direkte Ad-hoc-Formatierungen sichtbarer Datumswerte sind nur zulässig, wenn der bestehende zentrale Helfer nachweislich nicht passt
- Verifikationspflicht nach Änderungen an sichtbaren Datumsangaben: gezielt nach verbotenen Formaten und unscharfen Datumsformatierern suchen, insbesondere mit `rg -n "dd\\.MM\\.yyyy|yyyy-MM-dd|MM/DD/YYYY|dd/MM/yyyy|toLocaleDateString\\(|toLocaleString\\(\"de-DE\"\\)" client server tests docs agents.md CLAUDE.md`, und verbleibende Treffer technisch gegen menschenlesbar abgrenzen
- Debug-Ausgaben mit potenziell sensiblen oder personenbezogenen Daten vermeiden

---

## 10. Encoding

- Alle Quelltexte und Doku-Dateien werden in UTF-8 gespeichert
- Keine UTF-16-Dateien in `client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/`
- In Antworten, Plänen, Logs und Dokumentation sind deutsche Umlaute und `ß` als echte Zeichen zu schreiben (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`). Umschreibungen wie `ae`, `oe`, `ue` oder `ss` sind in normaler Sprache unzulässig.
- Bei falsch dargestellten Umlauten oder Sonderzeichen: `npm run check` ausführen, gemeldete Datei in UTF-8 korrigieren, erneut `npm run check`, dann Commit.

---

## 11. Deployment & Umgebungsregeln

### Umgebungsmodi und Env-Dateien

| Modus | Env-Datei |
|---|---|
| `development` | `../../shared/.env.dev` |
| `test` | `../../shared/.env.test` |
| `production` | `../../shared/.env.prod` (via `npm start`) |

Kein Env-Datei-Fallback erlaubt. Fehlt die erwartete Env-Datei → fail fast.

### Startup-Befehle

- `npm run dev` → `cross-env NODE_ENV=development tsx server/index.ts`
- `npm test` → `cross-env NODE_ENV=test MUGPLAN_MODE=test vitest`
- `npm start` → `cross-env NODE_ENV=production node --env-file=../../shared/.env.prod dist/index.cjs`

### DB Safety Model (Pflicht)

Pflichtfelder in der jeweiligen Env-Datei: `DB_ALLOWED_DATABASES_DEV|TEST|PROD` und `DB_ALLOWED_HOSTS_DEV|TEST|PROD`.

- Globaler Startup-Guard in `server/db.ts` validiert das URL-Ziel vor `createPool()`
- URL-DB-Name und URL-Host müssen zur Allowlist passen
- Destruktive Operationen müssen zusätzlich `SELECT DATABASE()` validieren

### Migrationsstrategie (verbindlich)

- Jede strukturelle Änderung am DB-Schema erfordert eine neue versionierte Migrationsdatei unter `migrations/`
- Eine Änderung nur in `shared/schema.ts` ohne neue Migration ist unzulässig
- `drizzle-kit push` ist für reguläre Teamarbeit nicht zulässig
- Commits bei Schemaänderungen müssen immer `shared/schema.ts`, neue Migrationsdatei und `migrations/meta/*` gemeinsam enthalten
- Bereits versionierte Migrationsdateien dürfen nicht umgeschrieben werden — Korrekturen über neue Folge-Migrationen

---

## 12. Teststrategie

### Must-Pass Safety Gate (vor jeder Testausführung)

1. `.env.test` ist vorhanden und erfolgreich geladen
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`
3. Erlaubte DB-Ziele stammen ausschließlich aus Test-Env
4. DB-Connections laufen ausschließlich über zentrale Guard-APIs: `assertTestMode()`, `assertSafeWriteTargetForTestMode()`, `assertSafeDestructiveOperationTarget()`, `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungültig.

### Testebenen

**Unit** — isolierte Logik, Mocks/Stubs/Fakes, keine echte DB-Verbindung, zentrale Fixtures aus `tests/helpers/testDataFactory.ts`.

**Integration** — reale DB nur gegen Testziel, Setup/Teardown über `tests/setup.env.ts`, Factory-Einstieg zwingend über `tests/helpers/testDataFactory.ts`. Integration-Tests **müssen** mit `--reporter=verbose` ausgeführt werden:

```bash
npm run test:integration -- <testname> --reporter=verbose
```

**E2E** — vollständige Workflows, isolierte Daten, Suite-weite Resets nur guardiert.

### Timeout-Regel

Für `npm run test:integration` und `npm run test:e2e` ist standardmäßig ein langer Command-Timeout zu verwenden. `npm run test:e2e:browser` bleibt davon unberührt.

### Test-Kommandos nur seriell

Alle Test-Kommandos werden ausschließlich **seriell** ausgeführt — auch für gezielte Einzeldateien, Teilmengen, Re-Runs und lokale Fehlereingrenzung.

Unzulässig ist insbesondere:
- gleichzeitiges Starten mehrerer `vitest`-, `playwright`-, `npm run test:*`- oder vergleichbarer Testprozesse
- paralleles Ausführen von Integrationstests gegen dieselbe Testdatenbank
- paralleles Ausführen mehrerer Browserläufe mit demselben lokalen Webserver

Vor jedem weiteren Testkommando ist immer das Ergebnis des vorherigen abzuwarten und zu dokumentieren.

### Verbotene Testmuster

- Direkter Insert/Update-Sprawl in Testdateien ohne zentralen Einstieg
- Demo-/Bestandsdaten als implizite Voraussetzung
- Eigene Express-/HTTP-App-Aufbauten in Integrationstests statt `createApiTestApp()`
- Assertions auf mehrere alternative HTTP-Statuscodes für denselben fachlichen Fehler
- Schreibzugriffe in Tests außerhalb von `os.tmpdir()`
- Neue Tests dürfen bestehende weiche Muster nicht blind kopieren, ohne deren Aussagekraft gegen Restdaten-, Seed- und Reihenfolgerisiken zu prüfen

### Test-Runs dürfen nicht in eigenständigen Fixes münden

Schlägt ein Test fehl, dokumentiert Claude den Fehler und nimmt keine eigenständigen Fixes vor.

Wurde ein **voller Testlauf** oder das Kurzkommando `test` explizit angefordert, führt Claude alle in Abschnitt 13 definierten Test-Kommandos **vollständig und seriell** zu Ende, auch wenn einzelne Teilkommandos fehlschlagen. Die Fehlschläge werden gesammelt und anschließend strukturiert berichtet.

Ein explizit angeforderter Testlauf ist immer ein **reiner Report-Auftrag**. Während eines solchen Testlaufs nimmt Claude keinerlei Änderungen an Produktivcode, Tests, Konfiguration, Skripten oder Dokumentation vor.

### Allgemeine Testregeln

Jeder Test muss einen beobachtbaren Effekt prüfen. Zulässig sind nur Assertions auf Verhalten, Ergebnis, Nebenwirkung oder verweigerte Operationen.

### Verbindliche Regeln für Isolation und Aussagekraft

- Neue Integration- und Browser-Tests müssen ihre benötigte Isolation ausdrücklich deklarieren: Isolationsklasse `A`, `B`, `C` oder `S`, erwartete Baseline `core` oder `seeded` und Storage-Bedarf `none`, `uploads`, `backups` oder `both`
- Neue Tests dürfen nicht still von Restdaten in Datenbank oder Storage profitieren. Wenn Verwechslungen möglich sind, sind eindeutig identifizierbare Testdaten-Tokens Pflicht
- Seed-Daten dürfen nur genutzt werden, wenn der Test auf einer explizit `seeded`-Baseline arbeitet. Eigene Testaktionen müssen zusätzlich so geprüft werden, dass Seed-Vorbestand den Erfolg nicht vortäuschen kann
- Kritische Pfade dürfen nicht nur über Textsichtbarkeit oder bloße Existenz geprüft werden. In Listen, Tabellen, Overlays, Reports, Reopen-Flows und Aggregationen sind zusätzlich Count-, Identity-, Filter- oder Delta-Nachweise zu verlangen
- Browser- und UI-Tests dürfen nicht nur auf unscharfe Textsichtbarkeit setzen. Nach Mutationen sind Identität, Reihenfolge, Anzahl oder Ausschluss von Altbestand mitzubelegen
- Wenn Fremddaten, Seed-Vorbestand oder Canary-Daten ein False Positive auslösen könnten, ist eine Negativprüfung Pflicht. Reine Existenzprüfung reicht dann nicht aus
- Tests mit Bedarf an harter Leerheit, globalem Systemzustand, Seed-, Storage-, Dump- oder Backup-Kontext sind als Klasse `A` oder `S` zu behandeln und vor dem Lauf gegen einen passenden Fingerprint zu validieren
- Änderungen an der Teststrategie dürfen nicht allein über grüne Läufe freigegeben werden. Alt-vs-Neu-Validierung, Pollution-Canaries, Wiederholungsläufe und Reihenfolgetests sind dabei verpflichtend
- Klasse `C` und Worker-/Lauf-weite Baselines dürfen erst nach erfolgreicher Pilotvalidierung für stabile Suites genutzt werden; sie sind kein Default

Verbindliche Arbeitsgrundlage für den späteren Umbau ist `docs/TEST_ISOLATION_REBUILD_PLAN.md`

**Unit-Tests** prüfen isoliertes fachliches oder technisches Verhalten ohne Datenbank, ohne echtes Dateisystem und ohne Browser. Sie müssen sich auf beobachtbare Ergebnisse öffentlicher Funktionen stützen und dürfen keine Implementierungsdetails wie Quelltext-Strings, interne Funktionsnamen, JSX-Fragmente oder Dateiinhalte prüfen.

**Integrationstests** prüfen das Zusammenspiel realer Anwendungsteile mit Datenbank und temporärem Dateisystem. Assertions müssen sich auf beobachtbare Systemwirkungen stützen: HTTP-Responses, Datenbankzustand, erzeugte Dateien oder abgelehnte Operationen. Wenn Listen, Filter, Suchbegriffe, Aggregationen oder ähnliche Namen im Spiel sind, müssen Testdaten eindeutig markiert und Zielobjekte über ID, Token oder eine gleichwertig eindeutige Kombination nachgewiesen werden. Integrationstests dürfen nicht deshalb grün werden, weil die DB leer ist, sofern Leere nicht ausdrücklich Teil der fachlichen Regel ist.

**E2E-Tests** prüfen geschäftskritische Nutzerabläufe aus Sicht des Benutzers im Browser. Sie sollen sich an sichtbaren Aktionen und Ergebnissen orientieren: Navigation, Eingaben, Klicks, Dialoge, Meldungen, Sperren und erfolgreiche oder abgelehnte Abläufe. Listen, Hover-Previews, Sidebars, Boards und Reopen-Flows dürfen nicht nur per `toContainText(...)` oder reiner Sichtbarkeit abgesichert werden, wenn Altbestand oder ähnlich benannte Objekte plausibel sind. Browser-Tests mit Upload-, Backup-, Dump- oder Attachment-Kontext müssen einen ausdrücklich geprüften Storage-Ausgangszustand haben.

---

## 13. Begriffe: „voller Testlauf" und „voller Audit"

### Voller Testlauf umfasst mindestens

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:e2e:browser`

### Voller Audit umfasst mindestens

- `npm run check`
- `npm run lint`
- `npm run audit`
- `npm run secrets`

Nach Ausführung muss Claude explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte, welche Teile nicht ausgeführt wurden und warum. „Alles grün" ist nur zulässig, wenn alle verpflichtenden Kommandos erfolgreich abgeschlossen wurden.

---

## 14. Test-Dokumentationspflicht

### Pflicht-Kommentar in jeder Testdatei

```ts
/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - <Regel 1>
 *
 * Fehlerfälle:
 * - <Fehlerfall 1>
 *
 * Ziel:
 * <Kurzbeschreibung der Absicherung>
 */
```

### Pflege von docs/TEST_MATRIX.md

Bei jeder Erstellung oder Erweiterung von Tests pflegt Claude `docs/TEST_MATRIX.md` eigenständig und verpflichtend:

```md
| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [datei.test.ts](../tests/...) | FT14 | Unit | Kurzbeschreibung | ✓ |
```

Fehlt die Aktualisierung der Test-Matrix, gilt die Teständerung als unvollständig.

---

## 15. Abschluss-Workflow

Nach Fertigstellung eines Auftrags richtet sich der Abschluss nach der gewählten Auftragsklasse aus Abschnitt 0.

**Für Klasse 1 (reine Frage oder Leseauftrag)**
Keine Pflicht-Rückfragen zu Audit, Testlauf, Log oder Docs-Sync. Claude liefert die Antwort und führt nur die Abschlussprüfung nach 15.4 aus.

**Für Klasse 2 (Analyse-, Audit- oder Test-Report)**
Keine automatische Rückfrage zu zusätzlichem Audit oder Testlauf, wenn genau dieser Report bereits der Auftrag war. Rückfragen zu Log oder Docs-Sync nur, wenn sie für den Auftrag naheliegen oder vom Nutzer gewünscht werden.

**Für Klasse 3 (Git-Operation ohne Codeänderung)**
Keine Pflicht-Rückfragen zu Audit, Testlauf oder Docs-Sync. Ein Log wird nur auf ausdrücklichen Wunsch oder per Kurzkommando angeboten.

**Für Klasse 4 und 5 (Änderungsaufträge)**
Claude stellt die folgenden Fragen **der Reihe nach** und wartet jeweils auf Antwort:

### 15.1 Audit und Testlauf

> „Soll ich einen vollen Audit und einen vollen Testlauf ausführen?"

- Bei **ja**: Alle Kommandos aus Abschnitt 13 vollständig und seriell ausführen. Ein fehlgeschlagenes Test-Kommando unterbricht den vollen Testlauf nicht. Fehlschläge werden gesammelt und im Abschlussbericht sortiert ausgegeben nach Kritikalität (rot/fehlgeschlagen zuerst, dann gelb/Warnungen, dann grün) und Problemstellung (gleiche Fehlerursachen gruppiert). Jeder fehlgeschlagene Test wird mit Datei, Testname, Fehlertyp und Auswirkungseinschätzung aufgeführt. Der volle Testlauf ist auch hier ein reiner Report-Auftrag — keine Fixes während des Laufs.
- Bei **nein**: kein Testlauf.

### 15.2 Log schreiben

> „Soll ich ein Log für diesen Auftrag schreiben?"

- Bei **ja**: neue Markdown-Datei unter `logs/<yyyy-mm-dd>_<kurztitel>.md` mit Zweck, Scope, technischen Entscheidungen, betroffenen Dateien, Hinweisen zum Testen und bekannten Einschränkungen. Zusätzlich hängt Claude einen zusammenfassenden Kommentar an das Projekt-Manager-Projekt `PROJ-1` (numerische `id: 1`, dieser MugPlan-Worktree) via `add_comment_to_parent` (`parentType: "project"`, `parentId: 1`). Ist das Projekt-Manager-MCP nicht erreichbar oder schlägt der Kommentar fehl, bleibt die FS-Logdatei bestehen und Claude meldet den MCP-Fehler offen, statt ihn zu verschlucken.
- Bei **nein**: keine Dokumentationsdatei.

### 15.3 Architekturdokumentation aktualisieren

> „Soll ich `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität prüfen und bei Bedarf aktualisieren?"

- Bei **ja**: Claude prüft alle vier Dateien auf veraltete oder fehlende Einträge im Kontext des abgeschlossenen Auftrags und aktualisiert sie gezielt — keine vollständigen Neuschriften.
- Bei **nein**: keine Dokumentationsänderung.

### 15.4 Abschlussprüfung (immer, ohne Rückfrage)

Claude prüft das Ergebnis explizit gegen:

- den Aufgabentext einschließlich Ziel, Nicht-Ziele und Akzeptanzkriterien,
- die gelesenen Architektur- und Implementierungsvorgaben,
- die gewählte Auftragsklasse aus Abschnitt 0.

Claude nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt, alle Verbote eingehalten und die geforderte Dokumentation vollständig vorliegt. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Abbruchgrund sauber dokumentiert ist.

## 16. Zusatzregeln für Schemaänderungen

- Eine Schemaänderung gilt erst dann als umsetzungsseitig abgeschlossen, wenn die neue Migrationskette mindestens auf Dev und Test erfolgreich gelaufen ist oder ein sauber dokumentierter Blocker dies verhindert.
- Schlägt eine Migration auf Dev oder Test fehl, darf Claude den Auftrag nicht als „fertig umgesetzt“ melden. Der Zustand ist bis zur Korrektur als blockiert zu behandeln.
- Tritt in Tests, E2E oder Browser-E2E ein Fehler wie Unknown column ..., Unknown table ... oder ein anderer klarer Schema-Mismatch auf, ist dies als harter Abschluss-Blocker zu behandeln, nicht nur als gewöhnlicher Testfehler.
- Bei solchen Schema-Mismatches muss Claude im Abschluss ausdrücklich benennen, welche Umgebung nicht migrationssynchron ist und dass die Umsetzung deshalb nicht als abgeschlossen gelten darf.
- Für Schemaänderungen reicht eine reine Code-Implementierung nicht aus. Fehlt die erfolgreiche Migration mindestens auf Dev und Test oder liegt ein erkennbarer Schema-Mismatch in Test-/E2E-Umgebungen vor, darf Claude den Auftrag nur als blockiert oder teilweise umgesetzt mit eindeutig benanntem Migrationsblocker melden.
