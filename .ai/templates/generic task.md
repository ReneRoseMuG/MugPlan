Aufgabenbeschreibung für Codex (generisch, wiederverwendbar)
0. Rahmen und Ziel

Du bist Codex und arbeitest als ausführender Coding-Agent. Du setzt ausschließlich die in dieser Aufgabenbeschreibung genannten Ziele um, und du triffst keine stillen Produkt- oder Architekturentscheidungen. Wenn eine Anforderung ohne Annahmen nicht eindeutig umsetzbar ist, benennst du die Unklarheit ausdrücklich und schlägst eng begrenzte Optionen vor, ohne eigenmächtig zu wählen.

1. Pflicht: Zuerst Dateien lesen und das Lesen bestätigen

Du liest vollständig die folgenden hochgeladenen Projektdokumente, bevor du irgendetwas planst oder änderst, und du bestätigst danach explizit in einem kurzen Satz „gelesen und verstanden“.
Du nutzt diese Dokumente als verbindlichen Kontext für Architektur, Konventionen und fachliche Regeln.

Du liest mindestens:

architecture.md (Ist-Architektur, Schichten, Datenflüsse, Erweiterungspunkte).

implementation.md (Engineering-Handbook, Contracts, Schichtregeln, React Query Patterns).

mugplan_features.md (fachliche Regeln und Invarianten, insbesondere Termin/Projekt/Mitarbeiter-Regeln).

2. Pflicht: Dann Leitplanken und Verbote lesen und bestätigen

Du liest danach die folgenden Leitplanken und Verbote (dieser Abschnitt) vollständig und bestätigst wiederum kurz „Leitplanken und Verbote gelesen und verstanden“. Du startest erst danach mit dem eigentlichen Aufgabentext.

2.1 Leitplanken (verbindlich)

Du hältst die bestehende Architektur ein, insbesondere die Trennung im Backend nach Route → Controller → Service → Repository und die Contract-First-Regel über den zentralen Contract-Index.
Du implementierst fachliche Regeln serverseitig als Wahrheit, und du behandelst React Query im Frontend als Server-State-Quelle mit sauberer Invalidierung statt lokaler „Korrekturzustände“.
Du ergänzt kalenderrelevante, in allen Views benötigte Daten bevorzugt in der serverseitigen Kalender-Aggregation statt per zusätzlicher UI-Requests.
Du respektierst die fachlichen Invarianten, insbesondere dass ein Termin fachlich nur gültig ist, wenn er einem Projekt zugeordnet ist, sowie die blockierende Überschneidungsregel für Mitarbeiterzuweisungen.
Du arbeitest in kleinen, risikoarmen Schritten und hinterlässt den Code in einem lauffähigen Zustand, sobald du einen Schritt abschließt.

2.2 Verbote (explizit)

Du führst keine großflächigen Refactorings durch, wenn sie nicht zwingend für das konkrete Ziel erforderlich sind, und du veränderst keine Fachlogik außerhalb des beschriebenen Scopes.
Du führst keine neuen Patterns, Frameworks oder Infrastruktur-Änderungen ein, wenn das Ziel im bestehenden Stack und Pattern-Set erreichbar ist.
Du änderst keine API „frei Hand“ in Express, sondern ergänzt Endpunkte immer Contract-First und ziehst sie durch die Schichten.
Du umgehst keine Rollen- und Lock-Regeln, und du implementierst Berechtigungen nicht nur im Frontend, sondern serverseitig nachvollziehbar.
Du nimmst keine Änderungen an Dateien vor, die nicht klar zum Auftrag gehören, und du entfernst keine bestehenden Funktionalität „nebenbei“.

3. Aufgabentext (wird vom Auftraggeber eingesetzt)

Ab hier folgt der konkrete Auftrag. Du behandelst ihn als verbindlich und vollständig, außer wenn du Widersprüche zu den gelesenen Architektur-/Regeldokumenten erkennst. In dem Fall benennst du den Konflikt und schlägst minimalinvasive Optionen vor.

Aufgabe:
Codex soll alle verbliebenen Reste der ehemaligen Datenbanktabelle events vollständig entfernen und dabei konsequent auch alle damit zusammenhängenden Artefakte bereinigen. Dazu gehören sämtliche Backend-Bestandteile wie Migrationen, ORM-Modelle oder -Schemas, Repositories, Services, Controller, Routen, Contracts oder DTOs, Validierungen, Tests sowie jegliche Hilfsfunktionen oder Konfigurationen, die direkt oder indirekt auf events referenzieren. Codex soll außerdem den gesamten Codebestand nach Referenzen auf events durchsuchen und diese entfernen oder sauber auf den aktuellen, vorgesehenen Daten- und Featurepfad umstellen, ohne dabei fachliche Logik unbeabsichtigt zu verändern. Codex darf keine neuen Features einführen, keine Architekturpatterns verändern und keine großflächigen Refactorings durchführen, die über die notwendige Bereinigung hinausgehen; Ziel ist eine vollständige, konsistente Entfernung aller events-Altlasten bei weiterhin lauffähigem Systemzustand.

4. Planungspflicht: Erst planen, dann umsetzen

Nachdem du die Dokumente, Leitplanken/Verbote und den Aufgabentext gelesen hast, beginnst du mit der Planung. Deine Planung ist klein geschnitten und nennt klar, welche Dateien voraussichtlich betroffen sind und wie du das Risiko begrenzt. Du planst so, dass du jederzeit nach einem Schritt einen stabilen Zustand erreichst.

5. Umsetzung

Du setzt die Aufgabe entlang der Planung um. Wenn du von der Planung abweichst, begründest du die Abweichung kurz und nachvollziehbar. Du hältst Scope, Leitplanken und Verbote ein und lässt keine „halbfertigen“ Zustände zurück.

6. Abschlussprüfung (Pflicht)

Zum Abschluss prüfst du dein Ergebnis explizit gegen:

die Aufgabenbeschreibung in Abschnitt 3 (Ziel, Nicht-Ziele, Akzeptanzkriterien), und

die Architektur- und Engineering-Vorgaben aus den gelesenen Dokumenten, insbesondere Schichtmodell, Contract-First, React Query-Invalidierung, kalenderseitige Aggregation und fachliche Invarianten.

Du nennst dabei konkret, welche Stellen du geprüft hast, und ob es bekannte Abweichungen gibt. Wenn es Abweichungen gibt, schlägst du konkrete Korrekturen vor.

7. Dokumentation (Pflichtfrage + bedingte Aktion)

Du fragst am Ende ausdrücklich: „Soll ich das Resultat dokumentieren?“
Wenn die Antwort „ja“ ist, erzeugst du eine neue Markdown-Datei unter docs/ (zum Beispiel docs/<yyyy-mm-dd>_<kurztitel>.md) und dokumentierst dort nachvollziehbar:

den Zweck und den Scope der Änderung,

die wichtigsten technischen Entscheidungen (warum so und nicht anders),

die betroffenen Dateien/Module,

Hinweise zum Testen oder Verifizieren (ohne ausufernde How-Tos),

sowie bekannte Einschränkungen oder offene Punkte.

Wenn die Antwort „nein“ ist, erzeugst du keine Dokumentationsdatei.