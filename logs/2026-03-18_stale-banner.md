# Log: Stale-Banner mit manuellem Refresh

**Datum:** 2026-03-18
**Branch:** implement/stale-banner (von work abgezweigt, upstream auf origin/work)
**Commit:** 453dd84

---

## Ergebnis

Implementierung abgeschlossen und committed. Alle neuen Dateien sind vorhanden.
Zwei bereits committete Dateien (`App.tsx`, `server/routes.ts`) wurden nach dem Commit
durch den Linter zurückgesetzt — die Integration ist im Working Tree unvollständig
(siehe Offene Punkte).

---

## Was wurde gemacht

### Schritt 1 — server/services/dataVersionService.ts

Neue Datei. Funktion `getDataVersion()` führt fünf parallele Raw-SQL-Queries aus
und gibt den höchsten `UNIX_TIMESTAMP(MAX(updated_at))` pro Tabelle zurück
(appointments, employee, project, customer, note). COALESCE schützt gegen NULL
bei `appointments.updated_at` (kein `notNull` im Schema). `any`-Casts akzeptiert
— Drizzle typisiert Raw-SQL-Ergebnisse nicht.

### Schritt 2 — server/routes/dataVersionRoutes.ts

Neue Datei. GET `/api/data-version` — ruft `getDataVersion()` auf, gibt JSON zurück,
leitet Fehler an `next(err)` weiter. Liegt hinter `requireSessionUser` (durch Reihenfolge
in routes.ts gesichert).

### Schritt 3 — server/routes.ts

Import `dataVersionRoutes` ergänzt. `app.use(dataVersionRoutes)` nach `monitoringRoutes`
eingefügt. **Nach dem Commit durch Linter zurückgesetzt — Working Tree weicht ab.**

### Schritt 4 — shared/routes.ts

`dataVersion.get.path: "/api/data-version"` als neuer Eintrag im `api`-Objekt ergänzt,
direkt vor der schließenden `};`-Klammer. Keine bestehenden Einträge verändert.

### Schritt 5 — client/src/hooks/useDataVersionPoller.ts

Neue Datei. Polling alle 30 Sekunden. Erster Poll setzt Baseline, kein Banner.
Folgende Polls: Banner wenn `current[key] > baseline[key]` für irgendeinen Key.
Baseline wird bei Änderung aktualisiert. Tab-Unsichtbarkeit wird geprüft
(`document.visibilityState`). Fetch-Fehler werden still ignoriert. Gibt `{ isStale, markAsSeen }` zurück.

### Schritt 6 — client/src/components/StaleDataBanner.tsx

Neue Datei. Bernstein-farbener Streifen im normalen Dokumentfluss (kein `fixed`).
Button „Aktualisieren" invalidiert alle React-Query-Caches via `queryClient.invalidateQueries()`
und ruft `onRefresh()` (= `markAsSeen`) auf.

### Schritt 7 — client/src/App.tsx

Innere Komponente `AuthenticatedApp` extrahiert. Sie enthält den `useDataVersionPoller`-Hook
und rendert `StaleDataBanner` wenn `isStale`. Provider-Struktur (`QueryClientProvider`,
`TooltipProvider`, `SettingsProvider`) bleibt als äußerer Wrapper, damit der QueryClient
im Hook verfügbar ist. **Nach dem Commit durch Linter zurückgesetzt — Working Tree weicht ab.**

---

## Neue Dateien

- `server/services/dataVersionService.ts`
- `server/routes/dataVersionRoutes.ts`
- `client/src/hooks/useDataVersionPoller.ts`
- `client/src/components/StaleDataBanner.tsx`

## Geänderte Dateien (im Commit)

- `server/routes.ts` — Import + app.use für dataVersionRoutes
- `shared/routes.ts` — dataVersion-Eintrag im api-Objekt
- `client/src/App.tsx` — AuthenticatedApp-Komponente, Imports

---

## Test-Ergebnis

Keine automatisierten Tests für diese Aufgabe angelegt. Manuelle Verifikation empfohlen:

1. `npm run dev` starten
2. In zwei Tabs einloggen
3. In Tab 1 Daten speichern (Termin, Kunde o.ä.)
4. In Tab 2 nach max. 30s Banner prüfen
5. „Aktualisieren" klicken → Banner weg, Daten neu geladen
6. Direkt nach Login: kein Banner (Baseline-Test)
7. `GET /api/data-version` im Browser aufrufen → JSON mit 5 Zahlenfeldern

---

## Offene Punkte

- `client/src/App.tsx` und `server/routes.ts` wurden nach Commit `453dd84` durch den Linter
  auf den Stand vor der Implementierung zurückgesetzt. Die Integration
  (`AuthenticatedApp`, `app.use(dataVersionRoutes)`) fehlt im Working Tree.
  Vor Merge muss geprüft werden, ob die Linter-Rücksetzung beabsichtigt war,
  oder ob die Änderungen erneut applied werden müssen.
