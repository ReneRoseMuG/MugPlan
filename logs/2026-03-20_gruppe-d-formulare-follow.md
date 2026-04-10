# Gruppe D: Kunden-, Mitarbeiter-, Projekt- und Entity-Formulare

## 1. Bearbeitete Gruppe

- Name der Gruppe: Gruppe D - Kunden-, Mitarbeiter-, Projekt- und Entity-Formulare
- Betroffene Testdateien:
  - Ersetzt:
    - `tests/unit/ui/projectStatusPage.actions.test.tsx`
    - `tests/unit/ui/projectAttachmentsPanel.grouping.wiring.test.tsx`
    - `tests/unit/ui/employeesPage.importDialog.wiring.test.tsx`
    - `tests/unit/ui/employeesPage.scopeUx.test.tsx`
    - `tests/unit/ui/customerDetailCard.relationCompact.test.tsx`
    - `tests/unit/ui/entityFormShell.layout.test.tsx`
    - `tests/unit/ui/entityCard.layout.test.tsx`
  - Geloescht:
    - `tests/unit/ui/customerData.appointmentCacheInvalidation.wiring.test.tsx`
    - `tests/unit/ui/customerData.documentExtractionFlow.test.tsx`
    - `tests/unit/ui/customerData.notesSidebarLayout.wiring.test.ts`
    - `tests/unit/ui/customerData.notesVersioning.test.tsx`
    - `tests/unit/ui/customerData.versioning.test.tsx`
    - `tests/unit/ui/employeeForm.removeFromAppointment.wiring.test.tsx`
    - `tests/unit/ui/employeeSelectEntityEditDialog.memberHeaderAction.wiring.test.tsx`
    - `tests/unit/ui/employeesPage.currentAppointmentsCounter.wiring.test.tsx`
    - `tests/unit/ui/employeesPage.versioning.test.tsx`
    - `tests/unit/ui/entityAppointmentsSidebar.readonly.wiring.test.ts`
    - `tests/unit/ui/entityAppointmentsSidebarWithDialog.wiring.test.tsx`
    - `tests/unit/ui/entityCards.doubleClickEdit.wiring.test.ts`
    - `tests/unit/ui/linkedProjectCard.customerAndOrderNumber.wiring.test.tsx`
    - `tests/unit/ui/projectAppointmentsPanel.deleteWiring.test.tsx`
    - `tests/unit/ui/projectForm.amountWiring.test.tsx`
    - `tests/unit/ui/projectForm.appointmentCacheInvalidation.wiring.test.tsx`
    - `tests/unit/ui/projectForm.calendarWorkspaceButton.wiring.test.tsx`
    - `tests/unit/ui/projectForm.createSidebarDrafts.wiring.test.tsx`
    - `tests/unit/ui/projectForm.deleteWiring.test.tsx`
    - `tests/unit/ui/projectForm.documentExtractionFlow.test.tsx`
    - `tests/unit/ui/projectForm.notesSidebarLayout.wiring.test.ts`
    - `tests/unit/ui/projectForm.notesVersioning.test.tsx`
- Fachlicher Fokus:
  - sichtbare Formular-Shells und Karten
  - admin-/rollenabhaengige Mitarbeiterlisten-UX
  - sichtbare Dokumenten- und Projektstatus-Aktionen

## 2. Durchgefuehrte Aenderungen

- Ersetzt wurden sieben reine Source- oder Verdrahtungstests durch Laufzeitpruefungen auf gerendertes Verhalten:
  - `projectStatusPage.actions.test.tsx` prueft jetzt sichtbare Listenaktionen, versioniertes Toggle/Delete und Query-Invalidierung.
  - `projectAttachmentsPanel.grouping.wiring.test.tsx` prueft jetzt echte Projekt-/Kundensektionen sowie Pending-Anhaenge im Create-Fall.
  - `employeesPage.importDialog.wiring.test.tsx` prueft jetzt den admin-only Import-Einstieg, den initial geschlossenen Dialog und `resetSignal=0`.
  - `employeesPage.scopeUx.test.tsx` prueft jetzt die Filter-Props und die echten Employee-Query-Scopes fuer Admin/Nicht-Admin.
  - `customerDetailCard.relationCompact.test.tsx` prueft jetzt die sichtbare kompakte Felddarstellung und die Kuerzung von Nummer/PLZ.
  - `entityFormShell.layout.test.tsx` prueft jetzt das sichtbare Slot-Verhalten der Shell.
  - `entityCard.layout.test.tsx` prueft jetzt das gerenderte Footer-Verhalten in `EntityCard` und `ColoredEntityCard`.
