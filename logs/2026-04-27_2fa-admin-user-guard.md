# Auftragslog: 2FA-Aktivierung, Admin-Benutzerbearbeitung und Reset-Absicherung

## Zweck

Absicherung des 2FA-Loginflusses gegen inkonsistente Benutzerzustände, Ergänzung eines Admin-tauglichen 2FA-Resets pro Benutzer und Vervollständigung der Admin-Benutzerbearbeitung in der bestehenden Benutzerverwaltung.

## Scope

Im Scope:
- Authentifizierung und 2FA-Loginentscheidungen
- Admin-Reset für benutzerspezifischen 2FA-Zustand
- Admin-Bearbeitung bestehender Benutzer inklusive Passwortänderung
- zugehörige Unit- und Integrationstests
- technische Kurznotiz zur 2FA-Logik

Nicht im Scope:
- neue Rollenmodelle
- Einführung fertiger Backup-Codes
- allgemeines UI-Redesign
- Schemaänderungen oder Migrationen

## Technische Entscheidungen

- `auth_two_factor_enabled` bleibt ein globaler Pflicht-/Aktivierungsschalter und ersetzt kein bestätigtes Benutzer-Secret.
- Ein fehlendes oder technisch unlesbares `two_factor_secret_encrypted` führt beim Login in `2fa_setup_required` statt in einen unauflösbaren Verify-Zustand.
- Ein neues Secret wird weiterhin erst nach erfolgreicher TOTP-Bestätigung dauerhaft gespeichert.
- Der Admin-Reset löscht ausschließlich:
  - `users.two_factor_secret_encrypted`
  - `users.two_factor_backup_codes_reserved`
- Der letzte aktive Admin wird zusätzlich geschützt gegen:
  - Deaktivierung
  - Self-2FA-Reset bei global aktivierter 2FA ohne weiteren aktiven Admin
- Die bestehende Benutzerbearbeitung wurde nicht als neue Parallelfunktion ergänzt, sondern der vorhandene Update-Pfad wurde auf vollständige Admin-Bearbeitung erweitert.
- Bestehende Benutzer können jetzt optional auch ein neues Passwort erhalten; leer bedeutet unverändert, gesetzt bedeutet serverseitiges Re-Hashing über den bestehenden Passwort-Hashing-Pfad.

## Betroffene Dateien

- `shared/routes.ts`
- `server/services/authService.ts`
- `server/services/usersService.ts`
- `server/repositories/usersRepository.ts`
- `server/controllers/usersController.ts`
- `server/routes/usersRoutes.ts`
- `client/src/components/UsersPage.tsx`
- `tests/unit/auth/twoFactorFlow.test.ts`
- `tests/unit/authorization/roleGuards.test.ts`
- `tests/integration/server/users.two-factor-admin.integration.test.ts`
- `logs/2026-04-27_2fa-admin-reset-users.md`

## Hinweise zum Testen

Erfolgreich ausgeführt:
- `npm run typecheck`
- `npx vitest run tests/unit/auth/twoFactorFlow.test.ts tests/unit/authorization/roleGuards.test.ts tests/unit/authorization/userCreate.test.ts`
- `npx vitest run --reporter=verbose tests/integration/server/auth.two-factor.integration.test.ts tests/integration/server/users.two-factor-admin.integration.test.ts`
- `npm run check`

Die neuen fachlichen Nachweise decken insbesondere ab:
- Login ohne 2FA bei global deaktivierter 2FA
- Setup-Fallback bei fehlendem oder defektem Secret
- Admin-Reset ohne Passwort- oder Rollenänderung
- Admin-Bearbeitung bestehender Benutzer inklusive Passwortänderung
- keine neuen Verwaltungsrechte für Nicht-Admins

## Bekannte Einschränkungen

- Backup-Codes sind weiterhin kein fertiger produktiver Flow; es existiert nur die reservierte Spalte.
- Es wurde keine zusätzliche Browser-E2E für die neue Benutzerbearbeitung ergänzt.
- Eine Migration war nicht erforderlich, weil alle benötigten Felder bereits vorhanden waren.
