# EntityFormShell + Amber-Farbtokens

**Datum:** 2026-03-18
**Branch:** `design/entity-form-shell` (abgezweigt von `work`)
**Commit:** `7b6de6b`
**Status:** Abgeschlossen — bereit zum Review

---

## Was wurde gemacht

### Teil 1 — Amber-Tokens in `client/src/index.css`

Folgende Variablen wurden im `:root`-Block ersetzt oder neu ergänzt:

| Variable | Neuer Wert | Hinweis |
|---|---|---|
| `--color-cream` | `30 8% 97%` | Ersetzt alten Wert |
| `--color-beige` | `30 15% 88%` | Ersetzt alten Wert |
| `--color-blue-dark` | `38 91% 43%` | **Breaking Change** — von Blau auf Amber 600 umgestellt |
| `--sub-panel-background` | `30 18% 92%` | Ersetzt alten Wert |
| `--input-background` | `30 20% 98%` | Neu |
| `--color-border` | `30 15% 80%` | Neu |
| `--color-zebra` | `30 12% 95%` | Neu |
| `--color-badge-bg` | `48 100% 97%` | Neu |
| `--color-badge-border` | `48 96% 89%` | Neu |
| `--color-badge-text` | `21 96% 31%` | Neu |
| `--color-text-primary` | `20 6% 10%` | Neu |
| `--color-text-secondary` | `25 6% 33%` | Neu |

Alle anderen Zeilen in `index.css` wurden nicht berührt.

### Teil 2 — `client/src/components/ui/entity-form-shell.tsx` (neu)

Neue Shell-Komponente mit vier Slots:
- `header` (optional) — beige Hintergrund, Trennlinie unten
- `children` (Pflicht) — Hauptinhalt, scrollbar
- `sidebar` (optional) — feste Breite, Amber-Trennlinie links
- `footer` (Pflicht, immer sichtbar) — beige Hintergrund, Trennlinie oben

Props: `header?`, `sidebar?`, `footer`, `children`, `sidebarWidth?` (Standard: 240), `className?`

Technisch: reines Tailwind, keine Businesslogik, vollständig TypeScript typisiert, named export `EntityFormShell`, alle 6 `data-testid`-Attribute gesetzt.

### Teil 3 — `tests/unit/ui/entityFormShell.layout.test.tsx` (neu)

8 Unit-Tests, alle grün:

| # | Test |
|---|---|
| 1 | Datei existiert und enthält die Komponente |
| 2 | `data-testid="entity-form-shell"` vorhanden |
| 3 | Sidebar erscheint nur wenn sidebar-Prop übergeben wird |
| 4 | Kein Sidebar-DOM ohne sidebar-Prop (konditionaler Render) |
| 5 | Header erscheint nur wenn header-Prop übergeben wird |
| 6 | Kein Header-DOM ohne header-Prop (konditionaler Render) |
| 7 | Footer ist immer vorhanden — kein konditionaler Render |
| 8 | sidebarWidth setzt Inline-Breite mit Standard 240 |

---

## Abgrenzung

Kein bestehendes Formular oder bestehender Test wurde verändert. Kein Eingriff in `EntityFormLayout`, `entity-form-with-tabs-layout.tsx` oder andere Komponenten.

---

## Nächste Schritte (Folge-Aufträge)

- Bestehende Formulare auf `EntityFormShell` umstellen (separate Aufträge)
- Tab-Handling in die Shell integrieren (separater Auftrag)
