# FT (26): Auswertungen und Reports

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Lokaler Stand: 04.05.26
- Importstatus: Ursprünglich aus lokalem Notion-Markdown-Export übernommen; fachlich für Report-Presets und entkoppelte Report-Persistenz aktualisiert.

## Ziel / Zweck

Unter dem Navigationspunkt **Reports** stellt die Anwendung konfigurierbare Auswertungen bereit. Reports sind Lese- und Erzeugungsfunktionen, keine Echtzeitansichten. Alle angemeldeten Rollen dürfen Reports öffnen, konfigurieren, erzeugen und eigene Presets verwalten.

Der Bereich umfasst vier Reports:

- Vorlaufliste
- Produktionsplanung
- Auftragsliste
- Tourenplan

Reports speichern ihren Zustand nicht mehr automatisch über User-Settings oder andere stille Settings-Mechanismen. Dauerhafte Wiederverwendung erfolgt ausschließlich über bewusst gespeicherte Presets. Die einzige fachliche Ausnahme ist die globale Layout-Konfiguration der Produktionsplanung; sie bleibt Admin-seitig persistent und gilt zunächst für alle.

## Gemeinsame Struktur

Jeder Report wird über ein Konfigurationspanel gesteuert. Das Panel enthält mindestens die Aktion **Report erzeugen** und eine generische Preset-Steuerung. Die Ergebnistabelle oder Ergebnisansicht erscheint unterhalb des Panels.

Reports werden nicht automatisch aktualisiert. Eine Ausgabe entsteht nur durch eine ausdrückliche Aktion des Benutzers oder durch die ausdrückliche Ausführung eines Presets, das die Aktion **Report erzeugen** enthält.

## Zustandsmodell

### Flüchtiger UI-Zustand

Alle Report-Konfigurationsmöglichkeiten bleiben als UI-Funktionen erhalten. Dazu gehören insbesondere:

- Zeitraum und Kalenderwochenmodus
- aktive Tabs
- Spaltenauswahl und Spaltenreihenfolge
- Kategorieauswahl
- Shortcode-Schalter
- Tour-Auswahl
- Druck- und Vorschauoptionen

Diese Werte bleiben zunächst nur im aktuellen UI-Zustand. Beim Verlassen oder erneuten Öffnen eines Reports dürfen sie nicht still aus User-Settings oder vergleichbaren Settings wiederhergestellt werden.

### Explizite Preset-Persistenz

Ein Preset ist eine bewusst gespeicherte Report-Konfiguration. Es kann alle für den jeweiligen Report fachlich zulässigen Konfigurationswerte enthalten. Presets können außerdem Folgeaktionen enthalten, zum Beispiel:

- Report erzeugen
- Druckvorschau öffnen

Ein Preset enthält mindestens:

- Name
- Report-Key
- Scope
- Konfiguration
- optionale Aktionen

Presets werden serverseitig im Dateisystem über die vorhandene generische Server-Filesystem-Infrastruktur gespeichert. Sie werden nicht in der Datenbank gespeichert.

### Scope und Rechte

Presets haben zwei Scopes:

- `USER`: nur für den jeweiligen Benutzer sichtbar und durch diesen Benutzer verwaltbar.
- `GLOBAL`: für alle angemeldeten Benutzer sichtbar, aber nur durch Admins anlegbar, änderbar und löschbar.

Alle angemeldeten Rollen dürfen eigene USER-Presets anlegen, ändern, löschen und ausführen. Admins dürfen zusätzlich GLOBAL-Presets verwalten.

Die technische Durchsetzung erfolgt serverseitig. UI-Sichtbarkeit ist nur ergänzende Bedienlogik und keine ausreichende Berechtigungsprüfung.

### Globale Produktionsplanungs-Layout-Konfiguration

Die globale Layout-Konfiguration der Produktionsplanung bleibt als Admin-seitig verwaltete Persistenz erhalten. Sie gilt zunächst für alle Benutzer als Standardlayout.

Dieses Layout darf Bestandteil eines Presets sein. Wenn ein Preset ein Layout enthält, ist das eine explizit gespeicherte Preset-Konfiguration und keine stille User-Settings-Persistenz. Das Ändern der globalen Layout-Konfiguration bleibt Admins vorbehalten.

## Datumskonfiguration

Beim Öffnen eines Reports wird ein definierter Default-Zustand gesetzt:

- Modus: Kalenderwoche
- Start: aktuelle ISO-Kalenderwoche
- Zeitraum: 1 KW

Für Presets muss die Report-Datumskonfiguration dynamische Kalenderwochen-Modi unterstützen:

- Start aktuelle KW
- Start kommende KW
- Anzahl der KW als Zeitraum

Die dynamische Angabe wird erst bei der Ausführung des Presets in eine konkrete Datumsspanne aufgelöst. Dadurch kann ein Preset zum Beispiel immer die kommenden 4 KW erzeugen, ohne ein statisches Datum zu speichern.

Die bestehenden UI-Modi für konkrete Datumsspannen bleiben erhalten, solange sie für den jeweiligen Report fachlich vorgesehen sind. Sie dürfen aber nicht automatisch als Setting persistiert werden.

## Report: Vorlaufliste

HelpKey: `report-vorlaufliste`

Die Vorlaufliste fasst Termine innerhalb eines wählbaren Zeitraums zusammen, denen ein Projekt zugeordnet ist. Termine ohne Projekt werden nicht aufgenommen.

Das Konfigurationspanel hat drei Tabs:

- Datum
- Kalenderwoche
- Spalten

Beim Öffnen startet die Vorlaufliste im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum. Der zuletzt aktive Tab und die Spaltenauswahl werden nicht automatisch wiederhergestellt. Tab, Zeitraum, Spaltenauswahl, Spaltenreihenfolge, Spaltenbreiten und Shortcode-Option dürfen aber Bestandteil eines Presets sein.

Die Sortierung bleibt aufsteigend nach vorgeplantem Termin und ist nicht konfigurierbar.

## Report: Produktionsplanung

HelpKey: `reports-produkte`

Der Report Produktionsplanung aggregiert Auftragsmengen aus `project_order_items` über Projekte mit Terminen im konfigurierten Zeitraum. Die Datumsspannen-Konfiguration folgt den gemeinsamen Regeln.

Die anzuzeigenden Kategorien und ihre Darstellung in Blöcken und Spalten werden über die globale Produktionsplanungs-Layout-Konfiguration gesteuert. Der Layout-Editor bleibt Admin-seitig. Ist kein Layout konfiguriert, werden Standardkategorien verwendet.

Shortcodes bleiben als expliziter Schalter erhalten. Wenn Shortcodes aktiv sind, werden Artikel mit identischem Shortcode innerhalb derselben Kategorie zu einem Eintrag zusammengeführt und ihre Mengen summiert. Artikel ohne Shortcode bleiben unter ihrem Vollnamen.

Projekte oder Termine mit Reklamation-Tag oder Storniert-Tag werden vollständig ausgeschlossen.

### Projekt- und Terminkacheln

Unterhalb der Summenbereiche werden nur noch Einzelkacheln für Projekte bzw. Termine ausgegeben, die das System-Tag **Sondermaß** tragen. Die Tags **Anmerkungen** und **Gespiegelt** sind keine eigenständigen Gründe mehr, eine Kachel im unteren Bereich der Produktionsplanung auszugeben.

Wenn ein Projekt oder Termin zusätzlich andere Tags trägt, bleiben diese in der Kachel sichtbar, sofern die Kachel wegen Sondermaß aufgenommen wurde.

## Report: Auftragsliste

HelpKey: `report-auftragsliste`

Die Auftragsliste zeigt Projekte mit mindestens einem gültigen Termin im konfigurierten Zeitraum als Kachelansicht. Pro Projekt wird der erste gültige Termin im Zeitfenster als repräsentativer Termin genutzt. Projekte und Termine mit Reklamation-Tag werden vollständig ausgeschlossen.

Die Datumsspanne wird über Modus Datum oder Kalenderwoche konfiguriert. Beim Öffnen startet der Report im Kalenderwochenmodus mit aktueller KW und 1 KW Zeitraum.

Komponenten- und Produktkategorien können im Konfigurationspanel abgewählt werden. Diese Auswahl bleibt flüchtig, bis sie als Bestandteil eines Presets gespeichert wird. Deaktivierte Kategorien erscheinen weder in den Kacheln noch in der Druckausgabe.

## Report: Tourenplan

HelpKey: `report-tourenplan`

