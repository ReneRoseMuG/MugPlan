# UC 01/22: Termin stornieren

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden, nicht historischen Termin dauerhaft stornieren. Der Storno-Workflow führt alle fachlichen Konsequenzen in einem einzigen atomaren Schritt aus: Alle zugeordneten Mitarbeiter werden abgezogen, der Auftragswert des verknüpften Projekts wird auf 0 gesetzt und der Termin erhält den Tag „Storniert“. Danach ist der Termin dauerhaft gesperrt und geht nicht mehr in Umsatzkalkulationen ein.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Der Termin liegt nicht in der Vergangenheit (Startdatum ≥ heute) **— für Disponenten. Administratoren dürfen auch historische Termine stornieren.**
- Der Termin hat nicht bereits den Tag „Storniert".

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur klickt auf den Button „Termin stornieren“.
3. Das System zeigt einen Bestätigungsdialog mit einer eindeutigen Warnung, dass der Vorgang nicht rükgängig gemacht werden kann.
4. Der Akteur bestätigt den Storno.
5. Das System führt den Storno-Workflow atomar aus:
    1. Alle dem Termin zugeordneten Mitarbeiter werden entfernt (Join-Tabelle Termin–Mitarbeiter wird geleert).
    2. Ist dem Termin ein Projekt zugeordnet, wird der Auftragswert des Projekts auf 0 gesetzt.
    3. Der Termin erhält den Tag „Storniert“.
    4. Der Termin wird dauerhaft gesperrt (read-only, nicht editierbar, nicht löschbar, nicht verschiebbar).
6. Das System aktualisiert alle abhängigen Sichten. Der Termin bleibt in Kalender und Listenansichten sichtbar, ist jedoch optisch als storniert gekennzeichnet.

## Alternativen

- **Abbruch im Bestätigungsdialog:** Der Akteur bricht ab. Es werden keine Änderungen vorgenommen; der Termin bleibt unverändert.
- **Termin ist historisch (nur Disponent):** Der Button „Termin stornieren“ ist für Disponenten nicht verfügbar. Das System verhindert den Aufruf serverseitig mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren können historische Termine stornieren.
- **Termin ist bereits storniert:** Der Button ist nicht verfügbar. Keine Aktion möglich.
- **Termin hat kein Projekt:** Schritt 5b (Auftragswert auf 0) entfällt. Die übrigen Schritte werden vollständig ausgeführt.
- **Fehler während des Workflows:** Das System stellt sicher, dass kein Teilzustand entsteht. Entweder alle Schritte werden ausgeführt oder keiner. Der Termin bleibt im ursprünglichen Zustand, und das System zeigt eine eindeutige Fehlermeldung.

## Ergebnis

Der Termin ist storniert und dauerhaft gesperrt. Er erscheint in allen Sichten weiterhin, ist aber optisch als storniert gekennzeichnet. Keine Mitarbeiter sind mehr zugeordnet; betroffene Mitarbeiter sind im Zeitraum des Termins wieder frei verfügbar. Falls ein Projekt zugeordnet war, ist dessen Auftragswert auf 0 gesetzt. Der Termin kann nicht reaktiviert, bearbeitet, verschoben oder gelöscht werden. Er geht nicht in Umsatzkalkulationen und Auftragswert-Reports ein.
