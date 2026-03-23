# agents.md – MuGPlan

Codex ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht Codex die Umsetzung kontrolliert ab und dokumentiert den Blocker.

Diese Datei `agents.md` ist die maßgebliche Arbeitsanweisung im Repository. Verweise auf `AGENTS.md` sind in diesem Repository als Verweis auf diese Datei zu verstehen.

---

## 0. Auftragsklassifikation (Pflicht vor jedem weiteren Schritt)

Vor jeder weiteren Aktion klassifiziert Codex den Auftrag in genau eine der folgenden Klassen:

1. **Reine Frage oder Leseauftrag**
2. **Reiner Analyse-, Audit- oder Test-Report**
3. **Git-Operation ohne Codeänderung**
4. **Kleiner lokaler Fix in bestehender Struktur**
5. **Mehrschichtige Änderung oder neues Feature**

Von dieser Klassifikation hängen Branch-Frage, Dokumentenlektüre, Analyseumfang und Planungstiefe ab.

### Folgen der Klassifikation

| Klasse | Branch-Frage | Dokumentenlektüre | Analyseumfang | Planung |
|---|---|---|---|---|
| 1. Reine Frage oder Leseauftrag | Nein | Nur wenn fachlich nötig | Minimal, nur auftragsnah | Keine formale Planung |
| 2. Analyse-, Audit- oder Test-Report | Nein | Nur relevante Indizes / gezielte Abschnitte | Nur für den Report nötige Bereiche | Nur kurzer Analyseplan bei Bedarf |
| 3. Git-Operation ohne Codeänderung | Nein | Nein, außer bei fachlicher Rückfrage | Nur Git-Zustand prüfen | Keine normale Planpflicht |
| 4. Kleiner lokaler Fix | Nur wenn Änderungen tatsächlich durchgeführt werden sollen | Minimal und gezielt | Start klein und dateinah | Kleiner Plan |
| 5. Mehrschichtige Änderung oder neues Feature | Ja, sofern Änderungen durchgeführt werden sollen | Gestuft und gezielt erweitern | Breiter, aber begründet | Voller Plan |

Codex dokumentiert zu Beginn kurz:
- welche Klasse gewählt wurde,
- warum diese Klasse passt,
- welche Startschritte daraus folgen.

---

## 1. Dokumentenstrategie — Kontext sparsam nutzen

**Niemals** `docs/architecture.md` oder `docs/implementation.md` automatisch vollständig laden.

Stattdessen gilt immer diese Eskalationsreihenfolge:

1. `architecture-index.md` lesen
2. `implementation-index.md` lesen
3. Nur die Abschnitte laden, die der Index als relevant ausweist
4. Weitere Abschnitte nur dann laden, wenn die erste gezielte Lektüre nachweislich nicht ausreicht
5. Vollständige Lektüre großer Dokumente nur dann, wenn der Auftrag ausdrücklich Architekturarbeit verlangt oder ohne vollständige Lektüre nicht sicher bearbeitet werden kann

**Schnellcheck vor jedem Task:**

| Situation | Dokument nötig? |
|---|---|
| Reine Frage, kein Code | Nein |
| Git-Operation ohne Codeänderung | Nein |
| Isolierter Fix in einer Datei | Nur relevante Checkliste oder direkt betroffene Abschnitte |
| Neuer Endpunkt / Schichtenänderung | Relevante Architektur- und Implementierungsabschnitte gezielt |
| Termin- / Mitarbeiter-Mutation | Relevante Fach- und Implementierungsabschnitte gezielt |
| Auth / Rollen / Sicherheit | Alle einschlägigen Auth- und Sicherheitsabschnitte gezielt |
| Neues Feature über mehrere Schichten | Index lesen, relevante Abschnitte gezielt laden, nur bei echter Notwendigkeit weiter eskalieren |
| Unklare Zuordnung | Index lesen, dann gezielt erweitern — nicht raten |

