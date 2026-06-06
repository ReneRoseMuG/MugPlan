# Follow-up: Tour/KW-Übernahme am Zieltermin klar benennen

Status: Offen  
Erfasst am: 06.06.26  
Kontext: Ressourcenplanung, Terminformular, Tourwechsel mit Datumswechsel ohne Zielkonflikt

## Ausgangslage

Beim Bearbeiten eines Termins kann derselbe fachliche Ablauf auftreten wie im Konfliktfall `Tour/KW-Mitarbeiter am Zieldatum nicht übernehmbar`, nur ohne bestehende Doppelplanung am Ziel.

Beobachteter Fall:

- Der Termin hat aktuell keinen Mitarbeiter.
- Im Terminformular wird das Datum auf einen Tag in der Folgewoche geändert.
- Danach wird die Tour auf `Tour 1` geändert.
- Für `Tour 1` in der Zielwoche ist ein Mitarbeiter in der Tour/KW-Planung eingetragen.
- Am Zieltermin existiert kein anderer Termin, der diesen Mitarbeiter blockiert.
- Das System erkennt korrekt, dass die Wochenplanung von `Tour 1` in der Zielwoche ausgewertet werden muss.
- Der Mitarbeiter kann aus dieser Wochenplanung auf den Termin übernommen werden.

Das aktuelle Verhalten ist fachlich grundsätzlich richtig. Der Dialog benennt aber nicht klar genug, dass es um die Wochenplanung am Zieltermin beziehungsweise in der Ziel-KW geht.

## Fachliche Einordnung

Dieser Fall ist kein Konfliktfall und keine Entfernung eines bestehenden Terminmitarbeiters.

Hier gilt:

- Der Mitarbeiter hängt noch nicht am Termin.
- Der Mitarbeiter stammt aus der Tour/KW-Planung der Zielwoche.
- Der Datumswechsel bestimmt, welche Kalenderwoche fachlich relevant ist.
- Der Tourwechsel bestimmt, welche Tourplanung innerhalb dieser Zielwoche relevant ist.
- Das System schlägt den Mitarbeiter aus der passenden Wochenplanung für den Zieltermin vor.
- Weil keine Doppelplanung besteht, ist die Übernahme zulässig.

Die fachliche Aktion ist also:

> Mitarbeiter aus der Wochenplanung der Ziel-Tour und Ziel-KW auf den Termin übernehmen.

## Aktuelles Dialogproblem

Der Dialog zeigt aktuell den Titel `Tourwechsel` und eine Gruppe `TOUR-KW-MITARBEITER`. Die Zeile des Mitarbeiters enthält den Text:

> Kann aus der Wochenplanung übernommen werden

Das ist nicht falsch, aber zu unspezifisch. Der Nutzer sieht nicht eindeutig:

- dass die Wochenplanung der neuen Tour ausgewertet wurde,
- dass die Folgewoche beziehungsweise Ziel-KW gemeint ist,
- dass sich die Übernahme auf den Zieltermin bezieht,
- warum der Mitarbeiter gerade jetzt vorgeschlagen wird.

Gerade nach einem kombinierten Datums- und Tourwechsel muss der Dialog die Ziel-Semantik ausdrücklich machen. Sonst wirkt der Vorschlag wie eine allgemeine Wochenplanungsübernahme, nicht wie das Ergebnis der konkreten Zieltermin-Prüfung.

## Gewünschtes Dialogverhalten

Der Dialogtitel kann weiter den Einstiegskontext `Tourwechsel` anzeigen. Im Inhaltsbereich muss aber klar benannt werden, dass die Wochenplanung am Zieltermin beziehungsweise für die Ziel-KW angewendet wird.

Empfohlener Infotext:

> Mitarbeiter aus der Wochenplanung am Zieltermin können übernommen werden.

Alternativ, wenn die Ziel-KW stärker betont werden soll:

> Mitarbeiter aus der Wochenplanung der Ziel-KW können am Zieltermin übernommen werden.

Die zweite Variante ist fachlich präziser, wenn der Dialog sichtbar Tour und KW verarbeitet. Die erste Variante ist kürzer und direkt am Nutzerfall orientiert.

Empfohlene Gruppenüberschrift:

> Übernehmbar aus Wochenplanung am Zieltermin

