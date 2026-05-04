# Termindialog-Vorauswahl und Wiki-Abgleich

Datum: 04.05.26
Branch: `refactor/week-calendar-tour-personnel`
Commit: noch nicht erstellt; aktueller Ausgangs-Commit `5a0969d0`

## Zweck

Dieses Log dokumentiert die Nachkorrektur der Vorauswahl im Dialog `Mitarbeiter hinzufügen` sowie den anschließenden Wiki-Abgleich zur Session rund um Tour-KW-Mitarbeiter im Wochenkalender.

## Scope

- Im Terminkarten-Dialog werden nicht mehr alle auswählbaren Mitarbeiter initial markiert.
- Vorausgewählt werden nur konfliktfrei übernehmbare Mitarbeiter aus der Tour-KW-Planung, die noch nicht am Termin hängen.
- Weitere konfliktfrei zuweisbare Mitarbeiter bleiben sichtbar, aber initial nicht ausgewählt.
- Ohne oder bei leerer Tour-KW-Planung startet der Dialog ohne Vorauswahl.
- Die Wiki-Hauptseiten zu Kalenderansichten und Tourenplanung wurden auf den neuen Stand gebracht.
- Ein Journaleintrag wurde für die Session ergänzt.

## Rollen und Sperren

- Es wurden keine Rollen erweitert.
- Die Aktion bleibt im bestehenden Admin-/Disponentenpfad.
- Reader erhalten keine neue ausführbare Aktion.
- Die serverseitigen Rollen-, Historien-, Sperr- und Konfliktprüfungen bleiben maßgeblich.

## Technische Entscheidungen

- Die Initialauswahl wurde in einen kleinen Helper in `CalendarWeekView` gezogen, damit die Regel gezielt testbar ist.
- Die Auswahlregel prüft `selectable`, `status === "will_add"` und `source === "week_plan"`.
- Die Dialogfunktionen `Alle wählen` und `Alle abwählen` bleiben unverändert.
- Die Wiki-Aktualisierung wurde auf die betroffenen Feature-Hauptseiten begrenzt, weil dort die sessionrelevante Fachregel zentraler dokumentiert ist.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `tests/unit/ui/calendarWeekView.compactHeader.test.ts`
- `docs/wiki/features/ft-03-kalenderansichten/ft-03-kalenderansichten.md`
- `docs/wiki/features/ft-04-tourenplanung/ft-04-tourenplanung.md`
- `docs/wiki/journal/04-05-26-tour-kw-mitarbeiterdialog-vorauswahl.md`
- `docs/wiki/journal/README.md`

## Hinweise zum Testen

Gezielt grün gelaufen sind:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.compactHeader.test.ts --reporter=verbose`
- `npm exec tsc`

## Bekannte Einschränkungen

- Ein Browser-E2E-Lauf wurde für diese Nachkorrektur nicht ausgeführt.
- Der detaillierte Use Case `UC 01/08` wurde geprüft, aber nicht geändert. Die sessionrelevante Regel ist stattdessen in den Feature-Hauptseiten FT-03 und FT-04 dokumentiert.
