# agents.md – MuGPlan

Der Agent ist ein **ausführendes Werkzeug**. Er trifft keine eigenständigen Architektur-, Produkt- oder Scope-Entscheidungen. Bei Unklarheiten, Widersprüchen oder nicht eindeutig umsetzbaren Anforderungen bricht der Agent die Umsetzung kontrolliert ab und dokumentiert den Blocker.

Diese Datei `agents.md` ist die maßgebliche Arbeitsanweisung im Repository. Verweise auf `AGENTS.md` sind in diesem Repository als Verweis auf diese Datei zu verstehen.

---

## Grundhaltung für Code-Aufgaben

Diese Grundhaltung gilt für jeden Auftrag, der Code oder Konfiguration ändert. Sie gewichtet **Sorgfalt über Geschwindigkeit** und ergänzt die folgenden Abschnitte, ohne sie zu ersetzen. **Bei Widerspruch gilt die speziellere oder strengere Projektregel.** Der Umfang richtet sich nach der Auftragsklasse aus §0: Triviale Aufträge (Klasse 1 und 3) brauchen keinen Reflexions-Overhead — hier gilt Augenmaß.

### Erst denken, dann ändern

- Annahmen explizit benennen. Bei echter Unsicherheit nachfragen statt still zu raten.
- Sind mehrere Interpretationen plausibel, **alle benennen** — nicht stillschweigend eine wählen.
- Existiert ein einfacherer Weg, ihn nennen und begründet widersprechen.
- Diese Klärung gehört **vor** die Umsetzung (Analyse und Planung, vgl. §2 und §3). Sie hebelt §4.5 nicht aus: Ein Teilblocker **während** der laufenden Umsetzung unterbricht den Auftrag nicht — er wird dokumentiert, der nächste Schritt beginnt.

### Einfachheit zuerst

- Minimaler Code, der den Auftrag löst — nichts Spekulatives.
- Keine Features über das Gefragte hinaus, keine Abstraktion für Einmal-Code.
- Keine „Flexibilität" oder „Konfigurierbarkeit", die niemand verlangt hat; kein Error-Handling für unmögliche Szenarien.
- Selbsttest: Würde ein erfahrener Entwickler das als überkompliziert bezeichnen? Wenn ja — vereinfachen. Entstehen 200 Zeilen, wo 50 genügen, neu schreiben.

### Chirurgische Änderungen

- Nur anfassen, was der Auftrag verlangt — jede geänderte Zeile muss sich auf den Auftrag zurückführen lassen.
- Benachbarten Code, Kommentare oder Formatierung nicht „verbessern"; nichts refactoren, das nicht kaputt ist.
- Bestehenden Stil im berührten Code übernehmen, auch wenn man es selbst anders machen würde.
- Verwaiste Imports, Variablen oder Funktionen entfernen, die **erst durch die eigene Änderung** ungenutzt wurden. Schon vorher vorhandenen toten Code nicht löschen, sondern als Beobachtung **melden** — Löschung nur auf Auftrag. Detail-Gate: Skill `code-discipline`.

### Zielgetrieben ausführen

- Auftrag vorab in überprüfbare Erfolgskriterien übersetzen: „Validierung hinzufügen" → Tests für ungültige Eingaben, dann grün; „Bug fixen" → Test, der ihn reproduziert, dann grün; „X refactoren" → Tests vorher und nachher grün.
- Starke Erfolgskriterien erlauben eigenständiges Iterieren bis zur Verifikation; schwache Kriterien erzwingen ständiges Nachfragen.

---

## 0. Auftragsklassifikation (Pflicht vor jedem weiteren Schritt)

Vor jeder weiteren Aktion klassifiziert der Agent den Auftrag in genau eine der folgenden Klassen:

1. **Reine Frage oder Leseauftrag**
2. **Reiner Analyse-, Audit- oder Test-Report**
3. **Git-Operation ohne Codeänderung**
4. **Kleiner lokaler Fix in bestehender Struktur**
5. **Mehrschichtige Änderung oder neues Feature**

Von dieser Klassifikation hängen Branch-Nutzung, Dokumentenlektüre, Analyseumfang und Planungstiefe ab.

### Folgen der Klassifikation

| Klasse | Branch-Nutzung | Dokumentenlektüre | Analyseumfang | Planung |
|---|---|---|---|---|
| 1. Reine Frage oder Leseauftrag | Nein | Nur wenn fachlich nötig | Minimal, nur auftragsnah | Keine formale Planung |
| 2. Analyse-, Audit- oder Test-Report | Nein | Nur relevante Indizes / gezielte Abschnitte | Nur für den Report nötige Bereiche | Nur kurzer Analyseplan bei Bedarf |
| 3. Git-Operation ohne Codeänderung | Nein | Nein, außer bei fachlicher Rückfrage | Nur Git-Zustand prüfen | Keine normale Planpflicht |
| 4. Kleiner lokaler Fix | Nur bei explizitem Nutzerwunsch oder Kurzkommando | Minimal und gezielt | Start klein und dateinah | Kleiner Plan |
| 5. Mehrschichtige Änderung oder neues Feature | Nur bei explizitem Nutzerwunsch oder Kurzkommando | Gestuft und gezielt erweitern | Breiter, aber begründet | Voller Plan |

Der Agent dokumentiert zu Beginn kurz:
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

Der Agent dokumentiert kurz:
- welche Abschnitte gelesen wurden,
- warum diese Auswahl genügt,
- warum keine weitere Lektüre nötig ist.

### 1.1 Projekt-Manager-MCP als fachlicher Einstiegspunkt

Wenn für einen Auftrag fachliche Projektkontexte, Feature-Listen, Ticketinhalte oder Statusstände benötigt werden und die lokalen Repo-Dokumente dafür nicht ausreichen, nutzt der Agent gezielt den Projekt-Manager-MCP. Für Kurzreferenzen wie `TKT-*`, `TASK-*`, `FEAT-*`, `UC-*` oder `PROJ-*` löst der Agent zuerst die Referenz über den Projekt-Manager-MCP auf und liest danach nur die für den Auftrag nötigen Kontextdaten.

Die lokale Dokumentenstrategie aus Abschnitt 1 bleibt der Standard für repo-interne Arbeit. Der Projekt-Manager-MCP ergänzt sie nur dann, wenn fachliche Einordnung, Ticketinhalt oder Projektkontext aus dem Repo allein nicht sicher genug hervorgehen.

Notion-Seiten, Notion-Datenbanken und Notion-Suche dürfen in diesem Repository nicht verwendet werden, außer der Nutzer erlaubt dies für einen konkreten Auftrag ausdrücklich neu.

Feature-Dokumente, Use-Case-Beschreibungen, Tickets und Projektmanagement-Einträge sind als informative Arbeitsgrundlage zu lesen, nicht als absolute Wahrheit. Sie können veraltet, unvollständig oder gegenüber dem aktuellen Fachverhalten im Code anders ausgelegt sein.

Wenn ein Auftrag direkten Bezug auf ein bestimmtes Feature, einen Use Case oder ein Ticket hat und Doku, Projekt-Manager-MCP-Kontext und Code nicht eindeutig zusammenpassen, behandelt der Agent diese Abweichung nicht automatisch als Bug. In solchen Fällen fragt der Agent vor einer fachlichen Umdeutung oder vor riskanten Änderungen nach.

---

### 1.2 Projektlokale Skills

Projektlokale Skills liegen im Repository unter `.claude/skills/`. Wenn ein Auftrag erkennbar zu einem dort vorhandenen Skill passt, liest der Agent zuerst dessen `SKILL.md` und folgt den dort beschriebenen Leitplanken auftragsbezogen.

Die Skills ergänzen diese Arbeitsanweisung nur. Bei Widersprüchen gilt immer `agents.md`; der Widerspruch wird kurz dokumentiert.

Aktuell projektlokal verfügbar:

- `architektur` — Architektur- und Design-Analyse
- `datenmodell` — Schema-Analyse und Datenmodell-Aufträge
- `exploration` — Code-Exploration und Impact-Analyse
- `testing` — Test-Strategie und Testplanung
- `documentation` — Anwenderdokumentation via Projekt-Manager-MCP und Wiki
- `specification` — Feature- und Use-Case-Spezifikation
- `code-discipline` — Disziplin-Gate vor Implementierungsaufträgen
- `planungsleitplanken` — Planungs-Gate (Pflicht vor jeder Planung)
- `mcp-code-auftrag` — Orchestrierung von Aufträgen aus dem Projekt-Manager
- `test-entwurfsleitplanken` — Test-Entwurfs-Gate (Pflicht bei Tests)
- `test-quality-review` — Testbestandsanalyse und Qualitätsbericht
- `feature-editorial` — Redaktionelle Aufbereitung von Features

---

## 2. Analyse vor der Umsetzung (Pflicht, aber klein starten)

Bevor Änderungen vorgenommen werden, startet der Agent die Analyse **immer klein und auftragsnah**.

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

### 7.1 Rollen, Berechtigungen und Sichtbarkeitsgrenzen (harte Pflicht)

Rollenlogik, Berechtigungen und Sichtbarkeitsgrenzen sind vor jeder Änderung als eigenständiger Prüfpunkt zu behandeln. Der Agent darf niemals stillschweigend davon ausgehen, dass bestehende UI-, Service- oder API-Strukturen bereits automatisch korrekt rollenbeschränkt sind.

