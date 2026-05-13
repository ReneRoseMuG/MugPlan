# Hilfetexte-, Import- und Export-Dialoge

Dialog-, Bestätigungs- und Meldungspfade für Hilfetexte, Hilfetext-Import/Export und allgemeine Import-/Export-Aktionen einheitlich strukturieren. Die Aufgabe ist Teil von P-01 Schritt 6 und richtet sich auf Hilfetextpflege, Hilfetext-Import/Export und allgemeine Importfehlermeldungen.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 08.05.26 |

---

## Ziel

Dialog-, Bestätigungs- und Meldungspfade für Hilfetexte, Hilfetext-Import/Export und allgemeine Import-/Export-Aktionen einheitlich strukturieren.

## Ausgangslage

Die Hilfetextanzeige war bereits für alle Rollen nutzbar, die Hilfetextverwaltung ist fachlich adminbezogen. Im Frontend waren Löschbestätigungen, Import-/Export-Dialoge und Importfehlermeldungen noch uneinheitlich umgesetzt. Zusätzlich fehlte für mehrere Hilfetext-Verwaltungsendpunkte eine ausdrückliche serverseitige Admin-Durchsetzung.

## Umfang

- Der Hilfetext-Löschpfad nutzt einen gemeinsamen Bestätigungsdialog statt eines nativen Browser-Confirm-Pfads.
- Hilfetext-Speichern, -Anlegen und -Löschen normalisieren Serverfehler und zeigen sie inline im Formularbereich.
- Der Hilfetext-Import-/Export-Dialog nutzt die gemeinsame Dialog-Shell und Inline-Meldungen für Vorschau-, Import- und Exportfehler.
- Allgemeine Mitarbeiter-Importfehler auf der Import-/Export-Seite werden normalisiert und inline sichtbar.
- Die Hilfetext-Verwaltungsendpunkte werden serverseitig auf `ADMIN` begrenzt; die aktive Hilfetextanzeige per Key bleibt für alle berechtigten App-Rollen nutzbar.
- Nicht Teil der Aufgabe sind neue Importformate, Schemaänderungen oder neue Hilfetext-Contracts.

## Umsetzungshinweise

- `ADMIN` darf Hilfetexte listen, anlegen, bearbeiten, aktivieren/deaktivieren, löschen, seed-lücken prüfen und importieren/exportieren.
- `DISPONENT` und `LESER` dürfen aktive Hilfetexte für UI-Anzeigezwecke abrufen, erhalten aber keine Verwaltungsrechte.
- Reine UI-Ausblendung reicht nicht; die Verwaltungsgrenze wird im Controller serverseitig geprüft.
- `client/src/components/HelpTextForm.tsx`
- `client/src/components/HelpTextsPage.tsx`
- `client/src/components/HelpTextsImportExportDialog.tsx`
- `client/src/components/ImportExportPage.tsx`
- `client/src/components/ui/help/help-icon.tsx`
- `client/src/components/ui/list-empty-state.tsx`
- `server/controllers/helpTextsController.ts`
- `tests/integration/server/helpTexts.import-export.uc16.integration.test.ts`

## Blocker und offene Fragen

Keine bekannt.

## Abschluss

- Abgeschlossen am: 09.05.26
- Ergebnis: Hilfetextformular und Hilfetext-Import-/Export-Pfade nutzen gemeinsame Dialog- und Inline-Fehlerstrukturen. Hilfetext-Verwaltungsendpunkte sind serverseitig auf `ADMIN` begrenzt; die aktive Hilfetextanzeige bleibt rollenübergreifend nutzbar.
- Automatisierte Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/helpTextsPage.behavior.test.tsx tests/unit/ui/helpTextsPage.formNavigation.wiring.test.tsx tests/unit/ui/helpTextsPage.seed.smoke.test.tsx tests/unit/ui/helpUi.behavior.test.tsx`; `npm run test:integration -- tests/integration/server/helpTexts.import-export.uc16.integration.test.ts tests/integration/server/helpTexts.seed-missing.ft28.integration.test.ts --reporter=verbose`; `npm run check:encoding`; `git diff --check`.
- App-Prüfung: Nutzerprüfung erfolgt anhand der Abschlussliste.
- Verwendete Testdaten: synthetische Hilfetext-Keys, Import-/Export-Payloads, Seed-Lücken und Rollen-Agents aus Unit- und Integrationsfixtures.
- Wiki-Build: `node scripts/build-wiki-site.mjs` am 09.05.26 mit 0 Fehlern und bestehenden Warnungsgruppen ausgeführt.
- Verbleibende Lücken: Keine bekannte technische Lücke für P-01 Schritt 6; manuelle Sichtprüfung der Import-/Export-Bedienpfade steht noch aus.
- Folgeaufgaben: Einstellungen-, Monitoring- und Admin-Dialoge wurden im selben Arbeitsgang umgesetzt.

---

## Beziehungen

- Features: [FT-16 - Hilfetexte verwalten](../../features/ft-16-hilfetexte-verwalten/ft-16-hilfetexte-verwalten.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md) · [Fehler-Normalisierung](fehler-normalisierung.md) · [Dialog-Basiskomponenten](dialog-basiskomponenten.md)
- Journal: [09.05.26 - P01: Tags, Hilfetexte und Admin-Dialoge abgeschlossen](../../journal/09-05-26-p01-tags-hilfetexte-admin-dialoge-abgeschlossen.md)
