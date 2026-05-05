# Auftragslog: Tour-KW-View Notizen und Tour-Lanes

## Zweck

Der Tour-KW-View sollte die Notizen nicht mehr innerhalb der Wochenkacheln anzeigen, sondern unterhalb der Kacheln. Zusätzlich sollte der View die Touren-Einklappfunktion aus dem Wochenkalender übernehmen und Notizkarten mit kräftigen Hintergrundfarben besser lesbar darstellen.

## Scope

- Frontend-Nacharbeit in bestehender Struktur.
- Keine neuen Endpoints, keine DB-Änderung, keine Contract-Änderung.
- Keine Änderung an Rollen-, Lock- oder Mutationsregeln.
- Weiterverwendung der bestehenden User-Settings `calendar.weekInlineNotes.visible`, `calendar.weekLanes.isCollapsed` und `calendar.weekLanes.expandedLaneId`.

## Rollen und Sichtbarkeit

- `ADMIN`, `DISPATCHER` und `DISPONENT` behalten die bestehenden Tour-KW-Mutationsaktionen.
- Readonly-Nutzer sehen weiterhin keine Mitarbeiter- oder Blockieraktionen.
- Die Änderung betrifft nur Darstellung, Lane-Auswahl und Notizposition im bestehenden Tour-KW-View.

## Technische Entscheidungen

- Die Tour-KW-Notizen werden als eigener Bereich unter den Kacheln gerendert und nutzen den zentralen Helfer `getReadableNoteTextColors`.
- Der Notiz-Farbhelfer wurde für kräftige, gesättigte Mitteltöne nachgeschärft, damit solche Notizen helle Schrift verwenden.
- Der Touren-Toggle im Tab `Wochenplanung` nutzt dieselben Settings wie der Wochenkalender.
- Die Tour-Header-Bar rendert im interaktiven Zustand als vollflächiger Button, damit ein Klick auf die Tour zuverlässig die sichtbare Lane wechselt.
- Blockierte Tour-KW-Karten blenden den Leerzustand `Keine Mitarbeiter geplant` aus.
- Karten einer Tour-Bahn werden in einem eigenen gestreckten Grid gerendert; Notizen stehen in einem separaten Grid darunter, damit Notizen die Kachelhöhen nicht verzerren.

## Betroffene Dateien

- `client/src/components/TourManagement.tsx`
- `client/src/components/TourWeekCard.tsx`
- `client/src/components/TourWeekPlanningView.tsx`
- `client/src/components/calendar/CalendarWeekTourLaneHeaderBar.tsx`
- `client/src/lib/note-colors.ts`
- `tests/unit/lib/note-colors.test.ts`
- `tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx`
- `tests/unit/ui/tourWeekCard.render.test.tsx`
- `tests/unit/ui/tourWeekPlanningView.render.test.tsx`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/lib/note-colors.test.ts tests/unit/ui/tourWeekPlanningView.render.test.tsx`
- `npm run test:unit -- tests/unit/ui/tourManagement.role-readonly.smoke.test.tsx tests/unit/ui/tourManagement.versioning.test.tsx`
- `npm run test:unit -- tests/unit/lib/note-colors.test.ts tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/ui/tourWeekCard.render.test.tsx tests/unit/ui/calendarWeekTourLaneHeaderBar.counters.test.tsx tests/unit/ui/calendarWeekTourLaneHeaderBar.notesForeground.test.tsx`
- `npm run check`
- `npm run lint`

## Bekannte Einschränkungen

- Kein Browser-E2E-Lauf. Die Änderung wurde über fokussierte Unit-Tests, TypeScript, Check und Lint abgesichert.
- Die tatsächliche visuelle Feinwirkung des Höhenausgleichs sollte bei Bedarf im Browser noch manuell geprüft werden.
