# UC-258 — Kalenderwochenweise Sammelverschiebung mehrerer Termine (Planung)

Datum: 10.06.26
Branch: `uc-258-kw-sammelverschiebung` (von `work`)
Auftragsklasse: 5 (mehrschichtiges Feature)
Projekt-Manager: PROJ-1 / TASK-329

## Zweck

Planung der Implementierung und einer vollständigen Testsuite für UC-258: Im
Wochenkalender sollen mehrere Termine ausgewählter Touren gesammelt um eine oder
mehrere volle Kalenderwochen nach vorn verschoben werden. Vor der Ausführung zeigt
das System einen Zwischenreport (verschiebbar / blockiert / Hinweis), erst nach
Bestätigung werden ausschließlich die ausgewählten Termine verschoben (teilweise
Ausführung). Dieser Eintrag dokumentiert ausschließlich Plan und Designentscheidungen;
es wurde noch kein Produktiv- oder Testcode geschrieben.

## Scope

Im Scope:
- Serverseitige read-only-Vorschau (Zwischenreport) und schreibende Ausführung der
  Sammelverschiebung als dünne Schicht über der bestehenden Einzelverschiebung.
- Benutzerspezifische Persistenz von Quelltouren, Verschiebungsdistanz und blockierenden
  Tags über die vorhandene `user_settings_value`-JSON-Tabelle.
- Wochenkalender-Dialog mit Konfiguration, Zwischenreport und Ergebnisbericht.
- Vollständige Testsuite über Unit, Integration und E2E-Browser.

Nicht im Scope:
- Rückwärtsverschiebung (laut UC unzulässig).
- Landesspezifische/regionale Feiertage (nur bundeseinheitliche als nicht-blockierender
  Hinweis).
- Automatisches Entfernen von Mitarbeitern bei Konflikten.

## Technische Entscheidungen

- **Reuse statt zweitem Schreibpfad:** Die Ausführung ruft je ausgewähltem Termin den
  bestehenden, bereits abgesicherten `appointmentsService.updateAppointment` auf
  (gleiche Tour, nur neues Start-/Enddatum). Damit werden Rollen-, Sperr-, Storno-,
  Historien-, Überschneidungs- und Versionsregeln nicht dupliziert, sondern geerbt.
- **Read-only-Vorschau:** Für den Zwischenreport wird eine nicht-mutierende
  `evaluateWeekMoveTarget`-Hilfe aus den vorhandenen Assert-Prüfungen in
  `updateAppointment` extrahiert, sodass Preview und Execute dieselbe Wahrheit nutzen
  und kein Schreibzugriff im Preview erfolgt.
- **Teilweise Ausführung:** Fehler/Versionskonflikt eines Termins blockieren die übrigen
  nicht; jeder fehlgeschlagene Termin wird im Ergebnisbericht mit Ursache ausgewiesen.
- **Keine Schemaänderung / keine Migration:** Die drei neuen Benutzereinstellungen
  (`calendarBulkMove.sourceTourIds`, `calendarBulkMove.shiftWeeks`,
  `calendarBulkMove.blockingTagIds`) werden ausschließlich über die bestehende
  Settings-Registry und die vorhandene JSON-Settings-Tabelle gespeichert.
- **Feiertage:** Bundeseinheitliche gesetzliche Feiertage am Ziel werden aus den
  vorhandenen Kalendermarkern (`type = public_holiday`, `scope = national`, aktiv)
  ermittelt und als rot hervorgehobener, nicht-blockierender Hinweis dargestellt.
- **„Fix"-Vorauswahl:** „Fix" ist ein normales (kundengepflegtes) Tag, kein
  Seed-Systemtag. Bei fehlender gespeicherter Tag-Auswahl wird es per Namensauflösung
  vorausgewählt; existiert es nicht, greift der Alternativablauf „leere Auswahl".
- **Contract-First:** Die zwei Endpunkte werden zuerst in `shared/routes.ts`
  (`calendarBulkWeekMove.preview` / `.execute`) als Zod-Verträge definiert.

## Betroffene Dateien (geplant)

- `shared/routes.ts` (Contract-Erweiterung)
- `server/routes/calendarBulkWeekMoveRoutes.ts` (neu) + Registrierung in `server/routes.ts`
- `server/controllers/calendarBulkWeekMoveController.ts` (neu)
- `server/services/calendarBulkWeekMoveService.ts` (neu)
- `server/services/appointmentsService.ts` (minimal: `evaluateWeekMoveTarget` extrahieren)
- `server/settings/registry.ts` (3 USER-Settings)
- `client/src/lib/calendar-bulk-week-move.ts` (neu)
- `client/src/components/CalendarBulkWeekMoveDialog.tsx` (neu)
- `client/src/hooks/useBulkWeekMove.ts` (neu)
- Wochenkalender-Auslöser (`CalendarWorkspace.tsx` / `CalendarWeekView.tsx`)

## Hinweise zum Testen (geplante Suite)

- Unit/Helfer: Zielberechnung (+N KW erhält Wochentag/Dauer/Startzeit; mehrtägig;
  Jahreswechsel; Rückwärts unzulässig), Quellmengenfilter, Tag-Block, Fix-Vorauswahl,
  Feiertag (national ja / regional nein), Notiz-Hinweis, Vorauswahl/Selektierbarkeit,
  Execute-Aktivierung, `dd.MM.yy`-Formatierung.
- Unit/UI: Dialog-Schrittfolge, blockierte Zeile deaktiviert + Grund, Feiertagszeile rot,
  Abwahl aller deaktiviert „Bestätigen", Ergebnisbericht.
- Integration (`createApiTestApp`, Factory, eindeutige Tokens, Isolationsklasse B):
  Preview-Report-Bewertung inkl. Identität über appointmentId + Token und Count/Delta;
  Execute mit teilweiser Ausführung, Versionskonflikt, DISPONENT vs. ADMIN bei
  historischen Terminen, Erhalt der Zuordnungen, DB-Datum exakt +N KW; Settings-Roundtrip.
- E2E-Browser (Storage-Ausgangszustand deklariert): voller Ablauf mit Identitäts-,
  Count- und Ausschlussnachweis (Ziel-KW enthält, Quell-KW schließt aus).
- Pflichtpflege: Test-Doku-Kopfkommentar je Datei + `docs/TEST_MATRIX.md`.

## Bekannte Einschränkungen / offene Punkte

- Der genaue Einstiegspunkt/Auslöser im Wochenkalender (Button vs. Menüeintrag) ist im
  Plan benannt, aber bei der Umsetzung an die vorhandene Aktionsleiste anzupassen.
- Die Defaultdistanz (`shiftWeeks`) ist auf einen fachlich sinnvollen Wertebereich
  (min. 1) festzulegen; Rückwärtsverschiebung bleibt ausgeschlossen.
- Umsetzung des Produktiv- und Testcodes erfolgt in einem Folgeschritt auf demselben
  Branch.
