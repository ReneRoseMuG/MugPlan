# UC 09/20: Notizen beim Kunde-LÃ¶schen entfernen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass beim LÃ¶schen eines Kunden auch die zugeordneten Notizen entfernt werden und keine RestzustÃ¤nde entstehen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte (Administrator).
- Dem Kunden sind keine Projekte zugeordnet (Bedingung fÃ¼r Kunde-LÃ¶schung, siehe UC 09/13).
- Optional: Dem Kunden sind Notizen zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Kunden im Kundenformular.
2. Der Akteur lÃ¶st die LÃ¶schaktion aus.
3. Das System prÃ¼ft, dass dem Kunden keine Projekte zugeordnet sind (siehe UC 09/13).
4. Das System lÃ¶scht den Kundendatensatz (siehe UC 09/13).
5. Das System entfernt gleichzeitig alle Zuordnungen zwischen Kunde und Notizen.
6. Das System aktualisiert alle betroffenen Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den LÃ¶schvorgang ab. Der Kunde und seine Notizen bleiben bestehen.
- Kunde besitzt Projekte: Das System blockiert die LÃ¶schung bereits vor diesem Punkt (siehe UC 09/13 und UC 09/14).

## Ergebnis

Der Kunde ist vollstÃ¤ndig gelÃ¶scht. Alle Notiz-Zuordnungen zum Kunden sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Kunden zugeordnet waren, werden ebenfalls gelÃ¶scht, sofern die Implementierung dies vorsieht.

