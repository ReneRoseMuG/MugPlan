# UC 21/04: Kategorisierung schlägt fehl

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../feature.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass eine fehlgeschlagene regelbasierte Gruppierung von Positionen die Extraktion nicht blockiert.

## Vorbedingungen

- Eine Artikelliste wurde extrahiert.
- Die regelbasierte Gruppierung liefert kein eindeutiges Ergebnis.

## Ablauf

1. Das System versucht, die Artikelliste anhand definierter Regeln zu gruppieren.
2. Das System erkennt, dass keine eindeutige Gruppierung möglich ist.
3. Das System stellt die Artikelliste in der ursprünglichen Reihenfolge dar.
4. Der Akteur kann die Liste weiterhin bearbeiten und übernehmen.

## Alternativen

- Teilweise Gruppierung möglich → Das System gruppiert nur eindeutig identifizierbare Bereiche; übrige Positionen bleiben in Originalreihenfolge.

## Ergebnis

Die Extraktion bleibt nutzbar. Es wird keine Blockade des Prozesses verursacht.
