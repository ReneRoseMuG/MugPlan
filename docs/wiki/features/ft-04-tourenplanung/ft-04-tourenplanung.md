# FT (04): Tourenplanung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition die Verwaltung von Touren zur logischen Gruppierung von Terminen im Kalender. Touren dienen ausschließlich der organisatorischen Bündelung und der visuellen Orientierung innerhalb der Terminplanung. Ergänzend enthält das Feature ab Version 2 eine kalenderwochen-basierte Mitarbeiterplanung.

## Fachliche Beschreibung

Eine Tour ist eine Planungseinheit, die mehrere Termine logisch zusammenfasst und im Kalender farblich sichtbar macht. Alle Termine einer Tour teilen eine gemeinsame Farbe, die das primäre visuelle Ordnungsmerkmal im Kalender ist. Touren können angelegt, umbenannt, eingefärbt und gelöscht werden. Eine Übersicht zeigt alle einer Tour zugeordneten Termine.

Die Mitarbeiterplanung für Touren erfolgt kalenderwochen-basiert. Im Tab „Wochenplanung“ der Tourenverwaltung wird für jede Kalenderwoche explizit festgelegt, welche Mitarbeiter dieser Tour zugeordnet sind. Ein Mitarbeiter kann pro Kalenderwoche nur einer Tour zugeordnet sein — das System verhindert Mehrfachzuordnungen über eine Eindeutigkeitsregel und meldet Konflikte eindeutig. In der Tour-KW-Planung werden zwei Konfliktarten unterschieden: Ein Typ-1-Konflikt ist ein KW-Tour-Konflikt, bei dem ein Mitarbeiter in derselben Kalenderwoche bereits einer anderen Tour zugeordnet ist. Ein Typ-2-Konflikt ist ein Terminüberschneidungskonflikt, bei dem die Ausrollung auf einen konkreten Termin eine bestehende Terminzuweisung desselben Mitarbeiters zeitlich überschneiden würde. Diese Typen sind Konfliktarten, keine Stammdatentypen von Mitarbeitern. Kalenderwochen, deren Wochenanfang (Montag) vor der aktuellen Woche liegt, sind schreibgeschützt. Die aktuelle und zukünftige Kalenderwochen sind für Administratoren und Disponenten editierbar; Leser bleiben read-only.

Jede Mutation der Wochenplanung wird dem Disponenten zuerst als selektive Vorschau präsentiert. Die Vorschau zeigt je betroffenem Termin den Status (wird hinzugefügt, wird entfernt, Konflikt mit Grund). Konfliktbehaftete Termine sind in der Vorschau deaktiviert und werden von der Mutation ausgeschlossen. Alle konfliktfreien Termine sind vorausgewählt. Erst nach expliziter Bestätigung durch den Disponenten werden die Termine mutiert. Historische Termine bleiben in jedem Fall unverändert.

Eine bestehende Tour-KW-Planung kann aus der Tour-KW-Karte im Tourformular und aus der Tour-KW-Spalte des Wochenkalenders auf die Termine dieser Tour und Kalenderwoche angewendet werden. Dabei werden keine neuen Regeln eingeführt: Die Aktion nutzt den vorhandenen Vorschau-/Bestätigungsfluss je Mitarbeiter und berücksichtigt dieselben Konflikt-, Rollen-, Historien- und Sperrregeln wie das Hinzufügen eines Mitarbeiters zur Tour-KW-Planung.

Eine Tour-KW kann durch Administratoren oder Disponenten blockiert werden. Das Blockieren sperrt die Tour-Wochenplanung für diese konkrete Kombination aus Tour und Kalenderwoche, entfernt die gespeicherten Tour-KW-Mitarbeiterzuordnungen und parkt alle betroffenen, nicht stornierten Termine dieser Tour und Kalenderwoche. Das Parken nutzt den bestehenden Parkplatz-Workflow aus [UC 06/04: Termin auf Parkplatz setzen](../ft-06-automatische-regeln/use-cases/uc-06-04-termin-auf-parkplatz-setzen.md): Der Termin wird der Systemtour **Parkplatz** zugeordnet, erhält den Zustand **Geparkt** und verliert seine Mitarbeiterzuweisungen. Stornierte Termine werden nicht geparkt.

Eine blockierte Tour-KW kann durch Administratoren oder Disponenten wieder freigegeben werden. Die Freigabe hebt ausschließlich den Sperrstatus der Tour-KW auf. Zuvor geparkte Termine bleiben auf **Parkplatz**, behalten den Zustand **Geparkt** und erhalten keine Mitarbeiter oder Tour-KW-Zuordnungen automatisch zurück. Eine erneute Disposition erfolgt anschließend über die regulären Termin- und Wochenplanungsfunktionen.

