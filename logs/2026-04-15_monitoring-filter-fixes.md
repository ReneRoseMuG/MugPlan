# Monitoring-Filter-Fixes

## Zweck

Korrektur der Monitoring-Filter fuer `Kunde Nr.`, `Auftrag Nr.` und `Tour` sowie Nachschaerfung der Testabdeckung fuer die verschiedenen Filterzustaende. Zusaetzlich bleibt das Monitoring-Filterpanel im unteren Seitenbereich angedockt.

## Scope

- Tolerantere clientseitige Identifier-Filterung fuer Kunden- und Auftragsnummern
- Anpassung des Monitoring-Filterpanels fuer alphanumerische Kundennummern und ungekürzte Auftragsnummern
- Regressionsschutz fuer Panel-Wiring, Filterzustände und Position des Filterbereichs
- Keine API-, DB-, Rollen- oder Migrationsaenderungen

## Technische Entscheidungen

- Kunden- und Auftragsnummern werden im Monitoring clientseitig normalisiert verglichen, damit Eingaben unabhaengig von Trennzeichen und Gross-/Kleinschreibung funktionieren.
- Der gemeinsame `CustomerNumberFilterInput` wurde minimal erweitert, damit das Monitoring alphanumerische Identifier erlauben kann, ohne andere Stellen zwangslaeufig umzubauen.
- Das Monitoring-Filterpanel nutzt im Monitoring keine harte Laengenbegrenzung mehr fuer Auftragsnummern und deaktiviert die reine Ziffernfilterung fuer Kundennummern.
- Die bestehende Monitoring-Seite bleibt im Layout unveraendert im unteren angedockten Bereich; abgesichert wurde nur das sichtbare Verhalten.

## Betroffene Dateien

- `client/src/components/MonitoringPage.tsx`
- `client/src/components/filters/customer-number-filter-input.tsx`
- `client/src/components/ui/filter-panels/monitoring-filter-panel.tsx`
- `client/src/lib/monitoring-filters.ts`
- `tests/unit/lib/monitoringFilters.test.ts`
- `tests/unit/ui/monitoringFilterPanel.wiring.test.tsx`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`
- `docs/TEST_MATRIX.md`

## Tests

Ausgefuehrt:

- `npm run test:unit -- tests/unit/lib/monitoringFilters.test.ts tests/unit/ui/monitoringFilterPanel.wiring.test.tsx tests/unit/ui/monitoringPage.behavior.test.tsx`
- `npm run typecheck`

Ergebnis:

- Beide Kommandos erfolgreich

## Bekannte Einschraenkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgefuehrt.
- Die Absicherung fokussiert auf die betroffenen Monitoring-Filterpfade und deren sichtbare Verdrahtung.
