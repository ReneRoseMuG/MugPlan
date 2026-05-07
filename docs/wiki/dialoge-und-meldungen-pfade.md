# Dialoge und Meldungen - Pfadinventur

Stand: 07.05.26

## Zweck

Diese Datei sammelt die erkannten Pfade, an denen Nutzer mit Dialogen, Bestätigungen, Alerts, Toasts, Inline-Meldungen oder rohen Fehlertexten konfrontiert werden. Sie dient als Arbeitsgrundlage für die Dialog-Basiskomponente, die Multistep-Variante und die spätere Vereinheitlichung verständlicher Fehlermeldungen.

Die Inventur ist eine statische Code-Sichtung. Sie ersetzt keine Laufzeitprüfung im Browser und keine fachliche Freigabe der späteren Dialogtexte.

## Suchumfang

Gesichtet wurden die Frontend-Pfade unter `client/src` mit Fokus auf:

- `Dialog`, `DialogContent`, `AlertDialog`
- selbst gebaute Overlays mit `fixed inset`
- `toast`, `useToast`, Inline-Fehler und `Alert`
- native Browser-Bestätigungen über `window.confirm`
- Fehlerquellen wie `response.text()`, `throw new Error(...)` und zentrale API-Fehlerbehandlung
- gerenderte HTML-Inhalte, soweit sie Nutzerflächen betreffen können

Nicht bewertet wurden Serverrollen, API-Berechtigungen oder fachliche Textfreigaben. Diese Datei ändert keine Sichtbarkeit und keine zulässigen Aktionen.

## Legende

| Kürzel | Bedeutung |
|---|---|
| Dialog | Modale Oberfläche über Radix/Shadcn oder eigenes Overlay |
| Bestätigung | Sicherheits- oder Entscheidungsdialog vor einer Aktion |
| Meldung | Toast, Inline-Fehler, Alert oder Formularmeldung |
| Rohfehler-Risiko | Technische Codes, JSON, HTML oder HTTP-Rohtexte können sichtbar werden |
| Basisdialog | Kandidat für die neue Dialog-Basiskomponente |
| Fehlerdialog | Kandidat für zentrale, verständliche Fehlerdialoge |

