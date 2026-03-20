# Gruppe F - Notes, Help, Settings, Stammdaten und sonstige schwache UI-Strukturtests

## 1. Bearbeitete Gruppe

- Name der Gruppe: Gruppe F - Notes, Help, Settings, Stammdaten und sonstige schwache UI-Strukturtests
- Betroffene Testdateien:
  - ersetzt durch neue Verhaltenstests:
    - `tests/unit/ui/helpUi.behavior.test.tsx`
    - `tests/unit/ui/helpTextsPage.behavior.test.tsx`
    - `tests/unit/ui/plusActionButton.behavior.test.tsx`
    - `tests/unit/ui/tagBadge.behavior.test.tsx`
    - `tests/unit/ui/tagPickerPanel.behavior.test.tsx`
    - `tests/unit/ui/settingsPage.behavior.test.tsx`
    - `tests/unit/ui/sidebar.behavior.test.tsx`
    - `tests/unit/ui/monitoringPage.behavior.test.tsx`
    - `tests/unit/ui/toaster.behavior.test.tsx`
  - entfernt:
    - `tests/unit/ui/helpIcon.emptyBodyFallback.wiring.test.tsx`
    - `tests/unit/ui/helpIcon.fallbackKey.wiring.test.tsx`
    - `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx`
    - `tests/unit/ui/helpTextsPage.seed.wiring.test.tsx`
    - `tests/unit/ui/helpTextsPage.versioning.test.tsx`
    - `tests/unit/ui/listEmptyState.helpFallback.wiring.test.tsx`
    - `tests/unit/ui/listLayouts.emptyStateHelpKeys.wiring.test.ts`
    - `tests/unit/ui/login.quickLoginVisibility.wiring.test.ts`
    - `tests/unit/ui/masterDataSeed.wiring.test.tsx`
    - `tests/unit/ui/monitoringNavigation.wiring.test.ts`
    - `tests/unit/ui/monitoringPage.configDraft.wiring.test.ts`
    - `tests/unit/ui/noteTemplates.cardColorPrint.wiring.test.tsx`
    - `tests/unit/ui/noteTemplatesPage.versioning.test.tsx`
    - `tests/unit/ui/notesSection.cardColorPrint.wiring.test.tsx`
    - `tests/unit/ui/plusActionButton.ui.test.tsx`
    - `tests/unit/ui/plusActionButton.wiring.usages.test.ts`
    - `tests/unit/ui/productManagementPage.categoryImport.wiring.test.tsx`
    - `tests/unit/ui/productManagementPage.filters.wiring.test.tsx`
    - `tests/unit/ui/reportsPage.wiring.test.tsx`
    - `tests/unit/ui/settingsPage.backup.wiring.test.ts`
    - `tests/unit/ui/settingsPage.helpTextPreviewSize.wiring.test.ts`
    - `tests/unit/ui/settingsPage.twoFactor.wiring.test.ts`
    - `tests/unit/ui/sidebar.backupDisabled.wiring.test.ts`
    - `tests/unit/ui/tagBadge.ui.test.tsx`
    - `tests/unit/ui/tagManagementPage.systemTagProtection.wiring.test.ts`
    - `tests/unit/ui/tagPickerPanel.wiring.test.tsx`
    - `tests/unit/ui/toaster.toastDesktopPosition.wiring.test.ts`
- Fachlicher Fokus:
  - sichtbare Help-/Empty-State-, Tag-, Settings-, Sidebar-, Monitoring- und Toast-Verhalten absichern
  - Quelltext- und Literal-Scheinsicherheit in diesem Sammelblock gezielt abbauen

## 2. Durchgefuehrte Aenderungen

- Beibehalten:
  - keine der urspruenglichen Source-Tests dieser Gruppe
- Ersetzt:
  - HelpIcon und ListEmptyState durch echte Render-/Fallback-Tests
  - HelpTextsPage durch sichtbare Board-/Table-Verhaltenstests fuer Key-Anzeige, Edit-Doppelklick und Empty-State
  - PlusActionButton durch beobachtbare Button-Prop-Tests
  - TagBadge und TagPickerPanel durch sichtbare Badge-/Panel- und Callback-Tests
  - SettingsPage, Sidebar, MonitoringPage und Toaster durch sichtbare UI-Verhaltenstests statt Quelltextsuche
