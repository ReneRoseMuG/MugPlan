# UC 19/04: Attachment herunterladen

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)

## Akteur

Disponent, Leser (rollenabhängig)

## Ziel

Ein Attachment eines Parent-Objekts (Projekt, Kunde, Mitarbeiter oder Termin) lokal speichern.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehörige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

## Ablauf

1. Der Akteur wählt die Download-Funktion für ein Attachment.
2. Das System prüft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt mit Download-Parameter auf.
4. Das System liefert:
    - korrekten MIME-Typ,
    - Content-Disposition „attachment“,
    - den gespeicherten Dateistream.
5. Der Browser startet den Download.

**Alternativabläufe**

- Attachment nicht auffindbar → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

## Alternativen


## Ergebnis

- Die Datei wird lokal gespeichert.
- Es werden keine persistenten Daten verändert.
