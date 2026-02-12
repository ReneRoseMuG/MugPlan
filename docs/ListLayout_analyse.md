# ListLayout Analyse

## Pflichtbestätigung
architecture.md und rules.md gelesen und verstanden.

## 1. Analyse von `CardListLayout`
Datei: `client/src/components/ui/card-list-layout.tsx`

### Öffentliche API
`CardListLayoutProps`:

| Prop | Typ | Optional | Default | Zweck |
|---|---|---:|---|---|
| `title` | `string` | nein | - | Titeltext im Header |
| `icon` | `ReactNode` | nein | - | Icon im Header |
| `children` | `ReactNode` | nein | - | Karteninhalt im Grid |
| `isLoading` | `boolean` | ja | `false` | Zeigt zentrierten Spinner statt Layout |
| `onClose` | `() => void` | ja | - | Schließen-Handler |
| `showCloseButton` | `boolean` | ja | `true` | Blendet Close-Button ein/aus |
| `closeTestId` | `string` | ja | - | Test-ID für Close-Button |
| `primaryAction` | `{ label: string; onClick: () => void; isPending?: boolean; testId?: string }` | ja | - | Primäre Footer-Aktion (Plus/Spinner) |
| `secondaryAction` | `{ label: string; onClick: () => void; testId?: string }` | ja | - | Sekundäre Footer-Aktion |
| `gridTestId` | `string` | ja | - | Test-ID für Grid-Container |
| `gridCols` | `"2" | "3"` | ja | `"3"` | Modus für Grid-Spaltenlogik |
| `emptyState` | `ReactNode` | ja | - | Empty-State-UI |
| `isEmpty` | `boolean` | ja | `false` | Schaltet zwischen `emptyState` und `children` |
| `toolbar` | `ReactNode` | ja | - | Bereich oberhalb des Grids |
| `bottomBar` | `ReactNode` | ja | - | Bereich zwischen Content und Action-Footer |
| `helpKey` | `string` | ja | - | Aktiviert Help-Icon neben Titel |

### Interne Struktur
- Renderstruktur:
  1. `isLoading`-Branch: zentrierte `Card` mit `Loader2`.
  2. Normal-Branch: äußere `Card` als vertikaler Flex-Container.
  3. Header (`CardHeader`) mit Titel/Icon, optional `HelpIcon`, optional Close-Button.
  4. Content-Bereich mit optional `toolbar` und Grid.
  5. Optional `bottomBar`.
  6. Optional Action-Footer (`primaryAction`/`secondaryAction`).
- Header-Aufbau: Titel + Icon sind fix, Help hängt an `helpKey`, Close hängt an `onClose && showCloseButton`.
- HelpKey-Integration: `{helpKey && <HelpIcon helpKey={helpKey} />}`.
- BottomBar-Integration: eigener Section-Container mit Top-Border vor Action-Footer.

### Interner State / Hooks / Context
- `useState`: keiner.
- `useEffect`: keiner.
- `useMemo`: keiner in der Komponente.
- Context: indirekt über `useSetting("cardListColumns")` aus `SettingsProvider` (`client/src/providers/SettingsProvider.tsx`).

### Abhängigkeiten
- UI-Komponenten: `Card`, `CardHeader`, `CardTitle`, `Button`, `HelpIcon`.
- Hook: `useSetting`.
- Icons: `X`, `Plus`, `Loader2`.
- Filter-Komponenten: keine direkte Abhängigkeit.
- Styling-System: Tailwind Utility-Klassen, responsive Grid-Klassen.

### ViewMode-ähnliche Logik
- Kein expliziter `viewMode` (z. B. board/table).
- Implizite Variantenlogik vorhanden:
  - `gridCols="2"` erzwingt 2-Spalten-Profil.
  - `gridCols="3"` nutzt dynamische Spalten aus Setting `cardListColumns` (2..6, Fallback 4).
  - `isLoading`, `isEmpty`, `toolbar`, `bottomBar`, Actions steuern strukturelle Varianten.

### Struktur vs. implizite Logik
- Überwiegend strukturell.
- Enthält aber implizite Layout-Logik:
  - dynamische Spaltenauflösung aus Settings,
  - konditionale Layout-Zweige (Loading/Empty/Footer-Bereiche).

