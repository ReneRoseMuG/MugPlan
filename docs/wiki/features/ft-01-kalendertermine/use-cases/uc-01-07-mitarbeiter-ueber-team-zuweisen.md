# UC 01/07: Mitarbeiter Ã¼ber Team zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Nicht angegeben in der Notion-Quelle.

## Ziel

Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen, indem ein Team als EinfÃ¼gehilfe verwendet wird. Das Team selbst wird dabei nicht am Termin gespeichert, sondern nur die daraus resultierende konkrete Mitarbeiterliste des Termins.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Das Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur wÃ¤hlt ein Team als EinfÃ¼gehilfe aus.
3. Das System Ã¼bernimmt die Mitarbeiter des Teams in die Mitarbeiterliste des Termins.
4. Das System speichert keine Teamzuordnung am Termin, sondern ausschlieÃŸlich die konkrete Mitarbeiterliste.
5. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt, also auch durch die Team-Ãœbernahme.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Es werden keine Ã„nderungen gespeichert und es entstehen keine TeilzustÃ¤nde, insbesondere keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Team ohne Mitarbeiter: Falls das gewÃ¤hlte Team keine Mitarbeiter enthÃ¤lt, muss das System den Vorgang blockieren und eine eindeutige Fehlermeldung anzeigen.

## Ergebnis

Die Mitarbeiter des ausgewÃ¤hlten Teams sind dem Termin zugeordnet und als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar. Am Termin ist keine Teamzuordnung gespeichert, sondern ausschlieÃŸlich die daraus resultierende Mitarbeiterliste.

FÃ¼r alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Der Termin erscheint in den projektbezogenen Terminsichten und, sofern vorhanden, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