Codex dokumentiert kurz:
- welche Abschnitte gelesen wurden,
- warum diese Auswahl genügt,
- warum keine weitere Lektüre nötig ist.

### 1.1 Notion als fachlicher Einstiegspunkt

Wenn für einen Auftrag fachliche Projektkontexte, Feature-Listen oder Statusstände benötigt werden und die lokalen Repo-Dokumente dafür nicht ausreichen, nutzt Codex als bevorzugten Einstiegspunkt zuerst diese Notion-Seite:

- `https://www.notion.so/Meisel-Gerken-Tourenplaner-303da094354e80ba83a5f0a1659bd723`

Von dort aus ist insbesondere die Datenbank `Lastenheft` relevant. Sie enthält Feature-Dokumente. Die Eigenschaft `Status` ist dabei fachlich wichtig und wird mindestens mit folgenden Werten verwendet:

- `geplant`
- `Entfernt`
- `Abgeschlossen`

Codex nutzt diesen Notion-Einstiegspunkt gezielt und nur auftragsbezogen. Die lokale Dokumentenstrategie aus Abschnitt 1 bleibt der Standard für repo-interne Arbeit; Notion ergänzt sie nur dann, wenn fachliche Einordnung oder Projektkontext aus dem Repo allein nicht sicher genug hervorgehen.

Feature-Dokumente und Use-Case-Beschreibungen sind dabei als informative Arbeitsgrundlage zu lesen, nicht als absolute Wahrheit. Sie können veraltet, unvollständig oder gegenüber dem aktuellen Fachverhalten im Code anders ausgelegt sein.

Wenn ein Auftrag direkten Bezug auf ein bestimmtes Feature oder einen Use Case hat und Doku und Code nicht eindeutig zusammenpassen, behandelt Codex diese Abweichung nicht automatisch als Bug. In solchen Fällen fragt Codex vor einer fachlichen Umdeutung oder vor riskanten Änderungen nach. Das gilt besonders dann, wenn bestehender Code fachliche Regeln sichtbar anders auslegt als die Dokumentation.

---

## 2. Analyse vor der Umsetzung (Pflicht, aber klein starten)

Bevor Änderungen vorgenommen werden, startet Codex die Analyse **immer klein und auftragsnah**.

Zuerst werden nur untersucht:

- direkt betroffene Dateien,
- naheliegende Einstiegspunkte,
- bestehende Muster im betroffenen Bereich,
- direkt benachbarte Funktionen, Komponenten, Controller, Services oder Repositories.

Ziele der Analyse:

- Bestehende Strukturen, Dateien und Muster auffinden
- Passende Einstiegspunkte identifizieren
- Parallele oder redundante Implementierungen vermeiden
- Prüfen, ob vorhandene Strukturen nutzbar sind, bevor neue angelegt werden

Eine breitere Analyse über weitere Verzeichnisse oder Schichten ist nur zulässig, wenn die enge Analyse nicht ausreicht. Dieser Grund muss kurz dokumentiert werden.

Neue Dateien, Controller, Services, Endpoints oder Strukturen werden nur angelegt, wenn der Auftrag dies explizit verlangt oder bestehende Strukturen nachweislich ungeeignet sind. Dieser Nachweis muss dokumentiert werden.

---

## 3. Planung

### 3.1 Branch-Frage (nur wenn tatsächlich Änderungen durchgeführt werden sollen)

Codex fragt nur dann nach einem lokalen Branch von `work`, wenn der Auftrag voraussichtlich Änderungen an Produktivcode, Tests, Konfiguration oder Dokumentation erfordert.

**Keine Branch-Frage bei:**

- reinen Leseaufträgen,
- Analyse-, Audit- oder Test-Reports,
- Git-Operationen ohne inhaltliche Änderung,
- reinen Rückfragen oder Erklärungen.

