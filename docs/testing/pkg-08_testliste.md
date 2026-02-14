# PKG-08 Testliste

## Ziel von PKG-08
PKG-08 deckt Benutzerverwaltung und Auth-Erweiterung ab:

1. Admin kann neue Benutzer anlegen.
2. Validierung und Berechtigung fuer Benutzeranlage greifen korrekt.
3. Login funktioniert mit Benutzername **oder** E-Mail.
4. Role-Seed bleibt idempotent und stellt Systemrollen sicher.

## Abdeckungsuebersicht
- Datei `tests/unit/authorization/userCreate.test.ts`: 4 Unit-Tests
- Datei `tests/unit/auth/loginIdentifier.test.ts`: 1 Unit-Test
- Datei `tests/integration/extraction/documentTextExtractor.fixture.test.ts`: 1 Integrationstest (Fixture-PDF)
- Datei `tests/integration/bootstrap/ensureSystemRoles.test.ts`: 2 Integrationstests

## Datei `tests/unit/authorization/userCreate.test.ts`

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

## Datei `tests/unit/auth/loginIdentifier.test.ts`

### 1) `authenticates by email identifier`
- Erwartung:
  - Login nutzt Identifier-Lookup.
  - Authentifizierung ueber E-Mail funktioniert.
  - Rueckgabe enthaelt korrekten User-Kontext.

## Datei `tests/integration/bootstrap/ensureSystemRoles.test.ts`

### 1) `creates ADMIN/READER/DISPATCHER when roles table is empty`
- Erwartung:
  - Nach leerer Rollen-Tabelle werden genau die drei Systemrollen angelegt.

### 2) `is idempotent when called repeatedly`
- Erwartung:
  - Mehrfaches Ausfuehren erzeugt keine Duplikate.
  - Rollenmenge bleibt stabil.

## Datei `tests/integration/extraction/documentTextExtractor.fixture.test.ts`

### 1) `extracts text from fixture pdf (Gotthardt Anke 163214 AB)`
- Erwartung:
  - Test liest die Fixture-Datei aus `tests/fixtures/Gotthardt Anke 163214 AB.pdf`.
  - PDF-Text-Extraktion liefert nicht-leeren, verwertbaren Text.
  - Schluesselbegriffe (`Gotthardt`, `163214`, `Fasssauna.de`) sind im extrahierten Text enthalten.

## Warum diese Tests wichtig sind
- Sie sichern den neuen User-Creation-Flow gegen Berechtigungs- und Validierungsfehler.
- Sie verankern die aktive Bedeutung der E-Mail im Login-Flow.
- Sie stellen sicher, dass der Startup-Role-Seed reproduzierbar und idempotent bleibt.
