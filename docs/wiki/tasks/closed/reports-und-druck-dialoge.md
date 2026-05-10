# Reports- und Druck-Dialoge

Dialog-, Overlay- und Meldungspfade für Reports, Spaltenauswahl, Presets und Druckvorschau sind im P-01-Rollout vereinheitlicht. Der Abschluss konzentriert sich auf gemeinsame Dialogbasis, normalisierte Reportfehler, stabile Druckvorschau-Fallbacks und die bestehende Report-Rollenmatrix.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Overlay- und Meldungspfade für Reports, Spaltenauswahl, Presets und Druckvorschau einheitlich strukturieren.

## Ausgangslage

Reports, Spaltenauswahl, Presets und Druckvorschauen nutzten vor dem P-01-Schritt mehrere lokale Dialog- und Fehlerpfade. API-Fehler aus Report- und Preset-Pfaden konnten technisch geprägt bleiben, während Spalten- und Kategorie-Dialoge noch nicht durchgehend über die gemeinsame Dialogbasis liefen.

## Umfang

- Der Spaltendialog der Vorlaufliste nutzt die gemeinsame Dialogbasis mit standardisiertem Footer.
- Der Kategorie-Layout-Dialog der Produktionsplanung nutzt die gemeinsame Dialogbasis und bleibt `ADMIN`-only.
- Report-, Druckvorschau- und Preset-Fehler werden vor der Anzeige normalisiert und inline angezeigt.
- Auftragslisten- und Tourenplan-Druckvorschauen nutzen geschätzte Seiten als Fallback, solange Browser-Messwerte noch nicht vorliegen.
- Bestehende Reportfilter, Drucklayouts, Query-Keys, API-Contracts und Serverrollen bleiben unverändert.
- Nicht Teil der Aufgabe sind neue Reportfunktionen, neue Preset-Contracts, Schemaänderungen oder Änderungen an der Rollenmatrix.

## Umsetzungshinweise

- `ADMIN`, `DISPONENT` und `LESER` dürfen Reports lesen; die serverseitige Reportprüfung bleibt maßgeblich.
- `ADMIN`, `DISPONENT` und `LESER` dürfen persönliche Presets lesen und schreiben; globale Presets bleiben serverseitig `ADMIN`-only.
- Das Produktionsplanung-Kategorie-Layout bleibt über globale Settings und bestehende Serverregeln `ADMIN`-only.
- Betroffene UI-Dateien: `client/src/components/reports/SpaltenDialog.tsx`, `client/src/components/reports/ReportPresetControls.tsx`, `client/src/components/reports/TourenplanReportPanel.tsx`, `client/src/components/ReportsPage.tsx`.
- Betroffene Tests: `tests/unit/ui/spaltenDialog.dialogBase.test.tsx`, `tests/unit/ui/reportPresetControls.disabled.test.tsx`, `tests/unit/ui/reportsPage.wiring.test.tsx`, bestehende Report-/Print-Unit-Tests sowie die Report-Integrationstests und Browser-E2E-Suiten aus P-01 Schritt 8.
- Es wurden keine neuen Endpunkte, Contracts oder Datenbankmigrationen eingeführt.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 10.05.26
- Ergebnis: Reports, Spaltenauswahl, Presets und Druckvorschauen nutzen gemeinsame Dialog-, Inline-Fehler- und stabile Druckvorschaupfade, ohne Reportrollen oder API-Contracts zu verändern.
- Automatisierte Verifikation: Typecheck, gezielte Report-/Print-Unit-Tests, Report-/Preset-Integrationstests, Report-Browser-E2E, Encoding-Check und Diff-Prüfung erfolgreich.
- App-Prüfung: Automatisierte Browserprüfung für FT-26-Reports, Tourenplan und Öffnen-in-Tab bestanden; manuelle Nutzerprüfung steht noch aus.
- Verwendete Testdaten: synthetische Report-, Projekt-, Artikel-, Tag-, Tourenplan- und Preset-Fixtures sowie Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Tests.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 erfolgreich ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für P-01 Schritt 8; manuelle Sichtprüfung der Reportdialoge steht noch aus.
- Folgeaufgaben: Keine für diesen P-01-Schritt.

---

## Beziehungen

- Features: [FT-26 - Auswertungen und Reports](../../features/ft-26-auswertungen-und-reports/ft-26-auswertungen-und-reports.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](../dialog-rollout-masterplan.md) · [FT-26 Report-Print-Basiskomponente](../ft26-report-print-basiskomponente.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [10.05.26 - P01: Reports- und Druck-Dialoge abgeschlossen](../../journal/10-05-26-p01-reports-druck-dialoge-abgeschlossen.md)
