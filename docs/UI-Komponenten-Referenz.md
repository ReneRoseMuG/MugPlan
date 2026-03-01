# UI-Komponenten-Referenz — MugPlan

**Zweck dieses Dokuments**
Diese Referenz beschreibt die vorhandene UI-Kompositionsschicht als verbindliche technische Leitplanke. Neue Screens und Dialoge müssen aus diesen Bausteinen zusammengesetzt werden. Neue Komponenten dürfen nur als Wrapper oder Ableitung bestehender Basiskomponenten entstehen und müssen hier nachgepflegt werden. Das Dokument ist nach Domänenobjekt gegliedert, um die Frage „Was gibt es für X?" schnell zu beantworten.

---

## 1. Strukturschicht: Seitenrahmen und Ansichtsmodi

### `ListLayout`
**Datei:** `client/src/components/ui/list-layout.tsx`

Der universelle Seitenrahmen für alle Listen- und Übersichtsseiten. Er ordnet Kopfbereich, Inhaltsfläche, Filterbereich und Fußbereich einheitlich an.

**Slots:**

| Prop | Typ | Bedeutung |
|---|---|---|
| `title` | string | Seitentitel im Header |
| `icon` | ReactNode | Icon links neben dem Titel |
| `contentSlot` | ReactNode | Pflichtinhalt — hier kommt BoardView oder TableView hinein |
| `filterSlot` | ReactNode | Filterleiste, Placement über `filterPlacement` steuerbar |
| `filterPlacement` | `"top" \| "bottom"` | Standard: `"bottom"` |
| `viewModeToggle` | ReactNode | Umschalter Board/Tabelle (ToggleGroup) |
| `headerActions` | ReactNode | Weitere Aktionen im Header |
| `footerSlot` | ReactNode | Fußbereich (z. B. Neu-Button, Paginierung) |
| `helpKey` | string | Aktiviert systemweiten Hilfe-Trigger via HelpIcon |
| `isLoading` | boolean | Zeigt Ladezustand statt Inhalt |
| `onClose` | () => void | Aktiviert Schließen-Button im Header |
| `viewModeKey` | string | Persistenzschlüssel für Settings |

**Eingesetzt in:** CustomersPage, ProjectsPage, EmployeesPage, AppointmentsListPage, HelpTextsPage, NoteTemplatesPage, ProjectStatusPage, EmployeePickerDialogList, TourAppointmentsPanel

---

### `BoardView`
**Datei:** `client/src/components/ui/board-view.tsx`

Kartenraster für visuelle Übersichten. Spaltenanzahl ist responsiv und global konfigurierbar über `useSetting("cardListColumns")` (2–6 Spalten).

**Eingesetzt in:** CustomersPage (Board-Modus), ProjectsPage (Board-Modus), EmployeesPage (Board-Modus), EmployeePickerDialogList, TeamManagement, TourManagement

---

### `TableView`
**Datei:** `client/src/components/ui/table-view.tsx`

Generische, typsichere Tabellenkomponente mit Doppelklick-Interaktion und Hover-Preview. Unterstützt beide Preview-Mechanismen (freies ReactNode oder strukturiertes `InfoBadgePreview`-Objekt).

**Schlüssel-Props:**

| Prop | Bedeutung |
|---|---|
| `columns` | Spalten-Definitionen mit accessor, cell, width, align |
| `rowPreviewRenderer` | Hover-Preview pro Zeile — gibt ReactNode oder InfoBadgePreview zurück |
| `onRowDoubleClick` | Öffnet Detailansicht |
| `stickyHeader` | Fixiert Tabellenkopf beim Scrollen |
| `density` | `"compact"` oder `"comfortable"` |

**Eingesetzt in:** CustomersPage (Tabellen-Modus), ProjectsPage (Tabellen-Modus), EmployeesPage (Tabellen-Modus), AppointmentsListPage, TourAppointmentsTableDialog

---

## 2. Karten, Formularrahmen und Dialograhmen

### `EntityCard`
**Datei:** `client/src/components/ui/entity-card.tsx`

