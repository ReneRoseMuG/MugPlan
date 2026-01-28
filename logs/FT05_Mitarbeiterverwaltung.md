# FT 05 - Mitarbeiterverwaltung (Employee Management)

## Datum: Januar 2026

## Übersicht
Vollständige Mitarbeiterverwaltung mit Datenbankanbindung, Tour- und Team-Zuweisungen.

## Implementierte Features

### Datenbank-Schema
- **employees** Tabelle:
  - `id` (serial primary key)
  - `name` (text, Pflichtfeld)
  - `is_active` (boolean, default true)
  - `team_id` (FK zu teams, nullable)
  - `tour_id` (FK zu tours, nullable)
  - `created_at`, `updated_at` (timestamps)

### API-Endpunkte

#### Employee CRUD
- `GET /api/employees` - Liste aller Mitarbeiter (mit ?active=all/true/false Filter)
- `GET /api/employees/:id` - Einzelner Mitarbeiter mit Team/Tour-Relations
- `POST /api/employees` - Neuen Mitarbeiter erstellen (nur name, team_id/tour_id verboten!)
- `PUT /api/employees/:id` - Mitarbeiter aktualisieren (nur name, team_id/tour_id verboten!)
- `PATCH /api/employees/:id/active` - Aktiv-Status ändern (read-only in UI)
- `GET /api/employees/:id/current-appointments` - Demo-Terminliste (Stub)

#### Tour-Mitarbeiter-Zuweisungen
- `GET /api/tours/:tourId/employees` - Mitarbeiter einer Tour
- `POST /api/tours/:tourId/employees` - Mitarbeiter zur Tour zuweisen (ersetzt alle)
- `DELETE /api/tours/employees/:employeeId` - Mitarbeiter aus Tour entfernen

#### Team-Mitarbeiter-Zuweisungen
- `GET /api/teams/:teamId/employees` - Mitarbeiter eines Teams
- `POST /api/teams/:teamId/employees` - Mitarbeiter zum Team zuweisen (ersetzt alle)
- `DELETE /api/teams/employees/:employeeId` - Mitarbeiter aus Team entfernen

### Validierungsregeln
- `team_id` und `tour_id` können NICHT über die Employee-API gesetzt/geändert werden
- Änderungen an Team/Tour-Zuweisungen nur über die jeweilige Verwaltung (Tour-/Team-Karten)
- 400 Error bei Versuch, team_id oder tour_id über Employee-Endpunkte zu setzen

### Frontend-Komponenten

#### EmployeePage (`client/src/components/EmployeePage.tsx`)
- CardListLayout mit 3-Spalten-Grid
- EntityCard für jeden Mitarbeiter
- Team-Badge (blau) und Tour-Badge (grün) in Karten
- Create/Edit-Dialoge für Name (nur Name editierbar)
- Aktiv-Status als read-only Badge
- Detail-Dialog mit "Aktuelle Termine" (Demo-Daten)

#### TourManagement (aktualisiert)
- Echte Mitarbeiter-Daten aus Datenbank statt Demo-Daten
- X-Button zum Entfernen einzelner Mitarbeiter (on hover)
- Edit-Dialog zeigt nur aktive Mitarbeiter
- Mitarbeiter in anderen Touren ausgegraut

#### TeamManagement (aktualisiert)
- Echte Mitarbeiter-Daten aus Datenbank statt Demo-Daten
- X-Button zum Entfernen einzelner Mitarbeiter (on hover)
- Edit-Dialog zeigt nur aktive Mitarbeiter
- Mitarbeiter in anderen Teams ausgegraut

## Architektur-Entscheidungen

### Zuweisungs-Logik
- Mitarbeiter können nur EINEM Team und EINER Tour zugewiesen sein
- Zuweisung erfolgt ausschließlich über Tour-/Team-Verwaltung
- Bei Löschen einer Tour/Team wird die Zuweisung automatisch aufgehoben

### UI-Patterns
- Konsistentes CardListLayout für alle Verwaltungsseiten
- EntityCard mit farbigem Header für visuelle Unterscheidung
- Hover-basierte X-Buttons für schnelles Entfernen

## Dateien

### Backend
- `shared/schema.ts` - Employee-Schema und Typen
- `shared/routes.ts` - API-Route-Definitionen
- `server/storage.ts` - IStorage-Interface und DatabaseStorage
- `server/routes.ts` - Express-Route-Handler

### Frontend
- `client/src/components/EmployeePage.tsx` - Mitarbeiter-Verwaltung
- `client/src/components/TourManagement.tsx` - Tour-Verwaltung (aktualisiert)
- `client/src/components/TeamManagement.tsx` - Team-Verwaltung (aktualisiert)
- `client/src/pages/Home.tsx` - Integration der EmployeePage
