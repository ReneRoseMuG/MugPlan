# UC 28/05: Tag-Zuweisung entfernen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur entfernt einen frei verwendbaren Tag von einem DomÃ¤nenobjekt.

## Vorbedingungen

- Das DomÃ¤nenobjekt existiert.
- Der Tag ist dem DomÃ¤nenobjekt zugewiesen.
- Der Tag ist kein geschÃ¼tzter System-Tag.
- Der Akteur besitzt Schreibrechte fÃ¼r das DomÃ¤nenobjekt.
- FÃ¼r Termine gelten zusÃ¤tzlich die fachlichen Schreibsperren aus FT (01).

## Ablauf

1. Der Akteur Ã¶ffnet ein DomÃ¤nenobjekt mit Tag-Bereich.
2. Das System zeigt die aktuell zugewiesenen Tags an.
3. Der Akteur wÃ¤hlt bei einem frei entfernbaren Tag die Entfernen-Aktion.
4. Das System entfernt die Tag-Zuweisung serverseitig.
5. Das Objekt wird ohne diesen Tag angezeigt.

## Alternativen

- Ist die Relation bereits nicht mehr vorhanden, darf keine fehlerhafte Duplikat- oder Negativrelation entstehen.
- Ist der Tag ein geschÃ¼tzter System-Tag, wird die generische Entfernung serverseitig abgewiesen.
- Der System-Tag **Reklamation** darf nicht Ã¼ber diesen generischen Use Case entfernt werden. DafÃ¼r gilt der Reklamationsworkflow aus FT (06).
- Der System-Tag **Storniert** darf nicht Ã¼ber diesen generischen Use Case entfernt werden.
- Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.

## Ergebnis

Das DomÃ¤nenobjekt verliert den frei verwendbaren Tag. GeschÃ¼tzte System-Tags bleiben vor manueller Entfernung geschÃ¼tzt.

