# SaunalistenImport Entfernung

## Zweck

Vollständige Entfernung der Admin-Funktion "SaunalistenImport" inklusive UI, Backend-Pfad, Contracts, Tests, Dokumentation und der dafür ausschließlich verwendeten Bibliothek `xlsx`.

## Scope

- Entfernt wurden die Admin-API-Contracts für die Sauna-Tour-Preview aus `shared/routes.ts`.
- Entfernt wurden Route-, Controller- und Service-Pfad für die Funktion im Server.
- Entfernt wurde die UI-Einbindung in der Settings-Seite sowie das eigenständige Preview-Panel.
- Entfernt wurden die dedizierten Unit-Tests für Service und UI-Verdrahtung.
- Bereinigt wurden Architektur-/Implementierungsdokumentation und `docs/TEST_MATRIX.md`.
- Entfernt wurde die Abhängigkeit `xlsx` aus Paketdateien.

## Technische Entscheidungen

- `exceljs` wurde nicht entfernt, weil es weiterhin von Backup-/Export-Funktionen verwendet wird.
- Es wurden keine Datenbank- oder Migrationsänderungen vorgenommen, da die entfernte Funktion nur Preview-/Session-Logik im Prozessspeicher genutzt hat.
- Die Entfernung erfolgte entlang der bestehenden Schichten: Contract -> Route -> Controller -> Service -> UI/Test/Doku.

## Betroffene Dateien

- `shared/routes.ts`
- `server/routes/adminBulkImportRoutes.ts`
- `client/src/components/SettingsPage.tsx`
- `docs/architecture.md`
- `docs/implementation.md`
- `docs/TEST_MATRIX.md`
- `package.json`
- `package-lock.json`

Entfernte Dateien:

- `server/controllers/adminSaunaTourImportController.ts`
- `server/services/saunaTourPreviewService.ts`
- `client/src/components/settings/SaunaTourImportPreviewPanel.tsx`
- `tests/unit/services/saunaTourPreviewService.test.ts`
- `tests/unit/ui/settingsPage.saunaTourImport.wiring.test.ts`

## Testen

Ausgeführt:

- `npm run check`

Ergebnis:

- erfolgreich

Zusätzlich geprüft:

- Referenzsuche auf entfernte Feature-Namen und Contracts
- Verbleibende `.xlsx`-Verwendungen gehören nur noch zu Backup-/Export-Code

## Bekannte Einschränkungen

- Kein voller Testlauf und kein voller Audit wurden ausgeführt.
- `production` wurde durch diese Aufgabe nicht berührt.
