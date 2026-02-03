# UI Komponenten

NHALT

1. App-Shell, Navigation, View-Steuerung
2. Zentrale Schablonen / Layout-Bausteine
3. Badge-System (InfoBadge-Familie) + Vererbung + Fundstellen
4. Haupt-Navigationspunkte – je View: Layout, Schablonen, Karten, Badges, Konsistenz
5. Refactoring-Landkarte (wo lohnt Standardisierung am meisten)

────────────────────────────────────────────────────────────────────

1. APP-SHELL, NAVIGATION, VIEW-STEUERUNG
    
    ────────────────────────────────────────────────────────────────────
    

1.1 Zentrale Shell / View-Mechanik

- Datei: client/src/pages/Home.tsx
- Pattern:
    - Kein klassisches URL-Routing pro Seite, sondern ViewType im State.
    - Sidebar feuert onViewChange(ViewType).
    - Home rendert abhängig vom ViewType die jeweilige Ansicht.

1.2 Haupt-Navigationspunkte (Sidebar)

- Datei: client/src/components/Sidebar.tsx
- Gruppen und Views:
    
    ZEIT / ÜBERSICHT
    
    - Wochenübersicht -> weeklyProjects
    - Monatsübersicht -> month
    - Jahresübersicht -> year
    - Termine -> week
    
    STAMMDATEN
    
    - Projekte -> projectList
    - Kunden -> customerList
    - Mitarbeiter -> employees
    - Mitarbeiter Wochenansicht -> employeeWeekly
    
    ORGANISATION
    
    - Touren -> tours
    - Teams -> teams
    
    ADMINISTRATION
    
    - Notiz Vorlagen -> noteTemplates
    - Projekt Status -> projectStatus
    - Hilfetexte -> helpTexts
    - Einstellungen -> (disabled)

1.3 Zeitnavigation (Prev/Next)

- Implementiert in Home.tsx
- Aktiv für: month / week / year
- Year: springt in 12-Monats-Schritten (addMonths/subMonths um 12)

Hinweis (Architektur)

- Home.tsx ist das zentrale „View-Gehirn“ und wächst mit jeder neuen Ansicht.
- Kandidat: später View-Registry (Mapping ViewType -> Component + Meta wie „zeigt Zeitnavigation ja/nein“).

────────────────────────────────────────────────────────────────────

2) ZENTRALE SCHABLONEN / LAYOUT-BAUSTEINE (MIT VERERBUNG)

────────────────────────────────────────────────────────────────────

2.1 CardListLayout (Listenansichten)

- Datei: client/src/components/ui/card-list-layout.tsx
- Zweck:
    - Einheitliches Grundgerüst für „Liste + Header + Aktionen + Grid + Empty/Loading“.
- Bestandteile:
    - Header (Icon, Titel, optional HelpPopover über helpKey)
    - Optional toolbar (freie Zone für Search/Filter-UI)
    - Actions (Primary/Secondary Buttons)
    - Empty State / Loading State
    - Grid-Container (gridCols, gridTestId)
    - Optional bottomBar (z.B. Filterbereich)

2.2 FilteredCardListLayout (Spezialisierung für Filter unten)

- Datei: client/src/components/ui/filtered-card-list-layout.tsx
- Beziehung:
    - Baut auf CardListLayout auf und kapselt bottomBar als „Filter“-Zeile.
- Nutzen:
    - Einheitliche Filterdarstellung (Icon + Label + Controls).

2.3 EntityCard (Standard-Karten-Schablone)

- Datei: client/src/components/ui/entity-card.tsx
- Zweck:
    - Einheitliches Card-Design: Header + Content + Footer.
- Typische Nutzung:
    - Header: Icon + Titel + optional Delete (X)
    - Footer: Edit-Button (rechts)
- Wichtig:
    - Sicherheitsabfragen (Confirm Delete) passieren nicht in EntityCard,
        
        sondern in der aufrufenden Page/Komponente.
        

2.4 ColoredEntityCard (EntityCard mit farbigem Rand)

- Datei: client/src/components/ui/colored-entity-card.tsx
- Vererbung:
    - ColoredEntityCard -> EntityCard
- Zweck:
    - Farb-Codierung (Team/Tour/Status/Notizvorlage).

2.5 EntityFormLayout (Formular-Schablone)

