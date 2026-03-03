# Log: HelpTexts Fullscreen-Form, Preview-Size und Icon-Sichtbarkeit

## Zweck
Umsetzung der angefragten HelpText-Änderungen: Fullscreen-Bearbeitungsformular statt Dialog, Kartenlayout-Anpassung, neue User-Setting-Steuerung für HelpText-Preview-Größen sowie restriktivere HelpIcon-Sichtbarkeit.

## Scope
- HelpText-Bearbeitung auf eigenes Fullscreen-Formular umgestellt (basierend auf `EntityFormLayout`).
- HelpTexts-Listenansicht als reine Übersicht belassen (keine Dialog-Bearbeitung mehr).
- HelpText-Boardansicht auf mindestens 3 Spalten begrenzt (nur für HelpTexts).
- `Aktualisiert`-Zeile aus HelpText-Karten entfernt.
- Neues USER-Setting `helpTextPreviewSize` (`small|medium|large`) eingeführt.
- Preview-Größensteuerung auf HelpIcon-Popover und HelpTexts-Tabellen-Preview angewendet.
- HelpIcon wird nur angezeigt, wenn ein passender Hilfetext mit nicht-leerem Body vorhanden ist.

## Technische Entscheidungen
- Navigation analog bestehender Formular-Patterns über `Home`-View-State (`helpTexts` -> `helpTextForm`).
- Neues Formular als eigene Komponente (`HelpTextForm`) statt Inline-/Dialog-Lösung.
- Bestehende Versionierungslogik (`version`, `VERSION_CONFLICT`) beibehalten.
- Board-Spaltenuntergrenze generisch in `BoardView` ergänzt, aber nur in HelpTexts genutzt (`dynamicMinCols={3}`).
- Neues Setting Contract-/Resolver-konform über bestehende Settings-Registry eingebracht.

## Betroffene Dateien
- `client/src/components/HelpTextForm.tsx` (neu)
- `client/src/components/HelpTextsPage.tsx`
- `client/src/components/ui/help/help-icon.tsx`
- `client/src/components/ui/board-view.tsx`
- `client/src/components/SettingsPage.tsx`
- `client/src/hooks/useSettings.ts`
- `client/src/pages/Home.tsx`
- `server/settings/registry.ts`
- `tests/unit/ui/helpTextsPage.versioning.test.tsx`
- `tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx` (neu)
- `tests/unit/ui/helpIcon.fallbackKey.wiring.test.tsx`
- `tests/unit/ui/helpIcon.emptyBodyFallback.wiring.test.tsx`
- `tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `tests/unit/settings/useSettings.helpTextPreviewSize.test.ts` (neu)
- `tests/unit/ui/settingsPage.helpTextPreviewSize.wiring.test.ts` (neu)
- `docs/TEST_MATRIX.md`

## Hinweise zum Testen
- Durchgeführt:
  - `npm run typecheck` (erfolgreich)
- Nicht durchgeführt:
  - `npm run check` vollständig grün, da vorbestehende Encoding-Funde in `docs/Alle Features.md` den Lauf abbrechen.

## Bekannte Einschränkungen
- `npm run check` scheitert aktuell an vorhandenen Mojibake-Einträgen in `docs/Alle Features.md`, die nicht Teil dieses Scopes waren.
- HelpIcon ist bei fehlendem/leerem Inhalt vollständig ausgeblendet; der frühere textuelle Fallback wird nicht mehr angezeigt.
