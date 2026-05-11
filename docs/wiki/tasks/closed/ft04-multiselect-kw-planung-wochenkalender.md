# FT-04 Multiselect für KW-Planung im Wochenkalender

Der Wochenkalender-Pfad zum Hinzufügen von Mitarbeitern zu einer KW-Planung soll eine Mehrfachauswahl anbieten. Anwender sollen mehrere Mitarbeiter in einem Schritt auswählen können, statt nur einzelne Mitarbeiter nacheinander hinzuzufügen. Im Wochenkalender-Pfad ist nach aktuellem Befund nur Einzelauswahl möglich. Für die Tour-KW-Planung existiert nach Nutzerhinweis vermutlich bereits eine Auswahlkomponente, die zwischen Board-Darstellung und Multiselect beziehungsweise Checked List umschalten kann. Diese vorhande.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Implementierung | 07.05.26 |

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

## Abschluss 11.05.26

Die Aufgabe ist umgesetzt. Der Wochenkalender kann mehrere Mitarbeiter für eine Tour-KW auswählen und über denselben mehrstufigen Ressourcenplanungsdialog verarbeiten. Die vorhandene Auswahlstruktur wird weiterverwendet; der Dialog sammelt die Vorschauen und führt bestätigte Änderungen erst nach finaler Bestätigung seriell aus.

`ADMIN` und `DISPONENT` behalten die bestehenden erlaubten Mutationspfade. `READER`/`LESER` erhält keine neue schreibende Aktion. Die serverseitigen Regeln für Rollen, Sperren, historische Grenzen, Tour-KW-Konflikte und Mitarbeiterüberschneidungen bleiben unverändert maßgeblich.

### Verifikation

- `npm run check`
- `npm run test:unit -- tests/unit/ui/tourManagement.versioning.test.tsx tests/unit/ui/tourEmployeeCascadeDialog.wiring.test.tsx tests/unit/ui/tourEmployeeCascadeDialog.selectionButtons.test.tsx`
- `npm run test:e2e:browser -- tests/e2e-browser/tour-week-form.browser.e2e.spec.ts tests/e2e-browser/calendar-week-tour-personnel-and-notes.browser.e2e.spec.ts`
- `git diff --check`

## Beziehungen

- Features: FT-04 Tourenplanung · FT-03 Kalenderansichten
- Use Cases: UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen: —
- Journal: [P01 Ressourcenplanung-Dialoge abgeschlossen](../../journal/11-05-26-p01-ressourcenplanung-dialoge-abgeschlossen.md)
- Weitere Bezüge: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](mitarbeiter-auswahl-dialogstruktur.md)
