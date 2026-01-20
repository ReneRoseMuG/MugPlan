# Design Guidelines: Kalender- und Projektplanungs-App

## Design Approach
**Selected Approach:** Design System (Productivity-Focused)
**Primary References:** Linear, Notion, Asana
**Rationale:** Utility-focused productivity tool requiring efficiency, clarity, and professional polish. Draws from modern task management interfaces with emphasis on information hierarchy and workflow optimization.

**Core Principles:**
- Information density without clutter
- Scannable content with clear visual groupings
- Immediate action accessibility
- Professional restraint with purposeful whitespace

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, h-8, gap-6, etc.)

**Application Structure:**
- **Sidebar:** Fixed 280px width, full height, left-aligned
- **Main Content Area:** Remaining space with max-width constraint of 1400px, centered
- **Content Padding:** px-8 py-6 for main area, px-6 py-4 for cards

**Grid System:**
- Calendar views: 7-column grid for week view
- Project cards: 3-column grid on desktop (lg:grid-cols-3), 2-column tablet (md:grid-cols-2), single mobile
- Dashboard widgets: 2-column layout for stats/metrics

## Typography

**Font Stack:** 
- Primary: Inter (Google Fonts) - body text, UI elements
- Secondary: Inter Tight - headings, labels

**Hierarchy:**
- Page Headers: text-2xl font-semibold (24px)
- Section Headers: text-lg font-medium (18px)
- Card Titles: text-base font-semibold (16px)
- Body Text: text-sm font-normal (14px)
- Labels/Meta: text-xs font-medium uppercase tracking-wide (12px)
- Buttons: text-sm font-medium (14px)

## Component Library

### Sidebar Navigation
**Structure:**
- Logo/Brand area at top (h-16)
- Grouped navigation sections with labels
- Button groups separated by divider lines (border-t)
- Bottom section for user profile

**Navigation Groups:**
- "ÜBERSICHT" - Dashboard, Heute, Woche
- "PROJEKTE" - Alle Projekte, Meine Aufgaben, Archiv
- "KALENDER" - Monatsansicht, Teamkalender
- "EINSTELLUNGEN" - Profil, Benachrichtigungen

**Button Style:**
- Full width within sidebar (w-full)
- Left-aligned with icon + text
- Padding: px-4 py-2.5
- Rounded corners: rounded-lg
- Active state: distinct background
- Icon size: w-5 h-5, left of text with mr-3

### Card Components

**Base Card:**
- Rounded corners: rounded-xl
- Padding: p-6
- Shadow: subtle elevation
- Border: 1px subtle

**Card Header:**
- Flex row with space-between
- Title: text-base font-semibold
- Action buttons/menu: icon-only, h-8 w-8

**Card Sections:**
- Internal spacing: space-y-4
- Dividers between sections when needed

### Form Elements (Card-Based)

**Form Cards:**
- All forms wrapped in card components
- Input groups: space-y-4
- Label above input pattern
- Labels: text-sm font-medium mb-1.5

**Input Fields:**
- Height: h-10 for text inputs
- Padding: px-4
- Rounded: rounded-lg
- Full width: w-full
- Border: 1px with focus state

**Select/Dropdown:**
- Same sizing as text inputs
- Custom arrow indicator
- Dropdown menu: card-style with shadow

**Date Picker:**
- Calendar grid: 7-column
- Day cells: square aspect ratio, rounded-lg
- Today indicator: distinct style
- Selected date: prominent treatment

**Buttons:**
- Primary: px-6 py-2.5, rounded-lg, font-medium
- Secondary: same sizing, outlined style
- Icon buttons: h-10 w-10, centered icon
- Button groups: gap-2

### Calendar Components

**Month View:**
- 7-column grid (days of week)
- Header row: Weekday names (Mo, Di, Mi, Do, Fr, Sa, So)
- Day cells: min-h-24, p-2
- Event indicators: small colored dots or pills
- Multiple events: stacked with spacing

**Week View:**
- Time column (left): 60px width
- Day columns: equal width distribution
- Hourly divisions: subtle grid lines
- Event blocks: absolute positioned, color-coded
- Time labels: text-xs

**Task/Event Cards:**
- Compact height: py-2 px-3
- Priority indicator: left border (4px)
- Status checkbox: left-aligned
- Title: text-sm truncate
- Meta info: text-xs (time, project)

### Project Components

**Project Card:**
- Header with project name + status badge
- Progress bar: h-2 rounded-full
- Stats row: grid-cols-3 (Aufgaben, Team, Deadline)
- Action buttons footer

**Task List:**
- Checkbox + task name row
- Assignee avatar: right-aligned, w-6 h-6 rounded-full
- Due date badge: text-xs
- Hover: slight background change

### Dashboard Widgets

**Stat Cards:**
- Centered content
- Large number: text-4xl font-bold
- Label below: text-sm
- Icon top-right: decorative

**Activity Feed:**
- List with avatar + text pattern
- Timestamp: text-xs, right-aligned
- Dividers: border-b between items

## Images

**No Large Hero Images** - This is a dashboard application interface.

**Supporting Images:**
- Empty state illustrations: Center of main content area when no data (max-w-sm), friendly line-art style illustrations
- User avatars: Throughout interface (32px standard, 24px compact)
- Project thumbnails: Optional 48px square for project cards

**Icon Library:** Heroicons (outline for inactive, solid for active states)

## Navigation & Interaction Patterns

**Page Transitions:** Instant, no animations
**Modals:** Card-style centered overlay with backdrop blur
**Dropdowns:** Slide-down from trigger, card styling
**Toasts/Notifications:** Top-right corner, auto-dismiss
**Loading States:** Skeleton screens matching component structure

**German UI Text Examples:**
- "Neues Projekt erstellen"
- "Aufgabe hinzufügen"
- "Fälligkeitsdatum"
- "Priorität"
- "Zugewiesen an"
- "Speichern" / "Abbrechen"