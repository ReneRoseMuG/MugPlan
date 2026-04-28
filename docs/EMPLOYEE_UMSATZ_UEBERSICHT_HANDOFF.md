# Übergabe: Mitarbeiter-Tab `Umsatz Übersicht`

## Status
- Branch bereits angelegt und gepusht: `feature/employee-umsatz-uebersicht`
- Basis: `work`
- Remote-Tracking aktiv: `origin/feature/employee-umsatz-uebersicht`
- Aktueller Code-Stand: noch ohne inhaltliche Implementierung der Umsatzübersicht

## Auftragsklassifikation
- Klasse 5: mehrschichtige Änderung oder neues Feature
- Begründung:
  Neues Mitarbeiter-Tab, neuer serverseitiger Read-Path, Contract-Erweiterung, neue Frontend-Komponente und umfangreiche Test-Suite

## Gelesene Dokumentation
- `architecture-index.md`
- `implementation-index.md`
- `docs/architecture.md`
  - Abschnitt 3: Architekturprinzipien
  - Abschnitt 5: Rollen- und Zugriffsarchitektur
  - Abschnitt 8.1/8.2: Kalender-Aggregation und Listen-/Detailflüsse
  - Abschnitt 10: Erweiterungspunkte
- `docs/implementation.md`
  - Abschnitt 3: Contract-First und Schichten
  - Abschnitt 5.1: Termine und Overlap
  - Abschnitt 6.3/6.4: Filter-Pattern und Listen-Architektur
  - Abschnitt 10: Implementierungsregeln
  - Abschnitt `Sichtbarkeit von Daten`

## Warum diese Dokumentenwahl ausreicht
- Das Feature bleibt im bestehenden Mitarbeiter-/Terminpfad
- Es wird keine neue Domäne eingeführt
- Es wird kein DB-Schema geändert
- Es gibt keine neue Rollenlogik, sondern nur einen neuen lesenden Endpoint mit denselben Sichtbarkeitsregeln wie bestehende Mitarbeiter-Detailpfade

## Fachliche Zielbeschreibung
Im Mitarbeiterformular soll ein neues Tab `Umsatz Übersicht` entstehen. Dort wird eine wochenweise berechnete Übersicht über die Umsätze der Mitarbeitertermine dargestellt.

Grundlage:
- alle Termine des Mitarbeiters
- nur Termine mit zugeordnetem Projekt
- nur Projekte mit vorhandener Auftragssumme
- Ausschluss von Reklamationsfällen

Darstellung:
- gruppiert nach ISO-Kalenderwoche und ISO-Jahr
- Tabelle mit Spalten `KW/Jahr`, `Anzahl Aufträge`, `Umsatz`
- aufsteigend nach KW sortiert
- Beginn mit der frühesten verfügbaren aggregierten Woche

Zusätzlich:
- Hover-Preview pro Tabellenzeile
- unten angedocktes Filterpanel mit einfachem KW-Freitextfilter
- sticky Tabellenkopf
- Zeilen in eigenem Scrollcontainer

## Rollenbezug und technische Durchsetzung
### Betroffene Rollen
- `ADMIN`
- `DISPONENT`
- `LESER`

### Erlaubte Sichtbarkeit
- sichtbar für dieselben Rollen, die bestehende Mitarbeiterdetails lesen dürfen

### Erlaubte Aktionen
- Lesen
- Filtern
- Scrollen
- Hover-Preview

### Nicht erlaubt
- keine Mutation
- kein Export
- keine Rechteänderung

### Technische Durchsetzung
- Frontend:
  reines Anzeigen des Tabs im Mitarbeiterformular
- Backend:
  eigentliche Absicherung über neuen lesenden Mitarbeiter-Endpoint analog zu bestehenden Mitarbeiter-Detailpfaden
- Inaktive Mitarbeitende:
  weiterhin nur für `ADMIN` serverseitig lesbar

## Bisher gesicherte technische Befunde
### Mitarbeiterformular
Die Haupt-Tabs im bestehenden Mitarbeiterformular sind aktuell:
- `Stammdaten`
- `Termine`
- `Wochenplanung`
- `Auslastung`

Datei:
- `client/src/components/EmployeeForm.tsx`

