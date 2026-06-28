# Log: AF-03 Formular-Hydration

**Datum:** 28.06.26
**Uhrzeit:** 10:31:08
**Schritt:** Fix — AF-03 Formular-Hydration
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Browser-E2E-Test AF-03 wartet nach dem Öffnen des Terminformulars nun auf den stabil geladenen Formularzustand. Konkret prüft der Test das initiale Startdatum des Zieltermins und den sichtbaren zugewiesenen Mitarbeiter, bevor der Speichern-Button geklickt wird. Dadurch wird verhindert, dass der Test den Speichern-Workflow auslöst, bevor die Termindetaildaten inklusive Version und Mitarbeiterzuordnung vollständig im Formular angekommen sind. Die fachliche Aussage bleibt unverändert: Ein bereits konfliktbehafteter Termin löst beim Speichern den finalen Konfliktdialog aus und bleibt unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/e2e-browser/appointment-form.resource-conflicts.browser.e2e.spec.ts` | geändert | AF-03 wartet vor dem Speichern auf initiales Datum und sichtbaren Mitarbeiter. |
| `logs/2026-06-28-10-31-08-fix-af03-formular-hydration.md` | angelegt | Schritt-Log für den AF-03-Testfix. |
| `logs/README.md` | geändert | Neuer Logeintrag ergänzt. |

## Probleme und Abweichungen

Der erste AF-03-Nachlauf zeigte, dass die Mitarbeiteranzeige im Formular `Vorname Nachname` verwendet, während `employee.fullName` aus der Fixture anders formatiert ist. Die Stabilitätsprüfung wurde deshalb auf `${employee.firstName} ${employee.lastName}` ausgerichtet.

## Offene Punkte / Folgeaufgaben

Keine in dieser Spec: `appointment-form.resource-conflicts.browser.e2e.spec.ts` läuft vollständig grün.

## Testleitplanken

Angewendet wurden die Test-Entwurfsleitplanken für Browser/E2E. Testebene: Browser/E2E mit echten Fixtures, realer Browserinteraktion und isolierter Testumgebung. Kein Mocking.
