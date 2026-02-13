# MuGPlan – Architektur (Ist‑Stand)

## Ziel dieses Dokuments

Dieses Dokument beschreibt den Ist‑Stand der MuGPlan‑Architektur so, dass ein fremder Entwickler nach dem Lesen verlässlich entscheiden kann, wo neuer Code hingehört, wie fachliche Regeln abgesichert werden, wie Daten zwischen Frontend und Backend fließen und welche bestehenden Patterns einzuhalten sind.

## Was gerade schiefgelaufen ist

In diesem Canvas‑Modus ist für Tool‑Änderungen nicht der Dateiname entscheidend, sondern das intern „aktive“ Dokument. Obwohl du im UI architecture.md ausgewählt hast, war für die Tool‑Schnittstelle weiterhin implementation.md das aktive Ziel. Deshalb sind meine letzten Änderungen versehentlich dort gelandet. Ich habe implementation.md jetzt ausdrücklich geschlossen und schreibe ab hier nur noch in dieses Architektur‑Dokument.

---

# 1. Systemüberblick

## 1.1 Komponenten

MuGPlan besteht aus einem Frontend und einem Backend.

Das Frontend ist eine React‑Single‑Page‑App in TypeScript, die Routing, UI‑Komposition, Formulare, Kalenderansichten und Interaktionen bereitstellt.

Das Backend ist ein Node.js/Express‑Server in TypeScript, der eine REST‑API anbietet, Fachregeln durchsetzt, Daten aggregiert und Persistenz über MySQL abwickelt.

## 1.2 Kommunikationsmodell

Die Kommunikation erfolgt über HTTP‑REST. Requests und Responses sind über geteilte Contracts typisiert. Serverseitige Validierung erfolgt gegen diese Contracts, und das Frontend verwaltet Server‑State mit React Query, sodass Queries und Mutationen mit gezielter Cache‑Invalidierung konsistent bleiben.

## 1.3 Laufzeitmodi

Im Development‑Modus wird Vite in den Server integriert, damit Frontend und Backend gemeinsam betrieben werden können und die Routing‑Fallbacks (Catch‑All) nicht die API‑Routen stören. Im Production‑Modus liefert der Server gebaute statische Assets aus.

---

# 2. Fachliche Domäne

## 2.1 Kernobjekte

Ein Kunde ist der Auftraggeber. Kunden besitzen Stammdaten und werden über ein Aktiv‑Flag archiviert, statt physisch gelöscht zu werden.

Ein Projekt ist die fachliche Klammer der Planung. Ein Projekt gehört genau zu einem Kunden. Projekte können eine Beschreibung (Markdown), Notizen, Anhänge und Statusinformationen tragen und können unabhängig von Terminen existieren.

Ein Termin ist die zeitliche Planungseinheit. Ein Termin gehört immer genau zu einem Projekt. Ein Termin besitzt ein Startdatum und optional ein Enddatum sowie optional eine Uhrzeit. Fehlt die Uhrzeit, wird der Termin als Ganztagstermin behandelt.

Ein Mitarbeiter ist eine Ressource, die Terminen zugeordnet werden kann. Mitarbeiter werden archiviert, damit historische Zuordnungen erhalten bleiben.

Teams und Touren sind Organisationsobjekte. Touren tragen Farbinformationen, die in der Kalenderdarstellung als wesentliches Orientierungsmittel verwendet werden.

Projektstatus sind farbige Statusdefinitionen, die Projekten zugeordnet werden können. Status werden im Kalenderkontext als angereicherte Projektinformation mitgeliefert, damit die UI ohne zusätzliche Requests sinnvoll visualisieren kann.

Notizen und Notizvorlagen sind eigenständige Objekte zur Dokumentation und Wiederverwendung. Notizen können Kunden und/oder Projekten zugeordnet werden.

Hilfetexte sind zentral gepflegte UI‑Inhalte, die über einen Key referenziert werden, sodass Layouts kontextsensitiv Hilfe anbieten können.

Projektanhänge sind projektbezogene Dateien, die über Upload‑Endpunkte verwaltet und in der UI als Panel in einer Seitenleiste angezeigt werden.

## 2.2 Beziehungen

Ein Kunde kann mehrere Projekte besitzen; ein Projekt gehört genau zu einem Kunden.

Ein Projekt kann mehrere Termine besitzen; ein Termin gehört genau zu einem Projekt.

Ein Termin kann optional einer Tour zugeordnet werden.

Ein Termin kann mehreren Mitarbeitern zugeordnet sein, und ein Mitarbeiter kann mehreren Terminen zugeordnet sein; diese Beziehung ist Many‑to‑Many.

Projekte können mit mehreren Projektstatus verknüpft sein.

Notizen können sowohl Kunden als auch Projekten Many‑to‑Many zugeordnet sein.

Anhänge sind projektspezifisch.

## 2.3 Fachregeln, die Architektur beeinflussen

Ein Termin ist fachlich nur gültig, wenn er einem Projekt zugeordnet ist. Flows zum Erstellen oder Verschieben von Terminen müssen diese Invariante sichern.

Ein Mitarbeiter darf nicht zeitlich überschneidend mehreren Terminen zugewiesen sein. Diese Hard-Rule bleibt fachlich verbindlich und muss bei Mehrbenutzer-Disposition serverseitig blockierend durchgesetzt werden, weil Client‑Prüfungen allein nicht genügen. Der aktuelle Ist‑Stand ist hierfür jedoch noch nicht zuverlässig verifiziert und die vollständige serverseitige Umsetzung ist nicht eindeutig bestätigt.

Termine gelten ab ihrem Startdatum als gesperrt. Nicht‑Admins dürfen gesperrte Termine nicht verändern; Admins dürfen weiterhin bearbeiten. Diese Regel ist sowohl Teil des API‑Contracts (Lock‑Information) als auch Teil der UI‑Interaktionslogik. Im aktuellen Ist‑Stand des Kalender‑/Terminbereichs wird die serverseitige Unterscheidung Admin/Nicht‑Admin jedoch über das vom Client gesendete Signal `x-user-role` getroffen; das ist kein autoritatives Rollen‑ oder Berechtigungsmodell.

---

# 3. Schichten und Verantwortlichkeiten

## 3.1 Frontend‑Schichten

Die UI folgt dem Prinzip, dass wiederverwendbare Bausteine strukturell sind. Layout‑ und Kompositionskomponenten definieren, wie Seiten aufgebaut werden, ohne fachliche Regeln zu enthalten.

Fachnahe Logik befindet sich in Hooks und Page‑Komponenten. Dort werden Query‑Keys, Requests, Interaktionsregeln (zum Beispiel Lock‑Handling) und der Übergang zwischen UI‑State und Server‑State implementiert.

## 3.2 Backend‑Schichten

Das Backend folgt einem Schichtenmodell aus Route‑Modulen, Controller‑Funktionen, Service‑Funktionen und Repository‑Funktionen.

Route‑Module registrieren Endpunkte und sind die zentrale Stelle, an der die API‑Oberfläche sichtbar wird.

Controller übernehmen Validierung und Request‑Parsing, halten die Schnittstelle zu Contracts stabil und geben definierte Fehlerformate zurück. Für JSON‑Requests erfolgt Parsing/Validierung über die Contract‑Definitionen (oder äquivalent in der Controller‑Schicht). Multipart‑Requests, insbesondere Datei‑Uploads, sind ein definierter Sonderfall: Parsing und technische Validierung laufen dort über Multipart‑Parser und Limits; Fehlerformate, Grenzwerte und Schichtgrenzen bleiben dabei einheitlich.

Services implementieren Fachregeln, Aggregation und Cross‑Entity‑Anreicherung.

Repositories kapseln konkrete Datenbankzugriffe und sorgen dafür, dass SQL‑/Drizzle‑Details nicht in Services diffundieren.

---

# 4. Datenflüsse

## 4.1 Kalenderdaten

Kalenderansichten arbeiten über ein Datumsintervall. Das Frontend berechnet für die jeweilige View ein from/to‑Intervall und lädt darüber aggregierte Termine.

Das Backend liefert Kalenderdaten nicht als „nackte Termine“, sondern angereichert um Projekt‑ und Kundendaten, Tour‑Informationen, Mitarbeiterlisten, Projektstatus und ein berechnetes Lock‑Flag. Dadurch sind die Views konsistent und vermeiden sekundäre Requests.

Für Erweiterungen gilt die Leitplanke, dass neue Informationen, die in allen Kalenderansichten benötigt werden, in der Kalender‑Aggregation ergänzt werden, anstatt in jeder View eigene Zusatzrequests zu bauen.

## 4.2 Mutationen und Konsistenz

Mutationen wie Terminverschiebung oder Terminbearbeitung werden im Frontend als React‑Query‑Mutations ausgeführt. Nach Erfolg werden die betroffenen Query‑Keys invalidiert, sodass die nächste Ansicht auf dem Server‑Iststand basiert.

Entscheidend ist dabei, dass der Server die fachliche Wahrheit bleibt. Das Frontend darf Optimistic Updates nur dort einsetzen, wo die Fachregeln nicht betroffen sind oder wo ein sauberer Rollback garantiert ist.

