# Umsetzungs-Log – Projektstatus-Badges & Modal-Auswahl

## 2026-02-03
- Initiale Analyse der relevanten Komponenten und Dialog-Patterns durchgeführt; Fundstellen in `planung.md` festgehalten.
- `client/src/components/ProjectStatusSection.tsx`: Status-Auswahl-Dialog auf CardList-Picker (Modal via `EntityEditDialog` + `ProjectStatusListView`) umgestellt und Auswahl-Callback so angepasst, dass Auswahl den Modal schließt und `onAdd` ausführt. Zusätzlich `ColoredInfoBadge` im Projektformular explizit auf Remove-Modus (`action="remove"`) gesetzt, damit der "-"-Button gerendert wird.

## Prüfungen / Tests
- Manuelle Prüfsequenz (ohne Dev-Server):
  - Projektformular öffnen.
  - Klick auf "+" im Status-Bereich öffnet Modal mit Project Status CardList.
  - Auswahl eines Status fügt ihn hinzu und Modal schließt.
  - Zugewiesener Status erscheint als Badge mit "-" Button.
  - Klick auf "-" entfernt den Status, ohne übergeordneten Click-Handler auszulösen.
  - Modal schließt bei Auswahl; bleibt offen bei keiner Auswahl und kann über "Schließen" geschlossen werden.

## Abschluss
- Geänderte Dateien: `client/src/components/ProjectStatusSection.tsx`, `logs/2026-02-03_project-status-badges-modal/planung.md`, `logs/2026-02-03_project-status-badges-modal/umsetzungs-log.md`, `logs/2026-02-03_project-status-badges-modal/kritische-hinweise.md`.
- Erwartete UX im Projektformular: "+" öffnet Modal mit CardList-Auswahl; Auswahl fügt Status hinzu und schließt; Badges zeigen "-" zum Entfernen und entfernen den Status sauber.
- Weitere Bereiche wurden nicht verändert; keine unbeabsichtigten Änderungen an anderen Projektstatus-Darstellungen.
