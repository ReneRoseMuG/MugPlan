# Kalender - Persönlicher Planer

## Overview

This project is a personal calendar application ("Kalender - Persönlicher Planer") built with React and Express, designed to offer month, week, and year calendar views. It aims to provide a clean, modern user interface for managing personal schedules and related entities such as customers, projects, employees, and tours. The long-term vision is to evolve into a comprehensive planning and management tool, integrating robust CRUD functionalities across all modules with a PostgreSQL backend.

## User Preferences

Preferred communication style: Simple, everyday language.

### Dateiorganisation
- **Log-Dateien**: Implementierungs-Logs immer im Ordner `logs/` ablegen (z.B. `logs/FT15_Projektstatusverwaltung.md`)

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
- **Wann verwenden**: Basis-Komponente für einzelne Datensätze als Karten (Kunde, Mitarbeiter ohne Farbe...)
- **Features**: Farbiger Header mit Titel/Icon, optionaler Löschen-Button, Footer-Bereich
- **Props**:
  - `title`, `icon` - Kartenname mit Icon
  - `headerColor` - Hintergrundfarbe des Headers
  - `onDelete` - Löschen-Button (Mülleimer-Icon)
  - `footer` - Optionaler Footer-Bereich (z.B. ColorPicker, Edit-Button)
  - `children` - Inhalt der Karte
  - `style` - Optionale CSS-Styles (z.B. für Border-Farben)
  - `onDoubleClick` - Doppelklick-Handler
- **Verwendet von**: CustomerList, EmployeePage (als Basis für ColoredEntityCard)

**ColoredEntityCard** (`client/src/components/ui/colored-entity-card.tsx`)
- **Wann verwenden**: Für Karten mit farbiger linker Border (Tour, Team, Projekt Status)
- **Erbt von**: EntityCard
- **Features**: Alle EntityCard-Features plus farbige Border-Left (5px)
- **Props**: Wie EntityCard plus:
  - `borderColor` - Farbe der linken Border (z.B. Tour-/Team-Farbe)
- **Verwendet von**: TourManagement, TeamManagement, ProjectStatusPage

**InfoBadge** (`client/src/components/ui/info-badge.tsx`)
- **Wann verwenden**: Basis-Komponente für kompakte Info-Anzeigen (ohne eigene Farbe)
- **Features**: Abgerundete Ecken, Icon + Label, optionaler Remove-Button
- **Props**:
  - `icon`, `label` - Icon und Text
  - `borderColor` - Optionale farbige linke Border
  - `size` - "default" oder "sm" (klein)
  - `fullWidth` - true = 100% Breite, false = inline (nebeneinander)
  - `onRemove` - Remove-Button-Handler
  - `testId` - Test-ID
- **Größenmodi**:
  - `size="default"`: Normale Größe für Formulare
  - `size="sm"`: Kompakte Größe für Card-Inhalte
- **Breitenmodi**:
  - `fullWidth={true}`: Volle Breite des Containers (untereinander)
  - `fullWidth={false}`: Inline-Darstellung (nebeneinander)

**ColoredInfoBadge** (`client/src/components/ui/colored-info-badge.tsx`)
- **Wann verwenden**: Für Badges mit farbiger linker Border (Tour, Team, Status)
- **Erbt von**: InfoBadge
- **Features**: Alle InfoBadge-Features plus automatische farbige Border
- **Props**: Wie InfoBadge plus:
  - `color` - Farbe der linken Border (kann null sein für keine Farbe)
- **Verwendet von**:
  - EmployeePage (Cards): `size="sm"` für kompakte Tour/Team-Badges
  - EmployeePage (Formular): `fullWidth` für Tour/Team-Anzeige
  - ProjectStatusSection: `fullWidth` für Status-Badges im Projekt-Formular

**ColorPickerButton** (`client/src/components/ui/color-picker-button.tsx`)
- **Wann verwenden**: Für Farbauswahl mit nativer Color-Picker-Funktionalität
- **Features**: Button mit Palette-Icon, Hintergrund in ausgewählter Farbe
- **Props**:
  - `color` - Aktuelle Farbe (Hex-Wert)
  - `onChange` - Callback bei Farbänderung
  - `testId` - Test-ID
- **Verwendet von**: TourManagement, TeamManagement, ProjectStatusPage

