# UC 02/08: Projekt lÃ¶schen

## Metadaten

- Feature: [FT (02): Projekte](../ft-02-projekte.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator, Disponent

## Ziel

Ein Projekt dauerhaft aus dem System entfernen, ohne fachliche Inkonsistenzen oder verwaiste Referenzen zu hinterlassen.

## Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte (Disponent oder Administrator).
- Dem Projekt sind **keine Termine zugeordnet** (zwingende Vorbedingung).
- Das Projekt besitzt ein Versionsmerkmal.

## Ablauf

1. Der Akteur Ã¶ffnet das Projekt und wÃ¤hlt â€žProjekt lÃ¶schen".
2. Das System prÃ¼ft die Berechtigung des Akteurs.
3. Das System prÃ¼ft, ob dem Projekt Termine zugeordnet sind.
    1. Falls **JA:** Das System blockiert die LÃ¶schung mit HTTP 409 BUSINESS_CONFLICT. Das Projekt bleibt vollstÃ¤ndig erhalten.
    2. Falls **NEIN:** Fortfahren mit Schritt 4.
4. Das System setzt eine atomare Versionsverriegelung (write-lock) auf dem Projekt-Datensatz mit dem erwarteten Versionsmerkmal.
5. Das System fÃ¼hrt innerhalb einer Transaktion durch:
    1. Alle projektbezogenen Tag-Zuordnungen werden entfernt.
    2. Alle projektbezogenen Notizen und deren Relationen werden physisch gelÃ¶scht (Cascade).
    3. Alle Anhang-DatensÃ¤tze des Projekts werden entfernt (physische Dateien verbleiben im Upload-Verzeichnis).
    4. Alle Auftragspositionen (`project_order_items`) werden gelÃ¶scht.
    5. Der Projekt-Datensatz wird gelÃ¶scht.
6. Das System bestÃ¤tigt die erfolgreiche LÃ¶schung und aktualisiert alle Projektlisten.

## Alternativen

- Projekt nicht vorhanden â†’ HTTP 404.
- Akteur nicht authentifiziert â†’ HTTP 401.
- Akteur ohne LÃ¶schrechte â†’ HTTP 403.
- Projekt besitzt Termine â†’ HTTP 409 BUSINESS_CONFLICT, kein Teilzustand entsteht.
- Versionskonflikt (Optimistic Locking) â†’ HTTP 409 VERSION_CONFLICT, Akteur muss neu laden.
- Race Condition (Termin wird parallel angelegt) â†’ atomare PrÃ¼fung erkennt neue Referenz â†’ HTTP 409, LÃ¶schung wird abgebrochen.
- Technischer Fehler â†’ HTTP 500, das Projekt bleibt vollstÃ¤ndig erhalten, keine TeillÃ¶schung.

## Ergebnis

Das Projekt und alle zugeordneten Notizen sowie Auftragspositionen sind physisch gelÃ¶scht. Anhang-DatensÃ¤tze sind entfernt; physische Dateien verbleiben im Upload-Verzeichnis. Es existieren keine verwaisten Referenzen. Alle Projektlisten sind aktualisiert.