- Datei: client/src/components/ui/entity-form-layout.tsx
- Zweck:
    - Einheitlicher Form-Container mit Header (Titel/Icon) und Body (Grid).
    - Unterstützt testIdPrefix.

2.6 EntityEditDialog (Dialog-Schablone)

- Datei: client/src/components/ui/entity-edit-dialog.tsx
- Zweck:
    - Standarddialog mit Titel/Icon, Content, Footer-Actions (Save/Cancel).

2.7 ColorSelectEntityEditDialog (Dialog + Farbauswahl)

- Datei: client/src/components/ui/color-select-entity-edit-dialog.tsx
- Vererbung:
    - ColorSelectEntityEditDialog -> EntityEditDialog
- Zweck:
    - Farbauswahl als Standardfunktion (Notizvorlage, Projektstatus, Team/Tour via Spezialisierung).

2.8 EmployeeSelectEntityEditDialog (Dialog für Member-Zuordnung)

- Datei: client/src/components/ui/employee-select-entity-edit-dialog.tsx
- Vererbung:
    - EmployeeSelectEntityEditDialog
        
        -> ColorSelectEntityEditDialog
        
        -> EntityEditDialog
        
- Zweck:
    - Mitgliederliste (Badges) + „Hinzufügen“ via EmployeeListView im Picker-Mode.
    - Enthält Logik: „Assigned elsewhere“ wird gefiltert (Team/Tour-Regel).

2.9 sub-panel (Style-Pattern, kein Component)

- Definition: client/src/index.css (CSS-Klasse .sub-panel)
- Zweck:
    - Einheitliches rechtes Panel-Design (Padding/Border/Background/Rounded).
- Nutzung:
    - ProjectStatusSection, LinkedProjectsPanel, Panels im ProjectForm etc.
- Kandidat:
    - SubPanel als React-Komponente wäre sinnvoll (Header/Actions standardisieren).

────────────────────────────────────────────────────────────────────

3) BADGE-SYSTEM (INFOBADGE-FAMILIE) – VERERBUNG + FUNDSTELLEN

────────────────────────────────────────────────────────────────────

3.1 Basis: InfoBadge

- Datei: client/src/components/ui/info-badge.tsx
- Funktion:
    - Standard-Badge mit icon/label, optional action (remove/none), optional onRemove
    - Größen (sm/md/lg), optional fullWidth, testId

3.2 ColoredInfoBadge

- Datei: client/src/components/ui/colored-info-badge.tsx
- Vererbung:
    - ColoredInfoBadge -> InfoBadge
- Zweck:
    - Farb-Codierung (Tour/Team/Status etc.)

3.3 PersonInfoBadge

- Datei: client/src/components/ui/person-info-badge.tsx
- Vererbung:
    - PersonInfoBadge -> InfoBadge
- Zweck:
    - Avatar/Initialen + optional zweite Zeile

3.4 EmployeeInfoBadge

- Datei: client/src/components/ui/employee-info-badge.tsx
- Vererbung:
    - EmployeeInfoBadge -> PersonInfoBadge -> InfoBadge
- Zweck:
    - Mitarbeiter-Badge standardisiert (Name/Avatar + optional Details)

3.5 CustomerInfoBadge

- Datei: client/src/components/ui/customer-info-badge.tsx
- Vererbung:
    - CustomerInfoBadge -> PersonInfoBadge -> InfoBadge
- Status im Snapshot:
    - Implementiert, aber praktisch nicht in Views verwendet.

3.6 ProjectInfoBadge

- Datei: client/src/components/ui/project-info-badge.tsx
- Vererbung:
    - ProjectInfoBadge -> InfoBadge
- Status im Snapshot:
    - Implementiert, aber praktisch nicht in Views verwendet.

3.7 Badge-Fundstellen (wo genau wird was angezeigt?)

A) Tour/Team-Zuordnung auf Mitarbeiterkarten und im Mitarbeiterdialog

- Mitarbeiterkarten (EmployeeListView):
    - 2 Mini-Badges: Tour + Team
    - Typ: ColoredInfoBadge (size="sm")
- Mitarbeiter-Detaildialog:
    - Tour/Team als große, read-only Badges
    - Typ: ColoredInfoBadge (fullWidth)

B) Mitarbeiterlisten in Tour/Team-Karten und -Dialogen

- Tour-Karten / Team-Karten:
    - Mitglieder als read-only Badges
    - Typ: EmployeeInfoBadge (action="none", size="sm")
