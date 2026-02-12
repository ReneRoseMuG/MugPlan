# Plan-Datei: Architektur-Refactor `ListLayout` + `BoardView` + `TableView`

## Bestätigung
`architecture.md` und `rules.md` gelesen und verstanden.

## Kurzfassung
Ziel ist ein reiner Struktur-Refactor der Listen-UI: `CardListLayout` wird in `ListLayout` (Shell) und `BoardView` (Grid-Rendering) zerlegt, ergänzt um eine neue generische `TableView`. Pro Screen wird ein persistierter `viewMode` (`board|table`) über das bestehende FT(18)-Settings-System eingeführt (Scope `USER`, Default `board`). Filterleisten werden vereinheitlicht, Kalender-Views werden nur strukturell im `ListLayout` gehostet, und ein neuer Screen „Terminliste“ wird als Board/Table-fähige Hülle vorbereitet (ohne fachliche Implementierung).

## 1. Zielarchitektur

## 1.1 `ListLayout` (neu)
- Verantwortung:
  - Rein struktureller Seitenrahmen (Header, optionaler Toggle, Content, optional Footer).
  - Keine Datenabfragen, keine Filterlogik, keine Board/Table-Implementierung.
  - Keine Domain-Regeln.
- Slots:
  - `HeaderSlot`: Titel, Icon, optional Help-Icon, optional Close.
  - `FilterSlot`: einheitliche Filter-BottomBar (optional).
  - `ContentSlot`: BoardView, TableView oder CalendarView.
  - `FooterSlot`: Action-Bar (Primary/Secondary etc., optional).
- Toggle-Integration:
  - Optionaler `viewModeToggle` im Header.
  - Toggle nur UI-Event + callback; Persistenz bleibt außerhalb (Screen-Container).

## 1.2 `BoardView` (neu, aus `CardListLayout` extrahiert)
- Verantwortung:
  - Grid-Darstellung für Karteninhalte.
  - `emptyState`-Rendering.
- Settings-Integration:
  - Nutzt `cardListColumns` über bestehendes `useSetting`.
  - Unterstützt weiterhin feste Override-Variante für 2-spaltige Sonderfälle.
- Action-Footer:
  - Nicht in `BoardView`, sondern ausschließlich über `ListLayout.FooterSlot`.
- Ergebnis:
  - Bisherige `CardListLayout`-Gridlogik wird isoliert, wiederverwendbar und ohne Shell-Verantwortung.

## 1.3 `TableView` (neu, generisch)
- Generische API:
  - `columns: TableColumnDef<T>[]`
  - `rows: T[]`
  - `rowKey: (row: T) => string | number`
- `TableColumnDef<T>`:
  - `id`, `header`, `accessor?`, `cell?`, `width?`, `minWidth?`, `align?`
  - `sortable?: boolean`, `sortAccessor?: (row:T)=>unknown`
- Cell-Renderer:
  - `cell?: (ctx: { row: T; value: unknown; rowIndex: number }) => ReactNode`
- Optional Sorting:
  - Controlled: `sortState`, `onSortChange`
  - Uncontrolled: `defaultSortState`
- Optional Row Actions:
  - `rowActions?: (row:T)=>ReactNode`
  - optionale Action-Spalte mit fixer Breite.
- Optional Sticky Header:
  - `stickyHeader?: boolean`
- Density-Modell:
  - `density?: "compact" | "comfortable"`
- Responsive:
  - Desktop: echte Tabelle.
  - Mobile: horizontales Scroll-Container-Verhalten, keine Domain-spezifische Card-Automatik im generischen Core.
- Abgrenzung:
  - Keine Domainspalten vordefiniert, keine API-Calls, keine Mutation-Logik.

## 2. Persistenzmodell `viewMode`

- Key-Konzept:
  - `<screenKey>.viewMode`, z. B.:
  - `customerList.viewMode`
  - `projectList.viewMode`
  - `employeeList.viewMode`
  - `helpTexts.viewMode`
  - `noteTemplates.viewMode`
  - `teamManagement.viewMode`
  - `tourManagement.viewMode`
  - `projectStatus.viewMode`
  - `appointmentList.viewMode` (neu)
- Werte:
  - Enum `"board" | "table"`
- Scope:
  - `USER` (nur), Default `"board"`.