### Entity Edit Dialog Hierarchie

**EntityEditDialog** (`client/src/components/ui/entity-edit-dialog.tsx`)
- **Wann verwenden**: Basis-Schablone für alle Entity-Bearbeitungsdialoge
- **Features**: Dialog mit Header (Icon + Titel), Content-Bereich, Footer mit Speichern/Abbrechen Buttons
- **Props**:
  - `open`, `onOpenChange` - Dialog-Steuerung
  - `title`, `icon` - Header-Inhalt
  - `onSave`, `onCancel` - Aktionen
  - `isSaving`, `saveDisabled` - Zustandssteuerung
  - `headerExtra` - Zusätzlicher Header-Inhalt (z.B. ColorPicker)
  - `children` - Dialog-Inhalt
- **Basis für**: ColorSelectEntityEditDialog

**ColorSelectEntityEditDialog** (`client/src/components/ui/color-select-entity-edit-dialog.tsx`)
- **Wann verwenden**: Für Dialoge mit Farbauswahl (Tour, Team, Projekt Status)
- **Erbt von**: EntityEditDialog
- **Features**: Farbauswahl-Button mit Farbvorschau im Header
- **Props**: Wie EntityEditDialog plus:
  - `selectedColor` - Aktuelle Farbe
  - `onColorChange` - Callback bei Farbänderung
- **Basis für**: EmployeeSelectEntityEditDialog, ProjectStatusEditDialog

**EmployeeSelectEntityEditDialog** (`client/src/components/ui/employee-select-entity-edit-dialog.tsx`)
- **Wann verwenden**: Für Dialoge mit Mitarbeiter-Zuweisung (Tour, Team)
- **Erbt von**: ColorSelectEntityEditDialog
- **Features**: Mitarbeiter-Auswahlliste mit Checkboxen, bereits zugewiesene Mitarbeiter werden ausgegraut
- **Props**: Wie ColorSelectEntityEditDialog plus:
  - `allEmployees` - Liste aller Mitarbeiter
  - `selectedMembers` - Aktuell ausgewählte Mitarbeiter-IDs
  - `onToggleMember` - Toggle-Handler
  - `entityType` - "tour" oder "team"
- **Basis für**: TourEditDialog, TeamEditDialog

**TourEditDialog** (`client/src/components/ui/tour-edit-dialog.tsx`)
- **Wann verwenden**: Bearbeitung von Touren
- **Erbt von**: EmployeeSelectEntityEditDialog
- **Features**: Tour-spezifisches Icon (Route), automatische Namenserzeugung
- **Verwendet von**: TourManagement

**TeamEditDialog** (`client/src/components/ui/team-edit-dialog.tsx`)
- **Wann verwenden**: Bearbeitung von Teams
- **Erbt von**: EmployeeSelectEntityEditDialog
- **Features**: Team-spezifisches Icon (Users), automatische Namenserzeugung
- **Verwendet von**: TeamManagement

**ProjectStatusEditDialog** (`client/src/components/ui/project-status-edit-dialog.tsx`)
- **Wann verwenden**: Bearbeitung von Projektstatus
- **Erbt von**: ColorSelectEntityEditDialog
- **Features**: Titel-Eingabe (Pflichtfeld), RTF-Editor für Beschreibung, Sortierreihenfolge
- **Verwendet von**: ProjectStatusPage

### CSS Utility-Klassen

**sub-panel** (`client/src/index.css`)
- **Wann verwenden**: Für Unterbereiche in Formularen (z.B. Notizen, Dokumente, Termine)
- **Features**: Dezente Hintergrundfarbe, abgerundete Ecken, leichter Rahmen, Innenabstand
- **CSS-Variable**: `--sub-panel-background: 210 30% 96%` (sehr helles Blaugrau)
- **Anwendung**: `className="sub-panel"` auf Container-Element
- **Verwendet von**: NotesSection

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript. It uses Wouter for lightweight routing, TanStack React Query for server state management, and shadcn/ui for accessible UI components based on Radix UI. Styling is handled with Tailwind CSS, utilizing CSS variables for theming. Vite serves as the build tool, providing HMR support. The architecture follows a component-based approach with pages, reusable UI components, and custom hooks. Path aliases (`@/` for `client/src/` and `@shared/` for `shared/`) are used for module resolution.

