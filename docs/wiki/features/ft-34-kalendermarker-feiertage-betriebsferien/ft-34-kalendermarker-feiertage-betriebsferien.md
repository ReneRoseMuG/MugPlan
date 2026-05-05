# FT (34): Kalendermarker, Feiertage und Betriebsferien

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature beschreibt Kalendermarker als eigenständige, nicht planungswirksame Zusatzinformationen für die Kalenderansichten. Dazu gehören gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien.

Ziel ist es, kalendarisch relevante Tage sichtbar zu machen, ohne daraus Termine, Mitarbeiterabwesenheiten, Konflikte, Locks, Reporteffekte oder Terminmutationen abzuleiten. Kalendermarker dienen der Orientierung in Wochen- und Monatskalender und können durch Administratoren gepflegt werden.

## Fachliche Beschreibung

Kalendermarker sind gespeicherte Markierungen auf einem Datum oder Zeitraum. Sie stehen fachlich neben Terminen und werden nicht als Termin modelliert.

Es gibt drei Markerarten:

- **Gesetzlicher Feiertag**: automatisch berechneter Feiertag mit bundesweiter oder regionaler Geltung.
- **Betriebsfeiertag**: firmenweiter einzelner Schließtag.
- **Betriebsferien**: firmenweiter Zeitraum.

Gesetzliche Feiertage werden über einen Seed aus der Feiertagsberechnung erzeugt und anschließend im Kalendermarker-Bestand gespeichert. Die Anzeige im Kalender liest ausschließlich gespeicherte, aktive Marker. Eine Live-Berechnung in der Kalenderanzeige findet nicht statt.

Der automatische Seed kann über zwei technische Auslöser laufen: über den System-Seed und zusätzlich nach dem ersten erfolgreichen Admin-Login eines Tages. Mehrere spätere Admin-Logins am selben Tag lösen keinen weiteren Tages-Seed aus.

Administratoren können gespeicherte Marker bearbeiten, deaktivieren, reaktivieren und löschen. Editierte Marker haben Vorrang vor dem automatischen Sollzustand. Ein Seed darf bestehende Marker nicht überschreiben, wenn sie anhand ihrer fachlichen Identität bereits vorhanden sind.

Die Visualisierung der Marker ist global konfigurierbar. Es gibt die Stile **Dezent**, **Standard** und **Hervorgehoben**. Die Stile verändern nur die Intensität der Darstellung, nicht die fachliche Bedeutung des Markers.

Die Markeranzeige folgt in den Kalenderansichten einer kontextbezogenen Darstellung. Im Wochenkalender wird der betroffene Tag als durchgehende Spalte über alle sichtbaren Tour-Lanes markiert. Im Monatskalender wird die volle Tageskachel markiert. Die textliche Markeranzeige wird im Kopf des Tages gezeigt und verwendet abhängig vom Platz entweder den vollen Namen, einen kompakten Platzhalter oder ein Icon. In kompakten Varianten bleibt der vollständige Markername per Hover erreichbar.

## Regeln & Randbedingungen

**R-01 Keine Terminwirkung**

Kalendermarker sind keine Termine. Sie erzeugen keine Mitarbeiterzuweisungen, keine Terminüberschneidungen, keine Sperren, keine Abwesenheiten, keine Projekt- oder Kundenbezüge und keine Reporteffekte.

**R-02 Persistenz vor Berechnung**

Die Kalenderanzeige verwendet gespeicherte Marker. Automatisch berechnete gesetzliche Feiertage werden vorab in den gespeicherten Bestand geseedet.

**R-03 Seed-Zeitraum**

Der automatische Feiertags-Seed erzeugt Marker für das aktuelle Jahr bis einschließlich aktuelles Jahr plus fünf Jahre.

**R-03a Seed-Auslöser**

Der automatische Feiertags-Seed wird über den System-Seed sowie nach dem ersten erfolgreichen Admin-Login eines Tages ausgelöst. Nicht-Admin-Logins dürfen keinen Feiertags-Seed starten.

**R-04 Seed-Idempotenz**

Ein Seed erkennt bestehende gesetzliche Feiertage über Datum, Typ, Quelle, Geltung und Bundesländer. Existiert ein Marker mit dieser fachlichen Identität bereits, wird er nicht überschrieben.

**R-05 Editierte Daten haben Vorrang**

Name, Notiz, Aktiv-Status und Version eines bestehenden Markers bleiben bei späteren Seeds erhalten.

**R-06 Aktiv-Status steuert Kalenderanzeige**

Nur aktive Marker erscheinen im Kalender-Leseendpunkt und damit in Wochen- und Monatskalender. Deaktivierte Marker bleiben im Admin-Bestand sichtbar.

**R-07 Rollen**

