# FT-26 gemeinsame Print-Basiskomponente für Kartenreports

Die Kartenreports in FT-26 sollen eine gemeinsame Print-Basis für gemessene Seitenaufteilung erhalten. Auftragskarten und Tourenplan-Karten dürfen im Druck nicht am unteren Seitenrand abgeschnitten werden. Die App-Druckvorschau, die Browser-Druckvorschau und das reale Druckergebnis sollen bei Standard-Skalierung in der Seitenaufteilung übereinstimmen. Der konkrete Fehlerfall ist die Auftragsliste: Die Druckvorschau wirkt zunächst korrekt, im realen Druck werden aber mehrere Auftragskarten unten abgeschnitten. Nach.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Reports | Refactoring | 07.05.26 |

---

## Ziel

Die Kartenreports in FT-26 sollen eine gemeinsame Print-Basis für gemessene Seitenaufteilung erhalten. Auftragskarten und Tourenplan-Karten dürfen im Druck nicht am unteren Seitenrand abgeschnitten werden. Die App-Druckvorschau, die Browser-Druckvorschau und das reale Druckergebnis sollen bei Standard-Skalierung in der Seitenaufteilung übereinstimmen. Der konkrete Fehlerfall ist die Auftragsliste: Die Druckvorschau wirkt zunächst korrekt, im realen Druck werden aber mehrere Auftragskarten unten abgeschnitten. Nach Änderungen an Skalierungsoptionen im Browser-Druckdialog kann die Vorschau zusätzlich verrutschen und stellt sich nicht zuverlässig wieder her.

## Ausgangslage

Der Tourenplan nutzt bereits eine robuste Messlogik. Er rendert eine Messansicht, liest verfügbare Seitenhöhe und Kartenhöhen über echte DOM-Maße aus und paginiert danach. Die Auftragsliste nutzt dagegen feste Schätzwerte für Seitenhöhe und Kartenhöhe. Dadurch können echte Zeilenumbrüche, Footer, Tags, lange Kunden- oder Projektnamen, Artikelwerte, Beschreibungen und druckerspezifischer Reflow zu höheren Karten führen als die Paginierung erwartet. Die feste A4-Seite schneidet überlaufende Inhalte anschließend ab. Dieses Verhalten ist kein Backend-Reportproblem. Der Fix gehört in die Frontend-Print-Infrastruktur und die kartenspezifische Report-Paginierung.

## Umfang

- Zur Aufgabe gehören:
- eine gemeinsame, reportunabhängige Print-Mess- und Paginierungsbasis für Kartenreports entwerfen und umsetzen
- bestehendes Tourenplan-Messprinzip in eine wiederverwendbare Print-Komponente oder Hook-Struktur überführen
- Auftragsliste auf gemessene Kartenhöhen und gemessene Seitenkapazität umstellen
- sicherstellen, dass jede Karte vollständig auf einer Druckseite bleibt oder vollständig auf die nächste Seite verschoben wird
- Auftragslisten-Druckvorschau nach Öffnen, Schließen, Datenwechsel und erneutem Öffnen neu und stabil messen
- vorhandenes A4-Seitenmodell über `PrintPageShell` weiterverwenden
- bestehende Filter, Kategorien, Tag-Logik, Presets und Reportdaten unverändert lassen
- Nicht Teil der Aufgabe sind:
- neue API-Endpunkte
- Änderungen an Backend-Reportdaten, Contracts oder Datenbank-Schema
- freie Neugestaltung der Auftragskarten oder Tourenplan-Karten
- Änderung der fachlichen Filterlogik der Auftragsliste
- Änderung der Rollen- oder Berechtigungslogik
- Workarounds über Browser-Druckdialog-Anweisungen statt robuster App-Paginierung
- Die Auftragsliste paginiert im Browser auf Basis gemessener Kartenhöhen.
- Keine Auftragskarte wird innerhalb der App-Druckseiten am unteren Seitenrand abgeschnitten.
- Die Auftragslisten-Druckvorschau wird nach erneutem Öffnen sauber neu aufgebaut.
- Tourenplan und Auftragsliste nutzen für die Karten-Seitenaufteilung dieselbe technische Print-Basis oder einen klar begründeten gemeinsamen Hook.
- Backend-Contracts, Report-Endpunkte, DB-Schema, Filterlogik und Rollenlogik bleiben unverändert.
- Die relevanten Unit- und Browser-E2E-Tests laufen erfolgreich oder ein technischer Blocker ist konkret dokumentiert.

## Umsetzungshinweise

