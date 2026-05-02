# UC 02/18: Race Condition bei ProjektlÃ¶schung

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass eine ProjektlÃ¶schung nicht zu inkonsistenten ZustÃ¤nden fÃ¼hrt, wenn parallel ein Termin fÃ¼r dieses Projekt angelegt wird.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte gemÃ¤ÃŸ seiner Rolle.
- Dem Projekt sind zum Zeitpunkt der LÃ¶schprÃ¼fung keine Termine zugeordnet.

## Ablauf

1. Akteur initiiert die LÃ¶schung eines Projekts gemÃ¤ÃŸ UC 02/08.
2. System prÃ¼ft, ob dem Projekt Termine zugeordnet sind.
3. Zwischen PrÃ¼fung und tatsÃ¤chlicher LÃ¶schung wird serverseitig eine atomare KonsistenzprÃ¼fung (write-lock) durchgefÃ¼hrt.
4. Falls wÃ¤hrenddessen ein Termin fÃ¼r dieses Projekt angelegt wurde, erkennt das System die neue Referenz.
5. System bricht die LÃ¶schung ab und antwortet mit HTTP 409 BUSINESS_CONFLICT.
6. Nur wenn keine Terminreferenz existiert, lÃ¶scht das System das Projekt vollstÃ¤ndig.

## Alternativen

- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne LÃ¶schrechte â†’ HTTP 403.
- Projekt existiert nicht â†’ HTTP 404.
- Keine parallele Terminanlage â†’ LÃ¶schung erfolgt regulÃ¤r.

## Ergebnis

Es entsteht kein inkonsistenter Zustand zwischen Projekt- und Terminobjekten.

Ein Projekt mit Terminreferenz kann nicht gelÃ¶scht werden.

Die referenzielle IntegritÃ¤t bleibt jederzeit gewahrt.

