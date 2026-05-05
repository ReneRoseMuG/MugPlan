# UC 31/02: Monitoring-Ansicht aufrufen

## Metadaten

- Feature: [FT (31): Dispositions-Monitoring (Konflikte)](../ft-31-dispositions-monitoring-konflikte.md)

## Akteur

Administrator, Disponent

## Ziel

Die vollständige aktuelle Monitoring-Konfliktmenge einsehen und nach Konfliktart bewerten.

## Vorbedingungen

- Der Akteur ist angemeldet.
- Der Akteur besitzt Administrator- oder Disponentenrechte.

## Ablauf

1. Akteur öffnet den Navigationspunkt **Monitoring**.
2. System berechnet die Monitoring-Ergebnisse frisch aus dem aktuellen Terminbestand.
3. System zeigt Termine, die aktive Trigger erfüllen.
4. System trennt mindestens Ressourcenunterschreitung und Parkplatztermine.
5. Akteur öffnet bei Bedarf einen betroffenen Termin über die bestehenden Terminpfade.

## Alternativen

- Keine Konflikte vorhanden → System zeigt einen leeren Zustand.
- Leser ruft die Ansicht oder API direkt auf → System verweigert den Zugriff.
- Ein Termin wird zwischenzeitlich korrigiert → Nach Aktualisierung verschwindet er aus der Konfliktmenge, sofern kein aktiver Trigger mehr greift.

## Ergebnis

Akteur sieht die vollständige aktuelle Konfliktlage. Die Monitoring-Ansicht selbst verändert keine Termine.
