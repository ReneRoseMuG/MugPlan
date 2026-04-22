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

Nicht umgesetzt wurde eine vollständige Entfernung des System-Tags `Planung blockiert` aus Seed, Schutzlogik oder bestehenden separaten Schutztests.

## Technische Entscheidungen

Die gemeinsame Parken-Mutation wurde in `server/services/appointmentParkingService.ts` ausgelagert. Dadurch verwenden Einzeltermin-Parken und KW-Sperre dieselbe Kernoperation für Tourwechsel auf `Parkplatz`, Mitarbeiterentfernung und `Geparkt`-Tag.

`appointmentsService.parkAppointment` behält seine bisherigen fachlichen Guards und Fehlercodes, insbesondere Rollenprüfung, Versionsprüfung, Storno-Schutz, historische Sperre und `ALREADY_PARKED`.

`tourWeeksService.blockTourWeek` nutzt den neuen Helper ohne nutzerseitige Expected-Version pro Termin. Stornierte Termine werden vor der Mutation übersprungen und nicht in `affectedAppointmentCount` gezählt. Defensive No-op-Fälle für bereits geparkte Termine werden ebenfalls nicht gezählt.

`tourWeeksService.unblockTourWeek` entfernt keine Termin-Tags mehr und rekonstruiert keine Mitarbeiter oder Tour-Zuordnungen.

## Betroffene Dateien

- `server/services/appointmentParkingService.ts`
- `server/services/appointmentsService.ts`
- `server/services/tourWeeksService.ts`
- `client/src/components/TourEditForm.tsx`
- `client/src/components/TourWeekForm.tsx`
- `client/src/components/TourWeekCard.tsx`
- `tests/integration/server/tourWeekEmployees.integration.test.ts`
- `tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx`

## Tests

Ausgeführt und erfolgreich:

- `npm run test:unit -- tests/unit/services/appointments.park.test.ts tests/unit/ui/tourEditForm.layoutShellIntegration.test.tsx tests/unit/ui/tourWeekCard.render.test.tsx`
- `npm run test:integration -- --reporter=verbose tests/integration/server/tourWeekEmployees.integration.test.ts tests/integration/server/appointments.park.integration.test.ts`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts`
- `git diff --check`

Zusätzlich ausgeführt mit Einschränkungen:

- `npm run check`: TypeScript lief erfolgreich durch, danach schlug `lint:encoding` wegen bereits vorhandener verdächtiger ASCII-Umlautsequenzen in mehreren Bestandsdateien fehl.
- `npm run lint`: konnte nicht starten, weil lokal `eslint-plugin-boundaries` fehlt.

## Bekannte Einschränkungen

Die Änderung koppelt Terminparken und KW-Status weiterhin über getrennte Service-Transaktionen. Die bisherige Struktur wurde beibehalten, um keine Architektur- oder Repository-Grenzen auszuweiten.

Bestehende Altdaten mit `Planung blockiert` werden nicht automatisch migriert oder bereinigt. Dieser Tag bleibt als separater reservierter System-Tag bestehen.
