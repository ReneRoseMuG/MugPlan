# FT (26): Auswertungen und Reports

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/313da094354e80b2a13ad9fdb689a254
- Importquelle lokal: `C:/Users/schro/Desktop/FT (26) Auswertungen und Reports 313da094354e80b2a13ad9fdb689a254.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Unter einem neuen Navigationspunkt **Reports** stellt die Anwendung konfigurierbare tabellarische Auswertungen bereit. Reports sind keine Echtzeitansichten, sondern werden auf Anforderung erzeugt. Der Navigationspunkt ist für Admins, Disponenten und Leser sichtbar; Leser nutzen den Bereich rein lesend. Der Bereich umfasst vier Reports: Vorlaufliste, Produktionsplanung, Auftragsliste und Tourenplan.

## Fachliche Beschreibung

**Gemeinsame Struktur aller Reports:**
Jeder Report wird über ein **Konfigurationspanel** gesteuert, das die volle Breite des verfügbaren Containers einnimmt. Das Panel enthält mindestens einen Button **Report erzeugen** und wird um eine generische Preset-Steuerung erweitert. Die Ergebnistabelle oder Ergebnisansicht erscheint unterhalb des Panels. Reports werden nicht automatisch aktualisiert; jede Ausgabe erfordert eine explizite Erzeugung durch den Akteur oder die explizite Ausführung eines gespeicherten Presets.

Report-Konfigurationen werden nicht mehr automatisch über User-Settings persistiert. Beim Öffnen eines Reports startet der Report in einem definierten Default-Zustand. Die Datumsspannen-Konfiguration fokussiert dabei die aktuelle ISO-Kalenderwoche. Weitere vom Akteur vorgenommene Änderungen bleiben zunächst nur temporär im aktuellen UI-Zustand erhalten. Wenn eine Konfiguration dauerhaft wiederverwendet werden soll, speichert der Akteur sie bewusst als Preset.

Ein Preset ist eine gespeicherte Report-Konfiguration. Presets können benutzerspezifisch (USER) oder global (GLOBAL) sein. USER-Presets sind nur für den jeweiligen Benutzer sichtbar und verwaltbar. GLOBAL-Presets sind für alle berechtigten Report-Nutzer sichtbar und können nur von Admins angelegt, geändert oder gelöscht werden. Ein Preset kann neben der eigentlichen Report-Konfiguration auch Folgeaktionen enthalten, zum Beispiel „Report erzeugen“ oder „Druckvorschau öffnen“.

Presets können dynamische Zeitraumangaben enthalten. Dadurch kann ein Preset beispielsweise festlegen, dass die Auftragsliste immer ab der kommenden Kalenderwoche für vier Wochen erzeugt wird. Die dynamische Angabe wird erst bei der Ausführung des Presets in eine konkrete Datumsspanne aufgelöst.

Jedem Report ist ein eindeutiger **HelpKey** zugewiesen, der die Zuweisung eines Hilfetexts zur Ansicht ermöglicht.

**Report: Vorlaufliste**
HelpKey: `report-vorlaufliste`

Die Vorlaufliste fasst alle Termine innerhalb eines wählbaren Zeitraums zusammen, denen ein Projekt zugeordnet ist. Sie zeigt je Zeile die wesentlichen Auftragsdaten für die operative Disposition und die Vorbereitung von Montageeinsätzen.

**Konfigurationspanel — drei Tabs:**

Das Konfigurationspanel der Vorlaufliste gliedert sich in drei Tabs: **Datum**, **Kalenderwoche** und **Spalten**. Beim Öffnen des Reports wird die Kalenderwochen-Konfiguration auf die aktuelle ISO-Kalenderwoche fokussiert. Der zuletzt aktive Tab und die Spaltenauswahl werden nicht mehr automatisch über User-Settings wiederhergestellt. Soll eine bestimmte Tab-/Spalten-/Zeitraumskonfiguration dauerhaft wiederverwendet werden, speichert der Akteur diese als Preset.

- **Tab Datum:** Von-Datum (Pflichtfeld; bezieht sich auf den vorgeplanten Termin) und Bis-Datum (optional, initial verborgen, durch Klicken freilegbar). Ohne Bis-Datum keine obere Grenze.
- **Tab Kalenderwoche:** Eingabefeld KW Start mit Aufwärts-/Abwärts-Steuerung (max. 3 Zeichen) und Eingabefeld Anzahl Wochen mit Aufwärts-/Abwärts-Steuerung (max. 3 Zeichen). Ein Hinweis zeigt die aktuelle Kalenderwoche und das berechnete Enddatum. Die Auswahl wird in eine konkrete Datumsspanne aufgelöst.
- **Tab Spalten:** Spalten-Editor zur Steuerung von Sichtbarkeit und Reihenfolge der Tabellenspalten. Die Konfiguration bleibt temporär, bis sie als Bestandteil eines Presets gespeichert wird.

**Datenbasis:**
Nur Termine mit Projektzuordnung. Termine ohne Projekt werden nicht aufgenommen. Je Zeile werden Daten aus Termin, Projekt, Kunde und `project_order_items` zusammengeführt.

**Produktspalten:** Je konfigurierter Komponentenkategorie maximal eine Auftragsposition. Ist keine vorhanden, bleibt die Zelle leer.

**Tatsächlicher Termin:** Der früheste nicht-stornierte Termin mit derselben Projekt-ID innerhalb des abgefragten Zeitfensters. Sind alle Termine des Projekts im Zeitfenster storniert, wird der früheste stornierte Termin als Fallback verwendet. Gibt es keinen Termin im Zeitfenster, bleibt die Zelle leer.

**Sortierung:** Aufsteigend nach vorgeplanter Termin. Die Sortierung ist nicht konfigurierbar.

**Verfügbare Spalten** (Sichtbarkeit und Reihenfolge über den Tab Spalten konfigurierbar):

| Spalte | Quelle |
| --- | --- |
| Auftragssumme | 1:1-Join-Tabelle am Projekt |
| Fullname Kunde | Kunde |
| PLZ | Kunde |
| Ort | Kunde |
| Saunamodell | Komponentenkategorie (project_order_items) |
| Tür Variante | Komponentenkategorie (project_order_items) |
| Fenster | Komponentenkategorie (project_order_items) |
| Ofen | Komponentenkategorie (project_order_items) |
| Steuerung | Komponentenkategorie (project_order_items) |
| Dach | Komponentenkategorie (project_order_items) |
| Vorgeplanter Termin | Termin (Datum) |
| KW Vorgeplant | Kalenderwochen-Ableitung aus Termindatum (ISO) |
| Tatsächlicher Termin | Frühester aktiver Termin mit gleicher Projekt-ID im Abfragezeitraum (Fallback: frühester stornierter) |
| Projekt Beschreibung | Projekt |

**Report: Produktionsplanung**
HelpKey: `reports-produkte`

Der Report Produktionsplanung beantwortet zwei Fragen: welche Artikel werden in einem Zeitraum verbaut und in welcher Gesamtmenge, und welche Projekte erfordern besondere Aufmerksamkeit. Er aggregiert Auftragsmengen aus `project_order_items` über alle Projekte mit Terminen im konfigurierten Zeitraum und listet anschließend Projekte mit den Tags Sondermaß oder Anmerkungen als detaillierte Projektkarten auf.

**Datumsspannen-Konfiguration:**

Identisch mit der Vorlaufliste: Modus Datum (Von/Bis) oder Modus Kalenderwoche (KW Start + Anzahl Wochen). Der Kategorie-Layout-Editor ist über den Button Kategorie-Layout neben dem Modus-Toggle zugänglich und öffnet einen Dialog. Nur Admins können das Layout bearbeiten.

**Ausgabe — drei Bereiche:**

- **Produktkategorien:** Je Kategorie eine Liste der vorkommenden Produktnamen mit Gesamtmenge (summiert über alle Projekte und Auftragsmengen).
- **Komponentenkategorien:** Analog zu Produktkategorien, aber für Komponenten.
- **Sondermaße:** Flache Liste aller Projekte, bei denen das systemverwaltete Tag „Sondermaß" am Termin oder Projekt gesetzt ist. Je Eintrag: Auftragsnummer, Kundennummer, Kundenname, frühester Termin im Zeitfenster, Projektbeschreibung.

**Kategorie-Layout:** Die anzuzeigenden Kategorien sowie ihre Darstellung in Blöcken und Spalten werden über den Kategorie-Layout-Editor gesteuert. Der Editor öffnet sich als Dialog über den Button Kategorie-Layout neben dem Modus-Toggle. Nur Admins können das Layout bearbeiten. Kategorien außerhalb des konfigurierten Layouts erscheinen nicht im Report. Ist kein Layout konfiguriert, werden Standardkategorien verwendet.

**Ausschlusslogik:** Projekte oder Termine mit Reklamation-Tag oder Storniert-Tag werden vollständig ausgeschlossen — kein Fallback, keine Markierung (Unterschied zur Vorlaufliste, wo Storniert nur markiert wird).

**Keine Pagination.** Der Report gibt alle passenden Einträge auf einmal zurück.

**Shortcodes:** Der Report kann wahlweise mit Shortcodes statt Vollnamen betrieben werden (expliziter Schalter, kein Automatismus). Wenn Shortcodes aktiv sind, werden Artikel mit identischem Shortcode zu einem einzigen Eintrag zusammengeführt und ihre Mengen summiert. Artikel ohne Shortcode bleiben unter ihrem Vollnamen. Diese Zusammenführungslogik gilt ausschließlich für den Produktionsplanung-Report.

**Projektzeilen-Ausgabe:** Im Anschluss an die Summenbereiche werden alle Projekte des Zeitraums, die das Tag Sondermaß, Anmerkungen oder Gespiegelt tragen, zeitlich aufsteigend sortiert als höhenflexible Projektkarten ausgegeben. Das Tag Anmerkungen wird vom System namentlich erkannt; es bleibt für Nutzer frei wählbar und veränderbar wie jedes andere Tag.

Jede Projektkarte besteht aus drei Bereichen:

- **Header:** Links Kundenname (vollständig) und Kundennummer, in der Mitte Auftragsnummer und Projektname, rechts Datum des repräsentativen Termins und Dauer in Tagen.
- **Inhaltsbereich:** Vollständige Projektbeschreibung, höhenflexibel.
- **Footer:** Entspricht dem Footer einer EntityCard — zugeordnete Mitarbeiter, akkumulierte Notizen, akkumulierte Anhänge und akkumulierte Tags des repräsentativen Termins.

**Druckausgabe (Produktionsplanung):** Aus dem generierten Report heraus kann der Akteur eine Druckausgabe im Format Landscape A4 erzeugen. Die Druckausgabe gliedert sich in drei Bereiche: erstens der Summenreport (Produkt- und Komponentenkategorien komprimiert, mit Shortcodes wenn aktiv und Shortcode-Zusammenführung), zweitens die Vorlaufliste (streng eine Zeile pro Projekt, mit fortlaufendem Index als Zeilennummer, ohne Kundendaten, mit Tourname, mit Shortcodes wenn aktiv), drittens die Projektzeilen (alle Projekte mit Tag Sondermaß, Anmerkungen oder Gespiegelt als höhenflexible Projektkarten mit Header, Beschreibung und EntityCard-Footer). Reklamation und Storniert werden in der Druckausgabe vollständig ausgeschlossen.

**Report: Auftragsliste**

HelpKey: `report-auftragsliste`

Der Report Auftragsliste zeigt alle Projekte mit mindestens einem gültigen Termin im konfigurierten Zeitraum als paginierte Kachelansicht. Jede Kachel repräsentiert ein Projekt und fasst die wesentlichen Auftragsdaten, Komponentenauswahl sowie Mitarbeiterzuordnung kompakt zusammen.

**Datumsspannen-Konfiguration:**

Identisch mit den bestehenden Reports: Modus Datum (Von/Bis) oder Modus Kalenderwoche (KW Start + Anzahl Wochen). Von Datum bzw. KW Start sind Pflichtfelder. Zusätzlich ist ein Kategorie-Popover verfügbar, über das einzelne Komponentenkategorien aus der Ausgabe abgewählt werden können.

**Datenbasis:**

Pro Projekt der erste gültige Termin im Zeitfenster als repräsentativer Termin (frühester nicht-stornierter; Fallback: frühester stornierter, wenn kein aktiver vorhanden). Projekte und Termine mit Reklamation-Tag werden vollständig ausgeschlossen. Je Item werden Termin, Projekt, Kunde, Mitarbeiter, Notizen, Anhänge, Tags und `project_order_items` zusammengeführt.

**Sortierung:** Aufsteigend nach dem repräsentativen Termin. Die Sortierung ist nicht konfigurierbar.

**Ausgabe — Kachelraster:**

Die Ergebnisse werden zeitlich aufsteigend als Kacheln unterhalb des Konfigurationspanels ausgegeben. Das Raster verwendet zwei Spalten ab Viewport-Breite xl. Jede Kachel besteht aus drei Bereichen:

- **Header:** Links Kundenname (vollständig) und Kundennummer, in der Mitte Auftragsnummer und Projektname, rechts Datum des repräsentativen Termins und Dauer in Tagen.
- **Inhaltsbereich:** Vollständige Projektbeschreibung (höhenflexibel); darunter die Komponentenwerte je aktiver Kategorie (Kategoriename + Wert, kompakt).
- **Footer:** Entspricht dem Footer einer EntityCard — zugeordnete Mitarbeiter, akkumulierte Notizen, akkumulierte Anhänge und akkumulierte Tags des repräsentativen Termins.

**Druckausgabe (Auftragsliste):** Aus dem generierten Report heraus kann der Akteur eine paginierte Druckvorschau im Format Landscape A4 öffnen. Je Seite werden so viele Kacheln ausgegeben, wie vollständig passen. Eine Kachel, die am Seitenende nicht vollständig Platz findet, wird vollständig auf die nächste Seite verschoben — kein Umbruch innerhalb einer Kachel. Die Druckvorschau zeigt jeweils eine Seite. Reklamation und Storniert werden vollständig ausgeschlossen.

**Report: Tourenplan**

HelpKey: `report-tourenplan`

Der Report Tourenplan gibt die Terminplanung einer gewählten Tour als druckfähige Kartenansicht aus. Er ersetzt die bisherige Druckfunktion aus dem Wochenkalender und ist als eigenständiger vierter Report in die Reports-Seite integriert, ohne die bestehenden drei Reports fachlich oder technisch zu berühren.

**Konfigurationspanel:**

Tour-Auswahl (Pflichtfeld; enthält alle aktiven Touren sowie die Option „Ohne Tour“ für nicht zugeordnete Termine), Datumsspannen-Modus (Datum Von/Bis oder Kalenderwoche KW Start + Anzahl Wochen), Wochen-Schnellauswahl (aktuelle Woche, nächste Woche, übernächste Woche), Shortcode-Schalter (optional, kein Automatismus), Printmodus-Schalter (Farbdruck / Spardruck; nur Admins können den Modus ändern).

**Datenbasis:**

Alle Termine der gewählten Tour im konfigurierten Zeitraum. Karten werden nach Kalenderwoche gruppiert. Jede Karte repräsentiert einen Termin und zeigt Mitarbeitende (Kurzform), Notizen, Beschreibung und die Artikelliste des Projekts (Sauna-Artikel werden ausgeblendet; optional mit Shortcode-Ersetzung).

**Tag-Priorität (pro Karte):**

Reklamation übersteuert Sondermaß, Sondermaß übersteuert Messe Aufbau/Abbau, Messe Aufbau/Abbau übersteuert Neutral. Die Priorität bestimmt ausschließlich die visuelle Darstellung der Karte; eine Ausschlusslogik wie bei der Produktionsplanung gilt hier nicht.

**System-Tag „Messe Aufbau/Abbau“:**

Ein neu eingeführter, systemverwalteter Termin-Tag analog zu Storniert, Reklamation und Sondermaß. Er unterliegt demselben Schutz- und Sichtbarkeitsmechanismus (kein Nutzer-Rename, kein Löschen).

**Druckvorschau (Tourenplan):**

Aus dem generierten Report kann der Akteur eine Druckvorschau öffnen. Das Seitenformat (Hochformat / Querformat) ist in der Druckvorschau umschaltbar. Die Druckkopfzeile enthält ausschließlich den Tournamen. Die Druckfußzeile enthält ausschließlich die Seitennummer. Karten werden nicht umgebrochen — eine Karte, die am Seitenende nicht vollständig passt, wird vollständig auf die nächste Seite verschoben.

**Preset-Verhalten:**

Die Tourenplan-Konfiguration wird nicht mehr über `reports.tourenplan.rangeConfig` als USER-Setting gespeichert. Beim Öffnen des Reports wird die Datumsspanne auf die aktuelle ISO-Kalenderwoche fokussiert. Tour-Auswahl, Zeitraum, Shortcode-Schalter und Druckoptionen bleiben temporär, bis sie als Preset gespeichert werden. Globale Tourenplan-Presets dürfen nur von Admins verwaltet werden. Soweit ein Druckmodus als verbindliche globale Vorgabe benötigt wird, wird er als GLOBAL-Preset oder als administrativ verwaltete globale Report-Konfiguration geführt; er wird nicht als benutzerspezifisches User-Setting gespeichert.

## Regeln & Randbedingungen

- Der Navigationspunkt Reports ist für Admins, Disponenten und Leser sichtbar und lesend zugänglich.
- Reports werden nicht automatisch erzeugt; jede Ausgabe erfordert eine explizite Anforderung durch den Akteur oder die explizite Ausführung eines gespeicherten Presets.
- Jeder Report-Bereich nimmt die volle Breite des verfügbaren Containers ein.
- Jeder Report hat einen eindeutigen HelpKey für die Zuweisung von Hilfetexten.
- Reports speichern ihren UI-Zustand nicht mehr automatisch in User-Settings. Beim Öffnen eines Reports wird eine Default-Konfiguration geladen, deren Datumsspanne die aktuelle ISO-Kalenderwoche fokussiert.
- Wiederverwendbare Report-Konfigurationen werden ausschließlich als Presets gespeichert. USER-Presets sind benutzerspezifisch; GLOBAL-Presets sind für alle berechtigten Report-Nutzer sichtbar und nur durch Admins verwaltbar.
- Presets können neben Konfigurationswerten auch Folgeaktionen enthalten, zum Beispiel Report erzeugen oder Druckvorschau öffnen.
- Leser dürfen bestehende Reports lesen und erzeugen, erhalten dadurch aber keine Schreib- oder Administrationsrechte für globale Layouts, globale Presets oder Systemkonfiguration.

### Vorlaufliste

- Nur Termine mit Projektzuordnung werden aufgenommen.
- Termine/Projekte mit Reklamation Tag werden gefiltert.
- Termine mit Storniert Tag werden markiert.
- Das Konfigurationspanel hat drei Tabs: Datum, Kalenderwoche und Spalten.
- Die Datumsspanne wird über Tab Datum (Von/Bis) oder Tab Kalenderwoche (KW Start + Anzahl Wochen) konfiguriert. Von Datum bzw. KW Start sind Pflichtfelder.
- Bis Datum ist optional. Ohne Bis-Datum keine obere Grenze.
- Sichtbarkeit und Reihenfolge der Spalten werden über den Tab Spalten konfiguriert. Die Auswahl wird nicht mehr automatisch benutzerspezifisch persistiert, sondern nur dann dauerhaft gespeichert, wenn der Akteur sie als Bestandteil eines Presets sichert. Die Sortierung der Zeilen (aufsteigend nach vorgeplanter Termin) ist nicht konfigurierbar.
- Tatsächlicher Termin = frühester nicht-stornierter Termin mit gleicher Projekt-ID im Abfragezeitraum; Fallback auf frühesten stornierten Termin, wenn kein aktiver vorhanden. Kein Termin im Zeitfenster: Zelle leer.
- Pro Komponentenkategorie maximal eine Auftragsposition; fehlende Kategorie = leere Zelle.

### Produktionsplanung

- Nur Projekte mit mindestens einem Termin im konfigurierten Zeitraum werden berücksichtigt. Als repräsentativer Termin gilt der früheste Termin des Projekts innerhalb der Datumsspanne.
- Projekte und Termine mit Reklamation-Tag oder Storniert-Tag werden vollständig ausgeschlossen (kein Fallback, keine Markierung).
- Die Datumsspanne wird über Modus Datum (Von/Bis) oder Modus Kalenderwoche (KW Start + Anzahl Wochen) konfiguriert. Von Datum bzw. KW Start sind Pflichtfelder.
- Die anzuzeigenden Kategorien werden über das Kategorie-Layout gesteuert. Ist kein Layout konfiguriert, werden Standardkategorien verwendet.
- Keine Pagination; der Report gibt alle passenden Einträge auf einmal zurück.
- Shortcodes-Schalter ist vorhanden. Wenn aktiv, werden Artikel mit identischem Shortcode zu einem Eintrag zusammengeführt, Mengen summiert. Kein stiller Automatismus — nur auf explizite Aktivierung.
- Projekte mit dem Tag Sondermaß, Anmerkungen oder Gespiegelt werden nach den Summenbereichen als Projektzeilen ausgegeben. Das Tag Anmerkungen ist für Nutzer frei wählbar und veränderbar.
- Die Projektzeilen enthalten Header (Kundenname, Kundennummer, Auftragsnummer, Projektname, Termindatum, Dauer in Tagen), Projektbeschreibung und EntityCard-Footer (Mitarbeiter, Notizen, Anhänge, Tags).
- Die Druckausgabe umfasst Summenreport, Vorlaufliste und Projektzeilen.
- In der Druckausgabe werden Stornierungen und Reklamationen vollständig ausgeschlossen — kein Fallback, keine Markierung.

### Auftragsliste

- Nur Projekte mit mindestens einem Termin im konfigurierten Zeitraum werden berücksichtigt. Als repräsentativer Termin gilt der früheste nicht-stornierte Termin des Projekts innerhalb der Datumsspanne; Fallback auf den frühesten stornierten Termin, wenn kein aktiver vorhanden.
- Projekte und Termine mit Reklamation-Tag werden vollständig ausgeschlossen (kein Fallback, keine Markierung).
- Die Datumsspanne wird über Modus Datum (Von/Bis) oder Modus Kalenderwoche (KW Start + Anzahl Wochen) konfiguriert. Von Datum bzw. KW Start sind Pflichtfelder.
- Komponentenkategorien können über ein Kategorie-Popover im Konfigurationspanel individuell abgewählt werden. Initial sind alle aktiven Kategorien eingeschlossen. Deaktivierte Kategorien erscheinen weder in den Kacheln noch in der Druckausgabe.
- Keine konfigurierbare Spaltenreihenfolge; die Kachelstruktur ist fest.
- Sortierung: aufsteigend nach dem repräsentativen Termin. Nicht konfigurierbar.
- Jede Kachel enthält Header (Kundenname, Kundennummer, Auftragsnummer, Projektname, Termindatum, Dauer in Tagen), Inhaltsbereich (Projektbeschreibung + Komponentenwerte) und EntityCard-Footer (Mitarbeiter, Notizen, Anhänge, Tags).
- Druckausgabe: paginiert, Landscape A4. Kacheln werden nicht umgebrochen — eine Kachel, die am Seitenende nicht vollständig passt, wird vollständig auf die nächste Seite verschoben.
- In der Druckausgabe werden Stornierungen und Reklamationen vollständig ausgeschlossen.

### Tourenplan

- Tour-Auswahl ist Pflichtfeld. Die Option „Ohne Tour“ schließt Termine ohne Tourzuordnung ein.
- Die Datumsspanne wird über Modus Datum (Von/Bis) oder Modus Kalenderwoche (KW Start + Anzahl Wochen) konfiguriert. Von Datum bzw. KW Start sind Pflichtfelder.
- Karten werden nach Kalenderwoche gruppiert.
- Tag-Priorität pro Karte: Reklamation > Sondermaß > Messe Aufbau/Abbau > Neutral. Die Priorität steuert ausschließlich die visuelle Darstellung; es gibt keine stille Ausschlusslogik.
- „Messe Aufbau/Abbau“ ist ein systemverwalteter Tag (kein Nutzer-Rename, kein Löschen).
- Die Artikelliste blendet Sauna-Artikel aus.
- Shortcode-Schalter ist vorhanden. Wenn aktiv, werden Artikel mit identischem Shortcode zusammengeführt. Kein Automatismus.
- Die Tourenplan-Konfiguration wird nicht mehr über benutzerspezifische Report-Settings persistiert. Zeitraum, Tour-Auswahl, Shortcode-Schalter und Druckoptionen können als Bestandteil eines Presets gespeichert werden.
- Globale Tourenplan-Vorgaben dürfen nur von Admins verwaltet werden und werden als GLOBAL-Preset oder administrative globale Report-Konfiguration geführt.
- Druckvorschau: Seitenformat (Hochformat / Querformat) ist in der Druckvorschau umschaltbar. Karten werden nicht umgebrochen.

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

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
