# UC 01/08: Mitarbeiter einem Termin zuweisen

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Einem bestehenden Termin einen einzelnen Mitarbeiter manuell zuweisen, sodass der Mitarbeiter im Termin als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in allen relevanten Sichten für diesen Mitarbeiter sichtbar ist, sofern keine Überschneidung entsteht.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Der Mitarbeiter existiert.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur klickt im Bereich „Zugeordnete Mitarbeiter“ auf „+“ (Mitarbeiter hinzufügen) oder nutzt die entsprechende Auswahlfunktion.
3. Der Akteur wählt einen Mitarbeiter aus der Auswahlliste aus.
4. Das System fügt den Mitarbeiter der Mitarbeiterliste des Termins hinzu.
5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch das manuelle Hinzufügen.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

## Alternativen

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Der Mitarbeiter wird nicht zugeordnet, es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Mitarbeiter bereits zugeordnet: Wenn der ausgewählte Mitarbeiter bereits dem Termin zugeordnet ist, darf das System keinen Duplikat-Eintrag erzeugen und muss entweder die Auswahl verhindern oder eine eindeutige Meldung anzeigen.

## Ergebnis

Der Mitarbeiter ist dem Termin zugeordnet und erscheint im Termin in der Liste der zugeordneten Mitarbeiter. Die Zuordnung ist als Eintrag in der Join-Tabelle Termin–Mitarbeiter abrufbar, ohne Duplikate.

Der Termin ist für diesen Mitarbeiter in der Mitarbeiter-Terminliste sichtbar. Der Termin ist außerdem weiterhin in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.