## Querschnitt und zentrale Fehlerflächen

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/ui/dialog.tsx` | Dialog-Primitiv | Basis aller Radix/Shadcn-Dialoge | Niedrige Ebene. Die neue Basiskomponente sollte darüber liegen, damit bestehende Primitive nicht still verändert werden. |
| `client/src/components/ui/alert-dialog.tsx` | Bestätigungs-Primitiv | Basis vieler Sicherheitsabfragen | Kandidat für standardisierte Bestätigungen mit einheitlichem Header, Body und Footer. |
| `client/src/components/ui/alert.tsx` | Inline-Alert | Sichtbare Warn- und Fehlerboxen | Muss bei Fehlermeldungen parallel zum Fehlerdialog betrachtet werden. |
| `client/src/components/ui/form.tsx` | Formularmeldung | `FormMessage` zeigt Validierungsfehler | Zentrale Inline-Formularmeldungen bleiben wichtig, auch wenn kritische Fehler künftig als Fehlerdialog erscheinen. |
| `client/src/hooks/use-toast.ts` | Toast-System | Globale Kurzmeldungen | Viele Fehler laufen nur als Toast. Für schwere Fehler braucht es eine Grenze zwischen Toast und Fehlerdialog. |
| `client/src/components/ui/toaster.tsx` | Toast-Ausgabe | Rendert globale Toasts | Ausgabestelle für bestehende Meldungen. |
| `client/src/lib/queryClient.ts` | Fehlerquelle | Wirft Fehler im Format `Status: Text` | Hohes Rohfehler-Risiko. Zentrale Quelle für kryptische Codes, JSON und HTML-Salat. |
| `client/src/providers/SettingsProvider.tsx` | Fehlerquelle/Meldung | Settings-Fehler werden aus `response.text()` übernommen | Hohes Rohfehler-Risiko bei Konfigurations- und Versionskonflikten. |
| `client/src/lib/auth.ts` | Fehlerquelle | Auth-Fehlercodes und Statusmeldungen | Kann technische Codes bis in Login- oder Session-Flächen tragen. |
| `client/src/lib/calendar-appointments.ts` | Fehlerquelle | Kalenderdaten, Lane-Previews, blockierte Wochen, PLZ-Vorschläge | Fachliche Ladefehler, die in Kalenderflächen verständlich abgefangen werden müssen. |
| `client/src/lib/calendar-markers.ts` | Fehlerquelle | Kalendermarker-Fehler | Relevanz für Kalender-Admin und Kalenderanzeigen. |
| `client/src/lib/tags.ts` | Fehlerquelle | Tag-Ladefehler aus API-Texten | Rohfehler-Risiko bei Tag-Flächen und Termin-Tags. |
| `client/src/lib/monitoring.ts` | Meldung | Monitoring-Fehler per Toast | Kandidat für verständlichere Betriebsfehlermeldungen. |
| `client/src/components/ui/help/help-icon.tsx` | HTML-Fläche | Hilfetext wird als HTML gerendert | Kein Dialogfehler, aber relevant für HTML-Salat-Prüfung. |
| `client/src/components/ui/list-empty-state.tsx` | HTML-Fläche | Hilfetext wird als HTML gerendert | Bei fehlerhaften Hilfeinhalten kann HTML sichtbar oder falsch dargestellt werden. |
| `client/src/components/ui/project-article-description-renderer.tsx` | HTML-Fläche | Projektartikelbeschreibung wird als HTML gerendert | Separat von Fehlerdialogen prüfen, weil HTML hier fachlich gewollt sein kann. |

## App-Shell, Login und Setup

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/pages/Login.tsx` | Meldung | Inline-Fehler für Login, Schnelllogin und 2FA | Muss beim Fehlerdesign berücksichtigt werden. Enthält auch technisch wirkende Texte und eine uneinheitliche Schreibweise bei 2FA-Prüfung. |
| `client/src/pages/AdminSetup.tsx` | Meldung | Inline-Fehler beim initialen Admin-Setup | Gehört zu sicherheitsnahen Fehlermeldungen, sollte klare Auswege nennen. |
| `client/src/pages/Home.tsx` | Dialog/Meldung/Overlay | Dispatcher-Konflikt-Dialog, Monitoring- und Termindetail-Fehler, Vollbildbereiche | Basisdialog-Kandidat für Konfliktanzeige; Fehlertexte sollten nicht roh aus API-Fehlern kommen. |
| `client/src/pages/StandaloneDomainViews.tsx` | Overlay | Vollbild-Domainansichten | Kein klassischer Dialog, aber Nutzer wird in modal wirkender Oberfläche geführt. |
| `client/src/pages/StandaloneCalendarWeek.tsx` | Overlay | Vollbild-Wochenkalender | Relevant für Kalenderpfade, aber eher Layout-Overlay als Dialog. |
| `client/src/pages/StandaloneCalendarMonth.tsx` | Overlay | Vollbild-Monatskalender | Relevant für Kalenderpfade, aber eher Layout-Overlay als Dialog. |
| `client/src/pages/not-found.tsx` | Meldung | 404-Fehlerseite mit Alert-Charakter | Für konsistente Fehlerkommunikation aufnehmen. |

