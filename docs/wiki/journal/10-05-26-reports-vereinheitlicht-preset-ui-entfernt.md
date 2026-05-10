# 10.05.26 | Reports | Vereinheitlichung und Preset-UI entfernt

## Zusammenfassung

Die Report-Oberflächen wurden weiter vereinheitlicht. Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan folgen nun dem gleichen Ablauf: erst Konfiguration, dann Reportansicht, danach eine gemeinsame Druckvorschau-Schicht mit einheitlicher Kopfzeile, Aktualisieren, Drucken und Ausrichtungswahl.

Die Produktionsplanung nutzt eine Druckvorschau mit gemessenen druckbaren Blöcken, damit Kategorie- und Projektcontainer bei der Seitenbildung nicht am Seitenrand abgeschnitten werden. Tourenplan und Standalone-Report-URLs wurden in den gemeinsamen Öffnungs- und Vorschaufluss eingebunden.

Nach der UI-Nacharbeit wurde die komplette Preset-Funktion aus der sichtbaren Report-UI entfernt. Es gibt keine Preset-Auswahl, keine Preset-Eingabefelder und keine Speichern- oder Löschen-Aktionen mehr in den Report-Konfigurationscontainern. Die serverseitigen Preset-Strukturen bleiben bestehen, werden aber aus der Report-Oberfläche nicht mehr angeboten.

## Verifikation

- Typecheck: `npm run typecheck` erfolgreich.
- UI-Unit-Tests: `npm run test:unit -- tests/unit/ui/reportsPage.wiring.test.tsx tests/unit/ui/reportsPage.behavior.test.tsx tests/unit/ui/tourenplanReportPanel.smoke.test.tsx` erfolgreich mit 21 bestandenen Tests in 3 Dateien.
- Gesamtcheck: `npm run check` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.

## Rollen

- `ADMIN`, `DISPONENT` und `LESER` sehen weiterhin die für sie erlaubten Reports nach bestehender Serverlogik.
- Für keine Rolle werden Preset-Aktionen in der Report-UI mehr sichtbar oder bedienbar gemacht.
- Die serverseitige Durchsetzung für Reports, Report-Konfigurationen und bestehende Preset-Endpunkte wurde nicht aufgeweicht.
- Das globale Kategorie-Layout der Produktionsplanung bleibt weiterhin über die bestehenden Serverregeln geschützt.

## Verknüpfungen

- Report-Komponenten: `client/src/components/ReportsPage.tsx`
- Tourenplan-Panel: `client/src/components/reports/TourenplanReportPanel.tsx`
- Druckvorschau-Schicht: `client/src/components/print/ReportPrintPreviewDialog.tsx`