Wenn eine Branch-Frage erforderlich ist und der Nutzer kein passendes Kurzkommando verwendet hat, fragt Codex:

> „Soll für diesen Auftrag ein lokaler Branch von `work` abgezweigt werden?"

- Bei **ja**: Branch-Namen erfragen, Branch anlegen, Remote-Tracking einrichten und den Branch sofort pushen (`git push -u origin <branch>`).
- Bei **nein**: direkt mit der Planung fortfahren.

Git-Aktionen dabei ausschließlich **seriell** ausführen (siehe Abschnitt 4.1).

### 3.2 Planformat

Pläne werden als klarer, lesbarer Fließtext im Chat präsentiert. Kein Code, keine Diffs, keine Codeblöcke, keine Datei.

Für Auftragsklasse 4 (**kleiner lokaler Fix**) genügt ein kompakter Plan mit drei Abschnitten:

**Was ich plane**  
Kurze Beschreibung des lokalen Eingriffs, des Ansatzes und der betroffenen Stelle.

**Betroffene Funktionen, Komponenten und Dateien**  
Kurze Einordnung der betroffenen Datei oder Funktion und warum genau dort geändert wird.

**Erwartetes Ergebnis in der App**  
Beobachtbares Ergebnis aus Nutzersicht sowie kurz benannte Risiken, falls überhaupt relevant.

Für Auftragsklasse 5 (**mehrschichtige Änderung oder neues Feature**) enthält jeder Plan diese fünf Abschnitte:

**Was ich plane**  
Codex beschreibt den geplanten Lösungsweg in zusammenhängenden Sätzen. Der Abschnitt erklärt nicht nur die Maßnahme, sondern auch den fachlichen und technischen Ansatz. Es muss erkennbar sein, warum dieser Weg gewählt wird und welche Alternativen bewusst nicht verwendet werden.

**Betroffene Funktionen, Komponenten und Dateien**  
Codex nennt nicht nur die betroffenen Dateien oder Module, sondern erläutert zu jeder betroffenen Stelle ihre aktuelle Rolle im System. Zusätzlich beschreibt Codex, was dort konkret geändert werden soll und warum genau diese Stelle betroffen ist. Der Nutzer muss erkennen können, ob eine Änderung lokal, bereichsbezogen oder schichtenübergreifend wirkt.

**Auswirkungen der Änderung**  
Codex beschreibt ausdrücklich, welche fachlichen, technischen und strukturellen Auswirkungen die geplanten Änderungen voraussichtlich haben. Dazu gehört insbesondere, welches Verhalten sich in der App ändert, welche bestehenden Abläufe unberührt bleiben sollen, welche angrenzenden Funktionen mittelbar betroffen sein könnten und ob sich Contracts, Datenflüsse, Persistenz, Rollenlogik, UI-Verhalten oder Validierungen verändern.

**Risiken und Schadenspotential**  
Codex bewertet die Risiken der geplanten Änderung in verständlicher Sprache. Dabei ist zu benennen, ob das Schadenspotential niedrig, mittel oder hoch ist. Diese Einschätzung muss begründet werden. Es ist klar zu beschreiben, was im ungünstigen Fall kaputtgehen könnte, welche Bereiche besonders sensibel sind und wodurch das Risiko begrenzt werden soll. Bei Eingriffen in zentrale Logik, Persistenz, Rollen, Terminplanung, Aggregationen, Contracts, Kalenderlogik oder Sicherheitsmechanismen ist das Risiko grundsätzlich ausdrücklich zu thematisieren.

**Erwartetes Ergebnis in der App**  
Codex beschreibt das erwartete beobachtbare Ergebnis aus Nutzersicht. Es muss erkennbar sein, was nach der Änderung anders funktioniert, welche Fälle ausdrücklich abgedeckt sein sollen und woran der Nutzer oder Tester erkennen kann, dass die Änderung gelungen ist.

### 3.3 Planinhalt