- Relevante Dateien und Einstiegspunkte:
- `client/src/components/print/PrintPageShell.tsx`
- `client/src/components/print/PrintDocumentRoot.tsx`
- `client/src/components/print/PrintPreviewDialog.tsx`
- `client/src/components/reports/TourenplanPaginationMeasurement.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/ReportsPage.tsx`
- `client/src/lib/auftragsliste-print-model.ts`
- Technischer Zielzuschnitt:
- Die gemeinsame Basis soll nicht die fachlichen Karten vereinheitlichen. Tourenplan-Karten und Auftragslisten-Karten bleiben eigene Komponenten.
- Der gemeinsame Nenner ist die Print-Garantie: Karten werden mit echtem Layout gemessen, seitenweise gruppiert und nicht über Seitenränder gebrochen.
- Die neue Basis kann als `MeasuredPrintCardPages`-Komponente, Hook oder kleine Komponentenfamilie unter `client/src/components/print/` entstehen, sofern sie bestehende Print-Komponenten nutzt und keine neue UI-Infrastruktur einführt.
- Die Messansicht muss dieselben Kartenkomponenten, Breiten, Abstände, Fonts, Header/Footer-Reservierung und Page-Shell-Bedingungen verwenden wie der echte Print-Root.
- Eine reine CSS-Lösung mit `break-inside: avoid` reicht nicht aus, weil die App bereits vor dem Browserdruck konkrete Seiten rendert und dafür die korrekte Gruppierung kennen muss.
- Feste Schätzwerte für die Auftragslisten-Höhe dürfen höchstens als technischer Fallback bleiben, nicht als Hauptpfad im Browser.
- Betroffene Rollen sind `ADMIN`, `DISPONENT` und `READER` beziehungsweise fachlich `LESER`.
- Erlaubte Sichtbarkeit: Alle angemeldeten Rollen dürfen Reports öffnen, konfigurieren, erzeugen und drucken, soweit sie die bestehenden Report-Endpunkte serverseitig lesen dürfen.
- Erlaubte Aktionen: Druckvorschau öffnen und Drucken bleiben lokale Lese- und Browseraktionen. Es werden keine Mutationen eingeführt.
- Technische Durchsetzung: Reportdaten werden weiterhin über die bestehenden serverseitigen Report-Endpunkte geladen. Die serverseitige Rollenprüfung in `reportsService` bleibt maßgeblich. UI-Sichtbarkeit ersetzt keine Backend-Prüfung.
- Die Aufgabe darf keine neuen Daten sichtbar machen, keine Rollen erweitern, keine Preset-Rechte ändern und keine direkte Druckaktion als serverseitige Mutation einführen.
- Unit-Tests für die gemeinsame Karten-Paginierung mit gemessenen Kartenhöhen, Seitenkapazität, Lücken zwischen Karten und leerer Ausgabe
- Unit- oder Wiring-Tests, die belegen, dass die Auftragsliste die gemeinsame Print-Basis nutzt und keine feste Hauptpfad-Schätzung mehr verwendet
- Regressionstest für lange Auftragskarten mit Artikeln, Beschreibung, Tags, langen Kunden- und Projektnamen über mehrere Seiten
- Browser-E2E für Auftragsliste: Druckvorschau öffnen, mehrere Seiten prüfen, Print-Root enthält alle Karten, keine Karte wird über eine Seitenkante gruppiert
- Bestehende Tourenplan-Drucktests müssen grün bleiben oder fachlich sauber auf die neue Basis angepasst werden
- Bei sichtbaren Datumsänderungen muss der projektweite Datumsformat-Suchlauf aus `agents.md` ausgeführt und verbleibende Treffer abgegrenzt werden
- Relevante Testbereiche:
- `tests/unit/lib/auftragsliste-print-model.test.ts`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `tests/unit/ui/printComponents.primitives.test.tsx`
- Tourenplan-Wiring- und Drucktests im Bereich `tests/unit/ui/`
- `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`

## Blocker und offene Fragen

- Es ist zu prüfen, ob die gemeinsame Basis zuerst nur für Tourenplan und Auftragsliste eingeführt wird oder ob Vorlaufliste/Produktionsplanung bewusst außerhalb bleiben, weil sie keine vergleichbaren Kartenreports sind.
- Browser-Druckdialog-Skalierungen sind nicht zuverlässig direkt aus der App beobachtbar. Die Aufgabe soll die App-seitige Seitenbildung stabilisieren, aber keine vollständige Kontrolle über nachträgliche Druckertreiber-Skalierung versprechen.

---

## Beziehungen

- Features: —
- Entscheidungen: —
