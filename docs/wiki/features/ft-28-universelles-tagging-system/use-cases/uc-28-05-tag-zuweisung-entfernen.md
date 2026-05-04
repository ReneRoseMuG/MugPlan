# UC 28/05: Tag-Zuweisung entfernen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur entfernt einen frei verwendbaren Tag von einem Domänenobjekt.

## Vorbedingungen

- Das Domänenobjekt existiert.
- Der Tag ist dem Domänenobjekt zugewiesen.
- Der Tag ist kein geschützter System-Tag.
- Der Akteur besitzt Schreibrechte für das Domänenobjekt.
- Für Termine gelten zusätzlich die fachlichen Schreibsperren aus FT (01).

## Ablauf

1. Der Akteur öffnet ein Domänenobjekt mit Tag-Bereich.
2. Das System zeigt die aktuell zugewiesenen Tags an.
3. Der Akteur wählt bei einem frei entfernbaren Tag die Entfernen-Aktion.
4. Das System entfernt die Tag-Zuweisung serverseitig.
5. Das Objekt wird ohne diesen Tag angezeigt.

## Alternativen

- Ist die Relation bereits nicht mehr vorhanden, darf keine fehlerhafte Duplikat- oder Negativrelation entstehen.
- Ist der Tag ein geschützter System-Tag, wird die generische Entfernung serverseitig abgewiesen.
- Der System-Tag **Reklamation** darf nicht über diesen generischen Use Case entfernt werden. Dafür gilt der Reklamationsworkflow aus FT (06).
- Der System-Tag **Storniert** darf nicht über diesen generischen Use Case entfernt werden.
- Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.

## Ergebnis

Das Domänenobjekt verliert den frei verwendbaren Tag. Geschützte System-Tags bleiben vor manueller Entfernung geschützt.

