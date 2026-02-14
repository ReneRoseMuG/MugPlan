# Log: Strukturabsicherung & Schema-Synchronisierung

Datum: 2026-02-14

## Ziel
- Ungenutzte Legacy-Repository-Methoden entfernen.
- `shared/schema.ts` mit der aktuellen DB-`version`-Struktur synchronisieren.
- Typdisziplin (`version` verpflichtend) verifizieren.

## 1) Entfernte Legacy-Methoden
Datei: `server/repositories/appointmentsRepository.ts`
- Entfernt: `updateAppointment(...)` (unversionierter Legacy-Write, ungenutzt)
- Entfernt: `deleteAppointment(...)` (unversionierter Legacy-Delete, ungenutzt)

## 2) Verbleibende Legacy-Ausnahmen (bewusst, wegen Ausschluss Demo/Seed)
Datei: `server/repositories/employeesRepository.ts`
- `setEmployeeTour(...)`
- `setEmployeeTeam(...)`

Begründung:
- Beide werden weiterhin von `server/services/demoSeedService.ts` verwendet.
- Auftrag enthält Ausschluss: keine Demo/Seed-Änderungen.

## 3) Schema-Synchronisierung (`shared/schema.ts`)
Folgende Tabellen wurden um `version: int("version").notNull().default(1)` ergänzt:
- `customer`
- `tours`
- `teams`
- `roles`
- `users`
- `note`
- `note_template`
- `customer_note`
- `project`
- `project_note`
- `project_attachment`
- `customer_attachment`
- `appointments`
- `project_status`
- `project_project_status`
- `employee`
- `employee_attachment`
- `appointment_employee`
- `help_texts`
- `user_settings_value`

## 4) Typ-Disziplin / Contracts
- Suche nach optionalen Versionsparametern (`version?`) in `server/` und `shared/`: kein Treffer.
- Build/Type-Safety bleibt intakt.

## 5) Verifikation
- `npm run typecheck`: erfolgreich
- `npm run build`: erfolgreich

## 6) Ergebnisbewertung
- Ungenutzte unversionierte Appointment-Legacy-Methoden entfernt.
- Schema ist bzgl. `version` auf die aktuelle DB-Struktur synchronisiert.
- Aufgrund des Demo/Seed-Ausschlusses verbleiben zwei unversionierte Demo-Helper in `employeesRepository`.
