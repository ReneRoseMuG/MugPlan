# UC 02/21: Termin fÃ¼r Projekt ohne Termine anlegen (Ã¼ber Kalendersicht)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Aus der Projektliste â€žOhne Termine" direkt in die Kalenderansicht navigieren und einen Termin mit Projekt-VorbefÃ¼llung anzulegen.

## Vorbedingungen

- Projektliste wird in Ansicht â€žOhne Termine" angezeigt
- Projekt hat keine zugeordneten Termine
- Akteur besitzt Berechtigung zur Terminanlage
- Der Akteur ist authentifiziert

## Ablauf

1. Der Akteur Ã¶ffnet die ProjektÃ¼bersicht.
2. Der Akteur betÃ¤tigt den Umschalter â€žOhne Termine".
3. Das System lÃ¤dt ausschlieÃŸlich Projekte ohne Termine.
4. Das System rendert die Tabelle mit Spalten: Titel | Kunde | Auftragsnummer | (Button: â€žTermin planen")
5. Der Akteur sieht fÃ¼r jede Zeile einen Button **â€žTermin planen"** (primÃ¤r, grÃ¼n, rechts in der Zeile).
6. Der Akteur klickt auf den Button â€žTermin planen" fÃ¼r ein Projekt seiner Wahl.
7. Das System speichert die **Projekt-ID** im Client-Kontext (URL-Parameter oder Session-Storage).
8. Das System lÃ¤dt die **wÃ¶chentliche Kalenderansicht** (FT 03 â€“ Kalenderansichten) in den Vordergrund.
9. Der Akteur betrachtet die Wochenansicht und identifiziert einen gewÃ¼nschten Tag.
10. Der Akteur klickt auf einen **Wochentag** (oder eine freie Zeitslot an diesem Tag).
11. Das System Ã¶ffnet das **Terminformular** (Terminanlage-Dialog oder -Seite) mit folgender VorbefÃ¼llung:
    - `project_id`: Aus der Projektliste (Schritt 6)
    - `customer_id`: Vom Projekt abgeleitet
    - `project_title`: Optional vom Projekttitel
    - `project_description`: Vom Projekt (Beschreibung / Artikelliste)
    - `start_date`: Vom Kalender-Klick (nur das Datum, z. B. 15.03.26)
    - Weitere Felder (Mitarbeiter, Notizen, Durationen, etc.): Leer oder mit Applikations-Defaults
12. Der Akteur bearbeitet das Terminformular nach Bedarf:
    - Zeit eingeben oder korrigieren (expliziter Klick auf â€žStartzeit" demaskiert das Eingabefeld)
    - Mitarbeiter zuordnen
    - Notizen hinzufÃ¼gen
    - Weitere optionale Felder ausfÃ¼llen
13. Der Akteur klickt **â€žSpeichern"** (oder â€žTermin anlegen").
14. Das System validiert das Formular gemÃ¤ÃŸ den Regeln aus FT (05) oder dem Termin-DomÃ¤nenmodell.
15. Das System persistiert den Termin mit allen Feldern.
16. Das System aktualisiert die Projekt-Referenz: Das Projekt ist nun mit einem Termin verknÃ¼pft.
17. Das System kehrt **automatisch zur Projektliste zurÃ¼ck**.
18. Das System lÃ¤dt die Projektliste neu.
19. Das gerade bearbeitete Projekt verschwindet aus der Ansicht â€žOhne Termine" (weil es jetzt einen Termin besitzt).
20. Das System bleibt in der Ansicht â€žOhne Termine", zeigt aber nur noch die verbleibenden Projekte ohne Termine an.
21. Der Akteur kann den Prozess fÃ¼r weitere Projekte wiederholen (Schritt 5â€“20).

## Alternativen

**Alternative A â€“ Kalenderwahl wird abgebrochen:**

- Der Akteur schlieÃŸt die Kalenderansicht, ohne einen Tag zu klicken.
- Das System kehrt zur Projektliste â€žOhne Termine" zurÃ¼ck.
- Das Projekt bleibt unverÃ¤ndert in der Liste.

**Alternative B â€“ Terminformular wird abgebrochen:**

- Der Akteur Ã¶ffnet das Terminformular, Ã¤ndert Werte, bricht aber ab, ohne zu speichern.
- Das System schlieÃŸt das Formular.
- Das System kehrt zur Kalenderansicht zurÃ¼ck (optional) oder zur Projektliste.
- Das Projekt bleibt unverÃ¤ndert in der Liste â€žOhne Termine".

**Alternative C â€“ Validierungsfehler beim Speichern:**

- Der Akteur versucht, das Formular zu speichern, aber ein Pflichtfeld ist nicht gefÃ¼llt.
- Das System zeigt eine Fehlermeldung und markiert das betroffene Feld.
- Das Formular bleibt offen, der Akteur kann den Fehler korrigieren.
- Das Projekt bleibt unverÃ¤ndert in der Liste.

**Alternative D â€“ Technischer Fehler wÃ¤hrend Persistierung:**

- Beim Speichern des Termins tritt ein Fehler auf (z. B. Datenbankfehler).
- Das System zeigt eine Fehlermeldung.
- Das System kehrt zum Terminformular zurÃ¼ck (oder zur Kalenderansicht).
- Das Projekt bleibt unverÃ¤ndert in der Liste â€žOhne Termine".

**Alternative E â€“ Projekt wurde zwischenzeitlich gelÃ¶scht:**

- Der Akteur war in der Kalenderansicht, wÃ¤hrend ein anderer Akteur das Projekt lÃ¶schte.
- Das System erkennt beim Speichern des Termins, dass das Projekt nicht mehr existiert.
- Das System blockiert mit einer Fehlermeldung (z. B. 409 Conflict oder 404 Not Found).
- Das System kehrt zur Projektliste zurÃ¼ck.

**Alternative F â€“ Projekt wurde zwischenzeitlich mit einem Termin versehen:**

- Der Akteur war lange in der Kalenderansicht inaktiv.
- Ein anderer Akteur hat dem gleichen Projekt einen Termin zugeordnet.
- Das System erkennt beim Speichern, dass das Projekt bereits einen Termin hat.
- Das System blockiert mit einer Fehlermeldung (z. B. 409 Conflict).
- Das System informiert den Akteur.
- Das System kehrt zur Projektliste zurÃ¼ck, wo das Projekt nicht mehr in â€žOhne Termine" sichtbar ist.

**Alternative G â€“ Projekt hat sich geÃ¤ndert:**

- WÃ¤hrend der Akteur im Terminformular war, hat ein anderer Akteur das Projekt bearbeitet (z. B. Titel geÃ¤ndert).
- Das System kann optional:
    - Die neuen Projektdaten automatisch ins Formular einflieÃŸen lassen (optimistisch), oder
    - Den Akteur warnen und zum Neuladen auffordern (pessimistisch).
- Diese Entscheidung hÃ¤ngt von der allgemeinen Versionierungs-Strategie ab (siehe FT 02 UC 02/09).

## Ergebnis

- Ein neuer Termin ist persistent angelegt.
- Der Termin ist dem Projekt zugeordnet.
- Das Projekt ist mit mindestens einem Termin verknÃ¼pft.
- Das Projekt verschwindet aus der Ansicht â€žOhne Termine".
- Das Projekt kann nun in â€žAktuelle Projekte" sichtbar sein (sofern der Termin-Startdatum â‰¥ heute ist).
- Alle Projekt-Details (Kunde, Beschreibung, AnhÃ¤nge, Notizen) bleiben unverÃ¤ndert.
- Der Termin ist in allen Terminansichten (Kalender, Tabelle, etc.) sichtbar.
- Es existiert keine widersprÃ¼chliche oder verwaiste Referenz zwischen Projekt und Termin.