Einheitliche Karte für Board-Ansichten. Enthält Header mit Farbe und Icon, Content-Bereich und optionalen Footer.

**Wichtiger Hinweis:** Der `footer`-Slot ist standardmäßig per CSS verborgen (`footerVisibility="hidden"`). Er muss explizit mit `footerVisibility="visible"` aktiviert werden — oder er wird als Hover-Aktion genutzt, die erst bei Kartenfokus sichtbar wird.

**Eingesetzt in:** CustomersPage, ProjectsPage, EmployeesPage, EmployeePickerDialogList

---

### `EntityFormLayout`
**Datei:** `client/src/components/ui/entity-form-layout.tsx`

Formularrahmen für große Detail- und Bearbeitungsseiten mit Aktionsleiste (Speichern/Abbrechen). Verwaltet Submit-Zustand und optionales Auto-Close nach Erfolg.

**Eingesetzt in:** ProjectForm, AppointmentForm, CustomerData

---

### `EntityEditDialog`
**Datei:** `client/src/components/ui/entity-edit-dialog.tsx`

Dialograhmen für fokussierte Bearbeitung ohne Seitenwechsel. Analog zu EntityFormLayout, aber in einem modalen Dialog.

**Zusatz-Props:** `hideActions`, `leftActions`, `headerExtra`, `maxWidth`

**Eingesetzt in:** EmployeesPage (Mitarbeiter-Detaildialog), TeamManagement, TourManagement, Projektstatus-Dialoge

---

## 3. Badge-System

Das Badge-System ist hierarchisch aufgebaut. Neue fachliche Badges müssen immer als Ableitung einer bestehenden Stufe gebaut werden — niemals direkt mit eigenem Layout.

### Hierarchie

```
InfoBadge  (technische Basis — kein direkter Facheinsatz)
├── PersonInfoBadge  (generischer Wrapper für Personen mit Avatar)
│   ├── CustomerInfoBadge
│   └── EmployeeInfoBadge
└── ColoredInfoBadge  (generischer Wrapper für farbcodierte Entitäten)
    ├── TeamInfoBadge
    ├── TourInfoBadge
    └── ProjectStatusInfoBadge

InfoBadge  (direkte Ableitungen ohne Wrapper)
├── ProjectInfoBadge
├── TerminInfoBadge
└── AttachmentInfoBadge
```

---

### `InfoBadge` — Technische Basis
**Datei:** `client/src/components/ui/info-badge.tsx`

Nicht direkt für Fachinhalte einsetzen. Stellt die Badge-Hülle, Actions (add/remove) und die Preview-Anbindung bereit.

**Props:** `icon`, `label`, `borderColor`, `action`, `onAdd`, `onRemove`, `preview` (InfoBadgePreview), `size`, `fullWidth`, `onDoubleClick`

---

### `PersonInfoBadge` — Personen-Wrapper
**Datei:** `client/src/components/ui/person-info-badge.tsx`

Erweitert InfoBadge um einen Avatar-Kreis mit Initialen und mehrzeiligem Label. Wird nicht direkt fachlich eingesetzt, nur über Kundenund Mitarbeiter-Badge.

---

### `ColoredInfoBadge` — Farb-Wrapper
**Datei:** `client/src/components/ui/colored-info-badge.tsx`

Erweitert InfoBadge um einen farbigen linken Rand. Wird nicht direkt fachlich eingesetzt, nur über Team-, Tour- und Statuss-Badge.

---

### Fachliche Badges

