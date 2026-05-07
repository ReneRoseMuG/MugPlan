# A-09 - FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente

## Metadaten

- Status: offen
- Dringlichkeit: Hoch
- Thema: Dialoge
- Typ: Implementierung
- Erstellt: 06.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-auftrag-ft04-dialog-basiskomponente.md`
- Verantwortlich: offen
- Journal: offen

## Beziehungen

- Features:
  - FT-04 Tourenplanung
  - FT-03 Kalenderansichten
  - FT-01 Kalendertermine
- Use Cases:
  - UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
  - UC 01/03 - Termin verschieben
  - UC 01/05 - Tour einem Termin zuweisen
  - UC 01/15 - Optimistic Locking bei paralleler Bearbeitung
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - [A-10 - FT-04 mehrstufiger Tour-KW-Dialog](a-10-ft04-multistep-tour-kw-dialog.md)
  - [A-12 - Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](a-12-termin-tour-kw-mutationsdialoge.md)
  - [A-07 - FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender](closed/a-07-ft03-dnd-tourwechsel.md)
  - [A-08 - FT-03 Termin markieren und per Einfügen verschieben](closed/a-08-ft03-mark-and-insert.md)

## Ziel

Eine wiederverwendbare Bestätigungs-Dialog-Basiskomponente soll die fachlich verwandten, aber unterschiedlich ausgelösten Vorschau- und Bestätigungsabläufe für Tour-KW-Wochenplanung, Tourwechsel per Drag & Drop und Mark & Insert tragen.

Der gemeinsame Kern ist eine selektive Terminvorschau mit Checkboxen, sichtbaren Konflikten und expliziter Bestätigung durch den Disponenten. Stille Seiteneffekte sind ausgeschlossen.

## Ausgangslage

Die Mehrfach-Mitarbeiterzuweisung in der Tour-KW-Wochenplanung läuft derzeit über den bestehenden `TourEmployeeCascadeDialog` und eine stille Folge einzelner Dialogschritte. Der Disponent sieht dabei nicht transparent, wie viele Mitarbeiter noch folgen und welche Gesamtauswirkung die Mehrfachauswahl hat.

A-07 und A-08 benötigen denselben fachlichen Dialog-Kern für kombinierte Terminänderungen aus Datum, Tour und gegebenenfalls KW-Mitarbeiterzuordnung. Ohne gemeinsame Basis würden mehrere unabhängige Dialog- und Tourwechsel-Logiken entstehen.

## Umfang

Zur Aufgabe gehören:

- bestehende Aufrufpfade von `TourEmployeeCascadeDialog` in Tour-KW-, Tourformular- und Wochenplanungs-Kontexten analysieren
- stille Mehrfach-Zuweisung in `TourManagement.handleStartAddWeekEmployees` transparent machen
- entscheiden, ob `TourEmployeeCascadeDialog` erweitert oder schrittweise durch eine neue Basiskomponente abgelöst wird
- gemeinsame Dialog-Shell mit Header, optionalem Untertitel/Icon, festen Footer-Aktionen und Loading-State bereitstellen
- Content-Zonen für InfoBox, CheckList und Summary unterstützen
- optionalen Stepper für mehrstufige Abläufe bereitstellen
- konfliktfreie Einträge vorauswählen und konfliktbehaftete Einträge deaktiviert sichtbar lassen
- Auswahlaktionen „Alle wählen“ und „Alle abwählen“ auf selektierbare Einträge begrenzen
- Schließen per Außenklick oder Escape ohne explizite Nutzeraktion verhindern
- Mehrfach-Zuweisung als transparenten Stepper-Flow mit Anfangszusammenfassung, pro-Mitarbeiter-Vorschau und Endzusammenfassung abbilden
- Schnittstelle so dokumentieren, dass A-07 und A-08 dieselbe Komponente ohne eigene Dialog-Logik nutzen können

Nicht Teil der Aufgabe sind neue DB-Schemas, neue API-Routen, eine zweite Tourwechsel-Logik, stille Mutationen oder eine Aufweichung bestehender Rollen-, Sperr- und Konfliktregeln.

## Umsetzungshinweise

- Ausgangspunkte für die Analyse sind `TourEmployeeCascadeDialog.tsx`, `TourManagement.tsx`, `TourWeekForm.tsx`, `TourWeekPlanningView.tsx` sowie die vorhandenen Dialog-Primitive.
- Die bestehende Preview-Mutation für betroffene Termine ist wiederzuverwenden, soweit sie fachlich passt.
- Serverseitige Re-Checks bleiben Pflicht, weil die Vorschau zwischen Anzeige und Bestätigung veralten kann.
- Historische Termine dürfen durch diese Dialogabläufe nicht berührt werden.
- Cache-Invalidierung nach Mutationen bleibt über die bestehenden `refreshCascadeDependentViews`-Pfade erhalten.
- Der bisherige Dialog darf während einer Migration bestehen bleiben; ein Big-Bang-Austausch ist nicht erforderlich.

## Rollen- und Sicherheitsbezug

Betroffene Rollen sind mindestens `ADMIN` und `DISPONENT`.

Erlaubte Sichtbarkeit: Nutzer dürfen nur Termine, Tour-Lanes, Mitarbeiter und Kalenderdaten sehen, die ihnen bereits nach bestehender Rollen- und Sichtbarkeitslogik zugänglich sind.

Erlaubte Aktionen:

- `ADMIN` darf die bestehenden Tour-KW- und Terminänderungen im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `DISPONENT` darf aktuelle Tour-KW- und Terminänderungen im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Aktionen über diese Dialoge ausführen.

Technische Durchsetzung muss serverseitig erhalten bleiben. UI-Sperren und deaktivierte Checkboxen ersetzen keine Backend-Prüfung. Direkte API-Aufrufe, parallele Bearbeitung, Versionskonflikte, blockierte Tour-KWs, historische Sperren und Mitarbeiter-Overlap müssen weiterhin serverseitig abgesichert sein.

## Randfälle und Fehlerpfade

- Vorschau-Mutation schlägt fehl: Toast anzeigen und Dialog nicht öffnen.
- Bestätigungs-Mutation schlägt fehl: Dialog bleibt offen, Fehlermeldung wird im Dialog angezeigt.
- Alle Einträge sind konfliktbehaftet: Bestätigen ist deaktiviert und eine erklärende InfoBox sichtbar.
- Teilweise Konflikte: Nur konfliktfreie Einträge sind vorausgewählt; Konflikte bleiben sichtbar und deaktiviert.
- Zurück-Navigation in mehrstufigen Flows ist nur zulässig, solange noch keine irreversible Mutation ausgeführt wurde.
- Codex muss vor Umsetzung klären, ob Mehrfach-Flows pro Schritt committen oder erst nach der finalen Gesamtbestätigung.

## Erwartete Tests und Prüfungen

- Einzelzuweisung bleibt fachlich identisch zum bisherigen Dialog und zeigt keinen Stepper.
- Mehrfachzuweisung zeigt Fortschritt, aktuelle Position und noch ausstehende Schritte.
- Zurück-Navigation funktioniert, solange keine Mutation ausgeführt wurde.
- Abbrechen bricht den gesamten Batch ohne Teilmutation ab.
- Konfliktfreie Einträge sind vorausgewählt.
- Konfliktbehaftete Einträge sind sichtbar, deaktiviert und von der Mutation ausgeschlossen.
- „Alle wählen“ und „Alle abwählen“ wirken nur auf selektierbare Einträge.
- Loading-State wird während der Mutation sichtbar.
- Fehler bei Bestätigung hält den Dialog offen und zeigt eine Fehlermeldung.
- Bestehende Tests für `TourEmployeeCascadeDialog` und verwandte Cascade-Dialog-Tests bleiben grün oder werden im Rahmen der Migration fachlich angepasst.
- A-07 und A-08 können die neue Basiskomponente verwenden, ohne eigene Dialog- oder Tourwechsel-Logik einzuführen.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-auftrag-ft04-dialog-basiskomponente.md`

## Blocker und offene Fragen

- Ohne Codeanalyse darf nicht entschieden werden, ob der bestehende `TourEmployeeCascadeDialog` erweitert oder durch eine neue Basiskomponente ersetzt wird.
- Ohne Codeanalyse darf nicht entschieden werden, ob A-07 und A-08 Varianten-Modi oder eigene Aufruf-Wrapper verwenden.
- Ohne Klärung des Commit-Zeitpunkts im Mehrfach-Flow darf keine Umsetzung erfolgen, die Zurück-Navigation nach bereits ausgeführten Teilmutationen suggeriert.
- Ohne belegte serverseitige Re-Checks darf keine Umsetzung erfolgen, die Preview-Ergebnisse als abschließende Berechtigung oder Konfliktprüfung behandelt.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
