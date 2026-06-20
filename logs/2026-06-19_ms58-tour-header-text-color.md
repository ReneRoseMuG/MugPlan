# MS-58 — Kopfzeilen-Textfarbe pro Tour (USER-Setting)

**Datum:** 19.06.26  
**Branch:** `refactor/ms58-employee-picker-eligibility`

---

## Zweck

Pro-User persistente Textfarbe für jede Tour, gespeichert über die bestehende `userSettingsValue`-Infrastruktur (kein Schemaänderung). Die eingestellte Farbe wirkt ausschließlich auf Terminkarten-Kopfzeilen und Kompakt-Balken im Wochenkalender und Monatskalender. Body, Footer und alle anderen Textausgaben bleiben unverändert.

---

## Scope

- **Server:** Registry-Eintrag in `server/settings/registry.ts`
- **Client Hooks:** `client/src/hooks/useSettings.ts` (neuer UserSettingKey, Resolver, useSetting-Case)
- **Client Components:** `CalendarWeekAppointmentPanelHeader.tsx`, `CalendarWeekAppointmentPanel.tsx`, `CalendarAppointmentCompactBar.tsx`, `TourEditForm.tsx`
- **Tests:** 3 Mock-Fixes in bestehenden Dateien, 7 neue Testdateien, TEST_MATRIX.md erweitert

---

## Technische Entscheidungen

**Setting-Key:** `calendar.tourHeaderTextColors` — Typ `Record<string, string>` (tourId als Ziffernstring → Hex-Farbcode 6-stellig).

**Scope USER, nicht GLOBAL:** Die Farbe ist benutzerspezifisch, weil Textkontrastpräferenzen nutzerbezogen sind. GLOBAL würde bedeuten, dass alle Benutzer dieselbe Textfarbe für eine Tour sehen — das entspricht nicht dem Auftrag.

**Luminanz-Fallback im CompactBar:** Der Monatskalender hatte bisher keine explizite Textfarbe — der Fallback wurde als neue Logik ergänzt (dunkel → #ffffff, hell → #1a1a1a), damit die Komponente auch ohne Benutzereinstellung korrekt arbeitet.

**Save-on-submit:** `setSetting` wird nach erfolgreichem `onSubmit` aufgerufen. Schlägt `setSetting` fehl, bleibt der Termin gespeichert, die Textfarbe wird nicht persistiert. Fachlich akzeptabel da es sich um eine UI-Präferenz handelt.

**`!isCreate`-Guard:** Im Create-Modus existiert keine `tourId`, deshalb wird der Picker-Abschnitt nicht gerendert.

---

## Geänderte Dateien

### Produktivcode
| Datei | Art |
|---|---|
| `server/settings/registry.ts` | Neuer Registry-Eintrag `tourHeaderTextColors` |
| `client/src/hooks/useSettings.ts` | UserSettingKey, resolveTourHeaderTextColors, useSetting-Case |
| `client/src/components/calendar/CalendarWeekAppointmentPanelHeader.tsx` | Optionales `textColor`-Prop |
| `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx` | useSetting-Aufruf, textColor weitergeben |
| `client/src/components/calendar/CalendarAppointmentCompactBar.tsx` | useSetting-Aufruf, Luminanz-Fallback + User-Override |
| `client/src/components/TourEditForm.tsx` | Picker-Subpanel, setSetting in handleSubmit |

### Tests (nachgezogen)
| Datei | Art |
|---|---|
| `tests/unit/ui/tourEditDialog.appointmentsPanel.wiring.test.tsx` | `useSettings`-Mock ergänzt |
| `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx` | `useSettings`-Mock ergänzt |
| `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx` | Mock + Assertions für Create/Edit |

### Tests (neu)
| Datei | Bereich |
|---|---|
| `tests/unit/settings/tourHeaderTextColors.registry.test.ts` | Registry-Validierung |
| `tests/unit/settings/useSettings.tourHeaderTextColors.test.ts` | Resolver-Fallback-Logik |
| `tests/unit/ui/calendarWeekAppointmentPanelHeader.textColor.test.tsx` | textColor-Prop |
| `tests/unit/ui/calendarAppointmentCompactBar.headerTextColor.test.tsx` | Luminanz-Fallback + User-Override |
| `tests/unit/ui/tourEditForm.headerTextColorPicker.test.tsx` | Picker-Sichtbarkeit (Create/Edit/readOnly) |
| `tests/integration/server/userSettings.tourHeaderTextColors.persistence.test.ts` | API-Persistenz, USER-Scope-Isolation |
| `tests/e2e-browser/tour-headerTextColor.browser.e2e.spec.ts` | Vollständiger Browser-Flow |

---

## Hinweise zum Testen

- **Unit:** Alle neuen Tests grün. 2 bestehende Mock-Fixes grün.
- **Integration:** `tests/integration/server/userSettings.tourHeaderTextColors.persistence.test.ts` — prüft Standardwert, Persistenz, USER-Scope-Isolation, Ablehnung ungültiger Hex-Werte und nicht-numerischer Schlüssel.
- **Browser-E2E:** `tests/e2e-browser/tour-headerTextColor.browser.e2e.spec.ts` — setzt Farbe über Tour-Editor, prüft Woche + Monat, testet Reload-Persistenz und Zurücksetzen.
- Pre-existente Fehler in `tourManagement.versioning.test.tsx` (Timeouts) sind unabhängig von diesem Feature.

---

## Bekannte Einschränkungen

- `setSetting`-Fehler nach erfolgreichem `onSubmit` wird nicht dem Nutzer gemeldet (stille Fehlschlagsmöglichkeit bei Netzwerkproblemen im Setting-Call).
- Die Picker-UI zeigt den Farbwähler erst nach Klick auf „Textfarbe festlegen" — das initiale Öffnen des Edit-Formulars zeigt immer den Enable-Button, auch wenn bereits eine Farbe gespeichert ist (wird erst nach `useEffect` synchronisiert; im Browser kein Problem, nur in statischen Render-Tests sichtbar).