## Termine und Terminformular

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/AppointmentForm.tsx` | Dialog/Bestätigung/Meldung | Projekt-, Kunden- und Mitarbeiter-Auswahldialoge; Bestätigungen für Speichern ohne Mitarbeiter, Parken, Löschen und Verwerfen; Alerts für stornierte oder gesperrte Termine; viele Fehler-Toasts | Höchste Priorität. Zentrale Terminfläche mit vielen Dialogvarianten und hohem Rohfehler-Risiko durch API-Textauswertung. |
| `client/src/components/AppointmentCancelConfirmDialog.tsx` | Bestätigung | Stornieren bestätigen | Kandidat für standardisierte Bestätigungskomponente. |
| `client/src/components/AppointmentAttachmentsPanel.tsx` | Meldung | Upload-Erfolg und Upload-Fehler per Toast | Rohfehler-Risiko durch direkte API-Textübernahme. |
| `client/src/components/AttachmentDeleteAction.tsx` | Bestätigung/Meldung | Löschaktion für Anhänge | Prüfen, ob Bestätigung und Fehlerausgabe konsistent sind. |
| `client/src/components/AppointmentsListPage.tsx` | Meldung | Listen- und Aktionsfehler im Terminlisten-Kontext | Bei Rollout nach dem Terminformular prüfen. |
| `client/src/components/CustomerAppointmentsPanel.tsx` | Meldung | Terminliste im Kundenkontext | Fehler müssen kundennah und ohne technische Rohdaten erscheinen. |
| `client/src/components/ProjectAppointmentsPanel.tsx` | Meldung | Terminliste im Projektkontext | Gleiche Fehlerklasse wie Kunden-Terminpaneel. |
| `client/src/components/calendar/CalendarAppointmentCompactBar.tsx` | Meldung | Kompakte Termininformationen und Aktionsstatus | Relevanz für Kalenderfeedback. |
| `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx` | Bestätigung/Meldung | Parken und Löschen von Terminen aus Wochenpanel; Fehler- und Aktionsmeldungen | Muss mit `AppointmentForm.tsx` vereinheitlicht werden. |
| `client/src/components/calendar/CalendarWeekSpanningTile.tsx` | Bestätigung/Meldung | Parken und Löschen bei mehrtägigen Terminkacheln | Muss mit Terminbestätigungen konsistent werden. |
| `client/src/components/calendar/CalendarMonthSheetView.tsx` | Bestätigung/Meldung | Parken und Löschen aus Monatsansicht | Gleicher Dialogtyp wie Wochenansicht, anderer Einstiegspfad. |
| `client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx` | Meldung/Auswahl | Tag-Auswahl und Tag-Fehler | Meldungen sollten nicht technische Tag-API-Fehler anzeigen. |
| `client/src/components/calendar/CalendarWeekAppointmentNotesPreview.tsx` | Meldung | Notizvorschau im Kalender | Ladefehler und leere Zustände prüfen. |

## Kalender, KW und Wochenplanung

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/CalendarWorkspace.tsx` | Meldung/Arbeitsfläche | Kalenderaktionen und Fehlerfeedback | Zentraler Einstieg in Kalenderdialoge und Kalenderfehler. |
| `client/src/components/calendar/CalendarWeekView.tsx` | Dialog/Bestätigung/Meldung | Mitarbeiter-Auswahl für Wochenpersonal, Notizdialoge, native Notiz-Löschbestätigung, Kalenderaktionen | Höchste Priorität für KW-Planung. Enthält bestehende Dialoge und native Browserbestätigung. |
| `client/src/components/calendar/CalendarWeekNotesDialog.tsx` | Dialog | Wochennotizen anzeigen und bearbeiten | Basisdialog-Kandidat mit scrollbarem Body. |
| `client/src/components/calendar/CalendarWeekNotesButton.tsx` | Meldung/Einstieg | Öffnet oder signalisiert Wochennotizen | Einstiegspfad zum Notizdialog. |
| `client/src/components/calendar/CalendarEmployeeFilter.tsx` | Meldung/Filter | Mitarbeiterfilter und mögliche Filterfehler | Eher Inline-/Filtermeldung als Dialog. |
| `client/src/components/ui/filter-panels/calendar-filter-panel.tsx` | Meldung | KW-Sprung- und Filterfehler | Inline-Meldungen müssen verständlich bleiben. |
| `client/src/components/CalendarMarkersAdminPage.tsx` | Meldung | Marker-Verwaltung, Fehler und Erfolgsmeldungen | Fehlerdialog nur für schwere Speichern-/Rechtefälle nötig. |

