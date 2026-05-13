# Benutzer- und Sicherheitsdialoge

Dialog-, Bestätigungs- und Meldungspfade für Benutzerverwaltung, 2FA-nahe Aktionen, Login und initiale Einrichtung einheitlich strukturieren. Der Schritt bündelt die kleine Zahl vorhandener Benutzerverwaltungsdialoge mit den sicherheitsnahen Inline-Meldungen aus Anmeldung, Schnelllogin, 2FA und Admin-Ersteinrichtung.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Benutzerverwaltung, 2FA-nahe Aktionen, Login und initiale Einrichtung einheitlich strukturieren. Die Umsetzung soll vorhandene sicherheitsnahe Pfade vereinheitlichen, ohne Authentifizierung, Rollenregeln oder 2FA-Fachlogik fachlich umzudeuten.

## Ausgangslage

Die Benutzerverwaltung enthält zwei echte modale Dialoge zum Anlegen und Bearbeiten von Benutzern sowie einen nativen Browser-Bestätigungspfad für den 2FA-Reset. Login und initiales Admin-Setup enthalten derzeit keine modalen Dialoge, sondern Formularschritte und Inline-Meldungen für Passwortanmeldung, Schnelllogin, 2FA-Einrichtung, 2FA-Prüfung und Setup-Fehler. Die Benutzerverwaltung ist ein Admin-only-Bereich; diese serverseitige Begrenzung darf durch den Dialog-Rollout nicht verändert oder nur frontendseitig nachgebaut werden.

## Umfang

- Benutzer-Anlagedialog und Benutzer-Bearbeitungsdialog in der Benutzerverwaltung auf die gemeinsame Dialogbasis des P-01-Rollouts ausrichten.
- Native Browser-Bestätigung für den 2FA-Reset durch einen gemeinsamen Bestätigungsdialog ersetzen.
- Lade-, Anlage-, Bearbeitungs- und 2FA-Reset-Fehler in der Benutzerverwaltung als verständliche Inline-Meldungen im jeweiligen Kontext anzeigen.
- Login-Meldungen für Passwortanmeldung, Schnelllogin, 2FA-Einrichtung und 2FA-Prüfung sprachlich und strukturell vereinheitlichen.
- Admin-Setup-Meldungen für fehlende Eingaben, ungültige Eingaben und bereits abgeschlossenes Setup verständlich halten.
- Sichtbarkeit und Ausführung der Benutzerverwaltung bleiben `ADMIN` vorbehalten; direkte API-Aufrufe für Benutzerlisten, Benutzeranlage, Benutzerbearbeitung und 2FA-Reset müssen weiterhin serverseitig abgewiesen werden, wenn die Rolle nicht zulässig ist.
- Nicht Teil der Aufgabe sind neue Authentifizierungsabläufe, neue Rollen, Änderungen an Passwortregeln, Änderungen an der globalen 2FA-Policy, API-Contract-Änderungen, Schemaänderungen oder eine fachliche Neudefinition der Admin-only-Grenze.

## Umsetzungshinweise

