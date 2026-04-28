# Auftragslog: Auftragsliste Druck und Tag-Highlight

## Zweck

Die Auftragsliste sollte im tatsächlichen Druck dieselbe Kartenstruktur verwenden wie die geöffnete Report-Ansicht. Zusätzlich sollte die Kartenhervorhebung für die Tags `Sondermaß`, `Gespiegelt`, `Messe Aufbau/Abbau` und `Anmerkungen` vereinheitlicht und priorisiert werden, wobei `Messe Aufbau/Abbau` vor `Anmerkungen` gewinnen sollte.

## Scope

- Auftragslisten-Druckkarte auf dieselbe Kartenbasis wie die geöffnete Report-Karte umstellen
- gemeinsame clientseitige Highlight-Logik für relevante Auftragslisten-Tags ergänzen
- Priorität der Tag-Gewichtung auf `Sondermaß` > `Gespiegelt` > `Messe Aufbau/Abbau` > `Anmerkungen` festziehen
- stärkere Kartenkontur für die Auftragsliste einführen
- gezielte Unit-, Integration- und Browser-Tests für Konkurrenzfälle und Druckpfade ergänzen

## Technische Entscheidungen

- Die Druckdarstellung wurde nicht separat nachgebaut, sondern auf die bestehende `AuftragslisteProjectCard` umgestellt. Dadurch bleiben Öffnen-Ansicht, Druckvorschau und Browserdruck strukturell konsistent.
- Die Tag-Hervorhebung wird rein clientseitig aus den bereits gelieferten `tags` berechnet; der API-Contract der Auftragsliste blieb unverändert.
- Für stabile Browser- und Wiring-Tests wurde der Gewinner-Tag als internes Attribut `data-report-dominant-tag` an der Kartenkomponente verfügbar gemacht.
- Die Print-Farben werden mit `printColorAdjust` und `WebkitPrintColorAdjust` explizit auf exakte Ausgabe vorbereitet, damit farbige Hervorhebungen im Browserdruck nicht zu schwach ausfallen.
- Die Druckhöhenabschätzung wurde angehoben, weil die Druckkarte jetzt Footer und dieselbe dichtere Struktur wie die geöffnete Karte enthält.
- Nach dem ersten Stilstand wurde die Hervorhebung noch einmal verengt: Farbe liegt jetzt nur auf Kartenrahmen und Header. Body, Footer und Beschreibungsfläche bleiben bewusst neutral hell, damit keine dunklen oder uneinheitlichen Inhaltsflächen entstehen.
- Als kleiner Folgefix im Tourenplan-Report wurde der Kopfbereich der unterhalb der Terminkarten gerenderten Notizkarten um das Notiz-Icon ergänzt. Die bestehende Kartenstruktur blieb dabei unverändert.

## Betroffene Dateien

- `client/src/components/reports/auftragslisteCardStyle.ts`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/lib/auftragsliste-print-model.ts`
- `tests/unit/lib/auftragslisteCardStyle.test.ts`
- `tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `tests/integration/server/reports.auftragsliste.integration.test.ts`
- `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts`

## Hinweise zum Testen

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/lib/auftragslisteCardStyle.test.ts tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/reports.auftragsliste.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reports.ft26.browser.e2e.spec.ts --grep "Auftragsliste"`
- `npm run check`
- Nach der Stilkorrektur zusätzlich erneut:
  - `npm run test:unit -- tests/unit/lib/auftragslisteCardStyle.test.ts tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`
- Für den Tourenplan-Folgefix zusätzlich:
  - `npm run test:unit -- tests/unit/ui/tourenplanAppointmentCard.wiring.test.tsx`

## Bekannte Einschränkungen

- Es wurde kein vollständiger Gesamt-Testlauf über alle Browser-, Integrations- und Unit-Suiten des Repositories ausgeführt, sondern eine gezielte Absicherung der betroffenen Auftragslisten-Pfade.
- Die Hervorhebungslogik ist bewusst auf die Auftragsliste begrenzt und wurde nicht still auf andere Report-Kartentypen übertragen.
