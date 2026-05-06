# 06.05.26 | Implementierung | FT-26/FT-03: Reportlayout, Preset-Sperre und offene Aufgabe

## Zusammenfassung

Die Produktionsplanung stellt Kategorien im selben Block nun nebeneinander dar. Die Preset-Controls der vier Reports bleiben sichtbar, sind aber temporär deaktiviert. Zusätzlich wurde der offene FT-03-Auftrag Mark & Insert als Wiki-Aufgabe A-08 übernommen.

## Art der Änderung

UI-Implementierung mit ergänzender Unit-/UI-Testabdeckung sowie Wiki-Dokumentation. Es wurden keine API-Contracts, Datenbankmigrationen oder Rollenmodelle geändert.

## Betroffene Features

- FT-26: Auswertungen und Reports
- FT-03: Kalenderansichten
- FT-01: Kalendertermine als Bezug für Terminverschiebung
- FT-04: Tourenplanung als Bezug für Tourwechsel und Konfliktprüfung

Notion-Links wurden in dieser Session nicht zusätzlich geprüft; Grundlage waren die lokale Auftragsdatei und die bestehenden Repo-Wiki-Seiten.

## Konkrete Änderungen

- Produktionsplanung: Kategorien mit gleicher Blocknummer werden als gewichtetes Raster gerendert.
- Produktionsplanung-Druckansicht: nutzt dieselbe Blockbreitenlogik.
- Report-Presets: `ReportPresetControls` kann vollständig disabled gerendert werden.
- Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan setzen die Preset-Controls temporär auf disabled.
- Tests sichern Blockauflösung, Bildschirmrendering, Druckrendering und Preset-Sperre ab.
- A-08 dokumentiert Mark & Insert mit Ziel, Scope, Rollenbezug, offenen Designpunkten und erwarteten Tests.

## Rollen

Die Reportänderung verändert keine Rollen oder serverseitigen Berechtigungen. Die Preset-Sperre ist eine UI-Sperre; bestehende serverseitige Preset-Regeln bleiben unverändert.

A-08 hält fest, dass Mark & Insert vor Umsetzung serverseitig gegen historische Sperren, direkte API-Aufrufe, Deep Links, parallele Bearbeitung und Konfliktpfade abgesichert werden muss.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/lib/produktionsplanungCategoryLayout.test.ts tests/unit/ui/produktionsplanungPrintLayout.wiring.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/reportPresetControls.disabled.test.tsx`
- `npm run typecheck`
- `git diff --check` für die bearbeiteten Code-, Test- und Wiki-Dateien

## Offene Punkte

- Die Preset-Sperre ist bewusst temporär und muss später wieder entfernt oder durch eine fachliche Entscheidung ersetzt werden.
- A-08 bleibt offen; vor Umsetzung sind Codeanalyse, gemeinsame Mutationsstrategie mit A-07 und Rollen-/Sicherheitsprüfung erforderlich.
