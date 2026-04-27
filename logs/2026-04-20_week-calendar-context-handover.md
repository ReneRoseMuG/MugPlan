# Auftragslog: Wochenkalender Kontextübergabe

## Zweck

Dieses Dokument bündelt den aktuell gesammelten Kontext zum Wochenkalender, zu Wochenkarten, Kachel-/Display-Modi, Tour-Lane-Kollabieren/Aufklappen sowie zu den Layout-Änderungen der letzten Tage.

Ziel ist eine belastbare Übergabebasis für einen Folgechat, damit die nächste Analyse oder Fehlerbehebung nicht erneut bei null beginnen muss.

Der Fokus liegt ausdrücklich auf:

- Wochenkalender
- Kalenderkarten für Ein-Tages- und Mehrtages-Termine
- Kunden- und Projekt-Panels innerhalb der Wochenkarten
- Kachelmodi / Tile-Body-Modi
- frühere Display-Mode-Logik und deren Entfernung
- Tour-Lanes auf-/zugeklappt
- Reuse derselben Wochenkarten-Bausteine in der Tour-PLZ-Vorschau

Nicht im Fokus dieses Dokuments stehen:

- allgemeine Terminlogik außerhalb der Wochenansicht
- Monatsansicht außer als fachlicher Referenzpunkt
- allgemeine Sidebar-/Navigationsthemen außer wenn sie direkt den Wochenkalenderkontext berühren

---

## Fachlicher Referenzpunkt aus Notion

Quelle:

- `https://www.notion.so/FT-03-Kalenderansichten-7833e4ee2b524bbb9ccaf45e9e807a98`

Titel:

- `FT (03): Kalenderansichten`

Stand laut Notion:

- `Abgeschlossen`

### Kernaussagen aus der Notion-Seite

Der Wochenkalender ist laut FT03 die zentrale Dispositions- und Planungsansicht. Termine werden wochenweise in Touren organisiert. Jede Tour bildet eine eigene Lane. Zusätzlich existiert eine Gruppe für Termine ohne Tourzuordnung.

Termine werden in der Wochenansicht als Kacheln oder als mehrtägige Spannelemente dargestellt. Sie können geöffnet, neu angelegt und bei zulässigen Sperr- und Rollenregeln per Drag & Drop verschoben werden.

Die Notion-Seite beschreibt zwei getrennte visuelle Regler:

### Kachelmodus

- `Kompakt`
- `Standard`
- `Detail`

Dieser Modus soll laut Beschreibung ausschließlich die Informationsdichte und vertikale Ausdehnung der Terminkacheln steuern.

### Tourenmodus

- `Aufgeklappt`
- `Zugeklappt`

Dieser Modus soll ausschließlich die visuelle Darstellung der Tour-Lanes steuern.

### Fachlich wichtige Aussage

Beide Darstellungsmodi sollen laut Featurebeschreibung keine fachliche Terminlogik verändern. Sie dürfen nur Visualisierung und Informationsdichte beeinflussen.

### Relevanz für den aktuellen Problemkontext

Die Notion-Beschreibung trennt klar zwischen:

- Kachelmodus
- Tour-Lane-Modus

Im aktuellen Code wurde jedoch am 19. April 2026 die frühere, separate `weekAppointmentDisplayMode`-Logik entfernt und das sichtbare Verhalten stärker an `calendar.weekTileBodyMode` gekoppelt. Diese Abweichung zwischen konzeptueller Beschreibung und aktuellem Codepfad ist für die aktuelle Fehlersuche sehr relevant.

---

## Zeitlicher Verlauf der relevanten Änderungen

Der folgende Verlauf basiert auf den gelesenen lokalen Git-Logs vom 17. April 2026 bis 20. April 2026 sowie auf den zugehörigen Repo-Logs unter `logs/`.

### 2026-04-17 — Commit `560df5850b4b3a2cf4dadef0fbf2999bc75ff1e0`

Titel:

- `Implement tour week planning UI`

Bedeutung:

Hier wurde die Tour-Wochenplanung als gemeinsamer UI-/Domänenpfad eingeführt bzw. vereinheitlicht. Die Änderung ist nicht der direkte Auslöser des aktuellen Layoutproblems, aber sie ist wichtig, weil seitdem mehrere Tour-/Wochen-Komponenten dieselbe KW-bezogene Darstellung und dieselben Projektionsideen teilen.

Wichtige Log-Datei:

- `logs/2026-04-17_tour-week-unification.md`

Wichtige Aussage aus dem Log:

- Wochenplanung von Touren und Mitarbeitern wurde auf ein gemeinsames Domänenobjekt `tour_week` und gemeinsame UI-Darstellung zusammengeführt.
- Ziel war eine einheitliche Wochenkarte, ein Wochenformular und konsistente Aktualisierung nach Mutationen.

Relevanz:

- Liefert den strukturellen Hintergrund für KW-bezogene UIs.
- Zeigt, dass Wochenkarten und KW-Darstellungen aktiv vereinheitlicht wurden.

### 2026-04-19 — Commit `d8a5b30f9e41d6531ae42fba594395d228fc2111`

Titel:

- `Fix compact week project preview`

Bedeutung:

Dies war ein lokaler Eingriff in den Projektblock der Wochenkarte im Kompaktpfad.

Betroffene Dateien:

- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/ui/project-info-panel.tsx`
- `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `tests/unit/ui/projectInfoPanel.render.test.tsx`

Wichtige Änderungen:

- Projekt-Header wurde von einer simplen Zeichenkette auf strukturierte Header-Darstellung umgebaut.
- Hover-Preview-Verhalten im kollabierten Projektpfad wurde erweitert.
- Fallback-/Leerzustand optisch verändert.

Relevanz:

- Diese Änderung betrifft direkt die Komponente `CalendarWeekAppointmentPanelProject.tsx`.
- Hier wurde aktiv am kompakten Wochenkarten-Projektpfad gearbeitet.

Wichtige Log-Datei:

- `logs/2026-04-19_week-calendar-project-preview-compact.md`

### 2026-04-19 — Commit `d826d50f31cb16a3a0ac7a16060058ef9e83d673`

Titel:

- `Stabilize week appointment card layout`

Bedeutung:

Dieser Commit hat die Wochenkarten deutlich breiter verändert.

Betroffene Dateien:

- `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/ui/customer-info-panel.tsx`
- `client/src/components/ui/project-article-description-renderer.tsx`
- zugehörige Tests

Wichtige Änderungen:

- Header bekam no-wrap-/truncate-/responsive-hide-Logik.
- Kundenpanel wurde strukturiert umgebaut.
- Projektlisten wurden stärker auf `overflow-hidden` und `whitespace-nowrap` ausgerichtet.
- Visuelle Stabilisierung bei starker horizontaler Komprimierung.

Wichtige Log-Datei:

- `logs/2026-04-19_week-card-layout.md`

Relevanz:

- Sehr wichtiger Layout-Eingriff.
- Hat mehrere UI-Schichten gleichzeitig verändert.
- Kann gut ein Vorläufer oder Mitverursacher der späteren Resthöhen-/Ausrichtungsprobleme sein.

### 2026-04-19 — Commit `f711eff6904b29f931770cd78484b9689ab143cc`

Titel:

- `Fix week customer detail panel header`

Bedeutung:

Dieser Commit war ein direkter Regressionsfix auf den vorherigen Layoutumbau.

Betroffene Dateien:

- `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`
- `client/src/components/ui/customer-info-panel.tsx`
- zugehörige Tests

Wichtige Änderung:

- Die zuvor eingeführte `hideHeader={mode === "expanded"}`-Logik im Kundenpanel wurde wieder entfernt.
- Zusätzlich wurde ein eingerückter Detailblock ergänzt.

Wichtige Log-Datei:

- `logs/2026-04-19_week-card-customer-detail-fix.md`

Relevanz:

- Belegt, dass kurz nach dem Layoutumbau bereits eine Regression sichtbar wurde.
- Zeigt, dass Änderungen an Customer-/Project-Panels bereits unmittelbare Folgefehler auslösten.

### 2026-04-19 — Commit `843d09b4c595f9a7a71ea515146cdc0dc7d81eed`