| Badge | Datei | Basis | Preview vorhanden | Wo eingesetzt |
|---|---|---|---|---|
| `CustomerInfoBadge` | `customer-info-badge.tsx` | PersonInfoBadge | ✅ | AppointmentForm, Projektkontexte |
| `EmployeeInfoBadge` | `employee-info-badge.tsx` | PersonInfoBadge | ✅ | AppointmentForm, Team/Tour-Verwaltung |
| `TeamInfoBadge` | `team-info-badge.tsx` | ColoredInfoBadge | ✅ | EmployeesPage (Board), Mitarbeiter-Detail |
| `TourInfoBadge` | `tour-info-badge.tsx` | ColoredInfoBadge | ✅ | EmployeesPage (Board), Mitarbeiter-Detail |
| `ProjectStatusInfoBadge` | `project-status-info-badge.tsx` | ColoredInfoBadge | ❌ (keine Preview) | ProjectsPage (Board), ProjectForm |
| `ProjectInfoBadge` | `project-info-badge.tsx` | InfoBadge (direkt) | ✅ | AppointmentForm |
| `TerminInfoBadge` | `termin-info-badge.tsx` | InfoBadge (direkt) | ✅ (AppointmentWeeklyPanel) | Termin-Panels, Kalenderansichten |
| `AttachmentInfoBadge` | `attachment-info-badge.tsx` | InfoBadge (direkt) | ✅ (Vollvorschau mit PDF/Bild) | AttachmentsPanels |

---

## 4. Preview-System

Previews öffnen sich als Hover-Popover. Alle Previews laufen über `HoverPreview` (`client/src/components/ui/hover-preview.tsx`), der zwei Modi kennt: `anchored` (am Badge) und `cursor` (folgt der Maus, genutzt in TableView).

### Vorhandene Preview-Dateien

| Datei | Genutzt von | Inhalt |
|---|---|---|
| `badge-previews/customer-info-badge-preview.tsx` | CustomerInfoBadge | Name, Kundennr., Telefon |
| `badge-previews/employee-info-badge-preview.tsx` | EmployeeInfoBadge | Name, Team, Tour |
| `badge-previews/project-info-badge-preview.tsx` | ProjectInfoBadge | Titel, Kunde, Terminanzahl |
| `badge-previews/team-info-badge-preview.tsx` | TeamInfoBadge | Teamname, Mitgliederliste |
| `badge-previews/tour-info-badge-preview.tsx` | TourInfoBadge | Tourname, Mitgliederliste |
| `badge-previews/attachment-info-badge-preview.tsx` | AttachmentInfoBadge | PDF-/Bild-/Word-/Text-Inline-Vorschau, Download-Button |
| `badge-previews/appointment-weekly-panel-preview.tsx` | TerminInfoBadge, TableView-rowPreviewRenderer | Vollständiges CalendarWeekAppointmentPanel |
| `badge-previews/appointment-info-badge-preview.tsx` | ⚠️ aktuell nicht angebunden | Kompakte Termindetails (Datum, Projekt, Kunde) |

**Hinweis zu `appointment-info-badge-preview`:** Die Datei existiert, wird aber derzeit nirgends direkt genutzt. TerminInfoBadge verwendet stattdessen `appointment-weekly-panel-preview`. Klärungsbedarf vor Neueinsatz.

### Wo Previews geöffnet werden

| Kontext | Preview-Typ | Auslöser |
|---|---|---|
| Badges (alle fachlichen Badges) | Anchored Popover am Badge | Hover auf Badge |
| TableView-Zeilen (Kunden, Projekte, Mitarbeiter, Termine) | Cursor-folgendes Popover | Hover auf Tabellenzeile |
| AttachmentInfoBadge | Anchored Popover, maxWidth 760px | Hover auf Anhang-Badge |

---

## 5. Filter-System

Alle Filter-Panels bauen auf `FilterPanel` als technischer Basiskomponente auf.

### `FilterPanel` — Basis
**Datei:** `client/src/components/ui/filter-panels/filter-panel.tsx`

Layout-Container für Filterzeilen. Props: `title` (Screenreader-Label), `layout` (`"row"` | `"stack"`), `showTitle`.

---

### Vorhandene Filter-Panels

