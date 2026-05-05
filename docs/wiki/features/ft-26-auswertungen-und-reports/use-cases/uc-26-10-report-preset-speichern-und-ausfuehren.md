# UC 26/10: Report-Preset speichern und ausführen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)
- Status: Abgeschlossen

## Akteur

Angemeldeter Benutzer. GLOBAL-Presets dürfen nur Admins verwalten.

## Ziel

Der Benutzer speichert eine Report-Konfiguration bewusst als Preset und führt dieses Preset später erneut aus.

## Vorbedingungen

- Der Benutzer ist angemeldet.
- Ein Report-Konfigurationspanel ist geöffnet.
- Die aktuelle Konfiguration ist fachlich gültig.

## Ablauf

1. Der Benutzer konfiguriert einen Report.
2. Der Benutzer wählt Preset speichern.
3. Das System fragt mindestens den Preset-Namen und den Scope ab.
4. Das System erlaubt jedem Benutzer den Scope USER.
5. Das System erlaubt den Scope GLOBAL nur Admins.
6. Das System speichert die Konfiguration serverseitig als Preset.
7. Der Benutzer wählt später ein Preset aus.
8. Das System lädt das Preset, validiert Scope und Report-Key und setzt die gespeicherte Konfiguration in den Report.
9. Enthält das Preset dynamische Kalenderwochen, löst das System Start aktuelle KW oder Start kommende KW mit Anzahl KW in eine konkrete Datumsspanne auf.
10. Enthält das Preset Aktionen, führt das System die erlaubten Aktionen in definierter Reihenfolge aus.

## Alternativen

- Der Benutzer versucht, ein GLOBAL-Preset ohne Admin-Recht zu speichern: Das System verweigert die Änderung serverseitig.
- Das Preset enthält einen ungültigen Report-Key oder eine ungültige Aktion: Das System verweigert die Speicherung oder Ausführung.
- Das Preset gehört einem anderen Benutzer und ist USER-gescoped: Das System zeigt es nicht an und erlaubt keinen direkten Zugriff.

## Ergebnis

Das Preset steht im zulässigen Scope zur Verfügung. Es ersetzt keine stille Settings-Persistenz; es wird nur durch ausdrückliche Benutzeraktion gespeichert und angewendet.
