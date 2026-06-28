# Log: BWK-03 Monatsziel sichtbar

**Datum:** 27.06.26
**Uhrzeit:** 22:21:48
**Schritt:** Fix — BWK-03 Monatsziel sichtbar
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Browser-E2E-Test `BWK-03` fuer Monatskalender-Cross-KW-D&D wurde gegen Monatsgrenzen stabilisiert. Der Test navigiert nun bei Bedarf im Monatsblatt vor, bis der Zieltag `week2.weekStartDate` sichtbar ist. Danach wird der Source-Termin erneut sichtbar geprueft und der Rueckgabewert von `dispatchMonthViewDrop` explizit auf `true` assertiert. Damit meldet der Test kuenftig einen nicht angekommenen Drop direkt, statt erst am fehlenden Move-Dialog zu scheitern. Produktivcode, API, Rollenlogik, Datenmodell und Migrationen wurden nicht geaendert.

Testentwurfsleitplanken angewendet. Testebene: Browser/E2E mit echter Test-App, echter Testdatenbank und echten API-Antworten. Bewiesenes Verhalten: BWK-01 bis BWK-03 laufen gemeinsam gruen und der Monatskalender-Drop funktioniert auch, wenn die Ziel-KW im naechsten Monatsblatt liegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/e2e-browser/calendar-move.blocked-week-plan.browser.e2e.spec.ts` | geändert | BWK-03 navigiert bei Bedarf zum sichtbaren Monatsziel und prueft Drop-Erfolg |
| `logs/2026-06-27-22-21-48-fix-bwk03-monatsziel-sichtbar.md` | angelegt | Schritt-Log fuer den Testfix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die uebrigen Browser-E2E-Fehler aus dem Gesamtlauf sind weiterhin offen und wurden nicht bearbeitet.
