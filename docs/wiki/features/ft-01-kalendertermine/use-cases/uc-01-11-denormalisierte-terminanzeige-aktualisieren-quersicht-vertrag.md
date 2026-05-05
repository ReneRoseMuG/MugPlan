# UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Sichten, die Termin-Informationen denormalisiert anzeigen, nach Änderungen an Kunden- oder Projektdaten stets die aktuellen Werte ausliefern. Es darf nicht vorkommen, dass ein Termin in einer Kalender- oder Listenansicht noch veraltete Kunden- oder Projektnamen anzeigt, obwohl die Stammdaten bereits geändert wurden.

## Vorbedingungen

- Mindestens ein Termin existiert.
- Der Termin ist einem Kunden direkt zugeordnet (customer_id NOT NULL).
- Optional: Der Termin ist einem Projekt zugeordnet.
- Es existiert mindestens eine Sicht, die Kunden- oder Projektnamen denormalisiert ausliefert, zum Beispiel eine Kalender- oder Terminlisten-Projektion.

## Ablauf

1. Der Akteur ändert Stammdaten, die in Terminprojektionen angezeigt werden, zum Beispiel den Namen eines Projekts oder den Namen eines Kunden.
2. Das System speichert die Stammdatenänderung.
3. Das System stellt sicher, dass alle Sichten, die Termine denormalisiert ausliefern, bei der nächsten Abfrage die aktualisierten Namen liefern.
4. Das System zeigt in diesen Sichten keine veralteten Namen mehr an.

## Alternativen

- Abbruch: Der Akteur bricht die Stammdatenänderung ab. Es werden keine Änderungen gespeichert, und es darf keine Sicht einen veränderten Namen anzeigen.
- Fehler beim Speichern: Falls das Speichern der Stammdaten fehlschlägt, dürfen nachfolgende Terminprojektionen keine teilweise aktualisierten oder inkonsistenten Namen ausliefern.

## Ergebnis

Alle Terminprojektionen und Terminlisten, die Kunden- oder Projektnamen anzeigen, liefern die aktuellen Namen konsistent aus. Ein Termin zeigt in Kalender- und Listenansichten die aktuellen Kunden- und Projektinformationen. Der Kundenbezug ergibt sich direkt aus appointment.customer_id; der Projektbezug (sofern vorhanden) aus appointment.project_id.
