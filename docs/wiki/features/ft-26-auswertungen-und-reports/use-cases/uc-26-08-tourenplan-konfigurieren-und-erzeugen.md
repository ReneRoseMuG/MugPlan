# UC 26/08: Tourenplan konfigurieren und erzeugen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert

## Akteur

Angemeldeter Benutzer.

## Ziel

Der Benutzer ruft den Tourenplan auf, wählt Tour und Zeitraum und erzeugt die Kartenansicht.

## Vorbedingungen

- Der Benutzer ist angemeldet.
- Der Navigationspunkt Reports ist verfügbar.
- Es existieren Touren oder die Option Ohne Tour ist fachlich nutzbar.

## Ablauf

1. Der Benutzer öffnet Reports und wählt Tourenplan.
2. Das System zeigt das Konfigurationspanel.
3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.
4. Der Benutzer wählt eine Tour oder Ohne Tour.
5. Der Benutzer passt optional Zeitraum, Shortcode-Schalter, Druckmodus oder Vorschauoptionen an.
6. Der Benutzer klickt auf Report erzeugen.
7. Das System ermittelt die Termine der gewählten Tour im konfigurierten Zeitraum.
8. Das System gruppiert Karten nach Kalenderwoche und wendet die Tag-Priorität für die Darstellung an.

## Alternativen

- Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.
- Keine passenden Termine: Das System zeigt einen leeren Report-Zustand.
- Der Benutzer wendet ein Preset an: Das System setzt Tour, Zeitraum, Optionen, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.

## Ergebnis

Der Tourenplan ist sichtbar. Tour-Auswahl, Zeitraum, Druckmodus und Vorschauoptionen wurden nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.
