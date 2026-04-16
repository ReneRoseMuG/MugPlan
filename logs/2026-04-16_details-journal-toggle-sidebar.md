# Details/Journal-Toggle in Sidebar verschieben

**Datum:** 2026-04-16
**Branch:** mitarbeiter-auslastung-tab
**Status:** Abgeschlossen

---

## Zweck

Der Details/Journal-Toggle (TabsList mit zwei Triggern) sitzt in allen vier Hauptformularen unterhalb des Titels im Header. Das belegt eine Zeile im Header und ist vom Prinzip her ein Navigations-Element, das besser in die Sidebar gehört.

---

## Scope

Betroffen: vier Formularkomponenten, keine Backend-Änderungen, keine Schemaänderungen.

| Datei | Stelle |
|---|---|
| `client/src/components/EmployeeForm.tsx` | Header Z. 740–745, Sidebar-Prop Z. 761 |
| `client/src/components/CustomerData.tsx` | Header Z. 774–779, Sidebar-Prop Z. 795 |
| `client/src/components/AppointmentForm.tsx` | Header Z. 2381–2386, Sidebar-Prop Z. 2402 |
| `client/src/components/ProjectForm.tsx` | Header Z. 1503–1508, Sidebar-Prop Z. 1522 |

`client/src/components/ui/entity-form-shell.tsx` — keine Änderung erforderlich.

---

## Technische Entscheidungen

**Sidebar bleibt in beiden Schaltzuständen konstant sichtbar.**
Beim Umschalten auf „Journal" ändert sich nur der Hauptbereich (Journal-View statt Formularfelder). Die bisherige Bedingung `activeMainTab === "details" ? <sidebar> : undefined` wird in allen vier Formularen auf bedingungslose Sidebar-Render umgestellt.

**Nav-Panel ganz oben in der Sidebar.**
Überschrift: „Daten anzeigen". Zwei Tab-Trigger mit Icon + Label:
- Details → Icon `LayoutList`
- Journal → Icon `ScrollText`

Styling folgt dem bestehenden `sub-panel`-Muster (`space-y-3`, `text-sm font-bold tracking-wider text-primary`).

**TabsList wird aus dem Header entfernt.**
Der Header-`flex-col`-Block enthält danach nur noch `h2` und `EditFormContextText`.

**Kein neues File, keine neue Komponente.**
Das JSX-Muster wird in allen vier Formularen direkt inline wiederholt (vier Vorkommen, zu einfach für eine Abstraktion).

---

## Hinweise zum Testen

- In allen vier Formularen: Toggle in der Sidebar erscheint nur im Bearbeitungsmodus (`isEditing` / `isEditMode`)
- Journal-Tab: Hauptbereich zeigt `JournalRecordsView`, Sidebar vollständig sichtbar
- Details-Tab: Verhalten identisch wie bisher
- `data-testid`-Attribute der Trigger bleiben unverändert

---

## Umgesetzte Änderungen

Alle vier Formulare wurden identisch angepasst:

1. `TabsList` mit beiden `TabsTrigger` aus dem Formular-Header entfernt
2. Icons `LayoutList` und `ScrollText` in die jeweiligen `lucide-react`-Imports ergänzt
3. Sidebar-Prop von `activeMainTab === "details" ? (...) : undefined` auf bedingungslose Render umgestellt
4. Nav-Panel mit Überschrift „Daten anzeigen" und den beiden Tab-Triggern (inkl. Icons) als erstes Element oben in die Sidebar eingefügt

## Bekannte Einschränkungen

Keine. Die Änderung ist rein strukturell und berührt keine Fachlogik.
