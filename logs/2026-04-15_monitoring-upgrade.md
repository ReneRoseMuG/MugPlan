# Auftragslog: Monitoring-Upgrade

## Zweck

Die Monitoring-Ansicht sollte fachlich und visuell auf das Niveau der bestehenden Terminliste angehoben werden. Dazu gehörten ein erweiterter Monitoring-Payload aus dem Backend, eine filterbare Tabelle mit höherer Informationsdichte sowie ein eigener Standalone-Einstieg über die Sidebar.

## Scope

- Monitoring-Payload um zusätzliche Termin-, Projekt- und Kundendaten erweitert.
- Monitoring-Tabelle auf Uhrzeit, Datum, Auftrag, Projekt, Kunde, Tour und Trigger ausgebaut.
- Clientseitige Monitoring-Filter für Kunde, Projekt, Auftrag, Tour und Trigger ergänzt.
- Standalone-Route `/standalone/monitoring` samt Open-Tab-Button in der Sidebar ergänzt.
- Relevante Unit-, Integration- und Browser-Tests erweitert bzw. neu angelegt.
- `docs/TEST_MATRIX.md` an die neuen und geänderten Tests angepasst.

## Technische Entscheidungen

- Der bestehende `/api/monitoring`-Contract wurde additiv erweitert, um vorhandene Trigger-Logik und Konsumenten nicht brechend zu ändern.
- Zusätzlich zum ursprünglich geplanten Payload wurde `tourId` mitgeführt, damit der clientseitige Tour-Filter fachlich sauber gegen die gelieferten Monitoring-Zeilen arbeiten kann.
- Die Monitoring-Filter laufen vollständig clientseitig auf Basis der bereits geladenen Daten; ein neuer serverseitiger Filterpfad wurde bewusst nicht eingeführt.
- Für die Kundenanzeige gilt bevorzugt `Nachname, Vorname`; fehlt diese Kombination, fällt die Anzeige auf den vorhandenen Legacy-Namen zurück.
- Die Standalone-Monitoring-Ansicht folgt dem bestehenden Standalone-Muster mit `StandaloneLayout` und `AppointmentForm`-Overlay, ohne neue Auth- oder Routing-Mechanik einzuführen.

## Betroffene Dateien

- `shared/routes.ts`
- `server/repositories/appointmentsRepository.ts`
- `server/services/monitoringService.ts`
- `client/src/components/MonitoringPage.tsx`
- `client/src/lib/monitoring-filters.ts`
- `client/src/components/ui/filter-panels/monitoring-filter-panel.tsx`
- `client/src/App.tsx`
- `client/src/pages/StandaloneDomainViews.tsx`
- `client/src/components/Sidebar.tsx`
- `tests/unit/lib/monitoringFilters.test.ts`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`
- `tests/unit/services/monitoringService.ft31.test.ts`
- `tests/integration/server/monitoring.ft31.integration.test.ts`
- `tests/e2e-browser/standalone-routing.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen

- Erfolgreich ausgeführt:
  - `npm run test:unit -- tests/unit/lib/monitoringFilters.test.ts tests/unit/lib/monitoring.test.ts tests/unit/ui/monitoringPage.behavior.test.tsx tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/services/monitoringService.ft31.test.ts`
  - `npm run test:integration -- --reporter=verbose tests/integration/server/monitoring.ft31.integration.test.ts`
  - `npm run test:e2e:browser -- tests/e2e-browser/standalone-routing.browser.e2e.spec.ts`
  - `npm run typecheck`

## Bekannte Einschränkungen

- Ein voller Audit mit `check`, `lint`, `audit` und `secrets` wurde im Rahmen dieses Abschlusses nicht zusätzlich ausgeführt.
- Die Monitoring-Filter sind bewusst rein clientseitig und beeinflussen nicht den Backend-Request.
