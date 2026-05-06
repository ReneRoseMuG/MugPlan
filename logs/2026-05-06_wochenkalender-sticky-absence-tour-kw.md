# Wochenkalender Sticky-Absence und Tour-KW-Karten

## Datum

06.05.26

## Zweck

Der Wochenkalender wurde gegen Scroll-Artefakte im Sticky-Bereich gehärtet. Die Abwesenheitsspur bleibt unter dem Tagesheader kleben, kann pro Nutzer eingeklappt werden und die Tour-KW-Personalkarten in der linken Spalte wurden optisch näher an die Terminkarten herangeführt.

## Scope

- Wochenkalender-UI in `CalendarWeekView.tsx`.
- Neues User-Setting `calendar.weekAbsenceLane.collapsed`.
- Tests für Setting-Registry, Frontend-Fallback, User-Scope-Persistenz und Wochenkalender-Markup.
- Keine Änderung an Termin-Komponenten, Terminlogik, Tour-KW-Mutationsregeln, Rollenlogik, API-Routen, Datenmodell oder Migrationen.

## Technische Entscheidungen

- Der feste Sticky-Offset `top-[3.75rem]` wurde durch eine gemessene Tagesheader-Höhe ersetzt.
- Die z-index-Hierarchie ist im Code dokumentiert: Tagesheader `z-30`, Abwesenheitsspur `z-20`, Lane-Inhalte `z-10`, Marker-Hintergrund `z-0`.
- Der Collapse-/Expand-Zustand der Abwesenheitsspur wird als benutzerspezifisches Boolean-Setting gespeichert, Default `false`.
- Die Tour-KW-Personalkarte hat im expandierten Zustand eine Header-Bar für Add-/Apply-Aktionen und Menü sowie einen vollbreiten Footer.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/hooks/useSettings.ts`
- `server/settings/registry.ts`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/unit/settings/useSettings.weekAbsenceLaneCollapsed.test.ts`
- `tests/unit/settings/weekAbsenceLaneCollapsed.registry.test.ts`
- `tests/integration/server/userSettings.weekAbsenceLane.persistence.test.ts`

## Rollen und Berechtigungen

`ADMIN`, `DISPATCHER`/`DISPONENT` und `READER` dürfen ihren persönlichen Anzeigezustand der Abwesenheitsspur speichern. Das ist nur UI-Persistenz im User-Scope und keine fachliche Mutation. Bestehende Tour-KW-Schreibaktionen bleiben unverändert durch vorhandene Rollen-, Readonly- und Lock-Regeln begrenzt.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/settings/useSettings.weekAbsenceLaneCollapsed.test.ts tests/unit/settings/weekAbsenceLaneCollapsed.registry.test.ts`
- `npm run test:run -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `npm run test:run -- tests/integration/server/userSettings.weekAbsenceLane.persistence.test.ts --reporter=verbose`
- `npm run typecheck`
- `npm run check:encoding`
- `npm run lint`

## Bekannte Einschränkungen

- Eine händische Browser-Sichtprüfung der Scroll-Artefakte im Wochenkalender wurde in dieser Session nicht durchgeführt.
- Die Änderung nutzt die bestehende generische User-Settings-Infrastruktur; es gibt keine neue Migration und keinen neuen Endpoint.

## Nachtrag: fachlich nicht planbare Tour-KW-Lanes

`Ohne Tour`, `Abwesenheiten` und `Parkplatz` werden in der Wochenkalender-Personalspalte weiterhin als Lane-Spalten geführt, erhalten aber keine Tour-KW-Personalkarte mehr. Dadurch entstehen dort keine leeren `Keine MA`-Karten und keine Planungsaktion.

Im Tourformular wird der Tab `Wochenplanung` für `Abwesenheiten` und `Parkplatz` nicht mehr angeboten. Die Änderung reduziert nur die UI-Sichtbarkeit für fachlich nicht planbare System-Touren; bestehende serverseitige Tour-KW-Rollen-, Readonly- und Lock-Regeln bleiben unverändert.

Die fachliche Regel wurde zusätzlich in der Feature-Wiki dokumentiert:

- `FT (03): Kalenderansichten`
- `UC 04/15: Tour-KW-Wochenplanung anzeigen und anwenden`
- `UC 06/05: Wochenplanung für Parkplatz sperren`
- `FT (33): Abwesenheiten über interne Personalplanung`

Zusätzlich erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run check:encoding`
