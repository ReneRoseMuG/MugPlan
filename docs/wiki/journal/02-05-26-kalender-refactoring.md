# 02.05.26 - Kalender-Refactoring umgesetzt

## Kurzfassung

Das erste Kalender-Refactoring-Paket wurde auf Branch `refactor/kalender-refactoring` umgesetzt. Wochen- und Monatskalender erhalten kompaktere Arbeitsflächen, optionale Zusatzbereiche und Druckvorschauen.

## Änderungen

- Wochenkalender:
  - kompakte Tagesspalten-Beschriftung `Mo 27 Apr` als dokumentierte Ausnahme von der allgemeinen sichtbaren Datumsregel,
  - Toggle für dauerhaft sichtbare Termin-Notizkarten,
  - Toggle für passive Abwesenheitszeile,
  - persistierbare Personalübersicht je Tour-Lane,
  - direkte Terminkarten-Aktionen für Notizanlage und Mitarbeiterzuweisung über bestehende Fachpfade.
- Kalenderdaten:
  - optionale Termin-Notizvorschau in `/api/calendar/appointments`.
- Druck:
  - read-only Druckvorschau für Wochen- und Monatskalender.
- Sicherheit:
  - serverseitige Leser-Blockade für Termin-Notiz-Mutationen nachgezogen.

## Hinweise

Die Wiki wurde angepasst, weil sich sichtbares Kalenderverhalten und der Kalenderdaten-Contract geändert haben. Keine Schema-Migration ist Bestandteil dieser Änderung.

`npm test -- --reporter=verbose` ist erfolgreich gelaufen. Der lokale Audit ist in 7 von 8 Teilen erfolgreich; der verbleibende Fehler liegt im bestehenden Wiki-Encoding-Altbestand des `check:encoding`-Schritts.
