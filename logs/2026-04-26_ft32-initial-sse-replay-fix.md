# FT-32 Initial SSE Replay Fix

## Anlass

Nach frischem Logout/Login wurde in der Entwicklungsumgebung sofort wieder der globale Hinweis `Änderungen verfügbar` sichtbar, obwohl kein anderer aktiver Nutzer beteiligt war.

## Ursache

- Der SSE-Controller behandelte eine frische Verbindung ohne `Last-Event-ID` wie einen Replay ab Cursor `0`.
- Dadurch wurden historische `journal_entry`-Ereignisse direkt beim ersten Connect nachgeliefert.
- Der Client setzte daraufhin korrekt `updatesAvailable`, obwohl es sich nicht um verpasste Live-Änderungen handelte.

## Umsetzung

- In `server/controllers/changeNotificationsController.ts` liefert `parseLastEventId(...)` ohne gültigen Header jetzt `null` statt `0`.
- Replay-Ereignisse werden nur noch geladen, wenn tatsächlich ein gültiger `Last-Event-ID`-Wert vorhanden ist.
- Die bestehende Reconnect-Semantik mit gültigem Cursor bleibt unverändert erhalten.

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/changeNotifications.routes.integration.test.ts --reporter=verbose`

Neu abgesichert:

- Eine frische Verbindung ohne `Last-Event-ID` replayt keine historischen Journal-Ereignisse.
- Eine Verbindung mit gültiger `Last-Event-ID` replayt weiterhin nur verpasste neuere Ereignisse.

## Vollständigkeit

Für diesen Fix wurden keine offenen TODOs, Platzhalter oder bewusst unvollständigen Teilpfade hinterlassen.
