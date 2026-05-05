# 05.05.26 | UI-Fix | FT-02: Projekt-Hover-Preview-Höhe

## Zusammenfassung

Die Projekt-Hover-Preview in der Projekt-Tabellenansicht wird wieder ohne festen Scrollcontainer angezeigt. Das Project Panel innerhalb der Preview ist in diesem Tabellenkontext vollständig expandiert.

## Art der Änderung

Kleiner lokaler UI-Fix in der bestehenden Projektlisten- und Preview-Struktur. Es wurden keine Backend-Contracts, Datenmodelle, API-Endpunkte, Persistenzpfade oder Rollenregeln geändert.

## Betroffene Features

- FT-02: Projekte
- Projektliste: Tabellenansicht und Hover-Preview

Ein belastbarer Notion-Link wurde im Auftrag nicht verwendet.

## Konkrete Änderungen

- Die Projekt-Tabellenpreview gibt in `ProjectsPage` jetzt explizit `maxHeight: null` und `scrollY: "visible"` an, damit `TableView` keinen festen Preview-Scrollcontainer setzt.
- `ProjectEntityCard` kann das Project Panel je Kontext kompakt oder vollständig expandiert rendern.
- `ProjectTableHoverPreview` fordert für die Projekt-Tabellenansicht das vollständig expandierte Project Panel an.
- Die vorhandenen Unit-Tests wurden erweitert, damit Preview-Optionen und nicht-kompaktes Project Panel regressionssicher geprüft werden.

## Rollen

Keine Änderung an Rollen oder Berechtigungen.

- Sichtbarkeit und Bedienbarkeit der Projektliste bleiben unverändert.
- Die Änderung betrifft ausschließlich Layout und Höhe der bestehenden Tabellen-Hover-Preview.
- Es wurden keine Endpunkte, Mutationen, Deep Links oder Berechtigungsprüfungen geändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/projectsTable.preview.test.tsx tests/unit/ui/tableEntityCardPreviews.render.test.tsx tests/unit/ui/projectInfoPanel.render.test.tsx`
- `npm run typecheck`

## Offene Punkte

- Kein Browser-Screenshot wurde nachgezogen.
- Die Ursache wurde als indirekte UI-Regression aus der generischen Tabellen-Preview-Verdrahtung eingegrenzt.
