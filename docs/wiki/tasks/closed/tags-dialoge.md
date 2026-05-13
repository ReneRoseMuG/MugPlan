# Tags-Dialoge

Dialog-, Auswahl-, Bestätigungs- und Meldungspfade für Tags, Termin-Tags und tagbezogene Fehlerkommunikation einheitlich strukturieren. Die Aufgabe ist Teil von P-01 Schritt 5 und richtet sich auf die Tag-Verwaltung sowie tagbezogene Wochenkalender-Pfade.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Auswahl-, Bestätigungs- und Meldungspfade für Tags, Termin-Tags und tagbezogene Fehlerkommunikation einheitlich strukturieren.

## Ausgangslage

Die Tag-Verwaltung und der Wochenkalender-Tag-Picker nutzen bestehende FT-28-Endpunkte mit serverseitiger Rollen- und System-Tag-Absicherung. Im Frontend waren Löschbestätigungen, Notizdialoge und Mutationsfehler noch nicht vollständig an die gemeinsame P-01-Dialogbasis und Fehlernormalisierung angebunden.

## Umfang

- Die Tag-Verwaltung nutzt für Löschungen einen gemeinsamen Bestätigungsdialog statt eines nativen Browser-Confirm-Pfads.
- Mutationsfehler beim Anlegen, Bearbeiten und Löschen von Tags werden normalisiert und zusätzlich inline im betroffenen Bereich angezeigt.
- Der Wochenkalender-Tag-Picker nutzt für den Notizeditor die gemeinsame Dialog-Shell und zeigt Notizfehler im Dialogkontext.
- Die Reklamations-Workflow-Nachfrage für die optionale Notizanlage nutzt die gemeinsame Dialogbasis; das Reklamations-Tag bleibt weiterhin ausschließlich über den Workflow auslösbar.
- Tag- und Notizmutationen behalten bestehende React-Query-Invalidierungen und API-Contracts bei.
- Nicht Teil der Aufgabe sind neue Tag-Regeln, neue Endpunkte, Schemaänderungen oder eine fachliche Änderung geschützter System-Tags.

## Umsetzungshinweise

- `ADMIN` darf Tags verwalten; geschützte System-Tags bleiben serverseitig vor Bearbeitung oder Löschung geschützt.
- Bestehende Termin-Tag-Zuweisungen über Kalenderpfade bleiben für die bisher zulässigen Rollen erhalten.
- Die serverseitige Durchsetzung bleibt maßgeblich; UI-Sperren und Hinweise sind nur Bedienführung.
- `client/src/components/TagManagementPage.tsx`
- `client/src/components/calendar/CalendarWeekAppointmentTagPicker.tsx`
- `client/src/components/notes/WorkflowNoteDialogs.tsx`
- `client/src/components/ui/dialog-base.tsx`
- `client/src/components/ui/dialog.tsx`
- `client/src/lib/tags.ts`

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Tag-Löschungen laufen über den gemeinsamen Bestätigungsdialog, Tag-Mutationsfehler werden normalisiert und inline sichtbar, der Wochenkalender-Notizeditor nutzt die gemeinsame Dialogstruktur, und die Reklamations-Workflow-Nachfrage für optionale Notizanlage ist ebenfalls auf die gemeinsame Dialogbasis umgestellt.
- Automatisierte Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/tagManagementPage.dialogs.test.tsx tests/unit/ui/tagPickerPanel.behavior.test.tsx tests/unit/ui/tagFilterInput.behavior.test.tsx tests/unit/ui/tagBadge.behavior.test.tsx`; `npm run test:unit -- tests/unit/ui/workflowNoteDialogs.behavior.test.tsx tests/unit/ui/tagManagementPage.dialogs.test.tsx tests/unit/hooks/useTagRuleEngine.test.ts`; `npm run test:integration -- tests/integration/server/masterData.tags.ft28.integration.test.ts tests/integration/server/masterData.visibility.by-role.test.ts --reporter=verbose`; `npm run test:e2e:browser -- tests/e2e-browser/tag-selection-unification.browser.e2e.spec.ts tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`; `npm run test:e2e:browser -- tests/e2e-browser/tag-rule-engine.workflow.browser.e2e.spec.ts`; `npm run check:encoding`; `git diff --check`.
- App-Prüfung: Automatisierte Browserprüfung bestanden; manuelle Nutzerprüfung erfolgt anhand der Abschlussliste.
- Verwendete Testdaten: synthetische FT-28-Tags, System-Tag-Fälle, Termin-Tag-Zuweisungen und Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Fixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern und bestehenden Warnungsgruppen ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für P-01 Schritt 5; manuelle Sichtprüfung der produktiven Bedienpfade steht noch aus.
- Nachtrag am 10.05.26: Die manuelle Prüfung ist auf den Workflow „Reklamation melden“ zu beziehen, nicht auf das manuelle Setzen des Reklamations-Tags im Tag-Picker.
- Nachtrag am 10.05.26: Die zentrale Dialogbasis richtet normale Dialogtitel zwischen Icon und Schließen-Button aus; der Titel dockt optisch an der Icon-Unterkante an, der Body-Text ist vom Header getrennt, und Dialog-Icons nutzen eine einheitliche Slate-Farbe mit angepasstem Hintergrund. Destruktive Bestätigungsdialoge bleiben begründet ohne Schließen-Button.
- Folgeaufgaben: Hilfetexte-, Import- und Export-Dialoge sowie Einstellungen-, Monitoring- und Admin-Dialoge wurden im selben Arbeitsgang umgesetzt.

---

## Beziehungen

- Features: [FT-28 - Universelles Tagging-System](../../features/ft-28-universelles-tagging-system/ft-28-universelles-tagging-system.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Tags, Hilfetexte und Admin-Dialoge abgeschlossen](../../journal/09-05-26-p01-tags-hilfetexte-admin-dialoge-abgeschlossen.md)
