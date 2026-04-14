# Auftragslog: Gespiegelt als zusätzlicher Report-Trigger

## Zweck
Die Produktionsplanung sollte Projektkacheln im zweiten Report-Teil nicht nur bei `Sondermaß` und `Anmerkungen`, sondern zusätzlich auch bei `Gespiegelt` ausgeben.

## Scope
- Erweiterung der serverseitigen Triggerlogik für `reportCardReasonTags`
- Ergänzung bestehender Unit- und Integrationstests für die neue Triggerregel
- Pflege der Test-Matrix-Einträge

## Technische Entscheidungen
- Der neue Trigger wurde minimal-invasiv in die bestehende zentrale Tag-Namenslogik aufgenommen (`isManagedMirroredTagName`).
- Die fachliche Einbindung erfolgt ausschließlich über `collectManagedReportCardReasonTags`, sodass die bestehende Ausschlusslogik für `Reklamation` und `Storniert` unverändert bleibt.
- Es wurde kein API-Contract geändert.
- Es wurde keine UI-Struktur geändert.

## Betroffene Dateien
- `shared/appointmentCancellation.ts`
- `server/lib/reportProduktionsplanung.ts`
- `tests/unit/lib/reportProduktionsplanung.test.ts`
- `tests/unit/lib/appointmentCancellation.test.ts`
- `tests/integration/server/reports.produktionsplanung.integration.test.ts`
- `tests/integration/server/reports.produktionsplanung.projectRowsConsistency.integration.test.ts`
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen
Ausgeführt (seriell):

1. `npm run test:unit -- tests/unit/lib/appointmentCancellation.test.ts tests/unit/lib/reportProduktionsplanung.test.ts`
2. `npm run test:integration -- --reporter=verbose tests/integration/server/reports.produktionsplanung.integration.test.ts tests/integration/server/reports.produktionsplanung.projectRowsConsistency.integration.test.ts`

Ergebnis: Alle genannten Tests bestanden.

## Bekannte Einschränkungen
- Der Auftrag erweitert gezielt die Report-Triggerlogik; Seed-/Tag-Verwaltungsprozesse wurden nicht verändert.
- Voller Audit bzw. voller Testlauf (`test:e2e`, `test:e2e:browser`) war nicht Teil dieses Auftrags.
