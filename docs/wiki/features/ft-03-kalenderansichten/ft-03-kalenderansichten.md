# FT (03): Kalenderansichten

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature beschreibt die aktuell fachlich relevanten Kalenderansichten der Anwendung. Im Zentrum steht der Wochenkalender als zentrale Dispositions- und Planungsansicht. Ergänzt wird er durch eine Monatsübersicht zur kompakten Orientierung sowie durch eine read-only Auslastungsansicht im Mitarbeiterformular, die die Belegung eines einzelnen Mitarbeiters in derselben visuellen Sprache und mit derselben Monatsnavigation darstellt.

Die Kalenderansichten dienen der Planung, Orientierung und dem Drilldown in bestehende Termin-, Projekt-, Kunden-, Tour- und Mitarbeiterbezüge.

## Fachliche Beschreibung

Die Anwendung stellt derzeit drei fachlich relevante kalendernahe Darstellungen bereit.

### Wochenkalender

Der Wochenkalender ist die zentrale Planungsansicht. Termine werden wochenweise in Touren organisiert. Jede Tour bildet eine eigene Lane. Zusätzlich existiert eine Gruppe für Termine ohne Tourzuordnung.

Termine werden innerhalb der Woche als Kacheln oder mehrtägige Spannelemente dargestellt. In dieser Ansicht können Termine geöffnet, neu angelegt und, sofern die fachlichen Sperrregeln dies zulassen, per Drag & Drop verschoben werden.

Der Wochenkalender besitzt zusätzlich zwei Darstellungsmodi.

**Kacheln**

- Kompakt
- Standard
- Detail

Dieser Modus steuert ausschließlich die Informationsdichte und Ausdehnung der Terminkacheln.

**Touren**

- Aufgeklappt
- Zugeklappt

Dieser Modus steuert ausschließlich die visuelle Darstellung der Tour-Lanes.

Beide Darstellungsmodi verändern keine fachliche Terminlogik.

Zusätzlich kann der Wochenkalender optionale Arbeitsbereiche einblenden:

- Termin-Notizen als rein lesende Karten direkt unter Terminkarten im Kachelmodus.
- Eine Personalübersicht je Tour-Lane auf Basis der bestehenden Kalenderwochen-Tourenplanung.
- Eine passive Abwesenheitszeile je sichtbarem Kalendertag.

Diese Bereiche ändern keine fachliche Termin-, Tour- oder Abwesenheitslogik. Sie machen bestehende Daten sichtbar oder öffnen bestehende Mutationspfade.

### Monatsübersicht

Die Monatsübersicht dient der kompakten Übersicht über einen Monatsbereich. Sie übernimmt die fachliche Kalenderlogik des Wochenkalenders in verdichteter Form. Termine bleiben nach Datum, Dauer, Tourzuordnung und optionaler Startzeit organisiert.

Auch in der Monatsübersicht können bestehende Termine geöffnet werden. Das Anlegen neuer Termine pro Kalendertag sowie fachlich zulässiges Verschieben von Terminen bleiben möglich, sofern diese Interaktionen in der Oberfläche angeboten werden.

### Auslastungsansicht im Mitarbeiterformular

Im Mitarbeiterformular existiert zusätzlich eine Auslastungsansicht. Diese Darstellung ist optisch aus der Monatsübersicht abgeleitet und zeigt für genau einen Mitarbeiter einen festen Bereich in derselben Monatslogik wie der allgemeine Monatskalender.

Die Ansicht dient ausschließlich der Einschätzung der bereits geplanten Belegung eines Mitarbeiters. Sie ist ausdrücklich read-only. Aus dieser Ansicht heraus werden keine Termine angelegt, verschoben oder bearbeitet.

Die Navigation verwendet dieselbe Monatsnavigation wie der Monatskalender. Dazu gehört auch der KW-Sprung einschließlich Rücksprung auf die vorherige Position.

## Regeln & Randbedingungen

Kalendermarker aus FT (34) werden in Wochen- und Monatskalender als zusätzliche, nicht planungswirksame Orientierung dargestellt. Sie verändern keine Terminlogik, blockieren keine Interaktion und erzeugen keine Konflikte.

Gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien werden farblich unterschieden. Die globale Intensität der Darstellung wird über FT (34) gepflegt und wirkt nur visuell.

