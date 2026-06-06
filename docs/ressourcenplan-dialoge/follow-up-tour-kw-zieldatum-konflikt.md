# Follow-up: Tour/KW-Mitarbeiter am Zieldatum nicht übernehmbar

Status: Offen  
Erfasst am: 06.06.26  
Kontext: Ressourcenplanung, Terminformular, Tourwechsel mit Datumswechsel

## Ausgangslage

Beim Bearbeiten eines Termins kann ein Sonderfall auftreten, der fachlich korrekt erkannt wird, im Dialog aber nicht klar genug benannt ist.

Beobachteter Fall:

- Der Termin hat aktuell keinen Mitarbeiter.
- Im Terminformular wird das Datum auf einen Tag in der Folgewoche geändert.
- Danach wird die Tour auf `Tour 1` geändert.
- Für `Tour 1` in der Zielwoche ist ein Mitarbeiter in der Tour/KW-Planung eingetragen.
- Am Zieldatum existiert bereits ein ganztägiger Termin mit genau diesem Mitarbeiter.

Das System wertet offenbar korrekt die Tour/KW-Planung der Zielwoche aus. Es versucht also, den für `Tour 1` und die Ziel-KW geplanten Mitarbeiter als Vorschlag auf den geänderten Termin zu übernehmen. Diese Übernahme ist aber nicht möglich, weil der Mitarbeiter am Zieldatum bereits ganztägig verplant ist.

## Fachliche Einordnung

Dieser Fall unterscheidet sich vom Konflikt eines bereits direkt am Termin eingetragenen Mitarbeiters.

Hier gilt:

- Der Mitarbeiter hängt noch nicht am Termin.
- Er kommt aus der Tour/KW-Planung der Zielwoche.
- Das System versucht richtigerweise, ihn als geplanten Tour/KW-Mitarbeiter auf den Termin anzuwenden.
- Die Übernahme scheitert, weil am Zieldatum bereits eine ganztägige Verplanung besteht.
- Der Mitarbeiter darf deshalb nicht auswählbar sein.
- Wenn kein anderer konfliktfreier Mitarbeiter verfügbar ist, bleibt der Termin nach dieser Entscheidung ohne Mitarbeiter.

Das ist kein Fall von `Mitarbeiter vom Termin entfernen`, sondern ein Fall von `Tour/KW-Mitarbeiter kann nicht übernommen werden`.

## Aktuelles Fehlverhalten im Dialog

Der Dialog zeigt den Schritt unter dem Titel `Tourwechsel`. Darunter erscheint eine Gruppe `TOUR-KW-MITARBEITER`. Der betroffene Mitarbeiter wird mit Checkbox und der Meldung `Überschneidung mit bestehendem Termin` angezeigt.

Diese Darstellung ist missverständlich:

- Die Checkbox suggeriert, der Mitarbeiter könne ausgewählt werden.
- Die Gruppe `TOUR-KW-MITARBEITER` erklärt nicht, warum der Mitarbeiter nicht übernommen werden kann.
- Die Meldung `Überschneidung mit bestehendem Termin` ist technisch richtig, aber für den Nutzer zu unpräzise.
- Der Dialog benennt nicht, dass die Übernahme aus der Tour/KW-Planung am Zieldatum scheitert.
- Der Nutzer erkennt nicht, ob der Termin danach ohne Mitarbeiter gespeichert wird oder ob noch eine echte Auswahlentscheidung offen ist.

## Gewünschtes Dialogverhalten

Der Dialogschritt soll als Konfliktprüfung verstanden und sichtbar entsprechend benannt werden.

Empfohlener Schrittname:

> Konfliktprüfung

Der Infocontainer soll den Begriff `Zieldatum` ausdrücklich enthalten.

Empfohlener Infotext:

> Mitarbeiter aus der Tour/KW-Planung sind am Zieldatum wegen doppelter Planung nicht verfügbar.

Wenn nur ein Mitarbeiter betroffen ist, ist auch diese Variante fachlich passend:

> Mitarbeiter aus der Tour/KW-Planung ist am Zieldatum wegen doppelter Planung nicht verfügbar.

Für die UI ist eine einheitliche Pluralform vermutlich robuster, weil der Dialog auch mehrere nicht verfügbare Tour/KW-Mitarbeiter anzeigen kann.

Die Gruppe `TOUR-KW-MITARBEITER` soll für diesen Konfliktfall nicht als normale Auswahlgruppe erscheinen. Geeignete Gruppenüberschrift:

> Nicht übernehmbar aus Tour/KW-Planung

Die Mitarbeiterzeile soll keine Checkbox enthalten. Geeignete Zeilentexte:

> Kann nicht übernommen werden.

und ergänzend:

> Am Zieldatum besteht bereits eine ganztägige Planung.

Alternativ als ein Satz:

> Kann nicht übernommen werden, da am Zieldatum bereits eine ganztägige Planung besteht.

## Zwingende Aktion

