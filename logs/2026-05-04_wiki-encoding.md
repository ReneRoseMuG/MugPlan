# Wiki-Encoding normalisiert

Datum: 04.05.26
Branch: `work`
Commit: noch nicht erstellt

## Zweck

Dieses Log dokumentiert die Korrektur der Mojibake- und Encoding-Probleme im Repo-Wiki.

## Scope

- `docs/wiki/**/*.md` wurde mechanisch auf typische Mojibake-Sequenzen normalisiert.
- Betroffen waren UTF-8/Latin-1-Fehlsequenzen wie falsch dargestellte Umlaute, typografische Anführungszeichen, Gedankenstriche, Pfeile, Vergleichszeichen und einzelne `Â`-Artefakte.
- Die Korrektur war inhaltserhaltend: Wiki-Struktur, Feature-Zuordnung und Dateinamen wurden nicht fachlich umgebaut.
- Zusätzlich wurde dieser Logeintrag und ein Journaleintrag für die Session angelegt.

## Rollen und Sperren

- Es wurden keine Rollen, Berechtigungen, Sichtbarkeitsregeln oder Endpunkte geändert.
- Die Änderung betrifft ausschließlich Dokumentationsdateien im Wiki und die neue Abschlussdokumentation.

## Technische Entscheidungen

- Die Reparatur wurde gezielt auf `docs/wiki` begrenzt.
- Die Normalisierung ersetzte nur bekannte Mojibake-Muster statt frei formulierte Inhalte umzuschreiben.
- Bestehende offene Codeänderungen außerhalb des Wiki-Auftrags wurden nicht verändert.

## Betroffene Dateien

- `docs/wiki/**/*.md`
- `docs/wiki/journal/README.md`
- `docs/wiki/journal/04-05-26-wiki-encoding.md`
- `logs/2026-05-04_wiki-encoding.md`

## Hinweise zum Testen

Erfolgreich gelaufen:

- `npm run check:encoding`

Teilweise gelaufen:

- `npm run check` lief durch `check:encoding`, `check:destructive-inventory` und `tsc`, scheiterte anschließend in `lint:encoding` an `client/src/components/TourEmployeeCascadeDialog.tsx:108 manuell`. Dieser Treffer liegt außerhalb des Wiki-Auftrags.

## Bekannte Einschränkungen

- Der letzte `npm run check` ist wegen eines bestehenden Encoding-Lint-Treffers außerhalb des Wiki-Bereichs nicht vollständig grün.
- Im Arbeitsbaum lagen bereits mehrere offene Codeänderungen; sie wurden für diesen Auftrag nicht verändert.
