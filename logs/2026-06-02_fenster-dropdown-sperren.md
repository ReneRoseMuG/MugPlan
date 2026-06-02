# Log: Fenster-Dropdown sperren und aus Save-Review-Check herausnehmen

**Datum:** 02.06.2026
**Auftrag:** Fenster-Feld in der Projekt-Details-Artikelliste deaktivieren; „Fenster" nicht mehr als fehlende Auswahl im Save-Review melden

---

## Zweck

Das Fenster-Dropdown in der Artikelliste des Projekt-Formulars wird nicht länger benötigt. Da ein vollständiger Umbau (Entfernen des Feldes aus `PROJECT_ARTICLE_FIELDS`, Reports, Extraktion usw.) nicht im Scope liegt, wird das Feld stattdessen minimal gesperrt:

1. Das Dropdown ist dauerhaft deaktiviert (nicht nur im Readonly-Modus). Ein Tooltip erklärt den Grund.
2. Der Save-Review-Guard meldet „Fenster" nicht mehr als fehlende Auswahl.
3. Bestehende Projekte, die bereits einen Fenster-Wert gespeichert haben, zeigen diesen weiterhin schreibgeschützt an (Option 1 / schreibgeschützt anzeigen).

---

## Scope

Reine Frontend-Änderung. Kein Backend, kein Schema, keine Migration, kein Contract.

---

## Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `client/src/components/ProjectOrderForm.tsx` | `renderField()`: `isWindowField`-Flag ergänzt; `disabled={readOnly \|\| isWindowField}`; `title`-Tooltip auf dem Wrapper-Div; `+`-Button-Bedingung um `&& !isWindowField` erweitert |
| `client/src/lib/project-save-review.ts` | `collectMissingProjectArticleLabels()`: `if (field.key === "window") continue;` am Schleifenanfang |
| `tests/unit/ui/projectSaveReview.logic.test.ts` | Zwei Tests mit `PROJECT_PRODUCT_FIELDS.length` als Zähler auf `…filter(f => f.key !== "window").length` korrigiert; explizite Negativ-Assertion `not.toContain("Fenster")` ergänzt |

---

## Technische Entscheidungen

- **`title`-Attribut statt shadcn Tooltip:** Minimaler Eingriff, kein zusätzlicher Import. Das Feld ist ein nativer `<select>` — der `title` erscheint als Browser-Native-Tooltip beim Hover auf dem gesamten Feldbereich.
- **`field.key === "window"` statt Entfernen aus `PROJECT_ARTICLE_FIELDS`:** Das Feld bleibt im shared Konstanten-Array, damit bestehende Projektdaten, Reports und die Extraktionslogik rückwärtskompatibel bleiben.
- **`+`-Button ausblenden:** Da das Dropdown gesperrt ist, wäre das Anlegen neuer Fenster-Komponenten über das Formular sinnlos. Der Button entfällt für `window` unabhängig vom Admin-Status.

---

## Hinweise zum Testen

- Im Projekt-Formular → Tab „Details" → Artikelliste: Das Fenster-Feld erscheint ausgegraut. Beim Hover über das Feld erscheint der Tooltip „Fenster werden nicht als separater Artikel geführt".
- Bei einem Projekt mit bereits gespeichertem Fenster-Wert: Der Wert wird schreibgeschützt angezeigt.
- Nach einem Dok-Import: Im Save-Review-Schritt erscheint „Fenster" nicht mehr in der Liste fehlender Auswahlen. Alle anderen Felder (Ofen, Steuerung usw.) werden weiterhin geprüft.
- Unit-Test `projectSaveReview.logic.test.ts`: 5/5 grün.

---

## Bekannte Einschränkungen

- `shared/projectArticleList.ts` bleibt unverändert. Das `window`-Feld ist weiterhin Teil von `PROJECT_ARTICLE_FIELDS` und wird bei der Extraktion aus Dokumenten noch aufgelöst — allerdings ohne Auswirkung, da das Dropdown gesperrt ist.
- Ein vollständiger Umbau (Feldentfernung aus Schema, Reports, Extraktion) bleibt ein offenes Folge-Thema.