Titel:

- `Log session state for week compact panel issue`

Bedeutung:

Dies ist der wichtigste Commit für den aktuellen Problemkontext, weil das zugehörige Log explizit festhält, dass der sichtbare Browserfehler trotz mehrerer Änderungen nicht gelöst wurde.

Betroffene Dateien:

- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- zugehörige Tests

Wichtige Log-Datei:

- `logs/2026-04-19_week-card-compact-panel-session.md`

Besonders wichtige Aussagen aus dem Log:

- Sichtbares Problem: Im Wochenkalender blieb im Kompaktmodus unter dem Projektpanel unnötige Leerfläche sichtbar.
- Erwartung: Im Kompaktmodus sollen Kundenpanel und Projektpanel nur den Header zeigen; unter dem Projektpanel darf keine zusätzliche Leerzeile verbleiben.
- Die Session hat den sichtbaren Fehler nicht verlässlich gelöst.
- Ein Teil der Änderungen war zu breit und griff gleichzeitig in Lane-, Karten- und Panel-Logik ein.
- Die Tests waren grün, sicherten aber nicht den echten Browserfehler ab.
- Wichtige Erkenntnis: Die UI-Bezeichnung `Kompakt` hängt im Wochenkalender fachlich an `calendar.weekTileBodyMode = "collapsed"` und nicht primär an `weekAppointmentDisplayMode = "compact"`.

Relevanz:

- Das ist die zentrale Selbstdiagnose der vorherigen Fix-Session.
- Sie legt nahe, dass mindestens ein Teil der späteren Änderungen am falschen Schalter angesetzt hat.

### 2026-04-19 — Commit `fe2947ca6e33acba3fb7ce93df16c7ec98e9f234`

Titel:

- `Remove legacy week appointment display mode`

Bedeutung:

Dies ist einer der wichtigsten Architektur-/Wiring-Einschnitte im betrachteten Zeitraum.

Wichtige Änderungen:

- `calendar.weekAppointmentDisplayMode` wurde als Setting entfernt.
- `resolveWeekAppointmentDisplayMode` wurde aus `useSettings.ts` entfernt.
- entsprechende Registry-Definition wurde gelöscht.
- Persistenz- und Unit-Tests zum alten Wochen-Display-Mode wurden gelöscht.
- `CalendarWeekView`, `CalendarWeekAppointmentPanel`, `CalendarWeekSpanningTile`, `WeekGrid`, `CalendarWorkspace` wurden vom alten Display-Mode entkoppelt.
- Im Wochenkarten-/Spanning-Tile-Code wurde `isCompact` auf `weekTileBodyMode === "collapsed"` umgestellt.

