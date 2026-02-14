# PKG-07 Testliste

## Ziel von PKG-07
PKG-07 sichert Join-Atomicity bei Termin-Mitarbeiter-Beziehungen:

1. Die Replace-Operation auf `appointment_employee` ist atomar.
2. Bei Fehler waehrend des Join-Replacements bleibt der vorherige Zustand vollstaendig erhalten.

Dies ist ein Integrationstest mit echter Test-Datenbank.

## Abdeckungsuebersicht
- Datei `tests/integration/joins/joinReplaceAtomicity.test.ts`: 1 Integrationstest

## Datei `tests/integration/joins/joinReplaceAtomicity.test.ts`

### 1) `keeps join relations unchanged when replacement contains invalid employee id`
- Service/Funktion:
  - `appointmentsService.updateAppointment`
  - indirekt `appointmentsRepository.replaceAppointmentEmployeesTx`
- Given:
  - Testdatenbank ist geleert.
  - Kunde + Projekt + zwei gueltige Mitarbeiter sind erstellt.
  - Termin existiert und ist initial mit genau diesen zwei Mitarbeitern verknuepft.
  - Vorherzustand wird gelesen:
    - Employee-IDs in der Join-Relation
    - `appointments.version`
- When:
  - Update des Termins mit Employee-Liste, die eine ungueltige Employee-ID enthaelt (FK-Fehler provoziert).
- Then:
  - Update wirft Fehler.
  - Join-Relation bleibt unveraendert (weiterhin exakt die beiden urspruenglichen Mitarbeiter).
  - `appointments.version` bleibt unveraendert (kein halb persistierter Zwischenzustand).
- Kontext:
  - Der kritische Punkt ist die Reihenfolge im Update-Flow:
    - Appointment wird aktualisiert,
    - dann werden Join-Relationen ersetzt.
  - Der Test beweist, dass ein Fehler im zweiten Schritt den gesamten Transaktionskontext rollbackt.

## Warum dieser Test wichtig ist
- Er verhindert stille Dateninkonsistenz in Kernbeziehungen (Termin <-> Mitarbeiter).
- Er belegt, dass auch bei partiellen Fehlern keine halbfertigen Zustände gespeichert werden.
- Zusammen mit PKG-06 wird damit sowohl Batch-Atomicity als auch Join-Atomicity abgedeckt.
