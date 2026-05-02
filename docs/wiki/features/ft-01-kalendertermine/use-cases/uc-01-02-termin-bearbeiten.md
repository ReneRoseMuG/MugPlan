# UC 01/02: Termin bearbeiten

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin Ã¤ndern, ohne fachliche Inkonsistenzen zu erzeugen. Der Use Case umfasst Ã„nderungen an Zeitraum und Uhrzeit, Ã„nderungen der Kundenzuordnung, Ã„nderungen der Projektzuordnung (mit KonsistenzprÃ¼fung), Ã„nderungen der Tourzuordnung, das Ãœbernehmen von Mitarbeitern Ã¼ber Tour oder Team als EinfÃ¼gehilfe sowie manuelle Mitarbeiterzuweisungen und -entfernungen.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- **Rollenbasierte DatumsbeschrÃ¤nkung:** Disponenten dÃ¼rfen nur nicht-historische Termine bearbeiten (Startdatum â‰¥ heute). Administratoren dÃ¼rfen Termine unabhÃ¤ngig vom Startdatum bearbeiten.
- Der zum Termin gehÃ¶rende Kunde existiert (ggf. inaktiv fÃ¼r Admin sichtbar).
- Optional: Projekt existiert und gehÃ¶rt zum gleichen Kunden wie der Termin.
- Optional: Tour existiert.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
3. Der Akteur Ã¤ndert optional die Kundenzuordnung des Termins.
    1. Das System zeigt eine Auswahl aktiver Kunden (fÃ¼r Disponenten) oder aller Kunden (fÃ¼r Administratoren).
    2. Der Akteur wÃ¤hlt einen anderen Kunden.
    3. Das System prÃ¼ft: Wenn der Termin aktuell einem Projekt zugeordnet ist, und der neu gewÃ¤hlte Kundenwert unterscheidet sich vom Kunden des zugeordneten Projekts, blockiert das System die Kundenzuordnung mit Fehlermeldung: â€žKundenwechsel nicht mÃ¶glich â€“ Der Termin ist einem Projekt zugeordnet, das zu einem anderen Kunden gehÃ¶rt. Bitte entfernen Sie zunÃ¤chst die Projektzuordnung oder wÃ¤hlen Sie einen Kunden, dem das aktuelle Projekt zugeordnet ist."
    4. Falls der Termin kein Projekt hat oder der Kundenwert konsistent ist, aktualisiert das System die Kundenzuordnung.
4. Der Akteur Ã¤ndert optional die Projektzuordnung des Termins oder entfernt die Projektzuordnung.
    1. Wenn eine neue Projekt-Zuordnung gewÃ¤hlt wird, prÃ¼ft das System: Ist der Kundenwert des gewÃ¤hlten Projekts identisch mit dem aktuellen Kundenwert des Termins?
    2. Falls ja: Das System setzt die Projektzuordnung.
    3. Falls nein: Das System blockiert die Zuweisung mit Fehlermeldung: â€žKundenmismatch â€“ Das gewÃ¤hlte Projekt gehÃ¶rt zu einem anderen Kunden. Bitte wÃ¤hlen Sie ein Projekt desselben Kunden oder entfernen Sie die Projektzuordnung."
    4. Wenn die Projektzuordnung entfernt wird (Projekt auf NULL): Der Kundenwert des Termins bleibt unverÃ¤ndert.
