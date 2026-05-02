# UC 02/18: Race Condition bei Projektlöschung

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass eine Projektlöschung nicht zu inkonsistenten Zuständen führt, wenn parallel ein Termin für dieses Projekt angelegt wird.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte gemäß seiner Rolle.
- Dem Projekt sind zum Zeitpunkt der Löschprüfung keine Termine zugeordnet.

## Ablauf

1. Akteur initiiert die Löschung eines Projekts gemäß UC 02/08.
2. System prüft, ob dem Projekt Termine zugeordnet sind.
3. Zwischen Prüfung und tatsächlicher Löschung wird serverseitig eine atomare Konsistenzprüfung (write-lock) durchgeführt.
4. Falls währenddessen ein Termin für dieses Projekt angelegt wurde, erkennt das System die neue Referenz.
5. System bricht die Löschung ab und antwortet mit HTTP 409 BUSINESS_CONFLICT.
6. Nur wenn keine Terminreferenz existiert, löscht das System das Projekt vollständig.

## Alternativen

- Akteur nicht authentifiziert → HTTP 401.
- Akteur ohne Löschrechte → HTTP 403.
- Projekt existiert nicht → HTTP 404.
- Keine parallele Terminanlage → Löschung erfolgt regulär.

## Ergebnis

Es entsteht kein inkonsistenter Zustand zwischen Projekt- und Terminobjekten.

Ein Projekt mit Terminreferenz kann nicht gelöscht werden.

Die referenzielle Integrität bleibt jederzeit gewahrt.
