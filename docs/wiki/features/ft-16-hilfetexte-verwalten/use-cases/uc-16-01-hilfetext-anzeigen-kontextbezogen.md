# UC 16/01: Hilfetext anzeigen (kontextbezogen)

## Metadaten

- Feature: [FT (16): Hilfetexte verwalten](../feature.md)
- Notion-Quelle: https://app.notion.com/p/a8c06986b3a641d4b4d30723de4b4315
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Leser, Admin

## Ziel

Einen aktiven Hilfetext im jeweiligen UI-Kontext abrufen und anzeigen.

## Vorbedingungen

- Ein Hilfetext mit dem entsprechenden help_key existiert.
- Der Hilfetext ist als aktiv gekennzeichnet.
- Der help_key ist im UI-Kontext hinterlegt.
- Der Akteur ist authentifiziert.

## Ablauf

1. Der Akteur klickt in der UI auf das Hilfe-Symbol des jeweiligen Elements.
2. Die UI übergibt den hinterlegten help_key an das System.
3. Das System prüft, ob ein aktiver Hilfetext mit diesem help_key existiert.
4. Das System lädt Titel und Markdown-Inhalt des Hilfetextes.
5. Die UI stellt den Hilfetext als Tooltip, Popover oder Modal dar.

## Alternativen

- Es existiert kein Hilfetext mit diesem help_key → Das System liefert einen leeren Status zurück; die UI zeigt „Keine Hilfe verfügbar“ oder blendet das Symbol aus.
- Der Hilfetext ist deaktiviert → Das System liefert keinen Inhalt zurück; die UI zeigt keine Hilfe an.
- Technischer Fehler → Das System antwortet mit einem Fehlerstatus; die UI zeigt eine Fehlermeldung oder keine Hilfe an.

## Ergebnis

Der Akteur sieht den zum aktuellen UI-Kontext passenden Hilfetext. Es werden keine fachlichen Daten verändert.
