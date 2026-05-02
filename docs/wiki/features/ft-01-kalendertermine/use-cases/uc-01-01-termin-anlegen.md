# UC 01/01: Termin anlegen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen neuen Termin anlegen, entweder aus einem Projekt heraus (mit Projekt-KundenvorbefÃ¼llung) oder direkt aus dem Kalender (mit freier Kundenwahl). Der Use Case unterstÃ¼tzt beide Wege der Terminanlage.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Anlegerechte (Disponent oder Administrator).
- Kunde existiert und ist aktiv (Disponenten sehen nur aktive Kunden; Administratoren kÃ¶nnen auch inaktive Kunden sehen).
- **Rollenbasierte DatumsbeschrÃ¤nkung:** Disponenten dÃ¼rfen nur Termine mit Startdatum â‰¥ heute anlegen. Administratoren dÃ¼rfen Termine mit beliebigem Startdatum anlegen â€” einschlieÃŸlich Datumsangaben in der Vergangenheit.
- Optional: Projekt existiert und ist einem aktiven Kunden zugeordnet.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Tour existiert.

## Ablauf

**Weg 1: Termin aus Projekt heraus anlegen**

1. Der Akteur editiert ein vorhandenes Projekt und klickt in der Terminliste rechts auf â€ž+" (Termin anlegen). Das System Ã¶ffnet das Terminformular.
2. Das System verknÃ¼pft den Termin mit dem Projekt und Ã¼bernimmt den Kunden vom Projekt (VorbefÃ¼llung, schreibgeschÃ¼tzt).
    1. Das System setzt das Startdatum auf den aktuellen Tag.
    2. Der Kundenwert ist nicht editierbar (schreibgeschÃ¼tzt), da er vom Projekt vorgegeben ist.
3. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
4. Der Akteur weist dem Termin optional eine Tour zu.
5. Der Akteur weist dem Termin optional ein Team zu.
6. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
7. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
8. Das System speichert den Termin mit `customer_id` (vom Projekt), `project_id` (vom Projekt).
9. Das System zeigt den Termin im Kalender an.

---

**Weg 2: Termin direkt aus dem Kalender anlegen**

1. Der Akteur klickt im Kalender auf einen â€ž+"-Button (Termin anlegen). Das System Ã¶ffnet das Terminformular.
2. Das System setzt das Startdatum auf den angeklickten Tag.
3. Der angeklickte â€ž+â€œ-Button gehÃ¶rte optional zu einer Tour-Lane.
    1. Das System verknÃ¼pft den Termin mit dieser Tour. Wenn fÃ¼r die Kalenderwoche des Startdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und mÃ¶glichen Konflikten. Nach BestÃ¤tigung werden die ausgewÃ¤hlten Mitarbeiter in die Mitarbeiterliste Ã¼bernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt leer.
4. Der Akteur wÃ¤hlt einen Kunden (Pflichtfeld, Dropdown mit aktiven Kunden gemÃ¤ÃŸ Rolle). Das System filtert serverseitig: Disponenten sehen nur aktive Kunden; Administratoren kÃ¶nnen auch inaktive Kunden sehen.
5. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
6. Der Akteur weist dem Termin optional ein Projekt zu (Kundenmismatch wird geprÃ¼ft, siehe Alternativen).
7. Der Akteur weist dem Termin optional eine Tour zu, falls nicht bereits durch Schritt 3 erfolgt (oder um die Tour zu Ã¤ndern/entfernen). Siehe 3.a
8. Der Akteur weist dem Termin optional ein Team zu.
9. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
10. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
11. Das System speichert den Termin mit `customer_id` (vom Akteur gewÃ¤hlt), `project_id` (optional, nur wenn Kundenwerte konsistent sind).
12. Das System zeigt den Termin im Kalender an, entweder mit Tourfarbe oder mit Standardfarbe.

## Alternativen

- **Nicht authentifiziert:** HTTP 401, keine Persistenz.
- **Keine Berechtigung:** HTTP 403, keine Persistenz.
- **Ãœberschneidung erkannt:** Das System blockiert den Vorgang und zeigt einen Konflikt an (HTTP 409 EMPLOYEE_OVERLAP_CONFLICT).
- **Abbruch:** Der Termin wird nicht gespeichert.
    - Es wird kein neuer Termin-Datensatz in der Datenbank angelegt.
    - Es werden keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter angelegt, auch dann nicht, wenn zwischenzeitlich Mitarbeiter im Formular ausgewÃ¤hlt wurden.
- **Startdatum in der Vergangenheit (nur Disponent):** Wenn ein Disponent ein Startdatum vor dem heutigen Tag eingibt, blockiert das System den Vorgang mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren sind von dieser EinschrÃ¤nkung ausgenommen und dÃ¼rfen Termine mit Startdatum in der Vergangenheit anlegen.
- **Startzeit in der Vergangenheit, heutiges Datum (nur Disponent):** Wenn ein Disponent fÃ¼r den heutigen Tag eine Startzeit eingibt, die bereits vergangen ist, blockiert das System den Vorgang mit HTTP 409 VALIDATION_ERROR. Administratoren sind ausgenommen.
- **Tour-Woche gesperrt:** Das System blockiert die Anlage mit HTTP 409 BUSINESS_CONFLICT.
- **Speichern ohne Kundenzuordnung (Weg 2 nur):** Der Akteur versucht zu speichern, ohne dass ein Kunde zugeordnet ist. Das System blockiert den Vorgang mit HTTP 422 und zeigt eine eindeutige Fehlermeldung an: â€žKunde erforderlich â€“ Termin kann nicht ohne Kundenkontext gespeichert werden."
- **Kunde ist inaktiv (Weg 2 nur):** Falls ein Disponent einen inaktiven Kunden auswÃ¤hlen versucht, wird das blockiert (serverseitige Filterung zeigt ihn nicht im Dropdown). Administratoren kÃ¶nnen inaktive Kunden auswÃ¤hlen.
- **Projekt-Kundenmismatch (Weg 2 nur):** Der Akteur versucht, ein Projekt zu wÃ¤hlen, dessen Kundenwert sich vom gewÃ¤hlten Kundenwert unterscheidet. Das System blockiert die Projektzuordnung mit HTTP 422 und Fehlermeldung: â€žKundenmismatch â€“ Das gewÃ¤hlte Projekt gehÃ¶rt zu einem anderen Kunden. Bitte wÃ¤hlen Sie ein Projekt desselben Kunden oder entfernen Sie die Projektzuordnung."
- **Technischer Fehler:** HTTP 500, keine Persistenz.

## Ergebnis

Der Termin ist einem Kunden zugeordnet und im Kalender sichtbar, entweder mit Tourfarbe oder mit Standardfarbe. Der Termin ist fachlich gÃ¼ltig. Der Termin kann optional einem Projekt desselben Kunden zugeordnet sein. Die Mitarbeiterzuordnungen des Termins sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar.

FÃ¼r alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, dem der Termin zugeordnet ist. Das Projektformular zeigt den Termin in der Projekt-Terminliste (sofern der Termin einem Projekt zugeordnet ist). Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste.

