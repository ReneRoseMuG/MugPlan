# FT (17): UI-Komposition – Komponentenliste und Abhängigkeiten

## Zweck
Dieses Dokument ergänzt FT (17) um die aktuelle Struktur der UI-Kompositionsschicht mit Fokus auf Badge-/Preview-Komponenten, deren Ableitungsketten und die fachlichen Abhängigkeiten in den Screens.

## UI-Komponentenliste

### InfoBadge (Basis-Shell)
Datei: `client/src/components/ui/info-badge.tsx`

`InfoBadge` ist die fachneutrale Basiskomponente für kompakte Badges mit optionaler Action (`add`/`remove`).  
Popover-Inhalte werden über `preview` gesteuert (Inhalt + Optionen), nicht mehr über `badgeType`/`badgeData`.  
`InfoBadge` enthält bewusst kein ContextMenu.

---

### Generische Wrapper

#### ColoredInfoBadge
Datei: `client/src/components/ui/colored-info-badge.tsx`  
Delegiert an `InfoBadge`, mappt `color -> borderColor`, nimmt optional `preview`.

#### PersonInfoBadge
Datei: `client/src/components/ui/person-info-badge.tsx`  
Baut Avatar/Initialen + Zeilenlayout und delegiert mit optionalem `preview` an `InfoBadge`.

---

### Fachliche Badge-Wrapper

- `CustomerInfoBadge` (`client/src/components/ui/customer-info-badge.tsx`)
- `EmployeeInfoBadge` (`client/src/components/ui/employee-info-badge.tsx`)
- `ProjectInfoBadge` (`client/src/components/ui/project-info-badge.tsx`)
- `TerminInfoBadge` (`client/src/components/ui/termin-info-badge.tsx`)
- `AttachmentInfoBadge` (`client/src/components/ui/attachment-info-badge.tsx`)
- `TeamInfoBadge` (`client/src/components/ui/team-info-badge.tsx`)
- `TourInfoBadge` (`client/src/components/ui/tour-info-badge.tsx`)

Alle Wrapper erzeugen ihren typischen Preview-Inhalt und übergeben diesen als `preview` an `InfoBadge`.

---

### Typ-spezifische Preview-Komponenten (neu)
Ordner: `client/src/components/ui/badge-previews/`

- `appointment-info-badge-preview.tsx`
- `attachment-info-badge-preview.tsx`
- `customer-info-badge-preview.tsx`
- `employee-info-badge-preview.tsx`
- `project-info-badge-preview.tsx`
- `team-info-badge-preview.tsx`
- `tour-info-badge-preview.tsx`

Jede Preview-Datei kapselt:
1. den visuellen Preview-Inhalt,
2. typ-spezifische Popover-Optionen (`openDelayMs`, `side`, `align`, `maxWidth`, `maxHeight`),
3. einen `create...Preview(...)`-Helper für die Übergabe an `InfoBadge`.

---

### Ablösung der Altstruktur
- Entfernt: `client/src/components/ui/badge-preview-registry.tsx`
- Entferntes Pattern: `badgeType` / `badgeData`
- ContextMenu im Badge-Kontext: nicht Bestandteil der neuen Kompositionskette

## Abhängigkeiten

### Badge-Kompositionsketten
- `TeamInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `TourInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `CustomerInfoBadge -> PersonInfoBadge -> InfoBadge`
- `EmployeeInfoBadge -> PersonInfoBadge -> InfoBadge`
- `ProjectInfoBadge -> InfoBadge`
- `TerminInfoBadge -> InfoBadge`
- `AttachmentInfoBadge -> InfoBadge`

### Preview-Abhängigkeiten
- `TeamInfoBadge -> createTeamInfoBadgePreview -> TeamInfoBadgePreview`
- `TourInfoBadge -> createTourInfoBadgePreview -> TourInfoBadgePreview`
- `CustomerInfoBadge -> createCustomerInfoBadgePreview -> CustomerInfoBadgePreview`
- `EmployeeInfoBadge -> createEmployeeInfoBadgePreview -> EmployeeInfoBadgePreview`
- `ProjectInfoBadge -> createProjectInfoBadgePreview -> ProjectInfoBadgePreview`
- `TerminInfoBadge -> createAppointmentInfoBadgePreview -> AppointmentInfoBadgePreview`
- `AttachmentInfoBadge -> createAttachmentInfoBadgePreview -> AttachmentInfoBadgePreview`

### Screen-Abhängigkeiten (direkte Nutzung)
- `client/src/components/AppointmentForm.tsx`: `TeamInfoBadge`, `TourInfoBadge`
- `client/src/components/EmployeeList.tsx`: `TeamInfoBadge`, `TourInfoBadge`
- `client/src/components/EmployeePage.tsx`: `TeamInfoBadge`, `TourInfoBadge`

## Attachment-Preview-Matrix

- PDF: Inline per `iframe`
- Bilder: Inline per `img`
- DOC/DOCX: Inline über Office-Embed (`iframe`)
- TXT: Textvorschau per `fetch` + `<pre>`
- Sonstige Formate: Fallback-Hinweis + Öffnen/Download

## Preview-System (HoverPreview)

Datei: `client/src/components/ui/hover-preview.tsx`

`HoverPreview` ist die generische, domain-neutrale technische Basis fuer Hover-Previews.
Die Komponente kapselt:

1. Trigger-Handling (`mouseenter` / `mouseleave`)
2. Lifecycle inkl. Delay-System (`openDelay`, `closeDelay`)
3. Positionierung (anchored und cursor-basiert)
4. Rendering via Portal (robust gegen Overflow/Scroll)

Aktuelle Nutzung:

- `InfoBadge` nutzt `HoverPreview` intern fuer Badge-Previews.
- Kalender-Termin-Previews (Compact Bars) nutzen `HoverPreview` im Cursor-Modus.
- Kalender-Tour-Lane-Header-Preview nutzt `HoverPreview` im Cursor-Modus.

Damit verwenden Badge- und Kalender-Previews dasselbe technische Preview-Subsystem.
