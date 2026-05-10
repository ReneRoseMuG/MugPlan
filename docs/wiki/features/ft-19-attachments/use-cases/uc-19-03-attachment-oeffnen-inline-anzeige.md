# UC 19/03: Attachment öffnen (Inline-Anzeige)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)

## Akteur

Disponent, Leser (rollenabhängig)

## Ziel

Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) direkt im Browser anzeigen, sofern der Dateityp Inline-Anzeige unterstützt.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehörige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

## Ablauf

1. Der Akteur wählt ein Attachment aus der Liste.
2. Das System prüft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt auf.
4. Das System liefert die Datei mit:
    - korrektem MIME-Typ,
    - Content-Disposition „inline“, sofern Dateityp Inline-Anzeige erlaubt.
5. Der Browser zeigt die Datei an.


## Alternativen

- Dateityp nicht inlinefähig → System liefert Content-Disposition „attachment“.
- Attachment existiert nicht → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

## Alternativen


## Ergebnis

- Das Attachment wird inline angezeigt oder als Download behandelt.
- Es werden keine persistenten Daten verändert.
