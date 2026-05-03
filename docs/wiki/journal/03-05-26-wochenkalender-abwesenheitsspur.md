# 03.05.26 - Wochenkalender: Abwesenheitsspur dauerhaft sichtbar

## Kurzfassung

Die schmale Abwesenheitsspur im Wochenkalender ist jetzt dauerhaft sichtbar. Der bisherige Toggle wurde entfernt, die Spur erhielt einen kompakten Header in der Farbe der Tour `Abwesenheiten`, und Abwesenheiten am Wochenende verbreitern die Wochenendspalten nicht mehr.

## Änderungen

- Wochenkalender:
  - Abwesenheitsspur rendert immer direkt unter dem Tageskopf.
  - Toggle für die optionale Anzeige der Spur entfernt.
  - Spur-Header mit Label `Abwesenheiten` ergänzt.
  - Wochenendspalten werden nur noch durch reguläre Termine verbreitert, nicht durch reine Abwesenheiten.
- Mitarbeiter-Badges:
  - Standard-Badges in Wochen-Terminkarten rendern ohne farbige Avatar-Kreise.
  - Standard-Badges in der Abwesenheitsspur rendern ebenfalls ohne farbige Avatar-Kreise.
  - Kompakt-Badges bleiben unverändert.

## Hinweise

Die Änderung betrifft ausschließlich bestehende UI-Darstellung. Es wurden keine Rollen, Mutationen, Endpunkte, Datenbankstrukturen oder serverseitigen Berechtigungsregeln verändert.

Erfolgreich geprüft wurden die relevanten Unit-Tests für Wochenkalender-Header, Wochenkalender-Layout, Wochen-Terminkarten und Personen-Badges sowie `npm run typecheck`.