## 4.3 Uploads und Anhänge

Anhänge werden als Multipart‑Upload über dedizierte Endpunkte verarbeitet. Das Frontend zeigt Anhänge als Teil des Projekt‑Kontexts; das Backend verwaltet Speicherung, Metadaten und Löschlogik.

Für Erweiterungen bedeutet das, dass Dateien als „Nebenobjekte“ eines Projekts behandelt werden. Man ergänzt also nicht direkt an Projekten große Blob‑Felder, sondern nutzt das bestehende Attachment‑Konzept.

## 4.4 Fehler- und Validierungsmodell

Das Backend unterscheidet in der Praxis zwei Klassen von Fehlern. Validierungsfehler entstehen, wenn Requests nicht dem Contract entsprechen; diese müssen mit einem standardisierten Fehlerformat an das Frontend zurückgegeben werden, damit Formulare Feldfehler und globale Fehlermeldungen konsistent darstellen können.

Fachfehler entstehen, wenn ein Request formal korrekt ist, aber gegen Regeln verstößt, zum Beispiel gegen die Überschneidungsregel bei Mitarbeiterzuweisung oder gegen die Lock‑Regel. Auch diese Fehler müssen deterministisch und maschinenlesbar sein, damit die UI korrekt reagieren kann, statt nur „irgendwas“ anzuzeigen.

## 4.5 Rolleninformation als Request‑Kontext

Das autoritative Rollenmodell ist serverseitig und wird über die Datenbankbeziehungen `users -> roles` abgeleitet. Client‑seitige Header wie `x-user-role` sind keine Rollen‑ oder Autorisierungsquelle. Wenn solche Header im Ist‑Stand verwendet werden, gelten sie ausschließlich als nicht‑autoritatives Dev‑/Simulationssignal; daraus dürfen keine Berechtigungen, keine Freigaben und keine Sicherheitsentscheidungen abgeleitet werden. Eine Ablösung solcher Header erfolgt in einem späteren Schritt, sobald ein belastbarer Authentifizierungs‑ und Identitätskontext etabliert ist.

# 5. Erweiterungspunkte

## 5.1 Neue Screens

Neue Screens sollen sich an bestehende Layout‑ und Kompositionspatterns anlehnen. Ein neuer Screen ist idealerweise eine Page‑Komponente, die Daten über vorhandene Query‑Patterns lädt und UI über die etablierte Kompositionsschicht aufbaut.

Damit das gelingt, wird ein neuer Screen in der Regel so integriert, dass er erstens eine Route bekommt, zweitens eine Page‑Komponente bereitstellt, drittens die Datenzugriffe über Hooks kapselt und viertens Formulare und Panels aus der bestehenden Bausteinbibliothek zusammensetzt.

## 5.2 Neue API‑Endpunkte

Neue Endpunkte werden zunächst als Contract (Request/Response‑Schema) festgelegt. Danach werden sie als Route‑Modul registriert, im Controller validiert, im Service fachlich umgesetzt und im Repository persistent gemacht.

Eine sinnvolle Erweiterung verändert also nicht direkt Query‑Strings „irgendwo in der UI“, sondern ergänzt den Contract und führt den Endpunkt durch alle Schichten hindurch, damit Validierung, Fachlogik und Persistenz sauber getrennt bleiben.

## 5.3 Schema‑Änderungen

Schema‑Erweiterungen müssen Kardinalitäten und Löschverhalten explizit festlegen und dürfen Archivierungslogik nicht unterlaufen. Bei Many‑to‑Many‑Beziehungen sind Join‑Tabellen und referentielle Integrität konsistent fortzuführen.

## 5.4 Erweiterungen im Kalenderkontext

Kalenderfeatures sind systemkritisch, weil sie viele Objekte zusammenziehen und jede Inkonsistenz sofort sichtbar wird. Erweiterungen im Kalenderbereich werden deshalb bevorzugt so gebaut, dass die serverseitige Aggregation exakt die Daten liefert, die die Views benötigen. Die Views bleiben danach möglichst „dumm“ und rendern nur, was sie bekommen.

## 5.5 Erweiterungen im Projektkontext

Der Projekt‑Screen ist die natürliche Stelle für Nebenobjekte wie Notizen, Anhänge und Status. Neue Nebenobjekte sollten deshalb als eigene Entität mit klaren Endpunkten existieren und im Projekt‑Screen als Panel oder Tab integriert werden, statt Projekt selbst immer weiter aufzublähen.

# 6. Qualitäts‑ und Stabilitätsleitplanken

## 6.1 Keine Fachlogik in UI‑Basisbausteine

Wiederverwendbare UI‑Bausteine bleiben strukturell. Fachlogik gehört in Page‑Ebene und Services. Das ist eine harte Leitplanke, weil sonst wiederverwendbare Komponenten schnell zu „Sonderfällen‑Containern“ werden, die niemand mehr versteht.

## 6.2 Contracts sind die Wahrheit

Request‑ und Response‑Formate werden zentral festgelegt. Controller validieren strikt, und das Frontend konsumiert Daten nur über diese Contracts. Erweiterungen, die das Contract‑Prinzip umgehen, führen erfahrungsgemäß zu schleichender Inkonsistenz.

## 6.3 Archivierung statt Löschen

Kunden, Projekte und Mitarbeiter werden primär archiviert. Features dürfen nicht von physischem Löschen ausgehen. Historische Terminzuordnungen müssen auch bei archivierten Objekten lesbar bleiben.

## 6.4 Lock‑Regel ist serverseitig durchzusetzen

Die UI darf Locks respektieren und Interaktionen blockieren, aber die Durchsetzung muss serverseitig erfolgen. Andernfalls entstehen Manipulationsmöglichkeiten und schwer reproduzierbare Zustände. Im aktuellen Kalender‑/Termin‑Iststand ist diese Durchsetzung noch nicht belastbar autoritativ, weil die Rolleninformation serverseitig aus dem clientübermittelten Signal `x-user-role` stammt.

## 6.5 Kalenderdaten sind ein Aggregat

Kalenderdaten sind ein Aggregat aus mehreren Entitäten. Neue Felder, die für die Kalenderdarstellung relevant sind, gehören in die Aggregation, nicht in zusätzliche parallel laufende Requests.

## 6.6 Keine impliziten Abhängigkeiten zwischen Panels

Panels innerhalb eines Screens sollen über klar definierte Props und Query‑Hooks gekoppelt sein. Direkte Seiteneffekte zwischen Panels sind zu vermeiden, weil sie Debugging und Refactoring massiv erschweren.

# 7. Offene Punkte und Risiken im Ist‑Stand

## 7.1 Stabilität im Kalender‑Repository

In der Projektdokumentation ist eine Auffälligkeit im Kalender‑Repository vermerkt, die auf fehlende oder inkonsistente Variablen hindeutet. Weil dieser Pfad sowohl fachlich zentral als auch stark vernetzt ist, ist bei Arbeiten rund um Kalenderdaten der erste Schritt immer, Build und Typecheck in diesem Bereich zu verifizieren, bevor neue Logik ergänzt wird.

## 7.2 Dokumentations‑Lücke: Endpunktliste und Query‑Keys

Der Ist‑Stand der Architektur ist gut beschreibbar, aber für wirklich schnelle Feature‑Arbeit fehlt als nächster Ausbau eine explizite Zuordnung „welcher Screen nutzt welche Endpunkte“ und „welche Query‑Keys gelten als kanonisch“. Diese Lücke sollte im nächsten Schritt geschlossen werden, damit ein Fremdentwickler ohne Code‑Suche zuverlässig mutieren kann.

## 7.3 Rollen- und Auth‑Konzept ist aktuell minimal

Das autoritative Rollenmodell ist serverseitig über `users -> roles` definiert. Request‑Header wie `x-user-role` sind im Ist‑Stand lediglich ein technisches Dev‑/Simulationssignal und kein Berechtigungsmodell. Solange im Kalender‑/Terminbereich Rollenentscheidungen auf diesem Signal beruhen, existiert dort keine belastbare serverseitige Rollenbegrenzung.

---

# 8. Architektur‑Checkliste für neue Features

## 8.1 Entscheidung: Wo gehört die Logik hin

Wenn eine Regel fachlich relevant ist, gehört sie in den Service im Backend. Wenn sie nur die Darstellung betrifft, gehört sie in die Page‑Ebene im Frontend. Wenn sie Wiederverwendung betrifft, gehört sie in die Kompositions‑ und Layoutschicht.

## 8.2 Entscheidung: Welche Daten braucht die UI wirklich

Wenn eine View Daten benötigt, die logisch Teil des Kalenderaggregats sind, wird das Aggregat erweitert. Wenn es sich um projektbezogene Nebenobjekte handelt, wird eine eigene Entität gebaut und in den Projekt‑Screen integriert.

## 8.3 Entscheidung: Welche Konsistenzstrategie gilt

Wenn eine Mutation fachliche Regeln berührt, ist Optimistic UI die Ausnahme. In der Regel wird nach erfolgreichem Request invalidiert und erneut geladen.

# 9. Konkrete Zuordnung: UI‑Bereiche, Endpunkte und Datenverantwortung

