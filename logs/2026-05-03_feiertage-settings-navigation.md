# Auftragslog: Feiertage und Settings-Navigation

## Zweck

Dieses Log dokumentiert die Session zur Feiertagsdarstellung im Wochenkalender und zur vereinheitlichten Settings-Navigation für Admins und Disponenten.

## Scope

- Wochenkalender:
  - Feiertage vom Typ `public_holiday` und Betriebsfeiertage vom Typ `company_holiday` verwenden dieselbe Breitenlogik wie Wochenendtage.
  - Feiertagsspalten bleiben standardmäßig schmal und werden nur bei regulären Terminen auf normale Wochentagsbreite verbreitert.
  - Reine Abwesenheiten verbreitern diese Spalten nicht.
- Settings:
  - Disponenten erhalten Zugriff auf die Feiertagsverwaltung im Settings-Bereich.
  - Admins und Disponenten sehen den Bereich einheitlich als `Einstellungen`.
  - Die Settings-Subnavigation erhält Icons für Oberfläche, Feiertage, Kalender, Sicherheit und Backup & Dump.

## Technische Entscheidungen

1. Die Breitenlogik bleibt lokal im Wochenkalender und nutzt die bestehende Prüfung, ob ein Tag reguläre Termine enthält.
2. Feiertage und Betriebsfeiertage werden für die kompakte Spaltenbreite wie Wochenendtage behandelt.
3. Der Zugriff auf die Feiertagsverwaltung wurde nicht nur im Frontend sichtbar gemacht, sondern serverseitig für `ADMIN` und `DISPONENT` abgesichert.
4. Die generische Admin-Maintenance-Policy lässt Kalendermarker-Pfade gezielt zur Service-Rollenprüfung durch.
5. Die globale Marker-Visualisierung darf für Kalendermarker durch `ADMIN` und `DISPONENT` geschrieben werden; andere globale Settings bleiben unverändert beschränkt.
6. Die Settings-Beschriftung wurde auf `Einstellungen` vereinheitlicht, ohne Rollen oder Aktionen zu verändern.

## Betroffene Dateien

- `client/src/components/calendar/CalendarWeekView.tsx`
- `client/src/components/SettingsPage.tsx`
- `client/src/pages/Home.tsx`
- `server/services/calendarMarkersService.ts`
- `server/services/userSettingsService.ts`
- `server/middleware/adminMaintenancePolicy.ts`
- `tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `tests/unit/ui/settingsPage.behavior.test.tsx`
- `tests/unit/ui/settingsPage.navigation.test.tsx`
- `tests/unit/ui/sidebar.behavior.test.tsx`
- `tests/integration/server/calendarMarkers.integration.test.ts`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/TEST_MATRIX.md`

## Rollen- und Rechteprüfung

- `ADMIN` darf Feiertage und Betriebsfeiertage sehen und pflegen.
- `DISPONENT` und `DISPATCHER` dürfen den Feiertagsbereich in den Einstellungen sehen und Kalendermarker pflegen.
- `READER` sieht den Feiertagsbereich nicht und darf die Pflegepfade nicht nutzen.
- Die Durchsetzung erfolgt für Mutationen serverseitig im Kalendermarker-Service und bei globalen Marker-Settings im Settings-Service.
- Die UI-Sichtbarkeit ist nur ergänzend und ersetzt keine Serverprüfung.

## Tests und Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/calendarWeekView.layoutGrid.test.tsx`
- `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/settingsPage.navigation.test.tsx`
- `npm run test:integration -- tests/integration/server/calendarMarkers.integration.test.ts --reporter=verbose`
- `npm run test:unit -- tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/settingsPage.navigation.test.tsx tests/unit/ui/sidebar.behavior.test.tsx`
- `npm run typecheck`
- `git diff --check`

## Bekannte Einschränkungen

- Es wurde keine neue Datenbankstruktur eingeführt.
- Es wurden keine neuen API-Contracts angelegt.
- Die Änderung betrifft die vorhandene Kalendermarker-Pflege und bestehende Settings-Strukturen.