Für jede Änderung mit möglichem Einfluss auf Sichtbarkeit, Bedienbarkeit, Mutationen, Endpunkte, Aktionen, Listen, Formulare, Navigation, Buttons, Dialoge, Tabs, Reports, Bulk-Aktionen, Statuswechsel, Freigaben, Exporte, Importe oder Hintergrundprozesse gilt:

1. Der Agent prüft ausdrücklich, welche Rollen den betroffenen Vorgang sehen dürfen.
2. Der Agent prüft ausdrücklich, welche Rollen den betroffenen Vorgang ausführen dürfen.
3. Der Agent prüft ausdrücklich, wo diese Berechtigung heute technisch durchgesetzt wird:
   - nur in der UI,
   - im Frontend und Backend,
   - oder ausschließlich serverseitig.
4. Der Agent behandelt eine reine UI-Ausblendung niemals als ausreichende Berechtigungsdurchsetzung.
5. Der Agent darf keine bestehende Rollenbeschränkung aufweichen, umgehen, verschieben oder unbeabsichtigt erweitern.
6. Der Agent darf keine neue Aktion, kein neues UI-Element und keinen neuen Endpunkt einführen, ohne die zulässigen Rollen ausdrücklich zu benennen.
7. Der Agent muss bei jeder Änderung prüfen, ob neben Sichtbarkeit auch direkte Aufrufe, Deep Links, API-Calls, Nebenpfade und bereits geöffnete Ansichten sauber abgesichert sind.
8. Der Agent muss bei Mutationen und sicherheitsrelevanten Lesezugriffen grundsätzlich von serverseitiger Durchsetzung ausgehen. Fehlt diese Absicherung, ist dies als Sicherheitslücke oder Blocker zu behandeln, nicht als optionale Verbesserung.
9. Der Agent darf vorhandenen Code niemals so interpretieren, dass „wahrscheinlich schon die richtige Rolle gemeint ist”. Wenn Rollenwirkung, Zielrolle oder gewünschte Einschränkung nicht eindeutig belegt ist, muss der Agent vor der Umsetzung nachfragen.
10. Unklarheiten zu Rollen, Rechten, Ausnahmen oder Sonderfällen sind kein Anlass für Annahmen, sondern ein Pflicht-Blocker mit Rückfrage.

Verbindliche Arbeitsregel:
Vor jeder Umsetzung mit Rollenbezug dokumentiert der Agent kurz und ausdrücklich:
- betroffene Rolle oder Rollen,
- erlaubte Sichtbarkeit,
- erlaubte Aktionen,
- technische Durchsetzung der Beschränkung,
- offene Unklarheiten oder Risiken.

Fehlt eine dieser Angaben oder ist die Rollenlage fachlich nicht eindeutig, darf der Agent keine Umsetzung vornehmen, die Rechte verändert, erweitert, sichtbar macht oder faktisch umgeht.

Zusätzliche Verbote:
- Keine Freigabe durch bloße UI-Sichtbarkeit ableiten
- Keine Berechtigung aus ähnlichem Verhalten anderer Screens kopieren
- Keine Rollenlogik in Frontend-Komponenten „nachbauen“, wenn die serverseitige Regel unklar ist
- Keine Tests grün melden, wenn nur die Sichtbarkeit geprüft wurde, nicht aber die verweigerte Operation für unzulässige Rollen
- Keine Formulierung wie „analog zu Rolle X auch für Rolle Y“, wenn dies nicht ausdrücklich belegt oder beauftragt ist

Wenn eine Änderung Rollen berührt, muss der Plan und der Abschlussbericht diesen Rollenbezug ausdrücklich benennen. Schweigende Änderungen an Rollenverhalten sind unzulässig.
---

## 3. Planung

### 3.0 Planungs-Skill (Pflicht)

Vor jeder Planerstellung im Chat oder im Plan-Modus nutzt der Agent den Repo-Skill `planungsleitplanken`.

Der Skill ist ein Planungs-Gate und ersetzt diese Datei nicht. `agents.md` bleibt die maßgebliche Quelle; bei Widersprüchen gilt `agents.md`. Der Skill stellt sicher, dass Architekturentscheidungen, Rollen-/Permission-Regeln, Teststrategie, Branch-Hygiene, UI-Leitplanken und Abnahmekriterien bei jeder Planung geprüft werden.

### 3.0.1 Testentwurfs-Skill (Pflicht bei Tests)

Sobald ein Auftrag Tests plant, ergänzt, ändert, bewertet oder ausführt, nutzt der Agent zusätzlich den Repo-Skill `test-entwurfsleitplanken`.

Das gilt insbesondere bei Begriffen wie „Testsuite", „Testabdeckung", „echte Daten", „Integrationstest", „E2E", „Abnahme", „Testfälle" oder „Testlauf".

Der Agent dokumentiert zu Beginn kurz:
- dass der Testentwurfs-Skill angewendet wird,
- welche Testebene betroffen ist,
- welches beobachtbare Verhalten bewiesen werden soll,
- welche echten Daten und welche Isolation verwendet werden.

### 3.1 Branch-Nutzung (nur bei explizitem Nutzerwunsch)

Der Agent fragt nicht aktiv nach einem lokalen Branch von `work`.

Ein lokaler Branch wird nur dann angelegt, wenn der Nutzer dies ausdrücklich verlangt oder das Kurzkommando `branch <name>` verwendet.

Delegiert der Nutzer die Namenswahl ausdrücklich an den Agenten, wählt der Agent selbst einen kurzen, auftragsbezogenen und beschreibenden Branchnamen. Diese Delegation gilt als Standardfreigabe für die Namenswahl; eine zusätzliche Rückfrage zum Branchnamen erfolgt dann nicht mehr. Danach Branch anlegen, Remote-Tracking einrichten und den Branch sofort pushen (`git push -u origin <branch>`).

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
Der Agent beschreibt den geplanten Lösungsweg in zusammenhängenden Sätzen. Der Abschnitt erklärt nicht nur die Maßnahme, sondern auch den fachlichen und technischen Ansatz. Es muss erkennbar sein, warum dieser Weg gewählt wird und welche Alternativen bewusst nicht verwendet werden.

**Betroffene Funktionen, Komponenten und Dateien**  
Der Agent nennt nicht nur die betroffenen Dateien oder Module, sondern erläutert zu jeder betroffenen Stelle ihre aktuelle Rolle im System. Zusätzlich beschreibt der Agent, was dort konkret geändert werden soll und warum genau diese Stelle betroffen ist. Der Nutzer muss erkennen können, ob eine Änderung lokal, bereichsbezogen oder schichtenübergreifend wirkt.

**Auswirkungen der Änderung**  
Der Agent beschreibt ausdrücklich, welche fachlichen, technischen und strukturellen Auswirkungen die geplanten Änderungen voraussichtlich haben. Dazu gehört insbesondere, welches Verhalten sich in der App ändert, welche bestehenden Abläufe unberührt bleiben sollen, welche angrenzenden Funktionen mittelbar betroffen sein könnten und ob sich Contracts, Datenflüsse, Persistenz, Rollenlogik, UI-Verhalten oder Validierungen verändern.

**Risiken und Schadenspotential**  
Der Agent bewertet die Risiken der geplanten Änderung in verständlicher Sprache. Dabei ist zu benennen, ob das Schadenspotential niedrig, mittel oder hoch ist. Diese Einschätzung muss begründet werden. Es ist klar zu beschreiben, was im ungünstigen Fall kaputtgehen könnte, welche Bereiche besonders sensibel sind und wodurch das Risiko begrenzt werden soll. Bei Eingriffen in zentrale Logik, Persistenz, Rollen, Terminplanung, Aggregationen, Contracts, Kalenderlogik oder Sicherheitsmechanismen ist das Risiko grundsätzlich ausdrücklich zu thematisieren.

**Erwartetes Ergebnis in der App**  
Der Agent beschreibt das erwartete beobachtbare Ergebnis aus Nutzersicht. Es muss erkennbar sein, was nach der Änderung anders funktioniert, welche Fälle ausdrücklich abgedeckt sein sollen und woran der Nutzer oder Tester erkennen kann, dass die Änderung gelungen ist.

### 3.3 Planinhalt

Der Plan muss ausreichend Kontext enthalten, damit der Nutzer die Tragweite der Änderung beurteilen kann. Es genügt nicht, nur betroffene Dateien oder Funktionen aufzuzählen.

Für Auftragsklasse 5 muss der Plan deshalb immer erkennen lassen:

- welche Stellen geändert werden,
- was an diesen Stellen konkret geschieht,
- warum diese Änderung dort vorgenommen wird,
- welche unmittelbaren und mittelbaren Auswirkungen zu erwarten sind,
- welche Bereiche bewusst unverändert bleiben sollen,
- wie hoch das Schadenspotential ist, falls die Änderung fehlerhaft umgesetzt wird.

Der Agent muss den Eingriff so beschreiben, dass der Nutzer zwischen lokalem Fix, bereichsbezogener Änderung und schichtenübergreifendem Eingriff unterscheiden kann.

