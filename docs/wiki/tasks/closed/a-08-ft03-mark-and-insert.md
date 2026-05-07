# A-08 - FT-03 Termin markieren und per Einfügen verschieben

## Metadaten

- Status: abgeschlossen
- Dringlichkeit: Hoch
- Thema: Kalender-Move-Dialoge
- Typ: Implementierung
- Erstellt: 06.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-mark-and-insert.md`
- Verantwortlich: offen
- Journal: [06.05.26 - A-07/A-08: Termine markieren und verschieben](../../journal/06-05-26-a07-a08-kalender-verschieben.md)

## Beziehungen

- Features:
  - [FT (03): Kalenderansichten](../../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
  - FT-01 Kalendertermine
  - FT-04 Tourenplanung
- Use Cases:
  - UC 01/03 - Termin verschieben
  - UC 01/05 - Tour einem Termin zuweisen
  - UC 01/15 - Optimistic Locking bei paralleler Bearbeitung
  - [UC 03/01 - Wochenkalender anzeigen](../../features/ft-03-kalenderansichten/use-cases/uc-03-01-wochenkalender-anzeigen.md)
  - [UC 03/02 - Zeitraum wechseln](../../features/ft-03-kalenderansichten/use-cases/uc-03-02-zeitraum-wechseln.md)
  - [UC 03/05 - Monatsübersicht anzeigen](../../features/ft-03-kalenderansichten/use-cases/uc-03-05-monatsuebersicht-anzeigen.md)
  - [UC 03/06 - Auslastungsansicht eines Mitarbeiters anzeigen](../../features/ft-03-kalenderansichten/use-cases/uc-03-06-auslastungsansicht-eines-mitarbeiters-anzeigen.md)
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - [A-07 - FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender](a-07-ft03-dnd-tourwechsel.md)

## Ziel

Ein Termin soll per Langklick markiert werden können und anschließend über die Einfügen-Option am pro-Tag-`+`-Button einer regulären Tour-Lane auf ein anderes Datum und in eine andere Tour verschoben werden können. Die Markierung bleibt beim Navigieren zwischen Kalenderzeiträumen und Kalenderansichten erhalten, bis sie aufgehoben oder erfolgreich eingefügt wird.

## Ausgangslage

Drag & Drop deckt nur Ziele innerhalb des sichtbaren Kalenderausschnitts ergonomisch ab. Mark & Insert ergänzt diesen Ablauf für Verschiebungen über Wochen-, Monats- und Ansichtsgrenzen hinweg. Fachlich führt das Einfügen zur gleichen kombinierten Mutation aus Datum und Tour wie A-07; Bestätigungsdialog, Konfliktprüfung, Rollenregeln und Sperrlogik dürfen deshalb nicht doppelt implementiert werden.

## Umfang

Zur Aufgabe gehören:

- vorhandene `+`-Button-Implementierungen in Wochenkalender und Monatsübersicht analysieren
- vorhandene globale Client-State-Muster für einen kalenderübergreifenden Termin-Clipboard-State prüfen
- Langklick-Geste für Terminkarten ergänzen, ohne normalen Klick oder Drag & Drop zu stören
- markierten Termin visuell hervorheben und eine globale Statusanzeige mit Abbrechen-Option anzeigen
- Markierung per Escape, Click-Away, erfolgreichem Einfügen und erneutem Langklick auf denselben Termin aufheben
- pro-Tag-`+`-Button regulärer Tour-Lanes um eine Einfügen-Option mit gekürztem Termintitel erweitern
- Systemlanes Abwesenheiten und Parkplatz als Einfüge-Ziele ausschließen
- Einfügen über denselben kombinierten Mutations- und Bestätigungspfad wie A-07 führen
- Fehlerpfade für gelöschte oder zwischenzeitlich geänderte Termine behandeln

Nicht Teil der Aufgabe ist eine stille Mutation ohne Bestätigungsdialog, eine zweite unabhängige Tourwechsel-Logik, eine Änderung an DB-Schema oder Rollenmodell oder eine Aufweichung bestehender Termin-, Tour-, Sperr- und Konfliktregeln.

## Umsetzungshinweise

- Der markierte Termin bleibt bis zur Bestätigung unverändert sichtbar und gespeichert.
- Es kann immer nur ein Termin markiert sein; ein neuer Langklick ersetzt die vorherige Markierung.
- Die Startuhrzeit des Termins bleibt beim Einfügen erhalten.
- Wenn sich Tour oder Datum ändern, ist ein Bestätigungsdialog erforderlich.
- Wenn Zieldatum und Zieltour identisch zur aktuellen Position sind, darf die Einfügen-Option nicht zu einer Mutation führen.
- Der gemeinsame Pfad mit A-07 ist bevorzugt zu nutzen; falls A-07 noch nicht umgesetzt ist, muss die gemeinsame Schnittstelle zuerst geplant werden.
- Die konkrete UI-Form des erweiterten `+`-Buttons, die Position der Statusanzeige und die Abgrenzung Langklick versus Drag sind nach Codeanalyse im bestehenden UI-Muster zu entscheiden und im Abschluss zu dokumentieren.

## Rollen- und Sicherheitsbezug

Betroffene Rollen sind mindestens `ADMIN` und `DISPONENT`.

Erlaubte Sichtbarkeit: Nutzer dürfen nur Termine, Tour-Lanes und Kalenderdaten sehen, die ihnen bereits nach bestehender Rollen- und Sichtbarkeitslogik zugänglich sind.

Erlaubte Aktionen:

- `ADMIN` darf historische und aktuelle Termine markieren und einfügen, sofern bestehende serverseitige Regeln dies erlauben.
- `DISPONENT` darf aktuelle Termine markieren und einfügen, darf aber vergangene Termine nicht verschieben und keine Termine auf vergangene Daten einfügen.

Technische Durchsetzung muss serverseitig erfolgen. UI-Sperren, ausgeblendete Einfügen-Optionen oder fehlende Ziel-Lanes reichen nicht als Berechtigungsnachweis. Direkte API-Aufrufe, Deep Links, parallele Bearbeitung, Optimistic Locking und Konfliktpfade müssen abgesichert bleiben.

## Offene Designpunkte

- UI-Form des erweiterten `+`-Buttons: Dropdown, Split-Button oder kontextabhängiger Wechsel ist anhand der bestehenden Button-Implementierung zu wählen.
- Globale Statusanzeige: Position und Form sind anhand des bestehenden Kalender-Shell-Layouts festzulegen.
- Langklick vs. Drag: Schwellenwerte und Pointer-Handling müssen so gewählt werden, dass normaler Klick, Long Press und Drag-Start sich nicht gegenseitig stören.
- Pseudolane Ohne Tour: Vor Umsetzung ist zu klären, ob Einfügen in diese Lane die Tour-Zuordnung entfernt oder bewusst nicht unterstützt wird.

## Erwartete Tests und Prüfungen

- Langklick auf Termin setzt Clipboard-State und markiert den Termin sichtbar.
- Normaler Klick auf Termin öffnet weiterhin das Terminformular.
- Navigation Woche, Monat und zurück erhält die Markierung.
- Escape hebt die Markierung auf.
- Klick außerhalb einer Terminkarte hebt die Markierung auf.
- Reguläre Tour-Lane zeigt bei markiertem Termin eine Einfügen-Option mit Termintitel.
- Systemlanes Abwesenheiten und Parkplatz zeigen keine Einfügen-Option.
- Einfügen mit Tourwechsel öffnet den Bestätigungsdialog und verschiebt nach Bestätigung.
- Einfügen ohne Tourwechsel, aber mit anderem Datum öffnet den vereinfachten Bestätigungsdialog.
- Abbruch im Dialog lässt Termin unverändert und Clipboard aktiv.
- Erfolgreiches Einfügen leert das Clipboard und zeigt den Termin an der Zielposition.
- Historischer Termin als Disponent wird beim Markieren oder spätestens beim Einfügen blockiert.
- Zwischenzeitlich gelöschter oder geänderter Termin führt zu klarer Fehlermeldung ohne Teilzustand.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-mark-and-insert.md`