Die Tourenverwaltung enthält zusätzlich den Tab **Wochenplanung** als Vier-KW-Übersicht. Diese Ansicht zeigt planbare Touren als Tour-Bahnen mit je einer Kachel pro Kalenderwoche. Ausgeschlossen sind die Systemtouren **Parkplatz**, **Abwesenheiten** und tourlose Pseudo-Bahnen. Die Ansicht ist eine read-only Projektion für die Matrix selbst und nutzt für Mitarbeiter, Notizen, Blockieren, Freigeben und Anwenden die bestehenden Tour-KW-Mutationspfade.

## Benutzerführung über Ressourcenplanungsdialoge und Meldungen

Die ressourcenrelevanten Dialoge für Tour-KW, Termin, Kalenderbewegungen und Mitarbeiterzuweisungen laufen über einen gemeinsamen Ressourcenplanungsrahmen. Einstiegspunkte sind insbesondere die Tour-KW-Wochenplanung im Tourformular, die Tour-KW-Karten im Wochenkalender, das Anwenden einer Wochenplanung auf Termine, Terminänderungen mit Tour-, KW-, Datums- oder Uhrzeitbezug, Kalender-Drag-&-Drop, Markieren und Einfügen sowie direkte Mitarbeiteraktionen an Terminen. Der Dialog macht dieselben fachlichen Prüfungen sichtbar, die serverseitig verbindlich bleiben.

Der Standardablauf beginnt mit einer Vorschau. Diese zeigt je betroffenem Termin oder Planungsschritt, welche Mitarbeiter hinzugefügt oder entfernt würden, welche Einträge unverändert bleiben und welche Konflikte bestehen. Konfliktfreie Termine sind vorausgewählt, konfliktbehaftete Termine bleiben deaktiviert und nennen den Grund. Manuell oder über Team zugewiesene Mitarbeiter werden bei Touränderungen nicht still entfernt, sondern als unverändert ausgewiesen. Bei mehreren ausgewählten Mitarbeitern sammelt der mehrstufige Dialog die einzelnen Vorschauen und führt bestätigte Änderungen erst nach der finalen Gesamtbestätigung seriell aus.

Vor der finalen Bestätigung bleibt der Vorgang abbrechbar, ohne Termine, Tour-KW-Mitarbeiterzuordnungen oder Abwesenheitsfolgen zu verändern. Während der Ausführung zeigt der Dialog Fortschritt, erfolgreiche Schritte und Fehlerzustände nachvollziehbar an. Teilfehler dürfen nicht als vollständiger Erfolg erscheinen; erfolgreiche Schritte bleiben sichtbar, damit der Akteur den verbleibenden Zustand einordnen und den Vorgang kontrolliert fortsetzen oder neu laden kann.

Tour-KW-Blockieren und Freigeben nutzen ebenfalls kontrollierte Bestätigungsdialoge. Beim Blockieren müssen die Folgen vor der Ausführung verständlich sein: betroffene nicht stornierte Termine werden geparkt, Mitarbeiterzuordnungen entfernt und die Tour-KW gesperrt. Beim Freigeben wird nur der Sperrstatus aufgehoben; geparkte Termine oder entfernte Mitarbeiter werden nicht automatisch rekonstruiert.

Meldungen benennen Konflikte in Alltagssprache und unterscheiden fachlich zwischen KW-Tour-Konflikten, Terminüberschneidungen, historischen Sperren, blockierten Tour-KW, Versionskonflikten, fehlenden Datensätzen und fehlenden Rechten. Technische Rohcodes, HTTP-Status oder unformatierte Serverantworten dürfen nicht als Nutzertext erscheinen. `ADMIN` und `DISPONENT` dürfen Ressourcenmutationen nur im Rahmen der bestehenden serverseitigen Rollen-, Sperr-, Historien-, Versions- und Konfliktregeln ausführen. `READER` beziehungsweise `LESER` darf die betroffenen Ansichten sehen, aber keine Ressourcenmutation ausführen.

## Regeln & Randbedingungen