Betroffene Dateien:

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/WeekGrid.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/hooks/useSettings.ts`
- `server/settings/registry.ts`

Relevanz:

- Ab diesem Zeitpunkt ist der frühere getrennte Display-Mode nicht mehr die aktive Steuergröße.
- Das sichtbare Wochenkartenverhalten hängt jetzt wesentlich stärker am Body-Modus `collapsed | semiexpanded | expanded`.
- Diese Änderung ist eine Hauptspur für alle späteren Verständniskonflikte zwischen „Kompakt“ als UI-Begriff und dem echten Codepfad.

### 2026-04-19 — Commit `e89d3fe19f9c833f513876a9e9ff6ee82e98004c`

Titel:

- `Tighten week project panel preview height`

Bedeutung:

Nachjustierung am Projektpanel und an den Klassen der Karteninhalte.

Wichtige Änderungen:

- `projectPanelClassName` wurde in nicht-kollabierten Pfaden auf `min-h-0 self-start` geändert.
- `compactContentClassName` und `collapsedPanelClassName` im Projektpanel wurden erneut angepasst.

Relevanz:

- Weitere starke Feinjustierung an Höhen-/Ausrichtungsverhalten.
- Kann Teil der Kette sein, die zu späteren `w-full`-/`h-full`-Korrekturen führte.

### 2026-04-19 — Commit `7e540cbd29e1c23261c89b9783ba2df537704554`

Titel:

- `Implement tour postal plan week preview`

Bedeutung:

Der Tour-PLZ-Plan begann, bestehende Wochenkalender-Bausteine wiederzuverwenden.

Wichtige Log-Datei:

- `logs/2026-04-19_tour-plz-week-preview.md`

Wichtige Dateien:

- `client/src/components/calendar/TourPostalPlanWeekPreview.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`

Relevanz:

- Die Wochenkarten-/Tile-Logik wurde nicht nur im eigentlichen Wochenkalender genutzt, sondern auch in einer zweiten UI wiederverwendet.
- Dadurch konnten spätere Layout-Fixes an mehreren Orten Wirkung entfalten oder Seiteneffekte erzeugen.

### 2026-04-19 — Commit `5f4a362d70fb52b7fea0d9f3631dc346307e4c0b`

Titel:

- `Refine tour postal plan preview and free-slot filter`

Bedeutung:

- Weiterer Ausbau der Tour-PLZ-Vorschau.
- Mehr Kontext für die reuse-basierte Wochenvorschau.

Wichtige Log-Datei:

- `logs/2026-04-19_tour-plz-free-appointments.md`

Relevanz:

- Nicht Hauptursache für den Wochenkartenfehler, aber wichtig, weil derselbe Wochenkarten-Unterbau weiterhin an zweiter Stelle verwendet wird.

### 2026-04-20 — Commit `cc6d08ed17e37988c6e2e3077b79a7b8b34a7b57`

Titel:

- `Fix week grid alignment and postal plan updates`

Bedeutung:

Neuester Commit im untersuchten Verlauf.

Wichtige Änderungen:

- `CalendarWeekAppointmentPanel` und `CalendarWeekSpanningTile` bekamen `w-full`-/`h-full`-Änderungen.
- `CalendarWeekAppointmentPanelProject` bekam `w-full`.
- `TourPostalPlanWeekPreview`-Header wurde umgebaut.
- Tests wurden auf `w-full`/neue Klassen nachgezogen.

Relevanz:

- Der heutige Fix wirkt wie ein weiterer Versuch, Breitenfüllung und Grid-Ausrichtung zu reparieren.
- Laut Nutzer hat dieser Fix das eigentliche Problem nicht gelöst.

---

## Wichtigste Repo-Logs als Primärquellen

### `logs/2026-04-17_tour-week-unification.md`

Nutzen:

- struktureller Hintergrund für gemeinsame Tour-/KW-Darstellungen
- zeigt Vereinheitlichung von Wochenkarten, Wochenformular und Query-Invalidierung

### `logs/2026-04-19_week-calendar-project-preview-compact.md`

Nutzen:

- lokaler Eingriff in den kompakten Projektblock
- dokumentiert Header-/Preview-Fix im Projektpanel

### `logs/2026-04-19_week-card-layout.md`

Nutzen:

- dokumentiert den breiten Layout-Eingriff an Wochenkarten
- wichtig für Header-, Customer- und Project-Panel-Stabilisierung

### `logs/2026-04-19_week-card-customer-detail-fix.md`

Nutzen:

- dokumentiert direkte Folge-Regression nach dem Layoutumbau
- zeigt, dass bereits kurzfristig ein sichtbarer Fix nötig war

### `logs/2026-04-19_week-card-compact-panel-session.md`

Nutzen:

- wichtigste Quelle für den noch offenen Fehler
- benennt explizit:
  - sichtbare Restleerfläche
  - möglicherweise zu breiten Eingriff
  - grüne, aber unzureichende Tests
  - Schalterverwechslung zwischen Display-Mode und `weekTileBodyMode`

### `logs/2026-04-19_tour-plz-week-preview.md`

Nutzen:

- dokumentiert Wiederverwendung der Wochenkarten-Bausteine in der Tour-PLZ-Vorschau

### `logs/2026-04-19_tour-plz-free-appointments.md`

Nutzen:

- ergänzt den Tour-PLZ-Kontext, in dem dieselben Wochenvorschau-Bausteine verwendet werden

---

## Zentrale Komponenten und ihre Rollen

### `client/src/components/calendar/CalendarWeekView.tsx`

Rolle:

- Hauptkomponente der Wochenansicht
- organisiert Tour-Lanes, Tage, Grid-Aufbau, Spanning-Tiles und Einzelkarten
- enthält die Verteilung auf Grid-Zellen und Lane-bezogene Layoutlogik
- enthält außerdem die Kopplung zu `weekTileBodyMode` und dem Lane-Collapse-Zustand

Wichtige Bedeutung:

- Wenn ein sichtbares Höhen-/Leerraumproblem nicht nur innerhalb eines Panels entsteht, ist dies die erste Hauptkomponente für äußere Ursachen.

### `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`

Rolle:

- Kartenhülle für Ein-Tages-Termine
- setzt Header, Customer-Panel, Project-Panel und Footer zusammen
- bestimmt Grid-Template-Rows und interne Shell-Struktur

Wichtige Bedeutung:

- Direkt relevant für jedes Problem innerhalb einer Wochenkarte bei Ein-Tages-Terminen.

### `client/src/components/calendar/CalendarWeekSpanningTile.tsx`

Rolle:

- Kartenhülle für Mehrtages-Termine
- setzt analoge Inhalte wie `CalendarWeekAppointmentPanel` zusammen, aber im Spanning-Tile-Kontext

Wichtige Bedeutung:

- Direkt relevant für Mehrtagestermine.
- Wenn Ein-Tages- und Mehrtages-Karten beide denselben Fehlercharakter zeigen, ist diese Datei neben `CalendarWeekAppointmentPanel.tsx` zwingend mit zu prüfen.

### `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`

Rolle:

- Projekt-/Auftragsblock innerhalb einer Wochenkarte
- zeigt Projektheader, Auftragsnummer, Artikelliste und Beschreibung
- kann kollabiert oder nicht kollabiert gerendert werden
- nutzt HoverPreview für Vollinhalt

Wichtige Bedeutung:

- Direkt betroffen bei sichtbaren Problemen unterhalb des Projekt-Headers.
- Aber: Nicht die ganze Karte, sondern nur der Projekt-Teil der Karte.

### `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`

Rolle:

- Kundenblock innerhalb einer Wochenkarte
- delegiert Rendering an `customer-info-panel.tsx`

Wichtige Bedeutung:

- Direkt relevant für Customer-Header, Adressblock und Detaileinrückung.

### `client/src/components/ui/project-info-panel.tsx`

Rolle:

- allgemeiner Projekt-Panel-Renderer
- liefert Header-/Fallback-/Preview-Muster, die im Wochenkartenkontext wiederverwendet oder gespiegelt werden

Wichtige Bedeutung:

- wichtig zum Verständnis gemeinsamer Projekt-Header- und Preview-Semantik

### `client/src/components/ui/customer-info-panel.tsx`

Rolle:

- allgemeiner Customer-Panel-Renderer
- steuert Header, Adressblock, Kontaktzeilen und Einrückung

Wichtige Bedeutung:

- wichtige Unterkomponente des Wochenkarten-Kundenpfads

### `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`

Rolle:

- Header-Leiste der Tour-Lane
- steuert Label, Notes-Segment, Statusslot, Menüslot
- wurde für die Tour-PLZ-Preview um einen reduzierten Modus erweitert

Wichtige Bedeutung:

- relevant, wenn Tour-Lane-Auf-/Zugeklappt oder Preview-Reuse im Fokus stehen

### `client/src/components/calendar/weekLaneState.ts`

Rolle:

- Hilfslogik für Zustand der Tour-Lanes im kollabierten Zustand
- bestimmt, welche Lane bei kollabierter Wochenansicht effektiv expandiert bleibt

Wichtige Bedeutung:

- nicht primär für Kartenhöhe, aber wichtig für `Touren aufgeklappt/zugeklappt`

### `client/src/components/CalendarWorkspace.tsx`

Rolle:

- bindet die Wochenansicht an User-Settings und Workspace-Navigation an

Wichtige Bedeutung:

- zeigt, welche Settings die Wochenansicht aktuell wirklich ansteuern

### `client/src/components/WeekGrid.tsx`

Rolle:

- schmale Durchreiche zur `CalendarWeekView`

Wichtige Bedeutung:

- wichtig, um zu sehen, welche Props zwischen Workspace und WeekView tatsächlich noch existieren

### `client/src/components/calendar/TourPostalPlanWeekPreview.tsx`

Rolle:

- wiederverwendete kompakte Wochenvorschau im Tour-PLZ-Plan
- benutzt `CalendarWeekAppointmentPanel`, `CalendarWeekSpanningTile`, `CalendarWeekTourLaneHeaderBar` und `buildWeekLaneRenderData`

Wichtige Bedeutung:

- wichtig, weil dieselben Kartenbausteine hier zweitverwendet werden
- kann helfen, Unterschiede zwischen isolierter Reuse und echter Wochenansicht zu vergleichen

---

## Einstellungen, Modi und ihre aktuelle Bedeutung

### Aktuell aktive relevante Settings

#### `calendar.weekTileBodyMode`

Mögliche Werte:

- `collapsed`
- `semiexpanded`
- `expanded`

Bedeutung im aktuellen Code:

- steuert maßgeblich die Body-Ausprägung der Wochenkarten
- `collapsed` ist aktuell der entscheidende Schalter für den „kompakt wirkenden“ Pfad

Wichtige Fundstellen:

- `client/src/hooks/useSettings.ts`
- `server/settings/registry.ts`
- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`

