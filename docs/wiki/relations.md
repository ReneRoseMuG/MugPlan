# Querbeziehungen

Diese Datei bündelt feature-übergreifende Beziehungen, bis sie je Feature vollständig in `Architektur & Kontext` und `Entscheidungen & Offene Punkte` nachgezogen sind.

## Bekannte Beziehungen aus dem Startimport

- FT (01) konsumiert FT (02), FT (04), FT (05), FT (09), FT (28) sowie Touren- und Dispositionskontexte.
- FT (02) wird von FT (01) und FT (03) konsumiert und konsumiert FT (09), FT (13), FT (19) und FT (28).
- FT (14) und FT (20) bilden Rollen- und Sichtbarkeitsgrenzen.
- FT (31), FT (32) und FT (33) hängen fachlich an Termin-, Touren- und Mitarbeiterkontexten.

- FT (34) liefert Kalendermarker fÃ¼r FT (03), konsumiert globale Settings aus FT (18) und Rollenregeln aus FT (20). FT (01) bleibt fachlich abgegrenzt, weil Kalendermarker keine Termine sind.

## Pflege

Der Workflow [Update Relations](workflows/update-relations.md) ist für die Aktualisierung dieser Beziehungen verbindlich.
