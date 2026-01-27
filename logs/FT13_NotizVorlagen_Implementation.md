# FT 13 - Notiz-Vorlagen-Verwaltung

## Datum: 27. Januar 2026

## Übersicht
Implementierung der Notiz-Vorlagen-Verwaltung im neuen Administration-Bereich. Ermöglicht das Erstellen, Bearbeiten und Löschen von Vorlagen für Kundennotizen.

## Änderungen

### 1. Sidebar-Umstrukturierung (client/src/components/Sidebar.tsx)

**Terminplanung - Entfernte Items:**
- Auslastungsübersicht
- Touren Übersicht  
- Mitarbeiter Übersicht

**Umbenennung:**
- "Monitoring & Backup" → "Administration"

**Neue Items in Administration:**
- Notiz Vorlagen (mit Navigation zu noteTemplates-View)
- Projekt Status (mit Navigation zu projectStatus-View)
- Einstellungen (Platzhalter ohne Funktion)

### 2. ViewType-Erweiterung (client/src/pages/Home.tsx)
```typescript
export type ViewType = '...' | 'noteTemplates' | 'projectStatus';
```

### 3. Schema-Erweiterung (shared/schema.ts)
```typescript
export const updateNoteTemplateSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateNoteTemplate = z.infer<typeof updateNoteTemplateSchema>;
```

### 4. API-Endpunkte (shared/routes.ts, server/routes.ts)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /api/note-templates?active=false | Alle Vorlagen (inkl. inaktive) |
| POST | /api/note-templates | Neue Vorlage erstellen |
| PUT | /api/note-templates/:id | Vorlage aktualisieren |
| DELETE | /api/note-templates/:id | Vorlage löschen |

### 5. Storage-Erweiterung (server/storage.ts)

**Neue Methoden im IStorage-Interface:**
```typescript
updateNoteTemplate(id: number, data: UpdateNoteTemplate): Promise<NoteTemplate | null>;
deleteNoteTemplate(id: number): Promise<void>;
```

### 6. NoteTemplatesPage-Komponente (client/src/components/NoteTemplatesPage.tsx)

**Features:**
- Grid-Layout mit Template-Karten (2 Spalten auf Desktop)
- Erstellen neuer Vorlagen via Dialog
- Bearbeiten bestehender Vorlagen
- Löschen mit Bestätigungsdialog
- Aktiv/Inaktiv-Status pro Vorlage
- RichText-Editor für Body
- Loading-States während API-Calls

**UI-Pattern:**
- Ähnliches Design wie NotesSection bei Kunden
- Button-Komponenten für Edit/Delete (kein custom Styling)
- Shadcn Dialog für Create/Edit
- React Query für Data Fetching

**Test-IDs:**
- button-new-template
- list-templates
- template-card-${id}
- button-edit-template-${id}
- button-delete-template-${id}
- input-template-title
- checkbox-template-active
- button-save-template
- button-cancel-template

## Datenbank

**Tabelle: note_template**
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | bigserial | Primärschlüssel |
| title | text | Titel (Pflichtfeld) |
| body | text | RichText-Inhalt |
| sort_order | integer | Sortierreihenfolge |
| is_active | boolean | Aktiv-Status |
| created_at | timestamp | Erstellungsdatum |
| updated_at | timestamp | Aktualisierungsdatum |

## Testing
- E2E-Test erfolgreich durchgeführt
- Vollständiger CRUD-Zyklus getestet
- Sidebar-Navigation verifiziert

## Architektur-Pattern
- Repository-Pattern mit IStorage-Interface
- React Query für Client-Side Caching
- Zod-Schemas für Validierung
- Drizzle ORM für Datenbankzugriff
