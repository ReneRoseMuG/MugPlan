# FT03 Wochenkalender: Kollabierbare Tour-Lanes mit user-spezifischer Persistenz

## Ziel

Die Wochenansicht (FT03) unterstuetzt einen globalen Kollapsmodus fuer Tour-Lanes mit deterministischem Zustandsmodell:

- `isCollapsed = false`: alle Lanes offen
- `isCollapsed = true`: genau eine Lane offen

Der Zustand ist benutzerbezogen persistent und wird ueber FT18 gespeichert.

## Persistenzstrategie

Persistenz erfolgt ausschliesslich ueber das bestehende User-Preferences-Feature (FT18) und damit ueber den bestehenden `/api/user-settings`-Mechanismus mit `scopeType: "USER"`.

Es wurde keine neue Infrastruktur eingefuehrt.

## Preference-Keys

- `calendar.weekLanes.isCollapsed`
  - Typ: `boolean`
  - Default: `false`
  - Scope: `USER`
- `calendar.weekLanes.expandedLaneId`
  - Typ: `string`
  - Default: `""`
  - Scope: `USER`
  - Client-Normalisierung: `""` wird als `null` interpretiert

## Edge-Case-Strategie

1. Collapsed-Modus mit ungueltiger `expandedLaneId`:
- Fallback auf die oberste Lane.
- Sofortige Persistenzkorrektur (`expandedLaneId` wird direkt auf den Fallback gesetzt).

2. Keine Lanes vorhanden:
- Kein Fehler/Crash.
- Zustand bleibt konsistent.

3. Moduswechsel:
- `expanded -> collapsed`: gueltige `expandedLaneId` beibehalten, sonst oberste Lane waehlen und persistieren; danach `isCollapsed=true` persistieren.
- `collapsed -> expanded`: nur `isCollapsed=false` persistieren; `expandedLaneId` bleibt gespeichert, wird aber ignoriert.

## Warum kein LocalStorage

LocalStorage ist nicht benutzerbezogen und wuerde bei mehreren Benutzern auf demselben Client inkonsistente oder geteilte Zustaende verursachen.

FT18 liefert bereits die passende user-spezifische, serverseitig aufgeloeste Persistenz inklusive Versionshandling und ist damit die kanonische Architektur fuer diese Einstellungen.
