# replit.md

## Overview

A personal calendar application (German: "Kalender - Persönlicher Planer") built with React and Express. The app provides month, week, and year calendar views with a clean, modern UI. It uses a PostgreSQL database for event storage, though the calendar views are currently display-focused with minimal event integration.

### Recent Changes (January 2026)
- **Project Status Management (FT 15)**: Projektstatusverwaltung im Administration-Bereich
  - Datenbank-Tabellen: project_status (id, title, description, color, sort_order, is_active, is_default)
  - Junction-Table: project_project_status für Projekt-Status-Relation
  - API-Endpunkte: GET/POST/PUT/DELETE /api/project-status, PATCH /api/project-status/:id/active
  - Schutzlogik: Default-Status kann nicht gelöscht oder deaktiviert werden
  - Verwendete Status (via project_project_status) können nicht gelöscht werden
  - Sortierung: sort_order ASC, title ASC, id ASC
  - ProjectStatusPage-Komponente mit CardListLayout und EntityCard
  - Farbauswahl für visuelle Unterscheidung der Status
- **CardListLayout Full-Height Layout**: Vollständige Höhenausfüllung mit Sticky Footer
  - Flexbox-Layout: `h-full flex flex-col overflow-hidden`
  - Fixed Header: `flex-shrink-0` mit Rahmen unten
  - Scrollbarer Content: `flex-1 overflow-auto` - nur dieser Bereich scrollt
  - Fixed Footer: `flex-shrink-0` mit Rahmen oben - Buttons bleiben immer sichtbar
  - Refaktoriert: TourManagement, TeamManagement, NoteTemplatesPage
  - Props: title, icon, gridCols (2/3), primaryAction, secondaryAction, loading, emptyState
- **Note Templates Admin (FT 13)**: Notiz-Vorlagen-Verwaltung im Administration-Bereich
  - Sidebar umstrukturiert: "Monitoring & Backup" → "Administration"
  - Terminplanung: 3 ungenutzte Items entfernt (Auslastung, Touren Übersicht, Mitarbeiter Übersicht)
  - Administration: Notiz Vorlagen + Projekt Status hinzugefügt
  - NoteTemplatesPage-Komponente mit vollständigem CRUD
  - API-Endpunkte: GET/POST/PUT/DELETE /api/note-templates
  - Zeigt alle Vorlagen (inkl. inaktive) für Administratoren
- **Notes Management (FT 13)**: Vollständige Notizverwaltung mit Datenbankanbindung
  - API-Endpunkte: GET/POST /api/customers/:id/notes, PUT/DELETE /api/notes/:id, PATCH /api/notes/:id/pin
  - Storage-Repository mit IStorage-Interface Pattern
  - Sortierung: Gepinnte Notizen zuerst, dann nach Aktualisierungsdatum
  - NotesSection-Komponente mit Create, Delete, Pin-Toggle
  - Titel (Pflichtfeld) + RichText-Body mit Formatierung
  - Junction-Table customer_note für Kunden-Notiz-Relation
  - RichTextEditor RTL-Bug behoben (dir="ltr", unicodeBidi)
- **Project Management Prototype**: Added project form via "Projekte" button dropdown in sidebar
  - Dropdown menu with "Neues Projekt" and "Projektliste" options
  - Project form (`ProjectForm.tsx`) includes:
    - Project name and status dropdown (5 status options)
    - Customer display section (shows assigned customer with name, contact, phone)
    - Markdown description textarea with live preview
    - Notes journal with add/delete functionality (like customers)
    - Appointments section (placeholder for future implementation)
    - Documents section with preview dialog (PDF and image placeholders)
  - Demo form only - no database integration yet
- **Employee Management Prototype**: Added employee overview via "Mitarbeiter" button
  - Card-based layout with 80/20 split (data | assignments)
  - Shows name, phone, and Tour/Team mini-badges
  - 8 demo employees with varying assignments
- **Team Management Prototype**: Added team management via "Teams" button in sidebar
  - Automatic team naming (Team 1, Team 2, Team 3...)
  - Pastel-colored headers for visual distinction
  - Employee assignment with checkbox selection (already assigned employees greyed out)
  - Edit button (Pencil icon) opens dialog to modify team members
  - Teams are helper constructs to assign multiple employees to appointments without individual selection
- **Customer Management Prototype**: Added two customer views accessible via a popover menu on the "Kunden" button:
  - **Stammdaten** (`CustomerDetail.tsx`): Basic customer form with personal data, contact, address, and status
  - **Kundendaten** (`CustomerData.tsx`): Extended view with customer form + appointment list (read-only) + notes journal with delete functionality
- **Tour Management** (mit Datenbank verbunden): Tour-Verwaltung via "Touren" Button
  - Einheitliches Design wie Team-Karten: Header mit Farbe + Name + Delete-Button
  - Mitarbeiterliste als zentrales Element mit UserCheck Icons
  - Color-Picker als Button über volle Breite am unteren Rand
  - Edit button (Pencil icon) opens dialog to modify tour members (Demo-Daten)
  - Tours dienen als visuelle Kennzeichnung für regional gruppierte Termine
  - Automatische Benennung (Tour 1, Tour 2, Tour 3...)
  - CRUD-Operationen gegen PostgreSQL-Datenbank
- **Appointment Form Prototype**: Added "Neuer Termin" demo form (`AppointmentForm.tsx`)
  - Date range selection (start date, end date - defaults to same day)
  - Tour assignment with color preview
  - Project selection with derived customer relationship
  - Employee assignment as small chips with initials and tour colors
  - Team shortcuts to quickly assign multiple employees
  - Demo form only - no database integration yet