- Geloescht wurden die verbleibenden `readFileSync`-, String- und JSX-Strukturtests dieser Gruppe.
- Beibehalten wurden keine weiteren Tests aus der Inventargruppe in ihrer alten Form; der verbleibende sinnvolle Bestand dieser Gruppe liegt in den sieben ersetzten Verhaltenstests.

## 3. Fachliche Verbesserung

- Jetzt geprueftes echtes Verhalten:
  - Form-Shells und Karten zeigen oder verbergen Slots sichtbar im gerenderten Markup.
  - Mitarbeiterlisten unterscheiden Admin und Nicht-Admin sichtbar und auch in den abgefragten Query-Scopes.
  - Projektstatus-Aktionen senden versionierte Mutationen und invalidieren die Status-Familie.
  - Das Projektdokumentenpanel zeigt reale Projekt-/Kundensektionen und Pending-Anhaenge im Create-Fall.
  - Die kompakte Kundendarstellung zeigt nur die erlaubten Felder und begrenzt Nummer/PLZ sichtbar.
- Entfernte Scheinsicherheit:
  - Quelltext-Suchen nach API-Strings, Props, JSX-Fragmenten und CSS-Klassen
  - Verdrahtungsannahmen fuer Formulare ohne gerenderten Laufzeitbeleg
  - Source-Assertions auf Sidebar-, Draft-, Versionierungs- und Dokumentflussdetails
- Weiter bestehende Luecken innerhalb der Gruppe:
  - Projekt- und Kundenformular-Save-Flows, Delete-Konfliktmapping, Notiz-Versionierung und Draft-Nachpersistenz sind in dieser Gruppe nicht neu als Verhaltenstests aufgebaut.
  - Dokumentextraktionspfade in `ProjectForm` und `CustomerData` bleiben ohne neue Verhaltenstests in dieser Gruppe.
  - Einige gestrichene Source-Tests hatten fachlich sinnvolle Absichten, sind aber ohne deutlich groesseren Mock-/Interaktionsaufbau in der bestehenden Teststruktur nicht klein und sauber auf beobachtbares Verhalten abbildbar.

## 4. Testergebnis

- Ausgefuehrte betroffene Tests:
  - `npm run test:unit -- tests/unit/ui/entityFormShell.layout.test.tsx tests/unit/ui/customerDetailCard.relationCompact.test.tsx tests/unit/ui/entityCard.layout.test.tsx tests/unit/ui/projectAttachmentsPanel.grouping.wiring.test.tsx tests/unit/ui/employeesPage.scopeUx.test.tsx tests/unit/ui/employeesPage.importDialog.wiring.test.tsx tests/unit/ui/projectStatusPage.actions.test.tsx`
- Gruen:
  - alle 7 ausgefuehrten Testdateien
  - 14 Tests insgesamt erfolgreich
- Fehlgeschlagen:
  - keine

## 5. Offene Blocker

- Saubere Verhaltenstests fuer `ProjectForm`- und `CustomerData`-Save-/Delete-/Versionierungspfad wuerden deutlich tiefere Formularinteraktion, Query-Lifecycle und Fehler-Mocking benoetigen, als fuer diese kontrollierte Gruppenbearbeitung vertretbar war.
- Saubere Verhaltenstests fuer Create-Sidebar-Drafts, Cache-Invalidierungs-Fan-out und Dokumentextraktionsuebernahmen wuerden mehrere asynchrone Formular- und Dialogpfade gleichzeitig aufspannen und damit den Auftrag deutlich ausweiten.
- Ein fachlich sinnvoller Verhaltenstest fuer den Projektformular-Einstieg in den Kontextkalender waere moeglich, wurde hier aber nicht priorisiert, weil der Kalender-Kontext bereits in der vorherigen Kalender-Gruppe auf benachbarten Pfaden nachgearbeitet wurde.