| Panel | Datei | Felder | Eingesetzt in |
|---|---|---|---|
| `CustomerFilterPanel` | `customer-filter-panel.tsx` | Nachname, Kundennummer, Scope (aktiv/inaktiv, nur Admin) | CustomersPage |
| `ProjectFilterPanel` | `project-filter-panel.tsx` | Titel, Kundename, Kundennummer, Auftragsnummer, Status-Picker, Scope-Switches | ProjectsPage |
| `EmployeeFilterPanel` | `employee-filter-panel.tsx` | Nachname, Scope (aktiv/inaktiv, nur Admin) | EmployeesPage |
| `AppointmentsFilterPanel` | `appointments-filter-panel.tsx` | Mitarbeiter, Projekt, Kunde, Tour, Datum von/bis | AppointmentsListPage, TourAppointmentsPanel |
| `CalendarFilterPanel` | `calendar-filter-panel.tsx` | Mitarbeiter-Selektion | Wochen-, Monats-, Jahreskalender |
| `HelpTextsFilterPanel` | `help-texts-filter-panel.tsx` | Suchbegriff (Schlüssel oder Titel) | HelpTextsPage |
| `EmployeePickerFilterPanel` | `employee-picker-filter-panel.tsx` | Name (Freitext) | EmployeePickerDialogList |

---

## 6. Dialoglisten und Picker

### `EmployeePickerDialogList`
**Datei:** `client/src/components/EmployeePickerDialogList.tsx`

Auswahldialog für Mitarbeiter. Nutzt `ListLayout` + `BoardView` + `EntityCard` + `EmployeePickerFilterPanel`. Zeigt Karten, **keine Tabelle** (Abweichung von ursprünglicher Spezifikation, die Tabelle vorsah).

**Eingesetzt in:** AppointmentForm (Mitarbeiterzuweisung)

---

### `TourAppointmentsTableDialog`
**Datei:** `client/src/components/TourAppointmentsTableDialog.tsx`

Tabellenfokussierter Termin-Dialog im Tourkontext. Nutzt `AppointmentsListPage` mit gesperrter Tour-ID.

**Eingesetzt in:** TourManagement

---

## 7. Domänenobjekte: Welche Komponenten für was

### Kunden

| Verwendungskontext | Komponenten |
|---|---|
| Übersichtsliste | ListLayout + BoardView/TableView + EntityCard + CustomerFilterPanel |
| Tabellenzeile Hover | AppointmentWeeklyPanelPreview (nächster Termin) |
| Detailformular | EntityFormLayout (CustomerData) |
| Badge in anderen Formularen | CustomerInfoBadge → CustomerInfoBadgePreview |
| Sub-Panel in Projektformular | CustomerAppointmentsPanel, CustomerAttachmentsPanel |

---

### Projekte

| Verwendungskontext | Komponenten |
|---|---|
| Übersichtsliste | ListLayout + BoardView/TableView + EntityCard + ProjectFilterPanel |
| Board-Karte | EntityCard mit ProjectStatusInfoBadge (sm, fullWidth) |
| Tabellenzeile Hover | AppointmentWeeklyPanelPreview (nächster Termin) |
| Detailformular | EntityFormLayout (ProjectForm) |
| Badge in anderen Formularen | ProjectInfoBadge → ProjectInfoBadgePreview |
| Status-Anzeige | ProjectStatusInfoBadge (keine Preview) |
| Sub-Panels | ProjectAppointmentsPanel, ProjectAttachmentsPanel |

---

### Mitarbeiter

| Verwendungskontext | Komponenten |
|---|---|
| Übersichtsliste | ListLayout + BoardView/TableView + EntityCard + EmployeeFilterPanel |
| Board-Karte | EntityCard mit TourInfoBadge (sm) + TeamInfoBadge (sm) |
| Tabellenzeile Hover | AppointmentWeeklyPanelPreview (nächster Termin) |
| Detailbearbeitung | EntityEditDialog (kein Seitenwechsel) |
| Badge in anderen Formularen | EmployeeInfoBadge → EmployeeInfoBadgePreview |
| Im Detail-Dialog | TourInfoBadge (fullWidth), TeamInfoBadge (fullWidth) |
| Sub-Panel im Detail | EntityAppointmentsSidebarWithDialog, EmployeeAttachmentsPanel |
| Auswahl-Dialog | EmployeePickerDialogList (Board-Modus) |

