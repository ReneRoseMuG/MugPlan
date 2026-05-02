# FT (04): Tourenplanung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/746286ccf41d46629ec614541a871345
- Importquelle lokal: `C:/Users/schro/Desktop/FT (04) Tourenplanung 746286ccf41d46629ec614541a871345.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition die Verwaltung von Touren zur logischen Gruppierung von Terminen im Kalender. Touren dienen ausschließlich der organisatorischen Bündelung und der visuellen Orientierung innerhalb der Terminplanung. Ergänzend enthält das Feature ab Version 2 eine kalenderwochen-basierte Mitarbeiterplanung.

## Fachliche Beschreibung

Eine Tour ist eine Planungseinheit, die mehrere Termine logisch zusammenfasst und im Kalender farblich sichtbar macht. Alle Termine einer Tour teilen eine gemeinsame Farbe, die das primäre visuelle Ordnungsmerkmal im Kalender ist. Touren können angelegt, umbenannt, eingefärbt und gelöscht werden. Eine Übersicht zeigt alle einer Tour zugeordneten Termine.

Die Mitarbeiterplanung für Touren erfolgt kalenderwochen-basiert. Im Tab „Wochenplanung“ der Tourenverwaltung wird für jede Kalenderwoche explizit festgelegt, welche Mitarbeiter dieser Tour zugeordnet sind. Ein Mitarbeiter kann pro Kalenderwoche nur einer Tour zugeordnet sein — das System verhindert Mehrfachzuordnungen über einen Unique Constraint und meldet Konflikte eindeutig. Kalenderwochen, deren Wochenanfang (Montag) auf dem heutigen Datum liegt oder davor, sind schreibgeschützt.

Jede Mutation der Wochenplanung wird dem Disponenten zuerst als selektive Vorschau präsentiert. Die Vorschau zeigt je betroffenem Termin den Status (wird hinzugefügt, wird entfernt, Konflikt mit Grund). Konfliktbehaftete Termine sind in der Vorschau deaktiviert und werden von der Mutation ausgeschlossen. Alle konfliktfreien Termine sind vorausgewählt. Erst nach expliziter Bestätigung durch den Disponenten werden die Termine mutiert. Historische Termine bleiben in jedem Fall unverändert.

## Regeln & Randbedingungen

- Eine Tour dient ausschließlich der organisatorischen Gruppierung von Terminen.
- Ein Termin kann maximal einer Tour zugeordnet sein.
- Eine Tour kann mehrere Termine enthalten.
- Die Farbe einer Tour ist das primäre visuelle Identifikationsmerkmal im Kalender.
- Eine Tour kann nur gelöscht werden, wenn ihr keine Termine mehr zugeordnet sind.
- Mehrere Mitarbeiter können einer Tour zugewiesen werden.
- Die Mitarbeiterzuordnung einer Tour erfolgt ausschließlich über die Wochenplanung (persistierte Zuordnung in tour_week_employees, verwaltbar im Tab „Wochenplanung“). Es gibt keine berechnete Aggregation mehr aus Terminen.
- **Historische Sperre für KW-Zuordnungen:** Kalenderwochen, deren ISO-Wochenanfang (Montag) auf dem heutigen Datum liegt oder davor, sind gesperrt. Schreibende Operationen auf tour_week_employees für solche Wochen werden serverseitig blockiert. Wochenkarten vergangener und laufender KWs sind in der UI read-only.
- **Konfliktverhinderung:** Typ-1 (KW-Tour-Unique): Ein Mitarbeiter kann pro Kalenderwoche nur einer Tour zugeordnet sein — das System blockiert die Auswahl im Picker bereits vor dem Dialog. Typ-2 (Termin-Überschneidung): Konfliktbehaftete Termine sind im Vorschau-Dialog deaktiviert und werden von der Mutation ausgeschlossen. In keinem Szenario entsteht ein inkonsistenter Datenzustand.
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

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
