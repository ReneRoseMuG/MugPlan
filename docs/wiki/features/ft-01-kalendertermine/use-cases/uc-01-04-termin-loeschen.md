# UC 01/04: Termin lÃ¶schen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin vollstÃ¤ndig lÃ¶schen, sodass keine fachlichen RestzustÃ¤nde bestehen bleiben. Insbesondere dÃ¼rfen nach dem LÃ¶schen keine Mitarbeiterzuordnungen mehr existieren, und der Termin darf in keiner Sicht (Kalender, Projekt, Mitarbeiter, Tour, Kunde) mehr erscheinen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte (Disponent oder Administrator).
- **Rollenbasierte DatumsbeschrÃ¤nkung:** Disponenten dÃ¼rfen nur nicht-historische Termine lÃ¶schen (Startdatum â‰¥ heute). Administratoren dÃ¼rfen Termine unabhÃ¤ngig vom Startdatum lÃ¶schen.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Optional: Dem Termin sind Mitarbeiter manuell zugeordnet oder Ã¼ber Tour/Team Ã¼bernommen.
- Optional: Der Termin ist einer Tour zugeordnet.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular oder startet das LÃ¶schen aus einer Terminliste.
2. Der Akteur lÃ¶st die LÃ¶schaktion aus und bestÃ¤tigt diese, sofern eine BestÃ¤tigung vorgesehen ist.
3. Das System lÃ¶scht den Termin in der Datenbank.
4. Das System entfernt alle zugehÃ¶rigen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter, sodass keine Mitarbeiterzuordnungen bestehen bleiben.
5. Das System aktualisiert alle Sichten, die Termine anzeigen, insbesondere Kalender- und Listenansichten sowie Detailansichten zu Projekt, Mitarbeiter, Tour und Kunde.

## Alternativen

- Abbruch: Der Akteur bricht den LÃ¶schvorgang ab. Der Termin bleibt unverÃ¤ndert bestehen, und es werden keine Daten gelÃ¶scht.
- Konflikt beim LÃ¶schen: Falls das System das LÃ¶schen blockiert, muss es eine eindeutige Fehlermeldung anzeigen und sicherstellen, dass weder der Termin noch Join-EintrÃ¤ge teilweise entfernt wurden.
- Das System blockiert das LÃ¶schen historischer Termine fÃ¼r Disponenten mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren dÃ¼rfen historische Termine lÃ¶schen.

## Ergebnis

Der Termin ist vollstÃ¤ndig gelÃ¶scht. Es existiert kein Termin-Datensatz mehr in der Datenbank, und es existieren keine EintrÃ¤ge mehr in der Join-Tabelle Terminâ€“Mitarbeiter fÃ¼r diesen Termin.

Der Termin ist in keiner Sicht mehr auffindbar. Das bedeutet, dass er weder im Kalender noch in der Projekt-Terminliste, noch in der Mitarbeiter-Terminliste, noch in einer Tour-Terminliste, noch in einer kundenbezogenen Terminliste erscheint.

