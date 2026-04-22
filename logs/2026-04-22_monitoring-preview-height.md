# Auftragslog: Monitoring-Preview-Höhe

## Zweck

In der View `Monitoring` wurde die Terminzeilen-Preview an die Darstellung anderer Terminlisten angeglichen.

- Die Preview nutzt weiterhin die Wochenterminkarte.
- Die bisher wirksame Höhenbegrenzung der Tabellen-Preview greift nicht mehr.
- Die Preview wird in voller Detailauflösung angezeigt.

## Scope

Umgesetzt wurde eine gezielte UI-Verdrahtungsänderung für die Hover-Preview in der Monitoring-Tabelle.

Nicht Bestandteil:

- Änderung der Monitoring-Filter
- Änderung der Monitoring-Triggerlogik
- Änderung von Termin-, Kalender- oder API-Daten
- Änderung der Wochenterminkarte selbst

## Technische Entscheidungen

1. Die Monitoring-Zeilen geben jetzt wie andere Terminlisten ein `InfoBadgePreview` zurück.
2. Die bestehenden Optionen der Wochenterminkarten-Preview werden wiederverwendet.
3. `maxHeight: null` und `scrollY: "visible"` verhindern die vorherige `TableView`-Default-Höhenbegrenzung.
4. Der asynchrone Ladepfad der Monitoring-Preview bleibt erhalten.

## Betroffene Dateien

### Produktivcode

- `client/src/components/MonitoringPage.tsx`

### Tests

- `tests/unit/ui/monitoringPage.behavior.test.tsx`

## Hinweise zum Testen

Ausgeführt:

- `npm run test:run -- tests/unit/ui/monitoringPage.behavior.test.tsx`

Ergebnis:

- Erfolgreich, 1 Test bestanden.
- 1 bestehender Test bleibt unverändert `skipped`.

## Bekannte Einschränkungen

- Es wurde kein voller Audit und kein voller Testlauf ausgeführt.
- Die Änderung wurde nicht zusätzlich per Browser-Screenshot verifiziert.
