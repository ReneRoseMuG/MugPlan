# UC 06/02: Reklamationsnotiz bei Reklamation vorschlagen

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)
- Notion-Quelle: https://app.notion.com/p/33fda094354e8029a54fc0c7a6cc1588
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur markiert einen Termin oder ein Projekt als Reklamation und erhÃ¤lt dabei optional einen fachlich passenden Notizvorschlag. Beim Aufheben der Reklamation entscheidet der Akteur, ob eine vorhandene Reklamationsnotiz gelÃ¶scht oder als Dokumentation behalten wird.

## Vorbedingungen

- Das System-Tag **Reklamation** ist vorhanden und als geschÃ¼tztes System-Tag markiert.
- Eine Notizvorlage **Reklamation** ist vorhanden.
- Der Akteur besitzt Schreibrechte fÃ¼r das betroffene Objekt.
- Das betroffene Objekt ist nicht durch fachliche Sperren fÃ¼r die Aktion gesperrt.
- FÃ¼r Termine gelten zusÃ¤tzlich die Termin-Schreibregeln aus FT (01), insbesondere Rollenlogik fÃ¼r historische und stornierte Termine.

## Ablauf

### Reklamation an Termin melden

1. Der Akteur Ã¶ffnet einen Termin im Terminformular oder in einer Kalenderansicht mit Reklamationsaktion.
2. Der Akteur wÃ¤hlt **Reklamation melden**.
3. Das System setzt das geschÃ¼tzte System-Tag **Reklamation** am Termin Ã¼ber die fachliche Reklamationsfunktion.
4. Das System prÃ¼ft, ob am Termin bereits eine passende Reklamationsnotiz vorhanden ist.
5. Wenn keine passende Notiz vorhanden ist, Ã¶ffnet das System einen Vorschlagsdialog fÃ¼r eine Reklamationsnotiz.
6. BestÃ¤tigt der Akteur den Vorschlag, legt das System eine Notiz aus der Reklamationsvorlage am Termin an und Ã¶ffnet den Notizeditor.
7. Ãœberspringt der Akteur den Vorschlag, bleibt die Reklamation gesetzt, ohne dass eine Notiz angelegt wird.

### Reklamation an Projekt melden

1. Der Akteur Ã¶ffnet ein Projekt mit Reklamationsaktion.
2. Der Akteur wÃ¤hlt **Reklamation melden**.
3. Das System setzt das geschÃ¼tzte System-Tag **Reklamation** am Projekt Ã¼ber die fachliche Reklamationsfunktion.
4. Das System prÃ¼ft, ob am Projekt bereits eine passende Reklamationsnotiz vorhanden ist.
5. Wenn keine passende Notiz vorhanden ist, Ã¶ffnet das System einen Vorschlagsdialog fÃ¼r eine Reklamationsnotiz.
6. BestÃ¤tigt der Akteur den Vorschlag, wird eine Notiz aus der Reklamationsvorlage fÃ¼r die Projektnotizen vorbereitet und im Notizbereich zur Bearbeitung geÃ¶ffnet.
7. Speichert der Akteur die Notiz, wird sie am Projekt angelegt. Bricht der Akteur die Notizbearbeitung ab, bleibt die Reklamation gesetzt, ohne dass eine Notiz entsteht.

### Reklamation aufheben

1. Der Akteur wÃ¤hlt am Termin oder Projekt **Reklamation aufheben**.
2. Das System entfernt das geschÃ¼tzte System-Tag **Reklamation** Ã¼ber die fachliche Reklamationsfunktion.
3. Das System prÃ¼ft, ob eine passende Reklamationsnotiz vorhanden ist.
4. Wenn eine passende Notiz vorhanden ist, fragt das System, ob diese Notiz entfernt werden soll.
5. BestÃ¤tigt der Akteur das Entfernen, lÃ¶scht das System die Notiz.
6. Entscheidet sich der Akteur fÃ¼r Behalten, bleibt die Notiz als Dokumentation bestehen.

## Alternativen

- Wenn bereits eine passende Reklamationsnotiz vorhanden ist, Ã¶ffnet das System beim Setzen keinen weiteren Notizvorschlag.
- Wenn beim Aufheben keine passende Reklamationsnotiz vorhanden ist, wird kein Entferndialog geÃ¶ffnet.
- Wenn das System-Tag **Reklamation** oder die Notizvorlage **Reklamation** fehlt, kann der jeweilige Folgefluss nicht vollstÃ¤ndig ausgefÃ¼hrt werden und muss als fachlicher bzw. technischer Fehler behandelt werden.
- Wenn das Objekt durch Optimistic Locking veraltet ist, wird die Aktion abgewiesen und muss nach Neuladen erneut ausgefÃ¼hrt werden.
- Wenn der Akteur keine ausreichende Rolle besitzt, ist die Reklamationsaktion nicht sichtbar bzw. serverseitig verboten.

## Ergebnis

Das betroffene Objekt besitzt oder verliert das System-Tag **Reklamation** konsistent Ã¼ber den fachlichen Workflow. Der optionale Notizfluss erzeugt keine unbeabsichtigten Duplikate und lÃ¶scht vorhandene Dokumentation nur nach ausdrÃ¼cklicher BestÃ¤tigung.

