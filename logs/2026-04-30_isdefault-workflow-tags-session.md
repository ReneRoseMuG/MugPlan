# Auftragslog: isDefault-Workflow-Tags und Reklamation-/Messe-Workflows

## Zweck

Die Tag-Schutzlogik wurde von einzelnen namensbasierten Picker- und Mutationssonderfällen auf `isDefault` umgestellt. Workflow-Tags sollen dadurch serverseitig nicht mehr über generische Tag-Endpunkte manuell gesetzt oder entfernt werden.

Zusätzlich wurde für `Reklamation` ein dedizierter Aktionsweg eingeführt, weil dieser Tag fachlich weiterhin Reports beeinflusst, aber nicht mehr über den allgemeinen Tag-Picker vergeben werden soll.

Im weiteren Verlauf wurde der Notizvorschlag-Workflow für `Reklamation` und `Messe Aufbau/Abbau` vereinheitlicht. Die fachliche Auslösung bleibt über die Rule-Engine, die Dialog-/Template-/Editor-Folgeaktionen laufen nun über gemeinsame Bausteine.

## Branch

- Arbeitsbranch: `refactor/isdefault-workflow-tags`
- Ausgangspunkt: `work`
- Branch wurde direkt nach Anlage nach `origin/refactor/isdefault-workflow-tags` gepusht.

## Fachlicher Scope

- `isDefault: true` steuert künftig den technischen Workflow-Schutz für generische Tag-Mutationen und Picker-Sichtbarkeit.
- `Reklamation` bleibt fachlich namensbasiert relevant, insbesondere für Reports und bestehende Ausschlusslogik.
- `Sondermaß` wird im System-Seed und per Datenmigration auf `isDefault: false` gesetzt und bleibt dadurch als Benutzer-Tag auswählbar.
- „Planung blockiert“ wird als Tag-Konzept entfernt.
- Rollen für Reklamation-Aktionen: sichtbar und ausführbar für `ADMIN` und `DISPONENT`; `LESER` wird serverseitig mit `403 FORBIDDEN` abgewiesen.
- `Messe Aufbau/Abbau` bleibt ein Workflow-Tag und wird über die Tour-Messe-Automatik gesetzt oder entfernt, nicht über den Picker.

## Migration

Neue Migrationen:

- `migrations/0027_remove_planning_blocked_tag.sql`
- `migrations/0028_make_sondermass_user_tag.sql`

Wichtig: Beide Migrationen sind keine Schemaänderungen. Sie verändern keine Tabellenstruktur, keine Spalten, keine Indizes und keine Contracts.

`0027_remove_planning_blocked_tag.sql` bereinigt defensiv/idempotent mögliche Bestandsdaten zum entfernten Tag `Planung blockiert`:

- Relationen in `appointment_tags`
- Relationen in `project_tags`
- Relationen in `customer_tags`
- Relationen in `employee_tags`
- danach den Tag `Planung blockiert` aus `tags`

`0028_make_sondermass_user_tag.sql` setzt ausschließlich `tags.is_default = false` für `tags.name = 'Sondermaß'`, damit `Sondermaß` im Picker sichtbar bleibt.

`shared/schema.ts` wurde bewusst nicht geändert.

## Umsetzung

- Picker-Katalog filtert über `!tag.isDefault`.
- Generische Termin- und Projekt-Tag-Endpunkte blockieren `isDefault: true` mit `WORKFLOW_TAG_PROTECTED`.
- Neue Routen wurden ergänzt:
  - `POST /api/appointments/:id/reklamation`
  - `DELETE /api/appointments/:id/reklamation`
  - `POST /api/projects/:id/reklamation`
  - `DELETE /api/projects/:id/reklamation`
- Backend setzt/entfernt `Reklamation` über dedizierte Service-Funktionen mit Versionierung, Rollenprüfung und Mutation-Events.
- Terminformular, Projektformular und Wochenkalender-Karten wurden um Reklamation melden/aufheben ergänzt.
- Planung-blockiert-spezifische Read-only- und Testpfade wurden entfernt.

## Workflow-Refactor

Ausgangsproblem: Im Wochenkalender-Reklamation-Pfad wurde zwar der Notizvorschlag angezeigt und die Notiz erstellt, aber der Notiz-Editor öffnete sich danach nicht. Außerdem war der Skip-Button dort mit `Nicht folgen` statt `Überspringen` beschriftet.

Ursache: Die Rule-Engine war bereits gemeinsam, aber Dialog, Template-Suche, Notizerstellung und Editorstart waren in mehreren Komponenten dupliziert.

Umsetzung:

- `client/src/lib/workflow-note-templates.ts` bündelt Template-Titel-Normalisierung, Template-Suche und Draft-Aufbau.
- `client/src/components/notes/WorkflowNoteDialogs.tsx` bündelt den Vorschlagsdialog und Entfernen-Dialog mit einheitlichen Beschriftungen.
- `AppointmentForm`, `ProjectForm`, `CalendarWeekAppointmentTagPicker` und `CalendarWeekView` nutzen diese gemeinsamen Bausteine.
- Der Wochenkalender-Reklamation-Aktionspfad öffnet nach Bestätigung jetzt den Notiz-Editor.
- `Reklamation` und `Messe Aufbau/Abbau` unterscheiden sich fachlich nur noch über den von der Rule-Engine gelieferten Template-Titel.

