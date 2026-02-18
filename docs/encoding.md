# Encoding-Regel (Projektweit)

## Verbindlicher Standard

- Alle Quelltexte und Doku-Dateien werden in UTF-8 gespeichert.
- Keine UTF-16-Dateien in `client/`, `server/`, `shared/`, `tests/`, `docs/`, `script/`.
- Git-Zeilenenden bleiben durch `.gitattributes` konsistent (`lf`, PowerShell `crlf`).
- Editor-Standard ist UTF-8 (siehe `.editorconfig`, optional `.vscode/settings.json`).

## Automatische Absicherung

- `npm run check` fuehrt den Encoding-Check vor dem Typecheck aus.
- Der Check durchsucht projektweit auf typische Mojibake-Muster und bricht bei Treffern ab.
- Der Check erkennt auch UTF-16-BOM-Dateien und blockiert diese.

## Bei falsch dargestellten Umlauten oder Sonderzeichen

1. `npm run check` ausfuehren.
2. Gemeldete Datei/Zeile korrigieren (Text neu in UTF-8 schreiben).
3. Datei explizit als UTF-8 speichern.
4. Erneut `npm run check` und dann Commit.