## 2. Analyse von `FilteredCardListLayout`
Datei: `client/src/components/ui/filtered-card-list-layout.tsx`

### Filter-Einbindung
- Props-Typ: `Omit<ComponentProps<typeof CardListLayout>, "bottomBar"> & { filters?: ReactNode }`.
- `filters` wird in eine lokal erzeugte `bottomBar` übersetzt (Titelzeile mit Filter-Icon + Filter-Slot).
- Übergibt alles via `<CardListLayout {...props} bottomBar={bottomBar} />`.

### Logikbewertung
- Keine Filterlogik (kein Filtern von Daten, keine Query, kein Filter-State).
- Rein strukturelle Adapter-Komponente.
- Entkopplung vom Layout grundsätzlich möglich, da nur Komposition von Slots erfolgt.

### Query/State
- Query-Zugriffe: keine.
- `useState`/`useEffect`/`useMemo`: keine.

## 3. Verwendungsstellen von `CardListLayout` und `FilteredCardListLayout`

| Datei | Komponente | Layout-Typ | Navigations-Screen oder Dialog | Übergebene Kern-Props | Filter | HelpKey | BottomBar | Varianten |
|---|---|---|---|---|---|---|---|---|
| `client/src/components/CustomerList.tsx` | `CustomerListView` | `FilteredCardListLayout` | Beides: Navigation (`Home`) und Dialog-Picker (`ProjectForm`) | `title`, `icon`, `isLoading`, `onClose`, `showCloseButton`, `closeTestId`, `gridTestId`, `gridCols`, `primaryAction`, `secondaryAction`, `isEmpty`, `emptyState`, `filters` | ja (`CustomerFilterPanel`) | `customers` | indirekt (durch `Filtered...`) | `mode: list/picker` steuert Verhalten der Cards |
| `client/src/components/ProjectList.tsx` | `ProjectListView` | `FilteredCardListLayout` | Beides: Navigation (`Home`) und Dialog-Picker (`AppointmentForm`) | wie oben plus statusbezogene Filter-Props im `filters`-Node | ja (`ProjectFilterPanel`) | `projects` | indirekt | `mode: list/picker` |
| `client/src/components/EmployeeList.tsx` | `EmployeeListView` | `FilteredCardListLayout` | Beides: Seite (`EmployeePage`) und Dialog-Picker (`AppointmentForm`, `EmployeeSelectEntityEditDialog`) | `title`, `icon`, `isLoading`, `onClose`, `showCloseButton`, `grid*`, `primaryAction`, `isEmpty`, `emptyState`, `filters` | ja (`EmployeeFilterPanel`) | `employees` | indirekt | `mode: list/picker`, optional `employeeScope` |
| `client/src/components/HelpTextsPage.tsx` | `HelpTextsPage` | `CardListLayout` | Navigation (Home-View `helpTexts`) | `title`, `icon`, `isLoading`, `gridTestId`, `gridCols`, `toolbar`, `primaryAction`, `isEmpty`, `emptyState` | nein (Toolbar-Suche) | nein | nein | Such-Toolbar statt Filter-Bar |
| `client/src/components/TourManagement.tsx` | `TourManagement` | `CardListLayout` | Navigation (Home-View `tours`) | `title`, `icon`, `helpKey`, `isLoading`, `onClose`, `closeTestId`, `gridTestId`, `gridCols`, `primaryAction`, `secondaryAction` | nein | `tours` | nein | Verwaltung + Dialogbearbeitung |
| `client/src/components/TeamManagement.tsx` | `TeamManagement` | `CardListLayout` | Navigation (Home-View `teams`) | analog TourManagement | nein | `teams` | nein | Verwaltung + Dialogbearbeitung |
| `client/src/components/NoteTemplatesPage.tsx` | `NoteTemplatesPage` | `CardListLayout` | Navigation (Home-View `noteTemplates`) | `title`, `icon`, `helpKey`, `isLoading`, `gridTestId`, `gridCols`, `primaryAction`, `isEmpty`, `emptyState` | nein | `note-templates` | nein | Listenseite mit Bearbeitungsdialog |
| `client/src/components/ProjectStatusList.tsx` | `ProjectStatusListView` | `CardListLayout` | Beides: Navigation (`ProjectStatusPage`) und Dialog (`ProjectStatusPanel`, `ProjectStatusPickerDialog`) | `title`, `icon`, `helpKey`, `isLoading`, `onClose`, `closeTestId`, `gridTestId`, `gridCols`, `primaryAction`, `secondaryAction`, `isEmpty`, `emptyState` | nein | variabel (`helpKey` Prop) | nein | `mode: list/picker` |