Der Plan muss ausreichend Kontext enthalten, damit der Nutzer die Tragweite der Änderung beurteilen kann. Es genügt nicht, nur betroffene Dateien oder Funktionen aufzuzählen.

Für Auftragsklasse 5 muss der Plan deshalb immer erkennen lassen:

- welche Stellen geändert werden,
- was an diesen Stellen konkret geschieht,
- warum diese Änderung dort vorgenommen wird,
- welche unmittelbaren und mittelbaren Auswirkungen zu erwarten sind,
- welche Bereiche bewusst unverändert bleiben sollen,
- wie hoch das Schadenspotential ist, falls die Änderung fehlerhaft umgesetzt wird.

Codex muss den Eingriff so beschreiben, dass der Nutzer zwischen lokalem Fix, bereichsbezogener Änderung und schichtenübergreifendem Eingriff unterscheiden kann.

Für Auftragsklasse 4 reicht eine knappe, aber nachvollziehbare Einordnung. In diesem Fall muss der Plan nicht dieselbe Detailtiefe wie bei mehrschichtigen Änderungen erreichen.

Jeder Planschritt muss einen stabilen, nachvollziehbaren Zwischenstand hinterlassen. Risiken, Seiteneffekte und Unsicherheiten werden nicht verkürzt oder beschönigt, sondern ausdrücklich benannt. Wenn ein Schritt potentiell kritische Bereiche berührt, muss Codex das vor der Umsetzung klar sagen.

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Weitet sich der Eingriff während der Analyse oder Umsetzung aus, muss Codex diese Ausweitung vorab benennen und neu einordnen.

### 3.4 Kurzkommandos

Zur Reduktion von Dialog- und Kontextverbrauch darf der Nutzer kurze Kommandos verwenden. Codex übersetzt diese Kommandos in die zugehörigen Handlungen. Fehlt ein Kommando, gilt das normale Verhalten aus den übrigen Abschnitten.

### Zulässige Kurzkommandos

`branch <name>`  
Codex legt vor der weiteren Arbeit einen lokalen Branch von `work` mit dem angegebenen Namen an, richtet das Remote-Tracking ein und pusht den Branch sofort mit `git push -u origin <name>`. Alle Git-Schritte werden seriell ausgeführt.

`plan`  
Codex klassifiziert den Auftrag gemäß Abschnitt 0, führt die Analyse gemäß Abschnitt 2 aus und erstellt danach direkt den Plan im Format aus Abschnitt 3.2 und 3.3, ohne die Branch-Frage erneut zu stellen.

`audit`  
Codex führt den vollen Audit gemäß Abschnitt 12 als reinen Report-Auftrag aus und berichtet die Ergebnisse vollständig nach den dort definierten Regeln.

`test`  
Codex führt den vollen Testlauf gemäß Abschnitt 12 als reinen Report-Auftrag aus und beachtet dabei zusätzlich alle Regeln aus Abschnitt 11. Während dieses Auftrags nimmt Codex keine Code-, Test-, Konfigurations- oder Dokumentationsänderungen vor.

`log <kurztitel>`  
Codex erstellt das Auftragslog gemäß Abschnitt 14.2 unter `logs/<yyyy-mm-dd>_<kurztitel>.md`.

