# Projekt-Hover-Preview-Höhe

## Datum

05.05.26

## Zweck

Die Projekt-Hover-Preview in der Projekt-Tabellenansicht wurde zuletzt in einem festen, scrollenden Container angezeigt. Ziel war, die Preview wieder in voller Inhaltshöhe zu rendern und das Project Panel innerhalb der Tabellenpreview vollständig expandiert darzustellen.

## Scope

- Kleiner lokaler Frontend-Fix in der bestehenden Projektlisten- und Preview-Struktur.
- Keine Änderung an Backend, Contracts, Datenmodell, Persistenz oder Rollenlogik.
- Keine Änderung an Projekt-Boardkarten außerhalb der gezielten Kontextsteuerung für das Project Panel.

## Technische Entscheidungen

- Die Projekt-Tabellenpreview verwendet weiterhin den bestehenden `ProjectTableHoverPreview`-Einstieg.
- `ProjectsPage` gibt für die Tabellenpreview jetzt explizite Preview-Optionen zurück, damit der generische `TableView`-Fallback keine feste Maximalhöhe und keinen Scrollcontainer erzwingt.
- `ProjectEntityCard` erhielt eine optionale Steuerung für das kompakte Project Panel. Der Default bleibt kompakt, damit bestehende Kartenansichten nicht unbeabsichtigt wachsen.
- Nur die Projekt-Tabellenpreview setzt `projectPanelCompact={false}` und rendert damit das Project Panel vollständig expandiert.

## Betroffene Dateien

- `client/src/components/ProjectsPage.tsx`
- `client/src/components/ui/entity-preview-cards.tsx`
- `client/src/components/ui/table-hover-previews.tsx`
- `tests/unit/ui/projectsTable.preview.test.tsx`
- `tests/unit/ui/tableEntityCardPreviews.render.test.tsx`

## Rollen und Berechtigungen

Keine Rollenänderung.

- Sichtbarkeit und Aktionen bleiben unverändert.
- Die Änderung betrifft ausschließlich die Darstellung bereits geladener Projektinformationen in der Tabellen-Hover-Preview.
- Es wurden keine Endpunkte, Mutationen, Deep Links oder Berechtigungsprüfungen geändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/projectsTable.preview.test.tsx tests/unit/ui/tableEntityCardPreviews.render.test.tsx tests/unit/ui/projectInfoPanel.render.test.tsx`
- `npm run typecheck`

## Bekannte Einschränkungen

- Kein Browser-Screenshot wurde in diesem Auftrag nachgezogen.
- Die Ursache wurde als indirekte UI-Regression aus der generischen Tabellen-Preview-Verdrahtung eingegrenzt.