Für Auftragsklasse 4 reicht eine knappe, aber nachvollziehbare Einordnung. In diesem Fall muss der Plan nicht dieselbe Detailtiefe wie bei mehrschichtigen Änderungen erreichen.

Jeder Planschritt muss einen stabilen, nachvollziehbaren Zwischenstand hinterlassen. Risiken, Seiteneffekte und Unsicherheiten werden nicht verkürzt oder beschönigt, sondern ausdrücklich benannt. Wenn ein Schritt potentiell kritische Bereiche berührt, muss der Agent das vor der Umsetzung klar sagen.

Änderungen sind nur zulässig, wenn sie im Auftrag oder im bestätigten Plan stehen. Weitet sich der Eingriff während der Analyse oder Umsetzung aus, muss der Agent diese Ausweitung vorab benennen und neu einordnen.

Bei Aufträgen mit möglichem Rollen-, Auth-, Sichtbarkeits- oder Berechtigungsbezug ist die Rollenprüfung verpflichtender Teil von Analyse und Plan. Ein Plan ohne ausdrückliche Benennung der betroffenen Rollen und ihrer zulässigen Aktionen ist unvollständig.

### 3.4 Kurzkommandos

Zur Reduktion von Dialog- und Kontextverbrauch darf der Nutzer kurze Kommandos verwenden. Der Agent übersetzt diese Kommandos in die zugehörigen Handlungen. Fehlt ein Kommando, gilt das normale Verhalten aus den übrigen Abschnitten.

### Zulässige Kurzkommandos

`branch <name>`  
Der Agent legt vor der weiteren Arbeit einen lokalen Branch von `work` mit dem angegebenen Namen an, richtet das Remote-Tracking ein und pusht den Branch sofort mit `git push -u origin <name>`. Alle Git-Schritte werden seriell ausgeführt.

`plan`  
Der Agent klassifiziert den Auftrag gemäß Abschnitt 0, führt die Analyse gemäß Abschnitt 2 aus und erstellt danach direkt den Plan im Format aus Abschnitt 3.2 und 3.3, ohne zusätzliche Branch-Rückfrage.

`audit`  
Der Agent führt den vollen Audit gemäß Abschnitt 13 als reinen Report-Auftrag aus. Wenn im Repository ein lokaler Audit-Runner vorhanden ist, der die in Abschnitt 13 definierten Kommandos seriell ausführt, nutzt der Agent diesen bevorzugt. Anschließend berichtet der Agent die Ergebnisse vollständig nach den dort definierten Regeln und zusätzlich in einem kurzen zusammenfassenden Report.

`test`  
Der Agent führt den vollen Testlauf gemäß Abschnitt 13 als reinen Report-Auftrag aus und beachtet dabei zusätzlich alle Regeln aus Abschnitt 12. Während dieses Auftrags nimmt der Agent keine Code-, Test-, Konfigurations- oder Dokumentationsänderungen vor.

`testsuite`  
Der Agent erstellt für die aktuell bearbeitete Aufgabe bzw. die letzte Session eine vollständige, fachlich belastbare Testsuite gemäß Abschnitt 12.1a. Dazu gehören Pflichtanalyse des aktuellen Arbeitskontexts, Ergänzung realistisch belastbarer Tests über mehrere Testebenen, serielle Ausführung der relevanten Testbefehle und ein Abschlussbericht mit Abdeckung, verwendeten Daten, verbleibenden Lücken sowie erfolgreichen und fehlgeschlagenen Kommandos.

`Tasks?`  
Der Agent liest `docs/wiki/tasks/README.md` sowie bei Bedarf die dort verlinkten offenen Aufgabendateien und gibt ausschließlich die offenen, in Bearbeitung befindlichen oder blockierten Aufgaben aus. Die Ausgabe wird nach Dringlichkeit (`Hoch`, `Mittel`, `Niedrig`), danach nach Thema und danach nach Aufgaben-ID sortiert. Abgeschlossene oder verworfene Aufgaben aus `docs/wiki/tasks/closed/` werden nicht ausgegeben. Die Antwort enthält keine Struktur-, Pflege- oder Organisationshinweise.

`save`  
Der Agent führt ausschließlich seriell `git add`, `git commit` und `git push` für alle offenen Änderungen des aktuellen Arbeitsstands aus. Vor dem Commit darf ein lokaler Encoding-/Mojibake-Staged-Guard laufen. Findet dieser Guard falsch kodierte Umlaute, Mojibake-Artefakte oder andere blockierende Encoding-Fälle, wird kein Commit erstellt. Der Agent dokumentiert die gemeldeten Fundstellen und fragt ausdrücklich, ob die gefundenen Encoding-/Mojibake-Fälle bereinigt werden sollen. Ohne diese Bestätigung nimmt der Agent keine inhaltliche Bereinigung vor. Nach bestätigter Bereinigung führt der Agent den Guard erneut aus und setzt `save` nur fort, wenn der Guard sauber ist. Falls Commit oder Push durch Konflikte, fehlende Inhalte oder andere Git-Blocker nicht sauber möglich sind, bricht der Agent kontrolliert ab und dokumentiert den Grund.

`savetowork`  
Der Agent sichert alle offenen Änderungen auf dem aktuellen Branch, mergt den Branch in `work`, prüft das Ergebnis und pusht `work`. Der Ablauf ist ausschließlich seriell:
1. Aktuellen Branch und Working Tree prüfen.
2. Falls offene Änderungen vorhanden sind: alle Änderungen stagen, sinnvoll committen und den aktuellen Branch pushen.
3. Auf `work` wechseln und mit `origin/work` synchronisieren.
4. Den Arbeitsbranch in `work` mergen.
5. Prüfen, dass die Änderungen in `work` liegen (`git status`, Branch-/Commit-Vergleich).
6. `work` pushen.
7. Vor dem Löschen des Arbeitsbranches ausdrücklich beim Nutzer bestätigen lassen, welcher lokale und welcher Remote-Branch gelöscht werden sollen. Erst nach Bestätigung löschen.

`log <kurztitel>`  
Der Agent schreibt einen manuell ausgelösten Schritt-Log-Eintrag gemäß Abschnitt 5 unter `logs/`. Zusätzlich schreibt der Agent einen Journaleintrag im Repo-Wiki unter `docs/wiki/journal/` gemäß Abschnitt 15.2a, ergänzt den Eintrag oben in `docs/wiki/journal/README.md` und führt anschließend `node scripts/build-wiki-site.mjs` aus. Für sichtbare Datumsangaben gilt zwingend das Kurzformat `dd.MM.yy`.

`journal`  
Der Agent erstellt für die aktuelle Session bzw. die letzte Aufgabe einen Journaleintrag im Repo-Wiki unter `docs/wiki/journal/` gemäß Abschnitt 15.2a, ergänzt den Eintrag oben in `docs/wiki/journal/README.md`, führt anschließend `node scripts/build-wiki-site.mjs` aus und prüft den generierten Kontrollbericht unter `docs/wiki/site/control-report.*`. Für sichtbare Datumsangaben gilt zwingend das Kurzformat `dd.MM.yy`.

`rückblick <datum|gestern|heute>`  
Der Agent erstellt einen reinen Informationsbericht über die Arbeiten des angegebenen Tages gemäß Abschnitt 15.2b. Primäre Quelle ist das Repo-Wiki-Journal unter `docs/wiki/journal/`. Wenn dort keine ausreichenden Informationen vorhanden sind, wertet der Agent ergänzend die lokale Git-Historie und `logs/` des angegebenen Tages aus. Der Agent nimmt dabei keine Änderungen vor und schreibt keine neuen Dateien.

