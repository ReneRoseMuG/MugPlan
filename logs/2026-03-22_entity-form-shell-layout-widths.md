# EntityFormShell Vollbreite und User-Breiten

## Zweck

Generisches Vollbreiten-Layout der `EntityFormShell` fuer breite Monitore umsetzen, ohne fachliche Formularlogik zu aendern. Header und Footer bleiben sticky ueber die volle Breite sichtbar, die Sidebar ist rechts angedockt und separat scrollbar, der Hauptinhalt liegt in einem zentrierten Container mit benutzerspezifisch konfigurierbarer Maximalbreite.

## Scope

- `client/src/components/ui/entity-form-shell.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/SettingsPage.tsx`
- `client/src/hooks/useSettings.ts`
- `server/settings/registry.ts`
- `tests/unit/ui/entityFormShell.layout.test.tsx`
- `tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx`
- `tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx`
- `tests/unit/ui/settingsPage.behavior.test.tsx`
- `tests/unit/settings/useSettings.entityFormShellWidths.test.ts`
- `tests/unit/settings/entityFormShellWidths.registry.test.ts`
- `tests/unit/settings/userSettingsResolvedMapping.test.ts`
- `docs/TEST_MATRIX.md`

## Technische Entscheidungen

- Neue USER-Settings eingefuehrt:
  - `entityFormShell.sidebarWidthPx`
  - `entityFormShell.contentMaxWidthPx`
- Defaults:
  - Sidebar `360`
  - Content-Maximalbreite `760`
- Validierungsgrenzen:
  - Sidebar `260..480`
  - Content `640..1100`
- `EntityFormShell` liest standardmaessig die USER-Settings; explizite Props uebersteuern die Settings weiterhin.
- Der bisherige farbige Sidebar-Akzent wurde durch eine neutrale rechte Trennung ersetzt.
- `AppointmentForm` nutzt die generische Shell ohne hartcodierte Sidebar-Breite und behaelt die volle Sidebar sowohl im Create- als auch im Edit-Modus.
- Der Footer des `AppointmentForm` wurde nur visuell in links/rechts getrennte Aktionszonen ueberfuehrt; die bestehende Save-/Cancel-/Delete-Logik blieb unveraendert.

## Tests

Ausgefuehrt:

- `npm test -- tests/unit/ui/entityFormShell.layout.test.tsx tests/unit/settings/useSettings.entityFormShellWidths.test.ts tests/unit/settings/entityFormShellWidths.registry.test.ts tests/unit/settings/userSettingsResolvedMapping.test.ts tests/unit/ui/settingsPage.behavior.test.tsx tests/unit/ui/appointmentForm.layoutTourIntegration.test.tsx tests/unit/ui/appointmentForm.overlayBack.behavior.test.tsx tests/unit/ui/appointmentForm.readOnlyModes.wiring.test.tsx`
- `npm run check`

## Bekannte Einschraenkungen

- In diesem Schritt wurde nur `AppointmentForm` auf das erweiterte generische Shell-Verhalten ausgerichtet.
- Es wurde kein voller Audit und kein voller Testlauf ausgefuehrt.
- Weitere Formulare koennen die neuen USER-Breiten kuenftig ohne erneute Shell-Anpassung uebernehmen, wurden hier aber bewusst nicht migriert.
