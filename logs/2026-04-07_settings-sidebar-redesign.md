# Log: Redesign Admin Einstellungen — Sidebar-Navigation

**Datum:** 2026-04-07
**Branch:** `ft-settings-sidebar-redesign` (von `work_version_2`)
**Auftragsklasse:** 5 — Mehrschichtige Änderung / neues Feature

---

## Zweck

Ersetzt die drei horizontalen Tabs der Admin-Einstellungsseite (Einstellungen,
Backup, db-dump) durch eine zweispaltige Shell aus linker Sidebar-Navigation
und bedingtem Content-Bereich. Ausgangspunkt war ein HTML-Mockup des Nutzers.
Ziel: bessere Übersichtlichkeit, konsistente Scope-Darstellung (USER / GLOBAL)
und vollständige Testabdeckung für die neue Struktur.

---

## Scope

**Einzige geänderte Produktivdatei:** `client/src/components/SettingsPage.tsx`

Keine Änderungen an Backend, API, Schema, Contract, `SettingsProvider.tsx`
oder `useSettings.ts`.

---

## Technische Entscheidungen

### Sidebar-Struktur
- `<Tabs>` / `<TabsList>` / `<TabsContent>` (shadcn/ui) vollständig entfernt
- Zwei `useState`-Hooks steuern aktiven Pane und aktiven Backup-Inner-Tab:
  ```ts
  const [activePane, setActivePane] = useState<"oberflaeche"|"kalender"|"sicherheit"|"backup">("oberflaeche");
  const [activeBackupTab, setActiveBackupTab] = useState<"backups"|"dumps"|"import">("backups");
  ```
- Vier Panes via bedingtem Rendering: `{activePane === "X" && <div data-testid="settings-pane-X">}`

### Vier Panes in zwei NavGroups
| Gruppe | Pane | Inhalt |
|---|---|---|
| Anzeige | Oberfläche | Datei-Vorschau, Hilfetext-Vorschau, Karten-Spalten, Formular-Sidebar, Formular-Max-Breite, Toast-Position, Hover-Verzögerung |
| Anzeige | Kalender | Wochenende-Spaltenbreite, Scroll-Wochen, Scroll-Monate |
| System | Sicherheit | 2FA-Toggle |
| System | Backup & Dump | Inner-Tabs: Backups / Dumps / Import |

### Setting-Row-Darstellung
- Sekundärer Hintergrund: `rounded-md border border-slate-200 bg-slate-50 p-4`
- Scope-Badge USER (blau) / GLOBAL (amber)
- Wirksam-Hinweis: `Wirksam: <wert> (<scope>)` aus `resolvedValue` + `resolvedScope`

### Aktiver Nav-Eintrag
- `border-l-2 border-amber-600` als visueller Left-Border-Accent
- `aria-current="page"` für Accessibility

### Inner-Tabs im Backup-Pane
- Eigener `activeBackupTab`-State
- `border-b-2 border-amber-600` für aktiven Inner-Tab
- Drei Inner-Tab-Buttons: `backup-inner-tab-backups`, `-dumps`, `-import`

---

## Teststrategie-Entscheidung

Das Projekt nutzt `renderToStaticMarkup` (react-dom/server) für Unit-UI-Tests —
kein JSDOM, kein @testing-library/react. Dadurch ist es nicht möglich, in Unit-Tests
auf Nav-Klicks zu reagieren und Pane-Wechsel zu testen.

**Konsequenz:** Unit-Tests decken ausschließlich den initialen Render-Zustand ab.
Interaktives Navigationsverhalten (Pane-Wechsel, Inner-Tab-Wechsel, Persistenz)
wird vollständig durch Playwright-Browser-E2E-Tests abgesichert.

---

## Betroffene Dateien

### Produktivcode
| Datei | Änderung |
|---|---|
| `client/src/components/SettingsPage.tsx` | Vollständiger Umbau des Render-Baums: Tabs → Sidebar + Content |

### Unit-Tests
| Datei | Art | Inhalt |
|---|---|---|
| `tests/unit/ui/settingsPage.behavior.test.tsx` | Angepasst | Tabs-Mock entfernt, 3 neue Sidebar-Assertions |
| `tests/unit/ui/settingsPage.navigation.test.tsx` | Neu | settings-nav, 4 nav-items, NavGroups, aria-current |
| `tests/unit/ui/settingsPage.panes.behavior.test.tsx` | Neu | Scope-Badges, Wirksam-Hinweise im Oberfläche-Pane |
| `tests/unit/ui/settingsPage.wiring.test.tsx` | Neu | Control-Struktur: Select+Save-Paare, Input-Grenzen |
| `tests/unit/ui/settingsPage.backup.innerTabs.test.tsx` | Neu | nav-item-backup, Backup-Elemente im Default-Pane nicht sichtbar |

**Gesamt Unit-Tests:** 33 Tests, 5 Dateien — alle grün.

### Browser-E2E-Tests (Playwright)
| Datei | Inhalt |
|---|---|
| `tests/e2e-browser/settingsPage.navigation.browser.e2e.spec.ts` | Pane-Wechsel im Browser (6 Tests) |
| `tests/e2e-browser/settingsPage.controls.browser.e2e.spec.ts` | Steuerelement-Persistenz nach Reload (4 Tests) |
| `tests/e2e-browser/settingsPage.backup.browser.e2e.spec.ts` | Backup- und Dump-Aktionen über Inner-Tabs (8 Tests) |

### Dokumentation
| Datei | Änderung |
|---|---|
| `docs/TEST_MATRIX.md` | 7 neue Einträge für alle neuen Test-Dateien |

---

## Audit-Ergebnis

Nach Abschluss des Redesigns wurde ein voller Audit ausgeführt:

| Kommando | Ergebnis |
|---|---|
| `npm run check` | Grün |
| `npm run lint` | Grün |
| `npm run audit` | Rot — 3 CVEs in Vite 7.0.x (High Severity) |
| `npm run secrets` | Grün |

Die Vite-Schwachstellen wurden im selben Branch behoben:
`npm audit fix` aktualisierte Vite auf 7.3.2. Anschließend war `npm run audit`
ebenfalls grün.

---

## Hinweise zum Testen

- **Unit-Tests:** `npm run test:unit` — alle 33 Tests grün
- **Browser-E2E-Tests:** `npm run test:e2e:browser` gegen laufende Dev-Instanz
  (`npm run dev`). Die 3 neuen Spec-Dateien erfordern einen laufenden Server.
- Die neuen Browser-E2E-Tests wurden in dieser Session erstellt, aber noch
  nicht gegen einen laufenden Server ausgeführt — das steht als nächster
  Verifikationsschritt aus.

---

## Bekannte Einschränkungen

- Pane-Wechsel durch Klick ist in Unit-Tests nicht testbar (kein JSDOM).
  Vollständige Interaktionsabsicherung nur über Browser-E2E.
- Der Backup-Pane und seine Inner-Tabs sind im initialen Render nicht aktiv —
  Unit-Tests prüfen deshalb nur, dass die Backup-Elemente im Default-Pane
  **nicht** erscheinen.