## 9.1 Warum diese Zuordnung existiert

Damit ein Fremdentwickler ohne Ratespiel arbeiten kann, braucht er eine feste Landkarte, welche UI‑Bereiche welche Daten laden, welche Endpunkte mutieren und welche Stelle die fachliche Wahrheit hält. MuGPlan folgt hier dem Prinzip: Views laden aggregierte Daten, Mutationen passieren über dedizierte Endpunkte, und fachliche Regeln werden serverseitig durchgesetzt.

## 9.2 Kalenderbereich

Der Kalenderbereich besteht aus Monats‑, Wochen‑ und Jahresansicht. Alle drei Views nutzen dasselbe Grundmodell: Das Frontend berechnet ein Intervall (von/bis) und fordert Kalenderdaten als Aggregat an. Dieses Aggregat enthält die Termine plus Anreicherung (Projekt, Kunde, Tour, Mitarbeiter, Status, Lock‑Flag), sodass die Views nicht in einen „N+1 Request“-Modus geraten.

Mutationen im Kalenderbereich sind in der Regel Terminverschiebung und Terminbearbeitung. Terminverschiebung wird als Patch auf den Termin umgesetzt. Danach invalidiert das Frontend die zugehörigen Kalender‑Query‑Keys, sodass die Sicht wieder auf Server‑Wahrheit steht.

Die Lock‑Regel wirkt hier als Interaktionsbremse: Die UI blockiert Drag‑and‑Drop und Edit‑Aktionen, wenn der Termin gesperrt ist und der Nutzer nicht Admin ist. Gleichzeitig muss der Server dieselbe Regel erzwingen.

Im aktuellen Frontend-Renderstand gelten zusätzlich folgende Visualisierungsregeln, die ohne Backend-Änderung umgesetzt sind.

In der Wochenansicht werden Mehrtagestermine nicht mehr als inhaltsgleiche Karten je Tag gespiegelt. Stattdessen zeigt der Starttag die vollständige Karte, Folgetage zeigen ein Fortsetzungssegment ohne sichtbaren Karteninhalt (schraffiert). Alle Segmente eines Termins teilen sich einen gemeinsamen Hover-Highlight-State.

In der Monatsansicht werden Mehrtagestermine über Wochen-Lanes als durchgehende Balkensegmente pro Woche gerendert. Dadurch entsteht keine pro-Tag-Replikation des Balkens, sondern eine lane-basierte Wochengeometrie.

In Monat und Jahr folgt die Termin-Preview der Weekly-Karte: Das Popover nutzt `CalendarWeekAppointmentPanel` im nicht-interaktiven Modus (`interactive={false}`).

## 9.3 Projektbereich

Der Projektbereich ist der natürliche Ort für projektbezogene Nebenobjekte. Dazu zählen Notizen, Anhänge und Statusinformationen. Das Architekturprinzip ist, dass Nebenobjekte als eigene Entitäten mit eigenen Endpunkten existieren und im Projekt‑Screen als Panel oder Tab integriert werden, statt die Projektentität immer weiter aufzublähen.

Anhänge werden über Upload‑Endpunkte verwaltet und im Projektkontext angezeigt. Status wird als separate Definition gepflegt und über Zuordnungen Projekten zugewiesen.

## 9.4 Stammdatenbereiche

Kunden, Mitarbeiter, Teams, Touren und Statusdefinitionen sind Stammdaten. Sie werden in der Regel über Listen‑/Detail‑Screens verwaltet. Das konsistente Muster ist, dass diese Objekte primär archiviert werden, statt gelöscht. Ein neuer Screen oder eine neue Mutation muss dieses Archivierungsmodell respektieren.

---

# 10. Kanonische Query‑Strategie im Frontend

## 10.1 Grundprinzip

Server‑State wird über React Query verwaltet. Queries beschreiben Datenzustände, Mutationen verändern diese Zustände. Nach einer Mutation wird nicht „irgendwie“ lokal nachgebessert, sondern die betroffenen Queries werden invalidiert, damit der nächste Render den Server‑Iststand widerspiegelt.

## 10.2 Query‑Keys als Vertrag

Query‑Keys sind Teil der Architektur, weil sie steuern, welche Teile der UI konsistent bleiben. Kalender‑Queries sind an das Intervall und optionale Filter (zum Beispiel Mitarbeiter) gebunden. Projekt‑Queries sind an die Projekt‑ID gebunden. Stammdaten‑Queries sind an Aktiv‑Filter gebunden.

Für Erweiterungen ist die Leitplanke, neue Query‑Keys nicht ad hoc in Komponenten zu erfinden, sondern in einem zentralen Hook‑Bereich festzulegen, damit alle Stellen dieselbe Semantik teilen.

---

# 11. Ende‑zu‑Ende‑Beispiel: Termin verschieben mit Lock und Fachfehlern

## 11.1 Ablauf ohne Lock

Die UI startet Drag‑and‑Drop. Aus der Zielposition berechnet sie das neue Datum beziehungsweise den neuen Zeitraum. Danach sendet sie eine Mutation (Patch) an den Terminendpunkt. Der Server validiert den Request gegen den Contract und führt im Service die Fachprüfungen aus. Ist alles gültig, persistiert das Repository die Änderung. Anschließend invalidiert das Frontend die Kalender‑Queries für das betroffene Intervall und lädt neu.

## 11.2 Ablauf mit Lock

Vor dem Start des Drags prüft die UI das Lock‑Flag. Wenn der Termin gesperrt ist und der Nutzer kein Admin ist, wird die Interaktion blockiert und es erfolgt keine Mutation. Im aktuellen Ist‑Stand basiert die serverseitige Lock‑Entscheidung dabei auf dem nicht‑autoritativen Signal `x-user-role` und stellt daher noch keine belastbare Berechtigungsprüfung dar.

## 11.3 Ablauf bei Überschneidungsfehler

Wenn das Verschieben dazu führt, dass ein Mitarbeiter zeitlich überschneidend mehreren Terminen zugeordnet wäre, ist die fachliche Zielregel eine serverseitig blockierende Ablehnung mit fachlichem Fehler. Der aktuelle Ist‑Stand dieser serverseitigen Konfliktblockierung ist jedoch noch nicht zuverlässig verifiziert beziehungsweise nicht vollständig umgesetzt; die UI-Darstellung eines Konfliktfehlers ist daher als Zielverhalten zu lesen.

---

# 12. Fremdentwickler‑Perspektive: Reicht das, um Features sauber zu integrieren

Ein Fremdentwickler kann nach diesem Dokument erstens erkennen, dass MuGPlan kein Komponenten‑Spaghetti, sondern eine bewusst getrennte Architektur besitzt, in der UI‑Komposition strukturell ist, der Server die fachliche Wahrheit hält und Persistenz in Repositories gekapselt ist.

Er kann zweitens entscheiden, wie ein neues Feature zu schneiden ist. Wenn es kalenderrelevant ist, erweitert er die serverseitige Aggregation und hält die Views schlank. Wenn es projektbezogen ist, baut er es als Nebenobjekt mit eigener Entität und integriert es im Projekt‑Screen. Wenn es Stammdaten betrifft, respektiert er Archivierung statt Löschen.

Er kann drittens Konfliktstellen vorab einschätzen. Er weiß, dass Lock‑Regeln und Überschneidungsregeln nicht nur UI‑Kosmetik sind, sondern serverseitig durchgesetzt werden müssen. Er weiß, dass Konsistenz über Invalidation statt stiller UI‑Korrektur erreicht wird.

Was für wirklich „blindes“ Implementieren noch fehlt, ist eine präzise, maschinenlesbare Liste konkreter Endpunktpfade, Payload‑Schemas und Query‑Key‑Definitionen. Diese Informationen sind implementierungsnah und können im nächsten Schritt entweder als Appendix in dieses Architektur‑Dokument oder als kleines, gezielt gepflegtes „API‑Index“-Kapitel ergänzt werden, ohne in eine zweite Implementierungsdokumentation abzudriften.

---

# Teil C – Appendix (Arbeitsmaterial für Weiterentwicklung)

Dieser Appendix ist bewusst pragmatisch gehalten. Er bündelt die Dinge, die man beim Implementieren neuer Features sofort braucht: Endpunkte, Query-Keys und eine grobe Modul-Landkarte. Wo der Dump keine eindeutigen Informationen liefert, ist das explizit als „zu verifizieren“ markiert, damit keine Phantom-Schnittstellen entstehen.

## C1. REST-Endpunkte (Ist-Stand)

Die Server-Routen werden in `server/routes.ts` registriert und in einzelnen Route-Modulen unter `server/routes/*Routes.ts` an Express gehängt. Die eigentlichen Path-Strings liegen zentral im Shared-Contract `shared/routes.ts` unter `api.*.path`.

Im Projekt-Dump sind die folgenden Endpunktgruppen nachweisbar (inkl. HTTP-Methode und typischer Pfadform). Die konkrete Path-Quelle ist jeweils `shared/routes.ts` und wird in den Route-Dateien als `api.<bereich>.<aktion>.path` referenziert.

### C1.1 Calendar / Appointments

