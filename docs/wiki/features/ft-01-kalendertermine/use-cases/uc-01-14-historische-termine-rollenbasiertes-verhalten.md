# UC 01/14: Historische Termine — Rollenbasiertes Verhalten

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent (read-only auf historischen Terminen), Administrator (vollständige Schreibrechte auch auf historischen Terminen)

## Ziel

Sicherstellen, dass historische Termine für Disponenten unveränderbar sind, während Administratoren historische Termine in vollem Umfang bearbeiten dürfen. Das System steuert dies über das `isLocked`-Flag im API-Response und über serverseitige Guards.

## Vorbedingungen

- Es existieren Termine in der Datenbank, darunter mindestens ein Termin mit Startdatum in der Vergangenheit.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System kennt die Rolle des authentifizierten Akteurs.
- Das System verfügt über Validierung und Guard-Regeln, die historische Eingaben rollenbasiert blockieren oder erlauben.

## Ablauf
### **Ablauf — Disponent**

1. Der Disponent öffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Disponent.
3. Das System setzt `isLocked = true` im API-Response.
4. Das System stellt den Termin im Read-only-Modus dar.
5. Das System verhindert alle Änderungen am Termin: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags.
6. Das System verhindert das Löschen, Stornieren und Verschieben des historischen Termins für den Disponenten.
7. Der Disponent versucht, im Kalender einen neuen Termin in der Vergangenheit anzulegen: Das System blockiert mit HTTP 409 PAST_APPOINTMENT_READONLY.

### **Ablauf — Administrator**

1. Der Administrator öffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Administrator.
3. Das System setzt `isLocked = false` im API-Response.
4. Das System stellt den Termin im normalen Bearbeitungsmodus dar.
5. Der Administrator kann alle Felder bearbeiten: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags setzen/entfernen, Mitarbeiter entfernen.
6. Der Administrator kann den Termin löschen, verschieben und stornieren.
7. Der Administrator kann neue Termine mit Startdatum in der Vergangenheit anlegen.


- Es existieren Termine in der Datenbank, darunter mindestens ein Termin, dessen Startzeitpunkt in der Vergangenheit liegt.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System kennt die Rolle des authentifizierten Akteurs.
- Das System verfügt über Validierung und Guard-Regeln, die historische Eingaben rollenbasiert blockieren oder erlauben.

### **Ablauf — Disponent**

1. Der Disponent öffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Disponent.
3. Das System setzt `isLocked = true` im API-Response.
4. Das System stellt den Termin im Read-only-Modus dar.
5. Das System verhindert alle Änderungen: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags.
6. Das System verhindert Löschen, Stornieren und Verschieben für den Disponenten.
7. Versucht der Disponent im Kalender einen Termin in der Vergangenheit anzulegen, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY.

### **Ablauf — Administrator**

1. Der Administrator öffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Administrator.
3. Das System setzt `isLocked = false` im API-Response.
4. Das System stellt den Termin im normalen Bearbeitungsmodus dar.
5. Der Administrator kann alle Felder bearbeiten: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags setzen/entfernen.
6. Der Administrator kann den Termin löschen, verschieben und stornieren.
7. Der Administrator kann neue Termine mit Startdatum in der Vergangenheit anlegen.

## Alternativen

- **Disponent, Grenzfall „heute, Startzeit in Vergangenheit“:** Das System blockiert mit HTTP 409 VALIDATION_ERROR. Administratoren sind ausgenommen.
- **Parallelandsänderungen:** Wenn ein Termin während der Anzeige historisch wird, blockiert das System beim nächsten Speichern für Disponenten den Vorgang.
- **Abbruch:** Der Termin bleibt unverändert.
- **Stornierter Termin:** Gilt für **alle Rollen** als dauerhaft gesperrt — auch Administratoren können stornierte Termine nicht reaktivieren oder bearbeiten.
- **Abwesenheitstermin:** Nur über das Mitarbeiterformular änderbar — gilt für alle Rollen.


- Grenzfall „heute, aber Startzeit in der Vergangenheit“: Wenn ein Benutzer für den heutigen Tag eine Startzeit in der Vergangenheit eingibt, blockiert das System den Vorgang ebenso wie bei einem Datum in der Vergangenheit.
- Abbruch: Wenn der Akteur die Bearbeitung abbricht, bleibt der Termin unverändert und es entstehen keine Teilzustände.
- Paralleländerungen: Wenn ein Termin während der Anzeige durch einen anderen Benutzer in einen historischen Zustand gerät, muss das System spätestens beim nächsten Speichern die Änderung blockieren und den Benutzer verständlich informieren.

## Ergebnis

Historische Termine sind für Disponenten nicht veränderbar. Das `isLocked`-Flag steuert die UI-Darstellung rollenbasiert. Administratoren können historische Termine ohne Einschränkungen bearbeiten — außer bei stornierten oder Abwesenheitsterminen. Das System erzeugt keine Teilzustände wenn ein blockierter Vorgang abgebrochen wird. Historisch bedeutet dabei, dass Datum oder Startzeit nicht vor dem aktuellen Zeitpunkt liegen dürfen. Das System muss Bearbeiten, Verschieben, Löschen sowie das Ändern von Zuordnungen (Tour, Team als Einfügehilfe, Mitarbeiter) für historische Termine blockieren und gleichzeitig verhindern, dass über UI-Aktionen historische Termine überhaupt neu angelegt werden können.


Historische Termine sind nicht veränderbar. Es gibt keine Möglichkeit, historische Termine neu anzulegen oder bestehende Termine in die Vergangenheit zu verschieben. Das System stellt sicher, dass weder Termin-Datensätze noch Join-Einträge Termin–Mitarbeiter als Teilzustand entstehen, wenn eine historische Eingabe blockiert wird.
