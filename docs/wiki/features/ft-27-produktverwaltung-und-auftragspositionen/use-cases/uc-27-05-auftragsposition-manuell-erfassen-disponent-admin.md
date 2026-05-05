# UC 27/05: Auftragsposition manuell erfassen (Disponent / Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)

## Akteur

Disponent, Administrator

## Ziel

Eine Auftragsposition unter einem Projekt mit strukturiertem Bezug zu einem Produkt oder einer Komponente (optional mit freier Beschreibung) erfassen.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt Änderungsrechte.
- Das Projekt existiert.

## Ablauf

1. Der Nutzer öffnet ein Projekt.
2. Der Nutzer öffnet die Artikelliste des Projekts.
3. Der Nutzer klickt auf „+ Position hinzufügen".
4. Das System öffnet ein Eingabeformular für eine neue Auftragsposition.
5. Der Nutzer wählt optional ein Produkt aus einem Dropdown (alle aktiven Produkte).
6. Der Nutzer wählt optional eine Komponente aus einem Dropdown (alle aktiven Komponenten, unabhängig vom gewählten Produkt).
7. Der Nutzer gibt optional eine freie Beschreibung ein.
8. Der Nutzer gibt die Menge ein (Pflichtfeld, Zahl > 0).
9. Der Nutzer speichert die Position.
10. Das System validiert: Mindestens eines von (product_id, component_id) muss gesetzt sein.
11. Das System validiert: quantity > 0.
12. Das System persistiert die Position mit project_id.

## Alternativen

- Nutzer gibt weder Produkt noch Komponente an → Validierungsfehler.
- Menge ist ≤ 0 oder nicht numerisch → Validierungsfehler.
- Inaktive Produkte oder Komponenten → werden aus den Dropdowns herausgefiltert.
- Der Nutzer bricht ab → Keine Position wird gespeichert.

## Ergebnis

Die Auftragsposition ist gespeichert und in der Artikelliste des Projekts sichtbar. Sie ist strukturiert mit einem Produkt oder einer Komponente verknüpft.
