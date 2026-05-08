# Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren

Die Mitarbeiter-Auswahl-Komponente, die Board und Checked List rendern kann und dafür einen Toggle zum Umschalten bereitstellt, soll refaktoriert und in das Thema `Dialoge` eingegliedert werden. Nach Schaffung der Dialog-Basisstruktur aus FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente soll die Auswahlkomponente an diese Struktur angepasst werden, damit Mitarbeiterauswahl, Mehrfachauswahl und Dialogabläufe konsistent zusammenspielen. Nach Nutzerhinweis gibt es bereits eine Komponente, die zwischen Board-Darste.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Refactoring | 07.05.26 |

---

## Ziel

Die Mitarbeiter-Auswahl-Komponente, die Board und Checked List rendern kann und dafür einen Toggle zum Umschalten bereitstellt, soll refaktoriert und in das Thema `Dialoge` eingegliedert werden. Nach Schaffung der Dialog-Basisstruktur aus FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente soll die Auswahlkomponente an diese Struktur angepasst werden, damit Mitarbeiterauswahl, Mehrfachauswahl und Dialogabläufe konsistent zusammenspielen.

## Ausgangslage

Nach Nutzerhinweis gibt es bereits eine Komponente, die zwischen Board-Darstellung und Multiselect beziehungsweise Checked List wechseln kann. Diese Komponente ist fachlich relevant für Tour-KW-Mitarbeiterzuweisung und die künftigen Dialogflüsse. Ihr aktueller Zuschnitt muss analysiert werden, bevor sie refaktoriert oder in eine Dialogstruktur eingebunden wird.

## Umfang

- Zur Aufgabe gehören:
- vorhandene Mitarbeiter-Auswahl-Komponente im Code identifizieren
- prüfen, welche Board-, Checked-List- und Toggle-Funktionen bereits vorhanden sind
- Verantwortlichkeiten zwischen Auswahl, Darstellung, Dialog-Shell und Mutation sauber trennen
- Komponente für die Nutzung innerhalb der Dialog-Basisstruktur aus FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente vorbereiten
- Multiselect-Fälle für FT-04 mehrstufiger Tour-KW-Dialog und FT-04 Multiselect für KW-Planung im Wochenkalender unterstützen
- bestehende Aufrufstellen nur so weit anpassen, wie es für die neue Dialogstruktur erforderlich ist
- bestehende Bedienpfade erhalten, wenn sie fachlich weiter gültig sind
- Nicht Teil der Aufgabe ist ein freies UI-Redesign oder eine neue Auswahlkomponente ohne vorherigen Nachweis, dass die vorhandene Komponente ungeeignet ist.

## Umsetzungshinweise

- Die Aufgabe soll erst nach oder gemeinsam mit der Basisstruktur aus FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente umgesetzt werden.
- FT-04 Multiselect für KW-Planung im Wochenkalender ist ein konkreter Konsument des Refactorings.
- Auswahlzustand, Anzeigezustand und spätere Mutation dürfen nicht unnötig gekoppelt werden.
- Die Komponente soll keine serverseitigen Konflikt- oder Berechtigungsprüfungen ersetzen.
- Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.
- Erlaubte Aktionen:
- `ADMIN` und `DISPONENT` dürfen auswählbare Mitarbeiter nur in den bestehenden erlaubten Tour-KW-Aktionen verwenden.
- `READER` darf keine schreibenden Auswahlfolgen auslösen.
- Das Refactoring darf keine bisher gesperrten Mitarbeiter, Touren, Kalenderwochen oder Mutationsaktionen sichtbar oder ausführbar machen. Direkte API-Aufrufe und serverseitige Regeln bleiben maßgeblich.

## Blocker und offene Fragen

- Die konkrete Komponente muss vor Umsetzung im Code identifiziert werden.
- Es ist zu klären, ob Board und Checked List denselben Auswahlzustand oder getrennte Darstellungsmodelle verwenden.
- Ohne FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente darf keine finale Anpassung an eine Dialog-Shell behauptet werden.

---

## Beziehungen

- Features: FT-04 Tourenplanung
- Use Cases: UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen: —
- Weitere Bezüge: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [FT-04 Multiselect für KW-Planung im Wochenkalender](ft04-multiselect-kw-planung-wochenkalender.md)