Die zwingende Aktion ist nicht das Entfernen eines bestehenden Terminmitarbeiters, sondern das Nicht-Übernehmen des Tour/KW-Mitarbeiters.

Das bedeutet:

- Der Mitarbeiter wird nicht in die finale Mitarbeiterliste des Termins aufgenommen.
- Eine Checkbox ist nicht sinnvoll.
- `selectedIds` darf diesen Mitarbeiter nicht wieder hinzufügen.
- Wenn keine weiteren konfliktfreien Mitarbeiter vorhanden sind, muss der Workflow danach den Schritt `Ohne Mitarbeiter` anzeigen.
- Der Nutzer bestätigt nicht die Auswahl dieses Mitarbeiters, sondern nimmt zur Kenntnis, dass die automatische Tour/KW-Übernahme am Zieldatum nicht möglich ist.

## Technische Ursache

Die Preview liefert für diesen Fall voraussichtlich einen Eintrag mit:

- `source: "week_plan"`
- `status: "conflict"`
- `conflictReason: "EMPLOYEE_OVERLAP"`
- Mitarbeiter stammt aus der Tour/KW-Planung der Zielwoche

Der Dialog behandelt diesen Eintrag aktuell zu ähnlich wie einen auswählbaren Tour/KW-Mitarbeiter. Das ist für konfliktfreie `will_add`-Einträge korrekt, aber für `EMPLOYEE_OVERLAP` falsch.

Die Semantik muss getrennt werden:

- `source=week_plan` und `status=will_add`: Mitarbeiter kann aus Tour/KW übernommen werden.
- `source=week_plan` und `conflictReason=EMPLOYEE_OVERLAP`: Mitarbeiter stammt aus Tour/KW, ist am Zieldatum aber blockiert und darf nicht übernommen werden.
- `source=current` und `conflictReason=EMPLOYEE_OVERLAP`: aktueller Terminmitarbeiter muss entfernt werden.

Diese drei Fälle brauchen unterschiedliche Texte und unterschiedliche Aktionen.

## Umsetzungsvorschlag

### 1. Konfliktkategorie für blockierte Tour/KW-Mitarbeiter einführen

Im Client sollte ein Helper erkennen:

- `item.source === "week_plan"`
- `item.status === "conflict"`
- `item.conflictReason === "EMPLOYEE_OVERLAP"`

Dieser Fall ist ein blockierter Übernahmevorschlag.

Folgen:

- keine Checkbox
- keine Aufnahme in die finale Mitarbeiterliste
- Darstellung in eigener Konfliktgruppe
- Dialogcopy mit Zieldatum

### 2. Dialogschritt fachlich umbenennen

Wenn der Schritt ausschließlich oder wesentlich aus blockierten Übernahmevorschlägen besteht, soll er nicht wie eine normale Mitarbeiterentscheidung wirken.

Statt `Tourwechsel` oder nur `Mitarbeiter` sollte im Schrittbereich `Konfliktprüfung` sichtbar sein.

Der Dialogtitel selbst kann weiter den Einstiegskontext beschreiben, also zum Beispiel `Tourwechsel`. Der Schrittinhalt muss aber klar sagen, dass eine Konfliktprüfung stattfindet.

### 3. Ohne-Mitarbeiter-Folge sicherstellen

Wenn der Termin vor dem Wechsel keine Mitarbeiter hatte und alle Tour/KW-Vorschläge am Zieldatum blockiert sind, ist die resultierende Mitarbeiterliste leer.

Dann muss nach der Konfliktprüfung der bestehende Schritt `Ohne Mitarbeiter` folgen.

Das ist wichtig, weil der Nutzer sonst nicht erkennt, dass der Termin nach dem Speichern ohne Mitarbeiter bleibt.

### 4. Serverprüfung unverändert als Sicherheitsnetz behalten

Auch wenn die UI den blockierten Tour/KW-Mitarbeiter nicht auswählbar macht, bleibt die serverseitige Prüfung gegen doppelte Mitarbeiterplanung Pflicht.

Sie schützt vor:

- direkten API-Aufrufen
- veralteten Dialogzuständen
- parallelen Änderungen
- Race Conditions zwischen Preview und Speichern

## Betroffene Codebereiche

Voraussichtlich betroffen:

- `client/src/components/AppointmentMoveDialog.tsx`
  - Darstellung des Tourwechsel-/Move-Dialogs, wenn blockierte Tour/KW-Mitarbeiter in der Preview enthalten sind.

- `client/src/components/AppointmentSaveReviewDialog.tsx`
  - Analoge Darstellung im finalen Speichern-Review des Terminformulars.

- `client/src/components/ResourcePlanningDialog.tsx`
  - Falls derselbe Preview-Renderer für Wochenplanungs-/Appointment-Varianten genutzt wird.

- `client/src/lib/resource-planning.ts`
  - Finale Auswahlberechnung: blockierte Tour/KW-Mitarbeiter dürfen nie in `employeeIds` landen.
  - Default-Selektion: blockierte Tour/KW-Mitarbeiter dürfen nicht vorausgewählt werden.

