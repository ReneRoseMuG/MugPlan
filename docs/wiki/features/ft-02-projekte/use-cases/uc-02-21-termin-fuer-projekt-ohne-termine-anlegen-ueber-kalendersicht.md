# UC 02/21: Termin für Projekt ohne Termine anlegen (über Kalendersicht)

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Aus der Projektliste „Ohne Termine" direkt in die Kalenderansicht navigieren und einen Termin mit Projekt-Vorbefüllung anzulegen.

## Vorbedingungen

- Projektliste wird in Ansicht „Ohne Termine" angezeigt
- Projekt hat keine zugeordneten Termine
- Akteur besitzt Berechtigung zur Terminanlage
- Der Akteur ist authentifiziert

## Ablauf

1. Der Akteur öffnet die Projektübersicht.
2. Der Akteur betätigt den Umschalter „Ohne Termine".
3. Das System lädt ausschlieÃŸlich Projekte ohne Termine.
4. Das System rendert die Tabelle mit Spalten: Titel | Kunde | Auftragsnummer | (Button: „Termin planen")
5. Der Akteur sieht für jede Zeile einen Button **„Termin planen"** (primär, grün, rechts in der Zeile).
6. Der Akteur klickt auf den Button „Termin planen" für ein Projekt seiner Wahl.
7. Das System speichert die **Projekt-ID** im Client-Kontext (URL-Parameter oder Session-Storage).
8. Das System lädt die **wöchentliche Kalenderansicht** (FT 03 – Kalenderansichten) in den Vordergrund.
9. Der Akteur betrachtet die Wochenansicht und identifiziert einen gewünschten Tag.
10. Der Akteur klickt auf einen **Wochentag** (oder eine freie Zeitslot an diesem Tag).
11. Das System öffnet das **Terminformular** (Terminanlage-Dialog oder -Seite) mit folgender Vorbefüllung:
    - `project_id`: Aus der Projektliste (Schritt 6)
    - `customer_id`: Vom Projekt abgeleitet
    - `project_title`: Optional vom Projekttitel
    - `project_description`: Vom Projekt (Beschreibung / Artikelliste)
    - `start_date`: Vom Kalender-Klick (nur das Datum, z. B. 15.03.26)
    - Weitere Felder (Mitarbeiter, Notizen, Durationen, etc.): Leer oder mit Applikations-Defaults
12. Der Akteur bearbeitet das Terminformular nach Bedarf:
    - Zeit eingeben oder korrigieren (expliziter Klick auf „Startzeit" demaskiert das Eingabefeld)
    - Mitarbeiter zuordnen
    - Notizen hinzufügen
    - Weitere optionale Felder ausfüllen
13. Der Akteur klickt **„Speichern"** (oder „Termin anlegen").
14. Das System validiert das Formular gemäÃŸ den Regeln aus FT (05) oder dem Termin-Domänenmodell.
15. Das System persistiert den Termin mit allen Feldern.
16. Das System aktualisiert die Projekt-Referenz: Das Projekt ist nun mit einem Termin verknüpft.
17. Das System kehrt **automatisch zur Projektliste zurück**.
18. Das System lädt die Projektliste neu.
19. Das gerade bearbeitete Projekt verschwindet aus der Ansicht „Ohne Termine" (weil es jetzt einen Termin besitzt).
20. Das System bleibt in der Ansicht „Ohne Termine", zeigt aber nur noch die verbleibenden Projekte ohne Termine an.
21. Der Akteur kann den Prozess für weitere Projekte wiederholen (Schritt 5–20).

## Alternativen

**Alternative A – Kalenderwahl wird abgebrochen:**

- Der Akteur schlieÃŸt die Kalenderansicht, ohne einen Tag zu klicken.
- Das System kehrt zur Projektliste „Ohne Termine" zurück.
- Das Projekt bleibt unverändert in der Liste.

**Alternative B – Terminformular wird abgebrochen:**

- Der Akteur öffnet das Terminformular, ändert Werte, bricht aber ab, ohne zu speichern.
- Das System schlieÃŸt das Formular.
- Das System kehrt zur Kalenderansicht zurück (optional) oder zur Projektliste.
- Das Projekt bleibt unverändert in der Liste „Ohne Termine".

**Alternative C – Validierungsfehler beim Speichern:**

- Der Akteur versucht, das Formular zu speichern, aber ein Pflichtfeld ist nicht gefüllt.
- Das System zeigt eine Fehlermeldung und markiert das betroffene Feld.
- Das Formular bleibt offen, der Akteur kann den Fehler korrigieren.
- Das Projekt bleibt unverändert in der Liste.

**Alternative D – Technischer Fehler während Persistierung:**

- Beim Speichern des Termins tritt ein Fehler auf (z. B. Datenbankfehler).
- Das System zeigt eine Fehlermeldung.
- Das System kehrt zum Terminformular zurück (oder zur Kalenderansicht).
- Das Projekt bleibt unverändert in der Liste „Ohne Termine".

**Alternative E – Projekt wurde zwischenzeitlich gelöscht:**

- Der Akteur war in der Kalenderansicht, während ein anderer Akteur das Projekt löschte.
- Das System erkennt beim Speichern des Termins, dass das Projekt nicht mehr existiert.
- Das System blockiert mit einer Fehlermeldung (z. B. 409 Conflict oder 404 Not Found).
- Das System kehrt zur Projektliste zurück.

**Alternative F – Projekt wurde zwischenzeitlich mit einem Termin versehen:**

- Der Akteur war lange in der Kalenderansicht inaktiv.
- Ein anderer Akteur hat dem gleichen Projekt einen Termin zugeordnet.
- Das System erkennt beim Speichern, dass das Projekt bereits einen Termin hat.
- Das System blockiert mit einer Fehlermeldung (z. B. 409 Conflict).
- Das System informiert den Akteur.
- Das System kehrt zur Projektliste zurück, wo das Projekt nicht mehr in „Ohne Termine" sichtbar ist.

**Alternative G – Projekt hat sich geändert:**

- Während der Akteur im Terminformular war, hat ein anderer Akteur das Projekt bearbeitet (z. B. Titel geändert).
- Das System kann optional:
    - Die neuen Projektdaten automatisch ins Formular einflieÃŸen lassen (optimistisch), oder
    - Den Akteur warnen und zum Neuladen auffordern (pessimistisch).
- Diese Entscheidung hängt von der allgemeinen Versionierungs-Strategie ab (siehe FT 02 UC 02/09).

## Ergebnis

- Ein neuer Termin ist persistent angelegt.
- Der Termin ist dem Projekt zugeordnet.
- Das Projekt ist mit mindestens einem Termin verknüpft.
- Das Projekt verschwindet aus der Ansicht „Ohne Termine".
- Das Projekt kann nun in „Aktuelle Projekte" sichtbar sein (sofern der Termin-Startdatum ≥ heute ist).
- Alle Projekt-Details (Kunde, Beschreibung, Anhänge, Notizen) bleiben unverändert.
- Der Termin ist in allen Terminansichten (Kalender, Tabelle, etc.) sichtbar.
- Es existiert keine widersprüchliche oder verwaiste Referenz zwischen Projekt und Termin.

