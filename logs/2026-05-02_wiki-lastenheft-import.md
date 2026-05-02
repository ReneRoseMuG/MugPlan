# Auftragslog: Wiki-Lastenheft-Import

## Datum

02.05.26

## Auftrag

Das Notion-Lastenheft sollte in das Repo unter `docs/wiki` übernommen werden. Features sollten vollständig aus lokalen Notion-Markdown-Exporten importiert, Use Cases in einzelne Dateien ausgelagert und Journal, Entscheidungen sowie redaktionelle Workflows angelegt werden.

## Ergebnis

- Wiki-Grundstruktur unter `docs/wiki` angelegt.
- Feature-Index, Use-Case-Index, Backlog-Index, Relations-Datei, Journal, Entscheidungen und Workflow-Dokumente erstellt.
- 23 Feature-Dateien vollständig aus lokalen Markdown-Exporten übernommen.
- 228 Use-Case-Dateien erzeugt.
- `Projekt Management`-Blöcke aus importierten Feature-/Use-Case-Inhalten entfernt.
- Redaktions-Workflows `Update Codebase gegen Feature` und `Update Relations` dokumentiert.

## Verifikation

- Markdown-Linkprüfung: `OK 323 markdown files checked`
- Keine `Vollimport blockiert`-Reste
- Keine `Projekt Management`-Reste in `docs/wiki/features`
- Keine verbotenen sichtbaren Datumsformat-Treffer in `docs/wiki`
- `npm run check` erfolgreich

## Offene Punkte

- Backlog-Items sind nur dort abgedeckt, wo sie in den lokalen Feature-Exporten enthalten waren.
- Weitere redaktionelle Nacharbeit kann über die neuen Workflows in `docs/wiki/workflows` erfolgen.
