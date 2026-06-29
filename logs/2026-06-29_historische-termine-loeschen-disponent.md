# Historische Termine: Löschen für Disponenten freigeben

Datum: 29.06.26
Branch: merge/ms68-ms52
Auftragsklasse: 5 (mehrschichtige Änderung — Rollen/Permissions auf Termin-Mutationen)

## Zweck

Bisher durften nur Admins historische (vergangene) Termine mutieren; für Disponenten
war jede Mutation historischer Termine gesperrt (`PAST_APPOINTMENT_READONLY`). Künftig
sollen Admins und Disponenten historische Termine **löschen** dürfen. Ändern und Anlegen
historischer Termine bleiben für Disponenten ausdrücklich weiterhin gesperrt (vom Nutzer
bestätigter Scope: „nur Löschen").

## Scope

- Erlaubt: Disponent darf historische Termine löschen (Admin konnte das bereits).
- Unverändert gesperrt für Disponent: Anlegen und Ändern historischer Termine.
- Unverändert: Storno-Sperre (stornierte Termine bleiben für alle Rollen unlöschbar),
  Versionsschutz, Mitarbeiter-Overlap, Abwesenheits-Guard, Parkplatz-Ausnahme,
  Leser bleibt read-only.
- Keine Contract-, Schema- oder Migrationsänderung.

## Technische Entscheidungen

- Die zentrale Helferfunktion `allowsHistoricalAppointmentMutation(roleKey)` (ADMIN-only)
  steuert Anlegen, Ändern UND Löschen gemeinsam. Um nur das Löschen zu öffnen, wurde eine
  separate, eng begrenzte Funktion `allowsHistoricalAppointmentDeletion(roleKey)`
  (ADMIN oder DISPONENT) eingeführt und ausschließlich im Lösch-Pfad verwendet. So bleibt
  der Eingriff minimal-invasiv und das Risiko, versehentlich auch Anlegen/Ändern zu öffnen,
  ausgeschlossen.
- Frontend: Das Terminformular bleibt für den Disponenten bei historischen Terminen
  schreibgeschützt (`isMutationLocked`), nur der Löschen-Button wird über das neue Flag
  `canDeleteHistoricalAppointment` aktiviert. Der Funktionen-Panel öffnet sich für diesen
  Fall, zeigt aber nur den Löschen-Button; Stornieren/Parken/Reklamation bleiben im
  read-only Zustand ausgeblendet (jeweils zusätzlich mit `!isReadOnlyView` abgesichert).

## Betroffene Dateien

Produktivcode:
- `server/services/appointmentsService.ts` — neue Funktion `allowsHistoricalAppointmentDeletion`;
  `deleteAppointment` nutzt sie statt der gemeinsamen Mutationsregel.
- `client/src/components/AppointmentForm.tsx` — Flag `canDeleteHistoricalAppointment`,
  Lösch-Button-`disabled` angepasst, Funktionen-Panel und übrige Aktionsbuttons gezielt
  gegated.

Tests:
- `tests/integration/server/appointments.historical-guards.integration.test.ts` — H5.4–H5.7.
- `tests/unit/invariants/lockingRules.test.ts` — Disponent-Löschen erlaubt + Storno-Regression.
- `tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx` — Disponent/historisch:
  Löschen sichtbar, Formular read-only.
- `tests/e2e-browser/dispatcher-form-data-and-actions.browser.e2e.spec.ts` — Ende-zu-Ende
  Löschen (DELETE 204 + Count-Delta).
- `docs/TEST_MATRIX.md` — vier Einträge aktualisiert/ergänzt.

Dokumentation:
- `docs/architecture.md` §7.3 und Abschnitt 11.
- `docs/implementation.md` Abschnitt 11 sowie Rollenabschnitt Disponent.

## Hinweise zum Testen

- Integration: `npm run test:integration -- appointments.historical-guards --reporter=verbose`
- Unit: `npm run test:unit` (lockingRules, appointmentForm.readOnlyModes)
- Browser: `npm run test:e2e:browser` (dispatcher-form-data-and-actions)
- Manuell: Als Disponent einen vergangenen Termin öffnen → Felder gesperrt, „Löschen" aktiv,
  Löschen entfernt den Termin. Ändern/Anlegen vergangener Termine bleibt gesperrt.

## Bekannte Einschränkungen / Status

- `npm run check` (Encoding, destruktives Inventar, tsc, Encoding-Lint) ist grün.
- Voller Audit und voller Testlauf wurden auf Wunsch nicht ausgeführt; die Tests sind
  formuliert, aber noch nicht in diesem Auftrag laufen gelassen worden.
- Keine Schemaänderung, daher kein Migrationsblocker.
