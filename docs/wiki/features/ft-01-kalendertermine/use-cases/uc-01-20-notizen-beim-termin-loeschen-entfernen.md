# UC 01/20: Notizen beim Termin-Löschen entfernen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass beim Löschen eines Termins auch die zugeordneten Notizen entfernt werden und keine Restzustände entstehen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin liegt nicht in der Vergangenheit.
- Optional: Dem Termin sind Notizen zugeordnet.

## Ablauf

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
2. Der Akteur löst die Löschaktion aus.
3. Das System löscht den Termin (siehe UC 01/04).
4. Das System entfernt gleichzeitig alle Zuordnungen zwischen Termin und Notizen.
5. Das System aktualisiert alle betroffenen Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den Löschvorgang ab. Der Termin und seine Notizen bleiben bestehen.

## Ergebnis

Der Termin ist vollständig gelöscht. Alle Notiz-Zuordnungen zum Termin sind entfernt. Falls die Notizen auch von anderen Objekten (z. B. Projekten oder Kunden) zugeordnet sind, bleiben diese Zuordnungen bestehen. Notizen, die nur diesem Termin zugeordnet waren, werden ebenfalls gelöscht, sofern die Implementierung dies vorsieht.

