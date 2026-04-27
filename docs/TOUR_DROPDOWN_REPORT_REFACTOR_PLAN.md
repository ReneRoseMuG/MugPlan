# Plan: Tour-Dropdowns und Tourenplan-Report erweitern

## Kontext dieser Session

Es wurden drei echte Tour-bezogene Dropdown-Vorkommen im Client gefunden:

1. Terminliste: `client/src/components/ui/filter-panels/appointments-filter-panel.tsx`
2. Monitoring: `client/src/components/ui/filter-panels/monitoring-filter-panel.tsx`
3. Tourenplan-Report: `client/src/components/reports/TourenplanReportPanel.tsx`

Die Tourdaten fuer alle drei Stellen kommen aktuell aus derselben Serverquelle:

- `GET /api/tours`
- Route: `server/routes/toursRoutes.ts`
- Controller: `server/controllers/toursController.ts`
- Service: `server/services/toursService.ts`
- Repository: `server/repositories/toursRepository.ts`

Das Repository liefert aktuell `db.select().from(tours).orderBy(tours.id)`.

Im Report gibt es aktuell einen fachlich gewollten Sonderfall: Es gibt keine Option "Alle Touren". Der Report zwingt zur Auswahl genau einer Tour. Zusaetzlich fuegt der Report clientseitig die Option "Ohne Tour" mit `value="0"` hinzu.

## Zielbild

Die Tourmenge soll fuer Terminliste und Monitoring gleich aufgebaut und gleich sortiert sein:

1. Platzhalter "Alle Touren"
2. Touren mit Namensmuster `Tour n`, sortiert numerisch nach `n`
3. Touren mit anderem alphabetischem Namen, sortiert alphabetisch

Der Tourenplan-Report soll dieselbe sortierte Tourmenge verwenden, aber "Ohne Tour" ans Ende haengen.

Die Report-Auswahl soll nicht mehr als Single-Select-Dropdown funktionieren, sondern als checked List:

- "Alle Touren" ist initial gecheckt.
- Wenn "Alle Touren" gecheckt ist, gelten automatisch alle Einzel-Touren als gecheckt.
- Wenn "Alle Touren" unchecked wird, werden alle anderen Checkboxen geloescht.
- "Alle Touren" ist nur ein UI-Platzhalter und wird nicht in die Report-Konfiguration uebergeben.
- Die gecheckten echten Touren sollen in einer folgenden Refaktorierung als Liste an die Report-Komponente gegeben werden.

Offene Praezisierung fuer den Folgeauftrag:

- In der Session wurde einmal "Array der Indizes" und spaeter "Tour ID Liste" genannt. Vor Umsetzung sollte festgelegt werden, ob die interne Schnittstelle Tour-IDs oder Positionsindizes transportieren soll. Technisch und fachlich naheliegend ist eine Tour-ID-Liste, weil die vorhandenen APIs bereits mit Tour-IDs arbeiten.
- Es muss festgelegt werden, ob "Ohne Tour" in derselben Liste mit einem Sentinel-Wert wie `0` bleibt oder als eigener Auswahltyp modelliert wird.

## Erste Planungsstufe: Gemeinsame Sortierung

Eine kleine gemeinsame Client-Hilfsfunktion sollte die Sortierung kapseln, damit Terminliste, Monitoring und Report dieselbe Reihenfolge nutzen. Die Funktion sollte eine Liste von Tour-Objekten annehmen und sortiert zurueckgeben.

Sortierregel:

- Namen exakt nach Muster `Tour <Zahl>` werden als Systemtouren behandelt.
- Diese Systemtouren werden numerisch sortiert.
- Alle anderen Touren werden danach alphabetisch nach deutschem Locale sortiert.
- Die Originaldaten aus `/api/tours` bleiben unveraendert; nur die Anzeige-Reihenfolge wird clientseitig sortiert.

Voraussichtlich betroffene Stellen:

- `client/src/components/ui/filter-panels/appointments-filter-panel.tsx`
- `client/src/components/ui/filter-panels/monitoring-filter-panel.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- neuer oder bestehender Client-Helper unter `client/src/lib/`

Risiko:

- Niedrig fuer Terminliste und Monitoring, wenn nur die Anzeige-Reihenfolge geaendert wird.
- Wichtig ist, keine Server-Contracts zu veraendern und keine IDs umzuschreiben.

## Zweite Planungsstufe: Report-Auswahl als checked List

Der Report braucht eine neue Auswahl-UI fuer mehrere Touren. Sie soll die sortierte Tourliste verwenden und "Ohne Tour" am Ende anzeigen.

Vorgeschlagenes UI-Verhalten:

- Initialzustand: Modus "Alle Touren" aktiv.
- Bei aktivem "Alle Touren" werden alle echten Touren optisch als gecheckt dargestellt.
- Wird "Alle Touren" deaktiviert, wird die explizite Auswahl geleert.
- Einzelne Touren koennen danach separat aktiviert werden.
- Wird durch Einzelwahl wieder jede echte Tour aktiviert, kann optional "Alle Touren" wieder als aktiv dargestellt werden. Diese UX-Regel sollte vor Umsetzung bestaetigt werden.
- "Ohne Tour" bleibt eine eigene Checkbox am Ende und muss separat behandelt werden.

Voraussichtlich betroffene Stelle:

- `client/src/components/reports/TourenplanReportPanel.tsx`

Risiko:

- Mittel, weil der Report aktuell technisch auf genau `selectedTourId: number | null` zugeschnitten ist.
- Eine reine UI-Umstellung ohne gleichzeitige Report-Datenmodell-Erweiterung kann den Report brechen, wenn Query-Keys, Preview-Requests und Disabled-Logik nicht zusammen angepasst werden.

## Dritte Planungsstufe: Tourenplan-Report fuer mehrere Touren

Der Tourenplan-Report muss im Folgeschritt von einer einzelnen Tour auf eine Tour-ID-Liste erweitert werden.

Aktueller Ablauf:

- Preview-Query ruft `/api/tours/${selectedTourId}/print-preview?...` auf.
- Detaildaten werden ueber `/api/appointments/list` fuer diese eine Tour nachgeladen.
- Druckseiten werden aus einer einzelnen Tour-Ausgabe gebaut.

Zielablauf:

- Die Auswahl liefert eine Liste echter Tour-IDs plus optional den Sonderfall "Ohne Tour".
- Der Report baut die Druckausgabe tourweise auf.
- Termine verschiedener Touren duerfen nicht zu einer gemeinsamen Ausgabe zusammengefuehrt werden.
- Wenn die letzte Seite einer Tour nicht voll ist, bleibt der Rest dieser Seite leer.
- Die naechste Tour beginnt auf einer neuen Seite.

Wichtige technische Konsequenzen:

- Query-Key und Preview-Request muessen von `selectedTourId` auf eine stabile Auswahl-Liste umgestellt werden.
- Die Datenbeschaffung muss entweder mehrere bestehende Single-Tour-Requests seriell/koordiniert ausfuehren oder einen neuen serverseitigen Multi-Tour-Endpoint erhalten.
- Ohne explizite Architekturfreigabe sollte zunaechst geprueft werden, ob die bestehende Single-Tour-API clientseitig je Tour wiederverwendet werden kann.
- Die Paginierung muss eine Tour-Grenze respektieren und darf Seitenkapazitaet nicht touruebergreifend auffuellen.
- Der Print-Payload fuer die Browser-Druckvorschau muss die Tourabschnitte getrennt halten.

Risiko:

- Mittel bis hoch, weil Druckvorschau, Pagination, Query-Daten, Reportmodell und Sonderfall "Ohne Tour" zusammenhaengen.
- Besonders sensibel sind Seitenumbrueche, leere Restseiten, Query-Invalidierung und die Abgrenzung zwischen echten Tour-IDs und UI-Platzhaltern.

## Empfohlene Umsetzung in einem Folgechat

1. Gemeinsame Sortierfunktion einfuehren und in Terminliste, Monitoring und Report verwenden.
2. Report-Auswahl intern auf ein kleines Selection-Modell vorbereiten, ohne die Drucklogik sofort voll umzubauen.
3. Report-Queries und Reportmodell auf mehrere Touren erweitern.
4. Paginierung so anpassen, dass jede Tour auf einer neuen Seite beginnt und Restseiten nicht mit Folgetouren aufgefuellt werden.
5. Tests gezielt ergaenzen:
   - Unit-Test fuer Sortierung `Alle Touren`, `Tour n`, alphabetische Namen.
   - Unit-Test oder Komponenten-Test fuer checked-list-Verhalten.
   - Report-Test fuer getrennte Tour-Ausgaben und Seitenumbruchregel.

## Nicht automatisch entscheiden

Vor der Implementierung sollten diese Punkte bestaetigt werden:

- Tour-ID-Liste oder Index-Liste als interne Report-Schnittstelle?
- Soll "Ohne Tour" als `0`, `null` oder eigener Typ transportiert werden?
- Soll "Alle Touren" nach manueller Einzelwahl aller Touren automatisch wieder als checked erscheinen?
- Soll fuer Multi-Tour-Datenbeschaffung ein neuer Server-Endpunkt entstehen oder die bestehende Single-Tour-API mehrfach genutzt werden?
