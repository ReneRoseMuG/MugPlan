# FT 13 - Notizverwaltung Implementation Log

**Datum**: 27.01.2026  
**Feature**: Kundenbezogene Notizverwaltung mit Pin-Funktion und Vorlagen

## Übersicht

Implementierung eines vollständigen Notizensystems für Kunden mit:
- CRUD-Operationen für Notizen
- Pin-Funktion zum Anheften wichtiger Notizen
- Automatische Sortierung (gepinnt zuerst, dann nach Aktualisierungsdatum)
- RichText-Editor für formatierten Inhalt

## Datenbankschema

### Tabellen (shared/schema.ts)

```typescript
// note - Haupttabelle für alle Notizen
note:
  - id: serial (PK)
  - title: text (Pflichtfeld)
  - body: text (optional, HTML-Inhalt)
  - isPinned: boolean (default: false)
  - createdAt: timestamp
  - updatedAt: timestamp

// note_template - Vorlagen für häufig verwendete Notizen
note_template:
  - id: serial (PK)
  - title: text
  - body: text
  - sortOrder: integer (default: 0)
  - isActive: boolean (default: true)
  - createdAt: timestamp

// customer_note - Junction-Tabelle für Kunden-Notiz-Relation
customer_note:
  - id: serial (PK)
  - customerId: integer (FK → customer)
  - noteId: integer (FK → note, CASCADE DELETE)
  - createdAt: timestamp
```

## API-Endpunkte (shared/routes.ts, server/routes.ts)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /api/customers/:customerId/notes | Notizen eines Kunden abrufen |
| POST | /api/customers/:customerId/notes | Neue Notiz erstellen |
| DELETE | /api/customers/:customerId/notes/:noteId | Notiz löschen |
| PUT | /api/notes/:noteId | Notiz aktualisieren |
| PATCH | /api/notes/:noteId/pin | Pin-Status umschalten |
| GET | /api/note-templates | Vorlagen abrufen |
| POST | /api/note-templates | Neue Vorlage erstellen |

## Storage-Repository (server/storage.ts)

Neue IStorage-Methoden:
- `getCustomerNotes(customerId)` - Mit Sortierung: isPinned DESC, updatedAt DESC
- `createCustomerNote(customerId, note)` - Erstellt Note + Junction-Eintrag
- `updateNote(noteId, data)` - Aktualisiert Notiz mit neuem updatedAt
- `toggleNotePin(noteId, isPinned)` - Setzt Pin-Status
- `deleteNote(noteId)` - Löscht Notiz (CASCADE löscht Junction)
- `getNoteTemplates(activeOnly?)` - Vorlagen mit optionalem Aktiv-Filter
- `getNoteTemplate(id)` - Einzelne Vorlage
- `createNoteTemplate(template)` - Neue Vorlage erstellen

## Frontend-Komponenten

### NotesSection.tsx
- Refactored von Demo-Daten zu API-Integration
- Unterstützt: title (Pflichtfeld), body (RichText), isPinned
- Pin-Button mit visueller Anzeige
- Ladeindikator während API-Calls
- Responsive Layout mit max-height Scrollbereich

### CustomerData.tsx
- React Query für Notizen-Laden: `/api/customers/${customerId}/notes`
- Mutations für Create, Delete, TogglePin
- Cache-Invalidierung nach Mutationen
- Notizen nur im Edit-Modus sichtbar

### RichTextEditor.tsx
- RTL-Bug behoben mit `dir="ltr"` und `unicodeBidi: plaintext`
- ContentEditable mit document.execCommand
- Formatierungsoptionen: Bold, Italic, Underline, Farben, Listen, Ausrichtung

## Design-Entscheidungen

1. **Titel ist Pflichtfeld**: Laut Schema und für bessere Übersichtlichkeit
2. **Sortierung im Backend**: Konsistente Reihenfolge über alle Clients
3. **Soft-Delete nicht implementiert**: Notizen werden hart gelöscht (anders als Kunden)
4. **Junction-Table**: Ermöglicht spätere Erweiterung für Projekt-Notizen
5. **Keine Demo-Daten**: Gemäß User-Anforderung

## Tests

E2E-Test erfolgreich durchgeführt:
- Notiz erstellen mit Titel
- Notiz anpinnen
- Notiz löschen
- API-Responses validiert (200/201/204)

## Bekannte Einschränkungen

- Vorlagen-UI noch nicht implementiert (nur API bereit)
- Projekt-Notizen noch nicht implementiert (Schema bereit)
- Notiz-Bearbeitung (Update) UI noch nicht implementiert
