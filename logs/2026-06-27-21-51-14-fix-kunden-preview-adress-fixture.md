# Log: Kunden-Preview Adress-Fixture

**Datum:** 27.06.26
**Uhrzeit:** 21:51:14
**Schritt:** Fix — Kunden-Preview Adress-Fixture
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Browser-E2E-Test fuer den Kundendaten-Hover-Preview im Wochenkalender wurde an das MS68-Adressmodell angepasst. Der rote Test legte die erwartete Adresse noch ueber ein flaches Kundenfeld direkt im `customersService.createCustomer`-Payload an. Die Adresse wird nun ueber den bestehenden Fixture-Helper `createCustomerFixtureWithOverrides` erzeugt, der Adress-Overrides in die Rechnungsadress-Zeile schreibt und korrekt spiegelt. Produktivcode, API, Rollenlogik, Datenmodell und Migrationen wurden nicht geaendert.

Testentwurfsleitplanken angewendet. Testebene: Browser/E2E mit echter Test-App, echter Testdatenbank und echten API-Antworten. Bewiesenes Verhalten: Der Wochenkalender-Hover zeigt weiterhin Kundendaten mit Telefonnummer und auch die Adresse eines Kunden ohne Telefonnummer korrekt an.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/e2e-browser/calendar-week-customer-preview-phone.browser.e2e.spec.ts` | geändert | Adress-Fixture im Test auf MS68-kompatiblen Helper umgestellt |
| `logs/2026-06-27-21-51-14-fix-kunden-preview-adress-fixture.md` | angelegt | Schritt-Log fuer den Testfix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die uebrigen Browser-E2E-Fehler aus dem Gesamtlauf sind weiterhin offen und wurden nicht bearbeitet.
