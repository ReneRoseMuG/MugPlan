# UC 06/02: Reklamationsnotiz bei Reklamation vorschlagen

## Metadaten

- Feature: [FT (06): Automatische Regeln](../ft-06-automatische-regeln.md)

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur markiert einen Termin oder ein Projekt als Reklamation und erhält dabei optional einen fachlich passenden Notizvorschlag. Beim Aufheben der Reklamation entscheidet der Akteur, ob eine vorhandene Reklamationsnotiz gelöscht oder als Dokumentation behalten wird.

## Vorbedingungen

- Das System-Tag **Reklamation** ist vorhanden und als geschütztes System-Tag markiert.
- Eine Notizvorlage **Reklamation** ist vorhanden.
- Der Akteur besitzt Schreibrechte für das betroffene Objekt.
- Das betroffene Objekt ist nicht durch fachliche Sperren für die Aktion gesperrt.
- Für Termine gelten zusätzlich die Termin-Schreibregeln aus FT (01), insbesondere Rollenlogik für historische und stornierte Termine.

## Ablauf

### Reklamation an Termin melden

1. Der Akteur öffnet einen Termin im Terminformular oder in einer Kalenderansicht mit Reklamationsaktion.
2. Der Akteur wählt **Reklamation melden**.
3. Das System setzt das geschützte System-Tag **Reklamation** am Termin über die fachliche Reklamationsfunktion.
4. Das System prüft, ob am Termin bereits eine passende Reklamationsnotiz vorhanden ist.
5. Wenn keine passende Notiz vorhanden ist, öffnet das System einen Vorschlagsdialog für eine Reklamationsnotiz.
6. Bestätigt der Akteur den Vorschlag, legt das System eine Notiz aus der Reklamationsvorlage am Termin an und öffnet den Notizeditor.
7. Überspringt der Akteur den Vorschlag, bleibt die Reklamation gesetzt, ohne dass eine Notiz angelegt wird.

### Reklamation an Projekt melden

1. Der Akteur öffnet ein bestehendes Projekt mit Reklamationsaktion.
2. Der Akteur wählt **Reklamation melden**.
3. Das System setzt das geschützte System-Tag **Reklamation** am Projekt über die fachliche Reklamationsfunktion.
4. Das System prüft, ob am Projekt bereits eine passende Reklamationsnotiz vorhanden ist.
5. Wenn keine passende Notiz vorhanden ist, öffnet das System einen Vorschlagsdialog für eine Reklamationsnotiz.
6. Bestätigt der Akteur den Vorschlag, wird eine Notiz aus der Reklamationsvorlage für die Projektnotizen vorbereitet und im Notizbereich zur Bearbeitung geöffnet.
7. Speichert der Akteur die Notiz, wird sie am Projekt angelegt. Bricht der Akteur die Notizbearbeitung ab, bleibt die Reklamation gesetzt, ohne dass eine Notiz entsteht.

### Reklamation beim Anlegen vorbereiten

1. Der Akteur öffnet das Projekt- oder Terminformular im Create-Modus.
2. Der Akteur wählt **Reklamation melden**.
3. Das System zeigt den Reklamationszustand lokal als Draft und bietet bei Bedarf den Reklamationsnotiz-Vorschlag an.
4. Der Akteur speichert das Projekt oder den Termin.
5. Nach erfolgreicher Anlage setzt das System die Reklamation über den dedizierten Reklamationspfad auf dem neu erzeugten Objekt.
6. Eine vorbereitete Reklamationsnotiz wird anschließend am neu erzeugten Objekt gespeichert oder bleibt bei Abbruch des Notizeditors aus.

### Reklamation aufheben

1. Der Akteur wählt am Termin oder Projekt **Reklamation aufheben**.
2. Das System entfernt das geschützte System-Tag **Reklamation** über die fachliche Reklamationsfunktion.
3. Das System prüft, ob eine passende Reklamationsnotiz vorhanden ist.
4. Wenn eine passende Notiz vorhanden ist, fragt das System, ob diese Notiz entfernt werden soll.
5. Bestätigt der Akteur das Entfernen, löscht das System die Notiz.
6. Entscheidet sich der Akteur für Behalten, bleibt die Notiz als Dokumentation bestehen.

## Alternativen

- Wenn bereits eine passende Reklamationsnotiz vorhanden ist, öffnet das System beim Setzen keinen weiteren Notizvorschlag.
- Wenn beim Aufheben keine passende Reklamationsnotiz vorhanden ist, wird kein Entferndialog geöffnet.
- Wenn das System-Tag **Reklamation** oder die Notizvorlage **Reklamation** fehlt, kann der jeweilige Folgefluss nicht vollständig ausgeführt werden und muss als fachlicher bzw. technischer Fehler behandelt werden.
- Wenn das Objekt durch Optimistic Locking veraltet ist, wird die Aktion abgewiesen und muss nach Neuladen erneut ausgeführt werden.
- Wenn das Speichern im Create-Modus fehlschlägt, werden Reklamations-Draft und Notiz-Draft nicht über generische Tag-Pfade persistiert.
- Wenn der Akteur keine ausreichende Rolle besitzt, ist die Reklamationsaktion nicht sichtbar bzw. serverseitig verboten.

## Ergebnis

Das betroffene Objekt besitzt oder verliert das System-Tag **Reklamation** konsistent über den fachlichen Workflow. Der optionale Notizfluss erzeugt keine unbeabsichtigten Duplikate und löscht vorhandene Dokumentation nur nach ausdrücklicher Bestätigung.
