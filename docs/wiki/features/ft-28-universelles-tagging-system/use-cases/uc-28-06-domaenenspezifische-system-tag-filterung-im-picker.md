# UC 28/06: Domänenspezifische System-Tag-Filterung im Picker

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../feature.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur sieht im Tag-Picker nur Tags, die in der jeweiligen Domäne manuell zugewiesen werden dürfen. Geschützte System-Tags werden nicht als frei auswählbare Tags angeboten.

## Vorbedingungen

- Es existieren frei verwendbare Tags und geschützte System-Tags.
- Das System kennt die Domäne, für die der Tag-Katalog geladen wird.

## Ablauf

1. Der Akteur öffnet den Tag-Picker für Kunde, Mitarbeiter, Termin oder Projekt.
2. Das System lädt den Tag-Katalog mit Domänenbezug.
3. Das System filtert geschützte System-Tags serverseitig aus dem Picker.
4. Der Akteur sieht nur Tags, die in dieser Domäne manuell zuweisbar sind.

## Alternativen

- Bei Kunden und Mitarbeitern werden geschützte System-Tags nicht im Picker angeboten.
- Bei Terminen werden geschützte System-Tags nicht im Picker angeboten. **Storniert** wird ausschließlich über den Storno-Workflow gesetzt; **Reklamation** wird ausschließlich über die Reklamationsfunktion gesetzt oder entfernt.
- Bei Projekten werden geschützte System-Tags nicht im Picker angeboten. **Reklamation** wird ausschließlich über die Reklamationsfunktion gesetzt oder entfernt.
- Wenn ein Client einen geschützten System-Tag trotzdem direkt über eine generische Tag-API zuweisen oder entfernen will, muss der Server die Mutation abweisen.

## Ergebnis

Der Tag-Picker bleibt domänenspezifisch korrekt und bietet keine Systemzustände als frei pflegbare Tags an. Die fachlichen Workflows behalten die Kontrolle über geschützte System-Tags.
