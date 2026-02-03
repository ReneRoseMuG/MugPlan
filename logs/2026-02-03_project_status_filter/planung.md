# Planung – Projekt-Status-Filter

## Bestätigung Pflichtlektüre
Ich habe `docs/architecture.md` und `docs/rules.md` vollständig gelesen. Relevante Leitplanken für diesen Auftrag in eigenen Worten:
- Die Änderung bleibt minimal-invasiv, ohne kosmetische Refactorings oder neue Strukturen außerhalb des Auftrags.
- Architektur folgt der bestehenden Schichtung (UI/View, Controller/Service/Repository). Persistenzlogik bleibt in Repositories, UI bleibt ohne Fachlogik.
- Keine neuen Dependencies, keine Build-/Tooling-/Konfigurationsänderungen.
- Vor Umsetzung werden bestehende Strukturen gefunden und wiederverwendet.

## Fundstellen (Ist-Zustand)
- Projektliste/Filterlayout: `client/src/components/ProjectList.tsx` (ProjectListView mit `FilteredCardListLayout` und `SearchFilterInput`).
- Filtertyp & Filterfunktion: `client/src/lib/project-filters.ts` (`ProjectFilters`, `defaultProjectFilters`, `applyProjectFilters`).
- Statusdatenbeschaffung im Client: `client/src/components/ProjectList.tsx` (`useQuery` auf `/api/project-status`).
- Server-Route Projektliste: `server/controllers/projectsController.ts` (`listProjects`), Service `server/services/projectsService.ts`, Repository `server/repositories/projectsRepository.ts`.
- Schema/Join-Tabelle Projektstatus: `shared/schema.ts` (`projectStatus`, `projectProjectStatus`).
- Projektstatus-Komponenten & Badge-Vorlagen: `client/src/components/ui/info-badge.tsx`, `client/src/components/ui/colored-info-badge.tsx`, `client/src/components/ProjectStatusSection.tsx`.

## Aktuelle Datenladung & Filterung
Die Projektliste lädt Projekte über React Query mit `/api/projects` und filtert aktuell ausschließlich clientseitig nach Titel über `applyProjectFilters` in `ProjectListView`. Statusdaten werden separat über `/api/project-status` geladen und in der Projektliste bislang nicht als Filter verwendet.

## Kapselung der Filterlogik (geplant)
- `ProjectFilters` wird um `statusIds: number[]` erweitert.
- Neue Funktion `buildProjectFilterQueryParams(filters)` liefert deterministisch die Query-Parameter (v. a. `statusIds` als kommaseparierte Liste). Diese Funktion ist UI-unabhängig, sodass später Tests darauf geschrieben werden können.

## Umsetzungsplan (Schritte)
1. Client: Filterzustand auf Projektebene anheben, Statusfilter-Badges ergänzen (Add/Remove über `ColoredInfoBadge`), Popover mit nicht-selektierten Stati (Add-Action).
2. Client: Query-Parameter aus Filterzustand ableiten, Query-Key für Projekte an `statusIds` binden (serverseitige Filterung), Titel-Filter bleibt clientseitig.
3. Server: `statusIds` Queryparameter in `listProjects` verarbeiten, an Service/Repository weitergeben und über Join-Tabelle filtern, Duplikate vermeiden.
4. Logging in `umsetzungs-log.md` und `kritische-hinweise.md` fortlaufend pflegen.
