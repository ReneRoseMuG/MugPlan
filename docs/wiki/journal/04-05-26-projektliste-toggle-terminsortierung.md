# 04.05.26 | Änderung | FT-02 Projektverwaltung: Projektliste-Toggles und Terminsortierung

## Zusammenfassung

Die Projektliste wurde in der Bedienung leicht gestrafft. Die Scope-Toggles zeigen jetzt die kurzen Beschriftungen `Alle`, `Geplante` und `Ohne Termin`. Zusätzlich ist die vorhandene Tabellenspalte `Nächster Termin` sortierbar.

## Art der Änderung

- Frontend-UI in der Projektliste angepasst.
- Clientseitige Sortierlogik der Projekttabelle erweitert.
- Bestehende Unit-Tests für Filterpanel und Projekttabelle angepasst und ergänzt.

## Betroffene Features

- [FT-02: Projekte](../features/ft-02-projekte/ft-02-projekte.md)

Notion-Featureseiten wurden für diese kleine UI-Nachkorrektur nicht herangezogen, weil der Auftrag direkt auf bestehendes sichtbares Verhalten in der Projektliste zielte und die lokalen Code- und Teststellen eindeutig waren.

## Konkrete Änderungen

- Im Projektfilter wurden die Toggle-Texte gekürzt:
  - `Alle`
  - `Geplante`
  - `Ohne Termin`
- `ProjectSortKey` wurde um `nextAppointment` erweitert.
- Der Tabellenkopf `Nächster Termin` nutzt jetzt den bestehenden Sortierkopf mit Sortiericon.
- Die Sortierung verwendet Datum und Stunde des nächsten Termins.
- Projekte ohne nächsten Termin bleiben bei der Terminsortierung am Ende.
- Backend, API-Contracts, Persistenz und Rollenlogik bleiben unverändert.

## Tests / Verifikation

Gezielt erfolgreich ausgeführt:

- `npm run typecheck`
- `npm run test:unit -- tests/unit/ui/projectFilterPanel.layout.wiring.test.tsx tests/unit/ui/projectsPage.orderNumberWiring.test.tsx`
- `npm run lint`
- `git diff --check`

## Offene Punkte

- Für die Terminsortierung wurde kein eigener Browser-E2E ergänzt. Die Sortierlogik ist über Unit-Tests abgesichert.
- Der Arbeitsbaum enthält weitere offene Änderungen aus vorherigen Aufgaben, die nicht Teil dieser Journalnotiz sind.
