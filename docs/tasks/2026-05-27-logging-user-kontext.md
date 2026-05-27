# Codex-Auftrag: Logging um User-Kontext erweitern

**Parent:** PROJ-1 — MuG Plan  
**Datum:** 2026-05-27  
**Aufgaben-ID:** TASK-98

---

## Ziel

Vier konkrete Logging-Stellen im Server werden so erweitert, dass userId und Benutzername in jedem Log-Eintrag erscheinen, sofern aus dem Request-Kontext verfügbar. Nach der Änderung lässt sich jede HTTP-Anfrage, jeder Serverfehler und jedes Auth-Ereignis einem konkreten Benutzer zuordnen — ohne Datenbankabfrage.

---

## Hintergrund & Kontext

Eine systematische Analyse des Logging-Systems hat folgende Lücken identifiziert:

- Die HTTP-Request-Middleware in `server/index.ts` loggt `method`, `path`, `status`, `durationMs`, aber **keinen User-Kontext**. `req.userContext` ist zum Zeitpunkt des `res.on('finish', ...)` bereits befüllt, wird aber nicht genutzt.
- `server/middleware/errorHandler.ts` loggt `internal_server_error` ohne userId oder userName — gerade bei 500ern ist die Zuordnung zur auslösenden Person entscheidend für die Reproduktion.
- `authController.ts` loggt `login_success` und `quick_login` nur mit `{ userId }`. Der Benutzername fehlt.
- `login_failed` loggt nur `{ code: error.code }` — der versuchte Benutzername aus dem Request-Input (`input.username`) fehlt. Das ist ein Mangel für Sicherheitsüberwachung.

Das bestehende Hilfssystem (`server/lib/requestActor.ts`, `getRequestActor(req)`) ist bereits vorhanden und liefert `{ userId, name }` — es wird jedoch an den kritischen Stellen nicht genutzt.

Das Journal-System für Termine nutzt `getRequestActor` bereits korrekt. Daran wird nichts geändert.

---

## Aufgabe

### 1. HTTP-Request-Log — `server/index.ts`

Im `res.on('finish', ...)` Callback den User-Kontext aus `req.userContext` lesen und dem bestehenden Log-Objekt hinzufügen:

- `userId`: `req.userContext?.userId ?? null`
- `userName`: `req.userContext?.displayName ?? null`

Beide Felder werden nur dann in das Log-Objekt aufgenommen, wenn sie nicht `null` sind (d. h. nur für authentifizierte Requests). Für unauthentifizierte Requests (z. B. `/api/auth/session` mit 401) bleiben die Felder weg.

### 2. Error-Handler — `server/middleware/errorHandler.ts`

Die Funktion `errorHandler` erhält das `req`-Objekt bereits. Den User-Kontext analog zu Punkt 1 aus `req.userContext` lesen und dem bestehenden `logError`-Aufruf hinzufügen:

- `userId`: `req.userContext?.userId ?? null`
- `userName`: `req.userContext?.displayName ?? null`

Falls `req.userContext` nicht gesetzt ist (öffentliche Route oder Fehler vor Auth-Middleware), werden die Felder weggelassen.

### 3. login_success und quick_login — `server/controllers/authController.ts`

Bei `logAuth("login_success", ...)` und `logAuth("quick_login", ...)` den Benutzernamen ergänzen. Der Benutzername ist aus dem `result`-Objekt des `authService` verfügbar (dort wo auch `userId` herkommt). Falls der Name nicht verfügbar ist, `null` übergeben — kein optionaler Aufruf-Pfad.

### 4. login_failed — `server/controllers/authController.ts`

Bei `logAuth("login_failed", ...)` den versuchten Benutzernamen aus `input.username` hinzufügen. Der Wert kommt aus dem bereits validierten Zod-Parse-Ergebnis und ist immer ein String. Er wird als `attemptedUsername` im Meta-Objekt übergeben.

---

## Technische Leitplanken

- **Kein Breaking Change** an der Logger-API (`logAuth`, `logError`, `logInfo`). Nur das `meta`-Objekt wird um Felder erweitert.
- **Keine neuen Abhängigkeiten** einführen. `getRequestActor` aus `server/lib/requestActor.ts` ist bereits vorhanden und soll genutzt werden.
- **Null-safe**: Felder, die `null` ergeben, werden nicht ins Log-Objekt aufgenommen (kein `{ userId: null }` im Output).
- **Kein Eingriff** in `server/lib/logger.ts`, `server/lib/requestActor.ts`, das Journal-System oder andere Controller.
- **Kein Request-ID / Correlation-ID** in diesem Scope — das ist ein separates, größeres Thema.
- Die Änderungen betreffen ausschließlich: `server/index.ts`, `server/middleware/errorHandler.ts`, `server/controllers/authController.ts`.

---

## Regeln & Randfälle

- Öffentliche Routen (z. B. `/health`, `/api/auth/login`) haben kein `req.userContext` — dort dürfen keine Fehlerzugriffe entstehen. Optional-Chaining (`?.`) ist zwingend.
- `login_failed` loggt `attemptedUsername` aus dem validierten Input, nicht aus dem rohen Request-Body. Die Validierung läuft vor dem Logging-Aufruf.
- Der Benutzername im Auth-Log dient nur der Nachvollziehbarkeit, nicht der Authentifizierung — kein Sicherheitsproblem.
- `displayName` in `RequestUserContext` ist der vollständige Name oder der Username (bereits in `resolveUserRole.ts` so gesetzt). Kein weiterer Lookup nötig.

---

## Seiteneffekte

- Das Format der Log-Einträge in `app-logs/*.log` und `app-logs/error.log` ändert sich für authentifizierte Requests. Bestehende Log-Auswertungs-Skripte, falls vorhanden, müssen das neue optionale Feld kennen.
- `app-logs/auth.log` bekommt zusätzliche Felder — abwärtskompatibel, da das Format JSON ist.
- Keine Datenbankänderungen, keine Migrationen, kein Schema-Eingriff.

---

## Testanforderungen

- Vorhandene Unit- und Integrationstests für `authController` prüfen, ob sie nach der Änderung noch laufen — ggf. erwartete Log-Meldungen in Mocks anpassen.
- Manueller Smoke-Test nach der Änderung:
  - Login mit gültigem Benutzer → `auth.log` enthält `userId` + `userName`
  - Login mit falschem Passwort → `auth.log` enthält `attemptedUsername`
  - Authentifizierter API-Request → Tageslog enthält `userId` + `userName` im `http_request`-Eintrag
  - Unauthentifizierter Request → kein `userId`-Feld im Log-Eintrag

---

## Abnahmekriterien

1. Ein erfolgreicher Login produziert in `auth.log` einen Eintrag mit `userId` **und** `userName` — beides als nicht-null Werte.
2. Ein fehlgeschlagener Login produziert in `auth.log` einen Eintrag mit `attemptedUsername` (dem eingegebenen Benutzernamen).
3. Jeder authentifizierte HTTP-Request erzeugt im Tageslog einen `http_request`-Eintrag mit `userId` und `userName`.
4. Unauthentifizierte Requests (401) enthalten **keine** `userId`- oder `userName`-Felder im Log.
5. Ein 500-Fehler auf einer authentifizierten Route enthält im `error.log` die `userId` und den `userName` des auslösenden Benutzers.
6. Der Server startet fehlerfrei und die bestehende Test-Suite läuft durch.
