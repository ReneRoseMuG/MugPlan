# UC 28/06: DomÃ¤nenspezifische System-Tag-Filterung im Picker

## Metadaten

- Feature: [FT (28): Universelles Tagging-System](../ft-28-universelles-tagging-system.md)
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator oder Disponent.

## Ziel

Der Akteur sieht im Tag-Picker nur Tags, die in der jeweiligen DomÃ¤ne manuell zugewiesen werden dÃ¼rfen. GeschÃ¼tzte System-Tags werden nicht als frei auswÃ¤hlbare Tags angeboten.

## Vorbedingungen

- Es existieren frei verwendbare Tags und geschÃ¼tzte System-Tags.
- Das System kennt die DomÃ¤ne, fÃ¼r die der Tag-Katalog geladen wird.

## Ablauf

1. Der Akteur Ã¶ffnet den Tag-Picker fÃ¼r Kunde, Mitarbeiter, Termin oder Projekt.
2. Das System lÃ¤dt den Tag-Katalog mit DomÃ¤nenbezug.
3. Das System filtert geschÃ¼tzte System-Tags serverseitig aus dem Picker.
4. Der Akteur sieht nur Tags, die in dieser DomÃ¤ne manuell zuweisbar sind.

## Alternativen

- Bei Kunden und Mitarbeitern werden geschÃ¼tzte System-Tags nicht im Picker angeboten.
- Bei Terminen werden geschÃ¼tzte System-Tags nicht im Picker angeboten. **Storniert** wird ausschlieÃŸlich Ã¼ber den Storno-Workflow gesetzt; **Reklamation** wird ausschlieÃŸlich Ã¼ber die Reklamationsfunktion gesetzt oder entfernt.
- Bei Projekten werden geschÃ¼tzte System-Tags nicht im Picker angeboten. **Reklamation** wird ausschlieÃŸlich Ã¼ber die Reklamationsfunktion gesetzt oder entfernt.
- Wenn ein Client einen geschÃ¼tzten System-Tag trotzdem direkt Ã¼ber eine generische Tag-API zuweisen oder entfernen will, muss der Server die Mutation abweisen.

## Ergebnis

Der Tag-Picker bleibt domÃ¤nenspezifisch korrekt und bietet keine SystemzustÃ¤nde als frei pflegbare Tags an. Die fachlichen Workflows behalten die Kontrolle Ã¼ber geschÃ¼tzte System-Tags.

