# UI-Vereinheitlichung: EntityCard System

**Datum:** 26. Januar 2026

## Übersicht

Einführung eines einheitlichen Karten-Designs für alle Entitäts-Listen (Tours, Teams, Projekte, Kunden) mit konsistentem Styling, Hover-Effekten und wiederverwendbaren Komponenten.

---

## Neue Komponenten

### EntityCard (`client/src/components/ui/entity-card.tsx`)

Zentrale Karten-Komponente mit:
- Farbiger Header-Bereich (py-2, kompakt)
- Icon + Titel im Header
- Aktions-Buttons (optional) rechts im Header
- Delete-Button (X) mit Bestätigung
- Einheitlicher Hover-Effekt: `hover:shadow-md hover:border-primary/50`
- Abgerundete Ecken (`rounded-lg`)

**Props:**
- `title`: string - Kartentitel
- `icon`: ReactNode - Icon im Header
- `headerColor`: string - Hex-Farbwert für Header (default: #f1f5f9)
- `onDelete`: () => void - Delete-Handler
- `isDeleting`: boolean - Ladezustand beim Löschen
- `actions`: ReactNode - Zusätzliche Buttons im Header
- `children`: ReactNode - Karteninhalt
- `testId`: string - Test-ID für E2E-Tests

---

### Farbpalette (`client/src/lib/colors.ts`)

Zentrale Definition von 16 Pastel-Farben:

```typescript
export const PASTEL_COLORS = [
  "#FFB3BA", // Rosa
  "#FFDFBA", // Pfirsich
  "#FFFFBA", // Gelb
  "#BAFFC9", // Mintgrün
  "#BAE1FF", // Hellblau
  "#E0BBE4", // Lavendel
  "#D4A5A5", // Altrosa
  "#A5D4D4", // Türkis
  "#F0E68C", // Khaki
  "#DDA0DD", // Pflaume
  "#98D8C8", // Seafoam
  "#F7DC6F", // Senfgelb
  "#BB8FCE", // Orchidee
  "#85C1E9", // Himmelblau
  "#F8B500", // Honig
  "#82E0AA", // Smaragd
];

export const defaultHeaderColor = "#f1f5f9"; // Slate-100
```

---

## Migrationierte Komponenten

### 1. TourManagement (`client/src/components/TourManagement.tsx`)

- Verwendet EntityCard mit Tour-Farbe als Header
- Color-Picker (Palette-Icon) im Header zum Ändern der Farbe
- Edit-Button (Pencil-Icon) für Mitarbeiter-Zuweisung
- Delete-Button mit API-Integration

### 2. TeamManagement (`client/src/components/TeamManagement.tsx`)

- Verwendet EntityCard mit zufälliger Pastel-Farbe bei Erstellung
- Kein Color-Picker (Farbe wird automatisch zugewiesen)
- Edit-Button für Mitarbeiter-Zuweisung
- Delete-Button mit API-Integration

### 3. ProjectList (`client/src/components/ProjectList.tsx`)

- Verwendet EntityCard mit Standard-Header (slate-100)
- Status-Badge im Inhalt
- Kundenname, Termine-Anzahl
- Demo-Daten (keine DB-Integration)

### 4. CustomerList (`client/src/components/CustomerList.tsx`) - NEU

- Neue Komponente mit EntityCard
- Standard-Header (slate-100)
- Status-Badge (Aktiv/Inaktiv/Lead)
- Adresse, Telefon, Termine-Anzahl
- Suchfilter und Status-Filter
- Demo-Daten (keine DB-Integration)

### 5. EmployeeManagement (`client/src/components/EmployeeManagement.tsx`)

- Behält 2-Spalten-Layout (nicht auf EntityCard migriert)
- Hover-Effekt angeglichen: `hover:shadow-md hover:border-primary/50`
- Konsistente Transition: `transition-all`

---

## Sidebar-Integration

Neuer "Kunden"-Button in der Sidebar:
- Öffnet CustomerList-Ansicht
- data-testid: `nav-kunden`

---

## Design-Richtlinien

### Einheitliche Hover-Effekte
Alle Karten haben identischen Hover:
```css
hover:shadow-md hover:border-primary/50 transition-all
```

### Button-Größen
Alle Icon-Buttons verwenden ausschließlich `size="icon"` ohne manuelle Größenangaben (h-x, w-x).

### Farbschema
- Tours: Benutzerdefinierte Farbe (aus Farbwähler)
- Teams: Zufällige Pastel-Farbe bei Erstellung
- Projekte/Kunden: Neutral grau (#f1f5f9)

---

## Test-IDs

| Komponente | Test-ID Pattern |
|------------|-----------------|
| Tour-Karte | `card-tour-{id}` |
| Team-Karte | `card-team-{id}` |
| Projekt-Karte | `project-card-{id}` |
| Kunden-Karte | `customer-card-{id}` |
| Mitarbeiter-Karte | `card-employee-{id}` |

---

## Betroffene Dateien

- `client/src/components/ui/entity-card.tsx` (NEU)
- `client/src/lib/colors.ts` (NEU)
- `client/src/components/TourManagement.tsx` (GEÄNDERT)
- `client/src/components/TeamManagement.tsx` (GEÄNDERT)
- `client/src/components/ProjectList.tsx` (GEÄNDERT)
- `client/src/components/CustomerList.tsx` (NEU)
- `client/src/components/EmployeeManagement.tsx` (GEÄNDERT)
- `client/src/components/Sidebar.tsx` (GEÄNDERT)
- `client/src/pages/Home.tsx` (GEÄNDERT)
