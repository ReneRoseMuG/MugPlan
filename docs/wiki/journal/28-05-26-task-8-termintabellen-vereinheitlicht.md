# 28.05.26 | Implementierung | TASK-8/A-37: Termintabellen in Formularen vereinheitlicht

## Zusammenfassung

TASK-8 wurde nach bestätigter Variante C umgesetzt. Kunden- und Projektformulare nutzen im Edit-Modus nun denselben Terminlisten-Baustein wie Tour- und Mitarbeiterformulare: `AppointmentsListPage` wurde um feste Kunden- und Projektkontexte erweitert und in den Formularen als Haupttab `Termine` eingebettet.

Die bisherigen kompakten Terminpanels in den Formular-Sidebars bleiben als Zusammenfassung erhalten. Die neue Haupttabelle übernimmt dagegen die einheitlichen Listenfunktionen, Filter, Spaltenlogik, Öffnungswege und den bestehenden Terminformular-Overlay-Fluss.

## Art der Änderung

- Vereinheitlichung bestehender Terminlisten in mehreren Formularansichten.
- Erweiterung vorhandener Frontend-Komponenten und vorhandener Tests.
- Keine neue API-Route und keine API-Contract-Änderung.
- Keine DB-Migration.
- Keine neue Abhängigkeit.
- Keine Änderung an Terminvalidierung, Terminpersistenz oder Kalenderaggregationen.

## Betroffene Features

- TASK-8: Termintabellen vereinheitlichen.
- A-37: Termintabellen in Formularen vereinheitlichen.
- W-11: Termintabellen in Formularen.
- FT-01: Kalendertermine und Terminformular.
- FT-04: Tour- und Terminlisten-Kontexte.

## Konkrete Änderungen

- `AppointmentsListPage` unterstützt zusätzlich zu `standalone`, `tour` und `employee` jetzt die Kontexte `customer` und `project`.
- Die Liste setzt feste Kontextfilter für `customerId` und `projectId`, übergibt sie an `/api/appointments/list` und lädt erst, wenn der jeweilige Kontext wirklich verfügbar ist.
- Kontextgebundene Filter und redundante Spalten werden ausgeblendet: Im Kundenkontext entfällt die Kundensuche, im Projektkontext entfallen Projekt- und Kundenfilter sowie redundante Projekt-/Kundenspalten.
- `AppointmentsFilterPanel` kann Kunden- und Projektfilter abhängig vom Kontext ausblenden.
- `CustomerData` zeigt im Edit-Modus einen Haupttab `Termine` mit `AppointmentsListPage context="customer"`.
- `ProjectForm` zeigt im Edit-Modus einen Haupttab `Termine` mit `AppointmentsListPage context="project"`.
- Terminzeilen aus Kunden- und Projektformularen öffnen weiterhin das bestehende Terminformular-Overlay; die Rückkehr in den jeweiligen Formular-Kontext bleibt erhalten.
- `Home` und `StandaloneDomainViews` wurden für den Öffnungsweg aus den neuen Formular-Terminlisten verdrahtet.
- Die bestehenden kompakten Sidebar-Listen `CustomerAppointmentsPanel` und `ProjectAppointmentsPanel` bleiben unverändert als Kurzüberblick erhalten.
- Repo-Wiki, UI-Komponentenreferenz, Implementierungsdokumentation und Testmatrix wurden an die neue einheitliche Terminlistenstruktur angepasst. A-37 wurde geschlossen, W-11 wurde als erledigt markiert.

## Rollen

- Die Rollenlogik wurde nicht geändert.
- Es wurden keine neuen Mutationsrechte, Endpunkte oder Rollenfreigaben eingeführt.
- Sichtbarkeit und Öffnen der Terminlisten folgen weiter den bestehenden Formular- und Terminlistenpfaden.
- Terminänderungen laufen weiterhin über die bestehenden serverseitig abgesicherten Terminformular- und Termin-API-Pfade.
- Eine reine UI-Freigabe wurde nicht als Berechtigungsersatz eingeführt.

## Tests / Verifikation

- Safety Gate: `.env.test` war vorhanden; `NODE_ENV=test` und `MUGPLAN_MODE=test` wurden über die npm-Testskripte gesetzt.
- `npm run typecheck` erfolgreich.
- `npm run test:unit -- tests/unit/ui/appointmentsListPage.tourLocking.smoke.test.tsx tests/unit/ui/appointmentsListPage.controlled-state.test.tsx tests/unit/ui/customerData.layoutShellIntegration.test.tsx tests/unit/ui/projectForm.layoutShellIntegration.test.tsx` erfolgreich mit 18 Tests.
- `npm run test:integration -- tests/integration/server/appointments.direct-projections.integration.test.ts tests/integration/server/appointments.entity-card-payload.integration.test.ts` erfolgreich mit 7 Tests.
- `npm run test:e2e:browser -- tests/e2e-browser/project-sidebar-all-appointments.browser.e2e.spec.ts` erfolgreich mit 5 Tests.
- `npm run check` erfolgreich.
- `git diff --check` erfolgreich.

## Offene Punkte

- Kein vollständiger `npm run test:all`-Lauf wurde in dieser Session ausgeführt.
- Im Arbeitsbaum lagen bereits vor dieser Aufgabe weitere, nicht zu TASK-8 gehörende Änderungen. Sie wurden für diese Umsetzung nicht zurückgesetzt und nur soweit berührt, wie es für TASK-8 nötig war.
