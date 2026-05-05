# Querbeziehungen

Diese Datei bündelt feature-übergreifende Beziehungen, bis sie je Feature vollständig in `Architektur & Kontext` und `Entscheidungen & Offene Punkte` nachgezogen sind.

## Bekannte Beziehungen aus dem Startimport

- FT (01) konsumiert FT (02), FT (04), FT (05), FT (09), FT (28) sowie Touren- und Dispositionskontexte.
- FT (02) wird von FT (01) und FT (03) konsumiert und konsumiert FT (09), FT (13), FT (19) und FT (28).
- FT (14) und FT (20) bilden Rollen- und Sichtbarkeitsgrenzen.
- FT (31), FT (32) und FT (33) hängen fachlich an Termin-, Touren- und Mitarbeiterkontexten.

- FT (34) liefert Kalendermarker für FT (03), konsumiert globale Settings aus FT (18) und Rollenregeln aus FT (20). FT (01) bleibt fachlich abgegrenzt, weil Kalendermarker keine Termine sind.
- FT (03) konsumiert FT (33) für die dauerhafte passive Abwesenheitsspur und FT (34) für nicht planungswirksame Kalenderhintergründe.
- FT (04) liefert Tour-KW-Planungen an FT (03) und wird dort für Personalübersicht, Anwenden-Flow und Tour-KW-Kachelaktionen sichtbar.
- FT (06) und FT (28) trennen fachliche Workflow-Tags von generischer Tag-Pflege. Reklamation, Storniert, Geparkt und Messe bleiben Workflow-Zustände; frei nutzbare Tags bleiben über FT (28) verwaltet.
- FT (26) konsumiert FT (18) für die entkoppelte Settings-Grenze, FT (20) für Report- und Preset-Rollen und FT (28) für Reporteffekte von System-Tags wie Reklamation, Storniert und Sondermaß.
- FT (31) konsumiert FT (01), FT (04) und FT (33): Monitoring wertet Terminbestand, Parkplatz-Zuordnung, Mitarbeiterunterdeckung und Abwesenheitsfolgen aus, ohne selbst Termine zu mutieren.
- FT (33) nutzt FT (06), wenn bestätigte reguläre Konflikttermine über den Parken-Workflow behandelt werden.

## Pflege

Der Workflow [Update Relations](workflows/update-relations.md) ist für die Aktualisierung dieser Beziehungen verbindlich.