- Tour/Team-Editdialog:
    - Mitglieder als entfernbare Badges
    - Typ: EmployeeInfoBadge (action="remove")

C) Projektstatus

- Projektformular (ProjectStatusSection):
    - Status als Badges + remove
    - Typ: ColoredInfoBadge
- Kundenformular, verknüpfte Projekte:
    - Status je Projekt als Badge-Liste
    - Typ: ColoredInfoBadge (size="sm", fullWidth)

D) Inkonsistente „Inaktiv“-Darstellung (sehr wichtig)

- Teilweise Shadcn Badge
- Teilweise simples <span> + opacity
- Teilweise nur opacity-60 ohne echtes Badge

────────────────────────────────────────────────────────────────────

4) HAUPT-NAVIGATIONSPUNKTE – JE VIEW EINHEITLICHES SCHEMA

────────────────────────────────────────────────────────────────────

Zur Lesbarkeit nutze ich pro View immer das gleiche Raster:

- Komponente / Datei
- Layout der Ansicht
- Schablonen / Patterns
- Karten-Schablonen
- Badges / Labels
- Konsistenzbewertung
- Refactoring-Hinweise

────────────────────────────────────────

4.1 Wochenübersicht (weeklyProjects)

────────────────────────────────────────

Komponente / Datei

- client/src/components/WeeklyProjectView.tsx (Demo)

Layout der Ansicht

- Vollbild-Overlay-Stil (Card + Header + Close)
- Kein CardListLayout

Schablonen / Patterns

- Demo-Daten lokal
- Overlays/Dropdowns mit Portal-Pattern
- Teilweise HTML-Inhalt per dangerouslySetInnerHTML

Karten-Schablonen

- Projekt-Darstellung als eigene Div-Card-Struktur (nicht EntityCard)

Badges / Labels

- Status/Marker eher als eigene Labels (nicht InfoBadge-Familie)

Konsistenzbewertung

- Für Demo ok, aber nicht kompatibel zur Standard-UI-Linie (EntityCard/InfoBadge)

Refactoring-Hinweise

- Wenn produktiv:
    - Projektkarten auf EntityCard/ColoredEntityCard umstellen
    - Status auf ColoredInfoBadge standardisieren

────────────────────────────────────────

4.2 Monatsübersicht (month)

────────────────────────────────────────

Komponente / Datei

- client/src/components/CalendarGrid.tsx (Demo)

Layout der Ansicht

- Kalender-Monatsgrid mit Overlays/Tooltips
- Optional MapOverlay

Schablonen / Patterns

- DemoAppointments lokal
- date-fns für Kalenderlogik
- Portal für Overlays

Karten-Schablonen

- Termine als eigene UI-Blöcke (keine EntityCard)

Badges / Labels

- MapOverlay nutzt Shadcn Badge (nicht InfoBadge)

Konsistenzbewertung

- Badge-Linie ist getrennt von Tour/Team/Status-Standard (InfoBadge)

Refactoring-Hinweise

- Kandidat: AppointmentCard-Schablone + standardisierte Badge-Nutzung

────────────────────────────────────────

4.3 Jahresübersicht (year)

────────────────────────────────────────

Komponente / Datei

- In Home.tsx (renderYearView), keine separate Datei

Layout der Ansicht

- Year-Grid aus Mini-Month-Kacheln

Schablonen / Patterns

- Direkt im Home (kein Wiederverwendungs-Template)

Karten-Schablonen

- Keine klassischen Karten

Badges / Labels

- Keine

Konsistenzbewertung

- Funktional ok, aber Home wird sehr groß

Refactoring-Hinweise

- YearView aus Home.tsx auslagern (Komponente)
- Optional MiniMonth als Sub-Komponente

────────────────────────────────────────

4.4 Termine (week)

────────────────────────────────────────

Komponente / Datei

- client/src/components/WeekGrid.tsx (Demo)

Layout der Ansicht

- Wochenraster (Termine im Grid)
- MapOverlay möglich

Schablonen / Patterns

- DemoAppointments lokal
- Portal für Overlays
- date-fns

Karten-Schablonen

- Termine als eigene UI-Blöcke (keine EntityCard)

Badges / Labels

- MapOverlay Shadcn Badge

Konsistenzbewertung

- Gleiches Thema wie Monat: getrennte UI-Linie

Refactoring-Hinweise

- AppointmentCard-Schablone, gemeinsame Badge-Regeln

