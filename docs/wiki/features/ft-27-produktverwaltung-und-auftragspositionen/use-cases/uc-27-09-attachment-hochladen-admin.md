# UC 27/09: Attachment an Produkt oder Komponente hochladen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Administrator

## Ziel

Ein Dokument (z. B. technische Zeichnung, Montageanleitung) an ein Produkt oder eine Komponente anhängen.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt die Rolle Administrator.
- Das Produkt oder die Komponente existiert.
- Der Nutzer befindet sich auf der Detailseite des Eintrags.

## Ablauf

1. Der Administrator klickt auf „Datei hochladen".
2. Der Administrator wählt eine Datei aus.
3. Das System validiert Dateigröße und Typ gemäß FT-19-Regeln.
4. Das System speichert die Datei und legt den Attachment-Datensatz an.
5. Die Attachmentliste auf der Detailseite aktualisiert sich.

## Alternativen

- Datei überschreitet die Größenbegrenzung → Validierungsfehler, keine Speicherung.
- Ungültiger Dateityp → Validierungsfehler, keine Speicherung.

## Ergebnis

Das Attachment ist gespeichert und in der Liste des Produkts oder der Komponente sichtbar.
