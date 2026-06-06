# Follow-up: Konfliktprüfung im finalen Terminformular-Speichern

Status: Offen  
Erfasst am: 06.06.26  
Kontext: Ressourcenplanung, Terminformular, finaler Speichern-Review

## Ausgangslage

Beim Speichern eines bestehenden Termins kann der finale Review-Dialog einen Mitarbeiter anzeigen, der bereits direkt am Termin hängt, im Zielzeitraum aber nicht mehr verfügbar ist. Der konkrete beobachtete Fall:

- Der Termin soll gespeichert werden.
- Ein Mitarbeiter ist auf dem Zieltag bereits durch einen ganztägigen Termin verplant.
- Derselbe Mitarbeiter ist aktuell noch am zu speichernden Termin eingetragen.
- Der Review-Dialog erkennt den Konflikt, stellt ihn aber als auswählbare Mitarbeiterentscheidung dar.

Das ist fachlich falsch. Ein Mitarbeiter, der wegen doppelter Planung nicht verfügbar ist, darf nicht optional am Termin bleiben. Die zwingende Aktion ist: Der Mitarbeiter muss beim Speichern aus diesem Termin entfernt werden.

## Aktuelles Fehlverhalten

Der Dialog zeigt aktuell einen Schritt mit dem Titel `Mitarbeiter`. Der sichtbare Infotext lautet sinngemäß, dass Wochenplanung vor dem Speichern geprüft werden soll und Mitarbeiter übernommen oder wegen Konflikten entfernt werden sollen.

Darunter wird der betroffene Mitarbeiter in einer Gruppe `Bereits direkt am Termin` dargestellt. Die Zeile enthält eine Checkbox und eine rote Konfliktmeldung mit dem Hinweis, dass Abwählen den Mitarbeiter beim Speichern entfernt.

Das führt zu mehreren Problemen:

- Der Schrittname beschreibt den fachlichen Vorgang nicht. Es geht nicht primär um Mitarbeiterübernahme, sondern um eine Konfliktprüfung.
- Der Infotext verweist auf Wochenplanung, obwohl im beschriebenen Fall die entscheidende Fachregel die doppelte Tagesplanung ist.
- Die Gruppierung `Bereits direkt am Termin` ist für einen nicht verfügbaren Mitarbeiter irreführend.
- Die Checkbox suggeriert eine freie Entscheidung, obwohl die Entfernung zwingend ist.
- Die Formulierung `Abwählen entfernt den Mitarbeiter beim Speichern` verlagert die Verantwortung auf den Nutzer, obwohl das System die Regel automatisch erzwingen muss.

## Fachliche Soll-Semantik

Ein aktueller Terminmitarbeiter mit Zielkonflikt ist kein auswählbarer Kandidat und kein optional zu bestätigender Mitarbeiter. Er ist ein zwingend zu entfernender Konfliktfall.

Die fachliche Regel lautet:

- Wenn ein Mitarbeiter im Zielzeitraum bereits anderweitig verplant ist, darf er nicht am zu speichernden Termin verbleiben.
- Bei ganztägiger Verplanung am selben Zieltag gilt der Mitarbeiter für diesen Zieltag als nicht verfügbar.
- Das System entfernt diesen Mitarbeiter automatisch aus der finalen Mitarbeiterliste.
- Der Nutzer bestätigt nicht, ob der Mitarbeiter entfernt wird, sondern nimmt die Konfliktprüfung zur Kenntnis.
- Wenn durch die Entfernung keine Mitarbeiter mehr am Termin verbleiben, folgt danach der vorhandene Schritt `Ohne Mitarbeiter`.

## Gewünschtes Dialogverhalten

Der betroffene Dialogschritt muss `Konfliktprüfung` heißen.

Der Infocontainer muss die folgende Nachricht zeigen:

> Mitarbeiter wegen doppelter Planung nicht verfügbar.

Der Mitarbeiter darf in diesem Fall nicht mit Checkbox dargestellt werden.

Statt der Gruppe `Bereits direkt am Termin` soll eine fachlich passende Konfliktgruppe erscheinen, zum Beispiel:

- `Nicht verfügbar`
- oder `Zwingend zu entfernen`

Die Mitarbeiterzeile soll den Mitarbeiter klar benennen und die zwingende Aktion sichtbar machen. Geeignete Formulierung:

> Wird beim Speichern vom Termin entfernt.

Nicht mehr erscheinen dürfen in diesem Fall:

- `Wochenplanung vor dem Speichern prüfen`
- `Bereits direkt am Termin`
- `Abwählen entfernt den Mitarbeiter beim Speichern`
- eine Checkbox für den Konfliktmitarbeiter

## Technische Ursache

Die serverseitige Preview liefert diesen Fall aktuell als aktuellen Terminmitarbeiter mit Konflikt:

- `source: "current"`
- `status: "conflict"`
- `conflictReason: "EMPLOYEE_OVERLAP"`
- aktuell noch auswählbar