#### `calendar.weekLanes.isCollapsed`

Bedeutung:

- steuert den allgemeinen Zustand der Tour-Lanes

#### `calendar.weekLanes.expandedLaneId`

Bedeutung:

- merkt sich, welche Lane im kollabierten Zustand effektiv geöffnet bleibt

### Entfernte Alt-Logik

#### `calendar.weekAppointmentDisplayMode`

Frühere Werte:

- `standard`
- `compact`
- `detail`
- `split`

Status:

- am 19. April 2026 entfernt

Konsequenz:

- Ein Teil älterer Denkmodelle, Tests oder Nutzerformulierungen kann sich noch auf diesen früheren Modus beziehen.
- Im aktuellen Code ist dieser Modus jedoch nicht mehr die Hauptsteuergröße.

### Zentrale aktuelle Erkenntnis

Wenn im aktuellen Code oder bei UI-Bugs von „Kompakt“ gesprochen wird, muss immer geprüft werden, ob damit gemeint ist:

- ein historischer Begriff aus dem alten `weekAppointmentDisplayMode`
- oder der heute tatsächlich aktive Pfad `weekTileBodyMode === "collapsed"`

Diese Unterscheidung ist für die Fehlersuche zentral.

---

## Wesentliche technische Hypothesen aus dem gesammelten Kontext