## Reports

Die Reportlogik wurde nicht refactored.

Namensbasierte Logik für `Reklamation`, `Storniert`, `Sondermaß`, `Messe Aufbau/Abbau` und andere fachliche Reportkennzeichnungen bleibt bestehen. Das ist bewusst getrennt von der technischen Picker-/Mutationslogik über `isDefault`.

## Tests und Nachweise

Erfolgreich ausgeführt:

- `npm run db:migrate:dev`
- `npm run db:migration-status:dev`
- `npm run check`
- `npm run typecheck`
- `npm run test:unit -- tests/unit/hooks/useTagRuleEngine.test.ts tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/appointmentForm.noteEditor.behavior.test.tsx tests/unit/services/appointments.park.test.ts`
- `npx vitest run --config vitest.workspace.ts --project integration tests/integration/server/appointments.park.integration.test.ts --reporter=verbose`
- `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts --grep "Messe"`

Ergebnisse der zuletzt angeforderten Tests:

- Unit: 4 Dateien, 41 Tests bestanden.
- Integration: `appointments.park.integration.test.ts`, 21 Tests bestanden.
- Browser Reklamation/Rule-Workflow: 13 Tests bestanden.
- Browser Messe/Tour-Workflow: 4 Tests bestanden.

Zusätzliche Browser-Abdeckung:

- `Reklamation` setzen aus Wochenkalender, Terminformular und Projektformular.
- Notizvorschlag bestätigen: Notiz/Editor entsteht korrekt.
- Notizvorschlag überspringen: Tag bleibt, keine Notiz entsteht.
- `Reklamation` entfernen mit `Entfernen`: Tag weg, Notiz weg.
- `Reklamation` entfernen mit `Behalten`: Tag weg, Notiz bleibt.
- Projekt-Reklamation: Entfernen mit Löschen und Behalten.
- `Messe Aufbau/Abbau` über `Tour Messe`: Setzen mit Notiz, Überspringen ohne Notiz.
- `Messe Aufbau/Abbau` beim Verlassen von `Tour Messe`: Entfernen mit Löschen und Behalten.

Hinweis: Ein vollständiger Lauf von `appointment-form.layout-tour-integration.browser.e2e.spec.ts` lief über die relevanten Messe-Tests hinweg grün, brach später aber in einem bestehenden, nicht geänderten Wochenplan-Test mit `ECONNRESET` beim API-Polling ab. Der gezielte Messe-Lauf ist vollständig grün.

## Migrationsstatus

Dev:

- `0027_remove_planning_blocked_tag.sql` wurde erfolgreich angewendet.
- `0028_make_sondermass_user_tag.sql` wurde erfolgreich angewendet.
- `npm run db:migration-status:dev` meldete danach synchron.

Test:

- `npm run db:migrate:test` wurde versucht.
- Der frühere Lauf erreichte die neuen Migrationen nicht, sondern brach vorher bei `0026_components_category_name_unique.sql` ab.
- Fehler: `Can't DROP 'components_name_unique'; check that column/key exists`.
- Damit sind `0027_remove_planning_blocked_tag.sql` und `0028_make_sondermass_user_tag.sql` in der Test-DB nicht über die reguläre Migrationskette angewendet worden.

Es wurde keine Production-Migration ausgeführt.

## Risiken und offene Punkte

- Wegen der Test-DB-Blockade ist die vollständige Test-Migrationskette nicht synchron nachgewiesen.
- Der Blocker liegt vor den neuen Migrationen und betrifft `0026_components_category_name_unique.sql`.
- Die neuen Migrationen selbst sind auf Dev erfolgreich gelaufen und betreffen nur Daten, keine Schemaänderung.
- Report-Rückwirkung bleibt fachlich sensibel, weil `Reklamation` weiterhin über Tag-Namen wirkt. Die Reportlogik blieb deshalb unverändert; die Aktions- und Workflowpfade wurden gezielt getestet.

## Ergebnis

Der technische Wechsel auf `isDefault` ist umgesetzt. Workflow-Tags sind in generischen Tag-Pfaden geschützt, `Sondermaß` ist frei vergebbar, `Reklamation` hat dedizierte Aktionsrouten, und „Planung blockiert“ ist aus Seed, Codepfaden und potenziellen Bestandsverweisen entfernt.

Der Notizvorschlag-Workflow ist für `Reklamation` und `Messe Aufbau/Abbau` vereinheitlicht. Der Wochenkalender-Reklamation-Pfad öffnet nach Bestätigung wieder den Notiz-Editor, und alle relevanten Browser-Verzweigungen für Bestätigen, Überspringen, Entfernen und Behalten sind abgedeckt.
