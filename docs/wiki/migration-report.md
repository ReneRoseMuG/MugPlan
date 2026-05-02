# Migrationsreport

## Stand

Importlauf gestartet am 02.05.26.

## Durchgeführte Schritte

- Notion-Vorlagen für Feature, Use Case und Backlog gelesen.
- Lastenheft-Datenquelle identifiziert: `collection://30dda094-354e-80b6-848a-000bea0e1467`.
- Feature-Seiten über Workspace-Suche gesammelt.
- `docs/wiki` mit Zielstruktur, Redaktionsregeln, Workflow-Spezifikationen, Feature-Orten, Journal-Ort und Entscheidungs-Ort angelegt.
- FT (01): Kalendertermine aus lokalem Notion-Markdown-Export vollständig nachgezogen.
- FT (01) Use Cases 01/01 bis 01/22 in einzelne Dateien extrahiert und auf die Use-Case-Vorlage gehoben.
- FT (02): Projekte aus lokalem Notion-Markdown-Export vollständig nachgezogen.
- FT (02) Use Cases 02/01 bis 02/26 in einzelne Dateien extrahiert und auf die Use-Case-Vorlage gehoben; UC 02/25 ist in der Quelle nicht vorhanden, UC 02/20 ist als entferntes Duplikat enthalten.
- FT (03): Kalenderansichten ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (04): Tourenplanung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (05): Mitarbeiterverwaltung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (06): Automatische Regeln ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (07): Automatisierte Datensicherung und Fallback ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (08): Journal / ?nderungshistorie ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (09): Kundenverwaltung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (11): Team Verwaltung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (13): Notizverwaltung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (14): Benutzer- und Rollenverwaltung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (16): Hilfetexte verwalten ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (18): User Preferences ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (19): Attachments ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (20): Rollenbasierte Zugriffsbeschr?nkungen und UI-Steuerung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (21): Dokumentenextraktion ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (26): Auswertungen und Reports ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (27): Produktverwaltung und Auftragspositionen ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (28): Universelles Tagging-System ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (31): Dispositions-Monitoring (Konflikte) ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (32): Aktive ?nderungsbenachrichtigung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.
- FT (33): Abwesenheiten ?ber interne Personalplanung ? vollst?ndig importiert aus lokalem Notion-Markdown-Export vollst?ndig nachgezogen.

## Blocker

- Die direkte Notion-Datenquellenabfrage ist im aktuellen Connector mit einem Notion-Plan-/AI-Hinweis blockiert.
- Große Feature-Seiten werden beim `fetch`-Abruf gekürzt. Ein fachlich vollständiger Import aller Feature-Bodies kann damit nicht seriös bestätigt werden.
- Backlog-Zuordnungen aus eingebetteten Feature-Datenbanken können ohne vollständige Datenquellenabfrage nicht zuverlässig vollständig ermittelt werden.

## Konsequenz

Die Wiki-Struktur ist angelegt und importbereit. Dateien mit unvollständigem Quelleninhalt tragen einen sichtbaren Importhinweis. Diese Marker dürfen erst entfernt werden, wenn der vollständige Notion-Inhalt je Feature seriell nachgezogen und geprüft wurde.

FT (01) und FT (02) sind hiervon ausgenommen: Die lokalen Feature-Exportdateien wurden als vollständige Quellen verwendet.

## Bisher identifizierte Feature-Seiten

- FT (01): Kalendertermine — vollständig importiert
- FT (02): Projekte — vollständig importiert
- FT (03): Kalenderansichten
- FT (04): Tourenplanung
- FT (05): Mitarbeiterverwaltung
- FT (06): Automatische Regeln
- FT (07): Automatisierte Datensicherung und Fallback
- FT (08): Journal / Änderungshistorie
- FT (09): Kundenverwaltung
- FT (11): Team Verwaltung
- FT (13): Notizverwaltung
- FT (14): Benutzer- und Rollenverwaltung
- FT (16): Hilfetexte verwalten
- FT (18): User Preferences
- FT (19): Attachments
- FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung
- FT (21): Dokumentenextraktion
- FT (26): Auswertungen und Reports
- FT (27): Produktverwaltung und Auftragspositionen
- FT (28): Universelles Tagging-System
- FT (31): Dispositions-Monitoring (Konflikte)
- FT (32): Aktive Änderungsbenachrichtigung
- FT (33): Abwesenheiten über interne Personalplanung
