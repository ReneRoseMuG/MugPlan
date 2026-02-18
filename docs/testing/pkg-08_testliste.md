# PKG-08 Testliste

## Ziel von PKG-08
PKG-08 deckt den kombinierten Qualitaetsumfang aus Benutzerverwaltung, Auth-Erweiterung, User-Settings-Versionierung und TableLayout-Stabilitaet ab:

1. Admin kann neue Benutzer anlegen, inklusive sauberer Fehlercodes fuer Berechtigung, Validierung und Konflikte.
2. Login funktioniert sowohl ueber Benutzername als auch ueber E-Mail-Identifier.
3. User-Settings speichern robust mit Optimistic Locking (Versionen je Scope, Retry bei Konflikt).
4. Tabellenansicht bleibt im Scroll-Verhalten stabil, insbesondere fuer Sticky-Header.
5. Systemrollen werden reproduzierbar und idempotent beim Bootstrap bereitgestellt.

## Abdeckungsuebersicht
- Datei `tests/unit/authorization/userCreate.test.ts`: 4 Unit-Tests
- Datei `tests/unit/auth/loginIdentifier.test.ts`: 1 Unit-Test
- Datei `tests/unit/settings/settingsProvider.versioning.test.tsx`: 4 Unit-Tests
- Datei `tests/unit/settings/userSettingsResolvedMapping.test.ts`: 2 Unit-Tests
- Datei `tests/unit/ui/tableView.stickyHeader.test.tsx`: 3 Unit-Tests
- Datei `tests/integration/bootstrap/ensureSystemRoles.test.ts`: 2 Integrationstests
- Datei `tests/integration/extraction/documentTextExtractor.fixture.test.ts`: 1 Integrationstest (Fixture-PDF)

## Block Auth & Benutzerverwaltung

### Datei `tests/unit/authorization/userCreate.test.ts`

### 1) `rejects non-admin context`
- Erwartung:
  - `createUser` verweigert Nicht-ADMIN mit `403 LOCK_VIOLATION`.

### 2) `validates password length`
- Erwartung:
  - Zu kurzes Passwort wird mit `422 VALIDATION_ERROR` abgelehnt.

### 3) `creates user and returns refreshed list`
- Erwartung:
  - Passwort wird gehasht.
  - Repository-Create wird aufgerufen.
  - Rueckgabe ist die aktualisierte Benutzerliste.

### 4) `maps duplicate repository error to BUSINESS_CONFLICT`
- Erwartung:
  - Duplicate-Fehler aus Repository wird auf `409 BUSINESS_CONFLICT` gemappt.

### Datei `tests/unit/auth/loginIdentifier.test.ts`

### 1) `authenticates by email identifier`
- Erwartung:
  - Login nutzt Identifier-Lookup.
  - Authentifizierung ueber E-Mail funktioniert.
  - Rueckgabe enthaelt korrekten User-Kontext.

### Datei `tests/integration/bootstrap/ensureSystemRoles.test.ts`

### 1) `creates ADMIN/READER/DISPATCHER when roles table is empty`
- Erwartung:
  - Nach leerer Rollen-Tabelle werden genau die drei Systemrollen angelegt.

### 2) `is idempotent when called repeatedly`
- Erwartung:
  - Mehrfaches Ausfuehren erzeugt keine Duplikate.
  - Rollenmenge bleibt stabil.

## Block UserSettings (Optimistic Locking)

### Datei `tests/unit/settings/settingsProvider.versioning.test.tsx`

### 1) `resolves version by selected scope`
- Erwartung:
  - Fuer `scopeType=USER` wird `userVersion` verwendet.
  - Fuer `scopeType=GLOBAL` wird `globalVersion` verwendet.

### 2) `falls back to version=1 when no persisted scope value exists`
- Erwartung:
  - Ohne gespeicherten Scope-Wert wird `version=1` gesetzt.

### 3) `retries once after VERSION_CONFLICT using refreshed version`
- Erwartung:
  - Erster Save mit alter Version kann `VERSION_CONFLICT` liefern.
  - Danach erfolgt genau ein Refetch und ein Retry mit neuer Version.

### 4) `detects VERSION_CONFLICT from error message`
- Erwartung:
  - Konflikt wird aus dem Fehlertext erkannt und als Retry-ausloesend behandelt.

### Datei `tests/unit/settings/userSettingsResolvedMapping.test.ts`

### 1) `maps scope versions and resolvedVersion for USER resolved values`
- Erwartung:
  - `getResolvedSettingsForUser` liefert `userVersion` und `resolvedVersion` fuer USER-aufgeloeste Werte.

### 2) `keeps version fields undefined when only default value resolves`
- Erwartung:
  - Bei DEFAULT-Aufloesung bleiben `globalVersion/roleVersion/userVersion/resolvedVersion` leer.

## Block TableLayout (Sticky Header)

### Datei `tests/unit/ui/tableView.stickyHeader.test.tsx`

### 1) `applies sticky header classes when stickyHeader=true`
- Erwartung:
  - Bei aktiviertem `stickyHeader` wird die Sticky-Klasse am Header gesetzt.
  - Die Klasse enthaelt `top-0` und einen Header-Hintergrund fuer stabile Ueberlagerung.

### 2) `does not apply sticky header classes when stickyHeader=false`
- Erwartung:
  - Ohne `stickyHeader` wird keine Sticky-Header-Klasse gerendert.

### 3) `keeps header alignment/base classes while sticky header is enabled`
- Erwartung:
  - Basis-Headerklassen (u. a. Alignment und Foreground) bleiben erhalten.
  - Sticky-Header-Aktivierung verursacht keine regressiven Klassenverluste.

## Datei `tests/integration/extraction/documentTextExtractor.fixture.test.ts`

### 1) `extracts text from fixture pdf (Gotthardt Anke 163214 AB)`
- Erwartung:
  - Test liest die Fixture-Datei aus `tests/fixtures/Gotthardt Anke 163214 AB.pdf`.
  - PDF-Text-Extraktion liefert nicht-leeren, verwertbaren Text.
  - Schluesselbegriffe (`Gotthardt`, `163214`, `Fasssauna.de`) sind im extrahierten Text enthalten.

## Warum diese Tests wichtig sind
- Sie sichern den Benutzer- und Auth-Flow gegen Berechtigungs-, Validierungs- und Konfliktfehler.
- Sie verankern die aktive Bedeutung der E-Mail im Login-Flow.
- Sie sichern die persistente View-Mode-Umschaltung in `Projekte`/`Kunden` gegen 422 und Versionskonflikte ab.
- Sie pruefen die UI-Stabilitaet der Tabellenansicht beim Scrollen ueber Sticky-Header-Verhalten.
- Sie stellen sicher, dass der Startup-Role-Seed reproduzierbar und idempotent bleibt.
