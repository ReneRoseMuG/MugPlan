# Auftragslog: Tour-KW-Settings von Wochenkalender getrennt

## Zweck

Die Tour-KW-Planung hatte den Einklappzustand der Tour-Lanes über dieselben User-Settings wie der Wochenkalender gespeichert. Dadurch beeinflussten sich beide Views gegenseitig. Ziel dieses Auftrags war, die Konfigurationen unabhängig voneinander zu machen.

## Scope

- Trennung der User-Settings für Tour-KW-Planung und Wochenkalender.
- Keine neuen Endpoints, keine DB-Änderung, keine Migration.
- Keine Änderung an Rollen-, Lock- oder Mutationsregeln.
- Keine Änderung am bestehenden Wochenkalender-Verhalten.

## Technische Entscheidungen

- Der Wochenkalender behält die bestehenden Keys:
  - `calendar.weekLanes.isCollapsed`
  - `calendar.weekLanes.expandedLaneId`
- Die Tour-KW-Planung nutzt eigene Keys:
  - `tourWeekPlanning.weekLanes.isCollapsed`
  - `tourWeekPlanning.weekLanes.expandedLaneId`
- Die neuen Keys wurden in `server/settings/registry.ts` als `USER`-Settings registriert.
- `client/src/hooks/useSettings.ts` kennt die neuen Keys typisiert und löst sie mit denselben Fallback-Regeln wie die Kalender-Lane-Settings auf.
- `TourManagement` und `TourWeekPlanningView` verwenden nur noch die Tour-KW-spezifischen Keys.

## Betroffene Dateien

- `server/settings/registry.ts`
- `client/src/hooks/useSettings.ts`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourWeekPlanningView.tsx`
- `tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `tests/unit/ui/tourWeekPlanningView.render.test.tsx`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/tourWeekPlanningView.render.test.tsx tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `npm run check`

## Bekannte Einschränkungen

- Kein Commit und kein Push in diesem Auftrag.
- Im Arbeitsbaum lagen bereits separate FT33-Abwesenheiten-Änderungen. Diese wurden nicht verändert.
