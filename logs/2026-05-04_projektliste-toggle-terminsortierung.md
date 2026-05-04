# Projektliste: Toggle-Beschriftungen und Terminsortierung

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `0e9b29e8`

## Zweck

Dieses Log dokumentiert die Nachkorrektur in der Projektliste. Die Scope-Toggles sollten kürzer beschriftet werden, und die vorhandene Tabellenspalte `Nächster Termin` sollte sortierbar werden.

## Scope

- Die Projekt-Scope-Toggles wurden von langen Beschriftungen auf `Alle`, `Geplante` und `Ohne Termin` gekürzt.
- Die vorhandene Tabellenspalte `Nächster Termin` nutzt jetzt denselben klickbaren Sortierkopf wie Projektname, Kunde, Kundennummer und Auftragsnummer.
- Die Sortierung läuft clientseitig auf den bereits geladenen Projektzeilen.
- Projekte ohne nächsten Termin bleiben bei der Terminsortierung am Ende.
- Backend-Contracts, API-Querys und Datenmodell wurden nicht geändert.

## Rollen und Sperren

- Es wurden keine Rollen erweitert.
- Die Projektliste bleibt in den bestehenden Rollen- und Sichtbarkeitspfaden.
- Es wurde keine neue Aktion, Mutation oder serverseitige Berechtigung eingeführt.
- Die Änderung betrifft ausschließlich UI-Beschriftung und Sortierverhalten einer bestehenden Liste.

## Technische Entscheidungen

- `ProjectSortKey` wurde um `nextAppointment` erweitert.
- Der Sortierwert kombiniert `nextAppointmentStartDate` und `nextAppointmentStartTimeHour`.
- Fehlende Termine werden als `null` behandelt und unabhängig von der Sortierrichtung ans Ende gelegt.
- Die vorhandene `renderSortHeader`-Struktur wurde wiederverwendet, damit Optik und Bedienung der Sortierköpfe konsistent bleiben.
- Die Toggle-Texte wurden direkt im bestehenden `ProjectFilterPanel` geändert, ohne Layout- oder Komponentenstruktur anzupassen.

## Betroffene Dateien

- `client/src/components/ProjectsPage.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx`
- `tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`
- `npm run lint`
- `git diff --check`

## Bekannte Einschränkungen

- Es wurde kein Browser-E2E speziell für die neue Terminsortierung ergänzt, weil die Änderung lokal in der bestehenden Tabellenverdrahtung und Sortierlogik liegt.
- Der Arbeitsbaum enthält weitere offene Änderungen aus vorherigen Aufgaben; diese wurden für diese Nachkorrektur nicht verändert.