* `GET /api/calendar/appointments` (Range-Query; Query: `fromDate`, `toDate`, optional `employeeId`).
* `GET /api/appointments/list` (Terminliste; Filter + Paging).
* `GET /api/appointments/:id`.
* `POST /api/appointments`.
* `PATCH /api/appointments/:id`.
* `DELETE /api/appointments/:id`.
* `GET /api/projects/:projectId/appointments` (Projekt-Terminsicht; Pfadbezeichner im Contract: `api.projectAppointments.list`).

### C1.2 Customers / Customer Notes

* `GET /api/customers`.

* `GET /api/customers/:id`.

* `POST /api/customers`.

* `PATCH /api/customers/:id`.

* `GET /api/customers/:customerId/notes`.

* `POST /api/customers/:customerId/notes`.

* `DELETE /api/customers/:customerId/notes/:noteId`.

### C1.3 Notes / Note Templates

* `PUT /api/notes/:noteId`.

* `PATCH /api/notes/:noteId/pin`.

* `GET /api/note-templates`.

* `POST /api/note-templates`.

* `PUT /api/note-templates/:id`.

* `DELETE /api/note-templates/:id`.

### C1.4 Projects / Project Notes / Attachments

* `GET /api/projects`.

* `GET /api/projects/:id`.

* `POST /api/projects`.

* `PATCH /api/projects/:id`.

* `DELETE /api/projects/:id`.

* `GET /api/projects/:projectId/notes`.

* `POST /api/projects/:projectId/notes`.

* `DELETE /api/projects/:projectId/notes/:noteId`.

* `GET /api/projects/:projectId/attachments`.

* `POST /api/projects/:projectId/attachments` (Multipart-Upload, Field `file`).

* `DELETE /api/project-attachments/:id` (absichtlich blockiert, `405`).

* `GET /api/project-attachments/:id/download` (optional Query `download=1`).

### C1.5 Employees

* `GET /api/employees` (Query `active=false|all` ist im Controller ersichtlich).
* `GET /api/employees/:id`.
* `POST /api/employees`.
* `PUT /api/employees/:id`.
* `PATCH /api/employees/:id/active`.
* `GET /api/employees/:id/current-appointments` (Query `fromDate` optional).

### C1.6 Teams / Tours und Zuordnungen

* `GET /api/teams`.

* `POST /api/teams`.

* `PATCH /api/teams/:id`.

* `DELETE /api/teams/:id`.

* `GET /api/tours`.

* `POST /api/tours`.

* `PATCH /api/tours/:id` (Farbe/Attribute).

* `DELETE /api/tours/:id`.

* `GET /api/team-employees`.

* `POST /api/team-employees/assign`.

* `DELETE /api/team-employees/remove`.

* `GET /api/tour-employees`.

* `POST /api/tour-employees/assign`.

* `DELETE /api/tour-employees/remove`.

### C1.7 Project Status und Beziehungen

* `GET /api/project-status`.

* `POST /api/project-status`.

* `PUT /api/project-status/:id`.

* `PATCH /api/project-status/:id/active`.

* `DELETE /api/project-status/:id`.

* `GET /api/project-status-relations`.

* `POST /api/project-status-relations/add`.

* `DELETE /api/project-status-relations/remove`.

### C1.8 Help Texts

* `GET /api/help-texts/key/:helpKey`.
* `GET /api/help-texts` (Query `query` optional).
* `GET /api/help-texts/:id`.
* `POST /api/help-texts`.
* `PUT /api/help-texts/:id`.
* `PATCH /api/help-texts/:id/active`.
* `DELETE /api/help-texts/:id`.

### C1.9 Events

* `GET /api/events`.
* `POST /api/events`.
* `DELETE /api/events/:id`.

## C2. Request-Konventionen

### C2.1 Datumsformate

Für Kalender- und einige Listen-Endpoints wird ein Date-only-Format `YYYY-MM-DD` verwendet. Für den Kalender ist `fromDate`/`toDate` verpflichtend, und `toDate` darf nicht vor `fromDate` liegen.

### C2.2 Rollen-Header (nicht autoritativ)

Der Header `x-user-role` (z. B. `ADMIN`) kann im Ist‑Stand als technisches Dev‑/Simulationssignal auftreten, insbesondere im Kalender‑/Terminfluss. Er ist keine autoritative Rollen‑ oder Autorisierungsquelle; Berechtigungen und Sicherheitsentscheidungen dürfen daraus nicht abgeleitet werden.

## C3. React Query: Query Keys und Invalidierung

Das Projekt nutzt TanStack React Query als Server-State-Schicht. In den vorhandenen Quellen ist der Kalender-Key explizit benannt; für weitere Bereiche ist die Existenz von Query-Keys implizit, die konkreten Key-Arrays müssen bei Bedarf im jeweiligen Hook/Lib-Modul geprüft werden.

### C3.1 Nachweisbarer Query-Key

* `calendarAppointments` (verwendet im Hook `useCalendarAppointments` in `client/src/lib/calendar-appointments.ts`).

### C3.2 Praxisregel für neue Keys

Neue Query-Keys sollten als stabile, serialisierbare Arrays definiert werden. Range- und Filter-Parameter gehören in den Key (z. B. `['calendarAppointments', { fromDate, toDate, employeeId }]`), damit Cache und Invalidierung nicht „zu breit“ werden.

### C3.3 Invalidierung

Mutationen, die Termine verändern (Create/Update/Delete, Drag-and-Drop) invalidieren mindestens den Kalender-Key, damit alle Ansichten konsistent neu laden. In den bestehenden Beschreibungen ist dieses Pattern explizit Teil des Workflows.

## C4. Modul-Landkarte (Orientierung für Fremdentwickler)

Diese Landkarte ist kein vollständiges Verzeichnis, sondern ein Navigationskompass: „Wo suche ich was?“ Die Pfade sind die, die in den Projektartefakten explizit genannt werden.

### C4.1 Frontend – Seiten, Komposition, Domain-Komponenten

Die Screens liegen überwiegend unter `client/src/components/*` und nutzen Layout-/Kompositionskomponenten unter `client/src/components/ui/*`.

Listen- und Verwaltungsseiten (Ist-Stand):

* `client/src/components/HelpTextsPage.tsx` (Board + Tabelle, ViewMode persistiert).
* `client/src/components/ProjectsPage.tsx` (Board + Tabelle, ViewMode persistiert, `tableOnly`-Modus für Picker).
* `client/src/components/CustomersPage.tsx` (Board + Tabelle, ViewMode persistiert, `tableOnly`-Modus für Picker).
* `client/src/components/EmployeesPage.tsx` (Board + Tabelle, ViewMode persistiert).
* `client/src/components/NoteTemplatesPage.tsx` (Board-only).
* `client/src/components/ProjectStatusList.tsx` (Board-only über `ProjectStatusListView`).
* `client/src/components/TeamManagement.tsx` (Board-only).
* `client/src/components/TourManagement.tsx` (Board-only).
* `client/src/components/AppointmentsListPage.tsx` (Tabelle-only; eigener Navigationspunkt "Terminliste").

Dialog-/Picker-Listen:

* `client/src/components/EmployeePickerDialogList.tsx` (`ListLayout` + `TableView`).
* `client/src/components/EmployeeAppointmentsTableDialog.tsx` (`ListLayout` + `TableView`).
* `client/src/components/AppointmentForm.tsx` nutzt `ProjectsPage` mit `tableOnly`.
* `client/src/components/ProjectForm.tsx` nutzt `CustomersPage` mit `tableOnly`.

Kalender:

* Wrapper: `client/src/components/CalendarGrid.tsx`, `client/src/components/WeekGrid.tsx`.
* Views: `client/src/components/calendar/CalendarMonthView.tsx`, `.../CalendarWeekView.tsx`, `.../CalendarYearView.tsx`.
* Filter: `client/src/components/calendar/CalendarEmployeeFilter.tsx`.
* Termin-Bausteine: `client/src/components/calendar/CalendarAppointmentCompactBar.tsx`, `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`.
* Details/Popover: `client/src/components/calendar/CalendarAppointmentPopover.tsx` (rendert die Weekly-Card `CalendarWeekAppointmentPanel` im read-only Modus).
* Wochenansicht Mehrtagestermine: `client/src/components/calendar/CalendarWeekView.tsx` rendert Startsegment als volle Karte und Folgesegmente als `segment="continuation"` mit schraffierter Fortsetzungsdarstellung.
* Monatsansicht Mehrtagestermine: `client/src/components/calendar/CalendarMonthView.tsx` verwendet Wochen-Lanes mit `startIndex`/`endIndex` und positioniert durchgehende Balkensegmente pro Woche.

Panels (Sidebars/Details):

* `client/src/components/AppointmentsPanel.tsx`.
* `client/src/components/CustomerAppointmentsPanel.tsx`.
* `client/src/components/EmployeeAppointmentsPanel.tsx`.
* `client/src/components/ProjectAppointmentsPanel.tsx`.
* `AppointmentsPanel` ist im Ist-Stand upcoming-only (kein Show-All-Toggle); `EmployeeAppointmentsPanel` begrenzt auf 5 Einträge und kann optional eine "Mehr anzeigen"-Aktion über Callback einblenden.

