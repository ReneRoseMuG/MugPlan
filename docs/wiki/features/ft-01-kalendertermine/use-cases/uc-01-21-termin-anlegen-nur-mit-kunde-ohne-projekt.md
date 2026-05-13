# UC 01/21: Termin anlegen – Nur mit Kunde, ohne Projekt

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Einen neuen Termin direkt für einen Kunden anlegen, ohne ein Projekt zu wählen. Dieser Termin ist organisatorisch einem Kunden zugeordnet, aber keinem spezifischen Projekt. Dies ist eine vereinfachte Terminanlage für Ad-hoc-Aufträge oder Kundenaktivitäten ohne formales Projektkontext.

## Vorbedingungen

- Kunde existiert und ist aktiv (oder Admin kann auch inaktive sehen).
- Disponent/Administrator hat Berechtigung zur Terminanlage.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Tour existiert.

## Ablauf

1. Der Akteur klickt im Kalender auf einen „+"-Button (Termin anlegen). Das System öffnet das Terminformular.
2. Das System setzt das Startdatum auf den angeklickten Tag.
3. Der angeklickte „+“-Button gehörte optional zu einer Tour-Lane.
    1. Das System verknüpft den Termin mit dieser Tour. Wenn für die Kalenderwoche des Startdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und möglichen Konflikten. Nach Bestätigung werden die ausgewählten Mitarbeiter in die Mitarbeiterliste übernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt leer.
4. Der Akteur wählt einen Kunden (Pflichtfeld, Dropdown mit aktiven Kunden gemäß Rolle). Das System filtert serverseitig: Disponenten sehen nur aktive Kunden; Administratoren können auch inaktive Kunden sehen.
5. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
6. Der Akteur weist dem Termin optional eine Tour zu, falls nicht bereits durch Schritt 3 erfolgt (oder um die Tour zu ändern/entfernen). Siehe 3.a.
7. Der Akteur weist dem Termin optional ein Team zu.
8. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
9. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum. Mitarbeiter dürfen keine überschneidenden Termine haben. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt.
10. Falls dem Termin keine Mitarbeiter zugeordnet sind, zeigt das System im Termin-Speichern-Review den Schritt „Ohne Mitarbeiter speichern“ und verlangt eine bewusste Bestätigung.
11. Das System speichert den Termin mit `customer_id` (vom Akteur gewählt), `project_id = NULL`.
12. Das System zeigt den Termin im Kalender an, entweder mit Tourfarbe (falls zugeordnet) oder mit Standardfarbe.

## Alternativen

- **Überschneidung erkannt:** Das System blockiert den Vorgang und zeigt einen Konflikt an.
- **Abbruch:** Der Termin wird nicht gespeichert.
    - Es wird kein neuer Termin-Datensatz in der Datenbank angelegt.
    - Es werden keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter angelegt, auch dann nicht, wenn zwischenzeitlich Mitarbeiter im Formular ausgewählt wurden.
- **Speichern ohne Kundenzuordnung:** Der Akteur versucht zu speichern, ohne dass ein Kunde zugeordnet ist. Das System blockiert den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: „Kunde erforderlich – Termin kann nicht ohne Kundenkontext gespeichert werden."
- **Kunde ist inaktiv:** Falls Akteur einen inaktiven Kunden auswählen versucht und Disponent ist, wird das blockiert (serverseitige Filterung zeigt ihn nicht im Dropdown). Administratoren können inaktive Kunden auswählen.

## Ergebnis

Der Termin existiert persistent, ist einem Kunden zugeordnet, ist keinem Projekt zugeordnet (`project_id = NULL`). Der Termin ist im Kalender sichtbar (mit Standard- oder Tourfarbe, je nach Tourzuordnung). Der Termin ist fachlich gültig und vollständig. Die Mitarbeiterzuordnungen des Termins sind als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar.

Der Termin erscheint in der Kundenterminliste (in FT 09: Kundenverwaltung unter „Direkte Termine“). Der Termin erscheint nicht in einer Projektterminliste, da kein Projekt zugeordnet ist. Für alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste.
