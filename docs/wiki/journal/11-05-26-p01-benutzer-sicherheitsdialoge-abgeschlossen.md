# 11.05.26 | Abschluss | P01 Benutzer- und Sicherheitsdialoge

## Zusammenfassung

Der P-01-Schritt Benutzer- und Sicherheitsdialoge ist technisch umgesetzt und als Wiki-Aufgabe abgeschlossen. Benutzeranlage und Benutzerbearbeitung nutzen die gemeinsame Dialogbasis, der 2FA-Reset läuft über einen kontrollierten Bestätigungsdialog, und die sicherheitsnahen Login-, Schnelllogin-, 2FA- und Admin-Setup-Meldungen sind auf die gemeinsame Inline-Meldungsstruktur ausgerichtet.

## Verifikation

- Typecheck: `npm run typecheck` erfolgreich.
- Unit-Tests: `npm run test:unit -- tests/unit/ui/usersPage.dialogs.test.tsx tests/unit/ui/dialogBaseComponents.test.tsx tests/unit/auth/twoFactorFlow.test.ts tests/unit/auth/quickLogin.test.ts tests/unit/auth/loginIdentifier.test.ts tests/unit/authorization/roleGuards.test.ts tests/unit/authorization/userCreate.test.ts` erfolgreich mit 30 bestandenen Tests in 7 Dateien.
- Integrationstests: `npm run test:integration -- tests/integration/server/auth.session.integration.test.ts tests/integration/server/auth.two-factor.integration.test.ts tests/integration/server/users.two-factor-admin.integration.test.ts --reporter=verbose` erfolgreich mit 10 bestandenen Tests in 3 Dateien.
- Browser-E2E: `npm run test:e2e:browser -- tests/e2e-browser/users-management-scroll.browser.e2e.spec.ts` erfolgreich mit 2 bestandenen Tests.
- Encoding: `npm run check:encoding` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 11.05.26 erfolgreich.

## Rollen

- `ADMIN` darf die Benutzerverwaltung sehen und Benutzer anlegen, bearbeiten, Rollen ändern, Aktivstatus ändern, optionale Passwortänderungen setzen und benutzerspezifische 2FA-Zustände zurücksetzen.
- `DISPONENT` darf keine Benutzerlisten, Benutzeranlage, Benutzerbearbeitung, Rollenänderung oder 2FA-Reset ausführen.
- `READER` darf keine Benutzerlisten, Benutzeranlage, Benutzerbearbeitung, Rollenänderung oder 2FA-Reset ausführen.
- Die serverseitigen Benutzer-Service-Guards bleiben die verbindliche Durchsetzung. UI-Sichtbarkeit und Dialoge dienen nur der Benutzerführung.
- Login und Admin-Setup bleiben unauthentifizierte beziehungsweise initiale Sicherheitsflächen und bauen keine eigene Rollenlogik nach.

## Verknüpfungen

- Aufgabe: [Benutzer- und Sicherheitsdialoge](../tasks/closed/benutzer-und-sicherheit-dialoge.md)
- Projekt: [P01 Dialog-Rollout](../projects/dialog-rollout.md)
