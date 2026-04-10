# Bearbeitung Gruppe B: Terminformulare und Dialogverhalten

## 1. Bearbeitete Gruppe

- Name der Gruppe: Gruppe B `Terminformulare und Dialogverhalten`
- Betroffene Testdateien:
  - `tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx`
  - `tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx`
  - `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
  - `tests/unit/ui/attachmentsPanels.helpIcon.wiring.test.tsx`
  - `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
  - `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
  - `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`
  - geloescht aus dieser Gruppe:
    - `tests/unit/ui/appointmentForm.appointmentCacheInvalidation.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.createSidebarDrafts.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
    - `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.historical-validation.test.tsx`
    - `tests/unit/ui/appointmentForm.multiDayEditDates.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.notes.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.overlapConflictToast.wiring.test.tsx`
    - `tests/unit/ui/appointmentForm.overlayBack.wiring.test.ts`
    - `tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx`
    - `tests/unit/ui/appointmentPreviews.attachmentCounters.wiring.test.ts`
    - `tests/unit/ui/appointmentPreviews.notesCounters.wiring.test.ts`
    - `tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- Fachlicher Fokus:
  - sichtbares Formular- und Dialogverhalten im AppointmentForm
  - sichtbares Mitarbeiter- und Dokumentenpanel-Verhalten
  - sichtbares Kontextverhalten der Terminliste
  - sichtbarer Projektkopf im Wochenpanel

## 2. Durchgeführte Änderungen

- Beibehalten:
  - `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
    - auf gerenderte Struktur reduziert
    - Source-Assertions entfernt
- Ersetzt:
  - `tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx`
    - jetzt sichtbare Sections, Plus-Aktion, leer/belegt und konditionalen Tour-Picker
  - `tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx`
    - jetzt sichtbare Gruppen, pending Blob-URLs im Create-Fall und Termin-Downloadrouten im Edit-Fall
  - `tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx`
    - jetzt sichtbares Verhalten fuer Tour-Kontext, Tour-Spalte und stornierten Remove-Button
  - `tests/unit/ui/attachmentsPanels.helpIcon.wiring.test.tsx`
    - jetzt Laufzeitpruefung der panel-spezifischen HelpKeys
  - `tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx`
    - jetzt sichtbarer Projektkopf und Hover-/Inhaltsverhalten statt Quelltextsuche
  - `tests/unit/ui/appointmentForm.overlayBack.wiring.test.ts`
    - ersetzt durch `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`
- Gelöscht:
  - `tests/unit/ui/appointmentForm.appointmentCacheInvalidation.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.createSidebarDrafts.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.documentExtractionFlow.test.tsx`
  - `tests/unit/ui/appointmentForm.extractionAttachmentLinking.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.historical-validation.test.tsx`
  - `tests/unit/ui/appointmentForm.multiDayEditDates.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.notes.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.overlapConflictToast.wiring.test.tsx`
  - `tests/unit/ui/appointmentForm.saveAndEmployeesPanelWiring.test.tsx`
  - `tests/unit/ui/appointmentPreviews.attachmentCounters.wiring.test.ts`
  - `tests/unit/ui/appointmentPreviews.notesCounters.wiring.test.ts`
  - `tests/unit/ui/bulkImportDialogs.wiring.test.ts`
- Neue oder ergänzte Verhaltenstests:
  - `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`

## 3. Fachliche Verbesserung

- Jetzt geprüftes echtes Verhalten:
  - AppointmentEmployeeSlot zeigt oder versteckt den Tour-Picker sichtbar je nach Tourzustand.
  - AppointmentAttachmentsPanel zeigt drei reale Dokumentgruppen und im Create-Fall echte pending Anhaenge mit Blob-URL.
  - AppointmentsListPage reagiert sichtbar auf Tour-Kontext und markiert stornierte Termine als nicht entfernbar.
  - Dokumentenpanels reichen ihre HelpKeys im Render weiter.
  - Das Wochenpanel zeigt Auftragsnummer und Projektname sichtbar im Projektkopf und rendert Projektinhalt nur bei echtem Inhalt.
  - AppointmentForm trennt Hauptbereich und Sidebar sichtbar in Create/Edit und zeigt im Overlay sichtbar den Zurueck-Button.