Die Kalenderansichten lesen dafür aktive, bereits gespeicherte Kalendermarker im sichtbaren Zeitraum. Eine Live-Berechnung gesetzlicher Feiertage in FT (03) findet nicht statt.

Der Wochenkalender ist die primäre Dispositionsoberfläche. In dieser Ansicht können Termine über den Plus-Button pro Kalendertag angelegt, über Klick geöffnet und, sofern erlaubt, per Drag & Drop verschoben werden.

Die Monatsübersicht ist eine verdichtete Kalenderansicht mit denselben fachlichen Termindaten. Sie dient vorrangig der Übersicht, unterstützt aber weiterhin das Öffnen bestehender Termine und, sofern in der Oberfläche vorgesehen, das Anlegen und fachlich zulässige Verschieben von Terminen. Die Navigation nutzt dieselben Monatsblätterfunktionen wie die Auslastungsansicht im Mitarbeiterformular; zusätzliche Sondernavigationen je Teilansicht sind nicht vorgesehen.

Die Auslastungsansicht im Mitarbeiterformular ist read-only. In dieser Ansicht dürfen keine Termine erzeugt, verschoben oder bearbeitet werden.

Für das Anlegen und Bearbeiten von Terminen wird ausschließlich das in FT (01) definierte Terminformular verwendet. Die Kalenderansichten führen keine eigene Erstell- oder Bearbeitungslogik ein, sondern öffnen das bestehende Formular im passenden Modus.

Beim Klick auf den Plus-Button wird das Formular im Modus „Neuer Termin“ geöffnet und das Startdatum auf den angeklickten Tag gesetzt. Beim Klick auf einen bestehenden Termin wird das Formular im Modus „Termin bearbeiten“ geöffnet.

Für alle ändernden Aktionen gelten dieselben Sperr- und Rollenregeln wie beim Bearbeiten eines Termins. Ein Termin darf ab seinem Starttag von normalen Benutzern nicht mehr geändert werden. Administratoren dürfen diese Sperre übersteuern und Termine auch nachträglich verändern. In gesperrten Fällen sind Drag & Drop sowie das Bearbeiten über Klick zu verhindern oder eindeutig mit einer Fehlermeldung abzulehnen.

Das Verschieben eines Termins per Drag & Drop führt immer zu einer deterministischen Neuordnung der Termindarstellung in allen betroffenen Tagen oder Wochenabschnitten. Betroffen sind mindestens Quell- und Zieltag, bei mehrtägigen Terminen alle Tage der Termindauer.

Der benutzerspezifische Kachelmodus Kompakt, Standard oder Detail verändert ausschließlich die Informationsdichte und vertikale Ausdehnung der Wochenkacheln. Er darf keine fachliche Auswirkung auf Reihenfolge, Zuordnung, Dauer oder Bearbeitbarkeit von Terminen haben.

Die Umschaltung Touren Aufgeklappt oder Zugeklappt verändert ausschließlich die visuelle Darstellung der Tour-Lanes. Auch dieser Modus darf keine fachliche Terminlogik verändern.

Die Kalenderansichten benötigen für die dargestellten Termine Zugriff auf Projekt- und Kundendaten sowie auf Tour- und Mitarbeiterzuordnungen. Diese Informationen dürfen serverseitig zusammengeführt oder bei Bedarf nachgeladen werden, solange die Oberfläche ohne spürbare Verzögerung bedienbar bleibt.

Direkte Aktionen an Terminkarten dürfen keine eigene Fachlogik einführen. Notizen werden über den bestehenden Termin-Notiz-Pfad angelegt. Mitarbeiterzuweisungen aus der Terminkarte verwenden die bestehende Tour-KW-Vorschau und die normale Terminmutation, sodass serverseitige Rollen-, Historien-, Overlap- und Abwesenheitsprüfungen maßgeblich bleiben. Wenn für den Termin eine Tour-KW-Planung existiert, zeigt der Dialog zuerst die Tour-KW-Mitarbeiter und darunter die weiteren konfliktfrei zuweisbaren Mitarbeiter. Initial vorausgewählt sind nur konfliktfrei übernehmbare Tour-KW-Mitarbeiter, die noch nicht am Termin hängen. Die konfliktfreie Restmenge bleibt sichtbar, ist aber nicht vorausgewählt. Gibt es keine oder eine leere Tour-KW-Planung, zeigt der Dialog nur konfliktfrei zuweisbare Mitarbeiter ohne Vorauswahl.

