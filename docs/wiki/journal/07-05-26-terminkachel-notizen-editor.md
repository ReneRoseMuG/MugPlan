# 07.05.26 | FT-03/FT-13 | Terminkachel-Notizen editierbar und Editor bedienbar

## Zusammenfassung

Die inline angezeigten Notizen unter Terminkacheln im Wochenkalender wurden von einer reinen Vorschau zu bedienbaren Notizkarten erweitert. Notizen verwenden nun fest weiße Schrift statt automatischer Kontrastauswahl. Der Notizeditor wurde für kleinere Bildschirme so begrenzt, dass er scrollbar und bedienbar bleibt.

## Art der Änderung

Mehrschichtige UI- und API-nahe Änderung ohne Datenbank- oder Migrationsänderung. Der Kalender-Preview-Contract wurde um bestehende Notiz-Metadaten erweitert, damit Inline-Aktionen mit Versionierung und gesperrter Vorlagenfarbe korrekt arbeiten können. Serverseitig wurden die bestehenden Notiz-Mutationsrechte explizit abgesichert.

## Betroffene Features

- FT-03 Kalenderansichten: Wochenkalender, Terminkacheln und Inline-Notizen.
- FT-13 Notizverwaltung: Notizkarten, Notizeditor, Kartenfarbe, Druckflag und Mutationen.

Notion-Links wurden für diese Session nicht ergänzt; die lokale Feature-Dokumentation und der aktuelle Code waren für den Zuschnitt ausreichend.

## Konkrete Änderungen

- `note-colors` liefert für Notiztexte immer weiße Primär- und Sekundärfarbe; die automatische Schriftfarbselektion ist damit abgeklemmt.
- Die Wochenkalender-Terminkarten nutzen eine gemeinsame Inline-Notizkomponente mit X-Button zum Löschen und Doppelklick zum Bearbeiten.
- Inline-Notizen unterscheiden Termin- und Projektnotizen, damit Löschen und Invalidierung gegen den passenden API-Pfad laufen.
- Der Kalender-Preview-Contract liefert für Termin- und Projektnotizen zusätzlich `version` und `cardColorLocked`.
- Der Workflow-Notizeditor im Wochenkalender kann bestehende Termin- und Projektnotizen öffnen und speichert über den generischen Notiz-Update-Endpunkt.
- Notizdialoge in Wochenkalender, Notizsektionen, Terminformular und Tag-Picker verwenden viewport-sichere Breite, Höhe und Scrollverhalten.
- Customer-, Project- und generische Note-Controller blockieren Mutationen für lesende Rollen jetzt serverseitig mit `403 FORBIDDEN`.
- Historische Terminnotizen und Abwesenheitsterminnotizen bleiben serverseitig gegen Update und Delete gesperrt.

## Rollen

`ADMIN` und `DISPONENT` dürfen die neuen Inline-Notizaktionen sehen und ausführen, sofern die Terminkarte nicht durch Historie, Abwesenheit, Storno oder Lock read-only ist. `LESER` darf Notizen weiterhin lesen, erhält aber keine Inline-Mutationsaktionen und wird serverseitig bei direkten Mutationsaufrufen blockiert. Die Änderung verlässt sich nicht nur auf UI-Sichtbarkeit.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/lib/note-colors.test.ts tests/unit/ui/calendarWeekAppointmentCards.layout.test.tsx`
- `npm run test:integration -- tests/integration/server/calendar.appointments.notes-counts.integration.test.ts tests/integration/server/notes.joins-and-template-integrity.integration.test.ts --reporter=verbose`
- `npm run check`
- `git diff --check`

## Offene Punkte

- Keine offenen Blocker im bearbeiteten Zuschnitt.
- Es wurde keine Browser-E2E-Verifikation ergänzt; die Absicherung erfolgte über gezielte UI-Unit-Tests, Integrationstests und Typecheck.