`docs-sync`  
Der Agent prüft `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität im Kontext des erledigten Auftrags und aktualisiert sie bei Bedarf gezielt.

`cleanup`  
Der Agent führt den Abschluss des aktuellen Arbeitsbranches ausschließlich seriell aus:
0. Wenn sich der Agent bereits auf einem Arbeitsbranch ungleich `work` befindet und dieser noch uncommittete, auftragsbezogene Änderungen enthält, darf der Agent genau diese Änderungen vor dem eigentlichen Cleanup seriell stagen, committen und nach `origin` pushen, sofern dies nur der Herstellung eines cleanup-fähigen Zustands dient.
1. Sicherstellen, dass der aktuelle Branch nicht `work` ist, keine uncommitteten Änderungen enthält und vollständig nach `origin` gepusht ist.
2. Auf `work` wechseln.
3. Sicherstellen, dass `work` keine uncommitteten Änderungen enthält und vollständig mit `origin/work` synchronisiert ist.
4. Den Arbeitsbranch in `work` mergen.
5. Das Ergebnis auf `work` prüfen.
6. `work` pushen.
7. Nur den lokalen Arbeitsbranch löschen. Der Remote-Branch wird nicht gelöscht.
8. Unzulässig bleiben zusätzliche inhaltliche Änderungen, Refactorings oder Dokumentationsarbeiten, die nicht bereits Teil des Arbeitsbranches sind.
9. Bei uncommitteten Änderungen außerhalb des erlaubten Vorbereitungsfalls, fehlendem Push, Divergenzen, Merge-Konflikten oder anderen Blockern: kontrolliert abbrechen und den Grund dokumentieren.

Hinweis: `work_version_2` und `mein_version_2` gelten nicht mehr als aktive Ziel- oder Basisbranches. Falls sie in Remote-Backups oder historischer Doku noch auftauchen, sind sie nur als archivierte Sicherungen zu verstehen.

---

## 4. Umsetzungsregeln

### 4.1 Serielle Ausführung (Pflicht)

Alle Kommandos — Git, Tests, Builds, Migrationen — werden ausschließlich **seriell** ausgeführt. Kein paralleles Starten mehrerer Prozesse.

Git-Aktionen werden ausschließlich **seriell** ausgeführt. Kein paralleles Ausführen von `git add`, `git commit`, `git status`, `git diff`, `git push` oder ähnlichen Kommandos.

### 4.2 Keine spekulativen Änderungen

Der Agent arbeitet minimal-invasiv. Er verändert nur den Code, der zur Erfüllung des Auftrags zwingend erforderlich ist:

- Keine stillen Refactorings
- Keine kosmetischen Anpassungen
- Keine Umbenennungen, Verschiebungen oder Formatierungen „zur Verbesserung"
- Keine Änderungen an Dateien, die nicht klar zum Auftrag gehören
- Keine bestehende Funktionalität nebenbei entfernen

Erkannter Verbesserungs- oder Refactoring-Bedarf wird dokumentiert, aber nicht umgesetzt.

### 4.3 Keine Regressions-Fixes während Tests

Schlägt ein Test fehl, dokumentiert der Agent den Fehler. Eigenständige Fixes während eines laufenden Testlaufs sind unzulässig. Fixes erfolgen erst nach einem separaten Folgeauftrag.

### 4.4 Test-Nachführung bei Codeänderungen (Pflicht)

Bei jeder Codeänderung wird vor dem Commit geprüft, welche bestehenden Tests die geänderten Stellen abdecken. Veraltete Tests — durch geänderte Labels, Props oder API-Signaturen — werden als Teil der Änderung aktualisiert. Assertions bleiben gleich spezifisch oder werden spezifischer. Abschwächen ist keine Option.

### 4.5 Blocker-Verhalten — Weitermachen ist Pflicht

Ein Blocker in einer Teilaufgabe unterbricht den Auftrag **nicht**. Der Agent dokumentiert den Blocker im Schritt-Log und setzt die Umsetzung mit dem nächsten Schritt fort.

**Abbruch des gesamten Auftrags ist nur zulässig, wenn es faktisch unmöglich ist weiterzuarbeiten** — zum Beispiel wenn eine Datei fehlt, die für alle folgenden Schritte zwingend benötigt wird, oder wenn ein Kompilierfehler jeden weiteren Schritt blockiert.

In jedem anderen Fall gilt: Blocker dokumentieren, Schritt als `⚠️ Teilweise abgeschlossen` loggen, nächsten Schritt beginnen. Der Nutzer entscheidet nach Abschluss des Auftrags, wie mit offenen Blockern umgegangen wird.

Ein Blocker wird dokumentiert mit: was genau fehlt, welcher Schritt betroffen ist, welche Schritte davon abhängen, und ob die abhängigen Schritte trotzdem teilweise ausführbar sind.

---

## 5. Schritt-Log (Pflicht nach jeder Teilaufgabe)

Nach jeder abgeschlossenen Teilaufgabe schreibt der Agent **automatisch und ohne Rückfrage** einen Log-Eintrag. Das gilt für jeden nummerierten Implementierungsschritt aus dem Großauftrag sowie für jeden eigenständigen Änderungsauftrag der Klassen 4 und 5.

Jeder Log-Eintrag wird in eine **neue** Datei geschrieben. Bestehende einzelne Log-Dateien unter `logs/` dürfen nicht nachträglich ergänzt, korrigiert oder überschrieben werden. Nachträge, Korrekturen und Anschlussberichte erhalten immer eine eigene neue Log-Datei mit aktuellem Zeitstempel. Die einzige reguläre Änderung an einer bestehenden Datei im Log-Bereich ist die Aktualisierung des Index `logs/README.md`.

### 5.1 Dateiname und Ablageort

```
logs/YYYY-MM-DD-HH-mm-ss-schritt-<N>-<kurztitel-kebab-case>.md
logs/YYYY-MM-DD-HH-mm-ss-<typ-kebab-case>-<kurztitel-kebab-case>.md
```

`HH-mm-ss` ist die lokale Zeit im 24-Stunden-Format mit Bindestrichen (Windows-kompatibel).

Beispiele:
- `logs/2026-06-15-09-14-33-schritt-02-schema-migration.md`
- `logs/2026-06-15-10-02-08-fix-kw-berechnung.md`

Der Ordner `logs/` liegt im Repo-Root. Er wird beim ersten Log automatisch angelegt, falls er noch nicht existiert. `logs/` ist **nicht** in `.gitignore` — Logs sind Teil des Repos.

### 5.2 Pflichtinhalt jedes Log-Eintrags

```markdown
# Log: <Kurztitel>

**Datum:** DD.MM.YY
**Uhrzeit:** HH:mm:ss
**Schritt:** <N> — <Schrittbezeichnung> (oder: Fix / Feature)
**Status:** ✅ Abgeschlossen | ⚠️ Teilweise abgeschlossen | 🔴 Blockiert

## Was wurde umgesetzt

<Kurze Beschreibung in 3–8 Sätzen: was implementiert wurde, welcher Ansatz gewählt wurde und warum.>

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `server/services/terminService.ts` | geändert | Überschneidungsregel korrigiert |

## Probleme und Abweichungen

<Falls keine: „Keine." — sonst konkret benennen.>

## Offene Punkte / Folgeaufgaben

<Falls keine: „Keine." — sonst konkret auflisten.>
```

Bei Teständerungen nennt der Schritt-Log zusätzlich, welche Testleitplanken angewendet wurden und welche Testebenen abgedeckt sind.

### 5.3 Wann gilt eine Teilaufgabe als abgeschlossen?

Eine Teilaufgabe gilt als abgeschlossen, wenn:
- der Code fehlerfrei kompiliert,
- der Schritt das beschriebene Ziel aus dem Plan/Großauftrag erfüllt,
- keine bekannten Blocker offen sind.

Kann eine Teilaufgabe nur teilweise umgesetzt werden, wird der Log mit Status `⚠️ Teilweise abgeschlossen` geschrieben und der Blocker konkret dokumentiert. Auch in diesem Fall wird der Log **sofort geschrieben** — nicht erst nach Lösung des Blockers.

### 5.4 Log-Index pflegen

Der Agent pflegt zusätzlich `logs/README.md` als chronologische Übersicht:

```markdown
# Log-Übersicht MuGPlan

