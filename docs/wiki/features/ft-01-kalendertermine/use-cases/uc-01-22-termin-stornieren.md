# UC 01/22: Termin stornieren

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden, nicht historischen Termin dauerhaft stornieren. Der Storno-Workflow fÃ¼hrt alle fachlichen Konsequenzen in einem einzigen atomaren Schritt aus: Alle zugeordneten Mitarbeiter werden abgezogen, der Auftragswert des verknÃ¼pften Projekts wird auf 0 gesetzt und der Termin erhÃ¤lt den Tag â€žStorniertâ€œ. Danach ist der Termin dauerhaft gesperrt und geht nicht mehr in Umsatzkalkulationen ein.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Der Termin liegt nicht in der Vergangenheit (Startdatum â‰¥ heute) **â€” fÃ¼r Disponenten. Administratoren dÃ¼rfen auch historische Termine stornieren.**
- Der Termin hat nicht bereits den Tag â€žStorniert".

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur klickt auf den Button â€žTermin stornierenâ€œ.
3. Das System zeigt einen BestÃ¤tigungsdialog mit einer eindeutigen Warnung, dass der Vorgang nicht rÃ¼kgÃ¤ngig gemacht werden kann.
4. Der Akteur bestÃ¤tigt den Storno.
5. Das System fÃ¼hrt den Storno-Workflow atomar aus:
    1. Alle dem Termin zugeordneten Mitarbeiter werden entfernt (Join-Tabelle Terminâ€“Mitarbeiter wird geleert).
    2. Ist dem Termin ein Projekt zugeordnet, wird der Auftragswert des Projekts auf 0 gesetzt.
    3. Der Termin erhÃ¤lt den Tag â€žStorniertâ€œ.
    4. Der Termin wird dauerhaft gesperrt (read-only, nicht editierbar, nicht lÃ¶schbar, nicht verschiebbar).
6. Das System aktualisiert alle abhÃ¤ngigen Sichten. Der Termin bleibt in Kalender und Listenansichten sichtbar, ist jedoch optisch als storniert gekennzeichnet.

## Alternativen

- **Abbruch im BestÃ¤tigungsdialog:** Der Akteur bricht ab. Es werden keine Ã„nderungen vorgenommen; der Termin bleibt unverÃ¤ndert.
- **Termin ist historisch (nur Disponent):** Der Button â€žTermin stornierenâ€œ ist fÃ¼r Disponenten nicht verfÃ¼gbar. Das System verhindert den Aufruf serverseitig mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren kÃ¶nnen historische Termine stornieren.
- **Termin ist bereits storniert:** Der Button ist nicht verfÃ¼gbar. Keine Aktion mÃ¶glich.
- **Termin hat kein Projekt:** Schritt 5b (Auftragswert auf 0) entfÃ¤llt. Die Ã¼brigen Schritte werden vollstÃ¤ndig ausgefÃ¼hrt.
- **Fehler wÃ¤hrend des Workflows:** Das System stellt sicher, dass kein Teilzustand entsteht. Entweder alle Schritte werden ausgefÃ¼hrt oder keiner. Der Termin bleibt im ursprÃ¼nglichen Zustand, und das System zeigt eine eindeutige Fehlermeldung.

## Ergebnis

Der Termin ist storniert und dauerhaft gesperrt. Er erscheint in allen Sichten weiterhin, ist aber optisch als storniert gekennzeichnet. Keine Mitarbeiter sind mehr zugeordnet; betroffene Mitarbeiter sind im Zeitraum des Termins wieder frei verfÃ¼gbar. Falls ein Projekt zugeordnet war, ist dessen Auftragswert auf 0 gesetzt. Der Termin kann nicht reaktiviert, bearbeitet, verschoben oder gelÃ¶scht werden. Er geht nicht in Umsatzkalkulationen und Auftragswert-Reports ein.

