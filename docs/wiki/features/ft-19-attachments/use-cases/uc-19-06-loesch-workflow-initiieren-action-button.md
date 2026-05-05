# UC 19/06: Lösch-Workflow initiieren (Action Button)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)

## Akteur

Disponent, Administrator

## Ziel

Ein Attachment über den Action-Button am Attachment-Badge gezielt entfernen — entweder durch Entkopplung vom Parent-Objekt oder durch physische Löschung von Datensatz und Datei.

## Vorbedingungen

- Das Attachment existiert.
- Das zugehörige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte für das Parent-Objekt.

## Ablauf

1. Der Akteur klickt den Action-Button am Attachment-Badge.
2. Das System zeigt einen Bestätigungsdialog mit der Sicherheitsfrage: „Soll nur die Verknüpfung zum [Parent-Typ] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“
3. Der Akteur wählt eine der beiden Optionen oder bricht ab.
4. Bei Entkopplung: Das System entfernt den Attachment-Datensatz. Die physische Datei bleibt erhalten.
5. Bei physischer Löschung: Das System entfernt den Attachment-Datensatz und löscht die physische Datei aus dem Upload-Verzeichnis.
6. Das System prüft serverseitig Authentifizierung, Berechtigung und Existenz von Attachment und Parent.
7. Das System aktualisiert die Attachmentliste in der UI.

**Alternativabläufe**

- Akteur bricht den Dialog ab → keine Aktion, Attachment bleibt unverändert.
- Attachment existiert nicht → System antwortet mit 404.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Änderungsrechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500, keine Teillöschung.

## Alternativen


## Ergebnis

- Bei Entkopplung: Datensatz ist entfernt, Datei bleibt im Upload-Verzeichnis erhalten.
- Bei physischer Löschung: Datensatz und Datei sind vollständig entfernt.
- Die Attachmentliste zeigt den aktuellen Stand konsistent an.
