# Encoding-Regel (Frontend)

- Frontend-Quelltexte werden in UTF-8 gespeichert.
- Der Check `npm run check` enthält `check:encoding:frontend` und bricht bei verdächtigen Mojibake-Sequenzen (`Ã`, `Â`, `�`) ab.
- Bei Umlautproblemen zuerst `npm run check` ausführen. Der Check zeigt Datei und Zeile.
