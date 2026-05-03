# Wochenkalender KW-Plan und Notizen

Datum: 03.05.26
Branch: `refactor/week-calendar-tour-personnel`
Basis: abgezweigt vom damaligen Arbeitsbranch `work`

## Zweck

Die Session bündelt die Weiterarbeit am refaktorierten Wochenkalender. Ziel war, die Tour-KW-Personalplanung im Wochenkalender nutzbar und lesbar zu machen, Notizen direkt an Terminkarten sichtbar zu machen und mehrere Folgekorrekturen aus der visuellen Prüfung einzuarbeiten.

## Scope

- Notizen können im Wochenkalender direkt an Terminkarten angezeigt werden.
- Die Anzeige berücksichtigt Termin- und Projektnotizen.
- Die Tour-KW-Personalplanung wurde über eine eigene linke Spalte in das Wochenblatt eingebunden.
- Die Spalte läuft durch Kopf, Abwesenheiten und Kalenderkörper, damit Feiertags- und Tagesraster nicht verschoben werden.
- Die Personalspalte kann kollabiert und expandiert werden.
- Alle Tour-Lanes bekommen einen eigenen Header in der Personalspalte.
- `Ohne Tour`, `Abwesenheiten` und `Parkplatz` zeigen dort keine Planungs-Aktionen.
- Die expandierte Spaltenbreite wird aus den tatsächlich gerenderten Mitarbeiter-Badges gemessen.
- Das Kartenmenü von Mehrtagesterminen wurde an das Menü normaler Wochenterminkarten angeglichen.
- Der doppelte Feiertage-Tab unter Stammdaten wurde entfernt; der Zugang über Einstellungen bleibt bestehen.
- Die Kopf-Toggles wurden von Switches auf `Ja`/`Nein` umgestellt.
- `Personal` wurde im Wochenkopf in `KW Plan` umbenannt.
- `Notizen` ist nun ebenfalls als benutzerspezifische Einstellung persistent.

## Technische Entscheidungen

- Die vorhandenen Tour-KW-Endpoints und Kaskadendialoge werden weiterverwendet.
- Für die Verfügbarkeit neuer KW-Mitarbeiter bleibt die serverseitige Prüfung maßgeblich.
- Die Personalspalte verwendet dieselbe Wochenrasterlogik wie die Tagesbereiche.
- Die Spaltenbreite im expandierten Zustand wird im DOM gemessen statt aus Textlängen geschätzt.
- Die bestehende Rollenlogik wurde nicht erweitert: Planungsaktionen bleiben an bestehende Admin-/Disposition-Rechte, Locks und zulässige Tour-Lanes gebunden.
- Für Notizen wurde ein neues USER-Setting `calendar.weekInlineNotes.visible` ergänzt.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`
- `client/src/components/calendar/CalendarWeekSpanningTile.tsx`
- `client/src/lib/calendar-appointments.ts`
- `client/src/hooks/useSettings.ts`
- `server/controllers/appointmentsController.ts`
- `server/services/appointmentsService.ts`
- `server/repositories/notesRepository.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/settings/registry.ts`
- `shared/routes.ts`
- `client/src/components/MasterDataPage.tsx`
- betroffene Unit-, Integrations- und Browser-E2E-Tests

## Hinweise zum Testen

Gezielt grün gelaufen sind während der Session:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/calendar-markers-visualization.browser.e2e.spec.ts`
- `git diff --check`

Der vom Nutzer gewünschte Audit und volle Testlauf ohne Coverage folgen nach diesem Log und dem Commit.

## Bekannte Einschränkungen

- Die Browser- und Integrationsabdeckung ist auf die fachlich betroffenen Pfade fokussiert; der anschließend angeforderte volle Testlauf prüft den Branch breiter.
- Die Notizen-Anzeige ist bewusst ein Anzeige-Toggle und ersetzt nicht die bestehenden Notizverwaltungsdialoge.
- Die Feiertage-Verwaltung bleibt nur über den Admin-Einstellungsbereich erreichbar.
