# FT17 - Template-System für Badges und EntityCards

## Datum
29. Januar 2026

## Übersicht
Implementierung eines einheitlichen Template-Systems für wiederverwendbare UI-Komponenten mit Vererbung und Farbunterstützung.

## Implementierte Komponenten

### 1. InfoBadge (Basis-Komponente)
**Datei**: `client/src/components/ui/info-badge.tsx`

**Neue Features**:
- `size` Prop: "default" oder "sm" für unterschiedliche Größen
- `fullWidth` Prop: true = volle Breite, false = inline-Darstellung
- Angepasster Eckenradius (`rounded` statt `rounded-md`)

**Verwendung**:
```tsx
<InfoBadge 
  icon={<Flag />} 
  label="Status" 
  size="sm"           // Kompakt
  fullWidth={false}   // Inline, nebeneinander
/>
```

### 2. ColoredInfoBadge (abgeleitete Komponente)
**Datei**: `client/src/components/ui/colored-info-badge.tsx`

**Features**:
- Erbt alle InfoBadge-Props
- Automatische farbige Border-Left (5px) basierend auf `color` Prop
- `color` kann null sein (keine Border)

**Verwendung**:
```tsx
<ColoredInfoBadge
  icon={<Route />}
  label={tour.name}
  color={tour.color}   // Farbige linke Border
  size="sm"            // Kompakt für Cards
/>
```

### 3. ColoredEntityCard (abgeleitete Komponente)
**Datei**: `client/src/components/ui/colored-entity-card.tsx`

**Features**:
- Erbt alle EntityCard-Props
- Automatische farbige Border-Left (5px) basierend auf `borderColor` Prop

**Verwendung**:
```tsx
<ColoredEntityCard
  title={team.name}
  icon={<Users />}
  borderColor={team.color}  // Farbige linke Border
  onDelete={...}
/>
```

### 4. ColorPickerButton (wiederverwendbar)
**Datei**: `client/src/components/ui/color-picker-button.tsx`

**Features**:
- Nativer HTML Color-Picker
- Button mit Palette-Icon zeigt aktuelle Farbe als Hintergrund
- Einheitliches Design für alle Farbauswahl-Dialoge

**Verwendung**:
```tsx
<ColorPickerButton
  color={selectedColor}
  onChange={setSelectedColor}
  testId="button-tour-color-picker"
/>
```

## Refaktorierte Komponenten

### EmployeePage
- **Card-Badges (Tour/Team)**: Jetzt ColoredInfoBadge mit `size="sm"`
- **Formular (Tour/Team)**: Jetzt ColoredInfoBadge mit `fullWidth`

### ProjectStatusSection
- Status-Badges: Jetzt ColoredInfoBadge mit `fullWidth`

### TourManagement
- Karten: Jetzt ColoredEntityCard mit `borderColor`
- Lokaler ColorPickerButton durch wiederverwendbare Komponente ersetzt

### TeamManagement
- Karten: Jetzt ColoredEntityCard mit `borderColor` statt Header-Hintergrund
- Farbwähler hinzugefügt (wie bei Tour)
- Neue updateMutation für Farbänderungen

### ProjectStatusPage
- Karten: Jetzt ColoredEntityCard mit `borderColor` statt Header-Hintergrund
- Palette-Farbwähler durch ColorPickerButton ersetzt

## Design-Entscheidungen

### Vererbungsstrategie
Komponenten "erben" durch Komposition, nicht klassische Vererbung:
- ColoredInfoBadge rendert InfoBadge und reicht Props durch
- ColoredEntityCard rendert EntityCard und fügt Border-Style hinzu

### Farbvisualisierung
- Einheitlich 5px Border-Left für Tour, Team und Projekt Status
- Bessere Sichtbarkeit bei Pastellfarben als Header-Hintergrund

### Size-Modi (InfoBadge)
- `default`: Normale Größe für Formulare (px-3 py-2)
- `sm`: Kompakte Größe für Card-Inhalte (px-2 py-0.5, text-xs)

### Width-Modi (InfoBadge)
- `fullWidth={true}`: Volle Container-Breite, Badges untereinander
- `fullWidth={false}`: Inline, Badges nebeneinander

## Dokumentation
Template-Dokumentation in `replit.md` unter "Wiederverwendbare Layout-Komponenten" aktualisiert mit:
- EntityCard, ColoredEntityCard
- InfoBadge, ColoredInfoBadge
- ColorPickerButton
- Props, Verwendungsorte und Beispiele

## Betroffene Dateien
- `client/src/components/ui/info-badge.tsx` - Erweitert
- `client/src/components/ui/colored-info-badge.tsx` - Neu
- `client/src/components/ui/colored-entity-card.tsx` - Neu
- `client/src/components/ui/color-picker-button.tsx` - Neu
- `client/src/components/EmployeePage.tsx` - Refaktoriert
- `client/src/components/ProjectStatusSection.tsx` - Refaktoriert
- `client/src/components/TourManagement.tsx` - Refaktoriert
- `client/src/components/TeamManagement.tsx` - Refaktoriert + Farbwähler
- `client/src/components/ProjectStatusPage.tsx` - Refaktoriert + Farbwähler
- `replit.md` - Dokumentation erweitert
