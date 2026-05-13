# Termine – Disponent

Ein Termin ist die zentrale Planungseinheit in MugPlan. Jeder Termin ist einem Auftrag (Projekt) und damit einem Kunden zugeordnet. Mitarbeiter und Touren werden am Termin hinterlegt.

---

## Fragen & Antworten

### Wo lege ich einen neuen Termin an?

Es gibt zwei gleichwertige Einstiegspunkte:

1. **Im Kalender** — über die Schaltfläche zum Anlegen eines neuen Termins direkt in der Kalenderansicht. Danach wird dem Termin ein Auftrag oder ein Kunde zugewiesen.
2. **Im Auftrag (Projekt)** — innerhalb eines geöffneten Auftrags kann direkt ein neuer Termin angelegt werden. Auftrag und Kunde sind dann bereits zugeordnet.

Ein Termin ist erst gültig, wenn ihm ein Auftrag oder mindestens ein Kunde zugeordnet ist.

---

### Was muss ich angeben, wenn ich einen Termin anlege?

Pflichtangabe ist ein Datum und entweder ein Auftrag oder ein Kunde. Alle weiteren Felder sind optional:

- **Enddatum** — für Termine, die mehrere Tage umfassen
- **Uhrzeit** — wenn der Termin nicht als ganztägig gelten soll
- **Tour** — zur organisatorischen Einordnung
- **Mitarbeiter** — einzeln oder über ein Team

---

### Wie weise ich einem Termin Mitarbeiter zu?

Mitarbeiter können auf zwei Wegen zugewiesen werden:

- **Einzeln** — direkt am Termin über die Mitarbeiterauswahl
- **Über ein Team** — das Team wird am Termin ausgewählt, und seine Mitglieder werden als konkrete Mitarbeiterliste übernommen

In beiden Fällen prüft MugPlan automatisch, ob ein Mitarbeiter im gewählten Zeitraum bereits für einen anderen Termin eingeplant ist. Ist das der Fall, wird der Mitarbeiter nicht zugewiesen und eine Meldung erscheint.

---

### Was passiert, wenn ein Mitarbeiter bereits verplant ist?

MugPlan lässt keine Doppelbelegung zu. Wenn ein Mitarbeiter im Zeitraum des Termins bereits einem anderen Termin zugeordnet ist, wird die Zuweisung blockiert und eine Meldung mit dem Namen des betroffenen Mitarbeiters angezeigt.

---

### Wie weise ich einem Termin eine Tour zu?

Die Tour wird am Termin in der Tourauswahl gesetzt. Wenn für die Kalenderwoche des Termins in dieser Tour bereits eine Wochenplanung hinterlegt ist, zeigt MugPlan einen Vorschau-Dialog: welche Mitarbeiter aus der Planung hinzugefügt würden und ob dabei Konflikte bestehen. Erst nach Ihrer Bestätigung werden die Mitarbeiter übernommen.

Wenn keine Wochenplanung für die Woche hinterlegt ist, ändert sich die Mitarbeiterliste des Termins durch die Tourzuweisung nicht.

Das Entfernen einer Tour von einem Termin hat keine Auswirkung auf die bereits zugeordneten Mitarbeiter.

---

### Wie verschiebe ich einen Termin?

Das Datum eines Termins kann im Bearbeitungsdialog geändert werden. MugPlan prüft dabei für alle dem Termin zugeordneten Mitarbeiter, ob sie am neuen Datum verfügbar sind.

Sind einzelne Mitarbeiter am neuen Datum bereits anderweitig verplant, erscheint eine Meldung mit den betroffenen Namen. Sie entscheiden, ob der Termin trotzdem verschoben werden soll — in diesem Fall werden die betroffenen Mitarbeiter vom Termin entfernt. Wenn Sie nicht bestätigen, bleibt der Termin am bisherigen Datum.

---

### Kann ich einen vergangenen Termin noch ändern?

Termine, deren Startdatum in der Vergangenheit liegt, können von Disponenten nicht mehr bearbeitet, verschoben oder gelöscht werden. Sie sind schreibgeschützt und dienen der Nachvollziehbarkeit.

---

### Wie storniere ich einen Termin?

Storno ist über die Terminansicht möglich, solange der Termin noch nicht in der Vergangenheit liegt. Ein Storno ist nicht umkehrbar und bewirkt Folgendes:

- Alle zugeordneten Mitarbeiter werden vom Termin abgezogen und sind danach für andere Termine wieder verfügbar.
- Der Auftragswert des zugehörigen Auftrags wird auf 0 gesetzt.
- Der Termin erhält den Zustand **Storniert** und ist danach gesperrt — er kann weder bearbeitet noch gelöscht noch erneut storniert werden.

Ein stornierter Termin bleibt in allen Ansichten sichtbar, geht aber nicht in Reports und Auswertungen ein.

---

### Wie füge ich eine Notiz zu einem Termin hinzu?

Am geöffneten Termin können Notizen mit einem Titel und einem Inhalt angelegt werden. Notizen bleiben erhalten, wenn der Termin später bearbeitet wird — etwa wenn sich Datum, Mitarbeiter oder Tour ändern. Eine Notiz wird nur entfernt, wenn sie gezielt gelöscht oder der gesamte Termin gelöscht wird.

---

### Kann ich einen Termin löschen?

Vergangene Termine können von Disponenten nicht gelöscht werden. Zukünftige und aktuelle Termine können gelöscht werden. Beim Löschen werden auch alle zugehörigen Notizen entfernt.

Wenn ein Termin nicht mehr stattfinden soll, aber erhalten bleiben soll, ist Storno die richtige Wahl.

---

### Was tue ich, wenn ein Auftrag reklamiert wird?

Reklamation ist ein eigener Workflow, der sowohl am Termin als auch am Auftrag ausgelöst werden kann. Siehe: [Reklamation](../reklamation.md)

---

## Hinweise

Termine ohne Tourzuordnung werden in einer Standardfarbe dargestellt. Die Farbe eines Termins richtet sich nach der zugeordneten Tour.

Ein Termin kann mehrere Tage umfassen. Die zugeordneten Mitarbeiter gelten für den gesamten Zeitraum, nicht nur für einen einzelnen Tag.

Wenn ein Mitarbeiter manuell oder über ein Team einem Termin zugewiesen wurde, wird er durch spätere Tour-Änderungen nicht automatisch entfernt.

---

*Stand: 13.05.26*
