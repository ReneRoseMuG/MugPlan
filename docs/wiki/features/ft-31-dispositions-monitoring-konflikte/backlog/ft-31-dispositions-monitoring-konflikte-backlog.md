# FT (31) Backlog

## FT (31): Konfig Seite für Monitoring Trigger

Quelle: https://www.notion.so/346da094354e803e8680f64af993bde7

Status: Backlog / nicht begonnen

### Ziel / Zweck

Für das Dispositions-Monitoring soll eine eigene Admin-Einstellungsseite entstehen, auf der Monitoring-Trigger konfiguriert werden können.

### Fachliche Beschreibung

Die Trigger-Konfiguration soll fachliche Monitoring-Regeln steuerbar machen, ohne die Monitoring-Auswertung selbst als Planungsfunktion zu verändern. Das Backlog-Item beschreibt insbesondere folgende Triggerbereiche:

- TR-01 Mindestbesetzung: zunächst sinnvoll als einfache Mindestzahl, perspektivisch bei eingeführten Termintypen auch typabhängig.
- TR-02 Termin geparkt: aktuell über die eine Parkplatz-Tour abgedeckt, perspektivisch relevant, falls weitere Touren außerhalb der Terminplanung entstehen.
- TR-03 Überlanger Termin: Termine oberhalb einer konfigurierbaren Maximaldauer sollen als möglicher Planungsfehler sichtbar werden.
- TR-04 Terminlänge nach Saunamodell: je Saunamodell soll eine Mindestbauzeit geprüft werden.

### Untergeordnete Backlog-Items

#### Trigger Termin Überlänge

Quelle: https://www.notion.so/342da094354e805dbecfcc756810c95a

Status: Backlog / nicht begonnen

Das untergeordnete Item ist in Notion noch inhaltlich leer. Der fachliche Bezug ergibt sich aus TR-03 des Hauptitems: Termine sollen eine konfigurierte Maximaldauer nicht überschreiten, weil eine Überschreitung auf einen Planungsfehler hindeuten kann.

#### Trigger Aufbauzeitdauer unterschritten

Quelle: https://www.notion.so/337da094354e808fbc87ee1bb6db871d

Status: Backlog / nicht begonnen

Ein Termin gilt als problematisch, wenn die geplante Termindauer kürzer ist als die für das erkannte Saunamodell hinterlegte Mindestaufbauzeit. Das System soll dafür die Artikelliste des zugeordneten Projekts analysieren, daraus das Saunamodell ableiten und die Termindauer mit der konfigurierten Mindestaufbauzeit vergleichen.

Konfigurierbare Parameter:

- Aktiv / Inaktiv
- Vorlaufhorizont in Tagen
- Mindestaufbauzeiten pro Modell

Abgrenzungen:

- Termine ohne Projekt werden ignoriert.
- Projekte ohne erkennbares Saunamodell in der Artikelliste werden ignoriert.
- Termine mit System-Tag „Storniert“ werden ignoriert.
- Termine ohne Uhrzeit werden ignoriert, weil keine Dauer berechnet werden kann.

### Regeln & Randbedingungen

- Trigger-Konfiguration ist ausschließlich Admins vorbehalten.
- Monitoring-Ergebnisse bleiben für Disponenten und Administratoren relevant; Leser haben keinen Zugriff.
- Eine reine UI-Ausblendung reicht für die spätere Umsetzung nicht aus. Konfiguration und Monitoring-Zugriff müssen serverseitig rollenbeschränkt sein.
- Änderungen an Trigger-Konfigurationen dürfen bestehende Monitoring-Regeln nicht stillschweigend verändern.
- Typabhängige Trigger hängen fachlich von BL (09): Termintypen / Terminkategorisierung ab.
- Modellabhängige Mindestaufbauzeiten berühren FT (27): Produktverwaltung und Auftragspositionen, weil das Saunamodell aus Artikeln bzw. Produktkategorien abgeleitet werden soll.
- Die Speicherung von Trigger-Konfigurationen berührt voraussichtlich FT (18): User Preferences bzw. globale Settings und muss dort sauber abgegrenzt werden.

### Offene Klärungen

- Welche Triggerparameter sollen sofort konfigurierbar sein und welche bleiben zunächst fest verdrahtet?
- Werden Triggerwerte global oder je organisatorischem Kontext gespeichert?
- Wie werden ungültige oder unvollständige Trigger-Konfigurationen validiert?
- Welche Produktkategorien und Modelle zählen verbindlich als Saunamodell?
- Wie wird eine Termindauer berechnet, wenn Start- oder Endzeit fehlen?
- Welche konkreten Rollen dürfen Monitoring sehen, Trigger konfigurieren und Konfigurationsänderungen auslösen?