Der Tourenplan gibt Termine einer gewählten Tour als druckfähige Kartenansicht aus. Die Option **Ohne Tour** schließt Termine ohne Tourzuordnung ein.

Die Tour-Auswahl, der Zeitraum, der Shortcode-Schalter sowie Druck- und Vorschauoptionen bleiben UI-Funktionen. Sie werden nicht automatisch über User-Settings oder globale Settings gespeichert. Wenn diese Werte dauerhaft wiederverwendet werden sollen, müssen sie Bestandteil eines Presets sein.

Die Tag-Priorität pro Karte bleibt:

- Reklamation
- Sondermaß
- Messe Aufbau/Abbau
- Neutral

Die Priorität steuert ausschließlich die Darstellung. Es gibt im Tourenplan keine stille Ausschlusslogik wie in der Produktionsplanung.

## Regeln & Randbedingungen

- Alle angemeldeten Rollen dürfen Reports öffnen, konfigurieren, erzeugen und eigene USER-Presets verwalten.
- GLOBAL-Presets dürfen nur Admins verwalten.
- Die globale Produktionsplanungs-Layout-Konfiguration darf nur durch Admins geändert werden.
- Reports erzeugen keine Ausgabe ohne ausdrückliche Aktion.
- Reports lesen beim Öffnen keine alten Report-User-Settings für Zeitraum, Tab, Spalten, Kategorien, Shortcodes, Tourenplan-Optionen oder vergleichbare UI-Zustände.
- Änderungen im Konfigurationspanel schreiben keine Report-Settings.
- Wiederverwendbare Konfigurationen werden ausschließlich über Presets gespeichert.
- Presets werden serverseitig validiert. Der Client darf keine Rechte aus UI-Sichtbarkeit ableiten.
- Alte Report-Settings werden nicht migriert und dürfen den Report-Startzustand nicht beeinflussen.

## Umsetzungspakete

### 1. Report-Preset-Infrastruktur

Die allgemeine Infrastruktur für Report-Presets umfasst Contracts, Route, Controller, Service, Repository und Dateisystem-Anbindung. Dazu gehören Report-Key-Validierung, Scope-Validierung, erlaubte Aktionen, dynamische KW-Auflösung und serverseitige Rechteprüfung.

Tests:

- USER-Presets sind je Benutzer getrennt.
- GLOBAL-Presets sind für alle angemeldeten Benutzer sichtbar.
- GLOBAL-Presets dürfen nur Admins schreiben oder löschen.
- Alle Rollen dürfen eigene USER-Presets schreiben, ändern und löschen.
- Start aktuelle KW und Start kommende KW werden mit Anzahl KW korrekt in konkrete Datumsspannen aufgelöst.
- Ungültige Report-Keys, Aktionen und Konfigurationen werden abgelehnt.

### 2. Implizite Report-Persistenz entkoppeln

Alle bestehenden Report-UI-Funktionen bleiben erhalten. Entfernt wurde nur das automatische Lesen und Schreiben reportbezogener Settings. Vorhandene alte Settings dürfen beim Öffnen eines Reports keine Werte still setzen. Änderungen in Report-Panels dürfen keine alten Report-Settings mehr schreiben.

Ausnahme: Die globale Produktionsplanungs-Layout-Konfiguration bleibt Admin-seitig persistent.

Tests:

- Alte User-Settings für Reports beeinflussen den Startzustand nicht.
- UI-Änderungen schreiben keine Report-Settings.
- Dieselben Konfigurationswerte können explizit als Preset gespeichert und angewendet werden.
- Die globale Produktionsplanungs-Layout-Konfiguration bleibt wirksam und Admin-seitig geschützt.

### 3. Vorlaufliste mit Presets

Die Vorlaufliste wird an Presets angebunden. Zeitraum, aktiver Tab, Spaltenauswahl, Reihenfolge, Breiten und Shortcode-Optionen können im Preset enthalten sein.

Tests:

- Default startet mit aktueller KW und 1 KW.
- Ein Preset mit Start kommende KW und mehreren KW erzeugt den erwarteten Datenbereich.
- Spaltenkonfiguration aus einem Preset wirkt auf die konkrete Vorlaufliste mit echten Daten.
- Ohne Preset erfolgt keine Wiederherstellung alter Tab- oder Spaltenwerte.

### 4. Produktionsplanung mit Presets