────────────────────────────────────────

4.5 Projekte (projectList / project)

────────────────────────────────────────

A) Projektliste (projectList)

Komponente / Datei

- client/src/components/ProjectList.tsx

Layout der Ansicht

- FilteredCardListLayout (basiert auf CardListLayout)

Schablonen / Patterns

- Filterlogik gekapselt (lib/project-filters)

Karten-Schablonen

- EntityCard (Projekt als Karte)

Badges / Labels

- „Inaktiv“ wird teils als Shadcn Badge angezeigt (je nach Datenlage)

Konsistenzbewertung

- Liste ist sauber im Standard-Pattern (CardListLayout + EntityCard)
- Inaktiv-Label ist nicht überall gleich

Refactoring-Hinweise

- Inaktiv-Label standardisieren (siehe Refactoring-Landkarte)

B) Projektformular (project)

Komponente / Datei

- client/src/components/ProjectForm.tsx

Layout der Ansicht

- EntityFormLayout
- 3-Spalten-Grid (links Form, rechts Panels)

Schablonen / Patterns

- Kundenauswahl: Dialog mit CustomerListView im Picker-Mode
- Notizen: NotesSection + RichTextEditor
- Status: ProjectStatusSection (sub-panel + ColoredInfoBadge)
- Dokumente: lokale DocumentCard + PreviewDialog (innerhalb ProjectForm)

Karten-Schablonen

- Form basiert auf EntityFormLayout
- Statuspanel ist sub-panel Pattern
- Dokumente: eigene Mini-Karten

Badges / Labels

- Projektstatus: ColoredInfoBadge (mit remove)

Konsistenzbewertung

- Formular sehr nah am Standard
- Dokumente/Termine noch als Sonderpfad (ok, aber später auslagerbar)

Refactoring-Hinweise

- DocumentCard/PreviewDialog aus ProjectForm extrahieren (bei Bedarf)
- Terminpanel später an Appointment-Schablone angleichen

────────────────────────────────────────

4.6 Kunden (customerList / customer)

────────────────────────────────────────

A) Kundenliste (customerList)

Komponente / Datei

- client/src/components/CustomerList.tsx

Layout der Ansicht

- FilteredCardListLayout

Karten-Schablonen

- EntityCard

Badges / Labels

- Keine InfoBadge-Nutzung in der Liste

Konsistenzbewertung

- Sehr sauber, Standardlinie

Refactoring-Hinweise

- CustomerInfoBadge existiert, könnte für Referenzen/Verknüpfungen sinnvoll sein

B) Kundenformular (customer)

Komponente / Datei

- client/src/components/CustomerData.tsx

Layout der Ansicht

- EntityFormLayout, 3-Spalten-Grid
- Rechts: LinkedProjectsPanel (sub-panel) + Termine (Demo)

Schablonen / Patterns

- NotesSection wie im Projekt
- LinkedProjectsPanel lädt echte Daten (Projekte + Status)

Karten-Schablonen

- LinkedProjectCard ist eigene Card-Struktur (keine EntityCard)
- Panel ist sub-panel Pattern

Badges / Labels

- Projektstatus je verknüpftem Projekt: ColoredInfoBadge

Konsistenzbewertung

- Status-Badges konsistent (ColoredInfoBadge)
- Projekt-Kärtchen sind eigene UI (nicht schlimm, aber nicht Standard)

Refactoring-Hinweise

- LinkedProjectCard könnte (wenn gewünscht) auf EntityCard/ColoredEntityCard standardisiert werden
- Termine-Demo später vereinheitlichen

────────────────────────────────────────

4.7 Mitarbeiter (employees)

────────────────────────────────────────

Komponente / Datei

- client/src/components/EmployeePage.tsx (Liste + Detaildialog)
- Liste: EmployeeListView (intern)

Layout der Ansicht

- Liste: FilteredCardListLayout
- Detail: EntityEditDialog

Schablonen / Patterns

- List/Pickers: mode list vs picker (wie CustomerListView)
- Detaildialog standardisiert über EntityEditDialog

Karten-Schablonen

- Liste: EntityCard

Badges / Labels

- Mitarbeiterkarte: zwei Mini-Badges für Tour und Team
    - Typ: ColoredInfoBadge (sm)
- Detaildialog: Tour/Team als read-only Badges
    - Typ: ColoredInfoBadge (fullWidth)