| Datum | Uhrzeit | Schritt | Kurztitel | Status |
|---|---|---|---|---|
| 15.06.26 | 09:14:33 | 2 | Schema-Migration | ✅ |
```

Der neueste Eintrag steht **oben**. Der Index wird nach jedem neuen Log sofort aktualisiert.

---

## 6. Architektur- und Konfigurationsgrenzen

- Trennung im Backend nach Route → Controller → Service → Repository
- Contract-First-Regel über den zentralen Contract-Index — keine API-Änderungen „frei Hand"
- Fachliche Regeln werden serverseitig implementiert, nie nur im Frontend
- React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung
- Kalenderrelevante Daten bevorzugt in der serverseitigen Kalender-Aggregation ergänzen

Ohne explizite Anweisung im Auftrag darf der Agent nicht:

- Architekturentscheidungen treffen oder ändern
- Neue Patterns, Frameworks oder Infrastruktur-Änderungen einführen
- Build-, Tooling- oder Konfigurationsdateien verändern
- Abhängigkeiten hinzufügen, entfernen oder aktualisieren

Wenn eine Aufgabe ohne solche Änderungen nicht sauber lösbar ist, wird dies als Blocker dokumentiert.

---

## 7. UI-Grenzen

UI-Elemente darf der Agent nur ändern oder ergänzen, wenn dies **explizit im Auftrag** enthalten ist:

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
- Debug-Ausgaben mit potenziell sensiblen oder personenbezogenen Daten vermeiden

---

## 10. Encoding

- Alle Quelltexte und Doku-Dateien werden in UTF-8 gespeichert
- Keine UTF-16-Dateien in `client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/`
- Für alle sichtbaren und menschenlesbaren Datumsangaben ist projektweit zwingend das Kurzformat `dd.MM.yy` zu verwenden
- Das gilt ausdrücklich auch für UI-Texte, Labels, Hinweise, Tooltips, Fehlermeldungen, Kommentare im Code, Testbeschreibungen, Testkommentare, Logs, Journaltexte, Projektmanagement-Einträge, Dokumentation und sonstige menschenlesbare Ausgaben
- ISO `yyyy-MM-dd` ist ausschließlich für interne Speicherung, Datenbankwerte, API-Payloads, Query-Parameter, maschinenlesbare Werte, technische IDs, Dateinamen, Contracts, SQL, Migrationsnamen, Log-Schlüssel, Testdaten-Token und andere technisch fest vorgegebene Kontexte zulässig
- Sichtbare Datumsangaben in `yyyy-MM-dd`, `MM/DD/YYYY`, `dd/MM/yyyy`, `dd.MM.yyyy`, englischen Monatsnamen oder anderen davon abweichenden Menschenformaten gelten ausdrücklich als Fehler
- Für Frontend-Anzeigeformate sind zentrale Helfer verpflichtend zu verwenden; direkte Ad-hoc-Formatierungen sichtbarer Datumswerte sind nur zulässig, wenn der bestehende zentrale Helfer nachweislich nicht passt
- Verifikationspflicht nach Änderungen an sichtbaren Datumsangaben: gezielt nach verbotenen Formaten und unscharfen Datumsformatierern suchen, insbesondere mit `rg -n "dd\\.MM\\.yyyy|yyyy-MM-dd|MM/DD/YYYY|dd/MM/yyyy|toLocaleDateString\\(|toLocaleString\\(\"de-DE\"\\)" client server tests docs agents.md CLAUDE.md`, und verbleibende Treffer technisch gegen menschenlesbar abgrenzen
- In Antworten, Plänen, Logs und Dokumentation sind deutsche Umlaute und `ß` als echte Zeichen zu schreiben (`ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß`). Umschreibungen wie `ae`, `oe`, `ue` oder `ss` sind in normaler Sprache unzulässig, sofern sie nicht technisch zwingend durch bestehende Dateinamen, APIs, Fremdsysteme oder Code-Bezeichner vorgegeben sind.
- Bei falsch dargestellten Umlauten oder Sonderzeichen: `npm run check` ausführen, gemeldete Datei in UTF-8 korrigieren, erneut `npm run check`, dann Commit

---

## 11. Deployment & Umgebungsregeln

### Umgebungsmodi und Env-Dateien

| Modus | Env-Datei |
|---|---|
| `development` | `.env.dev` |
| `test` | `.env.test` |
| `production` | `.env.prod` (via `npm start`) |

Kein Env-Datei-Fallback erlaubt. Fehlt die erwartete Env-Datei → fail fast.

### Startup-Befehle

- `npm run dev` → `cross-env NODE_ENV=development tsx server/index.ts`
- `npm test` → `cross-env NODE_ENV=test MUGPLAN_MODE=test vitest`
- `npm start` → `cross-env NODE_ENV=production node --env-file=.env.prod dist/index.cjs`

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

### Pflichtablauf bei DB-Änderungen

1. Schemaänderung analysieren
2. Migration erzeugen
3. Migration auf Dev-DB ausführen
4. Migration auf Test-DB ausführen
5. Prüfen, ob DB-Schema zum Code passt
6. Erst jetzt Tests starten
7. Bei Schemafehlern nicht weiterrefactoren, sondern Migrationsstand korrigieren

Zusätzliche Abschlussregel bei Schemaänderungen:

- Eine Schemaänderung gilt erst dann als umsetzungsseitig abgeschlossen, wenn die neue Migrationskette mindestens auf Dev und Test erfolgreich gelaufen ist oder ein sauber dokumentierter Blocker dies verhindert.
- Schlägt eine Migration auf Dev oder Test fehl, darf der Agent den Auftrag nicht als „fertig umgesetzt” melden. Der Zustand ist bis zur Korrektur als blockiert zu behandeln.
- Tritt in Tests, E2E oder Browser-E2E ein Fehler wie `Unknown column ...`, `Unknown table ...` oder ein anderer klarer Schema-Mismatch auf, ist dies als harter Abschluss-Blocker zu behandeln, nicht nur als gewöhnlicher Testfehler.
- Bei solchen Schema-Mismatches muss der Agent im Abschluss ausdrücklich benennen, welche Umgebung nicht migrationssynchron ist und dass die Umsetzung deshalb nicht als abgeschlossen gelten darf.

---

## 12. Teststrategie

### Must-Pass Safety Gate (vor jeder Testausführung)

1. `.env.test` ist vorhanden und erfolgreich geladen
2. Testmodus ist aktiv: `NODE_ENV=test` und `MUGPLAN_MODE=test`
3. Erlaubte DB-Ziele stammen ausschließlich aus Test-Env
4. DB-Connections laufen ausschließlich über zentrale Guard-APIs: `assertTestMode()`, `assertSafeWriteTargetForTestMode()`, `assertSafeDestructiveOperationTarget()`, `assertSqlDatabaseIdentity()`

Ohne bestandenes Safety Gate gilt jeder Testlauf als ungültig.

### 11.1a Kurzkommando `testsuite`

Das Kurzkommando `testsuite` ist kein reiner Report-Auftrag, sondern ein Umsetzungsauftrag zur gezielten Erstellung oder Ergänzung einer vollständigen Testsuite für die aktuell bearbeitete Aufgabe bzw. die letzte Session.

Pflichtablauf:

1. Zuerst den aktuellen Arbeitskontext lesen:
   - letzte reale Änderungen im Code und in Tests
   - betroffene Features und, falls fachlich nötig, relevante Projekt-Manager-MCP-Kontexte
   - bestehende Tests im betroffenen Bereich
   - betroffene Services, Hooks, Komponenten, Controller, Repositories und Datenmodelle
2. Danach die Testsuite so entwerfen, dass sie nicht nur Happy Paths, sondern auch Fachlogik, Edge Cases, Regressionen, Integrationspfade und Browser-/E2E-Flows abdeckt, soweit diese für den betroffenen Auftrag fachlich relevant und technisch sinnvoll prüfbar sind.
3. Für neue oder erweiterte Tests sind echte Seed-/Dev-Daten nur zu verwenden, wenn der Test dadurch kontrollierbar und aussagekräftig bleibt. Andernfalls sind realistische Testdaten mit eindeutigen Tokens explizit anzulegen.
4. Unzulässig sind Tests gegen leere Collections, unrealistische Minimalobjekte, bloß symbolische Mocks oder künstliche Datenpfade, die die eigentliche Fachlogik umgehen.
5. Der Agent muss ausdrücklich prüfen, ob die Tests tatsächlich über reale Datenpfade, echte Persistenzpfade, echte API-Flows oder echte UI-Flows laufen, statt nur lokale Struktur oder oberflächliche Sichtbarkeit zu bestätigen.
6. Fehlende Test-Fixtures dürfen nur ergänzt oder erweitert werden, wenn sie fachlich realistisch sind und bestehende Testmuster nicht unnötig aufweichen.
7. Nach der Implementierung führt der Agent die relevanten Testbefehle seriell aus. Welche Befehle relevant sind, ergibt sich aus den tatsächlich berührten Ebenen; unnötige Testläufe sind zu vermeiden, aber die geänderten Pfade müssen belastbar verifiziert werden.
8. Im Abschlussbericht dokumentiert der Agent zwingend:
   - welche Aspekte abgedeckt sind
   - welche Daten verwendet wurden
   - welche Lücken bleiben
   - welche Befehle erfolgreich waren
   - welche Befehle fehlgeschlagen sind

Wenn die letzte Aufgabe oder Session fachlich nicht eindeutig identifizierbar ist, bricht der Agent kontrolliert ab und dokumentiert diesen Blocker, statt eine Testsuite auf Vermutung zu bauen.

### Testebenen

**Unit** — isolierte Logik, Mocks/Stubs/Fakes, keine echte DB-Verbindung, zentrale Fixtures aus `tests/helpers/testDataFactory.ts`.

**Integration** — reale DB nur gegen Testziel, Setup/Teardown über `tests/setup.env.ts`, Factory-Einstieg zwingend über `tests/helpers/testDataFactory.ts`. Integration-Tests **müssen** mit `--reporter=verbose` ausgeführt werden.

**E2E** — vollständige Workflows, isolierte Daten, Suite-weite Resets nur guardiert.

### Laufzeit ist ein Primärziel neuer Tests

Für neue oder grundlegend umgebaute Tests gilt Laufzeit ausdrücklich als gleichrangiges Entwurfsziel neben Aussagekraft und Stabilität.

- Neue Tests sind so zu entwerfen, dass sie die vorhandene Reset-, Baseline- und Registry-Strategie aktiv nutzen statt neue harte Reset-Pfade einzuführen
- Härtere Isolation, häufigere Resets oder `seeded`-Baselines sind nur zulässig, wenn der Test fachlich nachweisbar darauf angewiesen ist
- Wenn ein Test sowohl mit leichterer als auch mit härterer Isolation korrekt wäre, ist die leichtere, schnellere Variante zu wählen
- Bestehende teure Muster wie unnötige `beforeEach`-Vollresets, doppelte Seeds, wiederholte Logins oder redundante Navigation dürfen nicht blind kopiert werden
- Browser-Tests sollen vorhandene Suite-Helfer, echte Suite-Pfade und die Registry-basierte Baseline-Wahl verwenden, statt ad hoc eigene Reset-Logik aufzubauen
- Neue Tests dürfen die Gesamtlaufzeit nicht still verschlechtern, nur weil sie fachlich korrekt sind; wenn ein langsameres Design unvermeidbar ist, muss dies im Plan ausdrücklich benannt und begründet werden

### Browser-Test-Beschleunigung und Isolation

Browser-Tests dürfen nicht durch Weglassen oder Abschwächen von DB-Reset, Storage-Clear, Browser-Context-Isolation, Session-Clear oder vergleichbaren Isolationsmechanismen beschleunigt werden, solange kein expliziter Isolationsnachweis vorliegt.

Ein Isolationsnachweis muss mindestens belegen:

- welche Daten jeder Test anlegt
- dass spätere Tests keine fremden Daten sehen oder auswerten
- dass Assertions über eindeutige IDs, Tokens oder Testdaten laufen
- dass Stördaten oder Canaries den Test nicht fälschlich grün lassen
- dass Storage-, Session- und Rollen-Zustände nicht zwischen Tests driften

Playwright-Parallelisierung ist mit einer gemeinsamen festen Test-DB unzulässig, solange nicht pro Worker eine vollständig getrennte DB, ein getrenntes Schema oder eine gleichwertig harte Isolation eingerichtet ist.

Wenn eine Suite bisher `beforeEach`-Reset nutzt, darf sie nur nach dokumentierter Analyse und erfolgreichem Pilotlauf auf `beforeAll` oder `per-suite` umgestellt werden. Bei Zweifel bleibt harte Isolation Pflicht.

### Timeout-Regel

Für `npm run test:integration`, `npm run test:e2e` und `npm run test:e2e:browser` ist standardmäßig ein langer Command-Timeout zu verwenden.
Bei `npm run test:e2e:browser` sind die Playwright-Timeouts pro Test maßgeblich; ein äußerer Command-Timeout darf nicht als fachliche Gesamtlaufzeitgrenze verwendet werden.
Wenn die lokale Ausführungsumgebung technisch einen äußeren Timeout verlangt, muss dieser bereits **beim ersten Lauf** so großzügig gesetzt werden, dass der vollständige Browser-E2E-Lauf regulär bis zur Playwright-Zusammenfassung durchlaufen kann. Er dient nur als Hängerschutz für defekte Prozesse, nicht als normaler Abbruchmechanismus.
Wiederholte Neuversuche allein wegen zu knapp gesetzter äußerer Command-Timeouts gelten als vermeidbar und sind durch vorausschauende Wahl eines ausreichend langen Timeouts zu vermeiden.

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
- Fachliche Tests mit leeren Arrays, leeren Objekten oder Minimalobjekten, sofern der leere Zustand nicht selbst die geprüfte Fachregel ist
- Reine Render- oder Sichtbarkeitsprüfungen als Ersatz für fachliche Daten-, Rollen-, Persistenz- oder Regelprüfungen
- Mocks oder Helper, die das erwartete Ergebnis bereits künstlich liefern und dadurch die eigentliche Fachlogik umgehen
- Neue Tests dürfen bestehende weiche Muster nicht blind kopieren, ohne deren Aussagekraft gegen Restdaten-, Seed- und Reihenfolgerisiken zu prüfen

### Test-Runs dürfen nicht in eigenständigen Fixes münden

Schlägt ein Test fehl, dokumentiert der Agent den Fehler und nimmt keine eigenständigen Fixes vor.

Wurde jedoch ein **voller Testlauf** oder das Kurzkommando `test` explizit angefordert, führt der Agent alle in Abschnitt 12 definierten Test-Kommandos **vollständig und seriell** zu Ende, auch wenn einzelne Teilkommandos fehlschlagen. Die Fehlschläge werden gesammelt und anschließend strukturiert berichtet.

Ein explizit angeforderter Testlauf ist immer ein **reiner Report-Auftrag**. Während eines solchen Testlaufs nimmt der Agent keinerlei Änderungen an Produktivcode, Tests, Konfiguration, Skripten oder Dokumentation vor. Auch triviale oder offensichtliche Test-Fixes sind in diesem Modus unzulässig. Änderungen sind erst nach einem separaten Folgeauftrag zur Behebung erlaubt.

### Allgemeine Regel

Jeder Test muss einen beobachtbaren Effekt prüfen. Zulässig sind nur Assertions auf Verhalten, Ergebnis, Nebenwirkung oder verweigerte Operationen. Nicht zulässig sind Tests, die nur das Vorhandensein von Quelltext, Namen, Markup-Fragmenten oder anderen Implementierungsdetails bestätigen, ohne das tatsächliche Systemverhalten nachzuweisen.

### Nachweispflicht für fachlich aussagekräftige Tests

Der Agent darf einen Test nur dann als fachlich aussagekräftig bezeichnen, wenn der Test nachweisbar mit konkreten, realistischen und eindeutig identifizierbaren Testdaten arbeitet und diese Daten im Ergebnis ausdrücklich überprüft.

Ein Test mit leeren Arrays, leeren Objekten, Dummy-IDs, generischen Platzhaltern oder rein künstlichen Minimaldaten gilt standardmäßig nur als Smoke-Test. Er darf nur dann als ausreichend gelten, wenn genau der leere Zustand selbst die fachliche Regel ist und diese Erwartung ausdrücklich im Testnamen, Testkommentar oder Testprotokoll benannt wird.

Für fachliche UI-, Browser-, Integration- und Report-Tests gilt verbindlich:

Der Test muss mindestens ein fachlich relevantes Zielobjekt erzeugen oder über eine eindeutig kontrollierte Fixture bereitstellen. Dieses Zielobjekt muss realistische Pflichtfelder, sinnvolle Beziehungen und einen eindeutigen Testdaten-Token enthalten.

Der Test muss nachweisen, dass genau dieses Zielobjekt verarbeitet, angezeigt, gespeichert, geändert, gefiltert, abgelehnt oder entfernt wurde. Eine bloße Sichtbarkeitsprüfung eines allgemeinen Textes reicht nicht aus.

Der Test muss mindestens eine Assertion enthalten, die bei einem echten Bruch der geprüften Fachregel rot würde. Wenn ein Test auch dann grün bliebe, wenn die geprüfte Regel entfernt, falsch verdrahtet oder durch Seed-Daten vorgetäuscht würde, ist der Test unzureichend.

Bei Listen, Tabellen, Kalenderansichten, Boards, Reports, Overlays und Reopen-Flows muss der Test zusätzlich zur Textsichtbarkeit mindestens einen Identitäts-, Anzahl-, Reihenfolge-, Filter-, Delta- oder Ausschlussnachweis führen. Der Test muss also belegen, dass nicht irgendein ähnlicher Altbestand angezeigt wird, sondern das konkret vorbereitete Zielobjekt.

Bei Mutationen muss der Test den Zustand nach der Aktion prüfen. Je nach Testschicht erfolgt dieser Nachweis durch sichtbare UI-Werte, erneutes Laden, API-Response, Datenbankzustand oder einen zweiten unabhängigen Abruf. Eine Mutation gilt nicht als ausreichend getestet, wenn nur ein Button geklickt und anschließend irgendein Toast oder irgendein Text gefunden wird.

Bei Integrationstests muss der Datenbankzustand vor und nach der geprüften Aktion so geprüft werden, dass die fachliche Wirkung eindeutig ist. Dazu gehören bei Bedarf ID-Abgleich, eindeutiger Token, erwartete Feldwerte, erwartete Beziehungen und der Ausschluss unerwünschter Nebenwirkungen.

Bei Browser-Tests muss nachgewiesen werden, dass angezeigte Daten aus der durchgeführten Testaktion oder aus einer eindeutig kontrollierten Fixture stammen. Seed-Daten, Cache, Restdaten oder zufällig ähnliche Texte dürfen den Test nicht grün machen können.

Der Agent darf keine Tests als „mit echten Daten getestet” beschreiben, wenn der Test nur Komponentenprops mit leeren Arrays, generischen Mocks oder Minimalobjekten übergibt. In diesem Fall muss der Agent den Test ausdrücklich als Smoke-Test oder Strukturtest kennzeichnen.

Der Agent muss bei jedem neu geschriebenen oder wesentlich geänderten Test im Abschlussbericht folgende Fragen beantworten:

1. Welches konkrete Zielobjekt wurde erzeugt oder kontrolliert bereitgestellt?
2. Welcher eindeutige Token, welche ID oder welche eindeutige Feldkombination weist dieses Zielobjekt nach?
3. Welche realistischen Pflichtfelder und Beziehungen enthält das Zielobjekt?
4. Welche Assertion beweist, dass genau dieses Zielobjekt verarbeitet oder angezeigt wurde?
5. Welche Assertion würde rot werden, wenn die geprüfte Fachregel kaputt wäre?
6. Welche Fremd-, Seed-, Cache- oder Restdaten könnten den Test theoretisch vortäuschen, und wie verhindert der Test das?
7. Ist der Test ein fachlicher Test oder nur ein Smoke-Test?

Wenn der Agent eine dieser Fragen nicht konkret beantworten kann, darf der Test nicht als fachlich abgesichert gemeldet werden.

### Verbot gegen „Grünbiegen“ von Tests

Der Agent darf Tests nicht dadurch erfolgreich machen, dass ihre fachliche Aussagekraft reduziert wird.

Unzulässig sind insbesondere:

- Assertions entfernen, abschwächen oder durch allgemeinere Erwartungen ersetzen
- konkrete fachliche Werte durch leere Arrays, leere Objekte, Dummy-Daten oder beliebige Platzhalter ersetzen
- Mocks so erweitern, dass sie das erwartete Ergebnis bereits fertig liefern und die eigentliche Fachlogik nicht mehr geprüft wird
- relevante Nutzeraktionen, Persistenzpfade, API-Aufrufe oder Datenbankprüfungen umgehen
- `test.skip`, `describe.skip`, `it.skip`, `todo`, bedingte Returns oder ähnliche Mechanismen verwenden, um grüne Läufe zu erreichen
- Fehlermeldungen, Rollenprüfungen, Validierungen oder Negativfälle entfernen
- fachliche Tests auf reine Render-, Sichtbarkeits- oder Smoke-Tests zurückbauen

Ein Test darf nur dann angepasst werden, wenn die bisherige Erwartung nachweislich fachlich falsch war. Dieser Nachweis muss im Abschlussbericht konkret begründet werden.

Wenn ein fachlich sinnvoller Test rot wird, ist das nicht automatisch ein Problem des Tests. Es kann ein echter Bug, eine fehlende Implementierung oder eine unvollständige Testinfrastruktur sein. In diesem Fall dokumentiert der Agent die Ursache und bricht bei unzulässigem Scope kontrolliert ab, statt den Test still grün zu biegen.

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

### Verbindliche Entwurfsfragen vor jedem neuen Integration- oder Browser-Test

Vor dem Schreiben eines neuen Tests muss der Agent diese Fragen kurz für sich beantworten und die Antworten im Plan oder in der Testanlage sichtbar berücksichtigen:

1. Welche Isolationsklasse braucht der Test wirklich?
2. Reicht `core`, oder ist `seeded` fachlich zwingend?
3. Reicht `per-suite`, oder ist `per-test` wirklich notwendig?
4. Welcher vorhandene Helper oder Registry-Eintrag deckt den Fall bereits ab?
5. Welche konkrete Assertion beweist das Zielobjekt eindeutig statt nur dessen Textsichtbarkeit?
6. Welche leichtere, schnellere Variante wurde bewusst verworfen und warum?

Ohne diese Abwägung darf der Agent keinen neuen harten Reset-Pfad, keine neue Seed-Pflicht und keine neue Sonder-Initialisierung in Tests einführen.

Verbindliche Arbeitsgrundlage für den späteren Umbau ist `docs/TEST_ISOLATION_REBUILD_PLAN.md`

### Leitplanken für Unit-Tests

Unit-Tests prüfen isoliertes fachliches oder technisches Verhalten ohne Datenbank, ohne echtes Dateisystem und ohne Browser. Sie müssen sich auf beobachtbare Ergebnisse öffentlicher Funktionen, Komponenten oder Schnittstellen stützen und dürfen keine Implementierungsdetails wie Quelltext-Strings, interne Funktionsnamen, JSX-Fragmente oder Dateiinhalte prüfen. Ein Unit-Test ist nur dann sinnvoll, wenn seine Assertion zeigt, was das System bei einem Input tatsächlich zurückgibt, verändert, anzeigt oder verweigert.

### Leitplanken für Integrationstests

Integrationstests prüfen das Zusammenspiel realer Anwendungsteile mit Datenbank und temporärem Dateisystem. Sie sollen echte Persistenz, API-Verhalten, Validierung, Rollenrechte, Nebenwirkungen und Fehlerszenarien absichern. Assertions müssen sich auf beobachtbare Systemwirkungen stützen, zum Beispiel HTTP-Responses, Datenbankzustand, erzeugte Dateien oder abgelehnte Operationen. Integrationstests dürfen keine bloßen Verdrahtungsannahmen oder interne Implementierungsdetails absichern, sondern müssen zeigen, dass die fachliche Regel im realen Lauf korrekt durchgesetzt wird.

Zusätzlich gilt für Integrationstests:

- Wenn Listen, Filter, Suchbegriffe, Aggregationen oder ähnliche Namen im Spiel sind, müssen Testdaten eindeutig markiert und die Zielobjekte über ID, Token oder eine gleichwertig eindeutige Kombination nachgewiesen werden
- Integrationstests dürfen nicht deshalb grün werden, weil die DB leer ist, sofern Leere nicht ausdrücklich Teil der fachlichen Regel ist
- Suiten mit Seed-, Storage- oder globalem Systemzustand sind als Sonderfall zu behandeln und nicht still an allgemeine Reset-Muster anzulehnen

### Leitplanken für E2E-Browser-Tests

E2E-Tests prüfen geschäftskritische Nutzerabläufe aus Sicht des Benutzers im Browser. Sie sollen sich an sichtbaren Aktionen und Ergebnissen orientieren, also an Navigation, Eingaben, Klicks, Dialogen, Meldungen, Sperren und erfolgreichen oder abgelehnten Abläufen. E2E-Tests dürfen nicht die interne Struktur der Oberfläche absichern, sondern nur das tatsächlich beobachtbare Verhalten der Anwendung. Sie sollen gezielt die wichtigsten End-to-End-Flows abdecken und nicht Aufgaben übernehmen, die bereits durch Unit- oder Integrationstests schneller und stabiler geprüft werden können.

Zusätzlich gilt für E2E-Browser-Tests:

- Listen, Hover-Previews, Sidebars, Boards und Reopen-Flows dürfen nicht nur per `toContainText(...)` oder reiner Sichtbarkeit abgesichert werden, wenn Altbestand oder ähnlich benannte Objekte plausibel sind
- Browser-Tests mit Upload-, Backup-, Dump- oder Attachment-Kontext müssen einen ausdrücklich geprüften Storage-Ausgangszustand haben
- Nach einer Browser-Mutation ist zusätzlich zu prüfen, dass das sichtbare Ergebnis nicht aus Seed, Cache oder Altbestand stammt

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
- `npm run analyze:arch`
- `npm run analyze:boundaries`
- `npm run analyze:coverage`
- `npm run analyze:knip`

Nach Ausführung muss der Agent explizit berichten: welche Kommandos ausgeführt wurden, welches Ergebnis jedes hatte, welche Teile nicht ausgeführt wurden und warum. „Alles grün" ist nur zulässig, wenn alle verpflichtenden Kommandos erfolgreich abgeschlossen wurden.

Wenn das Repository einen lokalen Sammelbefehl wie `npm run audit:local` bereitstellt, darf der Agent diesen für die Ausführung verwenden, sofern der Befehl exakt diese Audit-Kommandos seriell abdeckt oder sichtbar orchestriert. Der Abschlussbericht bleibt trotzdem kommandogenau.

Zusätzlich zum vollständigen Bericht liefert der Agent nach einem Audit immer einen kurzen Management-Report mit:

- Gesamtstatus (`grün`, `gelb` oder `rot`)
- Anzahl erfolgreicher und fehlgeschlagener Teilprüfungen
- den 1 bis 3 wichtigsten Problemursachen
- einer knappen Einschätzung, ob der Branch audit-seitig mergefähig wirkt oder noch klar blockiert ist

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
 *
 * Aussagekraft-Nachweis:
 * - Zielobjekt: <konkrete Entität oder konkreter Flow>
 * - Eindeutiger Nachweis: <ID, Token oder eindeutige Feldkombination>
 * - Realistische Daten: <Pflichtfelder und Beziehungen>
 * - Kritische Assertion: <Assertion, die bei Regelbruch rot wird>
 * - False-Positive-Schutz: <Ausschluss von Seed, Cache, Altbestand oder ähnlichen Treffern>
 */
```