### C4.2 Frontend – UI-Kompositionsschicht

* `client/src/components/ui/list-layout.tsx`.
* `client/src/components/ui/board-view.tsx`.
* `client/src/components/ui/table-view.tsx`.
* `client/src/components/ui/hover-preview.tsx` (Row-Hover-Preview für Tabellen).
* `client/src/components/ui/entity-card.tsx` und Wrapper `client/src/components/ui/colored-entity-card.tsx`.
* Dialog-Kette für Editing/Selection: `client/src/components/ui/entity-edit-dialog.tsx`, `.../color-select-entity-edit-dialog.tsx`, `.../employee-select-entity-edit-dialog.tsx`.
* Filter-Baustein: `client/src/components/ui/search-filter-input.tsx`.
* Sidepanel-Struktur: `client/src/components/ui/sidebar-child-panel.tsx`.

Badges:

* `client/src/components/ui/info-badge.tsx` und Spezialisierungen: `colored-info-badge.tsx`, `person-info-badge.tsx`, `customer-info-badge.tsx`, `employee-info-badge.tsx`, `project-info-badge.tsx`, `termin-info-badge.tsx`.

### C4.3 Frontend – Datenzugriff / Hooks

* Kalenderdaten: `client/src/lib/calendar-appointments.ts`.
* Kalender-Hilfen: `client/src/lib/calendar-utils.ts`.

Weitere Data-Layer-Module sind im Dump nicht konsistent dokumentiert und müssen bei Bedarf über die tatsächlichen Imports in den Screens identifiziert werden.

### C4.4 Backend – Routes, Controller, Services, Repositories

Routenregistrierung:

* `server/routes.ts` registriert alle Route-Module.

Routes:

* `server/routes/appointmentsRoutes.ts`.
* `server/routes/customersRoutes.ts`, `server/routes/customerNotesRoutes.ts`.
* `server/routes/projectsRoutes.ts`, `server/routes/projectNotesRoutes.ts`, `server/routes/projectAttachmentsRoutes.ts`.
* `server/routes/employeesRoutes.ts`.
* `server/routes/teamsRoutes.ts`, `server/routes/teamEmployeesRoutes.ts`.
* `server/routes/toursRoutes.ts`, `server/routes/tourEmployeesRoutes.ts`.
* `server/routes/projectStatusRoutes.ts`, `server/routes/projectStatusRelationsRoutes.ts`.
* `server/routes/helpTextsRoutes.ts`.
* `server/routes/noteTemplatesRoutes.ts`, `server/routes/notesRoutes.ts`.
* `server/routes/eventsRoutes.ts`.

Controller/Service/Repository (Beispiel Kalender-Terminfluss, explizit dokumentiert):

* Controller: `server/controllers/appointmentsController.ts`.
* Service: `server/services/appointmentsService.ts`.
* Repository: `server/repositories/appointmentsRepository.ts`.
* Repository (Status-Aggregation): `server/repositories/projectStatusRepository.ts`.

Shared Contracts:

* `shared/routes.ts` (API-Contracts inkl. Zod).
* `shared/schema` (Drizzle-Schema + Typen für den MySQL-basierten Persistenzstack; Backend-Zugriff über Drizzle ORM und mysql2).

## C5. Offene Punkte, die bewusst nicht „phantasiert“ werden

Die folgenden Punkte sind für Architektur- und Implementierungsarbeit relevant, können aber aus den vorhandenen Quellen nicht zweifelsfrei hergeleitet werden und sollten bei Gelegenheit direkt im Code verifiziert werden.

Eine vollständig zentrale Liste aller React‑Query‑Keys außerhalb des Kalenders ist im Dump nicht als einheitlicher Index sichtbar. Gleichzeitig existieren außerhalb des Kalenders bereits nachweisbar stabile Query‑Keys, mindestens im Attachments‑Wrapper‑Pattern (Projekt/Customer/Employee). Vollständiges wouter‑Routing (konkrete Pfade) ist ebenfalls nicht in einem einzigen, eindeutig extrahierbaren Snippet enthalten. Historische Relativierungen zur Datenbanktechnologie sind vom aktuellen Ist‑Stand zu trennen: Der Ist‑Stand ist MySQL mit Drizzle ORM und mysql2.

---

## C6. Frontend‑Routing und Navigationspunkte (zu verifizieren)

MuGPlan nutzt wouter für Routing. In den vorhandenen Dokumenten ist die Screen‑Landkarte über Navigationspunkte und Komponentenpfade gut ableitbar, die exakten URL‑Pfadstrings sollten jedoch in der zentralen Router‑Datei (App‑Shell) verifiziert werden.

Als belastbarer Ist‑Stand gelten folgende „Navigationspunkte → Screen‑Komponenten“.

Der Home‑Bereich rendert den Kalender und bindet den globalen Mitarbeiterfilter ein. Die drei Kalenderansichten bestehen aus `CalendarMonthView`, `CalendarWeekView` und `CalendarYearView`, und der Filter ist `CalendarEmployeeFilter`.

Die Listen- und Verwaltungsseiten basieren verbindlich auf `ListLayout` als Shell. Board-Ansichten werden ausschließlich über `BoardView` gerendert, Tabellenansichten ausschließlich über `TableView`.

Detailseiten werden über Form-Screens und Sidepanels umgesetzt (`ProjectForm`, `CustomerData`, `AppointmentForm`), nicht über eine eigenständige Mitarbeiter-Detailseite.

Navigationspunkte im Home-/Sidebar-Flow:

* Kalender: `month`, `week`, `year`.
* Terminliste: `appointmentsList`.
* Projektplanung: `projectList`, `project`, `customerList`, `customer`.
* Mitarbeiterverwaltung: `employees`, `teams`, `tours`.
* Administration: `noteTemplates`, `projectStatus`, `helpTexts`, `settings`, `demoData`.

Für neues Routing ist die Leitplanke, dass ein neuer Screen nicht „irgendwo“ gerendert wird, sondern als eigener Navigationspunkt mit klarer Route und konsistentem Layoutmuster eingeführt wird.

---

## C7. Fehler- und Response‑Formate (Ist‑Stand)

MuGPlan unterscheidet praktisch drei Fehlerklassen, die im Backend verschieden behandelt werden und deshalb im Frontend konsistent interpretiert werden müssen.

Validierungsfehler entstehen, wenn Request‑Body oder Query nicht dem Zod‑Contract entsprechen. Die zentrale Helper‑Funktion `handleZodError` antwortet in diesem Fall mit HTTP 400 und einem JSON‑Body, der mindestens `message` sowie ein Feld `field` enthält, das aus dem Zod‑Path gebildet wird.

Fachfehler entstehen, wenn der Request formal korrekt ist, aber gegen Regeln verstößt, insbesondere im Terminbereich. Im Appointment‑Controller wird hierfür ein domänenspezifischer Error‑Typ aus dem Service erkannt (AppointmentError) und dann mit dem im Error enthaltenen HTTP‑Status sowie `{ message }` beantwortet. Für die Sperrlogik ist das im Ist‑Stand nachweisbar; für die serverseitige Überschneidungsblockierung bei Mitarbeiterzuweisungen ist der Nachweis im aktuellen Stand nicht eindeutig abgeschlossen.

Nicht‑Gefunden‑Fehler sind explizit als 404 mit `{ message }` umgesetzt.

Für neue Features gilt die Leitplanke, dass Validierung für JSON‑Requests über Contracts erfolgt; Multipart‑Requests bleiben als technischer Sonderfall mit Parser/Limits in der Controller‑Schicht zulässig. Fachfehler werden als explizite, maschinenlesbare Service‑Errors modelliert, und Controller erfinden keine „freien Textfehler“, die UI nicht konsistent interpretieren kann.

---

## C8. Contract‑Index (shared/routes.ts) als Architekturvertrag

Die API‑Oberfläche wird nicht in Route‑Dateien „per Hand“ definiert, sondern über `shared/routes.ts` als Contract‑Index. Route‑Module referenzieren diesen Index als `api.<bereich>.<aktion>.path`, und Controller parsen Input über `api.<bereich>.<aktion>.input.parse(...)`.

Für Erweiterungen ist der wichtigste Punkt, dass ein neuer Endpunkt immer in drei Schritten entsteht.

Erstens wird im Contract‑Index eine neue Definition ergänzt, bestehend aus `path`, `input` und typischerweise einer `output`‑Definition.

Zweitens wird der Endpunkt in einem Route‑Modul registriert, indem exakt dieser Contract‑Path verwendet wird.

Drittens parst der Controller bei JSON‑Requests über das Contract‑Schema und delegiert dann an Service/Repository. Für Multipart‑Requests nutzt die Controller‑Schicht den vorgesehenen Multipart‑Parser mit Grenzwerten als definierten Sonderfall.

Dieses Vorgehen verhindert Abweichungen zwischen Client‑Erwartung und Server‑Implementierung und ist deshalb als Architekturvertrag zu behandeln.

---

## C9. Kanonischer Kalender‑Datenfluss als Referenz

Der Kalenderbereich ist der am besten dokumentierte End‑to‑End‑Flow und kann als Referenz dienen, wie MuGPlan neue Features „richtig“ schneidet.

