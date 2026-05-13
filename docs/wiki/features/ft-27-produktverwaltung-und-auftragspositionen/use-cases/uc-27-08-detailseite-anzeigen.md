# UC 27/08: Detailseite anzeigen (Produkt / Komponente)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Administrator, Disponent

## Ziel

Alle Stammdatenfelder sowie Attachments eines Produkts oder einer Komponente strukturiert einsehen.

## Vorbedingungen

- Der Nutzer ist angemeldet.
- Das Produkt oder die Komponente existiert.

## Ablauf

1. Der Nutzer öffnet die Produktverwaltung oder die Komponentenverwaltung.
2. Der Nutzer wählt einen Eintrag aus der Liste aus.
3. Das System öffnet die Detailseite des gewählten Eintrags.
4. Die Detailseite zeigt: Name, Kategorie, Beschreibung, Aktivitätsstatus sowie die Attachmentliste.
5. Jedes Attachment wird mit Dateiname, Dateityp, Dateigröße und Erstellungsdatum angezeigt.

## Alternativen

- Der Eintrag existiert nicht mehr → Fehlermeldung.

## Ergebnis

Der Nutzer sieht alle Stammdaten und Attachments des gewählten Eintrags.