## Tour und Tour-KW-Planung

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/TourEmployeeCascadeDialog.tsx` | Dialog | Mitarbeiter kaskadierend zu Touren oder Wochenplanung hinzufügen/abziehen | Höchste Priorität. Fachlich nah an Multistep-Basisdialog und Tour-KW-Dialog. |
| `client/src/components/TourManagement.tsx` | Meldung/Fehlerquelle | Touraktionen, Vorschaufehler, Ausführen-Fehler, Validierungscodes | Hohes Rohfehler-Risiko durch technische Codes wie fehlende Versionen. |
| `client/src/components/TourEditForm.tsx` | Dialog/Bestätigung | Wochen- und Mitarbeiter-Auswahl, Tour löschen | Basisdialog für Auswahlpfade; Bestätigung für Löschpfad vereinheitlichen. |
| `client/src/components/TourWeekForm.tsx` | Dialog/Overlay/Meldung | Wochenplanungs-Overlay, Mitarbeiter-Auswahl, Speicherfehler | Wichtig für KW-Rollout; Dialogkörper muss scrollbar und robust gegen lange Inhalte sein. |
| `client/src/components/TourWeekPlanningView.tsx` | Dialog/Meldung | Mitarbeiter-Auswahl für gewählte Woche, Notiz- und Speicherfeedback | Relevanter Parallelpfad zur Wochenplanung. |
| `client/src/components/TourWeekAppointmentsHoverPreview.tsx` | Meldung | Termin-Hovervorschau kann Ladefehler zeigen | Fehler eher inline, aber nicht technisch ausgeben. |
| `client/src/components/TourWeekNotesHoverPreview.tsx` | Meldung | Notiz-Hovervorschau kann Ladefehler zeigen | Fehler eher inline, aber nicht technisch ausgeben. |
| `client/src/components/TourPostalPlanView.tsx` | Meldung | PLZ-/Tourplan-Fehlerzustand | Sichtbare Fehlerfläche im Tourkontext. |

## Projekte, Kunden und Dokumentextraktion

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/DocumentExtractionDialog.tsx` | Eigenes Overlay/Dialog | Dokumentextraktion prüfen, Warnungen anzeigen, übernehmen oder schließen | Basisdialog-Kandidat. Eigene Overlaystruktur sollte später in den Dialograhmen überführt werden. |
| `client/src/components/ProjectDuplicateResolutionDialog.tsx` | Bestätigung | Projektduplikat übernehmen oder abbrechen | Kandidat für standardisierte Entscheidungsdialoge. |
| `client/src/components/ProjectForm.tsx` | Dialog/Bestätigung/Meldung | Kundenauswahl, Änderungen verwerfen, Projekt löschen, mehrere native Übernahme-/Überschreiben-Bestätigungen | Hohe Priorität nach Termin/Tour. Enthält mehrere Browser-Confirm-Pfade. |
| `client/src/components/ProjectAppointmentsPanel.tsx` | Meldung | Projektbezogene Terminfehler | Fehlerkontext sollte Projektbezug nennen. |
| `client/src/components/ProjectAttachmentsPanel.tsx` | Meldung | Projektanhänge und Upload-/Löschfehler | Rohfehler-Risiko bei API-Texten prüfen. |
| `client/src/components/LinkedProjectsPanel.tsx` | Meldung | Verknüpfte Projekte und Fehlerzustände | Eher Inline-Meldungen. |
| `client/src/components/ProjectsPage.tsx` | Meldung | Projektlisten- und Aktionsfehler | Rollout nach zentralen Projektformularen. |
| `client/src/components/CustomerData.tsx` | Meldung | Kundenansicht, Speicher- und Ladefehler | Kundennaher Kontext muss in Meldungen erhalten bleiben. |
| `client/src/components/CustomersPage.tsx` | Meldung | Kundenliste und Aktionen | Kandidat für normalisierte Fehlertexte. |
| `client/src/components/CustomerAttachmentsPanel.tsx` | Meldung | Kundenanhänge und Upload-/Löschfehler | Rohfehler-Risiko bei API-Texten prüfen. |
| `client/src/components/filters/project-article-filter-input.tsx` | Dialog/Auswahl | Artikelfilter-Auswahl | Auswahl-Dialogpfad, niedrigeres Fehlerrisiko. |

