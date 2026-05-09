# UC 31/03: Trigger konfigurieren

## Metadaten

- Feature: [FT (31): Dispositions-Monitoring (Konflikte)](../ft-31-dispositions-monitoring-konflikte.md)

## Akteur

Administrator

## Ziel

Trigger-Parameter anpassen, um das Monitoring an die betrieblichen Anforderungen anzupassen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Die Monitoring-Konfiguration ist erreichbar.

## Ablauf

1. Der Akteur öffnet die Monitoring-Konfiguration.
2. Das System zeigt alle vorhandenen Trigger mit ihren aktuellen Parametern.
3. Der Akteur ändert für einen Trigger Aktivstatus, Vorlaufhorizont oder Triggerbedingungsparameter.
4. Der Akteur speichert die Änderungen.
5. Das System persistiert die Konfiguration.
6. Das System verwendet die neuen Werte bei der nächsten Berechnung.

## Alternativen

- Ungültiger Wert, zum Beispiel Mindestzahl kleiner 1 oder Horizont kleiner 1: Das System blockiert mit Validierungsfehler.
- Der Akteur deaktiviert alle Trigger: Das Monitoring zeigt beim nächsten Login keinen Hinweis.

## Ergebnis

Die Konfiguration ist gespeichert und wirkt bei der nächsten Berechnung. Bereits laufende Sessions werden nicht beeinflusst.
