# NFR-01 Analysebericht (aktualisiert)

Datum: 2026-02-14
Scope: Backend-Analyse (Controller/Service/Repository/Routes), keine Codeänderung in diesem Schritt.
Referenz: `docs/NFR-01 Multi-User-Konsistenz.md`

## Gesamtbewertung
NFR-01 ist **weitgehend umgesetzt**, aber **formal noch nicht vollständig erfüllt**.

## Verbesserungen seit letzter Analyse
1. Entfernte unversionierte Appointment-Legacy-Methoden:
- `server/repositories/appointmentsRepository.ts`:
  - `updateAppointment(...)` entfernt
  - `deleteAppointment(...)` entfernt

2. Schema-Synchronisierung erfolgt:
- `shared/schema.ts` enthält jetzt durchgängig `version: int("version").notNull().default(1)` für die relevanten Kern-/Join-Tabellen, z. B.:
  - `customer` (`shared/schema.ts:20`)
  - `appointments` (`shared/schema.ts:286`)
  - `project_project_status` (`shared/schema.ts:331`)
  - `user_settings_value` (`shared/schema.ts:473`)

## Aktuelle positive Befunde
- Atomare Versionierung in produktiven Mutationen vorhanden (`WHERE ... AND version = ...` + `version = version + 1`), z. B.:
  - `server/repositories/customersRepository.ts:67`
  - `server/repositories/projectsRepository.ts:153`
  - `server/repositories/usersRepository.ts:137`
  - `server/repositories/appointmentsRepository.ts:174`
- 404/409-Differenzierung in Services etabliert (Exists-Check nach `version_conflict`), z. B.:
  - `server/services/projectsService.ts`
  - `server/services/notesService.ts`
  - `server/services/usersService.ts`
- Mehrtabellenoperationen transaktional abgesichert in zentralen Pfaden, z. B.:
  - `server/repositories/projectsRepository.ts:171`
  - `server/repositories/notesRepository.ts:109`

## Verbleibende Lücken / Restrisiken

### 1) Verbleibende unversionierte Repository-Writes (Demo-Ausnahme)
- `server/repositories/employeesRepository.ts:127` `setEmployeeTour(...)`
- `server/repositories/employeesRepository.ts:158` `setEmployeeTeam(...)`
- Diese werden aktiv von `server/services/demoSeedService.ts:1123` und `server/services/demoSeedService.ts:1125` genutzt.

Bewertung:
- Technisch existiert damit weiterhin ein Write-Pfad ohne Optimistic Locking.
- Wenn Demo/Seed strikt aus NFR-Scope ausgenommen ist, ist das akzeptabel; bei strikt globaler NFR-Auslegung bleibt es eine Lücke.

### 2) Mutierende Admin/Demo-REST-Endpunkte ohne Versionsvertrag
- `shared/routes.ts:1198` `POST /api/admin/demo-seed-runs`
- `shared/routes.ts:1358` `DELETE /api/admin/demo-seed-runs/:seedRunId`
- `shared/routes.ts:1389` `POST /api/admin/reset-database`

Bewertung:
- Laut NFR-Text („alle mutierenden REST-Endpoints“) sind diese nicht versioniert und damit formal nicht vollständig NFR-konform.

### 3) Fehlercode-Namensabweichung zur NFR-Doku
- NFR-Doku fordert `BUSINESS_RULE_CONFLICT` (`docs/NFR-01 Multi-User-Konsistenz.md:82`)
- Implementierung verwendet `BUSINESS_CONFLICT` (z. B. `shared/routes.ts:230`, `server/controllers/projectStatusController.ts:43`)

### 4) Testpflicht aus NFR nicht erfüllt
- Im Anwendungscode keine eigenen `.test/.spec`-Dateien gefunden (`NO_APP_TEST_FILES`).
- Geforderte Concurrency-/Version-Konflikttests laut NFR sind damit nicht nachweisbar.

## Abschlussfazit
- **Operativ**: Produktive Kernmutationen sind weitgehend konfliktstabil umgesetzt.
- **Formal nach NFR-01-Text**: noch **nicht vollständig erfüllt**, v. a. wegen
  1) fehlender Testabdeckung,
  2) verbleibender Demo/Admin-Mutationspfade ohne Versionierung,
  3) kleiner Fehlercode-Namensabweichung (`BUSINESS_RULE_CONFLICT` vs. `BUSINESS_CONFLICT`).