## Mitarbeiter, Teams und Benutzer

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/EmployeeForm.tsx` | Bestätigung/Meldung | Mitarbeiter löschen, Validierungs- und Speicherfehler | Bestätigung und Fehlertexte standardisieren. |
| `client/src/components/EmployeeAppointmentAbsencesPanel.tsx` | Meldung | Abwesenheiten/Termine im Mitarbeiterkontext | Kontextmeldungen für Personalplanung. |
| `client/src/components/EmployeeAttachmentsPanel.tsx` | Meldung | Mitarbeiteranhänge und Upload-/Löschfehler | Rohfehler-Risiko bei API-Texten prüfen. |
| `client/src/components/EmployeeUtilizationView.tsx` | Meldung | Auslastungsansicht und Ladefehler | Eher Inline-Fehler. |
| `client/src/components/EmployeesPage.tsx` | Dialog/Meldung | Importdialog, Listen- und Aktionsfehler | Basisdialog-Kandidat für Importfläche. |
| `client/src/components/EmployeePickerDialogList.tsx` | Dialoginhalt | Mitarbeiter-Auswahl innerhalb mehrerer Dialoge | Kein eigener Dialograhmen, aber zentral für Auswahl-Dialoge. |
| `client/src/components/ui/employee-select-entity-edit-dialog.tsx` | Dialog | Generischer Mitarbeiter-Auswahldialog | Basisdialog-Kandidat für Auswahlaktionen. |
| `client/src/components/TeamEditForm.tsx` | Dialog/Bestätigung | Mitarbeiter-Auswahl und Team löschen | Standardisierungsbedarf für Auswahl und Löschdialog. |
| `client/src/components/TeamManagement.tsx` | Bestätigung/Meldung | Native Team-Löschbestätigungen, API-Code-Auswertung | Browser-Confirm ersetzen; Fehlertexte normalisieren. |
| `client/src/components/UsersPage.tsx` | Dialog/Bestätigung/Meldung | Benutzer anlegen/bearbeiten, 2FA-Reset per Browser-Confirm, Inline-Fehler | Hohe Sensibilität wegen Admin- und Sicherheitskontext. |

## Stammdaten, Produkte, Komponenten und Tags

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/ui/product-create-dialog.tsx` | Dialog/Meldung | Produkt anlegen, Inline-Fehler | Basisdialog-Kandidat für kleine Erfassungsdialoge. |
| `client/src/components/ui/component-create-dialog.tsx` | Dialog/Meldung | Komponente anlegen, Inline-Fehler | Gleicher Dialogtyp wie Produktanlage. |
| `client/src/components/ui/product-selection-dropdown.tsx` | Dialog/Auswahl | Produkt auswählen | Auswahl-Dialogpfad. |
| `client/src/components/ui/component-dropdown.tsx` | Dialog/Auswahl | Komponente auswählen | Auswahl-Dialogpfad. |
| `client/src/components/ui/all-component-list.tsx` | Bestätigung/Meldung | Komponente löschen per Browser-Confirm, Inline-Fehler | Native Bestätigung ersetzen; Fehler normalisieren. |
| `client/src/components/ProductManagementPage.tsx` | Bestätigung/Meldung | Produkte, Kategorien und Komponenten löschen per Browser-Confirm; Toast-Fehler | Viele Löschpfade, gute Kandidaten für standardisierte Bestätigungen. |
| `client/src/components/TagManagementPage.tsx` | Bestätigung/Meldung | Tag löschen per Browser-Confirm, Aktionsfehler | Browser-Confirm ersetzen; Fehlertexte prüfen. |