Der Abschnitt `Aussagekraft-Nachweis` ist für neue oder wesentlich geänderte Testdateien verpflichtend. Fehlt dieser Nachweis, gilt die Teständerung als unvollständig.

Bei reinen Smoke-Tests muss der Kommentar ausdrücklich sagen, dass es sich nur um einen Smoke-Test handelt und welche begrenzte Aussage dieser Test hat. Ein Smoke-Test darf nicht als fachliche Absicherung einer Regel, eines Reports, einer Berechtigung oder eines Workflows dokumentiert werden.

### Pflege von docs/TEST_MATRIX.md

Bei jeder Erstellung oder Erweiterung von Tests pflegt der Agent `docs/TEST_MATRIX.md` eigenständig und verpflichtend:

```md
| Test-Datei | Feature | Bereich | Zweck | Status |
|------------|---------|---------|-------|--------|
| [datei.test.ts](../tests/...) | FT14 | Unit | Kurzbeschreibung | ✓ |
```

Die Test-Matrix muss bei neuen oder wesentlich geänderten Tests zusätzlich erkennen lassen, ob der Test fachlich stark, begrenzt, Smoke-Test oder technische Absicherung ist. Wenn ein Test nur ein Smoke-Test ist, darf die Matrix ihn nicht als vollständige Absicherung einer Fachregel darstellen.