## 4. Dialog-Analyse
Dialoge, die (direkt oder indirekt) `CardListLayout`/`FilteredCardListLayout` rendern:

| Dateipfad | Dialogzweck | Gerenderte Liste/Layout | Übergebene Props ans Layout (indirekt über Liste) | View-Variante implizit? | Eigene Dialog-State-Logik für Darstellung | Kapselt Dialog Layout-Logik? |
|---|---|---|---|---|---|---|
| `client/src/components/ProjectForm.tsx` | Kundenauswahl im Projektformular | `CustomerList` -> `FilteredCardListLayout` | `mode="picker"`, `selectedCustomerId`, `showCloseButton={false}`, `title`, `onSelectCustomer`, `onCancel` | ja (`picker`) | ja (`customerDialogOpen`, Auswahl schließt Dialog) | nein, Dialog ist Container; Layoutlogik bleibt in Liste/Layout |
| `client/src/components/AppointmentForm.tsx` | Projektwahl für Termin | `ProjectList` -> `FilteredCardListLayout` | `mode="picker"`, `selectedProjectId`, `showCloseButton={false}`, `title`, `onSelectProject`, `onCancel` | ja | ja (`projectPickerOpen`) | nein |
| `client/src/components/AppointmentForm.tsx` | Mitarbeiterauswahl für Termin | `EmployeeListView` -> `FilteredCardListLayout` | `employees`, `allEmployeesForBadgePreview`, `teams`, `tours`, `isLoading`, `mode="picker"`, `showCloseButton={false}`, `title`, `onSelectEmployee`, `onClose` | ja | ja (`employeePickerOpen`) | nein |
| `client/src/components/ui/employee-select-entity-edit-dialog.tsx` | Mitarbeiterauswahl für Team/Tour | `EmployeeListView` -> `FilteredCardListLayout` | `mode="picker"`, `employees`, `teams={[]}`, `tours={[]}`, `showCloseButton={false}`, `title`, `onSelectEmployee`, `onClose` | ja | ja (`selectionDialogOpen`) | nein |
| `client/src/components/ProjectStatusPanel.tsx` | Status hinzufügen im Projekt-Sidepanel | `ProjectStatusListView` -> `CardListLayout` | `statuses`, `isLoading`, `mode="picker"`, `onSelectStatus`, `title`, `helpKey`, `onCancel` | ja | ja (`dialogOpen`) | nein |
| `client/src/components/ui/project-status-picker-dialog.tsx` | Generischer Projektstatus-Picker | `ProjectStatusList` -> `CardListLayout` | `mode="picker"`, `selectedStatusId`, `onSelectStatus`, `helpKey` | ja | ja (`open`/`onOpenChange` von außen) | nein |

Bewertung: Dialoge kapseln primär Öffnen/Schließen/Selektion, nicht die Layout-Struktur selbst.

## 5. Analyse der Filterstruktur
Untersuchte Dateien:
- `client/src/components/ui/search-filter-input.tsx`
- `client/src/components/ui/filter-input.tsx`
- `client/src/components/filters/boolean-toggle-filter-input.tsx`
- `client/src/components/ui/filter-panels/project-filter-panel.tsx`
- `client/src/components/ui/filter-panels/employee-filter-panel.tsx`
- ergänzend: `client/src/components/ui/filter-panels/customer-filter-panel.tsx`
- ergänzend: `client/src/lib/customer-filters.ts`, `client/src/lib/project-filters.ts`, `client/src/lib/employee-filters.ts`

