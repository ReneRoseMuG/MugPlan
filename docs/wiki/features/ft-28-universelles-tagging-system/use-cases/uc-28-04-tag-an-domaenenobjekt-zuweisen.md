# UC 28/04: Tag an DomÃ¤nenobjekt zuweisen

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur weist einem DomÃ¤nenobjekt einen frei verwendbaren Tag zu, um das Objekt fachlich zu markieren und spÃ¤ter filtern oder auswerten zu kÃ¶nnen.

## Vorbedingungen

- Der Tag existiert.
- Der Tag ist kein geschÃ¼tzter System-Tag.
- Das DomÃ¤nenobjekt existiert.
- Der Akteur besitzt Schreibrechte fÃ¼r das DomÃ¤nenobjekt.
- FÃ¼r Termine gelten zusÃ¤tzlich die fachlichen Schreibsperren aus FT (01).

## Ablauf

1. Der Akteur Ã¶ffnet ein DomÃ¤nenobjekt mit Tag-Bereich.
2. Das System lÃ¤dt den Tag-Katalog fÃ¼r die jeweilige DomÃ¤ne.
3. Das System zeigt nur Tags an, die fÃ¼r diese DomÃ¤ne manuell zuweisbar sind.
4. Der Akteur wÃ¤hlt einen Tag aus.
5. Das System legt die Tag-Zuweisung serverseitig an.
6. Das Objekt wird mit dem neuen Tag angezeigt.

## Alternativen

- Ist der Tag bereits zugewiesen, darf keine doppelte Relation entstehen.
- Ist der Tag ein geschÃ¼tzter System-Tag, wird die generische Zuweisung serverseitig abgewiesen.
- Der System-Tag **Reklamation** darf nicht Ã¼ber diesen generischen Use Case gesetzt werden. DafÃ¼r gilt der Reklamationsworkflow aus FT (06).
- Der System-Tag **Storniert** darf nicht Ã¼ber diesen generischen Use Case gesetzt werden. DafÃ¼r gilt der Storno-Workflow.
- Fehlen Schreibrechte, wird die Aktion nicht angeboten bzw. serverseitig verboten.

## Ergebnis

Das DomÃ¤nenobjekt besitzt den ausgewÃ¤hlten frei verwendbaren Tag. GeschÃ¼tzte System-Tags bleiben vor manueller Zuweisung geschÃ¼tzt.