### Bestehende Tabellen- und Hover-Infrastruktur
Vorhandene, wiederverwendbare Bausteine:
- `client/src/components/ui/table-view.tsx`
  - unterstützt `stickyHeader`
  - unterstützt `rowPreviewRenderer`
  - nutzt `HoverPreview`
  - hat `footerSlot` und sticky Footer-Verhalten
- `client/src/components/ui/hover-preview.tsx`
  - unterstützt cursor-basierten Hover
  - enthält Logik für saubere Positionierung im Viewport
- `client/src/components/ui/filter-panels/filter-panel.tsx`
- `client/src/components/ui/search-filter-input.tsx`
- `client/src/components/ui/filter-input.tsx`

### Bestehende Termin-Badge-Muster
Vorhandene Badge- und Preview-Bausteine:
- `client/src/components/ui/termin-info-badge.tsx`
- `client/src/components/AllAppointmentsPanel.tsx`
- `client/src/components/ui/info-badge.tsx`

Diese sind die naheliegende Grundlage für die kompakten Termin-Badges in der Wochen-Preview.

### Bestehender Mitarbeiter-Termin-Endpoint reicht fachlich nicht aus
Vorhandener Endpoint:
- `GET /api/employees/:id/appointments`

Problem:
- liefert zwar Termin-, Projekt-, Kunden- und Tagdaten
- liefert aber keine direkt nutzbare Auftragssumme für die Umsatzaggregation

Daraus folgt:
- eigener dedizierter Read-Path für die Umsatzübersicht ist sinnvoller und stabiler als clientseitiges Nachbauen aus bestehender Terminliste

### Vorhandene serverseitige Rohdatenquelle
Nutzbarer Rohdatenpfad:
- `appointmentsRepository.listSidebarAppointmentsByEmployeeScope(employeeId, fromDate?)`

Dieser liefert:
- `appointment`
- `project`
- `projectOrder`
- `customer`
- `tour`

Zusätzliche Tag-Maps stehen bereits zur Verfügung:
- `appointmentsRepository.getAppointmentTagsByAppointmentIds(...)`
- `appointmentsRepository.getProjectTagsByProjectIds(...)`

Damit kann die Umsatzaggregation ohne neuen DB-Schemaeingriff aufgebaut werden.

### Reklamationslogik
Vorhandene fachliche Hilfsfunktion:
- `isManagedComplaintTagName(...)`
aus
- `shared/appointmentCancellation.ts`

Diese soll für den Ausschluss verwendet werden bei:
- Reklamations-Termin
- Reklamations-Projekt

## Festgelegte fachliche Regeln
### Qualifizierte Datensätze
Ein Termin geht nur in die Umsatzübersicht ein, wenn:
- `projectId` vorhanden ist
- eine Auftragssumme in `project_order.amount` vorhanden ist
- weder der Termin noch das Projekt das Tag `Reklamation` trägt

### Deduplizierung
Festgelegt wurde:
- Deduplizierung global über die Auftragsnummer
- nicht nur pro Woche
- nicht nur pro Termin

Ziel:
- fehlerhafte Dubletten oder Datenartefakte dürfen Umsatz nicht mehrfach aufblasen

Deterministische Auswahl beim Dublettenfall:
- frühestes `startDate`
- dann früheste `startTime`
- dann kleinste `appointmentId`

Falls eine Auftragsnummer ausnahmsweise fehlt:
- erwartetes IST-Verhalten im System ist faktisch, dass Projektaufträge eine Auftragsnummer besitzen
- falls in der Implementierung trotzdem ein Fallback nötig wird, muss dieser technisch eindeutig und nicht deduplizierend sein

### Wochenzuordnung
Festgelegt wurde:
- ISO-Kalenderwoche
- ISO-Jahr
- Zuordnung über `startDate`

Multi-Day-Termine:
- keine Aufteilung über mehrere Wochen
- Zuordnung ausschließlich zur ISO-Woche des `startDate`

### Summenbildung
- `orderCount` zählt nach Deduplizierung
- `revenueAmount` summiert nur die qualifizierten, deduplizierten Aufträge
- maßgebliches Feld: `project_order.amount`

## Geplante öffentliche Schnittstelle
Neuer Contract in `shared/routes.ts`:
- `GET /api/employees/:id/revenue-overview`

### Response-Struktur
```ts
{
  employeeId: number;
  employeeFullName: string;
  weeks: Array<{
    isoYear: number;
    isoWeek: number;
    weekStartDate: string;
    weekEndDate: string;
    weekLabel: string;
    orderCount: number;
    revenueAmount: string;
    appointments: Array<{
      appointmentId: number;
      startDate: string;
      projectName: string;
      orderNumber: string | null;
      amount: string;
    }>;
  }>;
}
```

