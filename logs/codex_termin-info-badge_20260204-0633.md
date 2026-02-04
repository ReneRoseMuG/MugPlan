# Änderungsnotiz: TerminInfoBadge

- Neu: `client/src/components/ui/termin-info-badge.tsx` als dünner Wrapper um `InfoBadge` mit Datums-/Dauer-/Stundenanzeige sowie Modus-abhängiger Sekundärzeile.
- Aktualisiert: `client/src/components/ProjectForm.tsx` verwendet `TerminInfoBadge` in der Terminliste des Sidebar-ähnlichen Panels, inklusive Beispiel für Modus `projekt`, Action-Weitergabe und Border-Farbe (grau/green) je nach Terminstatus.

**Beispielverwendung (Auszug)**
- `TerminInfoBadge` mit `mode="projekt"`, `projectLabel="Termin · <Projektname>"`, `action="remove"` und `color` zur Statusdarstellung.
