# replit.md

## Overview

A personal calendar application (German: "Kalender - Persönlicher Planer") built with React and Express. The app provides month, week, and year calendar views with a clean, modern UI. It uses a PostgreSQL database for event storage, though the calendar views are currently display-focused with minimal event integration.

### Recent Changes (January 2026)
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
- **Team Management Prototype**: Added team template management via "Team Vorlagen" button in sidebar
  - Automatic team naming (Team 1, Team 2, Team 3...)
  - Pastel-colored headers for visual distinction
  - Employee assignment with checkbox selection (already assigned employees greyed out)
  - Teams are helper constructs to assign multiple employees to appointments without individual selection
- **Customer Management Prototype**: Added two customer views accessible via a popover menu on the "Kunden" button:
  - **Stammdaten** (`CustomerDetail.tsx`): Basic customer form with personal data, contact, address, and status
  - **Kundendaten** (`CustomerData.tsx`): Extended view with customer form + appointment list (read-only) + notes journal with delete functionality
- **Tour Management Prototype**: Added tour management via "Touren" button under Mitarbeiter Verwaltung
  - Color-coded cards with name field, color picker, and delete button
  - Tours serve as visual identifiers for regionally grouped appointments
  - Automatic naming with sequential index (Tour 1, Tour 2, Tour 3...)
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

## User Preferences

Preferred communication style: Simple, everyday language.

### UI-Patterns
- Alle Formulare sollen einen X-Button (size="lg", variant="ghost") im Titelbereich zum Schließen haben
- **Geplant**: Einheitliches Layout-System für alle Formulare mit Vollansicht und Miniaturansicht (Card-Darstellung) für konsistentes Erscheinungsbild

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

Current schema includes an `events` table with:
- `id` (serial primary key)
- `title` (text)
- `date` (date)

### API Structure
Routes are defined declaratively in `shared/routes.ts` with Zod schemas for validation:
- `GET /api/events` - List all events
- `POST /api/events` - Create an event
- `DELETE /api/events/:id` - Delete an event

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