## Notizen, Hilfetexte und Import/Export

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/notes/WorkflowNoteDialogs.tsx` | Bestätigung | Workflow-Notiz anlegen oder entfernen | Kandidat für standardisierte Bestätigungsdialoge. |
| `client/src/components/NotesSection.tsx` | Bestätigung/Meldung | Notiz löschen per Browser-Confirm, Notizfehler | Browser-Confirm ersetzen. |
| `client/src/components/notes/EntityNotesHoverPreview.tsx` | Meldung | Notizvorschau und Ladefehler | Inline-Fehler prüfen. |
| `client/src/components/NoteTemplatesPage.tsx` | Bestätigung/Meldung | Notizvorlage löschen per Browser-Confirm, Listenfehler | Browser-Confirm ersetzen. |
| `client/src/components/HelpTextForm.tsx` | Bestätigung/Meldung | Hilfetext löschen per Browser-Confirm, Formularfehler | Browser-Confirm ersetzen; Hilfetextkontext nennen. |
| `client/src/components/HelpTextsPage.tsx` | Meldung | Hilfetextlisten- und Aktionsfehler | Meldungen normalisieren. |
| `client/src/components/HelpTextsImportExportDialog.tsx` | Dialog/Meldung | Import/Export-Dialog, Ergebnisreport, Inline-Fehler wie Aktionscode | Basisdialog-Kandidat; sichtbare Codes in Fehlermeldungen vermeiden. |
| `client/src/components/ImportExportPage.tsx` | Meldung | Import-/Export-Aktionsmeldungen | Fehlerdialog für schwere Import-/Exportfehler prüfen. |

## Reports, Druck, Einstellungen und Monitoring

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/print/PrintPreviewDialog.tsx` | Dialog/Meldung | Druckvorschau mit Fehlerzustand | Basisdialog-Kandidat; Body muss scrollen und große Inhalte stabil halten. |
| `client/src/components/reports/SpaltenDialog.tsx` | Eigenes Overlay/Dialog | Spaltenauswahl im Report | Eigener Dialograhmen, später auf Basisdialog migrieren. |
| `client/src/components/reports/TourenplanReportPanel.tsx` | Dialog/Meldung/Fehlerquelle | Druckvorschau und Reportfehler aus API-Texten | Rohfehler-Risiko durch `response.text()` und technische Request-Fehler. |
| `client/src/components/reports/ReportPresetControls.tsx` | Meldung/Fehlerquelle | Preset-Fehler aus API-Texten | Rohfehler-Risiko bei Report-Presets. |
| `client/src/components/ReportsPage.tsx` | Dialog/Meldung | Reportaktionen, Spalten-/Layoutdialoge, Fehlerfeedback | Standardisierung nach Tour-/Terminpfaden. |
| `client/src/components/SettingsPage.tsx` | Meldung | Einstellungsfehler und Speicherrückmeldungen | In Verbindung mit `SettingsProvider.tsx` prüfen. |
| `client/src/components/MonitoringPage.tsx` | Meldung | Monitoring-Ladefehler und Betriebsstatus | Fehlertexte sollten betrieblich verständlich sein. |
| `client/src/components/CorrectionWorkflowAdminPanel.tsx` | Meldung | Admin-Korrekturworkflow und Aktionsfehler | Admin-Kontext und Ausweg klar nennen. |
| `client/src/components/JournalRecordsView.tsx` | Meldung | Journal-Lade- und Filterfehler | Eher Inline-Fehler. |

## Weitere Overlay- und Vorschauflächen

| Pfad | Typ | Nutzerkonfrontation | Einordnung |
|---|---|---|---|
| `client/src/components/MapOverlay.tsx` | Eigenes Overlay | Kartenansicht als Overlay | Kein Fehlermeldungsfokus, aber modal wirkende Oberfläche. |
| `client/src/contexts/floating-preview-keeper.tsx` | Overlay/Vorschau | Gehaltene Floating Preview | Nicht Basisdialog, aber z-index- und Overlay-Verhalten beachten. |
| `client/src/components/ui/hover-preview.tsx` | Overlay/Vorschau | Generische Hover-Vorschau | Kein Dialog, aber konkurriert visuell mit Dialogen. |
| `client/src/components/ui/badge-previews/attachment-info-badge-preview.tsx` | Overlay/Meldung | Anhangvorschau und Textvorschaufehler | Inline-/Preview-Fehler ohne technische Rohtexte anzeigen. |
| `client/src/components/ui/entity-appointments-hover-preview.tsx` | Meldung/Vorschau | Termin-Hovervorschau | Ladefehler prüfen. |
| `client/src/components/ui/entity-edit-dialog.tsx` | Dialog | Generischer Bearbeitungsdialog | Basisdialog-Kandidat für wiederverwendbare Entity-Dialoge. |

## Native Browser-Bestätigungen

