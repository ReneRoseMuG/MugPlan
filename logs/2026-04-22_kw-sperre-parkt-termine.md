# KW-Sperre parkt Termine statt Planung blockiert zu setzen

## Zweck

Die Sperre einer Tour-Kalenderwoche soll weiterhin die technische Wochenplanung blockieren, aber betroffene Termine nicht mehr über das System-Tag `Planung blockiert` read-only machen. Stattdessen werden nicht stornierte Termine der gesperrten Tour/KW fachlich geparkt.

## Scope

Umgesetzt wurde der neue Sperrpfad für Tour-KWs:

- `tour_week.is_blocked` bleibt die technische Sperre.
- Nicht stornierte Termine der Tour/KW werden auf die System-Tour `Parkplatz` verschoben.
- Mitarbeiter am Termin werden entfernt.
- Das System-Tag `Geparkt` wird gesetzt.
- `Planung blockiert` wird im neuen KW-Sperrpfad nicht mehr gesetzt.
- Stornierte Termine bleiben als Ausnahme unverändert in der gesperrten Tour/KW.
- Entsperren setzt nur die technische Sperre zurück; geparkte Termine bleiben geparkt.

Nachgelagert wurden zwei gemeldete Aktualitäts- und Sperrregel-Fälle ergänzt:

- Nach einer KW-Sperre werden Terminformular-Detaildaten und Termin-Tags invalidiert, damit ein zuvor geöffneter Termin beim erneuten Öffnen sofort `Parkplatz`, keine Mitarbeiter und `Geparkt` zeigt.
- Das Terminformular übernimmt zwischengespeicherte Termin-Details nicht mehr als endgültigen Formularzustand, solange die Detailabfrage noch frisch lädt.
- Einer gesperrten Tour/KW kann über das Terminformular kein Termin mehr zugewiesen werden.
- Der Auswahlversuch wird mit der fachlichen Meldung `Für <Tour>/KW <KW> wurde die Terminplanung gesperrt.` abgewiesen.
- Die Sperrregel wird zusätzlich serverseitig im Termin-Create-/Update-Pfad erzwungen.

Nicht umgesetzt wurde eine vollständige Entfernung des System-Tags `Planung blockiert` aus Seed, Schutzlogik oder bestehenden separaten Schutztests.

## Technische Entscheidungen

Die gemeinsame Parken-Mutation wurde in `server/services/appointmentParkingService.ts` ausgelagert. Dadurch verwenden Einzeltermin-Parken und KW-Sperre dieselbe Kernoperation für Tourwechsel auf `Parkplatz`, Mitarbeiterentfernung und `Geparkt`-Tag.

`appointmentsService.parkAppointment` behält seine bisherigen fachlichen Guards und Fehlercodes, insbesondere Rollenprüfung, Versionsprüfung, Storno-Schutz, historische Sperre und `ALREADY_PARKED`.

`tourWeeksService.blockTourWeek` nutzt den neuen Helper ohne nutzerseitige Expected-Version pro Termin. Stornierte Termine werden vor der Mutation übersprungen und nicht in `affectedAppointmentCount` gezählt. Defensive No-op-Fälle für bereits geparkte Termine werden ebenfalls nicht gezählt.

`tourWeeksService.unblockTourWeek` entfernt keine Termin-Tags mehr und rekonstruiert keine Mitarbeiter oder Tour-Zuordnungen.

Die Kalender- und Tour-KW-Invalidierung wurde erweitert, damit nach dem Blockieren auch gecachte `/api/appointments`-Detailabfragen neu geladen werden. Dadurch bleibt das Terminformular konsistent mit dem Wochenkalender, der den geparkten Termin bereits korrekt anzeigt.

Die Tour-Auswahl im Terminformular wendet eine neue Tour erst nach erfolgreicher Wochenplan-Preview an. Die Preview prüft nun auch `tour_week.is_blocked` für die Ziel-Tour/KW. Zusätzlich schützt `appointmentsService` den eigentlichen Create- und Update-Pfad gegen Terminzuweisungen in gesperrte Tour-KWs, damit die Fachregel nicht nur im Browser gilt.

## Betroffene Dateien

- `server/services/appointmentParkingService.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeekEmployeesService.ts`
- `server/services/tourWeeksService.ts`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/lib/tour-week-queries.ts`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourWeekForm.tsx`
- `client/src/components/TourWeekCard.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`

## Tests

Ausgeführt und erfolgreich:

- `npm run test:unit -- tests/unit/services/appointments.park.test.ts tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourWeekCard.render.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts tests/integration/server/appointments.park.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `git diff --check`

Für die nachgelagerten Fälle zusätzlich ausgeführt und erfolgreich:

- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.layout-tour-integration.browser.e2e.spec.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `npm run test:integration -- tests/integration/server/tourWeekEmployees.integration.test.ts --reporter=verbose`
- `git diff --check`

Zusätzlich ausgeführt mit Einschränkungen:

- `npm run check`: TypeScript lief erfolgreich durch, danach schlug `lint:encoding` wegen bereits vorhandener verdächtiger ASCII-Umlautsequenzen in mehreren Bestandsdateien fehl.
- Beim nachgelagerten Check trat derselbe bekannte `lint:encoding`-Fehler erneut auf; die Vorchecks und TypeScript liefen erfolgreich durch.
- `npm run lint`: konnte nicht starten, weil lokal `eslint-plugin-boundaries` fehlt.

## Bekannte Einschränkungen

Die Änderung koppelt Terminparken und KW-Status weiterhin über getrennte Service-Transaktionen. Die bisherige Struktur wurde beibehalten, um keine Architektur- oder Repository-Grenzen auszuweiten.

Bestehende Altdaten mit `Planung blockiert` werden nicht automatisch migriert oder bereinigt. Dieser Tag bleibt als separater reservierter System-Tag bestehen.
