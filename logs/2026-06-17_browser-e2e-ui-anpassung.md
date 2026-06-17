# Browser-E2E-Tests an aktuelle UI/Verhalten anpassen

Datum: 17.06.26
Branch: tkt-90-kw-berechnungen
Commit: 998c266c

## Zweck

Fortsetzung der Reparatur fehlschlagender Browser-E2E-Suites. Die Tests wurden an
das tatsächliche App-Verhalten und die aktuellen testids angepasst. Ausschliesslich
Test-Code, kein Produktivcode.

## Scope / Ergebnis

In dieser Session vollständig grün gemacht (11 Suites):

- appointment-form.resource-conflicts (13/13)
- appointment-form.layout-tour-integration (20/20)
- appointment-form.tour-change-dialog (5/5)
- appointments-list.tour-employee (7/7)
- calendar-move.cross-context-conflicts (9/9)
- calendar-cut-paste.resource-conflicts (7/7)
- calendar-drag-drop.success (1/1)
- calendar-markers-visualization (3/3)
- employee-appointments-utilization (1/1)
- tour-week-form (9/9)
- tour-week-planning.employee-add-cascade (8/8)

Teilweise / offen:

- tour-week-planning.employee-remove-cascade: Helper auf echten Flow umgebaut,
  WR-01 grün; WR-02 bis WR-07 noch nicht auf den echten Wochenplanungs-Flow
  umgestellt (rot).
- users-management-scroll: noch nicht bearbeitet.

## Technische Entscheidungen / wiederkehrende Muster

- Grundprinzip: Tests an das echte, beobachtbare App-Verhalten anpassen; bei
  Verhaltensdiskrepanzen Rückfrage statt eigenmächtiger Umdeutung.
- Save-Review-/Konflikt-Dialoge im Terminformular: Der Dialog erscheint nur bei
  KW-Plan oder Konflikt; konfliktbehaftete Mitarbeiter werden über den direkten
  Speicherpfad (DB-Insert, kein Form-Change) in den finalen Konfliktdialog geführt.
- "no-employee"-Bestätigung: Beim Kalender-Move/Cut-Paste eines Termins ohne
  Mitarbeiter erscheint immer der Move-Dialog ("Trotzdem verschieben"), kein
  stiller Direkt-Move (CC-01, CC-09, CP-03).
- Blockiert-Verhalten (Weg A, mit Nutzer abgestimmt): Kollidierende
  Wochenplan-Mitarbeiter werden nicht übernehmbar angezeigt bzw. gar nicht erst
  angeboten – die App vermeidet Konflikte proaktiv (CC-05/06, CP-07, WA-03/04/05/08).
- Tourwechsel bestehender Termine nutzt den mehrstufigen `dialog-appointment-move`,
  neue Termine den `dialog-tour-employee-cascade`.
- HoverPreview im Kalender: Vorschaupanel/Popover öffnet zuverlässig erst nach
  korrekter Trigger-Initialisierung (Breitenvarianten bei Markern, zweite
  Cursorbewegung bei cursor-mode-Bars).
- Echtes Drag-and-drop in der Monatsübersicht: `dragTo` mit `targetPosition` auf
  den freien Kopfbereich des Zieltags (Termin-Overlays fangen die Tag-Mitte ab).
- Wochenplanung im Wochen-View: KW-Plan-Spalte einblenden
  (`switch-week-personnel-column`), Personalspalte erweitern
  (`button-week-personnel-column-toggle-tour-…`), Mitarbeiter über
  `button-add-week-personnel-tour-…` + Picker-Card + Cascade-Dialog.

## Betroffene Dateien

18 Test-/Script-Dateien (siehe Commit 998c266c), u.a. die elf oben genannten
Suites sowie `tests/e2e-browser/helpers/appointment-conflict-helpers.ts`.

## Hinweise zum Testen

Einzelsuite: `npm run test:e2e:browser -- <suite-name>`
Einzeltest: zusätzlich `-g "<Titel-Fragment>"`

## Bekannte Einschränkungen / nächste Schritte

- WR-02 bis WR-07 nach dem Muster von WA umbauen (Remove über
  `week-personnel-employee-…-remove` + Cascade-Dialog; betroffene Termine über
  `tour-employee-cascade-row-…`; Badge `week-personnel-employee-tour-…`).
  Scope-Header der WR-Datei nach dem Umbau aktualisieren.
- users-management-scroll prüfen und reparieren.
- Danach vollständiger Browser-E2E-Lauf zur Gesamtverifikation.
