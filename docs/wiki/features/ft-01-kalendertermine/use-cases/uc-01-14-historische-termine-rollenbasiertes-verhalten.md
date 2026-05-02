# UC 01/14: Historische Termine â€” Rollenbasiertes Verhalten

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent (read-only auf historischen Terminen), Administrator (vollstÃ¤ndige Schreibrechte auch auf historischen Terminen)

## Ziel

Sicherstellen, dass historische Termine fÃ¼r Disponenten unverÃ¤nderbar sind, wÃ¤hrend Administratoren historische Termine in vollem Umfang bearbeiten dÃ¼rfen. Das System steuert dies Ã¼ber das `isLocked`-Flag im API-Response und Ã¼ber serverseitige Guards.

## Vorbedingungen

- Es existieren Termine in der Datenbank, darunter mindestens ein Termin mit Startdatum in der Vergangenheit.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System kennt die Rolle des authentifizierten Akteurs.
- Das System verfÃ¼gt Ã¼ber Validierung und Guard-Regeln, die historische Eingaben rollenbasiert blockieren oder erlauben.

### **Ablauf â€” Disponent**

1. Der Disponent Ã¶ffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Disponent.
3. Das System setzt `isLocked = true` im API-Response.
4. Das System stellt den Termin im Read-only-Modus dar.
5. Das System verhindert alle Ã„nderungen am Termin: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags.
6. Das System verhindert das LÃ¶schen, Stornieren und Verschieben des historischen Termins fÃ¼r den Disponenten.
7. Der Disponent versucht, im Kalender einen neuen Termin in der Vergangenheit anzulegen: Das System blockiert mit HTTP 409 PAST_APPOINTMENT_READONLY.

### **Ablauf â€” Administrator**

1. Der Administrator Ã¶ffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Administrator.
3. Das System setzt `isLocked = false` im API-Response.
4. Das System stellt den Termin im normalen Bearbeitungsmodus dar.
5. Der Administrator kann alle Felder bearbeiten: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags setzen/entfernen, Mitarbeiter entfernen.
6. Der Administrator kann den Termin lÃ¶schen, verschieben und stornieren.
7. Der Administrator kann neue Termine mit Startdatum in der Vergangenheit anlegen.


- Es existieren Termine in der Datenbank, darunter mindestens ein Termin, dessen Startzeitpunkt in der Vergangenheit liegt.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System kennt die Rolle des authentifizierten Akteurs.
- Das System verfÃ¼gt Ã¼ber Validierung und Guard-Regeln, die historische Eingaben rollenbasiert blockieren oder erlauben.

### **Ablauf â€” Disponent**

1. Der Disponent Ã¶ffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Disponent.
3. Das System setzt `isLocked = true` im API-Response.
4. Das System stellt den Termin im Read-only-Modus dar.
5. Das System verhindert alle Ã„nderungen: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags.
6. Das System verhindert LÃ¶schen, Stornieren und Verschieben fÃ¼r den Disponenten.
7. Versucht der Disponent im Kalender einen Termin in der Vergangenheit anzulegen, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY.

### **Ablauf â€” Administrator**

1. Der Administrator Ã¶ffnet einen historischen Termin im Terminformular.
2. Das System erkennt: Startdatum < heute **und** Rolle = Administrator.
3. Das System setzt `isLocked = false` im API-Response.
4. Das System stellt den Termin im normalen Bearbeitungsmodus dar.
5. Der Administrator kann alle Felder bearbeiten: Datum, Uhrzeit, Projektzuordnung, Tourzuordnung, Mitarbeiterzuordnungen, Tags setzen/entfernen.
6. Der Administrator kann den Termin lÃ¶schen, verschieben und stornieren.
7. Der Administrator kann neue Termine mit Startdatum in der Vergangenheit anlegen.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- **Disponent, Grenzfall â€žheute, Startzeit in Vergangenheitâ€œ:** Das System blockiert mit HTTP 409 VALIDATION_ERROR. Administratoren sind ausgenommen.
- **ParallelandsÃ¤nderungen:** Wenn ein Termin wÃ¤hrend der Anzeige historisch wird, blockiert das System beim nÃ¤chsten Speichern fÃ¼r Disponenten den Vorgang.
- **Abbruch:** Der Termin bleibt unverÃ¤ndert.
- **Stornierter Termin:** Gilt fÃ¼r **alle Rollen** als dauerhaft gesperrt â€” auch Administratoren kÃ¶nnen stornierte Termine nicht reaktivieren oder bearbeiten.
- **Abwesenheitstermin:** Nur Ã¼ber das Mitarbeiterformular Ã¤nderbar â€” gilt fÃ¼r alle Rollen.


- Grenzfall â€žheute, aber Startzeit in der Vergangenheitâ€œ: Wenn ein Benutzer fÃ¼r den heutigen Tag eine Startzeit in der Vergangenheit eingibt, blockiert das System den Vorgang ebenso wie bei einem Datum in der Vergangenheit.
- Abbruch: Wenn der Akteur die Bearbeitung abbricht, bleibt der Termin unverÃ¤ndert und es entstehen keine TeilzustÃ¤nde.
- ParallelÃ¤nderungen: Wenn ein Termin wÃ¤hrend der Anzeige durch einen anderen Benutzer in einen historischen Zustand gerÃ¤t, muss das System spÃ¤testens beim nÃ¤chsten Speichern die Ã„nderung blockieren und den Benutzer verstÃ¤ndlich informieren.

## Ergebnis

Historische Termine sind fÃ¼r Disponenten nicht verÃ¤nderbar. Das `isLocked`-Flag steuert die UI-Darstellung rollenbasiert. Administratoren kÃ¶nnen historische Termine ohne EinschrÃ¤nkungen bearbeiten â€” auÃŸer bei stornierten oder Abwesenheitsterminen. Das System erzeugt keine TeilzustÃ¤nde wenn ein blockierter Vorgang abgebrochen wird. Historisch bedeutet dabei, dass Datum oder Startzeit nicht vor dem aktuellen Zeitpunkt liegen dÃ¼rfen. Das System muss Bearbeiten, Verschieben, LÃ¶schen sowie das Ã„ndern von Zuordnungen (Tour, Team als EinfÃ¼gehilfe, Mitarbeiter) fÃ¼r historische Termine blockieren und gleichzeitig verhindern, dass Ã¼ber UI-Aktionen historische Termine Ã¼berhaupt neu angelegt werden kÃ¶nnen.


Historische Termine sind nicht verÃ¤nderbar. Es gibt keine MÃ¶glichkeit, historische Termine neu anzulegen oder bestehende Termine in die Vergangenheit zu verschieben. Das System stellt sicher, dass weder Termin-DatensÃ¤tze noch Join-EintrÃ¤ge Terminâ€“Mitarbeiter als Teilzustand entstehen, wenn eine historische Eingabe blockiert wird.