- `client/src/components/UsersPage.tsx` enthielt die beiden Benutzerverwaltungsdialoge, den bisherigen `window.confirm` für den 2FA-Reset sowie Inline-Fehler unter der Tabelle und in den Dialogen.
- `client/src/pages/Login.tsx` enthält keine modalen Dialoge, aber Passwort-, Schnelllogin- und 2FA-Schritte mit mehreren Inline-Meldungen.
- `client/src/pages/AdminSetup.tsx` enthält keinen modalen Dialog, aber den initialen Setup-Formularpfad mit Inline-Meldungen.
- Bestehende P-01-Bausteine wie `DialogBaseShell`, `DialogBaseFooter`, `ConfirmDialogBase` und `DialogBaseInlineMessage` bevorzugen, statt neue Dialogmuster einzuführen.
- Rollenprüfung: Benutzerverwaltungsaktionen sind nur für `ADMIN` sichtbar und ausführbar. `DISPONENT` und `READER` dürfen diese Aktionen weder über UI noch über direkte API-Aufrufe ausführen.
- Technische Durchsetzung: Die Benutzer-Endpunkte laufen serverseitig über den bestehenden Benutzer-Service mit Admin-Prüfung. Diese Durchsetzung bleibt maßgeblich; UI-Ausblendung allein ist nicht ausreichend.
- Login und Admin-Setup sind unauthentifizierte beziehungsweise initiale Sicherheitsflächen. Dort keine Admin-only-Regel nachbauen, sondern nur die vorhandenen Auth- und Setup-Antworten verständlich anzeigen.
- Erwartete Verifikation laut P-01-Projektseite: `npm run test:unit -- tests/unit/auth/twoFactorFlow.test.ts tests/unit/auth/quickLogin.test.ts tests/unit/auth/loginIdentifier.test.ts tests/unit/authorization/roleGuards.test.ts tests/unit/authorization/userCreate.test.ts`; `npm run test:integration -- tests/integration/server/auth.session.integration.test.ts tests/integration/server/auth.two-factor.integration.test.ts tests/integration/server/users.two-factor-admin.integration.test.ts --reporter=verbose`; Browser: `npm run test:e2e:browser -- tests/e2e-browser/users-management-scroll.browser.e2e.spec.ts`.

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 11.05.26
- Ergebnis: Benutzeranlage und Benutzerbearbeitung nutzen die gemeinsame Dialogbasis mit standardisiertem Footer. Der 2FA-Reset nutzt einen kontrollierten Bestätigungsdialog statt `window.confirm`. Login, Schnelllogin, 2FA-Schritte und Admin-Setup zeigen gemeinsame Inline-Meldungen.
- Automatisierte Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/usersPage.dialogs.test.tsx tests/unit/ui/dialogBaseComponents.test.tsx tests/unit/auth/twoFactorFlow.test.ts tests/unit/auth/quickLogin.test.ts tests/unit/auth/loginIdentifier.test.ts tests/unit/authorization/roleGuards.test.ts tests/unit/authorization/userCreate.test.ts`; `npm run test:integration -- tests/integration/server/auth.session.integration.test.ts tests/integration/server/auth.two-factor.integration.test.ts tests/integration/server/users.two-factor-admin.integration.test.ts --reporter=verbose`; `npm run test:e2e:browser -- tests/e2e-browser/users-management-scroll.browser.e2e.spec.ts`; `npm run check:encoding`; `git diff --check`.
- App-Prüfung: Browser-E2E prüft die Benutzerverwaltung, den Scrollpfad sowie die sichtbaren Dialoge für Benutzeranlage, Benutzerbearbeitung und 2FA-Reset.
- Verwendete Testdaten: synthetische Benutzer `browser-scroll-user-<batch>-<suffix>`, Auth-/Rollen-Agents aus Unit- und Integrationstests sowie bestehende Test-Isolation über `.env.test`.
- Rollen: `ADMIN` sieht und bedient die Benutzerverwaltung. `DISPONENT` und `READER` dürfen Benutzerlisten, Benutzeranlage, Benutzerbearbeitung und 2FA-Reset weiterhin nicht über direkte API-Aufrufe ausführen; die serverseitige Admin-Prüfung blieb unverändert.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 11.05.26 mit 0 Fehlern ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für diesen P-01-Schritt.
- Folgeaufgaben: Keine für diesen P-01-Schritt.

---

## Beziehungen

- Features: [FT-14 - Benutzer- und Rollenverwaltung](../../features/ft-14-benutzer-und-rollenverwaltung/ft-14-benutzer-und-rollenverwaltung.md) · [FT-20 - Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung](../../features/ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung/ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [11.05.26 - P01: Benutzer- und Sicherheitsdialoge abgeschlossen](../../journal/11-05-26-p01-benutzer-sicherheitsdialoge-abgeschlossen.md)