## Betroffene Dateien und Schichten
### Contract
- `shared/routes.ts`

### Route/Controller/Service/Repository
- `server/routes/employeesRoutes.ts`
- `server/controllers/employeesController.ts`
- `server/services/employeesService.ts`
- bestehende Rohdatenbasis voraussichtlich über `server/repositories/appointmentsRepository.ts`

### Frontend
- `client/src/components/EmployeeForm.tsx`
- neue dedizierte Umsatz-Komponente für den Tab
- neues kleines Filterpanel für KW-Freitext
- neue Preview-Karte für Wochenzeilen

### Tests
- neue Server-Unit-Tests
- neue Server-Integrationstests
- neue Frontend-Unit-Tests
- neue Browser-E2E-Tests
- bestehende Mitarbeiterformular-Tests müssen um das neue Tab erweitert werden

## Geplante Implementierungsstrategie
### 1. Contract ergänzen
- neues Schema für Wochenzeile
- neues Schema für Preview-Termin
- neuer Response-Typ für Mitarbeiter-Umsatzübersicht
- neuer API-Eintrag unter `api.employees`

### 2. Route und Controller ergänzen
- neue Controller-Funktion `listEmployeeRevenueOverview`
- Registrierung in `employeesRoutes`

### 3. Service-seitige Aggregation aufbauen
Im `employeesService`:
- Mitarbeiter laden
- bestehende Sichtbarkeitsregeln anwenden
- Rohdaten aus bestehendem Mitarbeiter-Terminpfad ziehen
- Termin- und Projekt-Tags laden
- Reklamationsfälle ausschließen
- Datensätze ohne Projekt oder ohne Betrag ausschließen
- globale Deduplizierung über Auftragsnummer
- ISO-Wochen berechnen
- pro Woche `orderCount`, `revenueAmount` und `appointments[]` aufbauen
- Wochen aufsteigend sortieren

### 4. Frontend-Tab ergänzen
In `EmployeeForm`:
- neues Tab `Umsatz Übersicht` nur im Edit-Modus
- Query gegen `/api/employees/:id/revenue-overview`
- eigener Tab-Inhalt als dedizierte Komponente

### 5. Tabelle umsetzen
Auf Basis von `TableView`:
- Spalten `KW/Jahr`, `Anzahl Aufträge`, `Umsatz`
- `stickyHeader`
- Zeilen-Scrollcontainer über bestehende TableView-Hülle
- Bottom-Footer mit Filterpanel über `footerSlot`

### 6. Filterpanel umsetzen
- einfaches Freitextfeld `Kalenderwoche`
- Reaktion direkt auf Zeicheneingabe
- clientseitige Filterung
- Match gegen sichtbares Wochenlabel und einfache Tokens wie `KW 18`, `18/2026`, `2026`

### 7. Wochen-Preview umsetzen
Preview pro Tabellenzeile:
- Header links `employeeFullName`
- Header rechts `KW/Jahr`
- Body mit kompakten Termin-Badges

Badge-Inhalt:
- Datum
- Auftragsname
- Summe

Technische Basis:
- `rowPreviewRenderer`
- bestehender `HoverPreview`
- cursorbasierte Positionierung
- keine neue eigene Popover-Mechanik

## Erwartetes App-Verhalten nach Umsetzung
- Im Mitarbeiterformular erscheint im Edit-Modus das Tab `Umsatz Übersicht`
- Die Tabelle ist aufsteigend nach ISO-Woche sortiert
- Tabellenkopf bleibt sticky
- Zeilen sind in eigenem Scrollbereich
- Footer-Filterpanel ist unten angedockt
- Hover auf Zeilen öffnet eine korrekt positionierte Preview-Karte
- Reklamationsfälle erscheinen weder in Tabelle noch Preview
- Projekte ohne Auftragssumme erscheinen nicht
- Dubletten über gleiche Auftragsnummer führen nicht zu mehrfach gezähltem Umsatz

## Vollständige Test-Suite
Die Testsuite soll breit, redundant und fachlich absichernd aufgebaut werden. Sie muss sowohl Berechnung und Zuordnung als auch sichtbares UI-Verhalten regressionssicher machen.

