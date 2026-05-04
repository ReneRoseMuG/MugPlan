# 04.05.26 | Dokumentation | Wiki: Mojibake und Encoding normalisiert

## Zusammenfassung

Die Mojibake- und Encoding-Probleme im Repo-Wiki wurden korrigiert. Die Wiki-Markdown-Dateien wurden auf korrekt dargestellte Umlaute, Satzzeichen, Pfeile und weitere typografische Zeichen normalisiert.

## Art der Änderung

Dokumentations- und Encoding-Korrektur ohne fachliche Änderung an Features, Rollen, API, Datenmodell oder UI-Verhalten.

## Betroffene Features

Es ist kein einzelnes fachliches Feature betroffen. Die Änderung betrifft das Repo-Wiki als Dokumentationsbestand.

## Konkrete Änderungen

- Typische Mojibake-Sequenzen in `docs/wiki/**/*.md` wurden ersetzt.
- Das Wiki besteht nach der Korrektur den projektweiten Encoding-Check.
- Dieser Journaleintrag wurde angelegt und im Journal-Index verlinkt.

## Tests / Verifikation

- `npm run check:encoding` erfolgreich.
- `npm run check` lief bis zum abschließenden `lint:encoding`; dort blieb ein Treffer außerhalb des Wiki-Auftrags in `client/src/components/TourEmployeeCascadeDialog.tsx:108 manuell`.

## Offene Punkte

- Der verbleibende Encoding-Lint-Treffer außerhalb des Wiki-Bereichs ist separat zu klären.
- Es wurden keine fachlichen Inhalte des Wiki neu bewertet.