### Hypothese 1: Der sichtbare Fehler liegt nicht nur im Projektpanel

Begründung:

- Das Session-Log vom 19. April benennt ausdrücklich, dass die verbleibende Leerfläche sehr wahrscheinlich nicht nur aus dem Panel selbst entsteht.
- Mehrere Fixversuche griffen bereits in Karten-Shell, Footer und Lane-Höhe ein.

Folge:

- `CalendarWeekAppointmentPanelProject.tsx` allein zu untersuchen reicht wahrscheinlich nicht.
- Die Shells `CalendarWeekAppointmentPanel.tsx`, `CalendarWeekSpanningTile.tsx` und `CalendarWeekView.tsx` sind mit zu betrachten.

### Hypothese 2: Die Umstellung auf `weekTileBodyMode` ist ein Wendepunkt

Begründung:

- `fe2947c` entfernt den alten Display-Mode und verlagert die Logik auf `weekTileBodyMode`.
- Spätere Änderungen und Tests referenzieren `collapsed` als echten Kompaktpfad.

Folge:

- Fehlerbeschreibung und Debugging müssen strikt auf den realen aktuellen Schalter gemappt werden.

### Hypothese 3: Ein Teil der Tests sichert Markup statt sichtbares Verhalten ab

Begründung:

- Das Repo-Log vom 19. April sagt ausdrücklich, dass die grünen Tests den sichtbaren Browserfehler nicht belastbar abgesichert haben.
- Viele Tests prüfen Klassenfragmente und interne Struktur, nicht den tatsächlichen visuellen Effekt.

