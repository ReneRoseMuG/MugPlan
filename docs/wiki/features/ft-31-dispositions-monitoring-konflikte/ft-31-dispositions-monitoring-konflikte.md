# FT (31): Dispositions-Monitoring (Konflikte)

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses  Feature stellt dem Disponenten beim Login eine automatisch berechnete Übersicht über dispositorisch problematische Termine bereit. Ziel ist es, Ressourcenprobleme im Terminbestand frühzeitig sichtbar zu machen, ohne den Disponenten zur sofortigen Reaktion zu zwingen. Das Feature schafft die organisatorische Grundlage dafür, dass Abwesenheiten und Unterbesetzungen kontrolliert und bewusst bearbeitet werden können auch wenn die Ursache bereits Tage zuvor bekannt war.

## Fachliche Beschreibung

Das Monitoring ist keine eigenständige Planungsfunktion, sondern eine Auswertungsschicht über den vorhandenen Termindaten. Es berechnet zum Zeitpunkt des Logins eines Disponenten und beim Aufruf der Monitoring-Ansicht, welche Termine eine oder mehrere konfigurierte Triggerbedingungen erfüllen. Das Ergebnis ist eine priorisierte Liste problematischer Termine, die dem Disponenten unmittelbar nach dem Login angezeigt werden kann.

Das  Monitoring speichert keine Ergebnisse. Jede Berechnung erfolgt frisch zum Loginzeitpunkt auf Basis der aktuellen Termindaten. Es gibt keine Differenzberechnung gegenüber dem Vortag und keine Eskalationslogik.

Die Anzeige erfolgt auf zwei Ebenen gleichzeitig: als Hinweis beim Login sowie als dauerhaft sichtbarer Counter am Navigationspunkt „Monitoring". Der Counter zeigt jederzeit die aktuelle Anzahl problematischer Termine, sobald der Disponent die Monitoring-Ansicht aufruft oder aktualisiert. Der Login-Hinweis ist als Konfliktdialog mit getrennten Bereichen für die relevanten Konfliktarten aufgebaut. Leser haben keinen Zugriff auf das Monitoring. Die Konfiguration der Trigger ist ausschließlich Admins vorbehalten.

### Konfiguration

Die Trigger-Konfiguration wird systemweit einmalig durch einen Administrator gepflegt. Sie umfasst pro Trigger:

- **Aktiv / Inaktiv** — ein deaktivierter Trigger wird bei der Berechnung nicht berücksichtigt
- **Vorlaufhorizont in Tagen** — nur Termine innerhalb der nächsten N Tage ab heute werden geprüft
- **Triggerbedingung** — die fachliche Regel, die einen Termin als problematisch klassifiziert

Zum aktuellen Stand werden mehrere Triggerarten ausgewertet. Die Login-Anzeige kann eine kleinere operative Menge zeigen als die Monitoring-Gesamtansicht, die vollständige Konfliktmenge bleibt aber in der Monitoring-Ansicht verfügbar.

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

### Trigger TR-02: Termin auf Parkplatz

Ein Termin gilt als problematisch, wenn er auf der Systemtour **Parkplatz** liegt. Dieser Trigger macht bewusst geparkte oder durch Folgeworkflows geparkte Termine sichtbar, damit sie später erneut disponiert werden können.

Für den Login-Dialog werden Parkplatztermine vollständig berücksichtigt. Dadurch bleiben auch ältere noch nicht aufgelöste Parkplatzfälle sichtbar. Für reine Ressourcenunterschreitung kann weiterhin eine operative Login-Menge verwendet werden, damit der Dialog nicht durch entfernte Zeiträume dominiert wird.

## Regeln & Randbedingungen

- Das Monitoring wird ausschließlich für Benutzer mit der Rolle Disponent oder Administrator ausgeführt.
- Die Berechnung erfolgt beim Login und bei explizitem Aufruf der Monitoring-Ansicht.
- Die Monitoring-Ansicht zeigt die vollständige aktuelle Konfliktmenge der aktiven Trigger. Einzelne Login-Dialogbereiche dürfen fachlich enger gefasst sein, etwa auf aktuelle ISO-KW plus zwei Wochen für Ressourcenunterschreitung.
- Der Counter am Navigationspunkt „Monitoring" zeigt die Anzahl der aktuell problematischen Termine gemäß aller aktiven Trigger.
- Der Disponent kann die Login-Meldung wegklicken ohne zu handeln. Die Termine bleiben weiterhin im Monitoring sichtbar.
- Die Konfiguration der Trigger ist ausschließlich Admins vorbehalten.
- Trigger können deaktiviert werden, ohne gelöscht zu werden.
- Eine Änderung der Konfiguration wirkt sich erst bei der nächsten Berechnung aus.
- Termine mit Storniert-Tag bleiben aus Monitoring-Konflikten ausgeschlossen.
- Parkplatztermine und Termine ohne ausreichende Mitarbeiter werden im Login-Dialog getrennt dargestellt, damit der Akteur die Art des Problems sofort erkennt.

## Use Cases

- [UC 31/01: Monitoring-Hinweis beim Login](use-cases/uc-31-01-monitoring-hinweis-beim-login.md)
- [UC 31/02: Monitoring-Ansicht aufrufen](use-cases/uc-31-02-monitoring-ansicht-aufrufen.md)
- [UC 31/03: Trigger konfigurieren](use-cases/uc-31-03-trigger-konfigurieren.md)

## Backlogs

- [FT (31): Konfig Seite für Monitoring Trigger](backlog/ft-31-dispositions-monitoring-konflikte-backlog.md)

## Architektur & Kontext


## Entscheidungen & Offene Punkte
