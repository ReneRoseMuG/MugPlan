# UC 31/01: Monitoring-Hinweis beim Login

## Metadaten

- Feature: [FT (31): Dispositions-Monitoring (Konflikte)](../ft-31-dispositions-monitoring-konflikte.md)

## Akteur

Administrator, Disponent

## Ziel

Beim Sessionstart eine verständliche Übersicht über aktuelle Dispositionskonflikte erhalten, ohne sofort handeln zu müssen.

## Vorbedingungen

- Der Akteur ist angemeldet.
- Der Akteur besitzt Administrator- oder Disponentenrechte.
- Es existieren Termine, die einen aktiven Monitoring-Trigger erfüllen.

## Ablauf

1. Akteur startet eine neue Session oder meldet sich an.
2. System lädt die Monitoring-Zusammenfassung.
3. System öffnet einmalig einen Konfliktdialog, wenn relevante Konflikte vorliegen.
4. Dialog trennt die Konfliktarten, insbesondere Termine ohne ausreichende Mitarbeiter und Termine auf **Parkplatz**.
5. Akteur kann den Dialog schließen, ohne eine Änderung vorzunehmen.
6. System hält die Konflikte weiterhin im Monitoring sichtbar.

## Alternativen

- Keine Konflikte vorhanden → System zeigt keinen Dialog.
- Leser meldet sich an → System zeigt keinen Monitoring-Hinweis und verweigert direkte Monitoring-Aufrufe serverseitig.
- Konflikte ändern sich während der Session → Aktualisierung erfolgt über die Monitoring-Abfrage, nicht über persistierte Login-Ergebnisse.

## Ergebnis

Akteur kennt die aktuellen Dispositionskonflikte. Es wurde keine automatische Terminänderung ausgelöst.
