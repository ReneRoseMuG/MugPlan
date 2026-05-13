# FT-26 Report-Kacheln für Auftragsliste und Produktionsplanung vereinheitlichen

Die Auftragsliste und die Produktionsplanung verwenden aktuell ähnliche, aber getrennte Projektkachel-Komponenten. Das erzeugt unnötige Pflegearbeit und erhöht das Risiko, dass Layout, Druckverhalten, Footer, Artikelanzeige oder Tag-Darstellung zwischen beiden Reports auseinanderlaufen.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Reports | Refactoring | 13.05.26 |

---

## Ziel

Die Projektkacheln der Auftragsliste sollen als gemeinsamer Kachelpfad für Auftragsliste und Produktionsplanung verwendet werden. Die Produktionsplanung soll keine eigenständige, fachlich gleichartige Projektkachel mehr pflegen, sondern die gemeinsame Kachelstruktur der Auftragsliste nutzen und nur report-spezifische Daten, Artikelwerte und Darstellungsschalter zuliefern.

## Ausgangslage

In der Bildschirmansicht nutzen beide Reports bereits dieselbe Basiskomponente `ReportProjectCard`, aber weiterhin unterschiedliche Wrapper:

- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/ProduktionsplanungProjectCard.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`

Die Auftragsliste bringt zusätzliche Logik für Highlighting, Shortcodes, Artikelanzeige, Tourfarben und Druckoptionen mit. Die Produktionsplanung nutzt eine eigene Wrapper-Komponente mit eigenen Artikeldaten und neutralem Styling.

Im Druck ist die Trennung noch stärker: Die Auftragsliste verwendet ihre Kachel weiter, während die Produktionsplanung eine eigene Druckkarte in `ProduktionsplanungPrintLayout.tsx` rendert. Dadurch gibt es mehrere Stellen für sehr ähnliche Kartenstruktur.

## Umfang

- Zur Aufgabe gehören:
- den Auftragslisten-Kachelpfad so zuschneiden oder extrahieren, dass Auftragsliste und Produktionsplanung dieselbe Projektkachel verwenden können
- report-spezifische Unterschiede als Props, Adapterdaten oder kleine konfigurierte Teilstücke abbilden
- Produktionsplanung-Kacheln im Overlay auf den gemeinsamen Kachelpfad umstellen
- Produktionsplanung-Druckkarten prüfen und möglichst ebenfalls auf denselben Kachelpfad beziehungsweise dieselbe Kartenbasis umstellen
- Artikelanzeige der Produktionsplanung aus `articleValues` und Kategorie-Layout weiterhin korrekt abbilden
- Auftragslisten-spezifisches Highlighting nur dort aktivieren, wo es fachlich zur Auftragsliste gehört
- Sondermaß als Auslöser für Produktionsplanung-Kacheln unverändert lassen
- bestehende Summenbereiche der Produktionsplanung unverändert lassen
- Nicht Teil der Aufgabe sind:
- neue Report-Endpunkte
- Änderungen an Report-Contracts
- Änderungen an Datenbank-Schema oder Persistenz
- Änderung der fachlichen Filterlogik von Auftragsliste oder Produktionsplanung
- Änderung der Sondermaß-, Reklamation- oder Storniert-Regeln
- freie Neugestaltung der Kacheln ohne Bezug zur bestehenden Auftragslisten-Kachel
- Änderung der Rollen- oder Berechtigungslogik

## Umsetzungshinweise

- Relevante Einstiegspunkte:
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/ProduktionsplanungProjectCard.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/components/reports/produktionsplanungProjectCard.shared.ts`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/components/reports/ProduktionsplanungPrintLayout.tsx`
- `client/src/components/ReportsPage.tsx`
- `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`
- `tests/unit/ui/produktionsplanungProjectCard.wiring.test.tsx`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx`
- `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`

Die spätere Umsetzung soll zuerst die Datenanforderungen beider Reports vergleichen. Wenn die Auftragslisten-Kachel nicht direkt passt, soll sie gezielt zu einer gemeinsamen Report-Projektkachel erweitert oder in eine gemeinsame konfigurierbare Karte und report-spezifische Adapter zerlegt werden. Ziel bleibt, dass Auftragsliste und Produktionsplanung denselben Kachelpfad nutzen.

Die Produktionsplanung darf dabei weiterhin ihre fachliche Semantik behalten: Der Summenbereich aggregiert Produkt- und Komponentenwerte, der untere Kachelbereich enthält nur Sondermaß-Projekte beziehungsweise Sondermaß-Termine. Anmerkungen oder Gespiegelt allein dürfen keine Produktionsplanung-Kachel erzeugen.

## Rollen und Sicherheitsgrenzen

Die Aufgabe selbst ist ein Frontend-Refactoring und soll keine Rechte verändern.

- Betroffene Rollen: `ADMIN`, `DISPONENT` und `LESER`, soweit sie die bestehenden Reports sehen dürfen.
- Erlaubte Sichtbarkeit: unverändert gemäß bestehender Reports-Navigation und bestehender serverseitiger Report-Endpunkte.
- Erlaubte Aktionen: Report öffnen, Report erzeugen, Druckvorschau öffnen und drucken bleiben unverändert.
- Technische Durchsetzung: Die serverseitige Rollenprüfung in `reportsService` bleibt maßgeblich. Eine gemeinsame Kachelkomponente darf keine neuen Daten laden, keine Endpunkte umgehen und keine UI-Sichtbarkeit als Berechtigungsersatz einführen.

## Erwartete Tests

- Unit- oder Wiring-Test, dass Auftragsliste und Produktionsplanung denselben gemeinsamen Kachelpfad verwenden.
- Regressionstest für Auftragslisten-Highlighting, damit Produktionsplanung nicht versehentlich Auftragslisten-Farblogik übernimmt.
- Regressionstest für Produktionsplanung-Artikelwerte aus Kategorie-Layout und `articleValues`.
- Regressionstest, dass Produktionsplanung-Kacheln weiterhin nur über Sondermaß entstehen.
- Drucktest oder Wiring-Test, dass die Produktionsplanung-Druckkarte keine abweichende parallele Projektkartenstruktur mehr pflegt oder die verbleibende Abweichung fachlich begründet ist.
- Bestehende Browser-E2E-Flows für FT-26 Reports müssen weiter sichtbar passende Auftragslisten- und Produktionsplanungskacheln prüfen.

## Blocker und offene Fragen

- Zu klären ist, ob die gemeinsame Kachel auch im Produktionsplanung-Druck vollständig verwendet werden kann oder ob der Druck aus technischen Gründen eine dünne eigene Hülle behalten muss.
- Zu klären ist, ob die bestehende Aufgabe zur gemeinsamen Print-Basiskomponente mit dieser Aufgabe zusammen umgesetzt werden sollte oder bewusst getrennt bleibt.

---

## Beziehungen

- Features: [FT-26 - Auswertungen und Reports](../features/ft-26-auswertungen-und-reports/ft-26-auswertungen-und-reports.md)
- Use Cases: UC 26/03 · UC 26/05 · UC 26/06 · UC 26/07
- Weitere Bezüge: [FT-26 gemeinsame Print-Basiskomponente für Kartenreports](ft26-report-print-basiskomponente.md)
