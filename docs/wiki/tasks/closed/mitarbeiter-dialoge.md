# Mitarbeiter-Dialoge

Dialog-, Bestätigungs- und Meldungspfade für Mitarbeiterverwaltung, Mitarbeiteranhänge, Abwesenheiten, Auslastung und fachliche Mitarbeiter-Auswahlinhalte sind im P-01-Rollout vereinheitlicht. Der Abschluss fokussiert Mitarbeiterformular, Abwesenheitsdialoge, Notizen, Readonly-Wiring und serverseitige Rollenprüfung.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Mitarbeiterverwaltung, Mitarbeiteranhänge, Abwesenheiten, Auslastung und fachliche Mitarbeiter-Auswahlinhalte einheitlich strukturieren.

## Ausgangslage

Der Mitarbeiterbereich hatte bereits serverseitige Rollen- und Sichtbarkeitsregeln sowie Readonly-Tests. Im Formular und in den Abwesenheiten existierten aber noch rohe Dialogpfade und teils nur toastbasierte Fehlerkommunikation.

## Umfang

- Das Mitarbeiterformular zeigt normalisierte Mutationsfehler zusätzlich inline im Formularbereich.
- Die Mitarbeiterlöschung nutzt den gemeinsamen destruktiven Bestätigungsdialog.
- Abwesenheitslöschungen erhalten eine eigene Bestätigung, und der Konfliktdialog zum Entfernen aus Terminen und Tour-KW-Planungen nutzt die gemeinsame Dialog-Shell.
- Mitarbeiternotiz-Löschungen laufen über den gemeinsamen Notiz-Bestätigungsdialog.
- `ADMIN` und `DISPONENT` dürfen Mitarbeiter fachlich bearbeiten, Mitarbeiter-Notizen und Mitarbeiter-Tags verwalten sowie Abwesenheiten im bestehenden Regelrahmen pflegen.
- `ADMIN` bleibt die einzige Rolle für Mitarbeiterlöschung und Aktivstatus-Änderungen.
- `LESER` sieht Mitarbeiter readonly und kann keine Mitarbeiter-, Notiz-, Tag- oder Abwesenheitsmutation auslösen; direkte unzulässige API-Mutationen bleiben serverseitig gesperrt.
- Nicht Teil der Aufgabe sind Tour-KW-Mutationsumbauten, neue Mitarbeiter-Contracts, Schemaänderungen oder eine fachliche Neudefinition der FT-33-Abwesenheitsregeln.

## Umsetzungshinweise

- Betroffene UI-Dateien: `client/src/components/EmployeeForm.tsx`, `client/src/components/EmployeeAppointmentAbsencesPanel.tsx`, `client/src/components/NotesSection.tsx`.
- Betroffene Tests: `tests/unit/ui/employeeForm.layoutShellIntegration.test.tsx`, `tests/unit/ui/employeesPage.controlled-state.test.tsx`, `tests/unit/ui/employeesPage.readerReadonly.test.tsx`, `tests/unit/ui/employeeUtilizationView.wiring.test.tsx`, `tests/unit/ui/employeeAppointmentAbsencesPanel.dateFormat.test.tsx`, `tests/integration/server/employees.lifecycle.ft05.integration.test.ts`, `tests/integration/server/employees.visibility.by-role.test.ts`, `tests/integration/server/employeeAppointmentAbsences.integration.test.ts`, `tests/integration/server/employee.notes.integration.test.ts`.
- Die serverseitige Rollen- und Konfliktprüfung bleibt maßgeblich; UI-Dialoge bestätigen nur die zulässigen Bedienpfade.
- Es wurden keine neuen Endpunkte, Contracts oder Datenbankmigrationen eingeführt.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 10.05.26
- Ergebnis: Mitarbeiterformular, Mitarbeiterlöschung, Abwesenheitslöschung, Abwesenheitskonflikte und Mitarbeiternotizen nutzen gemeinsame Dialog- und Inline-Fehlerstrukturen.
- Automatisierte Verifikation: Typecheck, gezielte Mitarbeiter-Unit-Tests, Mitarbeiter-/Abwesenheits-/Notiz-Integrationstests, Mitarbeiter-Browser-E2E, Encoding-Check und Diff-Prüfung erfolgreich.
- App-Prüfung: Automatisierte Browserprüfung für Mitarbeiter-Readonly, Mitarbeiter-Neuanlage mit Sidebar-Daten und Mitarbeiter-Wochenplanung bestanden; manuelle Nutzerprüfung steht noch aus.
- Verwendete Testdaten: synthetische Mitarbeiter, Abwesenheiten, Tour-KW-Planungen, Notizen, Anhänge und Rollen-Agents aus Unit-, Integrations- und Browser-E2E-Fixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 10.05.26 mit 0 Fehlern ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für diesen P-01-Schritt.
- Folgeaufgaben: Keine für diesen P-01-Schritt.

---

## Beziehungen

- Features: [FT-05 - Mitarbeiterverwaltung](../../features/ft-05-mitarbeiterverwaltung/ft-05-mitarbeiterverwaltung.md) · [FT-33 - Abwesenheiten über interne Personalplanung](../../features/ft-33-abwesenheiten-ueber-interne-personalplanung/ft-33-abwesenheiten-ueber-interne-personalplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md) · [Mitarbeiter-Auswahl-Dialogstruktur](mitarbeiter-auswahl-dialogstruktur.md)
- Journal: [10.05.26 - P01: Kunden-, Mitarbeiter- und Notizen-Dialoge abgeschlossen](../../journal/10-05-26-p01-kunden-mitarbeiter-notizen-dialoge-abgeschlossen.md)
