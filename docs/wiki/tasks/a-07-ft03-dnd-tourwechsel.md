# A-07 - FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender

## Metadaten

- Status: offen
- Priorität: Hoch
- Typ: Implementierung
- Erstellt: 06.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-dnd-tourwechsel.md`
- Verantwortlich: offen

## Beziehungen

- Features:
  - [FT (03): Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
  - FT-04 Tourenplanung
  - FT-01 Kalendertermine
- Use Cases:
  - UC 01/03 - Termin verschieben
  - UC 01/05 - Tour einem Termin zuweisen
  - UC 01/15 - Optimistic Locking bei paralleler Bearbeitung
  - UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
  - [UC 03/01 - Wochenkalender anzeigen](../features/ft-03-kalenderansichten/use-cases/uc-03-01-wochenkalender-anzeigen.md)
  - [UC 03/04 - Tour-Lanes aufklappen oder zuklappen](../features/ft-03-kalenderansichten/use-cases/uc-03-04-tour-lanes-aufklappen-oder-zuklappen.md)
  - [UC 03/06 - Auslastungsansicht eines Mitarbeiters anzeigen](../features/ft-03-kalenderansichten/use-cases/uc-03-06-auslastungsansicht-eines-mitarbeiters-anzeigen.md)
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - Tour-KW-Wochenplanung über `tour_week_employees`

## Ziel

Termine sollen im Wochenkalender per Drag & Drop nicht nur auf einen anderen Tag, sondern auch auf eine andere Tour-Lane gezogen werden können. Ein Tourwechsel per Drag & Drop ist eine kombinierte Mutation aus Datum und Tour und muss immer über einen Bestätigungsdialog laufen.

## Ausgangslage

Drag & Drop im Wochenkalender verschiebt aktuell nur das Datum innerhalb derselben Tour-Lane. UC 01/03 schließt Tourwechsel per Drag & Drop derzeit ausdrücklich aus. Diese Einschränkung soll aufgehoben werden, während bestehende Termin-, Tour-, Rollen-, Sperr- und Konfliktregeln erhalten bleiben.

## Umfang

Zur Aufgabe gehören:

- relevante Drag-&-Drop-Logik, Lane-Grenzen, bestehende KW-Wechsel-Dialoge und serverseitige Tour-Zuweisung analysieren
- Drop-Zones im Wochenkalender auf zulässige Tour-Lanes erweitern
- Systemlane Abwesenheiten, Systemlane Parkplatz und Pseudolane Ohne Tour gesondert behandeln
- visuelles Feedback für reine Datumsverschiebung und Tourwechsel unterscheiden
- kombinierten Bestätigungsdialog für Datum und Tour integrieren
- serverseitige Konfliktprüfung für den kombinierten Fall absichern
- transaktionssicheren Ablauf sicherstellen
- Auswirkungen auf Kalenderdarstellung, Tour-Terminliste und Mitarbeiter-Auslastungsansicht berücksichtigen
- Hinweis zur späteren Aktualisierung von UC 01/03 dokumentieren

Nicht Teil der Aufgabe ist eine stille Mutation ohne Bestätigung, eine neue unabhängige Fachlogik in Kalenderkarten oder eine Aufweichung bestehender Rollen-, Sperr- und Konfliktregeln.

## Umsetzungshinweise

- Tourwechsel per Drag & Drop muss immer einen Bestätigungsdialog auslösen.
- Gleiche Tour und anderer Tag bleibt normales Drag & Drop ohne zusätzlichen Tourwechsel-Dialog.
- Die Uhrzeit des Termins bleibt unverändert.
- Bei Abbruch oder Konflikt bleibt der Termin vollständig unverändert.
- Konfliktbehaftete Mitarbeiter im Vorschau-Dialog sind deaktiviert sichtbar zu halten, nicht auszublenden.
- Bestehende Vorschau- und Bestätigungslogik soll wiederverwendet oder erweitert werden; Doppelimplementierung ist zu vermeiden.
- Nach erfolgreichem Tourwechsel muss der Termin in der neuen Tour-Lane erscheinen und die neue Tourfarbe tragen.

## Rollen- und Sicherheitsbezug

Betroffene Rollen sind mindestens `ADMIN` und `DISPONENT`.

Erlaubte Sichtbarkeit: Nutzer dürfen nur Termine, Tour-Lanes und Kalenderdaten sehen, die ihnen bereits nach bestehender Rollen- und Sichtbarkeitslogik zugänglich sind.

Erlaubte Aktionen:

- `ADMIN` darf historische und aktuelle Termine per Drag & Drop verschieben und die Tour wechseln, sofern bestehende serverseitige Regeln dies erlauben.
- `DISPONENT` darf aktuelle Termine per Drag & Drop verschieben und die Tour wechseln, darf aber vergangene Termine nicht verschieben und nicht deren Tour wechseln.

Technische Durchsetzung muss serverseitig erfolgen. Eine UI-Blockade oder fehlende Drop-Zone reicht nicht als Berechtigungsnachweis. Direkte API-Aufrufe, parallele Bearbeitung, Optimistic Locking und Konfliktpfade müssen abgesichert bleiben.

## Offene Designpunkte

- Pseudolane Ohne Tour: Es ist vor Umsetzung zu entscheiden, ob ein Drop auf diese Lane die Tour-Zuordnung entfernt oder als separater Schritt behandelt wird.
- Monatskalender: Es ist zu prüfen, ob die Monatsübersicht dieselbe Drag-&-Drop-Implementierung teilt oder ob Tourwechsel dort separat zu behandeln sind.
- Dialog-Implementierung: Es ist nach Codeanalyse zu entscheiden, ob der bestehende KW-Wechsel-Dialog erweitert oder ein neuer kombinierter Dialog nötig ist.

## Erwartete Tests und Prüfungen

- Gleiche Tour, anderer Tag: normales Drag & Drop bleibt unverändert und löst keinen Tourwechsel-Dialog aus.
- Andere Tour, gleicher Tag: Dialog erscheint und bestätigter Tourwechsel wird übernommen.
- Andere Tour, andere KW: Dialog zeigt alte und neue KW-Seite.
- Historischer Termin als Disponent: Drag & Drop wird blockiert.
- Historischer Termin als Admin: Drag & Drop ist erlaubt und Dialog erscheint.
- Typ-1-Konflikt bei Ziel-Tour-KW wird sichtbar und korrekt behandelt.
- Typ-2-Konflikt bei Ziel-Tour-KW-Mitarbeitern wird sichtbar und korrekt behandelt.
- Optimistic-Locking-Konflikt zwischen Drag-Start und Bestätigung führt zu klarer Fehlermeldung ohne Teilzustand.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-dnd-tourwechsel.md`

## Blocker und offene Fragen

- Ohne Codeanalyse darf nicht entschieden werden, ob die Pseudolane Ohne Tour als Drop-Ziel dient.
- Ohne Codeanalyse darf nicht entschieden werden, ob der Monatskalender denselben Tourwechsel-Pfad bekommt.
- Ohne belegte serverseitige Absicherung darf keine Umsetzung erfolgen, die Tourwechsel durch Drag & Drop ermöglicht.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
