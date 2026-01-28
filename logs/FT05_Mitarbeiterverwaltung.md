# FT 05 - Mitarbeiterverwaltung (Employee Management)

## Datum: Januar 2026

## Übersicht
Vollständige Mitarbeiterverwaltung mit Datenbankanbindung, Tour- und Team-Zuweisungen.

## Implementierte Features

### Datenbank-Schema (aktualisiert 28.01.2026)
- **employees** Tabelle:
  - `id` (bigserial primary key)
  - `first_name` (text, Pflichtfeld)
  - `last_name` (text, Pflichtfeld)
  - `full_name` (text, automatisch generiert aus first_name + last_name)
  - `phone` (text, optional)
  - `email` (text, optional)
  - `is_active` (boolean, default true)
  - `team_id` (FK zu teams, nullable)
  - `tour_id` (FK zu tours, nullable)
  - `created_at`, `updated_at` (timestamps)

### API-Endpunkte

#### Employee CRUD
- `GET /api/employees` - Liste aller Mitarbeiter (mit ?active=all/true/false Filter)
- `GET /api/employees/:id` - Einzelner Mitarbeiter mit Team/Tour-Relations
- `POST /api/employees` - Neuen Mitarbeiter erstellen (firstName, lastName, phone?, email?)
- `PUT /api/employees/:id` - Mitarbeiter aktualisieren (firstName, lastName, phone?, email?)
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
- `full_name` wird automatisch aus `first_name + " " + last_name` generiert

### Frontend-Komponenten

#### EmployeePage (`client/src/components/EmployeePage.tsx`)
- CardListLayout mit 3-Spalten-Grid
- EntityCard für jeden Mitarbeiter
  - Anzeige: "Nachname, Vorname" + Telefonnummer
  - Team-Badge und Tour-Badge in Karten
- Detail-Dialog (4/5 Breite):
  - **Linke Seite (2/5)**: Terminliste (Demo-Daten für zukünftige Implementierung)
  - **Rechte Seite (3/5)**: 
    - Farbige Balken für zugewiesene Tour/Team
    - Formularfelder: Vorname*, Nachname*, Telefon, E-Mail
    - Aktiv-Checkbox (read-only)
- "Neuer Mitarbeiter" öffnet leeres Formular im Erstellmodus
- Doppelklick auf Karte öffnet Ansichts-Modus
- Edit-Modus mit Speichern/Abbrechen

#### TourManagement (aktualisiert)
- Echte Mitarbeiter-Daten aus Datenbank statt Demo-Daten
- Mitarbeiteranzeige: "Nachname, Vorname"
- X-Button zum Entfernen einzelner Mitarbeiter (on hover)
- Edit-Dialog zeigt nur aktive Mitarbeiter
- Mitarbeiter in anderen Touren ausgegraut

#### TeamManagement (aktualisiert)
- Echte Mitarbeiter-Daten aus Datenbank statt Demo-Daten
- Mitarbeiteranzeige: "Nachname, Vorname"
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
- Detail-Formular mit 2-Spalten-Layout (Termine | Stammdaten)

## Dateien

### Backend
- `shared/schema.ts` - Employee-Schema und Typen (first_name, last_name, full_name, phone, email)
- `shared/routes.ts` - API-Route-Definitionen
- `server/storage.ts` - IStorage-Interface und DatabaseStorage (mit fullName-Generierung)
- `server/routes.ts` - Express-Route-Handler

### Frontend
- `client/src/components/EmployeePage.tsx` - Mitarbeiter-Verwaltung mit Detail-Formular
- `client/src/components/TourManagement.tsx` - Tour-Verwaltung (aktualisiert)
- `client/src/components/TeamManagement.tsx` - Team-Verwaltung (aktualisiert)
- `client/src/pages/Home.tsx` - Integration der EmployeePage

## Test-Ergebnis (28.01.2026)
Playwright-Test erfolgreich:
- Mitarbeiter erstellen mit Vorname, Nachname, Telefon, E-Mail
- Detail-Ansicht öffnen und bearbeiten
- Karten-Anzeige "Nachname, Vorname" verifiziert