- Geloescht:
  - alle verbleibenden reinen Source-String-/Markup-/`readFileSync`-Tests der Gruppe F
- Neue oder ergaenzte Verhaltenstests:
  - `helpUi.behavior`
  - `helpTextsPage.behavior`
  - `plusActionButton.behavior`
  - `tagBadge.behavior`
  - `tagPickerPanel.behavior`
  - `settingsPage.behavior`
  - `sidebar.behavior`
  - `monitoringPage.behavior`
  - `toaster.behavior`

## 3. Fachliche Verbesserung

- Welches echte Verhalten jetzt geprueft wird:
  - HelpIcon blendet sich bei fehlendem oder leerem Inhalt aus und nutzt sichtbare Preview-Groessen
  - ListEmptyState zeigt echte Help-Fallbacks statt interner Keys
  - HelpTextsPage zeigt HelpKeys sichtbar, nutzt den richtigen Empty-State und leitet Edit-Doppelklicks weiter
  - PlusActionButton, TagBadge und TagPickerPanel pruefen sichtbare Button-/Badge-/Panel-Props und echte Add/Remove-Callbacks
  - SettingsPage zeigt sichtbare Save-Controls und den Backup-Bereich
  - Sidebar zeigt rollenabhaengige Reports-/Monitoring-Navigation und sichtbares Backup-Disablement
  - MonitoringPage zeigt den Admin-Konfigbereich und leitet Row-Oeffnungen weiter
  - Toaster und ToastViewport pruefen beobachtbare Positionsweitergabe und Desktop-Eckenklassen
- Welche fruehere Scheinsicherheit entfernt wurde:
  - Assertions auf Quelltext, Imports, JSX-Fragmente, Literale, `readFileSync` und nicht-gerenderte Handler wurden entfernt
  - breit gestreute UI-Strukturtests konservieren nicht mehr bloßes Implementation-Wiring
- Welche Luecken innerhalb der Gruppe weiterhin bestehen:
  - kein sauberer kleiner Verhaltenstest fuer den HelpTexts-Auto-Seed aus `useEffect`, fuer die HelpTexts-/NoteTemplates-Versionkonflikt-Toasts, fuer den globalen Quick-Login-2FA-Vorab-Flow und fuer die UI-spezifischen Produkt-/Seed-/Report-/System-Tag-Strukturpfade
  - diese Faelle bleiben fachlich offen, weil sie ohne deutlich groesseren Laufzeit-/Browser-Harness oder ohne Scope-Ausweitung auf viele benachbarte UI-Komponenten nicht sauber klein und verhaltensorientiert testbar waren

## 4. Testergebnis

- Ausgefuehrte betroffene Tests:
  - `npm run test:unit -- tests/unit/ui/helpUi.behavior.test.tsx tests/unit/ui/helpTextsPage.behavior.test.tsx tests/unit/ui/plusActionButton.behavior.test.tsx tests/unit/ui/tagBadge.behavior.test.tsx tests/unit/ui/tagPickerPanel.behavior.test.tsx tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/sidebar.behavior.test.tsx tests/unit/ui/monitoringPage.behavior.test.tsx tests/unit/ui/toaster.behavior.test.tsx`
- Gruen:
  - alle 9 Testdateien
  - insgesamt 17/17 Tests erfolgreich
- Fehlschlaege:
  - keine

## 5. Offene Blocker

- `HelpTextsPage` Auto-Seed beim Mount waere fachlich sinnvoll als Verhaltenstest, laeuft aber ueber `useEffect` und Query-/Toast-Nebenwirkungen, die ohne browsernaehere Laufzeitumgebung hier nicht klein genug testbar sind.
- UI-spezifische Konflikt-/Toast-Mappings in `HelpTextsPage`, `NoteTemplatesPage` und `NotesSection` waeren sinnvoll, brauchen aber deutlich groessere Dialog-/Mutation-Harnesses.
- `Login`-Quick-Login-Sichtbarkeit bei globaler 2FA braucht einen verhaltensstabilen Effekt-/Async-Harness fuer den Setup-Status.
- `ProductManagementPage`, `MasterDataSeedPage`, `ReportsPage` und die System-Tag-Verwaltung haben weiterhin starke Server-/Integrationsabdeckung, aber in dieser Gruppe keinen kleinen neuen UI-Verhaltenstest mehr.
