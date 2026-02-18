# PKG-03 Testliste

## Ziel von PKG-03
PKG-03 sichert P0-Anforderungen fuer Autorisierung und Rollenmodell:

1. Nicht autorisierte Mutationen werden abgewiesen.
2. Letzter-Admin-Schutz verhindert unzulaessige Demotion.
3. Rollenaufloesung aus DB-Rollen funktioniert deterministisch in der Middleware.

Alle Tests sind Unit-Tests mit Mocks, ohne echte Datenbank.

## Abdeckungsuebersicht
- Datei `tests/unit/authorization/roleGuards.test.ts`: 6 Tests

## Datei `tests/unit/authorization/roleGuards.test.ts`

### 1) `rejects listUsers for non-admin context with 403`
- Service/Funktion: `usersService.listUsers`
- Given:
  - Aufrufender Kontext hat Rolle `DISPONENT`.
- When:
  - `listUsers(...)` wird aufgerufen.
- Then:
  - Fehler `status = 403`, `code = LOCK_VIOLATION`.
- Kontext:
  - Der Service darf Benutzerlisten nur fuer Admin-Kontext ausgeben.

### 2) `rejects changeUserRole for non-admin context with 403`
- Service/Funktion: `usersService.changeUserRole`
- Given:
  - Aufrufender Kontext hat Rolle `LESER`.
- When:
  - Rollenmutation wird angefordert.
- Then:
  - Fehler `status = 403`, `code = LOCK_VIOLATION`.
- Kontext:
  - Rollenwechsel ist eine privilegierte Mutation und muss strikt geschuetzt sein.

### 3) `prevents self-demotion of last admin with BUSINESS_CONFLICT`
- Service/Funktion: `usersService.changeUserRole`
- Given:
  - Zieluser ist `ADMIN`.
  - Es gibt keinen weiteren aktiven Admin (`countActiveAdmins = 0`).
  - Aufrufer ist derselbe User (Self-Demotion).
- When:
  - Zielrolle wird auf Nicht-Admin gesetzt.
- Then:
  - Fehler `status = 409`, `code = BUSINESS_CONFLICT`.
  - Kein weiterer Rollen-Write wird versucht.
- Kontext:
  - Diese Invariante schuetzt das System vor einem Zustand ohne administrativen Zugriff.

### 4) `prevents demotion when no other active admin remains`
- Service/Funktion: `usersService.changeUserRole`
- Given:
  - Zieluser ist `ADMIN`.
  - Es gibt keinen weiteren aktiven Admin.
  - Aufrufer ist ein anderer Admin (keine Self-Demotion).
- When:
  - Demotion des Zielusers wird angefordert.
- Then:
  - Fehler `status = 409`, `code = BUSINESS_CONFLICT`.
  - Kein Rollen-Write wird ausgefuehrt.
- Kontext:
  - Der letzte-Admin-Schutz gilt nicht nur fuer Self-Demotion, sondern systemweit.

### 5) `maps roleCode to canonical roleKey and sets req.userContext`
- Service/Funktion: `resolveUserRole` Middleware
- Given:
  - `req.userId` ist gesetzt.
  - Repository liefert aktiven User mit `roleCode = DISPATCHER`.
- When:
  - Middleware wird ausgefuehrt.
- Then:
  - `req.userContext` wird gesetzt mit `roleKey = DISPONENT`.
  - `next()` wird ohne Fehler aufgerufen.
- Kontext:
  - Diese Abbildung ist Grundlage fuer alle nachgelagerten Berechtigungspruefungen.

### 6) `fails deterministically when request userId is missing`
- Service/Funktion: `resolveUserRole` Middleware
- Given:
  - `req.userId` fehlt.
- When:
  - Middleware laeuft.
- Then:
  - `next(error)` wird genau einmal aufgerufen.
  - Fehlermeldung enthaelt Hinweis auf fehlende `userId`.
- Kontext:
  - Ohne gueltigen User-Kontext darf keine Rollenaufloesung stattfinden.

## Warum diese Tests wichtig sind
- Sie sichern den Zugangsschutz zu kritischen Admin-Funktionen.
- Sie verhindern den Verlust administrativer Steuerbarkeit.
- Sie stellen sicher, dass Rollenmodell und Berechtigungslogik konsistent zusammenspielen.
