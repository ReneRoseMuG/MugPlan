# Test-Lücken-Scan – Log

Dieses Dokument protokolliert alle durchgeführten Test-Lücken-Scans.
Claude liest diese Datei vor jedem neuen Scan und wählt ein Feature aus der Spalte **Status = offen**.

## Legende

| Spalte | Bedeutung |
|--------|-----------|
| Feature | Feature-ID und Kurzname |
| Datum | Datum des Scans (YYYY-MM-DD) |
| Status | `offen` / `gescannt` / `übersprungen` |
| Artefakt | Link zur Output-Datei (relativ zu `outputs/`) |
| Anmerkung | Besonderheiten, Folgeaufgaben |

---

## Scan-Protokoll

| Feature | Datum | Status | Artefakt | Anmerkung |
|---------|-------|--------|----------|-----------|
| FT-19 Attachments | 2026-05-09 | gescannt | — | Scan wurde abgebrochen, bevor Analyse abgeschlossen (Mehrfachauswahl-Problem erkannt) |
| FT-34 Kalendermarker / Feiertage | — | gescannt | — | Bereits in früherer Session analysiert; kein Artefakt vorhanden |
| FT-01 Kalendertermine | 2026-05-09 | gescannt | testbericht-ft01-2026-05-09.md | |
| FT-02 Projekte | 2026-05-09 | gescannt | testbericht-ft02-2026-05-09.md | |
| FT-03 Kalenderansichten | — | offen | — | |
| FT-04 Tourenplanung | — | offen | — | |
| FT-05 Mitarbeiterverwaltung | — | offen | — | |
| FT-06 Automatische Regeln | — | offen | — | |
| FT-07 Datensicherung / Fallback | — | offen | — | |
| FT-08 Journal / Änderungshistorie | — | offen | — | |
| FT-09 Kundenverwaltung | — | offen | — | |
| FT-11 Team-Verwaltung | — | offen | — | |
| FT-13 Notizverwaltung | — | offen | — | |
| FT-14 Benutzer- und Rollenverwaltung | — | offen | — | |
| FT-16 Hilfetexte verwalten | — | offen | — | |
| FT-18 User Preferences | — | offen | — | |
| FT-20 Rollenbasierte Zugriffsbeschränkungen | — | offen | — | |
| FT-21 Dokumentenextraktion | — | offen | — | |
| FT-24 Fahrzeugverwaltung | — | offen | — | |
| FT-26 Auswertungen und Reports | — | offen | — | |
| FT-27 Produktverwaltung / Auftragspositionen | — | offen | — | |
| FT-28 Universelles Tagging | — | offen | — | |
| FT-31 Dispositions-Monitoring | — | offen | — | |
| FT-32 Aktive Änderungsbenachrichtigung | — | offen | — | |
| FT-33 Abwesenheiten / Personalplanung | — | offen | — | |

---

## Protokoll-Änderungen

| Datum | Änderung |
|-------|----------|
| 2026-05-09 | Datei angelegt; rückwirkende Einträge für FT-19 und FT-34 ergänzt |
| 2026-05-09 | FT-01 Kalendertermine als gescannt markiert |
| 2026-05-09 | FT-02 Projekte als gescannt markiert |