- **Calendar Appointments**: Extended CalendarGrid with demo appointment visualization
  - **Virtual Tour Slots**: Each day has 3 fixed slots for Tour 1, Tour 2, Tour 3
    - Appointments automatically placed in their tour slot
    - Maintains consistent vertical alignment across days
    - Multi-day appointments stay in same slot position
  - Appointments appear as colored bars (color from assigned Tour)
  - Customer name display: 
    - Single-day: Last name only + PLZ
    - Multi-day: Full name (Nachname, Vorname) + PLZ
  - Multi-day appointments span as continuous bars across calendar days
  - Appointments crossing week boundaries continue in next week row
  - PLZ always visible on right side (mandatory field)
  - Mouseover tooltip showing:
    - Customer info (name, company, address, phone) - compact layout
    - Employee chips (initials in colored circles)
    - Tour info with color indicator
    - **Date display**: Start date (+ end date for multi-day appointments)
    - Project description text
    - Attachment previews with thumbnails
    - **Smart positioning**: Tooltip flips upward when near screen bottom

## Development Guidelines

**Siehe `docs/guardrails.md`** für verbindliche Regeln zu:
- Rollenverständnis und Vorschlagsmechanismus
- Modulare UI-Struktur (View/Controller/Service)
- Datenbank-Operationen und Relationen
- Keine stillen Seiteneffekte

## User Preferences

Preferred communication style: Simple, everyday language.

### UI-Patterns
- Alle Formulare sollen einen X-Button (size="lg", variant="ghost") im Titelbereich zum Schließen haben
- **Geplant**: Einheitliches Layout-System für alle Formulare mit Vollansicht und Miniaturansicht (Card-Darstellung) für konsistentes Erscheinungsbild
- **Kundendaten in Infokärtchen**: Das Unternehmensfeld wird in Tooltips/Cards niemals angezeigt - nur Name, Adresse, Kontaktdaten. Das Unternehmen ist für die Übersicht nicht relevant und verbraucht Platz.

### Wiederverwendbare Layout-Komponenten

**CardListLayout** (`client/src/components/ui/card-list-layout.tsx`)
- **Wann verwenden**: Für jede Ansicht, die mehrere gleichartige Elemente als Liste/Grid anzeigt
- **Features**: Full-Height Layout, fixer Header mit Titel/Icon, scrollbarer Content, fixer Footer mit Action-Buttons
- **Props**:
  - `title`, `icon` - Überschrift mit Icon
  - `gridCols` - "2" oder "3" Spalten
  - `toolbar` - Optionaler Bereich für Steuerelemente (z.B. Filter, Schalter)
  - `primaryAction` - Hauptbutton (z.B. "Neu erstellen")
  - `secondaryAction` - Nebenbutton (z.B. "Schließen")
  - `onClose` - X-Button zum Schließen
  - `emptyState` - Anzeige wenn keine Daten
  - `isLoading` - Ladezustand
- **Verwendet von**: TourManagement, TeamManagement, NoteTemplatesPage, CustomerList, EmployeeManagement

**EntityCard** (`client/src/components/ui/entity-card.tsx`)
- **Wann verwenden**: Für einzelne Datensätze als Karten (Tour, Team, Kunde, Mitarbeiter...)
- **Features**: Farbiger Header mit Titel/Icon, optionaler Löschen-Button, Footer-Bereich
- **Props**:
  - `title`, `icon` - Kartenname mit Icon
  - `headerColor` - Hintergrundfarbe des Headers
  - `onDelete` - Löschen-Button (Mülleimer-Icon)
  - `footer` - Optionaler Footer-Bereich (z.B. ColorPicker, Edit-Button)
  - `children` - Inhalt der Karte
- **Verwendet von**: Tour-Karten, Team-Karten, Kunden-Karten, Mitarbeiter-Karten

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with HMR support

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts`
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Build**: esbuild for production bundling

The backend uses a storage abstraction pattern:
- `server/storage.ts` defines the `IStorage` interface and `DatabaseStorage` implementation
- Routes in `server/routes.ts` use the storage layer for data access
- Schema definitions shared between frontend and backend in `shared/schema.ts`

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Migrations**: Drizzle Kit (`db:push` command)
- **Schema Location**: `shared/schema.ts`

Current schema includes:

**events** table:
- `id` (serial primary key)
- `title` (text)
- `date` (date)

**tours** table (mit Datenbank verbunden):
- `id` (serial primary key)
- `name` (text, auto-generiert: "Tour 1", "Tour 2"...)
- `color` (text, Hex-Farbwert)

### API Structure
Routes are defined declaratively in `shared/routes.ts` with Zod schemas for validation:

**Events:**
- `GET /api/events` - List all events
- `POST /api/events` - Create an event
- `DELETE /api/events/:id` - Delete an event

**Tours:**
- `GET /api/tours` - List all tours
- `POST /api/tours` - Create a tour (name auto-generated)
- `PATCH /api/tours/:id` - Update tour color
- `DELETE /api/tours/:id` - Delete a tour

## External Dependencies

### Database
- **PostgreSQL**: Required. Connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage (available but not currently used)

### UI Libraries
- **Radix UI**: Full suite of accessible UI primitives
- **Lucide React**: Icon library
- **date-fns**: Date manipulation with German locale support
- **embla-carousel-react**: Carousel component
- **react-day-picker**: Calendar date picker
- **cmdk**: Command menu component
- **vaul**: Drawer component

### Development Tools
- **Vite**: Dev server with HMR
- **Replit plugins**: Runtime error overlay, cartographer, dev banner