- Entfernte Scheinsicherheit:
  - keine `readFileSync`-Quelltextpruefungen mehr fuer diese verbleibenden Dateien
  - keine Assertions mehr auf Source-Strings fuer Routing, JSX-Fragmente oder Hook-Wiring in den behaltenen Resttests
  - mehrere geloeschte Dateien waren nur Implementierungsinspektion ohne beobachtbaren Effekt
- Innerhalb der Gruppe bewusst anderweitig abgesicherte Themen:
  - Create-Sidebar-Drafts und Extraktions-Handoff sind bereits staerker ueber `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts` abgedeckt
  - Historische Guards sind staerker ueber `tests/integration/server/appointments.historical-guards.integration.test.ts` abgedeckt
  - Attachment- und Notes-Counter in Kalenderdaten sind staerker ueber `tests/integration/server/calendar.appointments.attachment-counts.integration.test.ts` und `tests/integration/server/calendar.appointments.notes-counts.integration.test.ts` abgedeckt
- Weiterhin bestehende Lücken innerhalb der Gruppe:
  - kein sauberer Verhaltenstest fuer die async Edit-Hydrierung der Datumsfelder im AppointmentForm
  - kein sauberer Verhaltenstest fuer die toast-spezifische Save-Fehlerbehandlung bei `EMPLOYEE_OVERLAP_CONFLICT` und `VERSION_CONFLICT`
  - kein sauberer Verhaltenstest fuer die interne Query-Invalidierungsfan-out-Logik nach Termin-Mutationen

## 4. Testergebnis

- Ausgeführt:
  - `npm run test:unit -- tests/unit/ui/appointmentEmployeeSlot.wiring.test.tsx tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx tests/unit/ui/appointmentsListPage.tourLocking.wiring.test.tsx tests/unit/ui/attachmentsPanels.helpIcon.wiring.test.tsx tests/unit/ui/appointmentPreviews.orderNumberWiring.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`
- Grün:
  - alle 7 betroffenen Restdateien
  - insgesamt 14 Tests grün
- Fehlgeschlagen:
  - keine

## 5. Offene Blocker

- `appointmentForm.multiDayEditDates`
  - Fachlich sinnvoll waere ein Verhaltenstest, der nach echtem async Detail-Load die hydratisierten Datumsfelder im Edit-Formular prueft.
  - Das scheitert derzeit daran, dass die vorhandenen schnellen Unit-Muster in diesem Repo auf statischem Server-Render ohne Effektlauf basieren.
  - Ohne Produktivcode-Aenderung oder einen zusaetzlichen effect-faehigen UI-Test-Harness laesst sich die relevante `useEffect`-Hydrierung nicht sauber beobachten.
- `appointmentForm.overlapConflictToast`
  - Fachlich sinnvoll waere ein Verhaltenstest, der einen echten Submit ausloest und die sichtbare konfliktbezogene Fehlermeldung fuer Save-Fehler prueft.
  - Das scheitert derzeit daran, dass der Save-Pfad innerhalb des Formulars ohne effect-faehigen Interaktions-Harness nur intern ueber Layout-Props erreichbar waere und damit methodisch wieder zu nah an der Implementierung liegt.
- `appointmentForm.appointmentCacheInvalidation`
  - Fachlich sinnvoll waere ein Test auf echte sichtbare Folgeeffekte stale-freier Listen- und Projektionen nach einem Termin-Save.
  - Das scheitert derzeit daran, dass die bestehende Logik primär interne React-Query-Invalidierungen ausloest und in isolierten Node-Unit-Tests kein stabiler beobachtbarer App-Effekt ohne groesseren Harness entsteht.