Druckvorschauen für Monats- und Wochenkalender sind read-only. Sie orientieren sich am aktuellen sichtbaren Zustand und blenden interaktive Bedienelemente aus.

## Darstellung

### Gesamtkonzept

Die verschiedenen Kalenderdarstellungen greifen auf dieselbe Terminbasis zurück, unterscheiden sich aber in ihrer Informationsdichte und ihrem Nutzungskontext.

Der Wochenkalender ist die detailreichste Ansicht und dient der aktiven Disposition.  

Die Monatsübersicht verdichtet dieselbe Logik auf Monatsebene.  

Die Auslastungsansicht im Mitarbeiterformular übernimmt die visuelle Grundidee der Monatsübersicht für einen einzelnen Mitarbeiter in read-only Form.

Ein Termin ist ein Zeitraum mit Startdatum und optional Enddatum. Ein Termin kann optional einer Tour zugeordnet sein. Eine Tour besitzt eine individuelle Farbe, die die Terminfarbe bestimmt. Ist keine Tour zugeordnet, wird eine neutrale Farbe verwendet.

Ein Termin kann optional eine Startzeit haben. Solche Termine bleiben geometrisch Kalendereinträge innerhalb eines Tags. Die Uhrzeit ergänzt die Information und kann die Sortierung beeinflussen, erzeugt jedoch keine stundenbasierte Zeitachse.

### Wochenkalender

Im Wochenkalender werden Termine innerhalb der sichtbaren Woche tourbezogen organisiert. Die Darstellung unterscheidet zwischen Tour-Lanes und der Gruppe „Ohne Tour“. Mehrtägige Termine können sich über mehrere Tage spannen. Termine mit Uhrzeit bleiben Tagesobjekte.

Kalendermarker wirken im Wochenkalender als tagesbezogene Hintergrundmarkierung über die gesamte betroffene Tagesspalte hinweg. Bei Feiertagen, Betriebsfeiertagen oder Betriebsferien reicht diese farbliche Markierung über alle sichtbaren Tour-Lanes der betroffenen Spalte.

Die textliche Markeranzeige sitzt im Kopf des jeweiligen Kalendertags. Sie verwendet eine adaptive Darstellung: Wenn genügend Platz vorhanden ist, wird der volle Markername gezeigt. Reicht der Platz nicht aus, wird ein kompakter Platzhalter angezeigt. Ist auch dieser nicht mehr stabil darstellbar, wird ein Icon verwendet. In kompakten Varianten bleibt der vollständige Markername per Hover erreichbar.

Die Tagesspalten im Wochenkalender verwenden eine kompakte Beschriftung mit deutschem Wochentag, Tageszahl und Monatskürzel, zum Beispiel `Mo 27 Apr`. Bei knappem Platz kann das Monatskürzel ausgeblendet werden. Diese Darstellung ist als bewusste Ausnahme von der allgemeinen sichtbaren Datumsregel dokumentiert; andere sichtbare Datumsangaben bleiben beim Kurzformat `dd.MM.yy`.

Termin-Notizen können im Wochenkalender dauerhaft sichtbar gemacht werden. Angezeigt werden Titel, Inhalt und Kartenfarbe; Bearbeiten, Löschen, Pinning und Vorlagenfunktionen bleiben den bestehenden Notizdialogen vorbehalten.

Die Personalübersicht je Tour-Lane liest die geplanten Mitarbeiter der jeweiligen Tour-KW. Neben dem Hinzufügen einzelner Tour-KW-Mitarbeiter kann die Tour-KW-Planung direkt auf die Termine der jeweiligen Tour und Kalenderwoche angewendet werden. Diese Aktion nutzt dieselbe Vorschau-/Bestätigungslogik wie die Tour-KW-Planung und speichert keine getrennte Mitarbeiterplanung. Änderungen aus der Terminkarte verwenden ebenfalls die bestehende Vorschau-/Bestätigungslogik.

