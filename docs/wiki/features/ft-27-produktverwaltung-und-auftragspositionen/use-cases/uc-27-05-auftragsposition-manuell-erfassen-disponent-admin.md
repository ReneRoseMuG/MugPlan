# UC 27/05: Auftragsposition manuell erfassen (Disponent / Admin)

## Metadaten

- Feature: [FT (27): Produktverwaltung und Auftragspositionen](../ft-27-produktverwaltung-und-auftragspositionen.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e8154a475eef591e57861
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Eine Auftragsposition unter einem Projekt mit strukturiertem Bezug zu einem Produkt oder einer Komponente (optional mit freier Beschreibung) erfassen.

## Vorbedingungen

- Der Nutzer ist angemeldet und besitzt Ã„nderungsrechte.
- Das Projekt existiert.

## Ablauf

1. Der Nutzer Ã¶ffnet ein Projekt.
2. Der Nutzer Ã¶ffnet die Artikelliste des Projekts.
3. Der Nutzer klickt auf â€ž+ Position hinzufÃ¼gen".
4. Das System Ã¶ffnet ein Eingabeformular fÃ¼r eine neue Auftragsposition.
5. Der Nutzer wÃ¤hlt optional ein Produkt aus einem Dropdown (alle aktiven Produkte).
6. Der Nutzer wÃ¤hlt optional eine Komponente aus einem Dropdown (alle aktiven Komponenten, unabhÃ¤ngig vom gewÃ¤hlten Produkt).
7. Der Nutzer gibt optional eine freie Beschreibung ein.
8. Der Nutzer gibt die Menge ein (Pflichtfeld, Zahl > 0).
9. Der Nutzer speichert die Position.
10. Das System validiert: Mindestens eines von (product_id, component_id) muss gesetzt sein.
11. Das System validiert: quantity > 0.
12. Das System persistiert die Position mit project_id.

## Alternativen

- Nutzer gibt weder Produkt noch Komponente an â†’ Validierungsfehler.
- Menge ist â‰¤ 0 oder nicht numerisch â†’ Validierungsfehler.
- Inaktive Produkte oder Komponenten â†’ werden aus den Dropdowns herausgefiltert.
- Der Nutzer bricht ab â†’ Keine Position wird gespeichert.

## Ergebnis

Die Auftragsposition ist gespeichert und in der Artikelliste des Projekts sichtbar. Sie ist strukturiert mit einem Produkt oder einer Komponente verknÃ¼pft.

