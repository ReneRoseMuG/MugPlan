# Log: Kalender – „Projekt Editieren"-Aktion in Termin-Kontextmenüs

**Datum:** 02.06.2026
**Auftrag:** Implementierung der `onOpenProject`-Navigation aus Kalender-Terminkarten heraus
**Branch:** work

---

## Zweck

Aus dem Kontext-Menü eines Kalender-Termins soll der Nutzer direkt in das zugehörige Projekt-Formular wechseln können. Der neue Menüpunkt „Projekt Editieren" erscheint in allen Terminkarten-Menüs der Wochenansicht und der Monatsansicht. Er ist deaktiviert, wenn dem Termin kein Projekt zugeordnet ist.

---

## Scope

Reine Frontend-Änderung. Kein Backend, kein Schema, keine Migration betroffen.

---

## Betroffene Dateien

| Datei | Art der Änderung |
|---|---|
| `client/src/components/CalendarWorkspace.tsx` | `onOpenProject?: (projectId: number) => void` als neue optionale Prop ergänzt und an `WeekGrid` sowie `MonthSheetGrid` weitergegeben |
| `client/src/components/WeekGrid.tsx` | `onOpenProject` als Durchleitung an `CalendarWeekView` hinzugefügt |
| `client/src/components/MonthSheetGrid.tsx` | `onOpenProject` als Durchleitung an `CalendarMonthSheetView` hinzugefügt |
| `client/src/components/calendar/CalendarWeekView.tsx` | `onOpenProject` an alle drei Ausprägungen der Terminkarte (`CalendarWeekAppointmentPanel`, `CalendarWeekSpanningTile`) weitergegeben |
| `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx` | Neuer Dropdown-Menüpunkt „Projekt Editieren" mit `FolderOpen`-Icon; disabled wenn kein `projectId` oder kein Handler |
| `client/src/components/calendar/CalendarWeekSpanningTile.tsx` | Identischer Menüpunkt wie in `CalendarWeekAppointmentPanel` |
| `client/src/components/calendar/CalendarMonthSheetView.tsx` | `onOpenProject` bis in `MonthCompactBarWithMenu` durchgeleitet; identischer Menüpunkt ergänzt |
| `client/src/pages/Home.tsx` | `onOpenProject`-Handler in beiden `CalendarWorkspace`-Render-Zweigen verdrahtet (globaler Kalender und kontextueller Kalender); setzt `selectedProjectId`, `projectReturnView` und wechselt zur Ansicht `"project"` |

---

## Technische Entscheidungen

- **Callback-Kette statt Context:** Die `onOpenProject`-Prop wird als optionaler Callback von `CalendarWorkspace` nach unten durchgereicht. Kein neuer React-Context, da die Kette überschaubar ist und das bestehende Muster für `onOpenAppointment` identisch aufgebaut ist.
- **Disabled-State statt Ausblenden:** Der Menüpunkt erscheint immer, ist aber deaktiviert, wenn `appointment.projectId` null ist oder kein Handler übergeben wurde. Konsistent mit dem vorhandenen Muster für `onDoubleClick`-basierte Menüaktionen.
- **Kontextueller Kalender:** Im `calendarContextual`-Zweig wird `projectReturnView` auf `"calendarContextual"` gesetzt, im globalen Zweig auf `view` (also die aktuell aktive Ansicht). Damit kehrt der Nutzer nach dem Schließen des Projekts zur jeweils richtigen Kalenderansicht zurück.

---

## Tests

Vier Unit-Test-Dateien ergänzt:

| Datei | Was abgesichert wird |
|---|---|
| `tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx` | „Projekt Editieren" aktiv/deaktiviert in `CalendarWeekAppointmentPanel` und `CalendarWeekSpanningTile` |
| `tests/unit/ui/calendarMonthSheetView.wiring.test.tsx` | „Projekt Editieren" aktiv/deaktiviert in `MonthCompactBarWithMenu` via Monats-Kompaktansicht |
| `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx` | `onOpenProject` wird von `CalendarWorkspace` korrekt an `WeekGrid` und `MonthSheetGrid` weitergereicht |
| `tests/unit/ui/home.behavior.test.tsx` | Navigation zu Projekt aus globalem Kalender und aus kontextuellem Kalender je mit korrekter `returnView` |

---

## Hinweise zum Testen

- Menüpunkt im Dev-Server an einem Termin **mit** Projekt prüfen: Klick öffnet das Projekt-Formular und kehrt beim Schließen zur Kalenderansicht zurück.
- Menüpunkt an einem Termin **ohne** Projekt prüfen: Eintrag erscheint ausgegraut und löst keinen Navigationseffekt aus.
- Kontextueller Kalender (aus Projekt-Ansicht heraus geöffnet): Navigation zurück nach Schließen des Projekts muss auf `"calendarContextual"` führen, nicht auf `"project"`.

---

## Bekannte Einschränkungen

Keine. Die Änderung ist rein additiv und optionaler Natur (`onOpenProject` ist in allen Interfaces `optional`). Bestehende Kalendernutzungen ohne den Handler sind unverändert lauffähig.