### Ergebnis
- Kein zentrales, globales Filtersystem (kein gemeinsamer Filter-Store/Context/Registry).
- Gemeinsame UI-Bausteine vorhanden:
  - `FilterInput` (Text/Numeric, Clear-Button),
  - `SearchFilterInput` (Placeholder-Convention),
  - `BooleanToggleFilterInput`,
  - `FilterPanel` (Row/Stack-Layout).
- Filterzustand liegt in den Listen-Screens (`useState` in `CustomerListView`, `EmployeeListView`, `ProjectList`).
- Filterlogik:
  - lokal per `apply*Filters(...)` in `client/src/lib/*-filters.ts`,
  - teilweise zusätzlich serverseitig über Query-Parameter (`ProjectList`: `scope`, `statusIds`).
- Query-Zugriffe innerhalb der Filterkomponenten selbst: keine.
- Projekt-/Mitarbeiter-Filterpanels sind strukturelle Kompositionen aus Eingabekomponenten; Datenzugriff bleibt außerhalb.
- Layout-Unabhängigkeit: weitgehend gegeben, weil Filter als `ReactNode`-Slot in `FilteredCardListLayout` übergeben werden.

## 6. Header- und Help-Integration
Untersuchte Dateien:
- `client/src/components/ui/help/help-icon.tsx`
- Header-Bereich in `client/src/components/ui/card-list-layout.tsx`

### Ergebnis
- Help ist nicht rein strukturell: `HelpIcon` enthält Datenzugriff via `useQuery` (`queryKey: ["/api/help-texts", helpKey]`).
- Seiteneffekte: Netzwerkzugriff (React Query), Cache-Verhalten (`staleTime` 5 Minuten).
- Steuerung:
  - Layout-gesteuert hinsichtlich Sichtbarkeit/Position (nur wenn `helpKey` gesetzt).
  - Screen-gesteuert hinsichtlich Inhalt (welcher `helpKey` übergeben wird).
- Zusätzlicher technischer Aspekt: `HelpIcon` rendert `helpText.body` per `dangerouslySetInnerHTML`.

## 7. `EntityCard`-Integration
Untersuchte Dateien:
- `client/src/components/ui/entity-card.tsx`
- `client/src/components/ui/colored-entity-card.tsx`

### Ergebnis
- Kartenkomponenten sind grundsätzlich layout-entkoppelt:
  - keine Grid-Berechnung,
  - keine Kenntnis von `CardListLayout`.
- Implizite Annahmen:
  - Karte ist als `flex flex-col` mit `flex-1`-Content gebaut und erwartet ausreichend Höhe/Breite vom Parent.
  - `cursor-pointer`, Hover-Styling, Header/Footer-Raster sind in der Card selbst festgelegt.
- `ColoredEntityCard` ist nur ein Stil-Wrapper um `EntityCard` (Border-Color).
- Keine direkten Abhängigkeiten auf Board/Table-Layouts.

## 8. Query- und Datenflussanalyse (Kunden, Projekte, Mitarbeiter, Hilfetexte)

### Kunden
- Liste: `client/src/components/CustomerList.tsx`
- Query: `useQuery({ queryKey: ['/api/customers'] })` in `CustomerList`.
- Filterzustand/Filterung: lokal in `CustomerListView`.
- Layoutdatenwissen: nein; `FilteredCardListLayout` bleibt strukturell.

### Projekte
- Liste: `client/src/components/ProjectList.tsx`
- Queries:
  - Projekte: dynamischer Key auf Basis `buildProjectFilterQueryParams(...)`.
  - Kunden: `['/api/customers']`.
  - Status: `['/api/project-status']`.
- Filterzustand: lokal (`filters`, `projectScope`), teilweise serverseitig (scope/statusIds), teilweise clientseitig (`applyProjectFilters`).
- Layoutdatenwissen: nein; Daten-/Filterlogik in Screen/View, nicht im Layout.

### Mitarbeiter
- Liste: `client/src/components/EmployeeList.tsx`
- Queries:
  - Mitarbeiter: `['/api/employees', { scope: employeeScope }]` mit eigener `queryFn`.
  - Tours: `['/api/tours']`.
  - Teams: `['/api/teams']`.