Die Produktionsplanung wird an Presets angebunden. Zeitraum, Shortcode-Schalter und optionales Layout können Bestandteil eines Presets sein. Der untere Kachelbereich enthält nur Sondermaß-Projekte bzw. Sondermaß-Termine.

Tests:

- Default startet mit aktueller KW und 1 KW.
- Ein Preset mit Start kommende KW und mehreren KW wirkt auf die Summenbereiche mit echten Auftragspositionen.
- Shortcode-Konfiguration aus einem Preset wirkt auf die Aggregation.
- Ein im Preset enthaltenes Layout wirkt auf die Report-Ausgabe.
- Projekt-/Terminkacheln erscheinen unten nur bei Sondermaß; Anmerkungen und Gespiegelt allein reichen nicht.
- Reklamation und Storniert bleiben vollständig ausgeschlossen.

### 5. Auftragsliste mit Presets

Die Auftragsliste wird an Presets angebunden. Zeitraum, Kategorieauswahl, Tag-Filter, Sauna-Modell-Auswahl, Shortcodes und Druckvorschau-Aktion können Bestandteil eines Presets sein.

Tests:

- Default startet mit aktueller KW und 1 KW.
- Ein Preset mit Start kommende KW und mehreren KW erzeugt die erwarteten Kacheln mit echten Projekten.
- Kategorieauswahl aus einem Preset verändert Kachel- und Druckausgabe.
- Ein Preset kann Report-Erzeugung und Druckvorschau-Aktion auslösen.
- Ohne Preset wird keine alte Kategorieauswahl wiederhergestellt.

### 6. Tourenplan mit Presets

Der Tourenplan wird an Presets angebunden. Tour-Auswahl, Zeitraum, Shortcodes, Druckmodus, Vorschauoptionen und Druckvorschau-Aktion können Bestandteil eines Presets sein.

Tests:

- Default startet mit aktueller KW und 1 KW.
- Ein Preset mit Start kommende KW und mehreren KW erzeugt die erwarteten Tour-Karten mit echten Terminen.
- Tour-Auswahl aus einem Preset beschränkt die Ausgabe korrekt.
- Shortcode- und Druckoptionen aus einem Preset wirken auf Vorschau und Druckmodell.
- Ohne Preset werden keine alten Tourenplan-Settings für Zeitraum, Druckmodus oder Schriftgröße wiederhergestellt.

## Use Cases

- [UC 26/01: Vorlaufliste konfigurieren und erzeugen](use-cases/uc-26-01-vorlaufliste-konfigurieren-und-erzeugen.md)
- [UC 26/02: Bis Datum nachträglich entfernen](use-cases/uc-26-02-bis-datum-nachtraeglich-entfernen.md)
- [UC 26/03: Produktionsplanung konfigurieren und erzeugen](use-cases/uc-26-03-produktionsplanung-konfigurieren-und-erzeugen.md)
- [UC 26/04: Datumsspanne in der Produktionsplanung nachträglich anpassen](use-cases/uc-26-04-datumsspanne-in-der-produktionsplanung-nachtraeglich-anpassen.md)
- [UC 26/05: Produktionsplanung drucken](use-cases/uc-26-05-produktionsplanung-drucken.md)
- [UC 26/06: Auftragsliste konfigurieren und erzeugen](use-cases/uc-26-06-auftragsliste-konfigurieren-und-erzeugen.md)
- [UC 26/07: Auftragsliste drucken](use-cases/uc-26-07-auftragsliste-drucken.md)
- [UC 26/08: Tourenplan konfigurieren und erzeugen](use-cases/uc-26-08-tourenplan-konfigurieren-und-erzeugen.md)
- [UC 26/09: Tourenplan drucken](use-cases/uc-26-09-tourenplan-drucken.md)
- [UC 26/10: Report-Preset speichern und ausführen](use-cases/uc-26-10-report-preset-speichern-und-ausfuehren.md)

## Entscheidungen & Offene Punkte

- Alle angemeldeten Rollen dürfen eigene USER-Presets verwalten.
- GLOBAL-Presets bleiben Admin-seitig.
- Die globale Produktionsplanungs-Layout-Konfiguration bleibt Admin-seitig persistent und darf Bestandteil eines Presets sein.
- Produktionsplanung zeigt unten nur noch Sondermaß-Kacheln.
- Es findet keine Migration alter Report-Settings statt.
