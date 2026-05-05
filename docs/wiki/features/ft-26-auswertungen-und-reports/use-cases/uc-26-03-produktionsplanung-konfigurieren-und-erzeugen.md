# UC 26/03: Produktionsplanung konfigurieren und erzeugen

## Metadaten

- Feature: [FT (26): Auswertungen und Reports](../ft-26-auswertungen-und-reports.md)
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Importstatus: Lokal für Report-Presets und entkoppelte Persistenz aktualisiert

## Akteur

Angemeldeter Benutzer. Das Bearbeiten der globalen Layout-Konfiguration ist Admins vorbehalten.

## Ziel

Der Benutzer ruft die Produktionsplanung auf, konfiguriert Zeitraum und Optionen und erzeugt die Summenbereiche sowie die Sondermaß-Kacheln.

## Vorbedingungen

- Der Benutzer ist angemeldet.
- Der Navigationspunkt Reports ist verfügbar.
- Die globale Produktionsplanungs-Layout-Konfiguration ist entweder vorhanden oder das System nutzt das Standardlayout.

## Ablauf

1. Der Benutzer öffnet Reports und wählt Produktionsplanung.
2. Das System zeigt das Konfigurationspanel.
3. Der Report startet ohne Wiederherstellung alter Report-Settings im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.
4. Der Benutzer passt optional Zeitraum und Shortcode-Schalter an.
5. Optional öffnet ein Admin den Kategorie-Layout-Editor und ändert die globale Layout-Konfiguration.
6. Der Benutzer klickt auf Report erzeugen.
7. Das System ermittelt Projekte mit Terminen im konfigurierten Zeitraum.
8. Das System schließt Projekte und Termine mit Reklamation-Tag oder Storniert-Tag vollständig aus.
9. Das System aggregiert Produkt- und Komponentenmengen entsprechend Layout und Shortcode-Konfiguration.
10. Das System zeigt unten nur Einzelkacheln für Projekte bzw. Termine, die das System-Tag Sondermaß tragen.

## Alternativen

- Pflichtangaben fehlen: Das System verhindert die Erzeugung oder zeigt eine Validierungsmeldung.
- Keine passenden Einträge: Das System zeigt leere Summenbereiche und keinen Kachelbereich.
- Ein Nicht-Admin versucht, die globale Layout-Konfiguration zu ändern: Das System verweigert die Änderung serverseitig.
- Der Benutzer wendet ein Preset an: Das System setzt die gespeicherte Konfiguration, löst dynamische Kalenderwochen auf und führt optionale Preset-Aktionen aus.

## Ergebnis

Die Produktionsplanung ist sichtbar. Die Summenbereiche folgen der aktuellen Konfiguration. Der untere Kachelbereich enthält ausschließlich Sondermaß-Kacheln. Anmerkungen oder Gespiegelt allein erzeugen keine Kachel.
