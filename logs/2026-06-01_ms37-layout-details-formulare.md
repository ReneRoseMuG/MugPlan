# MS-37 – Details-Formulare, Termintabellen und Boards

**Datum:** 01.06.26  
**Branch:** `ms37-layout-fixes`  
**Auftragsklasse:** 5 – Mehrschichtige Änderung

---

## Zweck

Umsetzung von MS-37: Layout-Korrekturen an Details-Formularen, Termintabellen und der Touren-Übersicht. Ziel war einheitliche Breitennutzung, Tab-Leisten über die volle Seitenbreite, ein einzeiliger Footer in allen Terminlisten und korrekte Tabellenzentrierung.

---

## Scope

Sechs Produktivdateien geändert, kein Datenbankschema, keine API-Änderungen.

---

## Umgesetzte Änderungen

### Tab-Bars über volle Seitenbreite

**Problem:** `TabsList` war `inline-flex` und füllt standardmäßig nur den Inhalt, nicht den verfügbaren Bereich.

**EmployeeForm.tsx:**
- `contentMaxWidth={99999}` gilt jetzt immer für den `EntityFormShell`-Shell (vorher nur für ausgewählte Tabs).
- Im `stammdaten`-Tab bekommt der Formularinhalt einen eigenen `mx-auto`-Container mit `maxWidth: contentMaxWidth` (gelesen aus Setting `entityFormShell.contentMaxWidthPx`, Fallback 960 px) – identisches Muster wie `TourEditForm`.
- `TabsList` der inneren Detail-Tabs erhält `className="w-full"`.
- `useSetting` neu importiert.

**TourEditForm.tsx:**
- `TabsList` der inneren Detail-Tabs erhält `className="w-full"`.

**TourManagement.tsx:**
- `TabsList` erhält `className="flex flex-1"`, beide `TabsTrigger` je `className="flex-1"` → Tab-Leiste füllt den Bereich links der Toggles (Wochenplanung-Modus) bzw. die volle Breite (Touren-Modus).

### Termintabellen – Einzeiliger Footer

**AppointmentsListPage.tsx:**
- `filterSlot` und `footerSlot` von `ListLayout` wurden zusammengeführt: `AppointmentsFilterPanel` links, `ListPagingFooter` mit `ml-auto shrink-0` rechts, in einem gemeinsamen `flex flex-wrap items-end`-Container.
- Gilt für **alle** Verwendungen (Formulare und eigenständige Terminliste).
- In eingebetteten Formular-Kontexten (`isEmbeddedFormContext`): `hideHeader={true}` und `className="border-0 shadow-none rounded-none"` an `ListLayout` → redundante Überschrift und schwarzer Card-Rand werden ausgeblendet.

### Projektspalte Tour-Formular

**AppointmentsListPage.tsx:**  
- Neue optionale Prop `projectNameMaxLength?: number` → kürzt den Projektnamen im Cell-Renderer auf `n` Zeichen + `…`, mit `title`-Attribut für den vollen Namen.

**TourEditForm.tsx:**  
- `projectNameMaxLength={15}` am `AppointmentsListPage`-Aufruf im „Termine"-Tab übergeben.

### Tabellenzentrierung

**table-view.tsx:**  
- `w-auto` → `w-auto mx-auto` bei Tabellen mit definierten Spaltenbreiten → schmale Tabellen erscheinen zentriert statt linksbündig. Gilt global für alle `TableView`-Instanzen.

**EmployeeRevenueOverviewTab.tsx:**  
- `tableClassName="mx-auto"` am `TableView`-Aufruf → Umsatz-Übersichtstabelle (3 Spalten, ~510 px) wird zentriert.

---

## Technische Entscheidungen

- **contentMaxWidth-Muster in EmployeeForm:** Statt konditionaler Shell-Breite wurde das bewährte Muster von `TourEditForm` übernommen: Shell immer `99999`, Inhalt-Constraint via eigenem Wrapper-Div. Dadurch kann die Tab-Bar den vollen Viewport nutzen, ohne dass das Formularinhalt-Layout bricht.
- **Kombinierter Footer:** Die Zusammenführung zu einem einzigen Slot (`filterSlot`) ist einfacher als eine neue Prop in `ListLayout`. Der separate `footerSlot` entfällt komplett.
- **projectNameMaxLength als Prop:** Die Kürzung ist auf die Tour-Kontext-Nutzung beschränkt, ohne die gemeinsame Komponente dauerhaft zu verändern. Der `title`-Tooltip gibt den vollen Namen bei gekürzten Einträgen.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `client/src/components/EmployeeForm.tsx` | contentMaxWidth=99999, useSetting, Stammdaten-Wrapper, TabsList w-full |
| `client/src/components/TourEditForm.tsx` | TabsList w-full, projectNameMaxLength={15} |
| `client/src/components/TourManagement.tsx` | TabsList flex flex-1, Trigger flex-1 |
| `client/src/components/AppointmentsListPage.tsx` | Kombinierter Footer, hideHeader, border-0, projectNameMaxLength-Prop |
| `client/src/components/ui/table-view.tsx` | w-auto mx-auto |
| `client/src/components/EmployeeRevenueOverviewTab.tsx` | tableClassName="mx-auto" |

---

## Hinweise zum Testen

- **Mitarbeiter-Formular:** Tab-Leiste sollte von der linken Inhaltskante bis zur Sidebar laufen. Stammdaten-Inhalt bleibt bei ~960 px zentriert.
- **Tour-Formular:** Tab-Leiste über volle Breite. Projektnamen in der Termintabelle auf max. 15 Zeichen + `…` begrenzt.
- **Touren-Seite:** Tab-Leiste füllt im Wochenplanung-Modus den Bereich bis zu den Toggles, im Touren-Modus die volle Breite.
- **Alle Terminlisten:** Nur noch ein Footer-Bereich (Filter links, Paging rechts). In Formular-Tabs kein Kartenrahmen, keine doppelte Überschrift.
- **Umsatz-Übersicht:** Tabelle horizontal zentriert.
- Alle 311 Unit-Tests grün, kein TypeScript-Fehler.

---

## Bekannte Einschränkungen

- `mx-auto` auf Tabellen gilt global für alle `TableView`-Instanzen mit definierten Spaltenbreiten, nicht nur für Termintabellen. Bisher keine bekannten Regressionsfälle.
- Der kombinierte Footer ist in der mobilen Ansicht (< `sm:`) mehrzeilig; Paging rutscht unter die Filter. Das ist das bestehende Verhalten des `FilterPanel`-Layouts und entspricht der Anforderung (eine Zeile auf Desktop).
