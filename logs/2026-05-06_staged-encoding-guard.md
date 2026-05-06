# Staged-Encoding-Guard

## Datum

06.05.26

## Zweck

W-14 wurde umgesetzt, damit neue Encoding-/Mojibake-Probleme vor dem Commit auffallen statt erst nachträglich im Audit bereinigt zu werden.

## Scope

- Lokaler Git-/npm-Guard für gestagte Textdateien.
- Dokumentation des `save`-Flows in `agents.md`.
- Keine Änderung an App-Funktionen, Rollen, API, Datenmodell, Persistenz oder UI-Verhalten.
- Keine GitHub-Actions-, GitHub-Advanced-Security- oder sonstige kostenpflichtige GitHub-Integration.

## Technische Entscheidungen

- Neuer Guard `scripts/check-staged-encoding.mjs`.
- Neues npm-Skript `check:encoding:staged`.
- Neuer versionierter Hook `.githooks/pre-commit`.
- Lokale Aktivierung über `git config core.hooksPath .githooks`.
- Harte UTF-8-Prüfung auf gestagte Dateien; Mojibake- und ASCII-Umlaut-Prüfung auf neu hinzugefügte Diff-Zeilen.
- Keine automatische Korrektur, sondern blockierende Meldung mit Datei und Zeile.

## Betroffene Dateien

- `.githooks/pre-commit`
- `scripts/check-staged-encoding.mjs`
- `package.json`
- `agents.md`
- W-14-Decision zur UTF-8-Härtung gegen Umlaute und Mojibake

## Rollen und Berechtigungen

Kein Rollenbezug. Die Änderung betrifft ausschließlich lokale Qualitätsprüfung vor Git-Commits.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `node --check scripts/check-staged-encoding.mjs`
- `npm run check:encoding:staged`
- Negativer Smoke-Test mit künstlichem Mojibake-Beispiel: Guard blockierte korrekt.
- `npm run check:encoding`
- `npm run lint:encoding`
- `git diff --cached --check`

## Bekannte Einschränkungen

- Der Hook greift nur in Arbeitskopien, in denen `core.hooksPath` auf `.githooks` gesetzt ist.
- `git commit --no-verify` kann lokale Hooks bewusst umgehen.
- ASCII-Umlaut-Erkennung bleibt heuristisch und meldet deshalb blockierend statt automatisch zu korrigieren.
