# UC 19/05: Attachment-Upload validieren (Größe / Typ)

## Metadaten

- Feature: [FT (19): Attachments](../ft-19-attachments.md)

## Akteur

System

## Ziel

Sicherstellen, dass ausschließlich zulässige Dateien gespeichert werden.

## Vorbedingungen

- Eine Datei wurde im Rahmen eines Upload-Vorgangs übermittelt.

## Ablauf

1. Das System liest die übermittelte Dateigröße.
2. Das System vergleicht die Größe mit dem definierten Maximalwert.
3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).
4. Das System prüft, ob der Dateityp grundsätzlich zulässig ist.
5. Bei gültiger Datei wird der Upload-Prozess fortgesetzt.
6. Bei ungültiger Datei wird der Upload-Prozess abgebrochen.

**Alternativabläufe**

- Datei überschreitet Größenlimit → System antwortet mit 400 und speichert nichts.
- Datei besitzt unzulässigen Typ → System antwortet mit 400 und speichert nichts.
- Technischer Fehler bei Validierung → System antwortet mit 500 und speichert nichts.

## Alternativen


## Ergebnis

- Nur valide Dateien werden persistiert.
- Ungültige Dateien werden vollständig verworfen.
- Es entstehen keine unvollständigen Attachment-Datensätze.