5. Der Akteur weist dem Termin optional eine Tour zu oder Ã¤ndert eine bereits verknÃ¼pfte Tour.
    1. Wenn eine Tour neu zugewiesen wird, prÃ¼ft das System ob fÃ¼r die Kalenderwoche des Terminstartdatums in der Tour eine Wochenplanung hinterlegt ist. Wenn ja, Ã¶ffnet sich sofort ein Vorschau-Dialog mit den geplanten Mitarbeitern und mÃ¶glichen Konflikten. Nach BestÃ¤tigung werden die ausgewÃ¤hlten Mitarbeiter hinzugefÃ¼gt. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverÃ¤ndert.
    2. Wenn die Tour gewechselt wird, prÃ¼ft das System fÃ¼r die neue und die alte Tour/KW-Kombination ob WochenplanungseintrÃ¤ge vorhanden sind. Wenn ja, zeigt das System vor dem Speichern einen Vorschau-Dialog: welche Mitarbeiter aus der alten Tour-KW entfernt werden, welche aus der neuen Tour-KW hinzugefÃ¼gt werden, welche Konflikte bestehen, welche Mitarbeiter (manuell oder per Team zugewiesen) unverÃ¤ndert bleiben. Erst nach BestÃ¤tigung wird gespeichert.
6. Der Akteur entfernt optional eine Tourzuordnung.
    1. Das System lÃ¶st die TourverknÃ¼pfung am Termin. Die Mitarbeiter, welche der Tour zugewiesen sind, bleiben am Termin hÃ¤ngen und werden ausdrÃ¼cklich nicht entfernt.
7. Der Akteur verwendet optional ein Team als EinfÃ¼gehilfe.
    1. Das System Ã¼bernimmt die Team-Mitarbeiter in die Mitarbeiterliste des Termins zusÃ¤tzlich zu bereits vorhandenen Mitarbeitern.
    2. Das System speichert keine Teamzuordnung am Termin, sondern ausschlieÃŸlich die konkrete Mitarbeiterliste.
8. Der Akteur weist optional weitere Mitarbeiter manuell zu oder entfernt einzelne Mitarbeiter manuell.
9. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
10. Das System speichert die Ã„nderungen am Termin und aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- **Nicht authentifiziert:** HTTP 401.
- **Keine Berechtigung:** HTTP 403.
- **Historischer Termin (nur Disponent):** Wenn ein Disponent einen Termin mit Startdatum in der Vergangenheit zu Ã¤ndern versucht, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren dÃ¼rfen historische Termine ohne EinschrÃ¤nkung bearbeiten.
- **Ãœberschneidung erkannt:** Das System blockiert das Speichern und zeigt einen Konflikt an, der den betroffenen Mitarbeiter und den kollidierenden Zeitraum verstÃ¤ndlich benennt.
- **Abbruch:** Der Akteur bricht die Bearbeitung ab. Das System speichert keine Ã„nderungen am Termin und es entstehen keine TeilÃ¤nderungen, also insbesondere keine neuen oder gelÃ¶schten EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- **Speichern ohne Kundenzuordnung:** Falls der Akteur versucht zu speichern, ohne dass ein Kunde zugeordnet ist, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: â€žKunde erforderlich â€“ Termin kann nicht ohne Kundenkontext gespeichert werden."
- **Kundenmismatch bei Projektzuordnung:** Das System blockiert mit Fehlermeldung (siehe Punkt 4.3 oben).
- **Kundenwechsel mit bestehendem Projekt:** Das System blockiert mit Fehlermeldung (siehe Punkt 3.3 oben).

## Ergebnis

Der Termin ist mit den geÃ¤nderten Daten gespeichert. Der Kundenwert des Termins ist direkt am Termin gespeichert und eindeutig. Das Projekt (falls zugeordnet) gehÃ¶rt zum gleichen Kunden â€“ Konsistenz ist garantiert. Die Mitarbeiterzuordnungen sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter konsistent abrufbar, ohne Duplikate und ohne TeilzustÃ¤nde.

Die aktualisierten Termindaten sind in allen konsumierenden Sichten konsistent sichtbar. Das bedeutet, dass das Mitarbeiterformular den Termin in der Mitarbeiter-Terminliste fÃ¼r alle zugeordneten Mitarbeiter korrekt anzeigt, das Kundenformular den Termin in der Terminliste des Kunden anzeigt, dem der Termin direkt zugeordnet ist. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts (sofern vorhanden). Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, verschwindet der Termin entsprechend aus dieser Tour-Sicht.