Der Client interpretiert diesen Zustand im Speichern-Review als auswählbare Entscheidung. In der finalen Mitarbeiterberechnung wird der Mitarbeiter nur dann entfernt, wenn er nicht ausgewählt ist. Ist er ausgewählt, kann er in der berechneten Liste verbleiben, bis die finale serverseitige Konfliktprüfung den Speichervorgang blockiert.

Das ist ein Semantikfehler zwischen Preview und Review:

- `EMPLOYEE_OVERLAP` bei einem aktuellen Terminmitarbeiter beschreibt keine Option.
- Der Zustand beschreibt eine erzwungene Entfernung.
- Die finale Serverprüfung ist ein Sicherheitsnetz, darf aber nicht die primäre UX-Logik ersetzen.

## Umsetzungsvorschlag

### 1. Konfliktfall als Forced Removal modellieren

Der Fall `source=current` und `conflictReason=EMPLOYEE_OVERLAP` muss im Client zwingend als Entfernung behandelt werden.

Robuste Mindestregel im Client:

- Aktuelle Mitarbeiter mit `source === "current"` und `conflictReason === "EMPLOYEE_OVERLAP"` gelten als forced removal.
- Sie werden unabhängig von `selectedIds` aus der finalen `employeeIds`-Liste entfernt.
- Sie werden in der UI nicht auswählbar gerendert.

Saubere serverseitige Ergänzung:

- Die Preview sollte für diesen Fall nicht `selectable: true` liefern.
- Entweder bleibt `status: "conflict"` erhalten, aber der Client behandelt diesen Status eindeutig als nicht auswählbare Konfliktentfernung.
- Oder der Server liefert für aktuelle Konfliktmitarbeiter `status: "will_remove"` mit `conflictReason: "EMPLOYEE_OVERLAP"`, damit die zwingende Aktion bereits im Contract ausdrücklicher wird.

Die zweite Variante ist fachlich klarer, berührt aber den Preview-Contract stärker und muss mit den bestehenden Tests und allen Preview-Aufrufern abgeglichen werden.

### 2. Save-Review-Dialog fachlich trennen

Der Speichern-Review darf aktuelle Mitarbeiterkonflikte nicht in dieselbe Darstellungslogik wie optionale Wochenplanungsübernahmen stecken.

Empfohlene Darstellung:

- Wenn mindestens ein aktueller Mitarbeiter wegen `EMPLOYEE_OVERLAP` entfernt werden muss, heißt der Schritt `Konfliktprüfung`.
- Der Infocontainer zeigt exakt: `Mitarbeiter wegen doppelter Planung nicht verfügbar.`
- Forced-Removal-Mitarbeiter werden in einer eigenen Konfliktgruppe ohne Checkbox angezeigt.
- Optionale Wochenplanungsübernahmen bleiben nur dort auswählbar, wo sie fachlich wirklich optional sind.
- Nicht konfliktbehaftete aktuelle Mitarbeiter können, falls sie überhaupt angezeigt werden müssen, in einer separaten Gruppe `Bleiben am Termin` stehen.

### 3. Finale Mitarbeiterberechnung korrigieren

Die Funktion zur finalen Mitarbeiterauflösung muss unabhängig von der UI sicherstellen:

- Forced-Removal-Mitarbeiter werden aus der Liste entfernt.
- `selectedIds` darf forced removals nicht wieder hinzufügen.
- Bei additiver Auflösung bleiben konfliktfreie bestehende Mitarbeiter erhalten.
- Bei replace-Auflösung bleiben nur fachlich zulässige ausgewählte oder bereits korrekte Mitarbeiter erhalten.

Diese Regel muss clientseitig gelten, bevor der finale Speichern-Request abgesetzt wird.

Die serverseitige Prüfung gegen doppelte Mitarbeiterplanung bleibt zusätzlich verbindlich. Sie verhindert direkte API-Aufrufe, Deep Links, stale Dialogzustände und Race Conditions.

## Betroffene Codebereiche

Voraussichtlich betroffen:

- `client/src/components/AppointmentSaveReviewDialog.tsx`
  - Schrittlabel, Infocontainer, Gruppierung und Zeilendarstellung für aktuelle Konfliktmitarbeiter.
  - Checkbox-Unterdrückung für forced removals.

- `client/src/lib/resource-planning.ts`
  - Erkennung aktueller `EMPLOYEE_OVERLAP`-Konflikte als forced removal.
  - Finale `employeeIds`-Berechnung.
  - Default-Selektion darf keine forced removals enthalten.

- `server/services/tourWeekEmployeesService.ts`
  - Optional: Preview-Semantik serverseitig klarer setzen, mindestens `selectable: false` für aktuelle Konfliktmitarbeiter.

- `shared/routes.ts`
  - Nur betroffen, wenn die Preview-Contract-Semantik ausdrücklich angepasst oder erweitert wird.

- Tests unter `tests/unit` und `tests/integration`
  - UI-Rendering des Save-Review-Dialogs.
  - Resource-Planning-Helper.
  - Server-Preview für Terminformular-Tour-/KW-Änderungen.

## Rollen und Berechtigungen

Der Follow-up ändert keine fachlichen Rollen.

Betroffene Rollen:

- Admin und Dispatcher dürfen den Terminformular-Speicherworkflow ausführen, sofern die bestehenden Rechte dies erlauben.
- Leser dürfen keine Terminmutation ausführen.

Sichtbarkeit:

- Der Konfliktprüfungsdialog ist nur für Nutzer sichtbar, die den Speichern-Workflow überhaupt auslösen dürfen.

Ausführung:

- Die Entfernung des nicht verfügbaren Mitarbeiters erfolgt als Teil der bestehenden Terminmutation.
- Eine reine UI-Ausblendung reicht nicht aus.
- Die serverseitige finale Konfliktprüfung bleibt Pflicht.

Technische Durchsetzung:

- UI: zeigt den Konflikt korrekt und verhindert eine falsche Auswahl.
- Client-Logik: entfernt forced removals aus der finalen Mitarbeiterliste.
- Backend: blockiert weiterhin jede direkte oder konkurrierende Mutation, die eine doppelte Mitarbeiterplanung erzeugen würde.

## Abnahmekriterien

Der Follow-up gilt erst als umgesetzt, wenn diese Punkte erfüllt sind:

1. Der finale Speichern-Review zeigt bei aktuellem Mitarbeiter mit `EMPLOYEE_OVERLAP` den Schritt `Konfliktprüfung`.
2. Der Infocontainer zeigt exakt: `Mitarbeiter wegen doppelter Planung nicht verfügbar.`
3. Der betroffene Mitarbeiter erscheint nicht unter `Bereits direkt am Termin`.
4. Für den betroffenen Mitarbeiter gibt es keine Checkbox.
5. Die Zeile benennt die zwingende Aktion, zum Beispiel: `Wird beim Speichern vom Termin entfernt.`
6. Die finale Mitarbeiterliste enthält den Konfliktmitarbeiter nicht mehr.
7. Wenn dadurch kein Mitarbeiter übrig bleibt, folgt der Schritt `Ohne Mitarbeiter`.
8. Ein direkter API-Speicheraufruf mit doppelter Mitarbeiterplanung wird weiterhin serverseitig blockiert.
9. Bestehende optionale Wochenplanungsübernahmen bleiben dort auswählbar, wo sie wirklich optionale Übernahmen sind.
10. Bestehende Notiz-Review-Schritte bleiben unverändert.

## Testvorschlag

Unit-Tests:

- `resource-planning`:
  - Aktueller Mitarbeiter mit `source=current` und `conflictReason=EMPLOYEE_OVERLAP` wird aus `employeeIds` entfernt.
  - `selectedIds` kann diesen Mitarbeiter nicht wieder hinzufügen.
  - Konfliktfreie aktuelle Mitarbeiter bleiben erhalten.
  - Forced removals lösen weiterhin eine Review-Entscheidung aus.

- `AppointmentSaveReviewDialog`:
  - Schrittlabel `Konfliktprüfung`.
  - Infotext `Mitarbeiter wegen doppelter Planung nicht verfügbar.`
  - Keine Checkbox für forced-removal-Mitarbeiter.
  - Keine Gruppe `Bereits direkt am Termin` für diesen Fall.
  - Text `Abwählen entfernt den Mitarbeiter beim Speichern` erscheint nicht.
  - Nach Entfernung aller Mitarbeiter wird der Schritt `Ohne Mitarbeiter` erreicht.

Integrationstests:

- Terminformular-Preview mit ganztägigem Konflikt am Zieltag:
  - Preview markiert den aktuellen Mitarbeiter als nicht auswählbaren Konflikt oder als forced removal.
  - Speichern mit korrigierter finaler Mitarbeiterliste ist möglich, sofern keine weiteren fachlichen Blocker bestehen.
  - Speichern mit direkter doppelter Mitarbeiterplanung bleibt serverseitig blockiert.

Browser-E2E:

- Bestehenden Termin mit Mitarbeiter öffnen.
- Zieltag so ändern, dass derselbe Mitarbeiter dort bereits ganztägig verplant ist.
- Speichern auslösen.
- Dialog zeigt `Konfliktprüfung`, den exakten Infotext und keine Checkbox.
- Weiter führt bei leerer Mitarbeiterliste zu `Ohne Mitarbeiter`.
- Abschluss speichert den Termin ohne den konfliktbehafteten Mitarbeiter.

## Risiko und Schadenspotential

Schadenspotential: Mittel.

Begründung:

- Der betroffene Bereich liegt im Termin-Speicherworkflow und beeinflusst die finale Mitarbeiterliste.
- Eine falsche Umsetzung könnte Mitarbeiter unbeabsichtigt entfernen oder Konflikte fälschlich zulassen.
- Das Risiko wird begrenzt, wenn die Forced-Removal-Regel eng auf aktuelle Terminmitarbeiter mit `EMPLOYEE_OVERLAP` beschränkt wird und serverseitige Konfliktprüfung unverändert aktiv bleibt.

Nicht als rein kosmetische Änderung behandeln. Die UI-Texte sind sichtbar falsch, aber die eigentliche Ursache liegt in der fachlichen Interpretation der Preview-Daten.
