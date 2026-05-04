# UC 26/06: Auftragsliste konfigurieren und erzeugen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert

## Akteur

Angemeldeter Benutzer.

## Ziel

Der Benutzer ruft die Auftragsliste auf, konfiguriert Zeitraum und Filter und erzeugt die Kachelausgabe.

## Vorbedingungen

- Der Benutzer ist angemeldet.
- Der Navigationspunkt Reports ist verfügbar.
- Es existieren Projekte mit Terminen oder der Report kann einen leeren Zustand anzeigen.

## Ablauf

1. Der Benutzer öffnet Reports und wählt Auftragsliste.
2. Das System zeigt das Konfigurationspanel.
3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.
4. Der Benutzer passt optional Zeitraum, Kategorieauswahl, Tag-Filter, Sauna-Modell-Auswahl oder Shortcode-Schalter an.
5. Der Benutzer klickt auf Report erzeugen.
6. Das System ermittelt Projekte mit mindestens einem gültigen Termin im konfigurierten Zeitraum.
7. Das System schließt Projekte und Termine mit Reklamation-Tag vollständig aus.
8. Das System zeigt die Ergebnisse als Kachelraster, aufsteigend nach repräsentativem Termin.

## Alternativen

- Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.
- Keine passenden Einträge: Das System zeigt einen leeren Report-Zustand.
- Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.

## Ergebnis

Die Auftragsliste ist sichtbar. Die Filter- und Kategorieauswahl wurde nicht automatisch als Setting gespeichert. Wenn der Benutzer die Konfiguration dauerhaft sichern möchte, speichert er sie ausdrücklich als Preset.
