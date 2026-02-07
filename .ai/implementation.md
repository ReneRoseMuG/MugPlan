# MuGPlan – Engineering Handbook (Ist‑Stand)

## Zweck dieser Datei

Diese Datei ist das praktische Arbeits‑ und Betriebs‑Handbuch zur MuGPlan‑Codebasis. Sie ergänzt `architecture.md`, ohne Feature‑ und Use‑Case‑Texte zu duplizieren. Fachliche Abläufe und ausführliche Use‑Cases werden ausschließlich in der zentralen Feature‑/Use‑Case‑Sammlung beschrieben; hier stehen nur die technischen Konsequenzen, Konventionen und Handgriffe, die ein Entwickler beim Arbeiten am Code unmittelbar braucht.

## Was diese Datei bewusst nicht ist

Diese Datei ist keine zweite Architekturbeschreibung und keine Wiederholung der Feature‑Texte. Wenn etwas „warum fachlich“ ist, gehört es in die Feature‑/Use‑Case‑Dokumentation. Wenn etwas „wie im Code“ ist, gehört es hierher.

---

# 1. Projektbetrieb

## 1.1 Start‑ und Build‑Modell

MuGPlan wird als gemeinsamer Dev‑Prozess betrieben, in dem das Backend die REST‑API bereitstellt und im Development Vite so integriert wird, dass Frontend und Backend zusammen laufen. Im Production‑Modus liefert der Server die gebauten statischen Assets aus.

## 1.2 Konfiguration (Environment)

Das Backend benötigt Zugangsdaten zur Datenbank sowie ggf. Pfade für Upload‑Speicher. Diese Werte werden über Environment‑Variablen bereitgestellt. Wenn eine Variable fehlt oder falsch ist, ist die Regel, zuerst den Serverstart und die DB‑Verbindung zu verifizieren, bevor man „symptomatisch“ an einzelnen Endpunkten debuggt.

## 1.3 Datenbank‑Realität

Im Ist‑Stand ist die Persistenz MySQL‑basiert. Schema und referentielle Integrität sind im MySQL‑Dump vollständig sichtbar. Die Backend‑Implementierung nutzt Drizzle ORM und mysql2. Bei Schema‑Änderungen ist das Archivierungsmodell zu respektieren, und Cascades in Join‑Tabellen sind bewusst zu prüfen.

---

# 2. Code‑Konventionen, die man einhalten muss

## 2.1 Contracts sind der API‑Vertrag

Die API‑Oberfläche wird zentral über `shared/routes.ts` als Contract‑Index definiert. Route‑Module benutzen diese Contract‑Pfadstrings, und Controller validieren Input ausschließlich über die Contract‑Schemas. Neue Endpunkte werden nie „frei“ in Express definiert, sondern immer zuerst im Contract ergänzt.

## 2.2 Schichten im Backend

Backend‑Änderungen folgen der Kette Route → Controller → Service → Repository.

Der Controller ist ausschließlich für Parsing und Validierung zuständig und soll keine Fachlogik enthalten.

Der Service ist der Ort für Fachregeln, Aggregation und Querbezüge zwischen Entitäten.

Das Repository kapselt Datenbankzugriffe und verhindert, dass Query‑Details in den Service diffundieren.

## 2.3 UI‑Bausteine bleiben strukturell

Im Frontend bleiben wiederverwendbare UI‑Bausteine strukturell. Fachlogik gehört nicht in generische Layout‑ oder UI‑Komponenten, sondern in Page‑Ebene und fachnahe Hooks.

## 2.4 React Query ist die Server‑State‑Wahrheit

Server‑State wird über TanStack React Query verwaltet. Mutationen invalidieren die betroffenen Queries, statt lokale „Korrekturzustände“ zu erzeugen. Optimistic UI ist die Ausnahme und wird nur dort genutzt, wo fachliche Regeln sicher nicht betroffen sind oder ein Rollback sauber möglich ist.

---

# 3. Praktische Arbeitsmuster im Code

## 3.1 Einen neuen Endpunkt hinzufügen

