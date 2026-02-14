# 2026-02-14 – Minimal-Resthärtung Repository-Legacy entfernen

## Ziel
Entfernung unversionierter Repository-Mutationsmethoden (UPDATE/DELETE ohne verpflichtende Version) zur weiteren NFR-01-Härtung.

## Umsetzung

### Entfernte unversionierte Repository-Methoden
- `server/repositories/customersRepository.ts`
  - `updateCustomer`
- `server/repositories/employeesRepository.ts`
  - `updateEmployee`
  - `toggleEmployeeActive`
- `server/repositories/helpTextsRepository.ts`
  - `updateHelpText`
  - `toggleHelpTextActive`
  - `deleteHelpText`
- `server/repositories/notesRepository.ts`
  - `updateNote`
  - `toggleNotePin`
  - `deleteNote`
  - `deleteProjectNoteRelation`
- `server/repositories/noteTemplatesRepository.ts`
  - `updateNoteTemplate`
  - `deleteNoteTemplate`
- `server/repositories/projectsRepository.ts`
  - `updateProject`
  - `deleteProject`
  - `deleteProjectAttachment`
- `server/repositories/projectStatusRepository.ts`
  - `updateProjectStatus`
  - `toggleProjectStatusActive`
  - `deleteProjectStatus`
  - `removeProjectStatus`
  - `removeProjectStatusRelationsForProject`
- `server/repositories/teamsRepository.ts`
  - `updateTeam`
  - `deleteTeam`
- `server/repositories/toursRepository.ts`
  - `updateTour`
  - `deleteTour`
- `server/repositories/usersRepository.ts`
  - `updateUserRoleById`
- `server/repositories/userSettingsRepository.ts`
  - `upsertSettingValue`

### Weitere Bereinigungen
- `server/services/projectStatusService.ts`
  - `removeProjectStatusesForProject` entfernt (war nur auf entfernte Legacy-Repo-Methode gemappt)
- `server/services/projectAttachmentsService.ts`
  - `deleteProjectAttachment` entfernt
- `server/storage.ts`
  - `deleteProjectAttachment`-Bypass entfernt

## Verbleibende Ausnahme (Scope-bedingt)
Gemäß Ausschluss „Keine Demo/Seed-Änderungen“ konnten zwei unversionierte Methoden nicht final entfernt werden, da sie direkt vom Demo-Seed-Flow genutzt werden:
- `server/repositories/employeesRepository.ts`
  - `setEmployeeTour`
  - `setEmployeeTeam`

Diese beiden Methoden wurden als technische Ausnahme beibehalten, um Build-/Typecheck-Stabilität ohne Demo/Seed-Anpassungen sicherzustellen.

## Verifikation
- `npm run typecheck` erfolgreich
- `npm run build` erfolgreich
- Repository-Suchlauf zeigt außerhalb der ausgeschlossenen Bereiche nur versionierte Mutationsmethoden (`...WithVersion`) plus die genannte Demo/Seed-Ausnahme.

## Fazit
Die Legacy-Bereinigung ist weitgehend umgesetzt. Vollständige Eliminierung aller unversionierten Repository-Writes erfordert eine explizite Freigabe zur Anpassung von Demo/Seed (`demoSeedService`).
