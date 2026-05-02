# UC 01/08: Mitarbeiter einem Termin zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einem bestehenden Termin einen einzelnen Mitarbeiter manuell zuweisen, sodass der Mitarbeiter im Termin als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in allen relevanten Sichten fÃ¼r diesen Mitarbeiter sichtbar ist, sofern keine Ãœberschneidung entsteht.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Der Mitarbeiter existiert.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur klickt im Bereich â€žZugeordnete Mitarbeiterâ€œ auf â€ž+â€œ (Mitarbeiter hinzufÃ¼gen) oder nutzt die entsprechende Auswahlfunktion.
3. Der Akteur wÃ¤hlt einen Mitarbeiter aus der Auswahlliste aus.
4. Das System fÃ¼gt den Mitarbeiter der Mitarbeiterliste des Termins hinzu.
5. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt, also auch durch das manuelle HinzufÃ¼gen.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Der Mitarbeiter wird nicht zugeordnet, es werden keine Ã„nderungen gespeichert und es entstehen keine TeilzustÃ¤nde, insbesondere keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Mitarbeiter bereits zugeordnet: Wenn der ausgewÃ¤hlte Mitarbeiter bereits dem Termin zugeordnet ist, darf das System keinen Duplikat-Eintrag erzeugen und muss entweder die Auswahl verhindern oder eine eindeutige Meldung anzeigen.

## Ergebnis

Der Mitarbeiter ist dem Termin zugeordnet und erscheint im Termin in der Liste der zugeordneten Mitarbeiter. Die Zuordnung ist als Eintrag in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar, ohne Duplikate.

Der Termin ist fÃ¼r diesen Mitarbeiter in der Mitarbeiter-Terminliste sichtbar. Der Termin ist auÃŸerdem weiterhin in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

