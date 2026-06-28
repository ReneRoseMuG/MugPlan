# Log: AF-09 Formular-Hydration

**Datum:** 28.06.26
**Uhrzeit:** 09:51:39
**Schritt:** Fix — AF-09 Formular-Hydration
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Browser-E2E-Test AF-09 wartet nach dem Öffnen des Terminformulars nun darauf, dass das Startdatum aus den geladenen Termindetails stabil im Formular steht. Erst danach trägt der Test das neue Startdatum ein und prüft unmittelbar, dass der neue Wert im Feld angekommen ist. Damit wird verhindert, dass eine nachlaufende Formular-Hydration den Testwert wieder überschreibt, bevor der Speichern-Workflow ausgelöst wird. Die fachliche Aussage des Tests bleibt unverändert: Der Save-Review-Dialog mit mehreren Schritten wird vollständig durchlaufen und der Termin danach mit dem neuen Datum gespeichert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/e2e-browser/appointment-form.resource-conflicts.browser.e2e.spec.ts` | geändert | AF-09 wartet vor dem Datumswechsel auf den initialen Formularwert und prüft den gesetzten Zielwert. |
| `logs/2026-06-28-09-51-39-fix-af09-formular-hydration.md` | angelegt | Schritt-Log für den AF-09-Testfix. |
| `logs/README.md` | geändert | Neuer Logeintrag ergänzt. |

## Probleme und Abweichungen

Der gezielte AF-09-Lauf ist grün. Der vollständige Lauf der betroffenen Spec-Datei stoppt anschließend bei AF-03; dadurch wurden die späteren Tests in diesem Dateilauf übersprungen. Dieser neue Fehler ist separat zu analysieren.

## Offene Punkte / Folgeaufgaben

Nächster roter Test: `AF-03: Mitarbeiter mit Terminkonflikt im Formular – Finaler Konfliktdialog beim Speichern, Termin unverändert`.

## Testleitplanken

Angewendet wurden die Test-Entwurfsleitplanken für Browser/E2E. Testebene: Browser/E2E mit echten Fixtures, realer Browserinteraktion und isolierter Testumgebung. Kein Mocking.
