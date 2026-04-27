# Monitoring-Terminliste Zeilenfärbung entfernt

## Zweck

In der Monitoring-Terminliste sollte die triggerabhängige Zeilenfärbung entfernt werden. Die bestehende Fokus-Markierung für den nächsten gefilterten Termin sollte erhalten bleiben.

## Scope

- Entfernen der Hintergrundfärbung in der Monitoring-Tabelle
- Beibehalten der Fokus-Outline für den nächstliegenden gefilterten Termin
- Anpassen des unmittelbaren Unit-Tests an das neue Sollverhalten
- Verifikation des Browser-Verhaltens mit echter Datenbasis

Nicht geändert:

- Monitoring-Filterlogik
- Triggerdaten und Triggertexte
- Öffnen von Terminen aus der Monitoring-Liste
- Rollen- und Berechtigungslogik

## Technische Entscheidungen

- Die Zeilenfarbe wird direkt in der `rowStyle`-Ableitung der Monitoring-Tabelle nicht mehr gesetzt.
- Die vorhandene Fokus-Outline bleibt unverändert bestehen, damit der Datumsfokus weiterhin sichtbar ist.
- Die Testanpassung bleibt lokal auf die betroffene Monitoring-Seite begrenzt.

## Betroffene Dateien

- `client/src/components/MonitoringPage.tsx`
- `tests/unit/ui/monitoringPage.behavior.test.tsx`

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run test:run -- tests/unit/ui/monitoringPage.behavior.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/monitoring.focus.browser.e2e.spec.ts`

Abgesichert:

- Monitoring-Zeilen haben keine triggerabhängige Flächenfärbung mehr.
- Der nächstliegende gefilterte Termin behält die Fokus-Outline.
- Leerfilter-Zustände hinterlassen keinen falschen Fokusrest.

## Risiko

- Niedrig. Geändert wurde ausschließlich die visuelle Zeilenhinterlegung im Monitoring.
