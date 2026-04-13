# Auftragslog: Formular-Layout-Sync

## Zweck

Mehrere Edit-Formulare wurden visuell an die Termin-Vorlage angeglichen. Zusätzlich wurden sichtbare Titeltexte vereinheitlicht und direkt betroffene UI-Tests auf die geänderten Beschriftungen aktualisiert.

## Scope

- Terminformular: linke Inhaltsbreite wieder an globale Admin-Settings-Breite gebunden.
- Projektformular: gleiche Breitenanpassung wie Termin sowie Titel auf `Projekt bearbeiten`.
- Kundenformular: Titel auf `Kunde bearbeiten`, linke Hauptspalte auf Cream-Hintergrund, Inhaltsbereiche als Panels für `Stammdaten`, `Kontakt`, `Adresse`, `Status`.
- Mitarbeiterformular: Titel auf `Mitarbeiter bearbeiten`, linke Hauptspalte auf Cream-Hintergrund, Stammdaten-Ansicht in Panels für `Stammdaten`, `Kontakt`, `Status`.
- Teamformular: Titel auf `Team bearbeiten`, linke Hauptspalte auf Cream-Hintergrund, Mitgliederbereich als Panel konsolidiert.
- Tourformular: linke Hauptspalte auf Cream-Hintergrund, `Stammdaten` lokal auf globale Formular-Max-Breite begrenzt, Titel auf `Tour bearbeiten`.
- Termin-Dokumente: Untergruppe im Dokumente-Panel von `Terminanhänge` auf `Termindokumente` umbenannt.
- Tests: direkte Text-Assertions für Projekt-Overlay und Termin-Dokumente an die geänderten UI-Texte angepasst.

## Technische Entscheidungen

- Die linke Hauptspalte wurde nicht pro Formular über innere Wrapper eingefärbt, sondern über eine minimale Erweiterung von `EntityFormShell` mittels `mainClassName`, damit die gesamte linke Shell-Spalte konsistent gefärbt werden kann.
- Die globale Formular-Max-Breite aus `entityFormShell.contentMaxWidthPx` bleibt die Referenz. Lokale `contentMaxWidth={99999}`-Overrides wurden dort entfernt, wo sie die zentrale Breitenlogik aushebelten.
- Für das Tourformular wurde die Breitenbegrenzung bewusst nur im Tab `Stammdaten` verwendet, damit Tabs und der Inhalt von `Termine` unverändert bleiben.

## Betroffene Dateien

- `client/src/components/ui/entity-form-shell.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/TeamEditForm.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/AppointmentAttachmentsPanel.tsx`
- `tests/e2e-browser/project-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/unit/ui/appointmentAttachmentsPanel.grouping.wiring.test.tsx`

## Hinweise zum Testen

- Besonders relevant sind die Browser-E2E-Fälle für Projekt-Overlay aus Dokumentextraktion sowie der Unit-Test für die Gruppierung im Termin-Dokumente-Panel.
- Visuelle Änderungen an Kunde, Mitarbeiter, Team und Tour sind derzeit nur begrenzt testseitig abgesichert und sollten bei Bedarf zusätzlich browserseitig geprüft werden.

## Bekannte Einschränkungen

- In dieser Session wurde kein Audit und kein Testlauf ausgeführt.
- Reine Farb- und Breitenanpassungen sind überwiegend nur indirekt über Strukturtests abgesichert, nicht über explizite Style-Assertions.
