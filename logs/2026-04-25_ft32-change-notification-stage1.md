# FT-32 Change Notification Stage 1

## Umgesetzter Stand

- Neuer authentifizierter SSE-Endpoint `/api/change-notifications/stream` über `shared/routes.ts`, `server/routes/changeNotificationsRoutes.ts` und `server/controllers/changeNotificationsController.ts`.
- Neue technische Publish-/Replay-Schicht `server/services/changeNotificationsService.ts` auf Basis von `journal_entry`.
- `server/services/journalService.ts` publiziert nach erfolgreichem Journal-Write sofort ein technisches Änderungsereignis.
- `server/repositories/journalRepository.ts` liefert Replay-Ereignisse über `Last-Event-ID`.
- Neuer Client-Provider `client/src/providers/ChangeNotificationsProvider.tsx`:
  - SSE-Verbindung
  - globaler Status `updatesAvailable`
  - Cross-Window-Koordination für Reloads
  - globaler Edit-Lock über die aktuelle Arbeitsumgebung
  - dedizierter FT-32-Toast getrennt vom normalen Toaster-Store
- `client/src/components/ui/entity-form-shell.tsx` registriert offene Vollformulare zentral als globalen Edit-Lock.
- `client/src/components/Sidebar.tsx` und `client/src/components/StandaloneLayout.tsx` verwenden jetzt den globalen Reload statt lokaler `queryClient.invalidateQueries()`.
- `client/src/lib/auth.ts` persistiert zusätzlich die `userId`, damit eigene Änderungen clientseitig unterdrückt werden können.

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run check`
  - TypeScript war nach der Umsetzung grün.
  - Der Gesamtbefehl bleibt trotzdem an einem bereits vorhandenen repo-weiten Encoding-Lint-Blocker hängen.
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project unit tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/entityFormShell.layout.test.tsx --reporter=verbose`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test vitest run --config vitest.workspace.ts --project integration tests/integration/server/changeNotifications.routes.integration.test.ts --reporter=verbose`

Neu abgesichert:

- Unauthentifizierter Zugriff auf den SSE-Stream wird abgewiesen.
- READER dürfen den technischen Änderungsstream öffnen.
- Replay über `Last-Event-ID` liefert nur neuere Journal-Ereignisse.
- Sidebar- und EntityFormShell-Rendering bleiben trotz FT-32-Verdrahtung stabil.

## Verbleibender externer Blocker

`npm run check` scheitert weiterhin am bestehenden Encoding-Lint außerhalb von FT-32:

- `server/repositories/usersRepository.ts`
- `server/services/appointmentsService.ts`
- `shared/projectArticleList.ts`
- `shared/schema.ts`

Diese Stellen wurden in dieser FT-32-Umsetzung bewusst nicht fachfremd mit geändert.

## Vollständigkeit

Für FT-32 Stufe 1 im hier geplanten Umfang wurden keine bewussten TODOs, Platzhalter oder halbfertigen Teilpfade im neu eingeführten Code hinterlassen.