Folge:

- Für eine echte Behebung muss man den real sichtbaren Fehler im Browser oder über robuste visuelle Kriterien nachverfolgen, nicht nur per statischem Markup.

### Hypothese 4: Die spätere `w-full`-/`h-full`-Korrektur deutet auf Breiten- und Streckungsprobleme hin

Begründung:

- Im Commit `cc6d08e` wurden sowohl Panels als auch Grid-Container explizit auf `w-full` oder `h-full` umgestellt.

Folge:

- Es bestand zumindest zuletzt ein Problem mit unvollständiger Breitenfüllung, Selbst-Ausrichtung oder Shrink-/Grow-Verhalten.
- Das kann entweder Hauptursache oder Folge eines früheren Shell-Problems sein.

### Hypothese 5: Tour-PLZ-Preview kann als Vergleichsfläche nützlich sein

Begründung:

- Die Tour-PLZ-Vorschau nutzt dieselben Kernbausteine, aber in einem kleineren, kontrollierteren Umfeld.

Folge:

- Unterschiede zwischen Wochenansicht und Tour-PLZ-Vorschau können helfen, äußere Lane-/Grid-Probleme von inneren Panel-Problemen zu trennen.

---

## Relevante Dateien im Workspace

### Primäre Kern-Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelProject.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelCustomer.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/components/calendar/weekLaneState.ts`

### Wichtige Unterbau-/Shared-Renderer

- `client/src/components/ui/project-info-panel.tsx`
- `client/src/components/ui/customer-info-panel.tsx`
- `client/src/components/ui/project-article-description-renderer.tsx`

### Workspace-/Settings-Wiring