Zuerst wird im Contract‑Index (`shared/routes.ts`) eine neue Definition ergänzt (Path und Zod‑Schemas).

Danach wird im passenden `server/routes/*Routes.ts` der Endpunkt registriert, indem exakt der Contract‑Path verwendet wird.

Im Controller wird der Input über das Contract‑Schema geparst, und die Ausführung wird an einen Service delegiert.

Im Service werden Fachregeln durchgesetzt und für Persistenz wird ein Repository genutzt.

## 3.2 Eine neue Liste/Verwaltungsseite hinzufügen

Neue Listen‑Screens sollen die vorhandene Kompositionsschicht nutzen, insbesondere `CardListLayout` oder `FilteredCardListLayout`, und die Entity‑Karten über `EntityCard`‑Pattern integrieren.

Formulare und Dialoge werden bevorzugt über die vorhandenen Edit‑Dialog‑Bausteine umgesetzt, statt neue Dialog‑Paradigmen einzuführen.

## 3.3 Ein neues Sidepanel im Detail‑Kontext hinzufügen

Panels werden als klar abgegrenzte Child‑Collections verstanden und folgen dem `SidebarChildPanel`‑Pattern. Neue Panels dürfen nicht implizit Seiteneffekte auf andere Panels auslösen, sondern müssen über klare Props und Query‑Hooks gekoppelt sein.

## 3.4 Kalenderfeatures erweitern

Kalenderfeatures sind systemkritisch. Neue kalenderrelevante Daten gehören in die serverseitige Aggregation, damit alle Views konsistent bleiben. Die Views sollen nicht durch zusätzliche parallele Requests auseinanderdriften.

---

# 4. Fehlerbehandlung und Debugging

## 4.1 Validierungsfehler vs. Fachfehler

Validierungsfehler entstehen, wenn Requests nicht dem Contract entsprechen. Diese werden als 400 beantwortet und sollen im Frontend als formale Eingabefehler behandelt werden.

Fachfehler entstehen, wenn Requests formal korrekt sind, aber gegen Regeln verstoßen. Diese werden als explizite Service‑Errors modelliert und mit passendem Statuscode und einer maschinenlesbaren Message beantwortet.

## 4.2 Lock‑ und Rollenprobleme

Wenn Interaktionen im Kalender „nicht gehen“, wird zuerst geprüft, ob der Termin gesperrt ist und welche Rolle über den Request‑Kontext übermittelt wird. Die UI blockiert, aber der Server muss dieselbe Regel ebenfalls erzwingen.

## 4.3 Typische Debug‑Reihenfolge

Wenn etwas nicht funktioniert, wird zuerst der Contract geprüft, dann der Controller‑Parse, dann der Service‑Pfad und erst danach das Repository. Diese Reihenfolge verhindert, dass man Datenbankqueries debuggt, obwohl der Request bereits an der Validierung scheitert.

---

# 5. Footguns und Hotspots

## 5.1 Kalender‑Repository Stabilität

Im Projektmaterial ist eine Auffälligkeit im Kalender‑Repository vermerkt, die auf inkonsistente Variablen im Scope hindeutet. Bei Änderungen rund um Kalenderdaten ist deshalb der erste Schritt immer, Build und Typecheck in diesem Pfad zu verifizieren, bevor neue Logik ergänzt wird.

## 5.2 Archivierung statt Löschen

Viele Entitäten sind fachlich als „archivierbar“ modelliert. Implementierungen dürfen nicht von physischem Löschen ausgehen, weil historische Zuordnungen erhalten bleiben müssen.

---

# 6. Verweise statt Duplikation

Für fachliche Details, Ablauftexte und vollständige Use‑Cases gilt: Diese Datei verweist nur.

Die maßgebliche Quelle für Feature‑ und Use‑Case‑Texte ist die zentrale Feature‑/Use‑Case‑Sammlung. In Architektur‑ und Implementierungsdokumenten wird maximal die technische Konsequenz (Invarianten, Validierung, Datenflüsse, Schnittstellen) beschrieben.
