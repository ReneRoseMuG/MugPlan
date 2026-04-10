# Gruppe C: Kalender, Drag-and-drop und sichtbares Terminverhalten

## 1. Bearbeitete Gruppe

- Name der Gruppe: Gruppe C - Kalender, Drag-and-drop und sichtbares Terminverhalten
- Betroffene Testdateien:
  - Behalten:
    - `tests/unit/ui/weekLaneState.rules.test.ts`
    - `tests/unit/ui/calendarWeekView.lanePlacement.test.ts`
    - `tests/unit/ui/calendarWeekSpanningTile.utils.test.ts`
    - `tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx`
  - Ersetzt:
    - `tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx`
    - `tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx`
    - `tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx`
  - Geloescht:
    - `tests/unit/ui/calendar.historical-create-controls.test.tsx`
    - `tests/unit/ui/calendarAppointmentCompactBar.headerStyle.wiring.test.tsx`
    - `tests/unit/ui/calendarAppointments.notesCountNormalization.wiring.test.ts`
    - `tests/unit/ui/calendarFilterPanel.weekDisplayMode.wiring.test.tsx`
    - `tests/unit/ui/calendarMonthView.sortByTourIndex.wiring.test.ts`
    - `tests/unit/ui/calendarWeekAppointmentNotesHover.preview.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.continuationHeight.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.headerTourColor.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.tags.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarAttachmentsPreview.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarEmployeesPreview.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.weekCalendarNotesPreview.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAppointmentPanel.weeklyProjectDescriptionPreview.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekAttachmentHover.previewSizing.wiring.test.ts`
    - `tests/unit/ui/calendarWeekSpanningTile.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekView.continuationHeight.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekView.laneCollapse.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekView.scrollRestore.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekView.spanningTiles.wiring.test.tsx`
    - `tests/unit/ui/calendarWeekView.tourHeaderCounters.wiring.test.tsx`
    - `tests/unit/ui/hoverPreview.weeklyNoScrollOptions.test.tsx`
- Fachlicher Fokus:
  - sichtbares Umschalten zwischen Wochen- und Monatskalender
  - sichtbare Tour-Druckvorschau im Wochenkontext
  - deterministische Lane- und Spanning-Regeln der Wochenansicht

## 2. Durchgefuehrte Aenderungen

- Beibehalten wurden kleine reine Regeltests, die bereits beobachtbare Ausgaben statt Quelltext pruefen:
  - `weekLaneState.rules.test.ts`
  - `calendarWeekView.lanePlacement.test.ts`
  - `calendarWeekSpanningTile.utils.test.ts`
  - `appointmentWeeklyPanelPreview.width.test.tsx`
- Ersetzt wurden drei schwache Verdrahtungstests:
  - `calendarWorkspace.viewSwitch.wiring.test.tsx` prueft jetzt gerendertes WeekGrid oder CalendarGrid und die weitergereichten New/Open-Callbacks mit Rueckkehrkontext.
  - `calendarWorkspace.tourPrintPreview.wiring.test.tsx` prueft jetzt die sichtbare Inline-Drucksteuerung im Wochenfilter und die an den Dialog uebergebenen Zustandswerte.
  - `calendarTourPrintPreviewDialog.navigation.test.tsx` prueft jetzt aktive Seite, Seitenzaehler, Lade-/Fehlerzustand und deaktivierte Randnavigation.
- Geloescht wurden reine Source-String-, JSX- und `readFileSync`-Tests ohne belastbaren Laufzeiteffekt.
- Neue zusaetzliche Verhaltenstests ausserhalb der drei Ersetzungen wurden nicht angelegt, damit die Bearbeitung klein und kontrolliert bleibt.

## 3. Fachliche Verbesserung

- Jetzt geprueftes echtes Verhalten:
  - sichtbare Kalenderansicht wechselt zwischen Woche und Monat
  - oeffentliche Workspace-Callbacks behalten ihren View-Kontext
  - die Tour-Druckvorschau wird im Wochenkontext sichtbar verdrahtet
  - die Druckvorschau zeigt aktive Seiten und reagiert auf Navigationsgrenzen
  - reine Lane- und Spanning-Helfer liefern weiter deterministische Layout-Ergebnisse
- Entfernte Scheinsicherheit:
  - Quelltext-Suchen nach Props, Strings, CSS-Klassen und JSX-Fragmenten
  - Verdrahtungsannahmen ohne gerendertes UI-Ergebnis
  - Source-Assertions auf Hover-, Header-, Preview- und Layoutpfade ohne Laufzeitbeleg
- Weiter bestehende Luecken innerhalb der Gruppe:
  - historische Create-Guards im Kalender sind in dieser Gruppe nach dem Entfernen des Source-Tests nicht mehr separat auf UI-Ebene abgesichert
  - sichtbares Hover- und Preview-Verhalten fuer Notizen, Attachments, Mitarbeiter und Projektdetails ist in dieser Gruppe nicht neu als Verhaltenstest aufgebaut
  - scroll-restore-, continuation- und lane-collapse-Verhalten der Wochenansicht bleiben ohne neue Verhaltenstests, weil saubere Laufzeittests dafuer in der bestehenden Struktur hier nicht klein und risikoarm nachziehbar waren

## 4. Testergebnis

- Ausgefuehrte betroffene Tests:
  - `npm run test:unit -- tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/calendarWorkspace.tourPrintPreview.wiring.test.tsx tests/unit/ui/calendarTourPrintPreviewDialog.navigation.test.tsx tests/unit/ui/appointmentWeeklyPanelPreview.width.test.tsx tests/unit/ui/weekLaneState.rules.test.ts tests/unit/ui/calendarWeekSpanningTile.utils.test.ts tests/unit/ui/calendarWeekView.lanePlacement.test.ts`
- Gruen:
  - alle 7 ausgefuehrten Testdateien
  - 24 Tests insgesamt erfolgreich
- Fehlgeschlagen:
  - keine

## 5. Offene Blocker

- Sinnvolle Verhaltenstests fuer Scroll-Restore, Wochen-Lane-Collapse und Fortsetzungssegmente wuerden tiefere DOM-/Layout-Hooks oder produktionsnahe Renderpfade benoetigen, die in der aktuellen Teststruktur nicht klein und sauber erreichbar sind.
- Sinnvolle Verhaltenstests fuer Hover-Previews von Notizen, Attachments, Mitarbeitern und Projektbeschreibungen wuerden einen groesseren Mock- und Portal-Kontext verlangen; das waere fuer diese kontrollierte Gruppenbearbeitung eine deutliche Scope-Ausweitung.
- Ein sauberer Verhaltenstest fuer historische Kalender-Neuanlage waere fachlich sinnvoll, laesst sich ohne weitergehende produktionsnahe Interaktionspfade in dieser Gruppe derzeit nicht kompakt statt als Source-Test abbilden.
