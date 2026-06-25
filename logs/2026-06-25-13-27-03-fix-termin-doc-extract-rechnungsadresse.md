# Log: Termin-Doc-Extract Rechnungsadresse

**Datum:** 25.06.26
**Uhrzeit:** 13:27:03
**Schritt:** Fix — Termin-Doc-Extract Rechnungsadresse
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Doc-Extract-Pfad im Termin-Create-Formular schreibt extrahierte Kundendaten nun wie der Projektformular-Pfad getrennt nach Stammdaten und Rechnungsadresse. `AppointmentForm` sendet beim Kundenanlegen keine Adressfelder mehr an den Kunden-Contract, sondern patcht erkannte Adresswerte danach ueber die bestehende Customer-Address-API in die Standard-Rechnungsadresse. Bei vorhandenen Kunden werden weiterhin nur leere Felder ergaenzt; Adressfelder laufen dabei ebenfalls ueber das Adress-Backend und ueberschreiben keine vorhandenen Werte. Die bestehende serverseitige Berechtigung bleibt unveraendert: Adressaenderungen werden durch `customerAddressesService` fuer `DISPONENT` und `ADMIN` durchgesetzt. Eine Migration war nicht erforderlich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `client/src/components/AppointmentForm.tsx` | geaendert | Doc-Extract-Kundenanlage und Kunden-Backfill schreiben Rechnungsadresse ueber `/api/customers/:id/addresses/:addressId`. |
| `tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts` | geaendert | Bestehender Browser-E2E-Test prueft nun, dass die extrahierte Rechnungsadresse persistiert wird. |
| `logs/2026-06-25-13-27-03-fix-termin-doc-extract-rechnungsadresse.md` | angelegt | Schritt-Log fuer diesen Bugfix. |

## Testleitplanken und Testebenen

Testentwurfsleitplanken angewendet. Testebene: Browser/E2E mit echter Test-App, echter Testdatenbank und echten API-Antworten; die PDF-Extraktionsantwort bleibt im bestehenden Test als Route-Mock begrenzt auf den externen Parser-Ersatz. Bewiesenes Verhalten: bestehender Kunde ohne Adresse + Termin-Doc-Extract + Datenuebernahme -> Standard-Rechnungsadresse enthaelt die extrahierten Adresswerte.

Ausgefuehrt:
- `npm run typecheck`
- `npm run test:e2e:browser -- tests/e2e-browser/appointment-form.create-sidebar-persistence.browser.e2e.spec.ts -g "shows an extracted document only as project attachment after successful project save"`

## Probleme und Abweichungen

Graphify konnte wegen `uv trampoline failed to canonicalize script path` nicht abgefragt werden; die Analyse wurde deshalb direkt ueber `AppointmentForm`, `ProjectForm`, `shared/schema.ts` und die bestehende Customer-Address-API fortgesetzt.

## Offene Punkte / Folgeaufgaben

Keine.
