# FT 02 - Projektverwaltung

## Implementierungsdatum
28. Januar 2026

## Übersicht
Vollständige Projektverwaltung mit Datenbankanbindung. Projekte werden Kunden zugeordnet und können Status, Notizen und Anhänge haben.

## Datenbankschema

### Tabelle: projects
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | serial | Primärschlüssel |
| name | text | Projektname (Pflicht) |
| customer_id | integer | FK zu customers (Pflicht) |
| description_md | text | Beschreibung (Markdown/HTML) |
| is_active | boolean | Aktiv-Status (default: true) |
| created_at | timestamp | Erstellungszeitpunkt |
| updated_at | timestamp | Aktualisierungszeitpunkt |

### Tabelle: project_note (Junction Table)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| project_id | integer | FK zu projects |
| note_id | integer | FK zu notes |
| Primary Key | composite | (project_id, note_id) |

### Tabelle: project_attachments
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | serial | Primärschlüssel |
| project_id | integer | FK zu projects |
| filename | text | Eindeutiger Dateiname |
| original_name | text | Originaler Dateiname |
| mime_type | text | MIME-Typ der Datei |
| file_size | integer | Dateigröße in Bytes |
| storage_path | text | Speicherpfad |
| created_at | timestamp | Erstellungszeitpunkt |

### Tabelle: project_project_status (Junction Table)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| project_id | integer | FK zu projects |
| project_status_id | integer | FK zu project_status |
| created_at | timestamp | Erstellungszeitpunkt |
| Primary Key | composite | (project_id, project_status_id) |

## API-Endpunkte

### Projekte
- `GET /api/projects` - Liste aller Projekte (mit Filter: active, inactive, all)
- `GET /api/projects/:id` - Projekt mit Kundendaten
- `POST /api/projects` - Neues Projekt erstellen
- `PATCH /api/projects/:id` - Projekt aktualisieren
- `DELETE /api/projects/:id` - Projekt löschen (mit Cascade)

### Projekt-Notizen
- `GET /api/projects/:projectId/notes` - Notizen eines Projekts
- `POST /api/projects/:projectId/notes` - Notiz zu Projekt hinzufügen

### Projekt-Anhänge
- `GET /api/projects/:projectId/attachments` - Anhänge eines Projekts
- `DELETE /api/project-attachments/:id` - Anhang löschen

### Projekt-Status-Relationen
- `GET /api/projects/:projectId/statuses` - Zugewiesene Status
- `POST /api/projects/:projectId/statuses` - Status hinzufügen
- `DELETE /api/projects/:projectId/statuses/:statusId` - Status entfernen

## UI-Komponenten

### ProjectList.tsx
- Verwendet CardListLayout + EntityCard Pattern
- Grid mit 3 Spalten
- Zeigt Projektname, Kunde, PLZ/Ort, Beschreibung
- Doppelklick oder Edit-Button öffnet Formular
- "Neues Projekt" Button im Footer

### ProjectForm.tsx
- Formular für Projekt-CRUD
- Pflichtfelder: Projektname, Kunde
- Kundenauswahl über Dialog
- RichText-Beschreibung
- Nur bei Bearbeitung sichtbar:
  - ProjectStatusSection (Status zuweisen)
  - NotesSection (Notizen verwalten)
  - Dokumente-Bereich (Anhänge)
  - Termine-Bereich (Demo)

### ProjectStatusSection.tsx
- Sub-Panel mit + Button
- Liste zugewiesener Status mit X zum Entfernen
- Dialog zur Auswahl verfügbarer Status
- 4px farbiger Balken links für jeden Status

## Cascade Delete Logik
Beim Löschen eines Projekts werden automatisch gelöscht:
- Alle zugehörigen Notizen (via project_note Junction)
- Alle zugehörigen Anhänge (project_attachments)
- Alle Status-Zuordnungen (project_project_status)

## Design-Entscheidungen
- customer_id ist Pflichtfeld (onDelete: "restrict")
- Projekte können mehrere Status haben (many-to-many)
- Status-Entfernung löscht nur Relation, nicht den Status selbst
- Notizen/Status/Anhänge nur bei Bearbeitung sichtbar (nicht bei Neuanlage)
- Sub-Panel CSS-Klasse für konsistentes Styling

## Hinweise
- Datei-Upload noch nicht implementiert (UI vorbereitet)
- Termine-Bereich zeigt Demo-Daten