- `server/services/tourWeekEmployeesService.ts`
  - Optional prüfen, ob die Preview `selectable: false` für `EMPLOYEE_OVERLAP` aus Tour/KW bereits zuverlässig liefert.

## Rollen und Berechtigungen

Der Follow-up ändert keine Rollen.

Betroffene Rollen:

- Admin und Dispatcher dürfen den Terminformular-Speicherworkflow nutzen, sofern die bestehenden Rechte dies erlauben.
- Leser dürfen keine Terminmutation ausführen.

Sichtbarkeit:

- Der Konfliktprüfungsdialog ist nur für Nutzer sichtbar, die die zugrunde liegende Terminänderung auslösen dürfen.

Ausführung:

- Die Nicht-Übernahme des blockierten Tour/KW-Mitarbeiters ist Teil der bestehenden Terminmutation.
- Die serverseitige Konfliktprüfung bleibt die verbindliche Durchsetzung gegen doppelte Planung.

## Abnahmekriterien

Der Follow-up gilt als umgesetzt, wenn:

1. Ein Tour/KW-Mitarbeiter mit `EMPLOYEE_OVERLAP` am Zieldatum nicht mit Checkbox erscheint.
2. Der Dialog zeigt den Schrittinhalt als `Konfliktprüfung`.
3. Der Infotext enthält den Begriff `Zieldatum`.
4. Der empfohlene Infotext oder eine fachlich gleichwertige Variante erscheint: `Mitarbeiter aus der Tour/KW-Planung sind am Zieldatum wegen doppelter Planung nicht verfügbar.`
5. Die Gruppe `TOUR-KW-MITARBEITER` wird für blockierte Übernahmevorschläge nicht als normale Auswahlgruppe verwendet.
6. Die Zeile erklärt, dass der Mitarbeiter nicht übernommen werden kann.
7. Der Mitarbeiter wird nicht in die finale Mitarbeiterliste aufgenommen.
8. Wenn keine Mitarbeiter übrig bleiben, folgt der Schritt `Ohne Mitarbeiter`.
9. Konfliktfreie Tour/KW-Mitarbeiter bleiben weiterhin auswählbar oder vorausgewählt, wie es die bestehende Fachlogik vorsieht.
10. Die serverseitige finale Konfliktprüfung bleibt aktiv und blockiert direkte doppelte Planung.

## Testvorschlag

Unit-Tests:

- Resource-Planning-Helper:
  - `week_plan + EMPLOYEE_OVERLAP` wird nicht in die finale `employeeIds`-Liste aufgenommen.
  - `selectedIds` kann einen blockierten Tour/KW-Mitarbeiter nicht erzwingen.
  - Konfliktfreie `week_plan + will_add`-Mitarbeiter bleiben weiterhin übernehmbar.

- Dialog-Rendering:
  - blockierter Tour/KW-Mitarbeiter erscheint ohne Checkbox.
  - Infotext enthält `Zieldatum`.
  - Gruppe heißt nicht `TOUR-KW-MITARBEITER`, sondern konfliktbezogen.
  - Zeile enthält einen Nicht-Übernahme-Hinweis.

Integrationstest:

- Termin ohne Mitarbeiter bearbeiten.
- Datum auf Folgewoche ändern.
- Tour auf eine Tour ändern, die in der Ziel-KW einen Mitarbeiter geplant hat.
- Am Zieldatum existiert bereits ein Ganztagestermin mit diesem Mitarbeiter.
- Preview liefert den Mitarbeiter als blockierten Tour/KW-Vorschlag.
- Speichern führt nicht zu doppelter Planung und lässt den Termin ohne diesen Mitarbeiter.

Browser-E2E:

- Den beschriebenen Ablauf im Terminformular durchspielen.
- Dialog zeigt `Konfliktprüfung`.
- Infotext enthält `Zieldatum`.
- Kein Checkbox-Control für den blockierten Tour/KW-Mitarbeiter.
- Danach erscheint, falls keine Mitarbeiter übrig sind, `Ohne Mitarbeiter`.

## Risiko und Schadenspotential

Schadenspotential: Mittel.

Begründung:

- Die Änderung betrifft die automatische Übernahme von Tour/KW-Mitarbeitern in Terminmutationen.
- Eine zu breite Regel könnte konfliktfreie Tour/KW-Mitarbeiter fälschlich blockieren.
- Eine zu schmale Regel könnte den bestehenden missverständlichen Dialogfall bestehen lassen.
- Das Risiko wird begrenzt, wenn die neue Darstellung eng auf `source=week_plan` mit `conflictReason=EMPLOYEE_OVERLAP` beschränkt wird und die serverseitige Konfliktprüfung unverändert aktiv bleibt.

Der Fall ist nicht rein kosmetisch. Die sichtbare Copy ist falsch, aber die eigentliche Korrektur liegt in der Trennung zwischen übernehmbaren Tour/KW-Mitarbeitern und am Zieldatum blockierten Tour/KW-Vorschlägen.