## Blocker und offene Fragen

- Ohne Codeanalyse darf nicht entschieden werden, ob die Monatsübersicht denselben `+`-Button-Pfad nutzt.
- Ohne Codeanalyse darf nicht entschieden werden, wie der globale Clipboard-State technisch gehalten wird.
- Ohne gemeinsame Dialog- und Mutationsstrategie mit A-07 darf keine zweite Tourwechsel-Logik entstehen.
- Ohne belegte serverseitige Absicherung darf keine Umsetzung erfolgen, die Termine über Einfügen verschiebt.

## Abschluss

- Abgeschlossen am: 06.05.26
- Ergebnis: Termine können per längerem Linksklick als Verschiebeauswahl markiert werden. Ein Rechtsklick im Kalenderbereich hebt die Auswahl auf. Am oberen Rand des App-Screens erscheint eine deutlich sichtbare Karte mit Hinweis auf den selektierten Termin und Aufheben-Aktion. In Wochen- und Monatsansicht können markierte Termine in reguläre Tour-Ziele eingefügt werden; die Mutation nutzt denselben Preview-, Bestätigungs- und PATCH-Pfad wie A-07.
- Verifikation: `npm run typecheck`; `npm run test:unit -- tests/unit/ui/calendarMove.helpers.test.ts tests/unit/ui/calendarWorkspace.viewSwitch.wiring.test.tsx tests/unit/ui/calendarDragDrop.regular-draggable.wiring.test.tsx`; `npm run test:integration -- tests/integration/server/appointments.tour-change-preview.integration.test.ts --reporter=verbose`; `npm run check`.
- Folgeaufgaben: Keine A-08-Blocker im aktuell beauftragten Zuschnitt. Die ursprüngliche Escape-/Click-Away-Deselektion wurde nicht umgesetzt, weil der Auftrag die Deselektion ausdrücklich per Rechtsklick festgelegt hat.
