# FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente

Eine wiederverwendbare Bestätigungs-Dialog-Basiskomponente soll die fachlich verwandten, aber unterschiedlich ausgelösten Vorschau- und Bestätigungsabläufe für Tour-KW-Wochenplanung, Tourwechsel per Drag & Drop und Mark & Insert tragen. Der gemeinsame Kern ist eine selektive Terminvorschau mit Checkboxen, sichtbaren Konflikten und expliziter Bestätigung durch den Disponenten. Stille Seiteneffekte sind ausgeschlossen. Die Mehrfach-Mitarbeiterzuweisung in der Tour-KW-Wochenplanung läuft derzeit über den bestehenden `.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Implementierung | 06.05.26 |

---

## Ziel

Eine wiederverwendbare Bestätigungs-Dialog-Basiskomponente soll die fachlich verwandten, aber unterschiedlich ausgelösten Vorschau- und Bestätigungsabläufe für Tour-KW-Wochenplanung, Tourwechsel per Drag & Drop und Mark & Insert tragen. Der gemeinsame Kern ist eine selektive Terminvorschau mit Checkboxen, sichtbaren Konflikten und expliziter Bestätigung durch den Disponenten. Stille Seiteneffekte sind ausgeschlossen.

## Ausgangslage

Die Mehrfach-Mitarbeiterzuweisung in der Tour-KW-Wochenplanung läuft derzeit über den bestehenden `TourEmployeeCascadeDialog` und eine stille Folge einzelner Dialogschritte. Der Disponent sieht dabei nicht transparent, wie viele Mitarbeiter noch folgen und welche Gesamtauswirkung die Mehrfachauswahl hat. Die abgeschlossenen Verschiebeaufgaben zu Drag & Drop und Mark & Insert benötigen denselben fachlichen Dialog-Kern für kombinierte Terminänderungen aus Datum, Tour und gegebenenfalls KW-Mitarbeiterzuordnung. Ohne gemeinsame Basis würden mehrere unabhängige Dialog- und Tourwechsel-Logiken entstehen.

## Umfang

- Zur Aufgabe gehören:
- bestehende Aufrufpfade von `TourEmployeeCascadeDialog` in Tour-KW-, Tourformular- und Wochenplanungs-Kontexten analysieren
- Props und Varianten des bestehenden `TourEmployeeCascadeDialog` analysieren, insbesondere `week` / `appointment` und `add` / `remove`
- stille Mehrfach-Zuweisung in `TourManagement.handleStartAddWeekEmployees` transparent machen
- `remainingEmployeeIds` in `TourManagement` als konkrete stille Schleifenmechanik analysieren
- State-Übergänge zwischen den bisherigen Einzel-Dialogen analysieren
- entscheiden, ob `TourEmployeeCascadeDialog` erweitert oder schrittweise durch eine neue Basiskomponente abgelöst wird
- bestehende Radix-Primitive und Shadcn-Komponenten als Basis prüfen
- Props-Struktur mit sauberer Trennung von Steuer-Logik und Darstellung entwerfen
- gemeinsame Dialog-Shell mit Header, optionalem Untertitel/Icon, festen Footer-Aktionen und Loading-State bereitstellen
- Footer ohne freies `children` gestalten; primäre Aktion, sekundäre Aktion und optionaler Zurück-Button sind explizit konfiguriert
- Content-Zonen für InfoBox, CheckList und Summary unterstützen
- Status-Badges in CheckList-Einträgen für mindestens `wird hinzugefügt`, `wird entfernt`, `Konflikt`, `bereits zugewiesen` und `unterbesetzt` unterstützen
- optionalen Stepper für mehrstufige Abläufe mit Step-Nummer, Titel, Done-Markierung und Zuständen `aktiv`, `abgeschlossen`, `ausstehend` bereitstellen
- konfliktfreie Einträge vorauswählen und konfliktbehaftete Einträge deaktiviert sichtbar lassen
- Auswahlaktionen „Alle wählen“ und „Alle abwählen“ auf selektierbare Einträge begrenzen
- Schließen per Außenklick oder Escape ohne explizite Nutzeraktion verhindern
- Mehrfach-Zuweisung als transparenten Stepper-Flow mit Anfangszusammenfassung, pro-Mitarbeiter-Vorschau und Endzusammenfassung abbilden
- Endzusammenfassung mit Anzahl ausgewählter Mitarbeiter, Anzahl betroffener Termine und Anzahl übersprungener Konflikte anzeigen
- Schnittstelle so dokumentieren, dass Drag & Drop und Mark & Insert dieselbe Komponente ohne eigene Dialog-Logik nutzen können
- Nicht Teil der Aufgabe sind neue DB-Schemas, neue API-Routen, eine zweite Tourwechsel-Logik, stille Mutationen oder eine Aufweichung bestehender Rollen-, Sperr- und Konfliktregeln.
- Vorschau-Mutation schlägt fehl: Toast anzeigen und Dialog nicht öffnen.
- Bestätigungs-Mutation schlägt fehl: Dialog bleibt offen, Fehlermeldung wird im Dialog angezeigt, Nutzer kann erneut versuchen oder abbrechen.
- Alle Einträge sind konfliktbehaftet: Bestätigen ist deaktiviert und eine erklärende InfoBox sichtbar.
- Teilweise Konflikte: Nur konfliktfreie Einträge sind vorausgewählt; Konflikte bleiben sichtbar und deaktiviert.
- Zurück-Navigation in mehrstufigen Flows ist nur zulässig, solange noch keine irreversible Mutation ausgeführt wurde.
- Codex muss vor Umsetzung klären, ob Mehrfach-Flows pro Schritt committen oder erst nach der finalen Gesamtbestätigung.

## Umsetzungshinweise

- Ausgangspunkte für die Analyse sind `TourEmployeeCascadeDialog.tsx`, `TourManagement.tsx`, `TourWeekForm.tsx`, `TourWeekPlanningView.tsx` sowie die vorhandenen Radix- und Shadcn-Dialog-Primitive.
- Die bestehende Preview-Mutation für betroffene Termine ist wiederzuverwenden, soweit sie fachlich passt.
- Serverseitige Re-Checks bleiben Pflicht, weil die Vorschau zwischen Anzeige und Bestätigung veralten kann.
- Historische Termine dürfen durch diese Dialogabläufe nicht berührt werden.
- Cache-Invalidierung nach Mutationen bleibt über die bestehenden `refreshCascadeDependentViews`-Pfade erhalten.
- Der bisherige Dialog darf während einer Migration bestehen bleiben; ein Big-Bang-Austausch ist nicht erforderlich.
- Betroffene Rollen sind mindestens `ADMIN` und `DISPONENT`.
- Erlaubte Sichtbarkeit: Nutzer dürfen nur Termine, Tour-Lanes, Mitarbeiter und Kalenderdaten sehen, die ihnen bereits nach bestehender Rollen- und Sichtbarkeitslogik zugänglich sind.
- Erlaubte Aktionen:
- `ADMIN` darf die bestehenden Tour-KW- und Terminänderungen im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `DISPONENT` darf aktuelle Tour-KW- und Terminänderungen im Rahmen der vorhandenen serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Aktionen über diese Dialoge ausführen.
- Technische Durchsetzung muss serverseitig erhalten bleiben. UI-Sperren und deaktivierte Checkboxen ersetzen keine Backend-Prüfung. Direkte API-Aufrufe, parallele Bearbeitung, Versionskonflikte, blockierte Tour-KWs, historische Sperren und Mitarbeiter-Overlap müssen weiterhin serverseitig abgesichert sein.
- FT-04-Konflikttypen sind ausdrücklich zu beachten: Typ-1 `KW-Tour-Unique`, also ein Mitarbeiter pro KW nur in einer Tour, und Typ-2 Termin-Überschneidung bei Mitarbeiterzuweisungen.
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
- Drag & Drop und Mark & Insert können die neue Basiskomponente verwenden, ohne eigene Dialog- oder Tourwechsel-Logik einzuführen.

## Blocker und offene Fragen

- Ohne Codeanalyse darf nicht entschieden werden, ob der bestehende `TourEmployeeCascadeDialog` erweitert oder durch eine neue Basiskomponente ersetzt wird.
- Ohne Codeanalyse darf nicht entschieden werden, ob Drag & Drop und Mark & Insert Varianten-Modi oder eigene Aufruf-Wrapper verwenden.
- Ohne Klärung des Commit-Zeitpunkts im Mehrfach-Flow darf keine Umsetzung erfolgen, die Zurück-Navigation nach bereits ausgeführten Teilmutationen suggeriert.
- Ohne belegte serverseitige Re-Checks darf keine Umsetzung erfolgen, die Preview-Ergebnisse als abschließende Berechtigung oder Konfliktprüfung behandelt.

---

## Beziehungen

- Features: FT-04 Tourenplanung · FT-03 Kalenderansichten · FT-01 Kalendertermine
- Use Cases: UC 04/13 - Mitarbeiter einer Tour-KW zuordnen · UC 01/03 - Termin verschieben · UC 01/05 - Tour einem Termin zuweisen · UC 01/15 - Optimistic Locking bei paralleler Bearbeitung
- Entscheidungen: —
- Weitere Bezüge: [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](termin-tour-kw-mutationsdialoge.md) · FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender · FT-03 Termin markieren und per Einfügen verschieben