### 1. Servernahe Unit-Tests für Aggregationslogik
Eigene Testdatei für die reine Wochenaggregationslogik.

Abzusichernde Regeln:
- Nur Termine mit `projectId` und nicht-leerer Auftragssumme werden berücksichtigt
- Reklamationsausschluss greift für Reklamations-Termine
- Reklamationsausschluss greift für Reklamations-Projekte
- ISO-KW- und ISO-Jahr-Zuordnung stimmt an normalen Wochen
- ISO-KW- und ISO-Jahr-Zuordnung stimmt an Jahresgrenzen
- Sortierung der Wochenzeilen ist strikt aufsteigend nach `isoYear`, dann `isoWeek`
- `orderCount` zählt nach Deduplizierung korrekt
- `revenueAmount` summiert nur die deduplizierten qualifizierten Aufträge
- Globale Deduplizierung über identische Auftragsnummer verhindert Mehrfachzählung in derselben Woche
- Globale Deduplizierung über identische Auftragsnummer verhindert Mehrfachzählung über mehrere Wochen hinweg
- Deterministische Auswahl beim Dublettenfall funktioniert stabil über `startDate`, `startTime`, `appointmentId`
- Die Detailtermine in `appointments[]` der Wochenzeile entsprechen exakt den gewerteten Datensätzen
- Leermengen führen zu einer leeren Übersicht

### 2. Server-Integrationstests für Endpoint und Rollen
Eigene Integrationsdatei für `GET /api/employees/:id/revenue-overview`.

Abzusichernde Regeln:
- Erfolgsfall mit mehreren qualifizierten Wochen liefert die erwartete Response-Struktur
- Mehrere Projekte in einer Woche ergeben korrekte `orderCount`- und Umsatzwerte
- Wochen an Jahreswechseln landen in der richtigen `KW/Jahr`-Kombination
- Termine ohne Projekt werden ausgeschlossen
- Projekte ohne Auftragssumme werden ausgeschlossen
- Reklamations-Termin wird ausgeschlossen
- Reklamations-Projekt wird ausgeschlossen
- Doppelte Auftragsnummern werden global dedupliziert und nicht doppelt summiert
- Der Endpoint liefert Wochen aufsteigend sortiert
- Preview-Detailtermine pro Woche enthalten genau die erwarteten Werte
- `ADMIN` kann aktive und inaktive Mitarbeitende lesen
- Nicht-`ADMIN` erhält bei inaktivem Mitarbeitenden keinen Zugriff analog zum bestehenden Detailverhalten
- Unbekannte Mitarbeiter-ID liefert `404`
- Leserolle darf lesen, aber der Endpoint bleibt rein lesend

### 3. Frontend-Unit-Tests für Tab, Tabelle und Filterpanel
Eigene Frontend-Testdatei für Mitarbeiterformular und Umsatz-Tab-Komponente.

Abzusichernde Regeln:
- Neues Tab `Umsatz Übersicht` ist im Edit-Modus sichtbar
- Tab ist im Create-Modus nicht sichtbar
- Tab reiht sich korrekt in bestehende Haupttab-Navigation ein
- Tabelle rendert die erwarteten Spaltenüberschriften
- `stickyHeader` wird korrekt an `TableView` übergeben
- Die Zeilen liegen in der vorgesehenen scrollbaren Tabellenhülle
- Umsatzwerte sind im deutschen EUR-Format dargestellt
- `KW/Jahr` wird im erwarteten sichtbaren Format dargestellt
- Footer-Filterpanel wird unten gerendert und nicht oberhalb der Tabelle
- KW-Filter reagiert direkt auf Eingabe und reduziert sichtbare Zeilen clientseitig
- Filter-Reset bzw. Leereingabe zeigt wieder alle Zeilen
- Leere Datenmenge zeigt einen sauberen Empty State
- Tabellenzeile erzeugt die vorgesehene Hover-Preview über `rowPreviewRenderer`
- Die Preview-Konstruktion enthält Mitarbeitervollname, `KW/Jahr` und erwartete Badge-Liste
- Die Badge-Liste bleibt kompakt und zeigt pro Badge Datum, Auftragsname und Summe
- Die Preview wird mit bestehenden `HoverPreview`-Optionen im Cursor-Modus verdrahtet

### 4. Frontend-Unit-Tests für Preview-Inhalt und Informationsdichte
Eigene Testdatei nur für die Wochen-Preview.

