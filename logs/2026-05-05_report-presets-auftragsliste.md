# Auftragslog: Report-Presets und Auftragsliste nachgezogen

## Zweck

Die Reports-Seite sollte nach der Preset-Implementierung nutzbarer werden. Im Verlauf wurden außerdem fachliche Auffälligkeiten in der Auftragsliste geklärt und korrigiert: stornierte Termine durften nicht mehr in der Auftragsliste erscheinen, und der Tag-Filter musste die fachlich relevanten Report-Tags tatsächlich anbieten.

## Scope

- Layout-Nacharbeit der Report-Konfigurationspanels.
- Preset-Controls rechts ausrichten und Einstellungscontainer sauber trennen.
- Auftragsliste serverseitig gegen stornierte Termine absichern.
- Auftragslisten-Tagfilter auf den echten Report-Tag-Katalog umstellen.
- Keine DB-Änderung und keine Migration.
- Keine Änderung an Rollen- oder Mutationsrechten.

## Technische Entscheidungen

- `ReportConfigPanel` rendert die Body-Container horizontal. Date-Range und Einstellungscontainer stehen links, Presets rechts.
- Shortcode-Optionen wurden in eigene schmale Einstellungscontainer gelegt.
- Auftragsliste und Tourenplan verwenden keine künstlich breiten Einstellungscontainer mehr.
- Die Auftragsliste filtert jetzt serverseitig mit `!hasComplaintTag && !cancellationTag`.
- Der Tag-Katalog-Endpunkt unterstützt `includeReportTags=true`, damit Reports zusätzlich `Sondermaß` und `Anmerkungen` erhalten können.
- Die Reports-Seite lädt Tags über `/api/tags?includeReportTags=true`.
- Der Auftragslisten-Tagfilter zeigt normale Nicht-System-Tags sowie `Sondermaß` und `Anmerkungen`. Sperr- und Workflow-Tags wie `Reklamation`, `Storniert` und `Geparkt` bleiben ausgeschlossen.
- Der Tag-Picker-Button der Auftragsliste bleibt auch bei leerer Auswahl klickbar, damit der leere Zustand sichtbar wird.

## Rollen- und Rechtebezug

Die Änderung erweitert keine Rechte.

- Betroffene Rollen: alle angemeldeten Rollen mit Zugriff auf Reports.
- Erlaubte Sichtbarkeit: Reports und eigene USER-Presets bleiben für die bisherigen Report-Rollen sichtbar; GLOBAL-Presets bleiben Admins vorbehalten.
- Erlaubte Aktionen: Report-Erzeugung, Preset-Anwendung und Tagfilter-Auswahl bleiben im bestehenden Report-Kontext.
- Technische Durchsetzung: Preset-Schreibrechte bleiben serverseitig im bestehenden Report-Config-Service; die Tagfilter-Änderung betrifft nur die auswählbaren Filterwerte.

## Betroffene Dateien

- `client/src/components/ReportsPage.tsx`
- `client/src/components/reports/ReportConfigPanel.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `client/src/components/filters/tag-filter-input.tsx`
- `server/repositories/reportsRepository.ts`
- `server/controllers/tagsController.ts`
- `server/services/tagRelationsService.ts`
- `shared/routes.ts`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/integration/server/appointments.cancellation.integration.test.ts`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/ui/tagFilterInput.behavior.test.tsx`
- `docs/wiki/features/ft-26-auswertungen-und-reports/ft-26-auswertungen-und-reports.md`
- `docs/wiki/features/ft-26-auswertungen-und-reports/use-cases/uc-26-06-auftragsliste-konfigurieren-und-erzeugen.md`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.auftragsliste.integration.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.cancellation.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run test:unit -- tests/unit/ui/tagFilterInput.behavior.test.tsx tests/unit/ui/reportsPage.wiring.test.tsx`
- `npm run typecheck`

Zusätzlich wurde der Storno-Fehler bewusst rot nachgewiesen: Der korrigierte Auftragslisten-Integrationstest schlug zunächst fehl, weil ein ausschließlich storniertes Projekt noch im Report enthalten war. Nach der Backend-Korrektur lief derselbe Test grün.

## Bekannte Einschränkungen

- Kein voller Audit und kein vollständiger Browser-E2E-Lauf.
- Kein Commit und kein Push in diesem Auftrag.
- Im Arbeitsbaum lagen weitere, nicht zu diesem Auftrag gehörende Mitarbeiter-Dateien und Journal-/Log-Dateien. Diese wurden nicht verändert.
