# Test Follow-up 2026-03-11

Offene Testarbeiten fuer die in diesem Chat umgesetzten Aenderungen.

Ziel dieses Dokuments ist nicht die Rueckschau auf alle Details, sondern eine umsetzbare Liste der noch noetigen Absicherung.

## Prioritaet A

### 1. Integrationstest fuer `/api/projects` mit `projectArticleItems`

- Ebene: Integration
- Risiko: Hoch
- Betroffene Dateien:
  - `server/repositories/projectsRepository.ts`
  - `shared/routes.ts`
  - `client/src/components/AppointmentForm.tsx`
- Grund:
  - Der Terminformular-Projektslot nutzt jetzt die kombinierte Ausgabe aus Artikelliste und Anmerkungen.
  - Dafuer liefert der `/api/projects`-Pfad nun `projectArticleItems`.
  - Bisher ist nur `/api/projects/list` integrativ auf Artikellisten abgesichert.
- Noetige Faelle:
  - `GET /api/projects?filter=all&scope=all` liefert `projectArticleItems` fuer Projekte mit Order-Items.
  - Leere Projektdaten liefern `projectArticleItems: []`.
  - Reihenfolge der Artikelliste entspricht der fachlichen Slot-Reihenfolge.

### 2. Render-Test fuer `ProjectDetailCard` mit Vollausgabe

- Ebene: Unit
- Risiko: Hoch
- Betroffene Datei:
  - `client/src/components/ui/project-detail-card.tsx`
- Grund:
  - Der Projektslot im Terminformular rendert nicht mehr nur rohe HTML-Beschreibung, sondern den kombinierten Renderer.
  - Aktuell ist das nur ueber Quelltextmarker abgesichert.
- Noetige Faelle:
  - Nur Artikelliste sichtbar.
  - Nur Anmerkungen sichtbar.
  - Artikelliste und Anmerkungen gemeinsam sichtbar.
  - Leerer Fallback `nicht hinterlegt`.
  - Status-Badges bleiben im Footer erhalten.

### 3. End-to-end-/Integrationstest fuer konkrete Drag-and-Drop-Validierungsmessage

- Ebene: Integration oder E2E Browser
- Risiko: Hoch
- Betroffene Dateien:
  - `client/src/components/calendar/CalendarWeekView.tsx`
  - `client/src/components/calendar/CalendarMonthSheetView.tsx`
  - `server/services/appointmentsService.ts`
- Grund:
  - Die UI reicht jetzt konkrete `VALIDATION_ERROR`-Meldungen durch.
  - Es fehlt der Nachweis, dass der Server in einem realen Vergangenheitsfall die fachlich richtige Message liefert und diese in der UI sichtbar wird.
- Noetige Faelle:
  - Termin auf heute in bereits vergangene Uhrzeit verschieben.
  - Fehlende Server-Message faellt auf generischen Fallback zurueck.

## Prioritaet B

### 4. Render-Test fuer Projektfilter-Panel

- Ebene: Unit
- Risiko: Mittel
- Betroffene Dateien:
  - `client/src/components/ui/filter-panels/project-filter-panel.tsx`
  - `client/src/components/ui/search-filter-input.tsx`
  - `client/src/components/filters/customer-number-filter-input.tsx`
  - `client/src/components/filters/project-order-number-filter-input.tsx`
- Grund:
  - Die Filterlogik ist aktuell hauptsaechlich ueber Source-/Wiring-Tests abgesichert.
  - Das sichtbare Verhalten der Labels und Placeholder ist damit nicht belastbar verifiziert.
- Noetige Faelle:
  - Sichtbare Labels `Kundennummer` und `Auftragsnummer` werden gerendert.
  - Placeholder lautet jeweils `Suche: Nr.`.
  - Projektname, Nachname, beide Nummernfelder, Switches und Statusfilter liegen im gemeinsamen Reihenlayout.

### 5. Render-Test fuer Wochenkalender-Footer mit Drucksteuerung

