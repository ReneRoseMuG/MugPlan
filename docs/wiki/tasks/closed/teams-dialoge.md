# Teams-Dialoge

Die Teamverwaltung ist der erste echte Domain-Pilot im P01-Dialog-Rollout nach Fehler-Normalisierung und Dialog-Basiskomponenten. Anlage, Bearbeitung, Löschung und Mitarbeiterzuordnung nutzen den einheitlichen Dialog-, Bestätigungs- und Meldungspfad.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Die Teamdialoge sollen die gemeinsame Dialogbasis nutzen, normalisierte Serverfehler sichtbar machen und die FT-11-Rollengrenzen in UI und API sauber durchsetzen.

## Ausgangslage

Vor der Umsetzung nutzte die Teamverwaltung Browser-Confirm-Pfade für Löschaktionen und eigene Fehlercode-Auswertung. Zusätzlich waren Team-Mutationsendpunkte nur authentifiziert, aber nicht serverseitig gegen `LESER` gesperrt.

## Umfang

- Teamlöschungen in Liste und Formular laufen über die gemeinsame `ConfirmDialogBase`.
- Der Basisdialog stellt Header, Body und Footer bereit; das Header-Icon kommt aus dem jeweiligen Domänenkontext, im Teamdialog also aus `domainIcons.teams`.
- Team-Karten tragen ebenfalls das Teams-Domänen-Icon.
- Team-Mutationsfehler werden über die zentrale Fehler-Normalisierung angezeigt und als Inline-Meldung im Teamkontext sichtbar gemacht.
- `ADMIN` und `DISPONENT` dürfen Teams anlegen, bearbeiten, löschen sowie Mitarbeiter zuordnen oder entfernen.
- `LESER` darf Teams sehen, aber keine Team-Mutation in der UI auslösen und keine Team-Mutation direkt über die API ausführen.
- Die Testsuite umfasst Unit-Tests für UI-Dialog- und Rollenverhalten, Integrationstests für FT-11-API-Rollen und Browser-E2E-Flows für Team-Mitglieder, Löschdialog und Reader-Readonly.
- Nicht Teil der Aufgabe sind Touren, Tour-KW-Planung, Termine, Kalenderlogik oder eine fachliche Neudefinition der FT-11-Teamregeln.

## Umsetzungshinweise

- Betroffene UI-Dateien: `client/src/components/TeamManagement.tsx`, `client/src/components/TeamEditForm.tsx`.
- Betroffene Serverdateien: `server/controllers/teamsController.ts`, `server/controllers/teamEmployeesController.ts`.
- Betroffener Contract: `shared/routes.ts`.
- Betroffene Tests: `tests/unit/ui/dialogBaseComponents.test.tsx`, `tests/unit/ui/teamManagement.versioning.test.tsx`, `tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx`, `tests/integration/server/ft11.team-management.integration.test.ts`, `tests/unit/services/teamsService.ft11.test.ts`, `tests/integration/server/teamsTours.versioning.test.ts`, `tests/e2e-browser/ft11.team-management.browser.e2e.spec.ts`.
- Automatisierte Verifikation am 09.05.26: `npm run test:run -- tests/unit/ui/teamManagement.versioning.test.tsx tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx tests/integration/server/ft11.team-management.integration.test.ts tests/unit/services/teamsService.ft11.test.ts` mit 28 bestandenen Tests.
- Struktur-Verifikation nach manueller Rückmeldung am 09.05.26: `npm run test:run -- tests/unit/ui/dialogBaseComponents.test.tsx tests/unit/ui/teamManagement.versioning.test.tsx tests/unit/ui/teamEditForm.layoutShellIntegration.test.tsx` mit 13 bestandenen Tests.
- Ergänzende Versionierungs-Verifikation am 09.05.26: `npm run test:run -- tests/integration/server/teamsTours.versioning.test.ts` mit 4 bestandenen Tests.
- Browser-Verifikation am 09.05.26: `npm run test:e2e:browser -- tests/e2e-browser/ft11.team-management.browser.e2e.spec.ts` mit 3 bestandenen Tests.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Die Teamverwaltung nutzt die gemeinsame Dialogstruktur mit Domänen-Icon, normalisierten Meldungen und abgesicherten FT-11-Rollenpfaden.
- Automatisierte Verifikation: UI-, Service-, Integration- und Browser-E2E-Suiten für die Teamverwaltung sind gelaufen und bestanden.
- App-Prüfung: Die Prüfung hat den neuen Team-Löschdialog sowie die Domänen-Icons in Dialog und Team-Karten bestätigt.
- Verwendete Testdaten: synthetische FT-11-Teams und Mitarbeiter aus Unit-, Service-, Integrations- und Browser-E2E-Fixtures sowie lokaler manueller Team-Testdatensatz.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern.
- Verbleibende Lücken: Keine für FT-11 im P01-Pilot; die übrigen Domain-Objekte folgen in der geplanten Reihenfolge.

---

## Beziehungen

- Features: [FT-11 - Team-Verwaltung](../../features/ft-11-team-verwaltung/ft-11-team-verwaltung.md)
- Use Cases: [UC 11/01 Team anlegen](../../features/ft-11-team-verwaltung/uc-11-01-team-anlegen.md) · [UC 11/02 Team bearbeiten](../../features/ft-11-team-verwaltung/uc-11-02-team-bearbeiten.md) · [UC 11/03 Team löschen](../../features/ft-11-team-verwaltung/uc-11-03-team-loeschen.md) · [UC 11/04 Team anzeigen](../../features/ft-11-team-verwaltung/uc-11-04-team-anzeigen.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Teams-Dialoge abgeschlossen](../../journal/09-05-26-p01-teams-dialoge-abgeschlossen.md)
