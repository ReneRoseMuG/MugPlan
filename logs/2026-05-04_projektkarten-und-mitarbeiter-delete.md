# 04.05.26 | Projektkarten und Mitarbeiter-Löschung

## Zweck

Diese Session hat mehrere offene Punkte aus dem Projektlisten- und Mitarbeiterverwaltungsbereich abgeschlossen und den Arbeitsstand anschließend für die Sicherung vorbereitet.

## Scope

- Projekt-Boardkarten zeigen die nächste Terminzeile im Body statt über ein Termin-Icon.
- Die Terminzeile nutzt die Tourfarbe als visuelle Kennzeichnung, inzwischen abgeschwächt als transparenter Hintergrund mit stärkerem Rand.
- Der Projektlistenfilter `Geplante` bleibt auf Projekte mit Terminen ab heute ausgerichtet.
- Die Rollenregel für Mitarbeiter-Löschung wurde fachlich geklärt: Admin darf Mitarbeiter löschen, Dispatcher und Reader müssen blockiert werden.
- Audit ohne Coverage und vollständige Testläufe wurden ausgeführt und ausgewertet.

## Technische Entscheidungen

- Die Terminzeile der Projektkarten liegt in `ProjectEntityCard`, damit Board- und Preview-Darstellungen denselben Kartenkörper verwenden.
- Für die Tourfarbe wird kein vollflächiger Hex-Hintergrund mehr genutzt. Stattdessen wird aus der Tourfarbe ein `rgba`-Tint erzeugt.
- Die Mitarbeiter-Delete-Implementierung blieb serverseitig unverändert, weil Controller und Service bereits `ADMIN` erzwingen.
- Der rote FT05-Integrationstest wurde auf das bestätigte Sollverhalten angepasst und um einen Dispatcher-Blockadetest ergänzt.

## Betroffene Dateien

- `client/src/components/ui/entity-preview-cards.tsx`
- `tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx`
- `tests/integration/server/ft05.full-uc-coverage.integration.test.ts`
- Bereits offene Session-Dateien im Projektlisten-, Artikellistenfilter-, Mitarbeiter- und Wiki-Kontext bleiben Teil des Arbeitsstands.

## Tests und Verifikation

- `npm run test:unit -- tests/unit/ui/projectsPage.currentAppointmentsCounter.wiring.test.tsx --reporter=verbose`
- `npm run typecheck`
- `npm run test:integration -- tests/integration/server/ft05.full-uc-coverage.integration.test.ts --reporter=verbose`
- `npm run test:integration -- --reporter=verbose`
- Vorheriger Audit ohne Coverage:
  - `npm run lint`
  - `npm run audit`
  - `npm run secrets`
  - `npm run analyze:arch`
  - `npm run analyze:boundaries`
  - `npm run analyze:knip`
- Vollständige Testläufe:
  - `npm run test:unit -- --reporter=verbose`
  - `npm run test:integration -- --reporter=verbose`
  - `npm run test:e2e -- --reporter=verbose`
  - `npm run test:e2e:browser`

## Bekannte Einschränkungen

- `npm run check` war im Audit noch rot wegen einer Encoding-Lint-Meldung in `TourEmployeeCascadeDialog.tsx`.
- `analyze:arch` meldete weiterhin Dependency-Warnungen.
- `analyze:knip` meldete weiterhin ungenutzte Dateien, Exporte und Abhängigkeiten; das Skript läuft bewusst ohne roten Exit-Code.

## Journal-Einschätzung

Ja, Inhalte dieser Session sind journalwürdig. Insbesondere die bestätigte fachliche Rollenregel zur Mitarbeiter-Löschung und die Projektkarten-Terminzeile betreffen dokumentierbares App-Verhalten. Ein Wiki-Journal wurde in dieser Aktion nicht geschrieben, weil dafür kein ausdrückliches `journal`-Kommando gegeben wurde.