- Eine Tour dient ausschließlich der organisatorischen Gruppierung von Terminen.
- Ein Termin kann maximal einer Tour zugeordnet sein.
- Eine Tour kann mehrere Termine enthalten.
- Die Farbe einer Tour ist das primäre visuelle Identifikationsmerkmal im Kalender.
- Eine Tour kann nur gelöscht werden, wenn ihr keine Termine mehr zugeordnet sind.
- Mehrere Mitarbeiter können einer Tour zugewiesen werden.
- Die Mitarbeiterzuordnung einer Tour erfolgt ausschließlich über die Wochenplanung (persistierte Zuordnung in tour_week_employees, verwaltbar im Tab „Wochenplanung“). Es gibt keine berechnete Aggregation mehr aus Terminen.
- Eine vorhandene Tour-KW-Planung darf aus der Wochenansicht und aus dem Tourformular auf die Termine der passenden Tour/KW angewendet werden. Die Planung bleibt weiterhin in `tour_week_employees` gespeichert; die Anwendung erzeugt konkrete Termin-Mitarbeiter-Zuordnungen über den bestehenden Terminpfad.
- Das Blockieren einer Tour-KW ist eine schreibende Mutation für Administratoren und Disponenten. Leser dürfen den Sperrstatus sehen, aber nicht ändern.
- Blockieren parkt betroffene nicht stornierte Termine über den bestehenden Parkplatz-Workflow und entfernt gespeicherte Tour-KW-Mitarbeiterzuordnungen der blockierten Woche.
- Freigeben stellt nur die Bearbeitbarkeit der Tour-KW wieder her. Geparkte Termine, entfernte Termin-Mitarbeiter und entfernte Tour-KW-Mitarbeiterzuordnungen werden nicht automatisch rekonstruiert.
- **Historische Sperre für KW-Zuordnungen:** Kalenderwochen, deren ISO-Wochenanfang (Montag) vor dem Beginn der aktuellen Kalenderwoche liegt, sind gesperrt. Schreibende Operationen auf `tour_week_employees` für solche Wochen werden serverseitig blockiert. Die laufende KW ist für Administratoren und Disponenten editierbar, einschließlich Mitarbeiterplanung sowie Blockieren und Freigeben.
- **Konfliktverhinderung:** Typ-1-Konflikte (KW-Tour-Eindeutigkeit) betreffen die Wochenplanung selbst: Ein Mitarbeiter kann pro Kalenderwoche nur einer Tour zugeordnet sein. Das System blockiert diese Auswahl bereits vor dem Dialog oder spätestens serverseitig. Typ-2-Konflikte (Terminüberschneidung) betreffen die Ausrollung auf konkrete Termine: Konfliktbehaftete Termine sind im Vorschau-Dialog deaktiviert und werden von der Mutation ausgeschlossen. In keinem Szenario entsteht ein inkonsistenter Datenzustand.
- **Bestätigungspflicht:** Jede Mutation der Wochenplanung erfordert eine explizite Bestätigung durch den Disponenten nach vorheriger selektiver Vorschau. Alle konfliktfreien Termine sind vorausgewählt. Konflikte werden pro Termin ausgewiesen.
- **Historienintegrität:** Vergangene Termine werden durch keine Touränderung berührt. Als vergangen gilt jeder Termin, dessen Startdatum vor dem heutigen Datum liegt.

## Use Cases

- [UC 04/01: Tour anlegen](use-cases/uc-04-01-tour-anlegen.md)
- [UC 04/02: Tour bearbeiten](use-cases/uc-04-02-tour-bearbeiten.md)
- [UC 04/04: Tour löschen](use-cases/uc-04-04-tour-loeschen.md)
- [UC 04/05: Tourliste anzeigen](use-cases/uc-04-05-tourliste-anzeigen.md)
- [UC 04/06: Kalenderdarstellung nach Touränderung aktualisieren](use-cases/uc-04-06-kalenderdarstellung-nach-touraenderung-aktualisieren.md)
- [UC 04/07: Wochenübersicht nach Touränderung korrekt ableiten](use-cases/uc-04-07-wochenuebersicht-nach-touraenderung-korrekt-ableiten.md)
- [UC 04/09: Parallele Bearbeitung derselben Tour](use-cases/uc-04-09-parallele-bearbeitung-derselben-tour.md)
- [UC 04/10: Löschkonflikt bei paralleler Terminzuordnung](use-cases/uc-04-10-loeschkonflikt-bei-paralleler-terminzuordnung.md)
- [UC 04/12: Kalenderwoche einer Tour anlegen](use-cases/uc-04-12-kalenderwoche-einer-tour-anlegen.md)
- [UC 04/13: Mitarbeiter einer Tour-KW zuordnen](use-cases/uc-04-13-mitarbeiter-einer-tour-kw-zuordnen.md)
- [UC 04/14: Mitarbeiter aus einer Tour-KW entfernen](use-cases/uc-04-14-mitarbeiter-aus-einer-tour-kw-entfernen.md)
- [UC 04/15: Tour-KW-Wochenplanung anzeigen und anwenden](use-cases/uc-04-15-tour-kw-wochenplanung-anzeigen-und-anwenden.md)
- [UC 04/16: Tour-KW blockieren und Termine parken](use-cases/uc-04-16-tour-kw-blockieren-und-termine-parken.md)
- [UC 04/17: Tour-KW freigeben](use-cases/uc-04-17-tour-kw-freigeben.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