Alternativ:

> Übernehmbar aus Tour/KW-Planung

Die Mitarbeiterzeile soll deutlicher formulieren:

> Wird aus der Wochenplanung am Zieltermin übernommen.

oder:

> Kann aus der Wochenplanung am Zieltermin übernommen werden.

Wenn der Mitarbeiter vorausgewählt ist, soll die Zeile sichtbar machen, dass die Übernahme beim Bestätigen erfolgt. Eine Checkbox ist in diesem konfliktfreien Fall fachlich zulässig, solange sie tatsächlich eine optionale Übernahme bedeutet.

## Abgrenzung zum Konfliktfall

Dieser Follow-up beschreibt die konfliktfreie Variante.

Abgrenzung:

- `source=week_plan` und `status=will_add`: Mitarbeiter ist aus der Wochenplanung am Zieltermin übernehmbar.
- `source=week_plan` und `conflictReason=EMPLOYEE_OVERLAP`: Mitarbeiter stammt aus der Wochenplanung, ist am Zieldatum aber blockiert und darf nicht übernommen werden.
- `source=current` und `conflictReason=EMPLOYEE_OVERLAP`: aktueller Terminmitarbeiter muss entfernt werden.

Diese Fälle dürfen im Dialog nicht dieselbe Copy verwenden.

## Umsetzungsvorschlag

### 1. Zielkontext im Dialogtext sichtbar machen

Für `week_plan + will_add` im Tourwechsel-/Datumswechsel-Kontext soll der Text explizit auf den Zieltermin verweisen.

Empfohlene Copy:

- Infotext: `Mitarbeiter aus der Wochenplanung am Zieltermin können übernommen werden.`
- Gruppe: `Übernehmbar aus Wochenplanung am Zieltermin`
- Zeile: `Kann aus der Wochenplanung am Zieltermin übernommen werden.`

Wenn mehrere Mitarbeiter angezeigt werden, bleibt die Pluralform des Infotexts passend.

### 2. Tour/KW-Kontext optional ergänzen

Wenn der Dialog bereits Tourname und KW kennt, kann die Information kompakt ergänzt werden, ohne den Dialog zu überladen.

Beispiel:

> Wochenplanung am Zieltermin: Tour 1 / KW 24

Dabei muss der Tourname unverändert verwendet werden. Wenn die Tour bereits `Tour 1` heißt, darf kein zusätzliches `Tour ` davor gesetzt werden.

### 3. Checkbox nur bei echter Option

Im konfliktfreien Fall kann eine Checkbox sinnvoll sein, wenn der Nutzer entscheiden darf, ob der vorgeschlagene Wochenplan-Mitarbeiter übernommen wird.

Die Checkbox darf aber nur erscheinen, wenn:

- der Mitarbeiter konfliktfrei ist,
- die Übernahme fachlich optional ist,
- `selectedIds` diese Entscheidung tatsächlich steuert.

Sie darf nicht verwendet werden, wenn der Mitarbeiter blockiert oder zwingend zu entfernen ist.

### 4. Folge `Ohne Mitarbeiter` korrekt ableiten

Wenn der Nutzer alle optionalen Wochenplan-Mitarbeiter abwählt und dadurch keine Mitarbeiter am Termin verbleiben, muss weiterhin der Schritt `Ohne Mitarbeiter` folgen.

Das ist kein Fehler, sondern die logische Folge einer optionalen Nicht-Übernahme.

## Betroffene Codebereiche

Voraussichtlich betroffen:

- `client/src/components/AppointmentMoveDialog.tsx`
  - Copy für den Tourwechsel-Dialog bei `week_plan + will_add`.

- `client/src/components/AppointmentSaveReviewDialog.tsx`
  - Analoge Copy im finalen Speichern-Review des Terminformulars.

- `client/src/components/ResourcePlanningDialog.tsx`
  - Falls der gemeinsame Preview-Renderer für diese Darstellung verwendet wird.

- `client/src/lib/resource-planning.ts`
  - Nicht primär für die Copy, aber relevant zur Abgrenzung zwischen übernehmbaren und blockierten `week_plan`-Mitarbeitern.

## Rollen und Berechtigungen

Der Follow-up ändert keine Rollen.

Betroffene Rollen:

- Admin und Dispatcher dürfen den Terminformular-Speicherworkflow nutzen, sofern die bestehenden Rechte dies erlauben.
- Leser dürfen keine Terminmutation ausführen.

Sichtbarkeit:

- Der Dialog ist nur für Nutzer sichtbar, die die Terminänderung auslösen dürfen.

Ausführung:

- Die Übernahme aus der Wochenplanung bleibt Teil der bestehenden Terminmutation.
- Server-Validierungen bleiben verbindlich, besonders die finale Prüfung gegen doppelte Mitarbeiterplanung.

## Abnahmekriterien

Der Follow-up gilt als umgesetzt, wenn:

1. Der konfliktfreie Tour/KW-Mitarbeiter aus der Zielwoche wird weiterhin korrekt vorgeschlagen.
2. Der Dialog benennt sichtbar, dass die Wochenplanung am Zieltermin oder in der Ziel-KW ausgewertet wurde.
3. Der Infotext enthält den Begriff `Zieltermin`.
4. Die Gruppenüberschrift unterscheidet übernehmbare Wochenplan-Mitarbeiter von blockierten Konfliktfällen.
5. Die Zeile des Mitarbeiters sagt nicht nur `Kann aus der Wochenplanung übernommen werden`, sondern enthält `Zieltermin` oder einen gleichwertigen Zielkontext.
6. Die Checkbox bleibt nur bei konfliktfreien, optional übernehmbaren Mitarbeitern sichtbar.
7. Blockierte Tour/KW-Mitarbeiter verwenden weiterhin die Konfliktcopy aus dem separaten Follow-up.
8. Bei Abwahl aller optionalen Mitarbeiter folgt der Schritt `Ohne Mitarbeiter`, falls keine Mitarbeiter übrig bleiben.
9. Der Tourname wird unverändert angezeigt, ohne zusätzliches `Tour `-Präfix.
10. Die finale serverseitige Konfliktprüfung bleibt unverändert aktiv.

## Testvorschlag

Unit-Tests:

- Dialog-Rendering mit `week_plan + will_add`:
  - Infotext enthält `Zieltermin`.
  - Gruppenüberschrift enthält Zielkontext.
  - Mitarbeiterzeile enthält Zielkontext.
  - Checkbox ist sichtbar, wenn der Mitarbeiter konfliktfrei und optional übernehmbar ist.

- Abgrenzung zu `week_plan + EMPLOYEE_OVERLAP`:
  - blockierter Mitarbeiter erhält keine Checkbox.
  - blockierter Mitarbeiter erhält Konfliktcopy mit Zieldatum.
  - konfliktfreier Mitarbeiter erhält Übernahmecopy mit Zieltermin.

Integrationstest:

- Termin ohne Mitarbeiter bearbeiten.
- Datum auf Folgewoche ändern.
- Tour auf eine Tour mit Wochenplanung in der Ziel-KW ändern.
- Kein Konflikt am Zieltermin.
- Preview liefert `week_plan + will_add`.
- Dialog benennt Wochenplanung am Zieltermin.
- Bestätigen übernimmt den Mitarbeiter auf den Termin.

Browser-E2E:

- Den beschriebenen Ablauf im Terminformular ausführen.
- Dialog zeigt `Tourwechsel`.
- Dialoginhalt benennt Wochenplanung am Zieltermin.
- Mitarbeiter ist vorausgewählt und kann übernommen werden.
- Nach Bestätigung wird der Mitarbeiter am Termin gespeichert.

## Risiko und Schadenspotential

Schadenspotential: Niedrig bis mittel.

Begründung:

- Die gewünschte Änderung ist primär eine fachlich präzisere Dialogcopy.
- Die bestehende Übernahme scheint im beschriebenen Fall korrekt zu funktionieren.
- Risiko entsteht vor allem, wenn die Copy-Änderung mit Konfliktlogik vermischt wird oder Checkbox-Regeln zu breit geändert werden.
- Deshalb muss diese konfliktfreie Variante klar vom blockierten Tour/KW-Fall getrennt bleiben.

Dieser Follow-up ist dennoch wichtig, weil der Dialog nach Datums- und Tourwechsel erklären muss, warum genau dieser Mitarbeiter vorgeschlagen wird: Er stammt aus der Wochenplanung am Zieltermin.