Der Datenfluss beginnt im Home‑Bereich, der `currentDate` und `employeeFilterId` verwaltet und diese Props an die drei Views weiterreicht. Alle Views nutzen denselben Hook `useCalendarAppointments`, der das Range‑Interval an den Endpunkt `/api/calendar/appointments` sendet.

Auf der Serverseite wird der Request in `appointmentsController.listCalendarAppointments` validiert, im Service aggregiert (`appointmentsService.listCalendarAppointments`) und in Repositories aufgelöst (`appointmentsRepository.*`, `projectStatusRepository.*`). Der Service reichert die Termine um Projekt, Kunde, Tour, Mitarbeiter, Projektstatus und Lock‑Flag an.

Für neue Kalenderfeatures gilt die Leitplanke, dass zusätzliche darstellungsrelevante Informationen in dieser Aggregation ergänzt werden, statt neue View‑spezifische Zusatzrequests einzuführen.

---

## C10. Frontend-Baseline: ListLayout-Architektur (verbindlich)

`ListLayout` ist die verpflichtende Shell für Listen- und table-only Screens. Die Komponente definiert Header, optionalen Filter-Slot, Content-Slot und optionalen Footer-Slot.

Öffentliche Frontend-Typen/Interfaces:

* `ListLayoutProps`
* `BoardViewProps`
* `TableViewColumnDef<T>`
* `TableViewProps<T>`

Architekturvertrag `ListLayout`:

* `contentSlot` ist verpflichtend.
* `filterPlacement` steuert die Position des `filterSlot` (`top` oder `bottom`), Default ist `bottom`.
* `viewModeToggle` sitzt im Header-Aktionsbereich.
* `viewModeKey` ist der stabile Identifikator für view-spezifische Kontexte.
* Loading-State wird zentral im Shell-Wrapper gerendert.

`BoardView` ist der einzige Board/Grid-Renderer:

* Dynamische Spalten werden über das Setting `cardListColumns` (2..6) aufgelöst.
* `gridCols="2"` erzwingt den zweispaltigen Sonderfall.
* Empty-State und Toolbar sind strukturierte Slots.

`TableView<T>` ist der einzige Tabellen-Renderer:

* Typisierte Spalten über `TableViewColumnDef<T>`.
* Kein `onRowClick`; Interaktion ausschließlich über `onRowDoubleClick`.
* Optionales Hover-Preview über `rowPreviewRenderer` (intern via `HoverPreview`).
* Empty-State, Sticky-Header und Dichteverhalten sind Teil des generischen Vertrags.

Screen-Matrix (Ist-Stand):

* Board + Tabelle (mit persistiertem ViewMode): `HelpTextsPage`, `ProjectsPage`, `CustomersPage`, `EmployeesPage`.
* Board-only: `NoteTemplatesPage`, `TeamManagement`, `TourManagement`, `ProjectStatusList`.
* Tabelle-only: `AppointmentsListPage`, `EmployeePickerDialogList`, `EmployeeAppointmentsTableDialog`.

Persistierte ViewModes (Settings-Keys):

* `helptexts.viewMode`
* `projects.viewMode`
* `customers.viewMode`
* `employees.viewMode`

Legacy-Status:

* Es gibt keine aktive CardList-Architektur mehr.
* Es existiert keine Adapter-/Remapping-Schicht zwischen alt und neu.

---

## C11. Terminliste: Datenfluss und Schichtschnitt

Die Terminliste ist ein table-only End-to-End-Flow mit Contract-First-Schnitt:

* Contract: `api.appointments.list` in `shared/routes.ts`.
* Route: `GET /api/appointments/list` in `server/routes/appointmentsRoutes.ts`.
* Controller: `appointmentsController.listAppointmentsList`.
* Service: `appointmentsService.listAppointmentsList`.
* Repository: `appointmentsRepository.listAppointmentsForList`.
* Frontend-Screen: `client/src/components/AppointmentsListPage.tsx`.

Filter-/Paging-Modell:

* Filter: `employeeId`, `projectId`, `customerId`, `tourId`, `dateFrom`, `dateTo`, `allDayOnly`, `withStartTimeOnly`, `singleEmployeeOnly`, `lockedOnly`.
* Paging: `page` (Default 1), `pageSize` (Default 25).
* Frontend setzt bei jeder Filteränderung die Seite deterministisch auf `1` zurück.

Konsistenzmodell:

* Backend liefert serverseitig paginiertes Ergebnis (`items`, `total`, `totalPages`).
* Frontend-Sortierung für sichtbare Tabellen-Spalten erfolgt UI-seitig auf der jeweiligen Seite.
* Row-Hover-Preview nutzt die bestehende Weekly-Preview-Komponente.

---

# Teil D - Architektur-Erweiterung FT (18): User Settings mit Scopes GLOBAL/ROLE/USER

Dieser Teil dokumentiert den nachträglich eingeführten Architekturstand für FT (18). Er ist bewusst explizit, weil das Feature mehrere Querschnittsaspekte berührt: Contract-First API, Scope-Auflösung, Rollenkanonisierung, Persistenzstrategie und Frontend-State-Modell.

## D1. Zweck und Einordnung im Gesamtsystem

FT (18) führt eine read-only Settings-Infrastruktur ein, deren Primärziel nicht ein sofortiger Edit-Flow ist, sondern ein belastbares Fundament für spätere Schreibpfade und generische Settings-UIs.

Die Architekturentscheidung lautet: Settings werden serverseitig aufgelöst und als wirksame Werte inkl. Herkunft geliefert. Das Frontend berechnet keine Defaults, keine Scope-Priorisierung und keine Rollenlogik lokal.

Damit bleibt die fachliche Wahrheit auf dem Server, konsistent mit den bestehenden Leitplanken für MuGPlan.

## D2. Domaenenmodell für Settings

Ein Setting ist ein Registry-definiertes Artefakt mit:

- eindeutigem Key,
- Typdefinition,
- Defaultwert,
- Validierung,
- Anzeige-Metadaten,
- erlaubten Scopes (`allowedScopes`).

Für die ListLayout-Architektur sind insbesondere folgende produktive Keys relevant:

* `cardListColumns` (Board-Spaltensteuerung).
* `helptexts.viewMode`.
* `projects.viewMode`.
* `customers.viewMode`.
* `employees.viewMode`.

## D3. Scope-Modell und deterministische Auflösung

FT (18) nutzt drei Persistenz-Scopes:

- `GLOBAL`
- `ROLE`
- `USER`

Die wirksame Auflösung ist strikt und unveränderlich:

1. `USER`
2. `ROLE`
3. `GLOBAL`
4. `DEFAULT` (Registry)

Damit ist das System deterministisch. Es gibt keine Mehrrollen-Prioritätsmatrix und keine konfigurierbare Auflösungsreihenfolge.

## D4. Rollenquelle, Rollenkanonisierung und Determinismus

Die Rollenquelle für FT (18) ist ausschließlich serverseitig:

- User wird über `users` bestimmt,
- Rolle über Relation `users.role_id -> roles.id`.

Die DB-Codes bleiben wie im Schema: `READER`, `DISPATCHER`, `ADMIN`.

Für API/Resolver wird auf die kanonische Menge gemappt:

- `READER -> LESER`
- `DISPATCHER -> DISPONENT`
- `ADMIN -> ADMIN`

Resolver und Frontend-Darstellung arbeiten danach mit den kanonischen Werten. Dieses Mapping ist eine Darstellungs-/API-Normalisierung und nicht die DB-Wahrheit. Persistenz auf ROLE-Ebene bleibt beim DB-Code (siehe D5), also beim Rollen-`code` und nicht bei einer numerischen `role_id`.

Wenn kein valider User-Kontext oder keine eindeutig mappbare Rolle vorliegt, wird der Request abgelehnt, um deterministisches Verhalten zu garantieren.

## D5. Persistenzarchitektur

### D5.1 Tabelle

Settingswerte werden in einer generischen Tabelle `user_settings_value` gespeichert, mit mindestens:

- `setting_key`
- `scope_type` (`GLOBAL|ROLE|USER`)
- `scope_id`
- `value_json`
- `updated_at`
- optional `updated_by`

Unique-Constraint:

- `(setting_key, scope_type, scope_id)`

### D5.2 Scope-ID-Konventionen

Konventionen sind hart und stackweit identisch:

- GLOBAL: `scope_id = "global"` (kein `NULL`)
- ROLE: `scope_id = DB-Rollencode` (`READER|DISPATCHER|ADMIN`)
- USER: `scope_id = userId` (string-normalisiert)

Diese Konvention verhindert ambige Persistenzzustände und reduziert Mapping-Komplexität im Repository.

## D6. Contract-First API-Oberfläche

Es wurde ein kombinierter Read-Endpunkt eingeführt:

- `GET /api/user-settings/resolved`

Die Response liefert pro Key:

- Definition/Metadaten (z. B. `key`, `label`, `description`, `type`, `constraints`, `allowedScopes`)
- Scope-Werte (`globalValue?`, `roleValue?`, `userValue?`)
- `defaultValue`
- `resolvedValue`
- `resolvedScope` (`USER|ROLE|GLOBAL|DEFAULT`)
- Rollentransparenz (`roleCode`, `roleKey`)