Die Abwesenheitszeile zeigt vorhandene Abwesenheitstermine pro sichtbarem Tag als Mitarbeiter-Badges. Sie ist vollständig passiv und bietet keine Pflege von Abwesenheiten an.

#### Kachelmodus

Der Regler Kacheln steuert die Informationsdichte der Terminkacheln.

**Kompakt** zeigt die Kachel maximal verdichtet.  

**Standard** zeigt einen mittleren Informationsumfang.  

**Detail** zeigt die Kachel maximal ausgedehnt.

Die Umschaltung verändert nur die visuelle Informationsmenge und die resultierende Höhe des dargestellten Kachelbereichs.

#### Tourenmodus

Der Regler Touren steuert, ob die Tour-Lanes ausführlicher oder verdichtet dargestellt werden.

**Aufgeklappt** zeigt die Tour-Lanes ausführlicher.  

**Zugeklappt** reduziert die Darstellung auf eine verdichtete Form.

Die Lane-Reihenfolge und die fachliche Zuordnung der Termine bleiben stabil.

### Monatsübersicht

Die Monatsübersicht organisiert den sichtbaren Zeitraum in Wochenzeilen mit Tagesspalten. Innerhalb jeder Wochenzeile werden Tour-Slots verwendet, sodass Termine einer Tour in derselben visuellen Ordnung erscheinen. Die Höhe einer Wochenzeile ergibt sich aus dem tatsächlich benötigten Platz für die in dieser Zeile vorkommenden Tour-Slots und Terminbalken.

Die Monatsübersicht ist damit verdichteter als der Wochenkalender, bleibt aber fachlich konsistent. Termine werden weiterhin über Tour, Datum, Dauer und optionale Startzeit strukturiert.

Kalendermarker färben im Monatskalender die volle betroffene Tageskachel. Die Markerbeschriftung wird im vorhandenen Kopf der Tageskachel gezeigt und darf keine zusätzliche Layout-Zeile unterhalb des Kopfbereichs erzeugen.

Wie im Wochenkalender ist die Markerbeschriftung adaptiv. Je nach verfügbarer Breite wird voller Markername, kompakter Platzhalter oder nur ein Icon gezeigt. Bei kompakten Varianten bleibt der vollständige Markername per Hover erreichbar.

### Auslastungsansicht im Mitarbeiterformular

Die Auslastungsansicht im Mitarbeiterformular ist eine abgeleitete, read-only Darstellung. Sie zeigt einen festen Vier-Wochen-Bereich für genau einen Mitarbeiter und verwendet bewusst dieselbe visuelle Sprache wie die Monatsübersicht.

Ziel ist nicht die Disposition, sondern die schnelle Beurteilung der bereits geplanten Auslastung eines Mitarbeiters.

Die Navigation dieser Ansicht verwendet dieselben Monatswechsel und denselben KW-Sprung wie der Monatskalender. Änderungen an Terminen selbst werden aus dieser Ansicht heraus nicht vorgenommen.

### Drilldown und Zusatzinformationen

Kalendereinträge dürfen Zusatzinformationen aus Termin, Projekt, Kunde, Tour und Mitarbeiterzuordnung bündeln. Verdichtete Ansichten dürfen Inhalte kürzen oder ausblenden, solange der Drilldown in den Termin erhalten bleibt und die zugrunde liegende Terminlogik nicht verändert wird.

## Use Cases

- [UC 03/01: Wochenkalender anzeigen](use-cases/uc-03-01-wochenkalender-anzeigen.md)
- [UC 03/02: Zeitraum wechseln](use-cases/uc-03-02-zeitraum-wechseln.md)
- [UC 03/03: Darstellungsgrad der Wochenkacheln umschalten](use-cases/uc-03-03-darstellungsgrad-der-wochenkacheln-umschalten.md)
- [UC 03/04: Tour-Lanes aufklappen oder zuklappen](use-cases/uc-03-04-tour-lanes-aufklappen-oder-zuklappen.md)
- [UC 03/05: Monatsübersicht anzeigen](use-cases/uc-03-05-monatsuebersicht-anzeigen.md)
- [UC 03/06: Auslastungsansicht eines Mitarbeiters anzeigen](use-cases/uc-03-06-auslastungsansicht-eines-mitarbeiters-anzeigen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