- `client/src/components/CalendarWorkspace.tsx`
- `client/src/components/WeekGrid.tsx`
- `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
- `client/src/hooks/useSettings.ts`
- `server/settings/registry.ts`
- `shared/appointmentDisplayMode.ts`

### Reuse im Tour-PLZ-Kontext

- `client/src/components/TourPostalPlanView.tsx`
- `client/src/components/calendar/TourPostalPlanWeekPreview.tsx`
- `client/src/lib/calendar-appointments.ts`
- `client/src/lib/tour-postal-plan.ts`
- `server/lib/tourPostalPlan.ts`
- `server/services/appointmentsService.ts`
- `shared/routes.ts`

### Relevante Tests

- `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
- `tests/unit/ui/calendarWeekView.headerControls.test.tsx`
- `tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `tests/unit/ui/calendarWeekView.laneHoverFallback.test.tsx`
- `tests/unit/ui/customerInfoPanel.render.test.tsx`
- `tests/unit/ui/projectInfoPanel.render.test.tsx`
- `tests/unit/ui/tourPostalPlanWeekPreview.render.test.tsx`
- `tests/unit/settings/useSettings.weekTileBodyMode.test.ts`
- `tests/unit/settings/weekTileBodyMode.registry.test.ts`
- `tests/integration/server/calendar.tour-postal-plan.integration.test.ts`

---

## Was die wichtigsten Komponenten darstellen

### `CalendarWeekAppointmentPanelProject.tsx`

Diese Komponente stellt den Projekt-/Auftragsbereich innerhalb einer einzelnen Wochenkalender-Termin-Karte dar.

Sie rendert:

- Projektnamen
- Auftragsnummer
- optional Artikelliste
- optionale Beschreibung
- optional HoverPreview für den Vollinhalt

Wichtig:

- Sie ist nicht die gesamte Karte.
- Sie ist nur der Projektblock innerhalb der Karte.

### `CalendarWeekAppointmentPanelCustomer.tsx`

Diese Komponente stellt den Kundenbereich innerhalb einer einzelnen Wochenkalender-Termin-Karte dar.

Sie rendert über `customer-info-panel.tsx`:

- Kundenname
- Kundennummer
- je nach Modus Adresse, Ort, Land, Telefon, E-Mail

Wichtig:

- Auch diese Komponente ist nicht die gesamte Karte.
- Sie ist das Gegenstück zum Projektblock.

### Zusammensetzung der Karte

Im Regelfall setzt die Kartenhülle zusammen:

- Header
- Customer-Panel
- Project-Panel
- Footer

Diese Zusammensetzung passiert vor allem in:

- `CalendarWeekAppointmentPanel.tsx`
- `CalendarWeekSpanningTile.tsx`

---

## Konkrete Problemachsen für einen Folgechat

Die folgende Liste benennt die sinnvollsten Achsen für eine nächste Fehleranalyse.

### Problemachse 1: Verwechslung von UI-Begriffen und Codepfaden

Fragen:

- Was meint die aktuelle Fehlerbeschreibung genau mit „Kompakt“, „Standard“, „Detail“?
- Bezieht sich das auf alte UI-Begriffe oder auf `weekTileBodyMode`?

### Problemachse 2: Ein-Tages-Karte versus Mehrtages-Kachel

Fragen:

- Tritt der Fehler nur bei `CalendarWeekAppointmentPanel.tsx` auf?
- Oder auch bei `CalendarWeekSpanningTile.tsx`?
- Ist das Symptom identisch oder nur ähnlich?

### Problemachse 3: Panel-intern versus Shell-/Grid-bedingt

Fragen:

- Entsteht die sichtbare Resthöhe im Projektpanel selbst?
- Oder erst durch die Grid-Zeilen, Wrapper, Lane-Höhen oder Footer-Shells?

### Problemachse 4: Nur Wochenansicht oder auch Reuse in der Tour-PLZ-Vorschau

Fragen:

- Tritt ein ähnliches Verhalten auch in `TourPostalPlanWeekPreview.tsx` auf?
- Wenn nicht, was unterscheidet dort das äußere Grid-/Lane-Setup?

### Problemachse 5: Browser-Symptom versus Testgrün

Fragen:

- Welche visuell beobachtbare Fehlstelle existiert konkret?
- Welche Tests waren grün, obwohl das Symptom im Browser blieb?
- Welche Assertions sichern nur Struktur statt sichtbare Wirkung?

---

## Vorläufiges Gesamtfazit

Der gesammelte Kontext spricht dafür, dass das aktuelle Wochenkartenproblem nicht als rein lokaler Fehler in `CalendarWeekAppointmentPanelProject.tsx` betrachtet werden sollte.

Am wahrscheinlichsten ist eine Kette aus:

- größerem Layoutumbau an Wochenkarten am 19. April,
- direkter Folge-Regression im Kundenpanel,
- anschließender, nicht vollständig erfolgreicher Session zum Kompaktproblem,
- Umstellung vom alten `weekAppointmentDisplayMode` auf `calendar.weekTileBodyMode`,
- weiteren Höhen-/Ausrichtungs- und Breiten-Fixes,
- grünem Testzustand ohne saubere Abdeckung des real sichtbaren Browserfehlers.

Die stärkste technische Spur ist:

- aktueller Kompaktpfad = `weekTileBodyMode === "collapsed"`

Die stärkste inhaltliche Warnung aus den vorhandenen Logs ist:

- Ein Teil der früheren Fixversuche war zu breit.
- Die grün gewordenen Tests bewiesen nicht, dass das eigentliche sichtbare Problem wirklich behoben war.

---

## Empfohlener Startpunkt für den nächsten Chat

Wenn dieses Dokument in einen Folgechat eingespeist wird, sollte der nächste Auftrag möglichst direkt zusätzlich enthalten:

- eine präzise Fehlerbeschreibung mit sichtbarem Symptom
- ob Ein-Tages-Termine, Mehrtages-Termine oder beide betroffen sind
- welcher Modus konkret aktiv ist:
  - `collapsed`
  - `semiexpanded`
  - `expanded`
- ob Tour-Lanes aufgeklappt oder zugeklappt sind
- ob das Problem nur im Wochenkalender oder auch in wiederverwendeten Vorschauen sichtbar ist
- was genau die heutigen Fixes sichtbar nicht erreicht haben

Damit kann der Folgechat den Fehler sofort gegen die hier dokumentierte Commit-, Log- und Dateibasis mappen.
