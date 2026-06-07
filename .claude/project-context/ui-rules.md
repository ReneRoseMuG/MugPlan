# UI-Regeln — MugPlan

Verbindliche UI-Leitplanke für alle Claude-Skills die UI-Arbeit betreffen.
Vollständige Komponentenreferenz: `docs/UI-Komponenten-Referenz.md`

---

## Grundregel

Neue Screens und Dialoge müssen aus vorhandenen Basiskomponenten zusammengesetzt werden.
Neue Komponenten dürfen nur als Wrapper oder Ableitung bestehender Basiskomponenten entstehen.
Keine neuen UI-Muster ohne Nachweis dass bestehende Bausteine ungeeignet sind.

---

## Verbindliche Basiskomponenten

### Seitenrahmen
- `ListLayout` (`client/src/components/ui/list-layout.tsx`) — universeller Seitenrahmen für alle Listen- und Übersichtsseiten
- `BoardView` (`client/src/components/ui/board-view.tsx`) — Kartenraster, Spaltenanzahl via `useSetting("cardListColumns")`
- `TableView` (`client/src/components/ui/table-view.tsx`) — Tabelle mit Hover-Preview und Doppelklick
- `ListEmptyState` (`client/src/components/ui/list-empty-state.tsx`) — leere Listen mit Help-Text-System

### Karten und Formulare
- `EntityCard` (`client/src/components/ui/entity-card.tsx`) — Karte für Board-Ansichten; `footerVisibility` beachten
- `EntityFormLayout` (`client/src/components/ui/entity-form-layout.tsx`) — Formularrahmen für Detail-/Bearbeitungsseiten
- `EntityEditDialog` (`client/src/components/ui/entity-edit-dialog.tsx`) — Dialograhmen für fokussierte Bearbeitung

### Badge-Hierarchie (immer als Ableitung bauen)
```
InfoBadge (Basis — kein direkter Facheinsatz)
├── PersonInfoBadge → CustomerInfoBadge, EmployeeInfoBadge
└── ColoredInfoBadge → TeamInfoBadge, …
```

### Datumsfomatierung (Pflicht)
- Sichtbare Datumsangaben zwingend im Format `dd.MM.yy`
- Zentrale Helfer verwenden — keine direkten Ad-hoc-Formatierungen
- Verboten in sichtbaren Feldern: `dd.MM.yyyy`, `yyyy-MM-dd`, `MM/DD/YYYY`, `toLocaleDateString()`

---

## Eingesetzte Domänenkomponenten

| Domäne | Hauptkomponente |
|---|---|
| Kunden | CustomersPage, CustomerData |
| Projekte | ProjectsPage, ProjectForm |
| Mitarbeiter | EmployeesPage, EmployeeForm |
| Termine | AppointmentsListPage, AppointmentForm |
| Touren | TourEditForm, TourManagement |
| Teams | TeamManagement |
| Notizen/Vorlagen | NoteTemplatesPage |
| Hilfe-Texte | HelpTextsPage |

---

## Server als fachliche Wahrheit

UI-Regeln ergänzen nur UX. Fachliche Invarianten (Overlap-Sperre, Historien-Lock, Rollengrenzen, Termin-Relationspflicht) werden serverseitig erzwungen und dürfen im Frontend nicht umgangen werden.