- Ebene: Unit oder E2E Browser
- Risiko: Mittel
- Betroffene Dateien:
  - `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
  - `client/src/components/CalendarWorkspace.tsx`
- Grund:
  - Die Verdrahtung ist abgesichert, das konkrete Layout aber nicht.
  - Die letzten Aenderungen betrafen Spaltengruppierung, Druckblock-Rechtsausrichtung, Mojibake-Korrektur und engere Gruppierung.
- Noetige Faelle:
  - Zwei gleich breite Footer-Spalten in der Wochenansicht.
  - Druck-UI sitzt vollstaendig in der rechten Spalte.
  - `Wochenplanung drucken` wird korrekt angezeigt.
  - Tour-Auswahl, Wochenfeld und Vorschau stehen als kompakter Block zusammen.

### 6. Render-Test fuer Projektkarten-Statusbadges

- Ebene: Unit
- Risiko: Mittel
- Betroffene Datei:
  - `client/src/components/ProjectsPage.tsx`
- Grund:
  - Die Statusbadges wurden auf minimale Breite und alternierende Verteilung links/rechts umgebaut.
  - Dafuer gibt es derzeit keinen dedizierten Verhaltenstest.
- Noetige Faelle:
  - Ein Badge sitzt links.
  - Zwei Badges verteilen sich links/rechts.
  - Drei Badges umbrechen konsistent auf die naechste Zeile.

## Prioritaet C

### 7. Render-Test fuer Kartenfooter von Projekt und Kunde

- Ebene: Unit
- Risiko: Mittel
- Betroffene Dateien:
  - `client/src/components/ProjectsPage.tsx`
  - `client/src/components/CustomersPage.tsx`
- Grund:
  - Viel Footer-Refactoring ist verdrahtet, aber nicht in realem DOM-Verhalten geprueft.
- Noetige Faelle:
  - `Geplante Termine` in Projektkarten auf Inhaltsbreite.
  - Notiz-Trigger nur sichtbar, wenn `notesCount > 0`.
  - Kundenzeile in Projektkarten bleibt unten angedockt.
  - Kundenkarten zeigen `K-Nr.` im rechten Headerbereich.

### 8. Render-Test fuer Projektformular-Tabs

- Ebene: Unit
- Risiko: Niedrig bis Mittel
- Betroffene Dateien:
  - `client/src/components/ProjectForm.tsx`
  - `client/src/components/ProjectOrderForm.tsx`
- Grund:
  - Das Andocken der Panels, die Umbenennung zu `Anmerkungen` und das Entfernen der doppelten Artikellisten-Headline sind aktuell vor allem ueber Wiring abgesichert.
- Noetige Faelle:
  - Tab `Anmerkungen` vorhanden.
  - HTML-Editor in eigenem angedockten Panel.
  - Artikellisten-Tab ohne doppelte Innen-Headline.

### 9. Browser-Regressionstest fuer Mojibake-Risiko in geaenderten UI-Pfaden

- Ebene: E2E Browser
- Risiko: Niedrig bis Mittel
- Betroffene Dateien:
  - `client/src/components/ui/filter-panels/calendar-filter-panel.tsx`
  - `client/src/components/ui/filter-panels/project-filter-panel.tsx`
  - `client/src/components/ui/project-article-description-renderer.tsx`
- Grund:
  - In diesem Chat gab es bereits mehrfach echte Encoding-/Mojibake-Korrekturen.
  - Ein Browser-Regressionstest waere hier robuster als reine Quelltextmarker.
- Noetige Faelle:
  - Keine `Ã`-/falsch kodierten Umlaute in den sichtbaren Labels der geaenderten Bereiche.

## Empfohlene Reihenfolge

1. `/api/projects`-Integrationstest
2. `ProjectDetailCard`-Render-Test
3. Drag-and-Drop-Message als Integrations- oder Browser-Test
4. Projektfilter-Panel-Render-Test
5. Wochenkalender-Footer-/Druck-Render-Test
6. Projektkarten-Statusbadge-Render-Test
7. Restliche Layout-Regressionen

## Nicht Teil dieses Follow-ups

- Bereits vorhandene Wiring-Tests aus `docs/TEST_MATRIX.md`
- Voller Audit oder voller Testlauf
- Umsetzung der Tests selbst