Fehlt die Aktualisierung der Test-Matrix oder ist die Aussagekraft dort falsch eingeordnet, gilt die Teständerung als unvollständig.

---

## 15. Abschluss-Workflow

Nach Fertigstellung eines Auftrags richtet sich der Abschluss nach der gewählten Auftragsklasse aus Abschnitt 0.

**Für Klasse 1 (reine Frage oder Leseauftrag)**  
Keine Pflicht-Rückfragen zu Audit, Testlauf, Log oder Docs-Sync. Der Agent liefert die Antwort und führt nur die Abschlussprüfung nach §15.5 aus.

**Für Klasse 2 (Analyse-, Audit- oder Test-Report)**  
Keine automatische Rückfrage zu zusätzlichem Audit oder Testlauf, wenn genau dieser Report bereits der Auftrag war. Rückfragen zu Log oder Docs-Sync nur, wenn sie für den Auftrag naheliegen oder vom Nutzer gewünscht werden.

**Für Klasse 3 (Git-Operation ohne Codeänderung)**  
Keine Pflicht-Rückfragen zu Audit, Testlauf oder Docs-Sync. Ein Log wird nur auf ausdrücklichen Wunsch oder per Kurzkommando angeboten.

**Für Klasse 4 und 5 (Änderungsaufträge):**

