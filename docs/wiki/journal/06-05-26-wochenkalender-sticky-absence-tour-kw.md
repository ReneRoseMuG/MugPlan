# 06.05.26 | Kalender | FT-03/FT-04: Sticky-Absence und Tour-KW-Karten

## Zusammenfassung

Der Wochenkalender wurde im Sticky-Bereich stabilisiert. Die Abwesenheitsspur klebt nun unter dem tatsächlich gemessenen Tagesheader, kann pro Nutzer eingeklappt werden und die Tour-KW-Personalkarten haben im expandierten Zustand eine eigene Header-Bar und einen vollbreiten Footer.

## Art der Änderung

Mehrschichtige UI- und Settings-Änderung ohne neue API-Route, ohne Datenmodelländerung und ohne Migration.

## Betroffene Features

- FT-03 Kalenderansichten: Wochenkalender und Abwesenheitsspur
- FT-04 Tourenplanung: Tour-KW-Personalkarten im Wochenkalender

Notion-Links wurden in dieser Session nicht zusätzlich geprüft; Grundlage waren der freigegebene Plan, die lokale Repo-Dokumentation und der aktuelle Code.

## Konkrete Änderungen

- `CalendarWeekAbsenceRow` verwendet keinen festen `top-[3.75rem]` mehr, sondern erhält den gemessenen Sticky-Offset des Tagesheaders.
- Die Sticky-Layer sind im Code dokumentiert: Tagesheader `z-30`, Abwesenheitsspur `z-20`, Lane-Inhalte `z-10`, Marker-Hintergrund `z-0`.
- Die Abwesenheitsspur hat einen Collapse-/Expand-Button mit eigenem `data-testid`.
- Neues User-Setting `calendar.weekAbsenceLane.collapsed` mit Default `false`.
- Die Tour-KW-Personalkarte nutzt im expandierten Zustand eine Header-Bar für Add-/Apply-Aktionen und Menü sowie einen vollbreiten Footer.
- Tests decken Setting-Registry, Hook-Fallback, User-Scope-Persistenz, expandierte/kollabierte Abwesenheitsspur und Tour-KW-Kartenstruktur ab.

## Rollen

`ADMIN`, `DISPATCHER`/`DISPONENT` und `READER` dürfen ihren persönlichen Anzeigezustand der Abwesenheitsspur speichern. Tour-KW-Schreibaktionen bleiben unverändert durch bestehende Rollen-, Readonly- und Lock-Regeln begrenzt.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/settings/useSettings.weekAbsenceLaneCollapsed.test.ts tests/unit/settings/weekAbsenceLaneCollapsed.registry.test.ts`
- `npm run test:run -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/calendarWeekView.blockedWeekBehavior.test.tsx`
- `npm run test:run -- tests/integration/server/userSettings.weekAbsenceLane.persistence.test.ts --reporter=verbose`
- `npm run typecheck`
- `npm run check:encoding`
- `npm run lint`

## Offene Punkte

- Die händische Browser-Sichtprüfung der Scroll-Artefakte im Wochenkalender steht noch aus.

## Nachtrag

Fachlich nicht planbare Touren sind nun auch in der Tour-KW-Planung ausgeblendet: Im Wochenkalender werden für `Ohne Tour`, `Abwesenheiten` und `Parkplatz` keine Tour-KW-Personalkarten mehr gerendert. Im Tourformular ist der Tab `Wochenplanung` für `Abwesenheiten` und `Parkplatz` unsichtbar.

Die Änderung betrifft nur die UI-Sichtbarkeit. Tour-KW-Mutationen bleiben unverändert durch die bestehenden Rollen-, Readonly- und Lock-Regeln abgesichert.

Die Regel ist zusätzlich in den Feature-Seiten zu FT (03), FT (04), FT (06) und FT (33) nachlesbar.

Zusätzlich verifiziert:

- `npm run test:run -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run check:encoding`
