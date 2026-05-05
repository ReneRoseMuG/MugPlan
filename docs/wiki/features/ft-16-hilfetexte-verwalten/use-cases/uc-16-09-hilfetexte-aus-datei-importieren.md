# UC 16/09: Hilfetexte aus Datei importieren

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../ft-16-hilfetexte-verwalten.md)

## Akteur

Admin

## Ziel

Mehrere Hilfetext-Items aus einer Datei in das System übernehmen, um Hilfetexte zentral zu pflegen und außerhalb der Anwendung versionierbar bearbeiten zu können.

## Vorbedingungen

Der Akteur ist authentifiziert und besitzt Admin-Rechte. Zusätzlich liegt eine Importdatei vor, die eine Menge von Hilfetext-Items enthält, wobei jedes Item mindestens einen eindeutigen `help_key` sowie einen Inhalt in dem im System definierten Format enthält.

## Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung und startet die Funktion „Hilfetexte importieren“.
2. Das System öffnet einen Dialog zur Dateiauswahl und der Akteur wählt die Importdatei aus.
3. Das System liest die Datei ein und validiert, dass die Datei syntaktisch korrekt ist und dass jedes Item einen `help_key` besitzt.
4. Das System prüft, dass die `help_key`Werte innerhalb der Datei eindeutig sind, da pro `help_key` genau ein Hilfetext existieren darf.
5. Das System vergleicht jedes importierte Item anhand des `help_key` mit dem bestehenden Datensatz im System.
6. Wenn ein Datensatz bereits existiert und dessen Inhalt leer ist, überschreibt das System den Datensatz ohne weitere Rückfrage mit dem importierten Inhalt.
7. Wenn ein Datensatz bereits existiert und dessen Inhalt nicht leer ist, fordert das System den Akteur für dieses Item zur Entscheidung auf und ermöglicht mindestens „Überschreiben“ oder „Überspringen“.
8. Wenn zu einem `help_key` noch kein Datensatz existiert, legt das System einen neuen Hilfetext an.
9. Der Akteur bestätigt den Importlauf und das System übernimmt die Änderungen persistent.

## Alternativen

Wenn die Datei ungültig ist, ein Pflichtfeld fehlt oder doppelte `help_key`-Werte in der Datei vorkommen, bricht das System den Import ab und zeigt einen Validierungsfehler an. Wenn der Akteur den Vorgang abbricht, werden keine Änderungen gespeichert.

## Ergebnis

Die Hilfetexte sind gemäß Regeln importiert. Vorhandene leere Inhalte sind still ersetzt. Bestehende befüllte Inhalte sind nur nach expliziter Entscheidung überschrieben oder übersprungen.
