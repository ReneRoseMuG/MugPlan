# UC 01/07: Mitarbeiter über Team zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur


## Ziel

Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen, indem ein Team als Einfügehilfe verwendet wird. Das Team selbst wird dabei nicht am Termin gespeichert, sondern nur die daraus resultierende konkrete Mitarbeiterliste des Termins.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Das Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur wählt ein Team als Einfügehilfe aus.
3. Das System übernimmt die Mitarbeiter des Teams in die Mitarbeiterliste des Termins.
4. Das System speichert keine Teamzuordnung am Termin, sondern ausschließlich die konkrete Mitarbeiterliste.
5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch die Team-Übernahme.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Team ohne Mitarbeiter: Falls das gewählte Team keine Mitarbeiter enthält, muss das System den Vorgang blockieren und eine eindeutige Fehlermeldung anzeigen.

## Ergebnis

Die Mitarbeiter des ausgewählten Teams sind dem Termin zugeordnet und als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Am Termin ist keine Teamzuordnung gespeichert, sondern ausschließlich die daraus resultierende Mitarbeiterliste.

Für alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Der Termin erscheint in den projektbezogenen Terminsichten und, sofern vorhanden, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.