`docs-sync`  
Codex prüft `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität im Kontext des erledigten Auftrags und aktualisiert sie bei Bedarf gezielt.

`cleanup`  
Codex führt den Abschluss des aktuellen Arbeitsbranches ausschließlich seriell aus:
0. Wenn sich Codex bereits auf einem Arbeitsbranch ungleich `work` befindet und dieser noch uncommittete, auftragsbezogene Änderungen enthält, darf Codex genau diese Änderungen vor dem eigentlichen Cleanup seriell `stage`n, committen und nach `origin` pushen, sofern dies nur der Herstellung eines cleanup-fähigen Zustands dient.
1. Codex stellt sicher, dass der aktuelle Branch nicht `work` ist, keine uncommitteten Änderungen enthält und vollständig nach `origin` gepusht ist.
2. Codex wechselt auf `work`.
3. Codex stellt sicher, dass `work` keine uncommitteten Änderungen enthält und vollständig mit `origin/work` synchronisiert ist.
4. Codex merged den Arbeitsbranch in `work`.
5. Codex prüft das Ergebnis auf `work`.
6. Codex pusht `work`.
7. Codex löscht danach nur den lokalen Arbeitsbranch. Der Remote-Branch wird nicht gelöscht.
8. Unzulässig bleiben dabei zusätzliche inhaltliche Änderungen, Refactorings oder Dokumentationsarbeiten, die nicht bereits Teil des Arbeitsbranches sind; erlaubt ist nur die Sicherung des vorhandenen Branch-Zustands für den Cleanup.
9. Bei uncommitteten Änderungen außerhalb dieses erlaubten Vorbereitungsfalls, fehlendem Push, Divergenzen, Merge-Konflikten oder anderen Blockern bricht Codex kontrolliert ab und dokumentiert den Grund.

---

## 4. Änderungsdisziplin

Codex arbeitet minimal-invasiv. Er verändert nur den Code, der zur Erfüllung des Auftrags zwingend erforderlich ist:

- Keine stillen Refactorings
- Keine kosmetischen Anpassungen
- Keine Umbenennungen, Verschiebungen oder Formatierungen „zur Verbesserung"
- Keine Änderungen an Dateien, die nicht klar zum Auftrag gehören
- Keine bestehende Funktionalität nebenbei entfernen

Erkannter Verbesserungs- oder Refactoring-Bedarf wird dokumentiert, aber nicht umgesetzt.

### 4.1 Git-Kommandos nur seriell

Git-Aktionen werden ausschließlich **seriell** ausgeführt. Kein paralleles Ausführen von `git add`, `git commit`, `git status`, `git diff`, `git push` oder ähnlichen Kommandos. Vor dem nächsten Git-Schritt ist immer das Ergebnis des vorherigen abzuwarten.

---

## 5. Architektur- und Konfigurationsgrenzen

- Trennung im Backend nach Route → Controller → Service → Repository
- Contract-First-Regel über den zentralen Contract-Index — keine API-Änderungen „frei Hand"
- Fachliche Regeln werden serverseitig implementiert, nie nur im Frontend
- React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung
- Kalenderrelevante Daten bevorzugt in der serverseitigen Kalender-Aggregation ergänzen

Ohne explizite Anweisung im Auftrag darf Codex nicht:

- Architekturentscheidungen treffen oder ändern
- Neue Patterns, Frameworks oder Infrastruktur-Änderungen einführen
- Build-, Tooling- oder Konfigurationsdateien verändern
- Abhängigkeiten hinzufügen, entfernen oder aktualisieren

Wenn eine Aufgabe ohne solche Änderungen nicht sauber lösbar ist, wird dies als Blocker dokumentiert.

---

## 6. UI-Grenzen

UI-Elemente darf Codex nur ändern oder ergänzen, wenn dies **explizit im Auftrag** enthalten ist:

- Keine UI-Komponenten verändern oder neu entwerfen
- Kein CSS anpassen oder neu anlegen
- UI-Arbeit folgt dem vorhandenen Code und den existierenden Komponenten

---

## 7. Fachliche Invarianten

- Ein Termin ist fachlich nur gültig, wenn ihm entweder ein Projekt oder direkt ein Kunde zugeordnet ist
- Blockierende Überschneidungsregel für Mitarbeiterzuweisungen ist einzuhalten
- Keine Umgehung von Rollen- und Lock-Regeln

---

## 8. Daten- und Sicherheitsregeln

- Keine Zugangsdaten, Tokens oder Secrets in Quellcode, Logs oder Dokumentation
- Für Beispiele, Tests oder Platzhalter ausschließlich synthetische, eindeutig nicht-produktive Daten verwenden
- Debug-Ausgaben mit potenziell sensiblen oder personenbezogenen Daten vermeiden

---

## 9. Encoding

- Alle Quelltexte und Doku-Dateien werden in UTF-8 gespeichert
- Keine UTF-16-Dateien in `client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/`
- In Antworten, Plänen, Logs und Dokumentation sind deutsche Umlaute und `ß` als echte Zeichen zu schreiben (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`). Umschreibungen wie `ae`, `oe`, `ue` oder `ss` sind in normaler Sprache unzulässig, sofern sie nicht technisch zwingend durch bestehende Dateinamen, APIs, Fremdsysteme oder Code-Bezeichner vorgegeben sind.
- Bei falsch dargestellten Umlauten oder Sonderzeichen: `npm run check` ausführen, gemeldete Datei in UTF-8 korrigieren, erneut `npm run check`, dann Commit

