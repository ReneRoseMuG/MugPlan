# FT (31): Dispositions-Monitoring (Konflikte)

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses  Feature stellt dem Disponenten beim Login eine automatisch berechnete Übersicht über dispositorisch problematische Termine bereit. Ziel ist es, Ressourcenprobleme im Terminbestand frühzeitig sichtbar zu machen, ohne den Disponenten zur sofortigen Reaktion zu zwingen. Das Feature schafft die organisatorische Grundlage dafür, dass Abwesenheiten und Unterbesetzungen kontrolliert und bewusst bearbeitet werden können auch wenn die Ursache bereits Tage zuvor bekannt war.

## Fachliche Beschreibung

Das  Monitoring ist keine eigenständige Planungsfunktion, sondern eine Auswertungsschicht über den vorhandenen Termindaten. Es berechnet zum Zeitpunkt des Logins eines Disponenten, welche zukünftigen Termine innerhalb eines konfigurierten Vorlaufhorizonts eine oder mehrere konfigurierte Triggerbedingungen erfüllen. Das Ergebnis ist eine priorisierte Liste problematischer Termine, die dem Disponenten unmittelbar nach dem Login angezeigt wird.

Das  Monitoring speichert keine Ergebnisse. Jede Berechnung erfolgt frisch zum Loginzeitpunkt auf Basis der aktuellen Termindaten. Es gibt keine Differenzberechnung gegenüber dem Vortag und keine Eskalationslogik.

Die Anzeige erfolgt auf zwei Ebenen gleichzeitig: als Hinweis beim Login sowie als dauerhaft sichtbarer Counter am Navigationspunkt „Monitoring". Der Counter zeigt jederzeit die aktuelle Anzahl problematischer Termine nicht nur beim Login, sondern auch während der laufenden Session, sobald der Disponent die Monitoring-Ansicht aufruft oder aktualisiert. Leser haben keinen Zugriff auf das Monitoring. Die Konfiguration der Trigger ist ausschließlich Admins vorbehalten.

### Konfiguration

Die Trigger-Konfiguration wird systemweit einmalig durch einen Administrator gepflegt. Sie umfasst pro Trigger:

- **Aktiv / Inaktiv** — ein deaktivierter Trigger wird bei der Berechnung nicht berücksichtigt
- **Vorlaufhorizont in Tagen** — nur Termine innerhalb der nächsten N Tage ab heute werden geprüft
- **Triggerbedingung** — die fachliche Regel, die einen Termin als problematisch klassifiziert

Zum Start wird ein Trigger definiert. Weitere Trigger können als spätere Erweiterung hinzukommen.

### Trigger TR-01: Ressourcenunterschreitung

Ein Termin gilt als problematisch, wenn die Anzahl der ihm zugewiesenen 
Mitarbeiter kleiner ist als der konfigurierte Mindestwert.

Konfigurierbare Parameter:

- **Mindestzahl Mitarbeiter** — ganzzahliger Wert >= 1
- **Vorlaufhorizont** — Anzahl Tage ab heute

Dieser Trigger deckt folgende Unterfälle automatisch ab, ohne sie einzeln zu unterscheiden:

- Termin ohne Mitarbeiter
- Termin mit zu wenigen Mitarbeitern
- Termin, bei dem ein Mitarbeiter nach Abwesenheitseintrag entfernt wurde und kein Ersatz zugewiesen ist
- Termine mit Storniert System Tag werden ignoriert

## Regeln & Randbedingungen

- Das Monitoring wird ausschließlich für Benutzer mit der Rolle Disponent oder Administrator ausgeführt.
- Die Berechnung erfolgt beim Login und bei explizitem Aufruf der Monitoring-Ansicht.
- Es werden ausschließlich zukünftige Termine berücksichtigt. Vergangene Termine erscheinen nicht im Monitoring.
- Der Counter am Navigationspunkt „Monitoring" zeigt die Anzahl der aktuell problematischen Termine gemäß aller aktiven Trigger.
- Der Disponent kann die Login-Meldung wegklicken ohne zu handeln. Die Termine bleiben weiterhin im Monitoring sichtbar.
- Die Konfiguration der Trigger ist ausschließlich Admins vorbehalten.
- Trigger können deaktiviert werden, ohne gelöscht zu werden.
- Eine Änderung der Konfiguration wirkt sich erst bei der nächsten Berechnung aus.

## Use Cases

- [UC 31/01: Monitoring-Hinweis beim Login](use-cases/uc-31-01-monitoring-hinweis-beim-login.md)
- [UC 31/02: Monitoring-Ansicht aufrufen](use-cases/uc-31-02-monitoring-ansicht-aufrufen.md)
- [UC 31/03: Trigger konfigurieren](use-cases/uc-31-03-trigger-konfigurieren.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
