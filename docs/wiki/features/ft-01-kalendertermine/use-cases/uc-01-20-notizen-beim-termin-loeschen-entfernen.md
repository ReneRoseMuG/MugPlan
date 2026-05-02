# UC 01/20: Notizen beim Termin-LÃ¶schen entfernen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass beim LÃ¶schen eines Termins auch die zugeordneten Notizen entfernt werden und keine RestzustÃ¤nde entstehen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin liegt nicht in der Vergangenheit.
- Optional: Dem Termin sind Notizen zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Der Akteur lÃ¶st die LÃ¶schaktion aus.
3. Das System lÃ¶scht den Termin (siehe UC 01/04).
4. Das System entfernt gleichzeitig alle Zuordnungen zwischen Termin und Notizen.
5. Das System aktualisiert alle betroffenen Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den LÃ¶schvorgang ab. Der Termin und seine Notizen bleiben bestehen.

## Ergebnis

Der Termin ist vollstÃ¤ndig gelÃ¶scht. Alle Notiz-Zuordnungen zum Termin sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten oder Kunden) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Termin zugeordnet waren, werden ebenfalls gelÃ¶scht, sofern die Implementierung dies vorsieht.

