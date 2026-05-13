# UC 01/03: Termin verschieben

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin auf ein anderes Datum verschieben, ohne die Uhrzeit unbeabsichtigt zu verändern und ohne fachliche Inkonsistenzen oder Mitarbeiterüberschneidungen zu erzeugen. Der Use Case umfasst sowohl das Verschieben über das Terminformular als auch das Verschieben per Drag-and-drop im Kalender.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).
- **Rollenbasierte Datumsbeschränkung:** Disponenten dürfen Termine nicht in die Vergangenheit verschieben und können keine historischen Termine verschieben. Administratoren dürfen Termine auf beliebige Datumsangaben verschieben — einschließlich Vergangenheit.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Die zugehörigen Mitarbeiterzuordnungen sind vorhanden oder der Termin hat keine zugeordneten Mitarbeiter.
- Optional: Der Termin ist einer Tour zugeordnet.

## Ablauf

1. Der Akteur verschiebt den Termin auf einen anderen Tag, entweder über das Terminformular oder per Drag-and-drop im Kalender.
2. Wenn der Termin über das Terminformular verschoben wird, editiert der Akteur Startdatum und optional Enddatum.
3. Wenn der Termin per Drag-and-drop verschoben wird, verschiebt der Akteur den Termin im Kalender auf den gewünschten Tag.
    1. Das System darf dabei die bestehende Startuhrzeit nicht unbeabsichtigt verändern, sondern übernimmt die Uhrzeit unverändert.
4. Das System führt die Überschneidungsprüfung für alle dem Termin zugeordneten Mitarbeiter durch.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin nach dem Verschieben umfasst.
5. Eine evtl. vorhandene Tour Zuordnung bleibt erhalten. Das Verschieben des Termins per D&D auf eine andere Tour ist nicht möglich.
6. Wenn der Termin eigene Terminnotizen besitzt, zeigt das System vor dem Speichern einen Review-Schritt „Terminnotizen prüfen“. Der Akteur bestätigt, dass datum- oder uhrzeitbezogene Notizinhalte geprüft wurden.
7. Das System speichert den Termin mit dem neuen Datum beziehungsweise Zeitraum.
8. Das System aktualisiert die Kalenderansichten und alle relevanten Sichten, die den Termin anzeigen.

## Alternativen

- Überschneidung erkannt: Das System blockiert das Verschieben und zeigt einen Konflikt an. Der Termin bleibt unverändert auf dem ursprünglichen Datum, und es entstehen keine Teiländerungen an Termin oder Join-Einträgen.
- KW-Wechsel mit Wochenplanung: Wenn das Verschieben zu einem Wechsel der Kalenderwoche führt und für die alte oder neue Tour-KW-Kombination Wochenplanungseinträge vorhanden sind, zeigt das System vor dem Speichern einen Vorschau-Dialog: welche Mitarbeiter aus der alten KW entfernt werden, welche aus der neuen KW hinzugefügt werden, welche Konflikte bestehen, welche Mitarbeiter unverändert bleiben. Erst nach Bestätigung wird der Termin gespeichert. Bei Abbruch wird der Termin nicht verschoben.
- Terminnotiz-Prüfung nicht bestätigt: Wenn der Termin eigene Notizen besitzt und der Akteur die Prüfung nicht bestätigt, wird der Termin nicht gespeichert.
- Abbruch: Der Akteur bricht den Vorgang ab. Der Termin bleibt unverändert.
- Historischer Zeitraum (nur Disponent): Wenn ein Disponent einen Termin auf ein Datum in der Vergangenheit verschieben würde oder einen historischen Termin verschieben möchte, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY. Es wird nichts gespeichert. Administratoren dürfen Termine auf beliebige Datumsangaben — einschließlich Vergangenheit — verschieben.

## Ergebnis

Der Termin ist auf das neue Datum beziehungsweise den neuen Zeitraum verschoben und bleibt weiterhin fachlich gültig. Ein vorhandener Projektbezug bleibt erhalten; andernfalls bleibt der direkte Kundenbezug erhalten. Die Uhrzeit ist nach einem mausgesteuerten Verschieben unverändert geblieben. Alle Mitarbeiterzuordnungen bleiben konsistent als Einträge in der Join-Tabelle Termin–Mitarbeiter erhalten, sofern das Verschieben erfolgreich war.

Der Termin erscheint in der neuen Tages- beziehungsweise Wochen-Sicht und ist in der alten Sicht nicht mehr vorhanden. Für alle zugeordneten Mitarbeiter ist der Termin in der Mitarbeiter-Terminliste sichtbar, und wenn der Termin einer Tour zugeordnet ist, ist er auch in der Tour-Terminliste sichtbar.
