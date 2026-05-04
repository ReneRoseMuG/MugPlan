# UC 26/01: Vorlaufliste konfigurieren und erzeugen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert

## Akteur

Angemeldeter Benutzer.

## Ziel

Der Benutzer ruft die Vorlaufliste auf, konfiguriert Zeitraum und Spalten und erzeugt die tabellarische Ausgabe.

## Vorbedingungen

- Der Benutzer ist angemeldet.
- Der Navigationspunkt Reports ist verfügbar.
- Es existieren Termine mit Projektzuordnung oder der Report kann einen leeren Zustand anzeigen.

## Ablauf

1. Der Benutzer öffnet Reports und wählt Vorlaufliste.
2. Das System zeigt das Konfigurationspanel mit den Tabs Datum, Kalenderwoche und Spalten.
3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.
4. Der Benutzer passt optional Zeitraum, aktiven Tab, Spaltenauswahl, Spaltenreihenfolge, Spaltenbreiten oder Shortcode-Optionen an.
5. Der Benutzer klickt auf Report erzeugen.
6. Das System ermittelt Termine mit Projektzuordnung im konfigurierten Zeitraum.
7. Das System zeigt die Vorlaufliste aufsteigend nach vorgeplantem Termin.

## Alternativen

- Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.
- Keine passenden Einträge: Das System zeigt einen leeren Report-Zustand.
- Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.

## Ergebnis

Die Vorlaufliste ist sichtbar. Änderungen an Zeitraum, Tabs oder Spalten wurden nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.
