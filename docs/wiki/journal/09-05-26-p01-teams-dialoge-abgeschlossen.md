# 09.05.26 | Abschluss | P01 Teams-Dialoge

## Zusammenfassung

Die P01-Domainaufgabe Teams-Dialoge ist abgeschlossen. Die Teamverwaltung nutzt die gemeinsame Dialogbasis mit Domänen-Icon, normalisierte Fehlermeldungen und abgesicherte FT-11-Rollenpfade für Team-Mutationen.

## Verifikation

- UI- und Service-Tests: 28 bestandene Tests für Teamverwaltung, Layout-Shell-Integration, FT-11-Integration und Team-Service.
- Strukturtests: 13 bestandene Tests für Dialogbasis und Team-UI nach der Header-/Body-/Footer-Korrektur.
- Versionierung: 4 bestandene Tests für Team-Tour-Versionierung.
- Browser-E2E: 3 bestandene FT-11-Browsertests für Team-Mitglieder, Löschdialog und Reader-Readonly.
- App-Prüfung: Team-Löschdialog sowie Domänen-Icons in Dialog und Team-Karten bestätigt.

## Rollen

- `ADMIN` und `DISPONENT` dürfen Teams anlegen, bearbeiten, löschen sowie Mitarbeiter zuordnen oder entfernen.
- `LESER` darf Teams sehen, aber keine Team-Mutation auslösen; direkte API-Mutationen werden serverseitig verweigert.

## Verknüpfungen

- Aufgabe: [Teams-Dialoge](../tasks/closed/teams-dialoge.md)
- Feature: [FT-11 - Team-Verwaltung](../features/ft-11-team-verwaltung/ft-11-team-verwaltung.md)
- Projekt: [P01 Dialog-Rollout Masterplan](../projects/dialog-rollout.md)
