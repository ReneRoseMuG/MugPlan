# Reports Refactor Vorlaufliste und Produkt Vorlauf

## Zweck

- Die Reports-Seite für Vorlaufliste und Produkt Vorlauf strukturell vereinheitlichen.
- Die Reportlogik für `Sondermaß`, `Storniert` und `Reklamation` fachlich korrekt an Termin und Projekt auswerten.
- Die Kategorieauswahl in beiden Reports als verbindlichen Filter behandeln und die Persistenz dafür konsistent halten.

## Scope

- Desktop-Layout der Reports-Seite auf zwei nebeneinanderliegende Report-Container umstellen.
- Konfigurationsflächen beider Reports in zwei Spalten gliedern: links Datumsbereich, rechts gemeinsame `Artikel Kategorien`.
- Footer der Report-Konfiguration über die volle Breite ziehen und den Ausführen-Button rechts ausrichten.
- Beschreibungssätze unter den Report-Überschriften entfernen.
- Im Produkt-Vorlauf die manuelle Auswahl des Sondermaß-Tags entfernen.
- In der Vorlaufliste die sichtbare `Tags`-Spalte entfernen und stattdessen Zeilenhintergründe plus Tooltip aus `Storniert` oder `Sondermaß` ableiten.
- `Reklamation` in der Vorlaufliste als Ausschlusskriterium auf Termin und Projekt berücksichtigen.
- `Storniert` und `Reklamation` im Produkt-Vorlauf als Ausschlusskriterien auf Termin und Projekt berücksichtigen.
- Das systemverwaltete Tag `Sondermaß` im Termin-Tag-Picker sichtbar machen.
- Den API-Contract und das User-Setting des Produkt-Vorlaufs auf die reduzierte Auswahl ohne `specialMeasureTagId` umstellen.
- Die Reportspalten der Vorlaufliste von der aktiven Kategorieauswahl abhängig rendern.

## Technische Entscheidungen

- Die bestehende Schichttrennung Route → Controller → Service → Repository bleibt erhalten; die Fachlogik wurde im Repository ergänzt und nicht im Frontend nachgebaut.
- `Sondermaß` wird für Reports und Picker über das systemverwaltete Tag mit Namensabgleich behandelt; die frühere manuelle Report-Auswahl entfällt vollständig.
- Die Vorlaufliste erhält serverseitig ein zusätzliches Feld `highlightTag`, damit Tooltip und Zeilenfarbe ohne clientseitige Tag-Heuristik ableitbar sind.
- Leere Kategoriearrays werden nicht mehr als implizites „alles“ interpretiert. Im Frontend wird dafür zwischen Default-Auflösung und bewusst gespeicherter Benutzerauswahl unterschieden.
- Die Sichtbarkeit von `Sondermaß` für `appointment` wurde in den gemeinsamen Tag-Regeln freigeschaltet; `Storniert` und `Reklamation` bleiben dort weiterhin im Picker verborgen.

## Betroffene Dateien

- `client/src/components/ReportsPage.tsx`
- `client/src/components/ui/report-config-surface.tsx`
- `client/src/components/ui/table-view.tsx`
- `client/src/hooks/useSettings.ts`
- `server/controllers/reportsController.ts`
- `server/lib/appointmentCancellation.ts`
- `server/repositories/reportsRepository.ts`
- `server/services/reportsService.ts`
- `server/settings/registry.ts`
- `shared/appointmentCancellation.ts`
- `shared/routes.ts`
- `tests/unit/ui/reportsPage.wiring.test.tsx`
- `tests/unit/lib/appointmentCancellation.test.ts`
- `tests/unit/settings/reportsProductVorlaufSelection.registry.test.ts`
- `tests/integration/server/appointments.cancellation.integration.test.ts`
- `tests/integration/server/reports.vorlaufliste.integration.test.ts`
- `tests/integration/server/reports.productVorlauf.integration.test.ts`
- `tests/integration/server/userSettings.reportsProductVorlauf.persistence.test.ts`
- `tests/e2e-browser/tag-picker.domain-visibility.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Test-Hinweise

- Ausgeführt: `npm run typecheck`
- Ausgeführt: `npx vitest run --maxWorkers=1 tests/unit/lib/appointmentCancellation.test.ts tests/unit/settings/reportsProductVorlaufSelection.registry.test.ts tests/unit/ui/reportsPage.wiring.test.tsx`
- Ausgeführt: `npx vitest run --maxWorkers=1 --reporter=verbose tests/integration/server/appointments.cancellation.integration.test.ts tests/integration/server/reports.vorlaufliste.integration.test.ts tests/integration/server/reports.productVorlauf.integration.test.ts tests/integration/server/userSettings.reportsProductVorlauf.persistence.test.ts`
- Ausgeführt: `npm run test:e2e:browser -- tests/e2e-browser/tag-picker.domain-visibility.browser.e2e.spec.ts --workers=1`
- Noch nicht ausgeführt: voller Audit nach Repository-Regeln (`npm run check`, `npm run lint`, `npm run audit`, `npm run secrets`)
- Noch nicht ausgeführt: voller Testlauf nach Repository-Regeln (`npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:e2e:browser`)

## Bekannte Einschränkungen

- Das Log dokumentiert den umgesetzten Stand, aber es gab bisher keinen vollständigen Audit- und keinen vollständigen Testlauf über alle verpflichtenden Repository-Kommandos.
- Die fachliche Reportlogik wertet `Sondermaß`, `Storniert` und `Reklamation` nun an Termin und Projekt aus; andere Tags bleiben für diese beiden Reports weiterhin ohne Bedeutung.
- Eine Aktualisierung von `docs/architecture.md`, `docs/implementation.md`, `architecture-index.md` und `implementation-index.md` ist in diesem Stand noch nicht geprüft.