- FT(18)-Integration:
  - Keine neuen Endpunkte, Nutzung von `/api/user-settings/resolved` und `PATCH /api/user-settings`.
  - Registry-Erweiterung um neue Keys mit `allowedScopes: ["USER"]`.
  - Frontend-Hooks-Typisierung (`useSettings`/`useSetting`) um neue Keys ergänzen.

## 3. Betroffene Screens und Dialoge

- Screens:
  - `CustomerList`
  - `ProjectList`
  - `EmployeeList`
  - `HelpTextsPage`
  - `NoteTemplatesPage`
  - `TeamManagement`
  - `TourManagement`
  - `ProjectStatusList`/`ProjectStatusPage`
  - Kalenderbereich in `Home` (`month|week|year`) nur strukturelles Hosting
  - Neuer Screen `AppointmentList` (Terminliste, strukturell)
- Dialoge mit eingebetteten Listen:
  - Projektformular: Kundenauswahl-Dialog (`CustomerList` picker)
  - Terminformular: Projekt- und Mitarbeiterauswahl (`ProjectList`, `EmployeeListView` picker)
  - Team/Tour-Dialog: Mitarbeiterauswahl (`EmployeeListView` picker)
  - Projektstatus-Dialog im Panel (`ProjectStatusListView` picker)

## 4. Migrationsstrategie

1. Foundation
- `ListLayout`, `BoardView`, `TableView` einführen.
- `CardListLayout` als temporärer Kompatibilitäts-Wrapper auf neue Bausteine mappen.
- `FilteredCardListLayout` auf `ListLayout + FilterSlot` umstellen.

2. Unkritische Card-only Screens migrieren
- `HelpTextsPage`, `NoteTemplatesPage`, `TeamManagement`, `TourManagement`, `ProjectStatusList`.
- Ziel: funktional identisch, nur neue Komposition.

3. Filter-Screens migrieren
- `CustomerList`, `ProjectList`, `EmployeeList`.
- Einheitliche Filter-BottomBar aktivieren.
- ViewMode-Toggle + USER-Persistenz hinzufügen.

4. Dialog-Varianten migrieren
- Picker in `ProjectForm`, `AppointmentForm`, `EmployeeSelectEntityEditDialog`, `ProjectStatusPanel`.
- Spezieller Fokus: Fullscreen-Dialog-Height, Footer-Sichtbarkeit, Scroll-Ketten.

5. Kalender strukturell hosten
- `Home`-Kalendercontainer in `ListLayout.ContentSlot` einbetten.
- Keine Änderung an Kalenderdatenfluss, Navigation oder Aggregation.

6. Neuer `AppointmentList`-Screen (strukturelles Skelett)
- Route/ViewType hinzufügen.
- `ListLayout` + optionaler Toggle.
- Board- und Table-Platzhalter über bestehende Kalender-/Termin-Aggregationsdatenquelle vorbereiten.
- Keine neue Fachlogik.

7. Legacy bereinigen
- `CardListLayout` als deprecated markieren.
- Nach vollständiger Migration entfernen.

## 5. Übergangsstrategie

- Parallelbetrieb erlaubt:
  - `CardListLayout` bleibt bis Ende als Adapter erhalten.
- Feature Flag nicht erforderlich:
  - Risiko wird über schrittweise Screen-Migration minimiert.
- Rollback:
  - Pro Screen rückrollbar, solange Adapter existiert.
- Breaking-Risk-Punkte:
  - Props-Schnittstellen (`primaryAction`, `secondaryAction`, `toolbar`, `bottomBar`).
  - Dialoghöhe/Overflow bei Pickern.
  - `cardListColumns`-Wirkung nach Board-Extraktion.
  - Help-Icon-Position im Header.

## 6. Kalenderintegration (nur strukturell)

- Hosting:
  - Kalendercontainer (`month/week/year`) in `ListLayout.ContentSlot`.
  - `CalendarEmployeeFilter` in `ListLayout.FilterSlot` oder Header-Action-Bereich, ohne Verhaltensänderung.
- Risiken:
  - Doppel-Scroll (Layout + Kalender intern).
  - Headerhöhe vs. verfügbare Content-Höhe.
  - Sticky/absolute Elemente in Week/Month-Views.
- Nicht-Ziele:
  - Keine Änderung an `useCalendarAppointments`.
  - Keine API-/Aggregation-Änderung.
  - Keine Navigationslogik-Änderung (`prev/next/currentDate`).