Damit kann die UI die Herkunft eines wirksamen Werts transparent anzeigen, ohne Resolverlogik zu duplizieren. `defaultValue` und die Definitions-/Metadaten stammen aus der Registry; persistierte Scope-Werte stammen aus `user_settings_value`.

## D7. Backend-Schichten in FT (18)

FT (18) wurde entlang der Standardtrennung umgesetzt:

- Route: `server/routes/userSettingsRoutes.ts`
- Controller: `server/controllers/userSettingsController.ts`
- Service: `server/services/userSettingsService.ts`
- Repository:
  - `server/repositories/userSettingsRepository.ts` (Settings-Kandidaten)
  - `server/repositories/usersRepository.ts` (User->Role Lookup)
- Registry:
  - `server/settings/registry.ts`

Die Routenregistrierung erfolgt zentral in `server/routes.ts`, konsistent mit dem restlichen System.

## D8. User-Kontext und aktueller Übergangsstatus

Die Zielarchitektur sieht echten Auth-Kontext vor (`req.userId` aus Auth-Middleware). Im aktuellen Ist-Stand von FT (18) wird `req.userId` übergangsweise über `SETTINGS_USER_ID` gesetzt (`requestUserContext`), damit die Resolverstrecke gegen reale DB-Daten testbar bleibt. Diese UserId-Injektion ist ein Entwicklungs-/Übergangsmechanismus und ersetzt keine Authentifizierung und keine Session.

Wichtig: Trotz Übergang ist die Rollenauflösung für Settings weiterhin autoritativ serverseitig DB-basiert (`users -> roles`) und nicht aus Client-Headern abgeleitet. "Serverseitig" bedeutet hier die autoritative Rollenquelle aus der DB, nicht bereits einen vollständig authentifizierten Session-Kontext.

## D9. Frontend-Architektur für read-only Settings

FT (18) erweitert das Frontend um einen zentralen Server-State-Zugriff:

- `SettingsProvider` als globaler Provider über React Query.
- `useSettings`/`useSetting` als standardisierte Hook-Oberfläche.
- `SettingsPage` als read-only Landing-Page.

Integration erfolgt über den bestehenden Menüpunkt "Einstellungen" im vorhandenen Home/View-Flow. Es wurde kein paralleler Navigationspfad eingeführt.

## D10. Architekturelle Leitplanken für Folgeschritte

Für spätere Write-Flows gilt:

- Scope-Berechtigung weiterhin serverseitig erzwingen.
- `allowedScopes` strikt respektieren (keine implizite Freigabe von USER-Overrides für GLOBAL-only Keys).
- ROLE-Persistenz weiterhin über DB-Code halten, API aber kanonisch für UI ausgeben.
- Keine Frontend-Defaultberechnung einführen.

Damit bleibt das Settings-System konsistent mit MuGPlan-Prinzipien: Contract-First, Server als Wahrheit, klar getrennte Schichten.


---

# Teil E - Architektur-Erweiterung FT (19): Attachments für Customer und Employee, zentraler Download, Delete deaktiviert

Dieser Teil dokumentiert den Architekturstand nach Einführung von Customer- und Employee-Attachments. Er ergänzt das bestehende Projekt-Attachment-Modell, ohne dessen Grundprinzip zu verlassen.

## E1. Zielbild und Einordnung

FT (19) erweitert die bestehende Attachment-Funktion von Projekten auf zwei zusätzliche Domänenobjekte:

- Customer
- Employee

Die zentrale Leitentscheidung lautet: Attachments bleiben domaingebundene Datensätze mit eigenen Tabellen je Parent-Typ. Es wurde keine polymorphe Link-Tabelle eingeführt.

Gleichzeitig wurden zwei semantische Regeln systemweit vereinheitlicht:

- Download ist in allen Attachment-Domänen verfügbar und folgt derselben Header-/Disposition-Logik.
- Löschung von Attachments ist auf API-Ebene deaktiviert, damit eine technische Löschung nicht mehr möglich ist.

## E2. Domaenenmodell und Persistenzstrategie

Die Persistenz folgt dem bereits etablierten Muster von `project_attachment` und erweitert es um:

- `customer_attachment`
- `employee_attachment`

Jede Tabelle trägt die Dateimetadaten direkt im Datensatz:

- technische Dateiname (`filename`)
- Originalname (`original_name`)
- MIME-Typ (`mime_type`)
- Dateigröße (`file_size`)
- Dateipfad (`storage_path`)
- Erstellzeitpunkt (`created_at`)

Jede Tabelle besitzt einen eigenen Foreign Key auf das Parent-Objekt:

- `customer_attachment.customer_id -> customer.id` mit `ON DELETE CASCADE`
- `employee_attachment.employee_id -> employee.id` mit `ON DELETE CASCADE`

Damit bleibt das Modell konsistent zur bisherigen projektspezifischen Attachment-Architektur. Die Entscheidung priorisiert eindeutige Semantik pro Domäne und vermeidet implizite Typdisambiguierung in Storage- und API-Pfaden.

## E3. API-Oberfläche und Contract-First-Fortführung

Die API wurde contract-first im zentralen Contract-Index erweitert. Neu sind:

- `GET /api/customers/:customerId/attachments`
- `POST /api/customers/:customerId/attachments`
- `GET /api/customer-attachments/:id/download`
- `GET /api/employees/:employeeId/attachments`
- `POST /api/employees/:employeeId/attachments`
- `GET /api/employee-attachments/:id/download`

Die Projekt-Attachment-Endpoints bleiben für Listing und Upload bestehen.

Der bestehende Projekt-Delete-Pfad bleibt als Route vorhanden, ist jedoch fachlich deaktiviert und antwortet mit einer klaren Blockierungsantwort (`405` / Message: `"Attachment deletion is disabled"`). Für Customer und Employee wurden von Anfang an keine Delete-Contracts eingeführt.

Diese Entscheidung sichert, dass Löschung nicht nur in der UI fehlt, sondern serverseitig technisch nicht erlaubt ist.

## E4. Download-Architektur: zentrale Streaming-Logik

Statt Download-Logik in mehreren Controllern zu duplizieren, wurde ein gemeinsamer Streaming-Pfad eingeführt. Die Domänencontroller laden nur den Attachment-Datensatz aus dem jeweils passenden Repository und delegieren an eine zentrale Download-Funktion.

Die zentrale Funktion benötigt ausschließlich Metadaten:

- `mimeType`
- `storagePath`
- `originalName`
- `forceDownload` (aus Query-Flag `download=1`)

Die Disposition-Regel ist domänenübergreifend identisch:

- Standard: `inline` für PDF und Bilder
- Standard: `attachment` für alle anderen Typen
- `?download=1` erzwingt `attachment`

Damit ist Verhalten in Preview, Öffnen und Download für Projekt, Customer und Employee konsistent.

## E5. Upload-Architektur und Sicherheits-/Validierungsregeln

Upload bleibt auf dem bestehenden technischen Pfad:

- Multipart mit Feldname `file`
- 10 MB Maximalgröße
- gleicher Parser und gleiche Fehlersemantik bei Überschreitung
- identische MIME-Ableitung und Dateinamens-Sanitization
- gemeinsamer Upload-Ordner (`server/uploads`)

Die Domänencontroller unterscheiden sich nur im Parent-Identifier und dem Zielrepository. Dadurch bleibt der technische Pfad einheitlich und regressionsarm.

## E6. Schichtenlandkarte (End-to-End)

Die End-to-End-Kette ist für alle drei Attachment-Domänen strukturgleich:

`Contract -> Route -> Controller -> Service -> Repository -> DB/Storage`

### E6.1 Projekt

- Contract: `api.projectAttachments.*`
- Route: `server/routes/projectAttachmentsRoutes.ts`
- Controller: `server/controllers/projectAttachmentsController.ts`
- Service: `server/services/projectAttachmentsService.ts`
- Repository: `server/repositories/projectsRepository.ts`

### E6.2 Customer

- Contract: `api.customerAttachments.*`
- Route: `server/routes/customerAttachmentsRoutes.ts`
- Controller: `server/controllers/customerAttachmentsController.ts`
- Service: `server/services/customerAttachmentsService.ts`
- Repository: `server/repositories/customersRepository.ts`

### E6.3 Employee

- Contract: `api.employeeAttachments.*`
- Route: `server/routes/employeeAttachmentsRoutes.ts`
- Controller: `server/controllers/employeeAttachmentsController.ts`
- Service: `server/services/employeeAttachmentsService.ts`
- Repository: `server/repositories/employeesRepository.ts`

Die zentrale Download- und Dateihandhabungslogik sitzt als Querschnittskomponente in `server/lib` und wird von allen drei Controllern genutzt.

## E7. Frontend-Architektur: Wrapper-Muster und generisches Panel

Die Frontend-Umsetzung folgt dem bereits etablierten Wrapper-Prinzip:

- ein generisches strukturelles Panel ohne domänenspezifische API-Logik
- domänenspezifische Wrapper mit Query-Key, Upload-Mutation und URL-Building