Abzusichernde Regeln:
- Header links Mitarbeitervollname, rechts `KW/Jahr`
- Preview-Body rendert alle Wochen-Badges in richtiger Reihenfolge
- Badges bleiben kompakt und enthalten keine unnötigen Zusatzblöcke
- Summen im Preview-Body nutzen dasselbe EUR-Format wie die Tabelle
- Lange Projektnamen werden stabil gerendert
- Die Karte bleibt bei mehreren Einträgen strukturell stabil

### 5. Browser-E2E-Tests
Neue Browser-Suite für das Mitarbeiterformular.

Abzusichernde Regeln:
- Mitarbeiter öffnen, Tab `Umsatz Übersicht` wechseln, Tabelle sichtbar
- Tabellenkopf bleibt beim Scrollen sticky
- Footer-Filterpanel bleibt unten angedockt sichtbar
- Eingabe in den KW-Filter reagiert sofort und verändert die Zeilenmenge korrekt
- Hover auf Tabellenzeile öffnet tatsächlich die Preview-Karte
- Preview-Karte erscheint stabil positioniert und nicht off-screen
- Preview-Karte zeigt Mitarbeitervollname, `KW/Jahr` und korrekte Wochen-Badges
- Eine Woche mit mehreren Aufträgen zeigt richtige Anzahl und richtige Gesamtsumme
- Reklamationsdatensätze tauchen weder in Tabelle noch Preview auf
- Deduplicated-Dublettenfall zeigt keinen verdoppelten Umsatz
- Ein Datensatz an Jahresgrenze erscheint in der richtigen `KW/Jahr`-Zeile
- Reader-Ansicht kann Tab und Daten lesen, aber keine Schreibaktion auslösen

### 6. Akzeptanzkriterien der Test-Suite
Die Testsuite ist erst ausreichend, wenn sie nachweisbar rot wird bei:
- falscher KW-Zuordnung
- falschem ISO-Jahr an Jahresgrenzen
- falscher Summenbildung
- fehlender oder falscher Deduplizierung
- nicht ausgeschlossenen Reklamationsfällen
- fehlendem Sticky-Header
- falsch platziertem Filterpanel
- nicht öffnendem Hover-Trigger
- unvollständigem Preview-Header
- zu geringer Informationsdichte der Preview-Karte
- Rollenleck bei inaktiven Mitarbeitenden

## Erwartete oder sinnvolle Testdateien
Mögliche Zielpfade:
- `tests/unit/services/employeeRevenueOverviewAggregation.test.ts`
- `tests/integration/server/employees.revenue-overview.integration.test.ts`
- `tests/unit/ui/employeeRevenueOverviewTab.test.tsx`
- `tests/unit/ui/employeeRevenueOverviewPreview.test.tsx`
- Erweiterung von `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`
- `tests/e2e-browser/employee-revenue-overview.browser.e2e.spec.ts`

## Offene Risiken für die spätere Umsetzung
- Falls Rohdatenfälle mit Auftragssumme, aber ohne Auftragsnummer im Bestand existieren, muss das Deduplizierungsverhalten dort explizit sauber entschieden und testbar umgesetzt werden
- Falls bestehende Tabs im Mitarbeiterformular durch Tests stark gemockt sind, muss das neue Tab in mehrere bestehende UI-Tests aufgenommen werden, damit keine Regressionslücke entsteht
- Hover-Tests im Browser müssen mit echten, stabilen Testdaten aufgebaut werden, damit nicht zufällige Seed-Daten die Assertions grün machen

## Empfehlung für die nächste Umsetzungssitzung
In dieser Reihenfolge arbeiten:
1. Contract in `shared/routes.ts`
2. Endpoint in Route/Controller/Service
3. reine Aggregationslogik samt Unit-Tests
4. Integrations-Endpoint-Tests
5. Frontend-Komponente und neues Mitarbeiter-Tab
6. Frontend-Unit-Tests
7. Browser-E2E-Tests
8. abschließender serieller Testlauf

## Git-Status zum Zeitpunkt der Übergabe
- Branch: `feature/employee-umsatz-uebersicht`
- Tracking: aktiv zu `origin/feature/employee-umsatz-uebersicht`
- Inhaltliche Implementierung: noch nicht begonnen
- Dieses Dokument ist als Übergabe-Artefakt im `docs`-Ordner abgelegt
