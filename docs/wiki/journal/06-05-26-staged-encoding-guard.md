# 06.05.26 | Tooling | Staged-Encoding-Guard

## Zusammenfassung

W-14 wurde abgeschlossen. Neue Encoding-/Mojibake-Probleme werden lokal vor dem Commit über einen Staged-Guard erkannt.

## Art der Änderung

Lokale Tooling- und Dokumentationsänderung ohne fachliche Änderung an App-Funktionen, Rollen, API, Datenmodell, Persistenz oder UI-Verhalten.

## Betroffene Features

- W-14: UTF-8-Härtung gegen Umlaute und Mojibake

## Konkrete Änderungen

- `scripts/check-staged-encoding.mjs` prüft gestagte Textdateien auf gültiges UTF-8.
- Neu hinzugefügte Diff-Zeilen werden auf typische Mojibake-Muster und offensichtliche ASCII-Umlaut-Umschreibungen geprüft.
- `.githooks/pre-commit` ruft den Guard vor lokalen Commits auf.
- `package.json` enthält `check:encoding:staged`.
- `agents.md` dokumentiert den erweiterten `save`-Flow mit Blocker-Meldung und Rückfrage vor Bereinigung.
- Die Decision W-14 wurde als abgeschlossen markiert.

## Rollen

Kein Rollenbezug. Es wurden keine Berechtigungen, Sichtbarkeiten oder serverseitigen Rollenprüfungen verändert.

## Tests / Verifikation

Erfolgreich ausgeführt:

- `node --check scripts/check-staged-encoding.mjs`
- `npm run check:encoding:staged`
- Negativer Smoke-Test mit künstlichem Mojibake-Beispiel
- `npm run check:encoding`
- `npm run lint:encoding`
- `git diff --cached --check`

## Offene Punkte

- Andere Arbeitskopien müssen `git config core.hooksPath .githooks` einmalig setzen, damit der versionierte Hook lokal aktiv ist.