## 7. Terminliste (neu, strukturell)

- Eigener Screen `appointmentList`.
- Nutzt `ListLayout`.
- Toggle `board|table` optional aktiv.
- Datenquelle:
  - Bestehende Kalender-/Termin-Aggregation als Input-Basis (kein neuer Domain-Contract in dieser Phase).
- Umfang:
  - Nur Struktur, keine neue Filter- oder Businesslogik, kein neues Termin-Domainlayout.

## 8. Risiken und Gegenmaßnahmen

- Regression bei Listen-Rendern:
  - Snapshot-/DOM-Tests für Header/Filter/Footer/Grid.
- Dialog-Risiken:
  - E2E für Picker-Dialogs mit großen Datenmengen.
- Help-Integration:
  - Sicherstellen, dass `helpKey` im neuen Header unverändert wirkt.
- Footer-Logik:
  - Aktionstasten dürfen nicht durch Filterbar verdrängt werden.
- Grid-Settings-Migration:
  - `cardListColumns` nur in `BoardView`; keine Wirkung auf `TableView`.
- Persistenz-Risiko:
  - Fehlende USER-Settings-Einträge müssen sauber auf Default `board` fallen.

## 9. Public API / Interface-Änderungen

- Neu:
  - `ListLayoutProps` (Slots + optionaler Toggle)
  - `BoardViewProps`
  - `TableViewProps<T>` + `TableColumnDef<T>`
- Deprecation:
  - `CardListLayout` (Adapterphase)
  - `FilteredCardListLayout` (falls vollständig durch neue Komposition ersetzt)
- Settings:
  - neue `*.viewMode`-Keys in Registry und Frontend-Key-Typen.

## 10. Tests und Akzeptanzkriterien

- Unit:
  - `ListLayout` slot rendering, toggle callback.
  - `BoardView` grid-cols Auflösung inkl. `cardListColumns`.
  - `TableView` sorting/density/sticky header.
- Integration:
  - Persistenz `viewMode` USER-spezifisch über Settings API.
  - Default-Fallback auf `board` bei fehlendem Setting.
- E2E:
  - Pro migriertem Screen Toggle wechseln, reload, Zustand bleibt.
  - Picker-Dialoge: Auswahlfluss, Footer sichtbar, kein Scroll-Break.
  - Kalender: month/week/year weiterhin navigierbar und filterbar.
- Akzeptanz:
  - Keine Fachlogik-Änderung.
  - Keine Query-Key-/API-Regression.
  - Alle betroffenen Screens laufen auf `ListLayout`.

## 11. Dokumentationsplan

- Neu zu dokumentieren:
  - `ListLayout`, `BoardView`, `TableView` inklusive Props-Verträge.
  - `viewMode`-Settings-Konzept (Key-Namensschema, Scope USER, Default board).
- Anpassung FT(17) in `mugplan_features.md`:
  - `CardListLayout`/`FilteredCardListLayout` als historisch/deprecated markieren.
  - Neue Kompositionskette dokumentieren.
- Anpassung Architektur-Dokument:
  - Abschnitt UI-Komposition + betroffene Screen-Zuordnung aktualisieren.
- Implementation-Log-Struktur (für spätere Umsetzung):
  - `logs/<task-id>/planung.md`
  - `logs/<task-id>/umsetzungs-log.md`
  - `logs/<task-id>/kritische-hinweise.md`

## 12. Aufwandsschätzung

- Phase 1 Foundation (`ListLayout`, `BoardView`, `TableView`, Settings-Keys): 2-3 PT
- Phase 2 Screen-Migration (Listen + Filter + Dialoge): 3-5 PT
- Phase 3 Kalender-Hosting + Terminliste-Struktur: 1-2 PT
- Phase 4 Tests + Doku + Bereinigung: 2-3 PT
- Gesamt: 8-13 PT (abhängig von Dialog-/E2E-Nacharbeit)

## 13. Annahmen und gewählte Defaults

- Default-View für alle betroffenen Screens ist `board`.
- `viewMode` wird ausschließlich USER-spezifisch gespeichert.
- `TableView` bleibt generisch und enthält keine Domain-Templates.
- Kalenderintegration bleibt strikt strukturell, ohne Verhaltensänderung.
- `CardListLayout` wird zunächst als Adapter geführt, um schrittweise Migration ohne Big-Bang zu ermöglichen.
