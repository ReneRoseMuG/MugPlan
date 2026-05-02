# UC 16/09: Hilfetexte aus Datei importieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Mehrere Hilfetext-Items aus einer Datei in das System Ã¼bernehmen, um Hilfetexte zentral zu pflegen und auÃŸerhalb der Anwendung versionierbar bearbeiten zu kÃ¶nnen.

## Vorbedingungen

Der Akteur ist authentifiziert und besitzt Admin-Rechte. ZusÃ¤tzlich liegt eine Importdatei vor, die eine Menge von Hilfetext-Items enthÃ¤lt, wobei jedes Item mindestens einen eindeutigen `help_key` sowie einen Inhalt in dem im System definierten Format enthÃ¤lt.

## Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung und startet die Funktion â€žHilfetexte importierenâ€œ.
2. Das System Ã¶ffnet einen Dialog zur Dateiauswahl und der Akteur wÃ¤hlt die Importdatei aus.
3. Das System liest die Datei ein und validiert, dass die Datei syntaktisch korrekt ist und dass jedes Item einen `help_key` besitzt.
4. Das System prÃ¼ft, dass die `help_key`Werte innerhalb der Datei eindeutig sind, da pro `help_key` genau ein Hilfetext existieren darf.
5. Das System vergleicht jedes importierte Item anhand des `help_key` mit dem bestehenden Datensatz im System.
6. Wenn ein Datensatz bereits existiert und dessen Inhalt leer ist, Ã¼berschreibt das System den Datensatz ohne weitere RÃ¼ckfrage mit dem importierten Inhalt.
7. Wenn ein Datensatz bereits existiert und dessen Inhalt nicht leer ist, fordert das System den Akteur fÃ¼r dieses Item zur Entscheidung auf und ermÃ¶glicht mindestens â€žÃœberschreibenâ€œ oder â€žÃœberspringenâ€œ.
8. Wenn zu einem `help_key` noch kein Datensatz existiert, legt das System einen neuen Hilfetext an.
9. Der Akteur bestÃ¤tigt den Importlauf und das System Ã¼bernimmt die Ã„nderungen persistent.

## Alternativen

Wenn die Datei ungÃ¼ltig ist, ein Pflichtfeld fehlt oder doppelte `help_key`-Werte in der Datei vorkommen, bricht das System den Import ab und zeigt einen Validierungsfehler an. Wenn der Akteur den Vorgang abbricht, werden keine Ã„nderungen gespeichert.

## Ergebnis

Die Hilfetexte sind gemÃ¤ÃŸ Regeln importiert. Vorhandene leere Inhalte sind still ersetzt. Bestehende befÃ¼llte Inhalte sind nur nach expliziter Entscheidung Ã¼berschrieben oder Ã¼bersprungen.