---

### Termine

| Verwendungskontext | Komponenten |
|---|---|
| Terminliste (Hauptansicht) | ListLayout + TableView + AppointmentsFilterPanel |
| Tabellenzeile Hover | AppointmentWeeklyPanelPreview |
| Detailformular | EntityFormLayout (AppointmentForm) |
| Badge in Panels/Listen | TerminInfoBadge → AppointmentWeeklyPanelPreview |
| Kalenderansichten | WeekGrid, CalendarGrid (separate Logik, kein ListLayout) |

---

### Teams und Touren

| Verwendungskontext | Komponenten |
|---|---|
| Verwaltungsliste | ListLayout + BoardView + EntityCard (via TeamManagement/TourManagement) |
| Badge in Mitarbeiterkarte | TeamInfoBadge (sm) / TourInfoBadge (sm) → Preview mit Mitgliederliste |
| Badge im Mitarbeiter-Detail | TeamInfoBadge (fullWidth) / TourInfoBadge (fullWidth) |
| Bearbeitungsdialog | EntityEditDialog (team-edit-dialog, tour-edit-dialog) |
| Tour-Terminliste | TourAppointmentsTableDialog → AppointmentsListPage |

---

### Anhänge

| Verwendungskontext | Komponenten |
|---|---|
| Panel in Formular | AttachmentsPanel, ProjectAttachmentsPanel, CustomerAttachmentsPanel, EmployeeAttachmentsPanel |
| Einzelanzeige | AttachmentInfoBadge → AttachmentInfoBadgePreview (PDF/Bild/Word/Text) |

---

## 8. Regeln für Codex

**Diese Regeln gelten verbindlich für alle neuen Komponenten und Screen-Erweiterungen.**

1. **ListLayout ist Pflicht** für jeden neuen Listen-Screen. Keine eigenständigen Seitenrahmen erfinden.

2. **BoardView oder TableView** sind die einzigen erlaubten Content-Slots in ListLayout. Keine eigenen Grid-Implementierungen.

3. **Neue fachliche Badges** entstehen immer als Ableitung von `PersonInfoBadge`, `ColoredInfoBadge` oder direkt `InfoBadge`. Kein eigenes Badge-Layout.

4. **Neue Previews** müssen das `InfoBadgePreview`-Objekt zurückgeben (`{ content, options }`) und via `createXxxPreview()`-Fabrikfunktion erzeugt werden.

5. **FilterPanel ist Pflicht** als Basis für alle neuen Filter-Bereiche. Keine eigenständigen Filterzeilen.

6. **EntityCard** für alle Karten in BoardView. Keine eigenen Karten-Layouts.

7. **EntityEditDialog** für modale Bearbeitungsmasken ohne Seitenwechsel. **EntityFormLayout** für Vollseiten-Formulare.

8. **footerVisibility bei EntityCard:** Standardmäßig ist der Footer versteckt. Wenn er sichtbar sein soll, muss `footerVisibility="visible"` explizit gesetzt werden.

9. **Keine neue Preview-Datei ohne Fabrikfunktion.** Jede Preview-Komponente braucht eine zugehörige `createXxxPreview(props): InfoBadgePreview`-Funktion.

10. **Dieses Dokument nachpflegen** bei jeder neuen Komponente, die das System erweitert.

---

## 9. Bekannte offene Punkte

- `appointment-info-badge-preview.tsx` existiert, ist aber nirgends angebunden. Vor erneutem Einsatz klären, ob sie `appointment-weekly-panel-preview` ersetzen oder ergänzen soll.
- `colored-entity-card.tsx`, `relation-slot.tsx`, `sidebar-child-panel.tsx`, `members-section-header.tsx`, `customer-detail-card.tsx`, `project-detail-card.tsx` sind im Code vorhanden, aber noch nicht in dieser Referenz dokumentiert. Verwendung und Status prüfen.

---

*Dokument basiert auf Code-Analyse von `client/src/components/` in version01, Stand Februar 2026.*
