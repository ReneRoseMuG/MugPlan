# Projekt-Speichern-Dialog für Artikellistenprüfung und Saunatitel

Der Projekt-Speichern-Flow soll offene Artikellisten-Auswahlen erkennen und zusammen mit der möglichen Übernahme des Sauna-Modells als Projekttitel konsistent behandeln. Die Aufgabe bündelt diese Hinweise, damit beim Speichern kein doppelter Dialog entsteht und ein bereits geöffneter Dialog bei Bedarf als mehrstufiger Ablauf genutzt wird.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Dialoge | Implementierung | 10.05.26 |

---

## Ziel

Beim Speichern eines Projekts soll die App prüfen, ob in der Artikelliste Einträge mit dem sichtbaren Zustand "Nicht ausgewählt" vorhanden sind. Diese Information soll im Speichern-Dialog zusammengefasst werden und der bestehende Workflow zur Übernahme des Sauna-Modells als Projektname soll in denselben Speichern-Flow überführt werden.

## Ausgangslage

Der Sauna-Modell-Wechsel kann aktuell einen eigenen Projektnamen-Dialog auslösen. Zusätzlich soll künftig beim Speichern sichtbar werden, wenn Artikellisten-Einträge noch nicht ausgewählt sind, ohne dadurch mehrere nacheinanderliegende Dialoge zu erzeugen.

## Umfang

- Der Projekt-Speichern-Flow soll vor der Mutation erkennen, ob die Artikelliste Einträge mit dem Zustand "Nicht ausgewählt" enthält.
- Der Speichern-Dialog soll diese offenen Artikellisten-Einträge verständlich zusammenfassen, bevor das Projekt gespeichert wird.
- Der bestehende Workflow, den Projektnamen auf das gewählte Sauna-Modell zu setzen, soll in den Projekt-Speichern-Flow übernommen werden.
- Wenn bereits ein Dialog angezeigt wird und der Projekttitel-Flow fachlich ausgeführt werden kann, soll dieser Ablauf als eigener Schritt innerhalb desselben Dialogs behandelt werden.
- Doppelte Dialoge für denselben Speichern-Vorgang sind ausdrücklich zu vermeiden.
- Abbruchpfade müssen verhindern, dass eine teilweise bestätigte Dialogkette unbeabsichtigt speichert.
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition der Artikellisten-Datenstruktur oder der Produkt- und Komponentenverwaltung.

## Umsetzungshinweise

- Naheliegende Einstiegspunkte sind `client/src/components/ProjectForm.tsx`, vorhandene Artikellisten-Komponenten und die bestehenden Dialog-/Bestätigungsmuster aus dem Dialog-Rollout.
- Die vorhandene Sauna-Modell-Erkennung aus der strukturierten Artikelliste soll wiederverwendet werden, statt eine zweite Erkennung parallel aufzubauen.
- Der Ablauf soll als ein zusammenhängender Dialog- oder Stepper-Flow modelliert werden, wenn mehrere Hinweise oder Entscheidungen beim Speichern zusammentreffen.
- Bei der Umsetzung ist ausdrücklich zu prüfen, welche bestehenden Rollen Projekte sehen und speichern dürfen; reine UI-Sichtbarkeit darf nicht als Berechtigungsdurchsetzung gelten.
- Die serverseitige Projektmutation darf durch die UI-Dialogänderung keine neuen Rollen, Nebenpfade oder direkten API-Aufrufe freischalten.
- Tests sollen mindestens den Fall ohne offene Artikellisten-Einträge, den Fall mit "Nicht ausgewählt", den Sauna-Titel-Schritt und die Kombination beider Hinweise ohne doppelte Dialoge abdecken.

## Blocker und offene Fragen

Keine bekannt.

---

## Beziehungen

- Features: [FT-02 - Projekte](../features/ft-02-projekte/ft-02-projekte.md) · [FT-27 - Produktverwaltung und Auftragspositionen](../features/ft-27-produktverwaltung-und-auftragspositionen.md)
- Use Cases: UC 02/02 · UC 27/05
- Entscheidungen: —
- Weitere Bezüge: [Projekte- und Dokumentextraktion-Dialoge](projekte-und-dokumentextraktion-dialoge.md) · [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md)
