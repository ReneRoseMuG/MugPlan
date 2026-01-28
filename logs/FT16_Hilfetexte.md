# FT 16: Hilfetexte verwalten

**Datum**: 28.01.2026
**Status**: Implementiert

## Übersicht

Implementierung einer Verwaltungsoberfläche für Hilfetexte, die über einen eindeutigen `help_key` im UI ansprechbar sind. Rich-Text-Formatierung wird für den Inhalt unterstützt.

## Datenbank-Schema

```typescript
// shared/schema.ts
export const helpTexts = pgTable("help_texts", {
  id: serial("id").primaryKey(),
  helpKey: text("help_key").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull().default(''),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /api/help-texts/key/:helpKey | Holt Hilfetext über help_key (nur aktive) |
| GET | /api/help-texts | Listet alle Hilfetexte (mit optionalem query-Parameter) |
| GET | /api/help-texts/:id | Holt Hilfetext über ID |
| POST | /api/help-texts | Erstellt neuen Hilfetext |
| PUT | /api/help-texts/:id | Aktualisiert Hilfetext |
| PATCH | /api/help-texts/:id/active | Schaltet isActive um |
| DELETE | /api/help-texts/:id | Löscht Hilfetext |

### Duplikat-Behandlung (409 Conflict)
- CREATE: Gibt 409 zurück, wenn help_key bereits existiert
- UPDATE: Gibt 409 zurück, wenn help_key auf einen bereits verwendeten Wert geändert wird

### Suche
- Query-Parameter `?query=...` sucht in help_key und title (case-insensitive)

## UI-Komponenten

### HelpTextsPage.tsx
- Verwendet CardListLayout für konsistentes Layout
- Suchfeld im Toolbar für Filterung nach Schlüssel/Titel
- HelpTextCard mit:
  - help_key in Code-Formatierung
  - Titel
  - Body-Vorschau (HTML)
  - Aktualisierungsdatum
  - Edit (Stift) und Delete (X) Buttons
  - Doppelklick öffnet Bearbeiten-Dialog
- Dialog für Neu/Bearbeiten:
  - Hilfe-Schlüssel (font-mono Input)
  - Titel
  - RichTextEditor für Inhalt
  - Aktiv-Checkbox

### Sidebar Integration
- Neuer NavButton "Hilfetexte" im Administration-Bereich
- Icon: HelpCircle

## Architektur-Entscheidungen

1. **HTML für Body**: RichTextEditor speichert HTML-formatierten Text
2. **Unique help_key**: Eindeutiger Schlüssel für UI-Integration
3. **Suche in Storage**: SQL LIKE-Suche auf help_key und title
4. **Sortierung**: Alphabetisch nach help_key (ASC)

## Test-Ergebnisse

- CRUD-Operationen funktionieren
- Duplikat-Erkennung (409) funktioniert
- Suche funktioniert
- Double-Click-Edit funktioniert
- Rich-Text-Editor funktioniert

## Dateien

- `shared/schema.ts` - Datenbank-Schema
- `shared/routes.ts` - API-Routen-Definition
- `server/storage.ts` - Storage-Implementierung
- `server/routes.ts` - Route-Handler
- `client/src/components/HelpTextsPage.tsx` - Admin-UI
- `client/src/components/Sidebar.tsx` - Navigation
- `client/src/pages/Home.tsx` - View-Integration
