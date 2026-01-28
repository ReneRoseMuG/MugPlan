# FT 15 - Projektstatusverwaltung

## Implementierungsdatum
28. Januar 2026

## Übersicht
Verwaltung von Projektstatus als Stammdaten im Administration-Bereich. Ermöglicht das Erstellen, Bearbeiten, Aktivieren/Deaktivieren und Löschen von Projektstatus mit farblicher Kennzeichnung.

## Datenbank-Schema

### Tabelle: project_status
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| id | bigserial | Primary Key |
| title | text | Statusname (Pflichtfeld) |
| description | text | Optionale Beschreibung |
| color | text | Hex-Farbwert für visuelle Kennzeichnung |
| sort_order | integer | Sortierreihenfolge (Standard: 0) |
| is_active | boolean | Aktiv/Inaktiv-Status (Standard: true) |
| is_default | boolean | Default-Status-Flag (Standard: false) |
| created_at | timestamp | Erstellungszeitpunkt |
| updated_at | timestamp | Letzter Änderungszeitpunkt |

### Tabelle: project_project_status (Junction-Table)
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| project_id | bigserial | Referenz auf Projekt |
| project_status_id | bigserial | Referenz auf Projektstatus |
| assigned_at | timestamp | Zuweisungszeitpunkt |

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /api/project-status | Liste aller Status (Query: active=all/active/inactive) |
| GET | /api/project-status/:id | Einzelnen Status abrufen |
| POST | /api/project-status | Neuen Status erstellen |
| PUT | /api/project-status/:id | Status aktualisieren |
| PATCH | /api/project-status/:id/active | Aktiv-Status umschalten |
| DELETE | /api/project-status/:id | Status löschen |

## Schutzlogik

### Default-Status
- Kann nicht gelöscht werden
- Kann nicht deaktiviert werden (weder über PUT noch PATCH)
- Wird mit Schild-Icon gekennzeichnet

### In-Verwendung-Status
- Status, die über project_project_status einem Projekt zugeordnet sind, können nicht gelöscht werden
- Fehlermeldung: "Status wird verwendet und kann nicht gelöscht werden"

## Sortierung
Die Status werden nach folgender Reihenfolge sortiert:
1. sort_order ASC (aufsteigend)
2. title ASC (alphabetisch)
3. id ASC (Erstellungsreihenfolge)

## UI-Komponenten

### ProjectStatusPage.tsx
- Verwendet CardListLayout für konsistentes Layout
- EntityCard für einzelne Status-Karten
- Farbauswahl aus vordefinierten Pastellfarben
- Doppelklick auf Karte öffnet Bearbeiten-Dialog

### Funktionen
- Neuer Status: Dialog mit Titel, Beschreibung, Farbe, Sortierreihenfolge
- Bearbeiten: Doppelklick oder Stift-Icon
- Aktivieren/Deaktivieren: Power-Icon (nicht für Default-Status)
- Löschen: X-Icon mit Bestätigungsdialog (nicht für Default/In-Verwendung)

## Geänderte Dateien

### Backend
- `shared/schema.ts` - Tabellendefinitionen und Typen
- `shared/routes.ts` - API-Routen-Definitionen
- `server/storage.ts` - CRUD-Methoden mit Schutzlogik
- `server/routes.ts` - Express-Route-Handler

### Frontend
- `client/src/components/ProjectStatusPage.tsx` - Admin-UI
- `client/src/components/ui/entity-card.tsx` - onDoubleClick-Prop hinzugefügt
- `client/src/pages/Home.tsx` - Integration der ProjectStatusPage

### Dokumentation
- `replit.md` - Aktualisiert mit FT 15 Änderungen

## Tests
- End-to-End-Tests mit Playwright durchgeführt
- Alle CRUD-Operationen verifiziert
- Schutzlogik für Default-Status getestet
- Doppelklick-Funktionalität getestet

## Commits
- `3a42f77` - Add functionality to manage project statuses and their properties
- `c734130` - Add project status management functionality to the administration area
- `3decb54` - Add double-click functionality to edit status cards