- Filterzustand: lokal (`filters`), Scope-State in `EmployeeList`.
- Layoutdatenwissen: nein.

### Hilfetexte
- Seite: `client/src/components/HelpTextsPage.tsx`
- Query: `['/api/help-texts', searchQuery]` mit eigener `queryFn`.
- Mutationen: Create/Update/Delete direkt in Seite.
- Layoutdatenwissen: nein.

### Zusatz: Help-Content
- `client/src/components/ui/help/help-icon.tsx` lädt Hilfetext separat via React Query.

Gesamtbewertung: React Query ist in Screen/Page/Dialog-Komponenten und in `HelpIcon`, nicht in `FilteredCardListLayout`; `CardListLayout` hat nur indirekten Settings-Zugriff (`useSetting`).

## 9. Bewertung der Migrationsfähigkeit
Zielstruktur: `ListLayout (Header + FilterSlot + ContentSlot)` + `BoardView` + `TableView`.

### Machbarkeit
- Ja, strukturell gut machbar.
- Bestehendes `CardListLayout` kann in klarere Slots zerlegt werden.
- `FilteredCardListLayout` ist bereits ein Adapter-Pattern und passt gut als Übergangsbaustein.

### Technische Hindernisse
- `CardListLayout` enthält aktuell sowohl Header als auch Grid-Berechnung und Action/Footer-Logik in einer Komponente.
- `helpKey` bindet `HelpIcon` (mit Query) direkt an Header; bei neuer Struktur sollte Help als expliziter Header-Slot oder deklarativer Header-Actions-Slot modelliert werden.
- `gridCols` + Setting `cardListColumns` ist auf Kartenansicht optimiert; TableView braucht anderes Responsiv-/Density-Modell.
- `mode="picker"`-Verhalten liegt in ListView-Komponenten, nicht im Layout; das ist gut, muss aber bei Board/Table konsistent gehalten werden.

### Voraussichtlich anzupassende Dateien
- Kernlayout:
  - `client/src/components/ui/card-list-layout.tsx`
  - `client/src/components/ui/filtered-card-list-layout.tsx`
- Direkte Nutzer von `CardListLayout`/`FilteredCardListLayout`:
  - `client/src/components/CustomerList.tsx`
  - `client/src/components/ProjectList.tsx`
  - `client/src/components/EmployeeList.tsx`
  - `client/src/components/HelpTextsPage.tsx`
  - `client/src/components/TourManagement.tsx`
  - `client/src/components/TeamManagement.tsx`
  - `client/src/components/NoteTemplatesPage.tsx`
  - `client/src/components/ProjectStatusList.tsx`
- Dialogeinbettungen (wegen Picker-Rendering und Größe):
  - `client/src/components/ProjectForm.tsx`
  - `client/src/components/AppointmentForm.tsx`
  - `client/src/components/ui/employee-select-entity-edit-dialog.tsx`
  - `client/src/components/ProjectStatusPanel.tsx`
  - `client/src/components/ui/project-status-picker-dialog.tsx`

### Geschätzter Umfang
- mittel bis hoch.
- Begründung: viele Aufrufer, mehrere Kontexte (Navigation + Picker-Dialoge), plus notwendige klare Trennung von Board/Table-Slots.

### Risiken
- Inkonsistente Footer-/Action-Darstellung zwischen Board und Table.
- Regressionen in Picker-Dialogen (Close-Verhalten, `showCloseButton`, Auswahl-UX).
- Unterschiede bei Empty-State/Grid-Spalten durch neue Slot-Struktur.
- Help-Verhalten (Query, Position, Alignment) kann bei Header-Neuschnitt leicht divergieren.
- Doppeltes Filtern (Server + Client) insbesondere bei Projekten muss bei TableView bewusst konsistent bleiben.

## 10. Kurzfazit
- Das aktuelle System ist bereits relativ nah an einer Slot-basierten Migration, weil Filter und Content in vielen Komponenten schon als separate Blöcke aufgebaut sind.
- Hauptarbeit liegt im Herauslösen der heute implizit kombinierten Verantwortung aus `CardListLayout` (Header, Grid, Footer, Help-Anker) in eine explizite `ListLayout`-API mit klaren View-Implementierungen.
