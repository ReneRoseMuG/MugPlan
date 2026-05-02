# UC 01/04: Termin löschen

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin vollständig löschen, sodass keine fachlichen Restzustände bestehen bleiben. Insbesondere dürfen nach dem Löschen keine Mitarbeiterzuordnungen mehr existieren, und der Termin darf in keiner Sicht (Kalender, Projekt, Mitarbeiter, Tour, Kunde) mehr erscheinen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte (Disponent oder Administrator).
- **Rollenbasierte Datumsbeschränkung:** Disponenten dürfen nur nicht-historische Termine löschen (Startdatum ≥ heute). Administratoren dürfen Termine unabhängig vom Startdatum löschen.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Optional: Dem Termin sind Mitarbeiter manuell zugeordnet oder über Tour/Team übernommen.
- Optional: Der Termin ist einer Tour zugeordnet.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular oder startet das Löschen aus einer Terminliste.
2. Der Akteur löst die Löschaktion aus und bestätigt diese, sofern eine Bestätigung vorgesehen ist.
3. Das System löscht den Termin in der Datenbank.
4. Das System entfernt alle zugehörigen Einträge in der Join-Tabelle Termin–Mitarbeiter, sodass keine Mitarbeiterzuordnungen bestehen bleiben.
5. Das System aktualisiert alle Sichten, die Termine anzeigen, insbesondere Kalender- und Listenansichten sowie Detailansichten zu Projekt, Mitarbeiter, Tour und Kunde.

## Alternativen

- Abbruch: Der Akteur bricht den Löschvorgang ab. Der Termin bleibt unverändert bestehen, und es werden keine Daten gelöscht.
- Konflikt beim Löschen: Falls das System das Löschen blockiert, muss es eine eindeutige Fehlermeldung anzeigen und sicherstellen, dass weder der Termin noch Join-Einträge teilweise entfernt wurden.
- Das System blockiert das Löschen historischer Termine für Disponenten mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren dürfen historische Termine löschen.

## Ergebnis

Der Termin ist vollständig gelöscht. Es existiert kein Termin-Datensatz mehr in der Datenbank, und es existieren keine Einträge mehr in der Join-Tabelle Termin–Mitarbeiter für diesen Termin.

Der Termin ist in keiner Sicht mehr auffindbar. Das bedeutet, dass er weder im Kalender noch in der Projekt-Terminliste, noch in der Mitarbeiter-Terminliste, noch in einer Tour-Terminliste, noch in einer kundenbezogenen Terminliste erscheint.
