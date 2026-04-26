# Abschlusslog Test-Improvement-Plan

Datum: 27.04.2026
Branch: `temp_work_ft32_leser_release_check`

## Ziel und Scope

Abgeschlossen wurde der priorisierte Test-Verbesserungsplan aus `ai/reports/test-improvement-plan.md` im vereinbarten Scope:

- kein Produktionscode
- keine serverseitige Rollenabsicherung als Teil dieses Auftrags
- Fokus auf stärkere fachliche Aussagekraft bestehender Tests

Die fachliche Einordnung der Rollenarbeit wurde während des Auftrags präzisiert:

- Reader-Readonly blieb bewusst im historischen UI-/Flow-Scope
- echte serverseitige Verweigerung wurde nicht ergänzt, wenn sie im Ist-System nicht existiert

## Umgesetzte Punkte

1. Tour-/Mitarbeiter-Helper-Fidelity bereinigt

- die irreführenden No-op-Helfer `assignEmployeesToTourFixture()` wurden aus den betroffenen Helpers und Aufrufern entfernt
- betroffene Integrationssuiten verlassen sich nicht mehr auf eine nur scheinbare Tour-/Mitarbeiter-Zuordnung

2. HelpText-Seed fachlich gehärtet

- neue Integrationssuite für Seed-Wirkung, Ausschluss und Idempotenz ergänzt
- der Nachweis geht jetzt über POST/Invalidierung hinaus und prüft echte fachliche Ergebnisse

3. Irreführende Wiring-/Render-/Integration-Namen ehrlich gemacht

- schwache UI-Units wurden als Smoke-/Renderer-Schicht herabgestuft und passend umbenannt
- dadurch behaupten diese Dateien keine stärkere Fachabsicherung mehr, als sie tatsächlich leisten

4. Reader-Readonly mit echten Daten nachgeschärft

- für Kunden, Projekte, Termine/Kalender, Mitarbeiter und Touren wurden fokussierte Browser-Suiten auf echte Daten, sichtbare Bestandsinformationen und fehlende UI-Mutationspfade gehoben
- die Tests prüfen jetzt readonly Sichtbarkeit und nicht erreichbare Mutationspfade statt bloßer Button-Präsenz

5. Listen-, Karten- und Filter-Nachweise geschärft

- Terminlisten-Periodenpfade wurden auf Identität, Count und Negativtreffer gehoben
- zusätzlich wurde ein echter Konkurrenzdaten-Nachweis für Kunden- und Projektkarten ergänzt, damit Badge und Hover nur korrekt verknüpfte Termine zeigen

6. Tagging- und Sidebar-Nutzerwirkung ergänzt

- Kunden- und Mitarbeitertags werden jetzt über echte Auswahl-, Speicher- und Wiederfinde-Pfade geprüft
- ein Mitarbeiter-Create-Sidebar-Pfad sichert Notiz- und Anhang-Persistenz über den ersten Save und Reopen hinweg

## Wichtige neue oder umbenannte Tests

- `tests/integration/server/helpTexts.seed-missing.ft28.integration.test.ts`
- `tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`
- `tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts`
- `tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts`
- `tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts`
- `tests/e2e-browser/reader-tours-readonly.browser.e2e.spec.ts`
- `tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts`
- `tests/e2e-browser/customer-tags.persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-tags.persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/employee-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `tests/e2e-browser/entity-card-appointments.competition.browser.e2e.spec.ts`
- mehrere umbenannte Smoke-/Renderer-Dateien unter `tests/unit/ui/` und `tests/integration/ui/`

## Ausgeführte Verifikation

Gezielt ausgeführt und grün:

- `npm run test:integration -- --reporter=verbose tests/integration/server/appointments.employee-overlap.integration.test.ts tests/integration/server/appointments.employee-overlap.flow.integration.test.ts tests/integration/server/appointments.employee-overlap.multiday.integration.test.ts tests/integration/server/ft01.full-uc-coverage.integration.test.ts`
- `npm run test:unit -- tests/unit/services/helpTextsService.seedMissing.test.ts`
- `npm run test:integration -- --reporter=verbose tests/integration/server/helpTexts.seed-missing.ft28.integration.test.ts`
- `npm run test:unit -- tests/unit/ui/helpTextsPage.seed.smoke.test.tsx tests/unit/ui/settingsPage.controls.smoke.test.tsx tests/unit/ui/tourenplanReportPanel.smoke.test.tsx tests/unit/ui/tourWeekForm.smoke.test.tsx tests/unit/ui/appointmentsListPage.tourLocking.smoke.test.tsx tests/unit/ui/standaloneDomainViews.listFallback.smoke.test.tsx tests/unit/ui/tourManagement.role-readonly.smoke.test.tsx tests/unit/ui/customersPage.readerReadonly.smoke.test.tsx tests/unit/ui/calendarYearView.readerReadOnly.smoke.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/ui/projectArticleDescriptionRenderer.renderer.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-customer-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-tours-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-project-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-appointments-calendar-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/reader-employee-readonly.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointments-list.period-picker.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/customer-tags.persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-tags.persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/employee-form.create-sidebar-persistence.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/entity-card-appointments.competition.browser.e2e.spec.ts`

## Abschlussbewertung

Für den vereinbarten Scope ist der Test-Improvement-Plan abgeschlossen.

Offen bleiben nur bewusst nicht gezogene Folgearbeiten:

- echte serverseitige Rollenabsicherung
- niedrig priorisierte Smoke-/Markup-Reste ohne hohes fachliches Risiko

Die wichtigste Wirkung dieses Auftrags ist die Verschiebung von scheinbarer Sicherheit durch Wiring-/Markup-Tests hin zu kleineren, aber fachlich stärkeren Browser- und Integrationsnachweisen.