Damit bleibt die UI-Kompositionsschicht schlank und wiederverwendbar.

Neu ist ein generisches `AttachmentsPanel`, das nur mit Daten und Callback-Props arbeitet. Darauf aufbauend kapseln Wrapper die Domänenanbindung:

- `ProjectAttachmentsPanel`
- `CustomerAttachmentsPanel`
- `EmployeeAttachmentsPanel`

Die Wrapper liefern:

- Attachment-Liste (React Query)
- Upload-Mutation
- `buildOpenUrl(id)`
- `buildDownloadUrl(id)`

Delete wird bewusst nicht gerendert und nicht angeboten.

## E8. Query- und Invalidation-Strategie

Die Query-Keys bleiben domänenspezifisch und stabil:

- Projekt: `["/api/projects", projectId, "attachments"]`
- Customer: `["/api/customers", customerId, "attachments"]`
- Employee: `["/api/employees", employeeId, "attachments"]`

Nach Upload invalidiert jeder Wrapper ausschließlich den eigenen Domänenkey. Damit bleibt die Cache-Erneuerung gezielt und konsistent mit den React-Query-Leitplanken.

## E9. UI-Semantik und Benutzerverhalten

Die sichtbaren UI-Zustände bleiben in allen drei Domänen identisch:

- Loading-Zustand
- leerer Zustand
- Liste vorhandener Attachments
- Upload-Fehler als Toast

Für jedes Item stehen zwei Aktionen zur Verfügung:

- Öffnen/Preview (`openUrl`)
- erzwungener Download (`downloadUrl` mit `download=1`)

Eine Löschaktion wird nicht mehr angezeigt.

## E10. Semantische Klarstellung: Delete deaktiviert

Architektonisch gilt für FT (19):

- Attachments sind derzeit nicht löschbar.
- Die API verhindert Löschung aktiv.
- UI-Verzicht allein reicht nicht, serverseitige Blockierung ist verpflichtend.

Damit ist die Nicht-Löschbarkeit als technische Invariante verankert und nicht nur als UI-Konvention.

## E11. Migrations- und Rollout-Hinweise

Die Einführung umfasst:

- Schema-Erweiterungen in `shared/schema.ts`
- SQL-Migration mit neuen Tabellen und FK-Constraints
- Contracts in `shared/routes.ts`
- neue Route-/Controller-/Service-Module
- Frontend-Wrapper und Integration in Customer- und Employee-Screens

Der Rollout ist additive und minimalinvasiv. Bestehende Projekt-Listing/Upload/Download-Flows bleiben funktionsgleich; nur Delete-Verhalten wurde bewusst geändert.

## E12. Offene Folgefragen (bewusst nicht in FT 19 gelöst)

Folgende Punkte sind bewusst als Follow-up gekennzeichnet:

- Datenhygiene für physische Dateien bei künftig möglicher Löschung
- optionales Archiv-/Retention-Konzept für Attachments
- feinere Berechtigungsregeln pro Attachment-Domäne
- mögliche zentrale Download-Auditierung

Diese Punkte sind architekturell anschlussfähig, aber nicht Teil des aktuellen Scopes.

---

# Teil F - Architektur-Erweiterung FT (20): Demo Seed/Purge mit Sauna-CSV und Template-Settings

Dieser Teil dokumentiert den Architekturstand fuer Demo-Daten-Erzeugung und rueckstandsfreie Loeschung. Fokus ist ein strikt isolierter Admin-Use-Case, der keine regulaere Fachlogik ersetzt.

## F1. Zielbild und Scope-Grenze

FT (20) fuehrt einen dedizierten Seed-Run-Mechanismus ein:

- reproduzierbare Demo-Daten-Erzeugung
- vollstaendige physische Loeschung aller erzeugten Daten
- Trennung vom normalen Archivierungsmodell

Wichtige Scope-Grenze: Seed/Purge ist ein separater Admin-Pfad. Regulaere Create/Update/Archive-Flows fuer Kunden, Projekte, Mitarbeiter und Termine bleiben fachlich unveraendert.

## F2. Persistenzmodell fuer Seed-Runs

Die Rueckverfolgbarkeit jedes Seed-Laufs wird ueber zwei Tabellen umgesetzt:

- `seed_run`
- `seed_run_entity`

`seed_run_entity` mappt pro erzeugtem Datensatz:

- `seed_run_id`
- `entity_type`
- `entity_id`

Die Purge-Logik arbeitet ausschliesslich ueber dieses Mapping. Es gibt keine heuristische Ruecksuche ueber Namen oder Zeitstempel.

## F3. Datenmodell-Anbindung und Fachkopplung

Die Seederzeugung koppelt Projekte an Sauna-Modell-CSV-Daten:

- Quelle: `.ai/Demodaten` (Fallback auf `.ai/demodata` im Loader)
- Pflichtdatei: `fasssauna_modelle.csv`
- Optionale Dateien:
  - `fasssauna_ofenmodelle.csv`
  - `fasssauna_modelle_ofen_mapping.csv`

Fachregel im Seed:

- `1 Projekt = genau 1 Montage-Termin` (projektgebunden)
- zusaetzliche Rekla-Termine sind optional, aber ebenfalls projektgebunden

## F4. Terminarchitektur im Seed-Kontext

Die Terminverteilung ist deterministisch und seedbasiert:

- Montage ueber Seed-Fenster `60..90` Tage
- Rekla nach Montage mit Delay `14..42` Tage
- Wochenenden werden fuer Seed-Termine ausgeschlossen
- Mitarbeiterbelegung wird pro Kalendertag kollisionsfrei gehalten

Rekla-Termine erben die Tour des zugehoerigen Montage-Termins. Damit bleibt die Tour-Logik im Projektkontext konsistent.

## F5. Template-Architektur ueber Settings

Textschablonen fuer Projekt und Termine werden als Settings-Keys gefuehrt und serverseitig aufgeloest:

- `templates.project.title`
- `templates.project.description`
- `templates.appointment.mount.title`
- `templates.appointment.intraday.rekl.title`

Die Resolver-Wahrheit bleibt serverseitig. Wenn keine wirksamen Werte aufloesbar sind, greifen Registry-Defaults. Platzhalter werden ueber eine Whitelist validiert.

## F6. API-Oberflaeche und Schichtschnitt

Die Seed-Funktion ist contract-first und folgt der Standardkette Route -> Controller -> Service -> Repository:

- `POST /api/admin/demo-seed-runs`
- `GET /api/admin/demo-seed-runs`
- `DELETE /api/admin/demo-seed-runs/:seedRunId`

Purge ist idempotent. Ein zweiter Delete auf dieselbe `seedRunId` liefert einen stabilen No-Op-Zustand.

## F7. Purge-Vollstaendigkeit als Architektur-Invariante

Purge entfernt:

- fachliche Hauptobjekte (z. B. Projekte, Termine, Kunden, Mitarbeiter)
- Join-Objekte (z. B. Termin-Mitarbeiter, Projekt-Status)
- Attachment-Metadaten
- physische Dateien im Storage
- Seed-Run-Mapping und Seed-Run-Datensatz

Die Reihenfolge ist FK-sicher und nicht an Archivierungsregeln gekoppelt.

## F8. Frontend-Integration

Die Admin-Seite `DemoDataPage` ist in die bestehende Navigation eingebunden und nutzt React Query:

- Mutation fuer Seed
- Mutation fuer Purge
- Run-Liste ueber Query
- globale Invalidation nach Seed/Purge

Damit bleiben Kalender, Projektlisten und Stammdatenlisten konsistent mit dem Server-Iststand.

## F9. Architekturelle Betriebsregel fuer Rollout

Seed-Tabellen werden gezielt ueber die dedizierte Migration ausgerollt:

- `migrations/2026-02-07_demo_seed_runs.sql`

Kein globales Schema-Sync als Pflichtschritt fuer diesen Use-Case. Dadurch werden unbeabsichtigte Nebeneffekte auf nicht betroffene Tabellen vermieden.





## Rollenmodell - autoritativ

Der Rollen- und Benutzerkontext wird serverseitig pro API-Request aufgebaut. Grundlage ist ein deterministischer System-User (`SETTINGS_USER_ID`), der in `attachRequestUserContext` gesetzt und in `resolveUserRole` gegen `users -> roles` aufgeloest wird. Der berechnete Kontext liegt in `req.userContext = { userId, roleCode, roleKey }` vor.

Client-Header (insbesondere `x-user-role`) sind keine Rollenquelle und werden nicht mehr zur Autorisierung verwendet. Berechtigungsrelevante Entscheidungen erfolgen ausschliesslich im Backend ueber `req.userContext.roleKey`.

Die Lock-Regel fuer Termine ist fachlich serverseitig erzwungen: gesperrte Termine duerfen nur mit Rolle `ADMIN` geaendert oder geloescht werden; andere Rollen erhalten einen deterministischen `403` mit maschinenlesbarem Feld `APPOINTMENT_LOCKED`.

Fuer den Betrieb ohne Auth-Framework gilt: der konfigurierte System-User muss existieren, aktiv sein und die Rolle `ADMIN` besitzen. Ist das nicht gegeben, startet der Server nicht.