Key UI/UX decisions include:
- **Calendar Views**: Month, week, and year views.
- **Appointment Visualization**: Appointments appear as colored bars based on assigned tours, spanning multiple days or weeks as needed. Tooltips provide detailed customer, employee, tour, and project information, with smart positioning.
- **Card-based Layouts**: Extensive use of `CardListLayout` for displaying collections of entities and `EntityCard` for individual records across various management sections (Tours, Teams, Customers, Employees, Projects, Help Texts, Project Status, Note Templates).
- **Form Design**: Forms feature consistent elements like a close button, sub-panels for sections (notes, documents), and planned unified layouts for full-view and card-display modes.
- **Theming**: Tailwind CSS with CSS variables ensures a consistent and modern aesthetic, with specific color assignments for features like tours and project statuses.

### Backend Architecture
The backend is an Express 5 application running on Node.js with TypeScript and ES modules. It exposes RESTful API endpoints defined with shared Zod schemas for validation. Drizzle ORM is used for database interactions with PostgreSQL. The backend utilizes a storage abstraction layer (`IStorage` interface) to manage data access. `esbuild` is used for production bundling.

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM, with `drizzle-zod` for schema validation.
- **Migrations**: Handled via Drizzle Kit.
- **Schema Location**: `shared/schema.ts` for shared definitions.

The database schema includes tables for `events`, `tours`, `projects`, `project_note` (junction), `project_attachments`, `project_project_status` (junction), `employee`, `help_texts`, `project_status`, `note_templates`, and `customer_note` (junction). Key fields include:
- `events`: `id`, `title`, `date`.
- `tours`: `id`, `name`, `color`.
- `projects`: `id`, `name`, `customer_id`, `description_md`, `is_active`.
- `employee`: `id`, `first_name`, `last_name`, `full_name`, `phone`, `email`, `is_active`, `team_id`, `tour_id`.
- `help_texts`: `id`, `help_key` (unique), `title`, `body`, `is_active`.
- `project_status`: `id`, `title`, `description`, `color`, `sort_order`, `is_active`, `is_default`.
- Notes: Tables for notes, note templates, and junction tables for customer and project notes.

### API Structure
RESTful API endpoints are defined in `shared/routes.ts` with Zod schemas for validation.
- **Events**: GET, POST, DELETE.
- **Tours**: GET, POST, PATCH (color), DELETE.
- **Projects**: GET, POST, PATCH, DELETE (`/api/projects`), GET, POST (`/api/projects/:id/notes`), POST, DELETE (`/api/projects/:id/statuses`), GET (`/api/projects/:id/attachments`), DELETE (`/api/project-attachments/:id`).
- **Employees**: GET, POST (`/api/employees`), PUT (`/api/employees/:id`), PATCH (`/api/employees/:id/active`).
- **Help Texts**: GET (`/api/help-texts/key/:helpKey`), GET, POST, PUT, DELETE (`/api/help-texts`), PATCH (`/api/help-texts/:id/active`).
- **Project Status**: GET, POST, PUT, DELETE (`/api/project-status`), PATCH (`/api/project-status/:id/active`).
- **Note Templates**: GET, POST, PUT, DELETE (`/api/note-templates`).
- **Notes**: GET, POST (`/api/customers/:id/notes`), PUT, DELETE (`/api/notes/:id`), PATCH (`/api/notes/:id/pin`).

## External Dependencies

### Database
- **PostgreSQL**: The primary database for all application data. Connection details are expected via the `DATABASE_URL` environment variable.
- **connect-pg-simple**: Available for session storage, though not currently active.

### UI Libraries
- **Radix UI**: Provides a foundation of accessible UI primitives.
- **Lucide React**: Used for icons throughout the application.
- **date-fns**: Utilized for date manipulation, including German locale support.
- **embla-carousel-react**: For carousel functionalities.
- **react-day-picker**: Provides date picking components.
- **cmdk**: For command menu interfaces.
- **vaul**: Used for drawer components.

### Development Tools
- **Vite**: Serves as the development server, offering Hot Module Replacement (HMR).
- **Replit plugins**: Includes runtime error overlay, cartographer, and dev banner for enhanced development experience within the Replit environment.