### 15.1 Schritt-Log schreiben (automatisch, keine Rückfrage)

Der Agent schreibt den Schritt-Log-Eintrag gemäß Abschnitt 5 **immer** — ohne Rückfrage, ohne Nutzerbestätigung. Das ist kein optionaler Schritt.

### 15.1.1 MCP-Abschlusskommentar im Projekt (automatisch, keine Rückfrage)

Zusätzlich zum dateibasierten Schritt-Log schreibt der Agent **einmal nach Abschluss der gesamten Aufgabe** — nicht nach einzelnen Teilschritten — **automatisch und ohne Rückfrage** einen kurzen Abschlusskommentar in die Projekt-Manager-App.

- **Ziel:** das in `docs/projekt-kontext.md` hinterlegte Standard-Log-Ziel (aktuell `PROJ-1`). Ging der Auftrag von einer spezifischen Parent-Referenz aus (`PROJ`/`MS`/`TASK`/`TKT`/`FEAT`/`UC`), wird der Kommentar zusätzlich an diesen Parent geschrieben; dafür bleibt der Skill `mcp-code-auftrag` maßgeblich.
- **Tool:** `add_comment_to_parent`. Ist das Tool nicht verfügbar, ersatzweise `add_note_to_parent`.
- **Inhalt** (gut lesbar für den Nutzer, keine technischen Dateilisten): was erledigt wurde, wichtige Entscheidungen oder Einschränkungen, durchgeführte Prüfungen oder Tests, offene Punkte oder Blocker, welches Ergebnis der Nutzer erwarten kann.
- **Blocker:** Ist der MCP nicht erreichbar oder fehlt das Schreibrecht, dokumentiert der Agent dies als Blocker im Schritt-Log und gibt den Kommentartext im Chat aus. Der Auftrag gilt trotzdem als abgeschlossen; der dateibasierte Schritt-Log bleibt die verbindliche Mindestdokumentation.
- **Ausnahmen:** Klassen 1 (reine Frage), 2 (Report) und 3 (reine Git-Operation) sind ausgenommen.

Danach stellt der Agent die folgenden Fragen **der Reihe nach** und wartet jeweils auf Antwort:

### 15.2 Audit und Testlauf

> „Soll ich einen vollen Audit und einen vollen Testlauf ausführen?"

- Bei **ja**: Alle Kommandos aus Abschnitt 13 vollständig ausführen.
- Ein fehlgeschlagenes Test-Kommando unterbricht den vollen Testlauf nicht. Der Agent führt alle weiteren verpflichtenden Test-Kommandos seriell aus und berichtet die Fehlschläge gesammelt im Abschlussbericht.
- Der volle Testlauf ist auch hier ein reiner Report-Auftrag. Währenddessen werden keine Fixes und keine sonstigen Änderungen vorgenommen.
- Test-Report danach sortiert ausgeben nach:
  1. **Kritikalität** (rot/fehlgeschlagen zuerst, dann gelb/Warnungen, dann grün)
  2. **Problemstellung** (gleiche Fehlerursachen gruppiert)
- Jeder fehlgeschlagene Test wird mit Datei, Testname, Fehlertyp und einer Einschätzung der Auswirkung aufgeführt.
- Bei **nein**: kein Testlauf.

### 15.2a Journal im Repo-Wiki schreiben

> „Soll ich einen Journaleintrag für diese Session schreiben?"

- Bei **ja**: Der Agent erstellt eine neue Markdown-Datei unter `docs/wiki/journal/`.
- Der Dateiname verwendet das Muster `<dd-mm-yy>-<kurztitel-kebab-case>.md`, zum Beispiel `15-06-26-kw-berechnungen-fix.md`.
- Der Agent ergänzt den neuen Eintrag in `docs/wiki/journal/README.md` ganz oben unter `## Einträge`.
- Bestehende Struktur, Reihenfolge und Formatierung des Wiki-Journals sind strikt einzuhalten.
- Nach dem Schreiben der Markdown-Quelle führt der Agent `node scripts/build-wiki-site.mjs` aus.
- Der Agent prüft danach den Kontrollbericht `docs/wiki/site/control-report.json` bzw. `docs/wiki/site/control-report.html`.
- Enthält der Kontrollbericht Fehler, gilt der Journalauftrag als blockiert. Der Agent meldet die Fehler konkret.
- Für die Titelzeile ist zwingend dieses Format zu verwenden: `TT.MM.JJ | [Typ] | [Feature]: [Kurztitel]`.
- Der Eintrag muss mindestens diese Inhalte enthalten, sofern für den Auftrag jeweils real belegbar:
  - Zusammenfassung
  - Art der Änderung
  - Betroffene Features mit Repo-Wiki- oder Projekt-Manager-MCP-Bezug, soweit bekannt
  - Konkrete Änderungen
  - Tests / Verifikation
  - Offene Punkte
- Bei **nein**: kein Journaleintrag.

### 15.2b Tagesrückblick

Das Kurzkommando `rückblick <datum|gestern|heute>` dient dazu, den Nutzer über die Arbeiten eines Tages zu informieren.

Pflichtablauf:

1. Relative Angaben wie `gestern` oder `heute` in ein konkretes Datum im Format `dd.MM.yy` auflösen.
2. Zuerst `docs/wiki/journal/README.md` und relevante Einträge unter `docs/wiki/journal/` lesen.
3. Wenn das Wiki-Journal nicht ausreicht, ergänzend die lokale Git-Historie und `logs/` des Tages auswerten.
4. Keine Änderungen vornehmen, keine neuen Dateien schreiben.
5. Den Bericht knapp ausgeben: erledigte Arbeiten, betroffene Bereiche, Tests, offene Punkte, Quellenlage.

### 15.3 Architekturdokumentation aktualisieren

> „Soll ich `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` auf Aktualität prüfen und bei Bedarf aktualisieren?"

- Bei **ja**: Der Agent prüft alle vier Dateien auf veraltete oder fehlende Einträge im Kontext des abgeschlossenen Auftrags und aktualisiert sie gezielt — keine vollständigen Neuschriften.
- Bei **nein**: keine Dokumentationsänderung.

### 15.4 Abschlussprüfung (immer, ohne Rückfrage)

Der Agent prüft das Ergebnis explizit gegen:

- den Aufgabentext einschließlich Ziel, Nicht-Ziele und Akzeptanzkriterien,
- die gelesenen Architektur- und Implementierungsvorgaben,
- die gewählte Auftragsklasse aus Abschnitt 0.

Der Agent nennt konkret, welche Stellen geprüft wurden und ob es bekannte Abweichungen gibt. Bei Abweichungen werden konkrete Korrekturen vorgeschlagen.

Eine Aufgabe gilt als abgeschlossen, wenn das fachliche Ziel umgesetzt, alle Verbote eingehalten und die geforderte Dokumentation vollständig vorliegt. Kann eine Aufgabe nur teilweise umgesetzt werden, gilt sie als abgeschlossen, sofern der Abbruchgrund sauber dokumentiert ist.

Wenn eine Wiki-Aufgabe aus `docs/wiki/tasks/` abgeschlossen, verworfen oder kontrolliert teilabgeschlossen ist, führt der Agent zusätzlich die Aufgabenpflege aus:

1. Status, Abschlussdatum, Ergebnis, Verifikation und Folgeaufgaben in der Aufgabendatei aktualisieren.
2. Passenden Journaleintrag erstellen oder bestehenden Journaleintrag im Feld `Journal` verlinken.
3. Aufgabe aus `docs/wiki/tasks/README.md` entfernen.
4. Aufgabendatei nach `docs/wiki/tasks/closed/` verschieben.
5. Relative Links auf die verschobene Aufgabe aktualisieren.

Für Schemaänderungen reicht eine reine Code-Implementierung dafür nicht aus. Fehlt die erfolgreiche Migration mindestens auf Dev und Test oder liegt ein erkennbarer Schema-Mismatch in Test-/E2E-Umgebungen vor, darf der Agent den Auftrag nicht als fachlich umgesetzt melden, sondern nur als blockiert oder teilweise umgesetzt mit eindeutig benanntem Migrationsblocker.

## Plan-Aktualisierung im Plan-Modus

Wenn nach der Formulierung eines Plans weitere Informationen, Korrekturen oder Ergänzungen
gegeben werden, muss **immer ein vollständig neuer Plan** gepostet werden.

- Der neue Plan ersetzt den vorherigen vollständig.
- Kein komprimierter, gekürzter oder diff-artiger Plan.
- Kein bloßes Hinzufügen von Stichpunkten oder Ergänzungen zum bestehenden Plan.
- Der aktualisierte Plan muss alle Schritte enthalten – auch die unveränderten.

**Begründung:** Ein vollständiger Plan stellt sicher, dass der Arbeitsauftrag in sich
geschlossen und ohne Rückgriff auf frühere Nachrichten ausführbar ist.
