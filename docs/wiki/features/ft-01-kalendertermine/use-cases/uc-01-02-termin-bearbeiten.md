# UC 01/02: Termin bearbeiten

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin ändern, ohne fachliche Inkonsistenzen zu erzeugen. Der Use Case umfasst Änderungen an Zeitraum und Uhrzeit, Änderungen der Kundenzuordnung, Änderungen der Projektzuordnung (mit Konsistenzprüfung), Änderungen der Tourzuordnung, das Übernehmen von Mitarbeitern über Tour oder Team als Einfügehilfe sowie manuelle Mitarbeiterzuweisungen und -entfernungen.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).
- **Rollenbasierte Datumsbeschränkung:** Disponenten dürfen nur nicht-historische Termine bearbeiten (Startdatum ≥ heute). Administratoren dürfen Termine unabhängig vom Startdatum bearbeiten.
- Der zum Termin gehörende Kunde existiert (ggf. inaktiv für Admin sichtbar).
- Optional: Projekt existiert und gehört zum gleichen Kunden wie der Termin.
- Optional: Tour existiert.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

## Ablauf

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
2. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
3. Der Akteur ändert optional die Kundenzuordnung des Termins.
    1. Das System zeigt eine Auswahl aktiver Kunden (für Disponenten) oder aller Kunden (für Administratoren).
    2. Der Akteur wählt einen anderen Kunden.
    3. Das System prüft: Wenn der Termin aktuell einem Projekt zugeordnet ist, und der neu gewählte Kundenwert unterscheidet sich vom Kunden des zugeordneten Projekts, blockiert das System die Kundenzuordnung mit Fehlermeldung: „Kundenwechsel nicht möglich – Der Termin ist einem Projekt zugeordnet, das zu einem anderen Kunden gehört. Bitte entfernen Sie zunächst die Projektzuordnung oder wählen Sie einen Kunden, dem das aktuelle Projekt zugeordnet ist."
    4. Falls der Termin kein Projekt hat oder der Kundenwert konsistent ist, aktualisiert das System die Kundenzuordnung.
4. Der Akteur ändert optional die Projektzuordnung des Termins oder entfernt die Projektzuordnung.
    1. Wenn eine neue Projekt-Zuordnung gewählt wird, prüft das System: Ist der Kundenwert des gewählten Projekts identisch mit dem aktuellen Kundenwert des Termins?
    2. Falls ja: Das System setzt die Projektzuordnung.
    3. Falls nein: Das System blockiert die Zuweisung mit Fehlermeldung: „Kundenmismatch – Das gewählte Projekt gehört zu einem anderen Kunden. Bitte wählen Sie ein Projekt desselben Kunden oder entfernen Sie die Projektzuordnung."
    4. Wenn die Projektzuordnung entfernt wird (Projekt auf NULL): Der Kundenwert des Termins bleibt unverändert.
5. Der Akteur weist dem Termin optional eine Tour zu oder ändert eine bereits verknüpfte Tour.
    1. Wenn eine Tour neu zugewiesen wird, prüft das System ob für die Kalenderwoche des Terminstartdatums in der Tour eine Wochenplanung hinterlegt ist. Wenn ja, öffnet sich sofort ein Vorschau-Dialog mit den geplanten Mitarbeitern und möglichen Konflikten. Nach Bestätigung werden die ausgewählten Mitarbeiter hinzugefügt. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverändert.
    2. Wenn die Tour gewechselt wird, prüft das System für die neue und die alte Tour/KW-Kombination ob Wochenplanungseinträge vorhanden sind. Wenn ja, zeigt das System vor dem Speichern einen Vorschau-Dialog: welche Mitarbeiter aus der alten Tour-KW entfernt werden, welche aus der neuen Tour-KW hinzugefügt werden, welche Konflikte bestehen, welche Mitarbeiter (manuell oder per Team zugewiesen) unverändert bleiben. Erst nach Bestätigung wird gespeichert.
6. Der Akteur entfernt optional eine Tourzuordnung.
    1. Das System löst die Tourverknüpfung am Termin. Die Mitarbeiter, welche der Tour zugewiesen sind, bleiben am Termin hängen und werden ausdrücklich nicht entfernt.
7. Der Akteur verwendet optional ein Team als Einfügehilfe.
    1. Das System übernimmt die Team-Mitarbeiter in die Mitarbeiterliste des Termins zusätzlich zu bereits vorhandenen Mitarbeitern.
    2. Das System speichert keine Teamzuordnung am Termin, sondern ausschließlich die konkrete Mitarbeiterliste.
8. Der Akteur weist optional weitere Mitarbeiter manuell zu oder entfernt einzelne Mitarbeiter manuell.
9. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt.
10. Das System speichert die Änderungen am Termin und aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- **Nicht authentifiziert:** HTTP 401.
- **Keine Berechtigung:** HTTP 403.
- **Historischer Termin (nur Disponent):** Wenn ein Disponent einen Termin mit Startdatum in der Vergangenheit zu ändern versucht, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren dürfen historische Termine ohne Einschränkung bearbeiten.
- **Überschneidung erkannt:** Das System blockiert das Speichern und zeigt einen Konflikt an, der den betroffenen Mitarbeiter und den kollidierenden Zeitraum verständlich benennt.
- **Abbruch:** Der Akteur bricht die Bearbeitung ab. Das System speichert keine Änderungen am Termin und es entstehen keine Teiländerungen, also insbesondere keine neuen oder gelöschten Einträge in der Join-Tabelle Termin–Mitarbeiter.
- **Speichern ohne Kundenzuordnung:** Falls der Akteur versucht zu speichern, ohne dass ein Kunde zugeordnet ist, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: „Kunde erforderlich – Termin kann nicht ohne Kundenkontext gespeichert werden."
- **Kundenmismatch bei Projektzuordnung:** Das System blockiert mit Fehlermeldung (siehe Punkt 4.3 oben).
- **Kundenwechsel mit bestehendem Projekt:** Das System blockiert mit Fehlermeldung (siehe Punkt 3.3 oben).

## Ergebnis

Der Termin ist mit den geänderten Daten gespeichert. Der Kundenwert des Termins ist direkt am Termin gespeichert und eindeutig. Das Projekt (falls zugeordnet) gehört zum gleichen Kunden – Konsistenz ist garantiert. Die Mitarbeiterzuordnungen sind als Einträge in der Join-Tabelle Termin–Mitarbeiter konsistent abrufbar, ohne Duplikate und ohne Teilzustände.

Die aktualisierten Termindaten sind in allen konsumierenden Sichten konsistent sichtbar. Das bedeutet, dass das Mitarbeiterformular den Termin in der Mitarbeiter-Terminliste für alle zugeordneten Mitarbeiter korrekt anzeigt, das Kundenformular den Termin in der Terminliste des Kunden anzeigt, dem der Termin direkt zugeordnet ist. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts (sofern vorhanden). Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, verschwindet der Termin entsprechend aus dieser Tour-Sicht.
