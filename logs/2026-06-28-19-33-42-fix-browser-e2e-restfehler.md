# Log: Browser-E2E Restfehler

**Datum:** 28.06.26
**Uhrzeit:** 19:33:42
**Schritt:** Fix — Browser-E2E Restfehler
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der verbliebene Browser-E2E-Fehler im Storno-Workflow wurde fachlich sauber behoben: Nach dem Stornieren eines Termins setzt der Server den Projekt-Auftragswert bereits auf `0.00`, aber das Terminformular invalidierte nicht den von `ProjectForm` verwendeten Project-Detail-Query-Key. Die Storno-Mutation invalidiert nun zusätzlich `["/api/projects", selectedProjectId]` und die Projektliste, damit das Projektformular nach dem erneuten Öffnen den aktualisierten Betrag sieht. Der Storno-Browsertest bestätigt außerdem den Dirty-Dialog bewusst, der durch die serverseitige Betragsänderung im noch geöffneten Projektformular entsteht. Zusätzlich wurde ein veralteter Create-Sidebar-Test stabilisiert, indem die Assertion `Keine Mitarbeiter zugewiesen` auf den bestehenden Mitarbeiter-Slot begrenzt wurde.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `client/src/components/AppointmentForm.tsx` | geändert | Storno-Mutation invalidiert Project-Detail- und Projektlisten-Queries passend zu `ProjectForm`. |
| `tests/e2e-browser/appointment-cancellation.workflow.browser.e2e.spec.ts` | geändert | Projektformular wird im Storno-Flow inklusive optionalem Verwerfen-Dialog stabil geschlossen. |
| `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts` | geändert | Mitarbeiter-Leerzustand wird scoped im Mitarbeiter-Slot geprüft. |
| `logs/2026-06-28-19-33-42-fix-browser-e2e-restfehler.md` | angelegt | Schritt-Log für diesen Test-/Frontend-Fix. |
| `logs/README.md` | geändert | Neuer Logeintrag ergänzt. |

## Probleme und Abweichungen

Graphify konnte lokal nicht ausgeführt werden (`uv trampoline failed to canonicalize script path`). Die Analyse wurde deshalb gezielt über die betroffenen Dateien, vorhandene Integrationstests und Browser-Reproduktion durchgeführt. Der volle Browser-E2E-Gesamtlauf lieferte auch nach 45 Minuten keinen Abschluss und keinen verwertbaren JSON-Report; die hängende Playwright-Prozesskette wurde beendet. Stattdessen wurde der komplette geänderte Browser-Scope mit 35 Tests erfolgreich verifiziert.

## Offene Punkte / Folgeaufgaben

Der vollständige Browser-E2E-Gesamtlauf sollte separat weiter untersucht werden, weil er aktuell keinen sauberen Abschlussbericht zurückliefert. Für die geänderten und zuvor roten Browser-Bereiche sind keine offenen Testfehler bekannt.

## Testleitplanken

Angewendet wurden die Test-Entwurfsleitplanken für Browser/E2E. Testebene: Browser/E2E mit echter Test-App, echter Testdatenbank, echten API-Antworten und realer Browserinteraktion. Kein Mocking. Verifikation: `npm run check`, `npm run lint`, gezielte Browser-Spec-Läufe für Storno und Create-Sidebar sowie ein gebündelter Lauf aller aktuell geänderten Browser-Specs mit 35 bestandenen Tests.
