# UC 27/10: Attachment an Produkt oder Komponente löschen (Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Administrator

## Ziel

Ein Attachment von einem Produkt oder einer Komponente entfernen.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt die Rolle Administrator.
- Das Attachment existiert und ist einem Produkt oder einer Komponente zugeordnet.
- Der Nutzer befindet sich auf der Detailseite des Eintrags.

## Ablauf

1. Der Administrator klickt auf den Action-Button des Attachments.
2. Das System zeigt die Sicherheitsfrage: „Soll nur die Verknüpfung zum [Produkt / Komponente] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)"
3. Der Administrator trifft eine Auswahl.
4. Das System führt die gewählte Löschstufe aus.

## Alternativen

- Administrator bricht ab → keine Änderung.

## Ergebnis

Das Attachment ist entkoppelt oder vollständig entfernt.
