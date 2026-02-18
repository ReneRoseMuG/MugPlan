# PKG-02 Testliste

## Ziel von PKG-02
PKG-02 sichert zwei P0-Bereiche ab:

1. Lock-Regeln fuer Appointments (Mutationen auf gesperrten Entitaeten).
2. Sicherheits-Guards beim Test-DB-Reset (nur im sicheren Testkontext).

Alle Faelle in diesem Paket sind Unit-Tests.

## Abdeckungsuebersicht
- Datei `tests/unit/invariants/lockingRules.test.ts`: 4 Tests
- Datei `tests/unit/invariants/resetDatabaseGuard.test.ts`: 3 Tests
- Gesamt: 7 Tests

## Datei `tests/unit/invariants/lockingRules.test.ts`

### 1) `blocks update for non-admin on locked appointment with deterministic LOCK_VIOLATION`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Ein bestehender Termin mit Startdatum in der Vergangenheit (damit `isStartDateLocked` true wird).
  - Benutzerrolle ist nicht `ADMIN` (`DISPONENT`).
- When:
  - Update wird ausgefuehrt.
- Then:
  - Fehler `status = 403`, `code = LOCK_VIOLATION`.
  - Kein Schreibaufruf (`updateAppointmentWithVersionTx`) wird ausgefuehrt.
- Kontext:
  - Dieser Test beweist die zentrale Sperrregel: historisierte/gesperrte Termine sind fuer Nicht-Admins unveraenderbar.

### 2) `blocks delete for non-admin on locked appointment with deterministic LOCK_VIOLATION`
- Service/Funktion: `appointmentsService.deleteAppointment`
- Given:
  - Termin ist gesperrt (Vergangenheit), Benutzerrolle nicht `ADMIN`.
- When:
  - Delete wird ausgefuehrt.
- Then:
  - Fehler `status = 403`, `code = LOCK_VIOLATION`.
  - Kein Delete-Write (`deleteAppointmentWithVersionTx`) wird ausgefuehrt.
- Kontext:
  - Deletion muss dieselbe Sperrlogik haben wie Update, sonst waere ein Lock umgehbar.

### 3) `allows admin update on locked appointment and proceeds to optimistic-lock update path`
- Service/Funktion: `appointmentsService.updateAppointment`
- Given:
  - Termin ist gesperrt (Vergangenheit), Rolle ist `ADMIN`.
  - Kein Overlap und Versioning meldet `updated`.
- When:
  - Update wird ausgefuehrt.
- Then:
  - Update ist erfolgreich, Write-Pfad wird ausgefuehrt.
- Kontext:
  - Admin darf in diesem System gesperrte Termine korrigieren; das muss explizit abgesichert sein.

### 4) `allows admin delete on locked appointment`
- Service/Funktion: `appointmentsService.deleteAppointment`
- Given:
  - Gesperrter Termin, Rolle `ADMIN`, Repository meldet `deleted`.
- When:
  - Delete wird ausgefuehrt.
- Then:
  - Erfolg, Delete-Write wurde ausgefuehrt.
- Kontext:
  - Ergaenzt die Admin-Ausnahme vollstaendig fuer beide Mutationsarten (Update + Delete).

## Datei `tests/unit/invariants/resetDatabaseGuard.test.ts`

### 5) `throws when NODE_ENV is not test`
- Service/Funktion: `tests/helpers/resetDatabase` (Import-Guard)
- Given:
  - `NODE_ENV = development`, DB-URL zeigt auf Test-DB.
- When:
  - Modul wird importiert.
- Then:
  - Fehler: Reset nur im Testmodus erlaubt.
  - Keine DB-Verbindung wird aufgebaut.
- Kontext:
  - Verhindert versehentlichen Datenverlust in lokalen/dev/prod-Kontexten.

### 6) `throws when MYSQL_DATABASE_URL is not a test database`
- Service/Funktion: `tests/helpers/resetDatabase` (Import-Guard)
- Given:
  - `NODE_ENV = test`, aber DB-URL ohne `mugplan_test`.
- When:
  - Modul wird importiert.
- Then:
  - Fehler: Reset verweigert bei Nicht-Test-DB.
  - Keine DB-Verbindung wird aufgebaut.
- Kontext:
  - Zweite Schutzschicht gegen falsche Umgebung trotz Testmodus.

### 7) `does not execute database actions when environment is invalid`
- Service/Funktion: `tests/helpers/resetDatabase` (Import-Guard)
- Given:
  - Umfeld eindeutig ungueltig (`NODE_ENV = production`, Nicht-Test-DB).
- When:
  - Modul wird importiert.
- Then:
  - Import bricht mit Fehler ab.
  - `dotenv.config({ path: ".env.test" })` wird zwar aufgerufen, aber DB-Verbindung bleibt aus.
- Kontext:
  - Belegt, dass bei Guard-Verletzung keine impliziten Seiteneffekte Richtung Datenbank auftreten.

## Warum diese Tests wichtig sind
- Locking-Regeln schuetzen Datenkonsistenz und fachliche Prozessregeln.
- Reset-Guards schuetzen vor kritischen Fehlbedienungen in nicht-testenden Umgebungen.
- Beide Bereiche sind Sicherheits-/Integritaetsanforderungen und damit P0-relevant.