---

## 10. Deployment & Umgebungsregeln

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

## 11. Teststrategie

### Must-Pass Safety Gate (vor jeder Testausführung)

1. `.env.test` ist vorhanden und erfolgreich geladen
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`
3. Erlaubte DB-Ziele stammen ausschließlich aus Test-Env
4. DB-Connections laufen ausschließlich über zentrale Guard-APIs: `assertTestMode()`, `assertSafeWriteTargetForTestMode()`, `assertSafeDestructiveOperationTarget()`, `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungültig.

### Testebenen

**Unit** — isolierte Logik, Mocks/Stubs/Fakes, keine echte DB-Verbindung, zentrale Fixtures aus `tests/helpers/testDataFactory.ts`.

**Integration** — reale DB nur gegen Testziel, Setup/Teardown über `tests/setup.env.ts`, Factory-Einstieg zwingend über `tests/helpers/testDataFactory.ts`. Integration-Tests **müssen** mit `--reporter=verbose` ausgeführt werden.

**E2E** — vollständige Workflows, isolierte Daten, Suite-weite Resets nur guardiert.

### Timeout-Regel

Für `npm run test:integration` und `npm run test:e2e` ist standardmäßig ein langer Command-Timeout zu verwenden. `npm run test:e2e:browser` bleibt davon unberührt.

### Test-Kommandos nur seriell

Alle Test-Kommandos werden ausschließlich **seriell** ausgeführt. Das gilt nicht nur für den vollen Testlauf, sondern auch für gezielte Einzeldateien, Teilmengen, Re-Runs und lokale Fehlereingrenzung.

Unzulässig ist insbesondere:

- gleichzeitiges Starten mehrerer `vitest`-, `playwright`-, `npm run test:*`- oder vergleichbarer Testprozesse
- paralleles Ausführen von Integrationstests gegen dieselbe Testdatenbank
- paralleles Ausführen mehrerer Browserläufe, wenn sie denselben lokalen Webserver, dieselbe Testumgebung oder denselben Reset-/Fixture-Kontext verwenden

Vor jedem weiteren Testkommando ist immer das Ergebnis des vorherigen Testkommandos abzuwarten und zu dokumentieren.

### Verbotene Testmuster

- Direkter Insert/Update-Sprawl in Testdateien ohne zentralen Einstieg
- Demo-/Bestandsdaten als implizite Voraussetzung
- Eigene Express-/HTTP-App-Aufbauten in Integrationstests statt `createApiTestApp()`
- Assertions auf mehrere alternative HTTP-Statuscodes für denselben fachlichen Fehler
- Schreibzugriffe in Tests außerhalb von `os.tmpdir()`

### Test-Runs dürfen nicht in eigenständigen Fixes münden

Schlägt ein Test fehl, dokumentiert Codex den Fehler und nimmt keine eigenständigen Fixes vor.

