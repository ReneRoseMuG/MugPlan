# Log: Kalenderwochen-Notizen – Datenmodell, API und Infrastruktur

**Datum:** 2026-03-25
**Branch:** implement-week-notes

---

## Zweck

Einführung der neuen Join-Tabelle `calendar_week_note` und serverseitiger CRUD-Endpunkte für Kalenderwochen-Notizen nach dem Muster der bestehenden Parent-Kontexte (project, customer, appointment).

---

## Scope

Neue Tabelle mit Schema und Constraints, Repository-Funktionen, Service, Controller, Routes, shared/routes-Einträge und Integrationstests.

---

## Neue Tabelle

**`calendar_week_note`**

| Spalte | Typ | Constraints |
|---|---|---|
| id | bigint | AUTO_INCREMENT, PRIMARY KEY |
| note_id | bigint | NOT NULL, FK auf `note.id` ON DELETE CASCADE |
| year_number | int | NOT NULL |
| week_number | int | NOT NULL |
| version | int | NOT NULL, DEFAULT 1 |
| created_at | timestamp | NOT NULL, DEFAULT now() |
| updated_at | timestamp | NOT NULL, DEFAULT now() ON UPDATE now() |

Constraints:
- `uq_cwn_note_week` UNIQUE (note_id, year_number, week_number)
- `chk_cwn_week_valid` CHECK (week_number >= 1 AND week_number <= 53)
- `idx_cwn_year_week` INDEX (year_number, week_number)

---

## Neue API-Endpunkte

```
GET    /api/calendar-weeks/:yearNumber/:weekNumber/notes
POST   /api/calendar-weeks/:yearNumber/:weekNumber/notes
DELETE /api/calendar-weeks/:yearNumber/:weekNumber/notes/:noteId
```

Rollenregeln:
- POST und DELETE: Nutzer mit Rolle `READER` erhalten 403.
- week_number außerhalb 1–53 wird mit 422 abgewiesen.

---

## Geänderte und neue Dateien

**Neu:**
- `migrations/0015_calendar_week_notes.sql`
- `server/services/calendarWeekNotesService.ts`
- `server/controllers/calendarWeekNotesController.ts`
- `server/routes/calendarWeekNotesRoutes.ts`
- `tests/integration/server/calendar-week-notes.integration.test.ts`
- `logs/2026-03-25_calendar-week-notes-infra.md`

**Geändert:**
- `shared/schema.ts` — `calendarWeekNotes`-Tabelle, Typen
- `shared/routes.ts` — `calendarWeekNotes`-Routen-Definitionen
- `server/repositories/notesRepository.ts` — drei neue Funktionen, `deleteNoteWithVersion` um calendarWeekNotes-Bereinigung ergänzt
- `server/services/notesService.ts` — `deleteCalendarWeekScopedNote` ergänzt
- `server/routes.ts` — `calendarWeekNotesRoutes` registriert
- `docs/TEST_MATRIX.md` — neuer Eintrag

---

## Hinweis

UI-Anbindung und Druckanbindung folgen in einer separaten Aufgabe.

---

## Bekannte Einschränkungen

Keine. Die serverseitige Infrastruktur ist vollständig.