Kalenderlesen ist für Administratoren, Disponenten und Leser erlaubt. Pflege von Markern sowie Änderung des globalen Visualisierungsstils ist ausschließlich Administratoren erlaubt und serverseitig abzusichern.

**R-08 Visualisierung**

Gesetzliche Feiertage werden rot, Betriebsfeiertage grün und Betriebsferien blau dargestellt. Die globale Stilauswahl steuert nur die Farbintensität.

**R-09 Primärmarker pro Tag**

Sind an einem Tag mehrere Marker aktiv, zeigt die kompakte Kalenderdarstellung nur einen Primärmarker sichtbar im Tageskopf. Die vollständige Markerinformation bleibt über Hover erreichbar.

**R-10 Monatskopf ohne Zusatzzeile**

Im Monatskalender darf die Markerbeschriftung keine zusätzliche Zeile unterhalb des Tageskopfs erzeugen. Die Darstellung muss im bestehenden Kopfbereich der Tageskachel bleiben, damit die Grid-Logik stabil bleibt.

## Use Cases

- [UC 34/01: Kalendermarker im Kalender anzeigen](use-cases/uc-34-01-kalendermarker-im-kalender-anzeigen.md)
- [UC 34/02: Feiertage und Betriebsmarker verwalten](use-cases/uc-34-02-feiertage-und-betriebsmarker-verwalten.md)
- [UC 34/03: Gesetzliche Feiertage automatisch seeden](use-cases/uc-34-03-gesetzliche-feiertage-automatisch-seeden.md)
- [UC 34/04: Marker deaktivieren und reaktivieren](use-cases/uc-34-04-marker-deaktivieren-und-reaktivieren.md)
- [UC 34/05: Visualisierungsstil global wählen](use-cases/uc-34-05-visualisierungsstil-global-waehlen.md)
- [UC 34/06: Unberechtigte Marker-Pflege blockieren](use-cases/uc-34-06-unberechtigte-marker-pflege-blockieren.md)

## Backlogs

Nicht angegeben.

## Architektur & Kontext

### Betroffene Daten

Kalendermarker werden im bestehenden Kalendermarker-Bestand gespeichert. Es wird keine neue Terminart und keine neue Termintabelle eingeführt.

Gespeicherte Marker umfassen sowohl manuell gepflegte Betriebsmarker als auch gesetzliche Feiertage aus dem Seed. Die Kalenderanzeige konsumiert nur diesen bestehenden Marker-Bestand und keine parallele Live-Berechnung.

### Verwandte Features & Abhängigkeiten

**Dieses Feature konsumiert:**

- FT (03): Kalenderansichten, weil Wochen- und Monatskalender die Marker visualisieren.
- FT (18): User Preferences, weil der globale Visualisierungsstil als Setting geführt wird.
- FT (20): Rollenbasierte Zugriffsbeschränkungen, weil Pflege und globale Einstellung Administratoren vorbehalten sind.

**Dieses Feature wird konsumiert von:**

- FT (03): Kalenderansichten, die aktive Marker im dargestellten Zeitraum anzeigen.

**Abgrenzung zu FT (01):**

Kalendermarker sind keine Termine. Änderungen an Markern dürfen die fachliche Terminlogik aus FT (01) nicht verändern.

### Seiteneffekte bei Änderungen

- Änderungen an Markerarten oder Farben betreffen Wochen- und Monatskalender.
- Änderungen an Rollenregeln betreffen die Stammdatenpflege und direkte Admin-API-Aufrufe.
- Änderungen am Seed-Verhalten können gespeicherte Feiertage duplizieren oder editierte Admin-Werte überschreiben, wenn die Idempotenz verletzt wird.

## Entscheidungen & Offene Punkte

### Offene Fragen

Keine.

### Entscheidungslog

**Kalendermarker als eigenes Feature**

Feiertage und Betriebsferien werden nicht in FT (01) integriert, weil sie keine Termine sind. Sie werden als eigenes Feature dokumentiert und von FT (03) visualisiert.

**Gespeicherte Feiertage statt Live-Berechnung**

Gesetzliche Feiertage werden berechnet und anschließend gespeichert. Die Kalenderanzeige liest gespeicherte aktive Marker.

**Seed überschreibt editierte Daten nicht**

Bestehende Marker behalten Namen, Notiz, Aktiv-Status und Version. Der Seed ergänzt nur fehlende fachliche Identitäten.

**Globale Visualisierung**

Die Stilauswahl ist global und admin-gepflegt. Sie verändert nur die Darstellung, nicht die fachliche Markerlogik.

**Adaptive Markeranzeige**

Die Kalenderdarstellung verwendet für Marker im Tageskopf eine adaptive Anzeige mit Volltext, kompaktem Platzhalter und Icon. Dadurch bleibt die Darstellung in Woche und Monat stabil, auch wenn für Markerbeschriftungen nur wenig Platz verfügbar ist.
