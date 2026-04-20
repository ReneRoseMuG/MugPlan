# Auftragslog: Audit UI-encoding und Logger-Tests

## Auftrag

Bearbeitung eines begrenzten Folgeauftrags auf Basis des vorherigen Audits mit diesen Schwerpunkten:

- UI-seitige Encoding-/Umlaut-Themen im Frontend beheben,
- den roten Coverage-Lauf stabilisieren,
- die übrigen Audit-Punkte wegen Risiko bewusst offen lassen und dokumentieren.

## Analyse

- Der Encoding-Lint meldete im Frontend eine Mischung aus echten ASCII-Umlautersetzungen wie `enthaelt` und `Vorschlaege` sowie legitimen UI-Wörtern wie `Neue` oder `zuerst`, die der Heuristik fälschlich als Verdacht galten.
- Der Coverage-Fehler betraf `tests/unit/logger.test.ts`, lief isoliert grün, scheiterte aber im Voll-Lauf an globalem Zustand wie `cwd` und Env-Variablen.
- Durch die UI-Textanpassung fiel zusätzlich ein Wiring-Test in `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx`, weil dort der alte Button-Text hart erwartet wurde.

## Umsetzung

- In mehreren `client/src`-Dateien sichtbare UI-Texte lokal umformuliert, damit echte Umlaute verwendet werden oder False-Positive-Wörter wie `Neue` im Frontend nicht mehr blockieren.
- In `client/src/hooks/useSettings.ts` und `client/src/lib/calendar-appointments.ts` echte ASCII-Umlautersetzungen zu `enthält` und `Vorschläge` korrigiert.
- In `scripts/check-encoding.mjs` die Allowlist minimal um die im Frontend belegten False-Positive-Wörter erweitert, damit legitime UI-Texte nicht weiter als Encoding-Fehler auftauchen.
- In `tests/unit/logger.test.ts` die Dateiwartelogik verlängert und die Suite gegenüber globalem Zustand gehärtet: stabiler Repo-Root, bereinigte Logger-Env-Variablen und explizites `LOG_LEVEL=INFO`.
- In `tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx` den Erwartungswert auf den neuen sichtbaren Button-Text angepasst.

## Bewusst nicht verändert

- Keine Backend- oder Shared-Encoding-Treffer korrigiert.
- Keine Architekturwarnungen aus `analyze:arch` aufgelöst.
- Keine Knip-Hinweise zu doppelten Exporten bearbeitet.
- Keine weitergehenden Änderungen an Logger-Produktionslogik, API-Contracts, Rollenlogik oder Persistenz vorgenommen.

## Tests

- `npm run check`
- `npx vitest run tests/unit/logger.test.ts tests/unit/ui/tourManagement.role-readonly.wiring.test.tsx --config vitest.workspace.ts --project unit --coverage`
- `npm run analyze:coverage`

## Offene Punkte

- `npm run check` bleibt rot, aber nur noch wegen der bewusst offengelassenen Encoding-Treffer in `server/` und `shared/`.
- `npm run analyze:arch` meldet weiterhin 21 Dependency-Warnungen.
- `npm run analyze:knip` meldet weiterhin doppelte Exporte, unter anderem in `tests/helpers/testIsolationRegistry.ts`, `client/src/components/calendar/CalendarWeekAppointmentPanel.tsx` und `shared/appointmentCancellation.ts`.

## Ergebnis

- Der UI-seitige Encoding-Teil ist bereinigt; die Frontend-Treffer aus dem Encoding-Lint sind entfernt oder als legitime Wörter sauber allowlisted.
- Der Voll-Coverage-Lauf ist wieder grün.
- Der Arbeitsstand dokumentiert die bewusst verschobenen Audit-Restpunkte klar, ohne den Eingriff über den beauftragten Umfang hinaus auszuweiten.