Diese Pfade nutzen `window.confirm` und sollten beim Rollout bevorzugt durch die neue Bestätigungsvariante ersetzt werden:

| Pfad | Aktion |
|---|---|
| `client/src/components/HelpTextForm.tsx` | Hilfetext löschen |
| `client/src/components/calendar/CalendarWeekView.tsx` | Kalendernotiz löschen |
| `client/src/components/NotesSection.tsx` | Notiz löschen |
| `client/src/components/NoteTemplatesPage.tsx` | Notizvorlage löschen |
| `client/src/components/ProductManagementPage.tsx` | Produkt, Produktkategorie, Komponentenkategorie oder alle Einträge einer Kategorie löschen |
| `client/src/components/ProjectForm.tsx` | Projektname übernehmen, Inhalte überschreiben, projektbezogene Entscheidungen bestätigen |
| `client/src/components/TagManagementPage.tsx` | Tag löschen |
| `client/src/components/TeamManagement.tsx` | Team löschen |
| `client/src/components/UsersPage.tsx` | 2FA zurücksetzen |
| `client/src/components/ui/all-component-list.tsx` | Komponente löschen |

## Erste Rollout-Gruppierung

### Stufe 1 - Tour, Termin, KW und Rohfehler

- `client/src/lib/queryClient.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/AppointmentCancelConfirmDialog.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/components/calendar/CalendarMonthSheetView.tsx`
- `client/src/components/calendar/CalendarWeekNotesDialog.tsx`
- `client/src/components/TourEmployeeCascadeDialog.tsx`
- `client/src/components/TourManagement.tsx`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourWeekForm.tsx`
- `client/src/components/TourWeekPlanningView.tsx`

### Stufe 2 - Auswahl-, Stammdaten- und Fachdialoge

- `client/src/components/DocumentExtractionDialog.tsx`
- `client/src/components/ProjectDuplicateResolutionDialog.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/EmployeeForm.tsx`
- `client/src/components/EmployeesPage.tsx`
- `client/src/components/TeamEditForm.tsx`
- `client/src/components/TeamManagement.tsx`
- `client/src/components/UsersPage.tsx`
- `client/src/components/ui/product-create-dialog.tsx`
- `client/src/components/ui/component-create-dialog.tsx`
- `client/src/components/ui/product-selection-dropdown.tsx`
- `client/src/components/ui/component-dropdown.tsx`
- `client/src/components/ui/employee-select-entity-edit-dialog.tsx`
- `client/src/components/ui/entity-edit-dialog.tsx`

### Stufe 3 - Reports, Import/Export, Monitoring und Nebenflächen

- `client/src/components/print/PrintPreviewDialog.tsx`
- `client/src/components/reports/SpaltenDialog.tsx`
- `client/src/components/reports/TourenplanReportPanel.tsx`
- `client/src/components/reports/ReportPresetControls.tsx`
- `client/src/components/ReportsPage.tsx`
- `client/src/components/HelpTextsImportExportDialog.tsx`
- `client/src/components/ImportExportPage.tsx`
- `client/src/components/SettingsPage.tsx`
- `client/src/providers/SettingsProvider.tsx`
- `client/src/components/MonitoringPage.tsx`
- `client/src/components/CorrectionWorkflowAdminPanel.tsx`

## Offene Prüfpunkte für die spätere Umsetzung

- Für schwere API-Fehler braucht es eine zentrale Normalisierung, bevor eine Meldung in Toast, Inline-Alert oder Fehlerdialog landet.
- Fehlerdialoge müssen Kontext, Ursache in Alltagssprache und Ausweg nennen. Reine Codes wie `VALIDATION_ERROR`, `VERSION_CONFLICT`, HTTP-Status oder JSON dürfen nicht direkt sichtbar werden.
- Native Browser-Bestätigungen sind funktional, aber nicht gestaltbar und nicht konsistent mit dem geplanten MuG-Plan-Header.
- Auswahl- und große Arbeitsdialoge brauchen einen scrollbaren Body, damit Footer-Aktionen erreichbar bleiben.
- Multistep ist vor allem für Tour-KW, Dokumentextraktion und komplexe Übernahme-/Konfliktpfade relevant.
