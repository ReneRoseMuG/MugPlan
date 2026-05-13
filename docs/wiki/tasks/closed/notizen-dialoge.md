# Notizen-Dialoge

Dialog-, Bestätigungs- und Meldungspfade für Notizen, Notizvorlagen, Workflow-Notizen, Kalendernotizen und Notizvorschauen sind im P-01-Rollout vereinheitlicht. Der Abschluss bündelt den generischen Notizdialog, Kalender-Inline-Notizen, Notizvorlagen-Rollen und die betroffenen Tests.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Notizen, Notizvorlagen, Workflow-Notizen, Kalendernotizen und Notizvorschauen einheitlich strukturieren.

## Ausgangslage

Workflow-Notizdialoge nutzten bereits die gemeinsame Dialogbasis. Der generische Notizbereich, Notizvorlagen-Löschungen und Kalender-Inline-Notizen enthielten noch native Browser-Confirm-Pfade oder uneinheitliche Meldungsstrukturen; zusätzlich fehlte bei Notizvorlagen eine ausdrückliche serverseitige Rollenbegrenzung.

## Umfang

- Der generische Notizbereich nutzt für Löschungen den gemeinsamen destruktiven Bestätigungsdialog.
- Notizvorlagen-Löschungen nutzen einen gemeinsamen Bestätigungsdialog und zeigen normalisierte Fehler inline.
- Kalender-Inline-Notizen nutzen für das Löschen einen gemeinsamen Bestätigungsdialog statt eines nativen Browser-Confirm-Pfads.
- Aktive Notizvorlagen bleiben für `ADMIN`, `DISPONENT` und `LESER` lesbar, weil sie als Auswahlhilfe bei der Notizerstellung dienen.
- Notizvorlagen-Verwaltungslisten mit `active=false` sowie Notizvorlagen-Mutationen sind serverseitig auf `ADMIN` und `DISPONENT` begrenzt.
- Die Vorlagenfarbe bleibt serverseitig `ADMIN`-only; `DISPONENT` darf Vorlagen ohne Farbänderung verwalten.
- `LESER` darf Notizen lesen, aber keine Notiz-, Notizvorlagen- oder Kalenderwochen-Notizmutation ausführen.
- Nicht Teil der Aufgabe sind neue Notiz-Contracts, neue Notiztypen, Schemaänderungen oder eine fachliche Änderung der bestehenden Workflow-Notizlogik.

## Umsetzungshinweise

- Betroffene UI-Dateien: `client/src/components/NotesSection.tsx`, `client/src/components/NoteTemplatesPage.tsx`, `client/src/components/calendar/CalendarWeekView.tsx`.
- Betroffene Serverdatei: `server/controllers/noteTemplatesController.ts`.
- Betroffene Tests: `tests/unit/ui/workflowNoteDialogs.behavior.test.tsx`, `tests/unit/ui/notesSection.prefillDraft.behavior.test.tsx`, `tests/unit/ui/notesSection.readOnly.wiring.test.tsx`, `tests/unit/ui/notesPreviewInvalidation.wiring.test.tsx`, `tests/integration/server/notes.create.transactional-readback.integration.test.ts`, `tests/integration/server/notes.joins-and-template-integrity.integration.test.ts`, `tests/integration/server/calendar-week-notes.integration.test.ts`, `tests/integration/server/employee.notes.integration.test.ts`, `tests/e2e-browser/notes.ft13.browser.e2e.spec.ts`, `tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`.
- Die serverseitige Rollenprüfung bleibt maßgeblich; UI-Sichtbarkeit ersetzt keine API-Absicherung.
- Es wurden keine neuen Contracts oder Datenbankmigrationen eingeführt.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 10.05.26
- Ergebnis: Notizlöschungen, Notizvorlagenlöschungen, Kalender-Inline-Notizen und Notizvorlagen-Rollenpfade nutzen gemeinsame Dialog-, Inline-Fehler- und Server-Rollenstrukturen.
- Automatisierte Verifikation: Typecheck, gezielte Notiz-Unit-Tests, Notiz-/Vorlagen-/Kalenderwochen-Integrationstests, Notiz-Browser-E2E, Encoding-Check und Diff-Prüfung erfolgreich.
- App-Prüfung: Automatisierte Browserprüfung für FT-13-Notizen und Kalender-Inline-Notizen bestanden; manuelle Nutzerprüfung steht noch aus.
- Verwendete Testdaten: synthetische Projekt-, Kunden-, Termin-, Mitarbeiter- und Kalenderwochen-Notizen, Notizvorlagen, Tags und Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Fixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 mit 0 Fehlern ausgeführt.
- Verbleibende Lücken: Ein breit gestarteter Projekt-Browserlauf brach in einem bestehenden Produktdialog-Test ab; der konkret geänderte Projektnotiz-Löschtest wurde danach isoliert erfolgreich geprüft.
- Folgeaufgaben: Keine für diesen P-01-Schritt.

---

## Beziehungen

- Features: [FT-13 - Notizverwaltung](../../features/ft-13-notizverwaltung/ft-13-notizverwaltung.md) · [FT-01 - Kalendertermine](../../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [10.05.26 - P01: Kunden-, Mitarbeiter- und Notizen-Dialoge abgeschlossen](../../journal/10-05-26-p01-kunden-mitarbeiter-notizen-dialoge-abgeschlossen.md)
