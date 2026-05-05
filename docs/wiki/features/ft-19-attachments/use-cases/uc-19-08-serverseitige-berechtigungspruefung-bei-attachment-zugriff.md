# UC 19/08: Serverseitige Berechtigungsprüfung bei Attachment-Zugriff

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)

## Akteur

System

## Ziel

Sicherstellen, dass jeder Zugriff auf ein Attachment ausschließlich auf Basis der Parent-Berechtigungen erfolgt.

## Vorbedingungen

- Ein Attachment existiert.
- Ein Zugriff (Anzeige oder Download) wird angefordert.

## Ablauf

1. Das System identifiziert das angeforderte Attachment.
2. Das System ermittelt das zugehörige Parent-Objekt.
3. Das System prüft die Berechtigung des Akteurs für dieses Parent-Objekt.
4. Bei gültiger Berechtigung wird der Zugriff gewährt.
5. Bei fehlender Berechtigung wird der Zugriff verweigert.

**Alternativabläufe**

- Attachment existiert nicht → System antwortet mit 404.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Berechtigung → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

## Alternativen


## Ergebnis

- Attachment-Zugriffe sind vollständig an Parent-Berechtigungen gebunden.
- Es existieren keine eigenständigen Attachment-Berechtigungen.
- Direkter Zugriff auf das Upload-Verzeichnis ist nicht möglich.
