# UC 28/04: Tag an Domänenobjekt zuweisen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../feature.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur weist einem Domänenobjekt einen frei verwendbaren Tag zu, um das Objekt fachlich zu markieren und später filtern oder auswerten zu können.

## Vorbedingungen

- Der Tag existiert.
- Der Tag ist kein geschützter System-Tag.
- Das Domänenobjekt existiert.
- Der Akteur besitzt Schreibrechte für das Domänenobjekt.
- Für Termine gelten zusätzlich die fachlichen Schreibsperren aus FT (01).

## Ablauf

1. Der Akteur öffnet ein Domänenobjekt mit Tag-Bereich.
2. Das System lädt den Tag-Katalog für die jeweilige Domäne.
3. Das System zeigt nur Tags an, die für diese Domäne manuell zuweisbar sind.
4. Der Akteur wählt einen Tag aus.
5. Das System legt die Tag-Zuweisung serverseitig an.
6. Das Objekt wird mit dem neuen Tag angezeigt.

## Alternativen

- Ist der Tag bereits zugewiesen, darf keine doppelte Relation entstehen.
- Ist der Tag ein geschützter System-Tag, wird die generische Zuweisung serverseitig abgewiesen.
- Der System-Tag **Reklamation** darf nicht über diesen generischen Use Case gesetzt werden. Dafür gilt der Reklamationsworkflow aus FT (06).
- Der System-Tag **Storniert** darf nicht über diesen generischen Use Case gesetzt werden. Dafür gilt der Storno-Workflow.
- Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.

## Ergebnis

Das Domänenobjekt besitzt den ausgewählten frei verwendbaren Tag. Geschützte System-Tags bleiben vor manueller Zuweisung geschützt.
