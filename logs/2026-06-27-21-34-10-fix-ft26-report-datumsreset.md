# Log: FT26 Report-Datumsreset

**Datum:** 27.06.26
**Uhrzeit:** 21:34:10
**Schritt:** Fix — FT26 Report-Datumsreset
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der FT26-Browser-E2E-Test wurde an den aktuellen ISO-KW-Default der Report-Konfiguration angepasst. Die bisherige negative Assertion pruefte, dass das Bis-Datum nach Navigation zurueck in die Reports nicht dem testseitigen `inRangeDate` entspricht; dieser Wert kann an Samstagen aber exakt dem Ende der aktuellen ISO-Woche entsprechen. Der Test berechnet nun den erwarteten aktuellen ISO-Wochenbereich aus `getRelativeBerlinDate(0)` und prueft den Reset positiv auf `fromDate` und `toDate`. Produktivcode, API, Rollenlogik, Datenmodell und Migrationen wurden nicht geaendert.

Testentwurfsleitplanken angewendet. Testebene: Browser/E2E mit echter Test-App, echter Testdatenbank und echten API-Antworten. Bewiesenes Verhalten: Reports kehren nach Navigation auf den aktuellen ISO-KW-Defaultbereich zurueck und die FT26-Reportflows bleiben gruen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/e2e-browser/reports.ft26.browser.e2e.spec.ts` | geändert | Datumsreset-Assertion auf positiven ISO-KW-Default umgestellt |
| `logs/2026-06-27-21-34-10-fix-ft26-report-datumsreset.md` | angelegt | Schritt-Log fuer den Testfix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die uebrigen Browser-E2E-Fehler aus dem Gesamtlauf sind weiterhin offen und wurden nicht bearbeitet.
