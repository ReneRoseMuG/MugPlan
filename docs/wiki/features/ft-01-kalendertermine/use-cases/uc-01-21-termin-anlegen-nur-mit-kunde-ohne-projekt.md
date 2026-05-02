# UC 01/21: Termin anlegen â€“ Nur mit Kunde, ohne Projekt

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen neuen Termin direkt fÃ¼r einen Kunden anlegen, ohne ein Projekt zu wÃ¤hlen. Dieser Termin ist organisatorisch einem Kunden zugeordnet, aber keinem spezifischen Projekt. Dies ist eine vereinfachte Terminanlage fÃ¼r Ad-hoc-AuftrÃ¤ge oder KundenaktivitÃ¤ten ohne formales Projektkontext.

## Vorbedingungen

- Kunde existiert und ist aktiv (oder Admin kann auch inaktive sehen).
- Disponent/Administrator hat Berechtigung zur Terminanlage.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Tour existiert.

## Ablauf

1. Der Akteur klickt im Kalender auf einen â€ž+"-Button (Termin anlegen). Das System Ã¶ffnet das Terminformular.
2. Das System setzt das Startdatum auf den angeklickten Tag.
3. Der angeklickte â€ž+â€œ-Button gehÃ¶rte optional zu einer Tour-Lane.
    1. Das System verknÃ¼pft den Termin mit dieser Tour. Wenn fÃ¼r die Kalenderwoche des Startdatums in der Tour eine Wochenplanung hinterlegt ist, zeigt das System sofort einen Vorschau-Dialog mit den geplanten Mitarbeitern und mÃ¶glichen Konflikten. Nach BestÃ¤tigung werden die ausgewÃ¤hlten Mitarbeiter in die Mitarbeiterliste Ã¼bernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt leer.
4. Der Akteur wÃ¤hlt einen Kunden (Pflichtfeld, Dropdown mit aktiven Kunden gemÃ¤ÃŸ Rolle). Das System filtert serverseitig: Disponenten sehen nur aktive Kunden; Administratoren kÃ¶nnen auch inaktive Kunden sehen.
5. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
6. Der Akteur weist dem Termin optional eine Tour zu, falls nicht bereits durch Schritt 3 erfolgt (oder um die Tour zu Ã¤ndern/entfernen). Siehe 3.a.
7. Der Akteur weist dem Termin optional ein Team zu.
8. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
9. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
10. Das System speichert den Termin mit `customer_id` (vom Akteur gewÃ¤hlt), `project_id = NULL`.
11. Das System zeigt den Termin im Kalender an, entweder mit Tourfarbe (falls zugeordnet) oder mit Standardfarbe.

## Alternativen

- **Ãœberschneidung erkannt:** Das System blockiert den Vorgang und zeigt einen Konflikt an.
- **Abbruch:** Der Termin wird nicht gespeichert.
    - Es wird kein neuer Termin-Datensatz in der Datenbank angelegt.
    - Es werden keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter angelegt, auch dann nicht, wenn zwischenzeitlich Mitarbeiter im Formular ausgewÃ¤hlt wurden.
- **Speichern ohne Kundenzuordnung:** Der Akteur versucht zu speichern, ohne dass ein Kunde zugeordnet ist. Das System blockiert den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: â€žKunde erforderlich â€“ Termin kann nicht ohne Kundenkontext gespeichert werden."
- **Kunde ist inaktiv:** Falls Akteur einen inaktiven Kunden auswÃ¤hlen versucht und Disponent ist, wird das blockiert (serverseitige Filterung zeigt ihn nicht im Dropdown). Administratoren kÃ¶nnen inaktive Kunden auswÃ¤hlen.

## Ergebnis

Der Termin existiert persistent, ist einem Kunden zugeordnet, ist keinem Projekt zugeordnet (`project_id = NULL`). Der Termin ist im Kalender sichtbar (mit Standard- oder Tourfarbe, je nach Tourzuordnung). Der Termin ist fachlich gÃ¼ltig und vollstÃ¤ndig. Die Mitarbeiterzuordnungen des Termins sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar.

Der Termin erscheint in der Kundenterminliste (in FT 09: Kundenverwaltung unter â€žDirekte Termineâ€œ). Der Termin erscheint nicht in einer Projektterminliste, da kein Projekt zugeordnet ist. FÃ¼r alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste.