Wurde jedoch ein **voller Testlauf** oder das Kurzkommando `test` explizit angefordert, führt Codex alle in Abschnitt 12 definierten Test-Kommandos **vollständig und seriell** zu Ende, auch wenn einzelne Teilkommandos fehlschlagen. Die Fehlschläge werden gesammelt und anschließend strukturiert berichtet.

Ein explizit angeforderter Testlauf ist immer ein **reiner Report-Auftrag**. Während eines solchen Testlaufs nimmt Codex keinerlei Änderungen an Produktivcode, Tests, Konfiguration, Skripten oder Dokumentation vor. Auch triviale oder offensichtliche Test-Fixes sind in diesem Modus unzulässig. Änderungen sind erst nach einem separaten Folgeauftrag zur Behebung erlaubt.

### Allgemeine Regel

Jeder Test muss einen beobachtbaren Effekt prüfen. Zulässig sind nur Assertions auf Verhalten, Ergebnis, Nebenwirkung oder verweigerte Operationen. Nicht zulässig sind Tests, die nur das Vorhandensein von Quelltext, Namen, Markup-Fragmenten oder anderen Implementierungsdetails bestätigen, ohne das tatsächliche Systemverhalten nachzuweisen.

### Leitplanken für Unit-Tests

Unit-Tests prüfen isoliertes fachliches oder technisches Verhalten ohne Datenbank, ohne echtes Dateisystem und ohne Browser. Sie müssen sich auf beobachtbare Ergebnisse öffentlicher Funktionen, Komponenten oder Schnittstellen stützen und dürfen keine Implementierungsdetails wie Quelltext-Strings, interne Funktionsnamen, JSX-Fragmente oder Dateiinhalte prüfen. Ein Unit-Test ist nur dann sinnvoll, wenn seine Assertion zeigt, was das System bei einem Input tatsächlich zurückgibt, verändert, anzeigt oder verweigert.

### Leitplanken für Integrationstests

Integrationstests prüfen das Zusammenspiel realer Anwendungsteile mit Datenbank und temporärem Dateisystem. Sie sollen echte Persistenz, API-Verhalten, Validierung, Rollenrechte, Nebenwirkungen und Fehlerszenarien absichern. Assertions müssen sich auf beobachtbare Systemwirkungen stützen, zum Beispiel HTTP-Responses, Datenbankzustand, erzeugte Dateien oder abgelehnte Operationen. Integrationstests dürfen keine bloßen Verdrahtungsannahmen oder interne Implementierungsdetails absichern, sondern müssen zeigen, dass die fachliche Regel im realen Lauf korrekt durchgesetzt wird.

### Leitplanken für E2E-Browser-Tests

E2E-Tests prüfen geschäftskritische Nutzerabläufe aus Sicht des Benutzers im Browser. Sie sollen sich an sichtbaren Aktionen und Ergebnissen orientieren, also an Navigation, Eingaben, Klicks, Dialogen, Meldungen, Sperren und erfolgreichen oder abgelehnten Abläufen. E2E-Tests dürfen nicht die interne Struktur der Oberfläche absichern, sondern nur das tatsächlich beobachtbare Verhalten der Anwendung. Sie sollen gezielt die wichtigsten End-to-End-Flows abdecken und nicht Aufgaben übernehmen, die bereits durch Unit- oder Integrationstests schneller und stabiler geprüft werden können.

---

## 12. Begriffe: „voller Testlauf" und „voller Audit"

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

Nach Ausführung muss Codex explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte, welche Teile nicht ausgeführt wurden und warum. „Alles grün" ist nur zulässig, wenn alle verpflichtenden Kommandos erfolgreich abgeschlossen wurden.

---

## 13. Test-Dokumentationspflicht

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

Bei jeder Erstellung oder Erweiterung von Tests pflegt Codex `docs/TEST_MATRIX.md` eigenständig und verpflichtend:

