# FT-04 Multiselect für KW-Planung im Wochenkalender

Der Wochenkalender-Pfad zum Hinzufügen von Mitarbeitern zu einer KW-Planung soll eine Mehrfachauswahl anbieten. Anwender sollen mehrere Mitarbeiter in einem Schritt auswählen können, statt nur einzelne Mitarbeiter nacheinander hinzuzufügen. Im Wochenkalender-Pfad ist nach aktuellem Befund nur Einzelauswahl möglich. Für die Tour-KW-Planung existiert nach Nutzerhinweis vermutlich bereits eine Auswahlkomponente, die zwischen Board-Darstellung und Multiselect beziehungsweise Checked List umschalten kann. Diese vorhande.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Implementierung | 07.05.26 |

---

## Ziel

Der Wochenkalender-Pfad zum Hinzufügen von Mitarbeitern zu einer KW-Planung soll eine Mehrfachauswahl anbieten. Anwender sollen mehrere Mitarbeiter in einem Schritt auswählen können, statt nur einzelne Mitarbeiter nacheinander hinzuzufügen.

## Ausgangslage

Im Wochenkalender-Pfad ist nach aktuellem Befund nur Einzelauswahl möglich. Für die Tour-KW-Planung existiert nach Nutzerhinweis vermutlich bereits eine Auswahlkomponente, die zwischen Board-Darstellung und Multiselect beziehungsweise Checked List umschalten kann. Diese vorhandene Struktur soll vor einer neuen Implementierung geprüft und bevorzugt wiederverwendet werden.

## Umfang

- Zur Aufgabe gehören:
- Wochenkalender-Pfad zum Hinzufügen von Mitarbeitern zu einer KW-Planung identifizieren
- bestehende Mitarbeiter-Auswahlkomponenten und Umschaltlogik zwischen Board und Multiselect prüfen
- Multiselect für den Wochenkalender-Pfad anbieten
- Auswahl mehrerer Mitarbeiter an den mehrstufigen Dialogfluss aus FT-04 mehrstufiger Tour-KW-Dialog anschließen
- Konflikte und nicht auswählbare Mitarbeiter sichtbar und verständlich behandeln
- bestehende Single-Select-Pfade erhalten, sofern sie fachlich weiter benötigt werden
- Nicht Teil der Aufgabe ist eine zweite unabhängige Dialog- oder Auswahlkomponente, wenn die vorhandene Board-/Checked-List-Komponente geeignet erweitert werden kann.

## Umsetzungshinweise

- FT-04 mehrstufiger Tour-KW-Dialog beschreibt den fachlichen Zielablauf für Mehrfach-Zuweisungen.
- Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren soll die Mitarbeiter-Auswahl-Komponente refaktorieren und an die spätere Dialogstruktur anbinden.
- Die Auswahl darf keine serverseitigen Tour-KW-, Rollen-, Historien- oder Konfliktregeln ersetzen.
- Vor Umsetzung ist zu prüfen, ob die vorhandene Komponente tatsächlich Board und Checked List rendern kann.
- Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.
- Erlaubte Aktionen:
- `ADMIN` und `DISPONENT` dürfen Mitarbeiter zur KW-Planung nur im Rahmen der bestehenden serverseitigen Regeln hinzufügen.
- `READER` darf keine Mitarbeiter zur KW-Planung hinzufügen.
- Der Multiselect darf keine neue Berechtigung eröffnen. Serverseitige Prüfung von Rollen, gesperrten Kalenderwochen, historischen Grenzen, Tour-KW-Konflikten und Mitarbeiterkonflikten bleibt Pflicht.

## Blocker und offene Fragen

- Vor Umsetzung muss die konkrete vorhandene Board-/Multiselect-Komponente im Code identifiziert werden.
- Es ist zu klären, ob der Wochenkalender-Pfad denselben Mutations- und Preview-Pfad wie die übrige Tour-KW-Planung nutzt.

---

## Beziehungen

- Features: FT-04 Tourenplanung · FT-03 Kalenderansichten
- Use Cases: UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen: —
- Weitere Bezüge: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](mitarbeiter-auswahl-dialogstruktur.md)