- Inaktiv:
    - Shadcn Badge oder ähnliche Darstellung

Konsistenzbewertung

- Tour/Team-Badges sind hier konsistent (ColoredInfoBadge)
- Inaktiv-Status ist nicht global konsistent

Refactoring-Hinweise

- Einheitliche Inaktiv-Strategie (eine Badge-Art für alle Entities)

────────────────────────────────────────

4.8 Mitarbeiter Wochenansicht (employeeWeekly)

────────────────────────────────────────

Komponente / Datei

- client/src/components/EmployeeWeeklyView.tsx (Demo)

Layout der Ansicht

- Vollbild-Overlay

Badges / Labels

- Shadcn Badge, nicht InfoBadge

Refactoring-Hinweise

- Bei Produktivsetzung: Appointment-Schablone + Badge-Standard

────────────────────────────────────────

4.9 Touren (tours)

────────────────────────────────────────

Komponente / Datei

- client/src/components/TourManagement.tsx

Layout der Ansicht

- CardListLayout (Grid)

Schablonen / Patterns

- Edit/Create: TourEditDialog nutzt EmployeeSelectEntityEditDialog-Kette

Karten-Schablonen

- ColoredEntityCard (Randfarbe = Tourfarbe)

Badges / Labels

- Mitglieder in Tour-Karte: EmployeeInfoBadge (read-only)
- Mitglieder im Editdialog: EmployeeInfoBadge (remove)

Konsistenzbewertung

- Sehr sauber und vorbildlich:
    - Karten read-only Badges
    - Editdialog remove Badges
    - Farb-Codierung über ColoredEntityCard

Refactoring-Hinweise

- Dieser Bereich kann als Referenz für „so soll es überall sein“ dienen.

────────────────────────────────────────

4.10 Teams (teams)

────────────────────────────────────────

Komponente / Datei

- client/src/components/TeamManagement.tsx

Layout / Schablonen / Karten / Badges

- Praktisch identisch zu Touren:
    - CardListLayout
    - ColoredEntityCard
    - EmployeeInfoBadge read-only / remove im Dialog

Konsistenzbewertung

- Ebenfalls sehr sauber und konsistent.

────────────────────────────────────────

4.11 Notiz Vorlagen (noteTemplates)

────────────────────────────────────────

Komponente / Datei

- client/src/components/NoteTemplatesPage.tsx

Layout der Ansicht

- CardListLayout

Karten-Schablonen

- ColoredEntityCard (Randfarbe = Templatefarbe)

Schablonen / Patterns

- Edit/Create: ColorSelectEntityEditDialog
- Text: RichTextEditor

Badges / Labels

- Inaktiv wird als simples Text-Label (<span>) + opacity dargestellt
    - NICHT als Shadcn Badge
    - NICHT als InfoBadge

Konsistenzbewertung

- Kartenlinie konsistent (ColoredEntityCard)
- Inaktiv-Darstellung weicht ab (Sonderlösung)

Refactoring-Hinweise

- Inaktiv-Label auf globale Standardlösung umstellen

────────────────────────────────────────

4.12 Projekt Status (projectStatus)

────────────────────────────────────────

Komponenten / Dateien

- client/src/components/ProjectStatusPage.tsx
- client/src/components/ProjectStatusList.tsx
- client/src/components/ui/project-status-edit-dialog.tsx
- client/src/components/ProjectStatusSection.tsx (im Projektformular)

Layout der Ansicht

- Verwaltung: CardListLayout + Grid
- Zuweisung im Projekt: sub-panel + Badge-Liste

Karten-Schablonen

- Verwaltung: ColoredEntityCard

Badges / Labels

- Projektformular: ColoredInfoBadge (mit remove)

Konsistenzbewertung

- Sehr gute, klare Linie:
    - Verwaltung = farbige Karten
    - Zuweisung = farbige Badges

────────────────────────────────────────

4.13 Hilfetexte (helpTexts)

────────────────────────────────────────

Komponente / Datei

- client/src/components/HelpTextsPage.tsx

Layout der Ansicht

- CardListLayout, 2 Spalten

Karten-Schablonen

- EntityCard

Badges / Labels

- Inaktiv: Shadcn Badge (secondary)

Konsistenzbewertung

- Liste/Karten standardisiert, Inaktiv-Label weicht aber von Notizvorlagen ab

Refactoring-Hinweise

- Inaktiv-Standard global festlegen