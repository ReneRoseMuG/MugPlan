# FT13 Notizen: CardColor, Drucken, Migration und Browser-Verifikation

## Zweck

Umsetzung der FT13-Erweiterung fuer Notizen und Notizvorlagen um `cardColor` und `print`, inklusive serverseitiger Vererbung aus Vorlagen, Lock-Regel fuer vorlagengebundene Farben, Migrationen, UI-Verdrahtung und planrelevanter Testabdeckung.

## Scope

- Schemaerweiterung fuer `note` und `note_template`
- neue Drizzle-Migration `0006_notes_card_color_print.sql` inklusive `migrations/meta/*`
- serverseitige Vererbung von `cardColor` und `print` aus Vorlagen
- Sperre fuer Farbupdates bei template-gebundener Farbe
- UI fuer Farbwaehler und Druck-Switch in Notizen und Notizvorlagen
- Kartenhintergrund auf Basis von `cardColor`
- Integrationstests und planrelevante Browser-Tests fuer Projekt-, Kunden- und Terminnotizen

Nicht weiter behandelt:

- Wochenansicht-/Kumulationspruefung im FT13-Browsertest, da aus dem Thema genommen
- sonstige nicht planrelevante Browsertests

## Technische Entscheidungen

- `cardColor` wird als Hex-Farbstring im Datenmodell gespeichert.
- `print` ist serverseitig default-true modelliert und wird bei Template-Verwendung an die Notiz vererbt.
- Das serverseitige Feld `cardColorLocked` verhindert, dass template-geerbte Farben per Update ueberschrieben werden.
- Freie Notizen uebernehmen `cardColor` und `print` nun direkt beim Create; zuvor wurden diese Werte nur bei `templateId` gesetzt.
- Die bestehende Migration `0005_refactor_product_management.sql` wurde fuer den kanonischen Migrationspfad auf teilapplizierten Test-DB-Zustaenden gehaertet, damit `0005` und `0006` sauber seriell laufen.

## Betroffene Dateien

- `shared/schema.ts`
- `server/services/projectNotesService.ts`
- `server/services/customerNotesService.ts`
- `server/services/appointmentNotesService.ts`
- `server/repositories/notesRepository.ts`
- `server/repositories/noteTemplatesRepository.ts`
- `client/src/components/NotesSection.tsx`
- `client/src/components/NoteTemplatesPage.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/CustomerData.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/ui/color-select-button.tsx`
- `client/src/components/notes/EntityNotesHoverPreview.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentNotesPreview.tsx`
- `migrations/0006_notes_card_color_print.sql`
- `migrations/meta/0006_snapshot.json`
- `migrations/meta/_journal.json`
- `tests/integration/server/notes.joins-and-template-integrity.integration.test.ts`
- `tests/integration/server/appointment.notes.card-color-print.integration.test.ts`
- `tests/unit/ui/notesSection.cardColorPrint.wiring.test.tsx`
- `tests/unit/ui/noteTemplates.cardColorPrint.wiring.test.tsx`
- `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`
- `docs/TEST_MATRIX.md`

## Testen

Ausgefuehrt:

- `npm run db:migrate:test`
- `npm run db:migration-status:test`
- `npm run check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- `npx cross-env NODE_ENV=test MUGPLAN_MODE=test playwright test tests/e2e-browser/notes.ft13.browser.e2e.spec.ts -c playwright.config.ts --project=chromium --reporter=line --workers=1`

Ergebnis:

- Migrationen fuer `0005` und `0006` erfolgreich, Status synchron
- planrelevante FT13-Integrationstests erfolgreich
- planrelevante FT13-Browserfaelle erfolgreich: Projekt, Kunde, Termin
- FT13-Kumulationstest bleibt bewusst `skip`

## Bekannte Einschraenkungen

- Der Gesamtlauf `npm run test:e2e:browser` wurde nicht erneut als Komplettlauf fuer alle Browserdateien abgeschlossen, weil nicht planrelevante offene Browserfaelle explizit ausgeklammert wurden.
- Im Arbeitsbaum liegen zusaetzlich testbezogene Anpassungen ausserhalb von FT13 vor, die mit dem Gesamtcommit gemeinsam aufgenommen wurden.