```md
| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [datei.test.ts](../tests/...) | FT14 | Unit | Kurzbeschreibung | ✓ |
```

Fehlt die Aktualisierung der Test-Matrix, gilt die Teständerung als unvollständig.

---

## 14. Abschluss-Workflow

Nach Fertigstellung eines Auftrags richtet sich der Abschluss nach der gewählten Auftragsklasse aus Abschnitt 0.

**Für Klasse 1 (reine Frage oder Leseauftrag)**  
Keine Pflicht-Rückfragen zu Audit, Testlauf, Log oder Docs-Sync. Codex liefert die Antwort und führt nur die Abschlussprüfung nach 14.4 aus.

**Für Klasse 2 (Analyse-, Audit- oder Test-Report)**  
Keine automatische Rückfrage zu zusätzlichem Audit oder Testlauf, wenn genau dieser Report bereits der Auftrag war. Rückfragen zu Log oder Docs-Sync nur, wenn sie für den Auftrag naheliegen oder vom Nutzer gewünscht werden.

**Für Klasse 3 (Git-Operation ohne Codeänderung)**  
Keine Pflicht-Rückfragen zu Audit, Testlauf oder Docs-Sync. Ein Log wird nur auf ausdrücklichen Wunsch oder per Kurzkommando angeboten.

**Für Klasse 4 und 5 (Änderungsaufträge)**  
Codex stellt die folgenden Fragen **der Reihe nach** und wartet jeweils auf Antwort:

### 14.1 Audit und Testlauf

> „Soll ich einen vollen Audit und einen vollen Testlauf ausführen?"

- Bei **ja**: Alle Kommandos aus Abschnitt 12 vollständig ausführen.
- Ein fehlgeschlagenes Test-Kommando unterbricht den vollen Testlauf nicht. Codex führt alle weiteren verpflichtenden Test-Kommandos seriell aus und berichtet die Fehlschläge gesammelt im Abschlussbericht.
- Der volle Testlauf ist auch hier ein reiner Report-Auftrag. Währenddessen werden keine Fixes und keine sonstigen Änderungen vorgenommen.
- Test-Report danach sortiert ausgeben nach:
  1. **Kritikalität** (rot/fehlgeschlagen zuerst, dann gelb/Warnungen, dann grün)
  2. **Problemstellung** (gleiche Fehlerursachen gruppiert)
- Jeder fehlgeschlagene Test wird mit Datei, Testname, Fehlertyp und einer Einschätzung der Auswirkung aufgeführt.
- Bei **nein**: kein Testlauf.

### 14.2 Log schreiben

> „Soll ich ein Log für diesen Auftrag schreiben?"

- Bei **ja**: neue Markdown-Datei unter `logs/<yyyy-mm-dd>_<kurztitel>.md` mit Zweck, Scope, technischen Entscheidungen, betroffenen Dateien, Hinweisen zum Testen und bekannten Einschränkungen.
- Bei **nein**: keine Dokumentationsdatei.

### 14.3 Architekturdokumentation aktualisieren

> „Soll ich `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität prüfen und bei Bedarf aktualisieren?"

- Bei **ja**: Codex prüft alle vier Dateien auf veraltete oder fehlende Einträge im Kontext des abgeschlossenen Auftrags und aktualisiert sie gezielt — keine vollständigen Neuschriften.
- Bei **nein**: keine Dokumentationsänderung.

### 14.4 Abschlussprüfung (immer, ohne Rückfrage)

Codex prüft das Ergebnis explizit gegen:

- den Aufgabentext einschließlich Ziel, Nicht-Ziele und Akzeptanzkriterien,
- die gelesenen Architektur- und Implementierungsvorgaben,
- die gewählte Auftragsklasse aus Abschnitt 0.

Codex nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt, alle Verbote eingehalten und die geforderte Dokumentation vollständig vorliegt. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Abbruchgrund sauber dokumentiert ist.
