# Leser-UI Read-only Release-Plan

## Zweck

Diese Datei beschreibt die vorläufige Release-Strategie für die Rolle `Leser` beziehungsweise `Monteur`, um datenverändernde Wege kurzfristig über die UI zu unterbinden, ohne kurz vor dem Release noch tief in die serverseitige Rollenlogik einzugreifen.

Die Datei ist bewusst als Umsetzungs- und Aufgabenliste formuliert. Sie ersetzt keine echte Berechtigungsreparatur im Backend. Sie definiert nur, welche UI-Elemente für `Leser` sichtbar bleiben, welche Inhalte lesbar bleiben und welche Action-Elemente verschwinden sollen.

## Ausgangslage

Im Rollen-Audit vom 23.04.2026 wurden mehrere Pfade bestätigt, in denen `LESER` serverseitig noch schreibende Aktionen ausführen kann oder in der UI weiterhin auf Mutationen geführt wird. Kurz vor dem Release soll dieses Risiko vorläufig durch eine konsequente UI-Read-only-Regel reduziert werden.

Die Leitidee lautet:

- Inhalte bleiben sichtbar.
- Navigation und Lesen bleiben möglich.
- Panels bleiben sichtbar.
- Vorhandene Informationen wie Notizen, Tags, Termine und Dokumente bleiben sichtbar.
- Mutierende Action-Elemente verschwinden.
- Stammdatenfelder und Relationen werden read-only.

## Harte Grundregel für die Rolle Leser

Für `Leser` gilt überall in der UI folgende Basisregel:

- Alle Panels bleiben sichtbar.
- Inhalte in Panels bleiben sichtbar und lesbar.
- Action-Elemente zum Hinzufügen, Entfernen, Löschen, Speichern, Uploaden, Stornieren, Parken, Sperren, Entsperren oder sonstigen Mutationen werden ausgeblendet.
- Formulare dürfen geöffnet werden, aber Eingaben für Stammdaten sind read-only.
- Relationen dürfen angezeigt, aber nicht verändert werden.
- Listen dürfen geöffnet und gefiltert werden, aber nicht in Neuanlage- oder Mutationspfade verzweigen.

Diese Grundregel gilt ausdrücklich auch dann, wenn einzelne Bereiche heute schon teilweise read-only sind. Ziel ist eine konsistente Leser-Oberfläche.

## Abgrenzung

Diese Datei beschreibt ausschließlich die UI-Absicherung für den Release.

Nicht Teil dieser Maßnahme:

- serverseitige Berechtigungsreparatur
- neue Rollenarchitektur
- Contract-Änderungen
- API-Refactoring
- Datenmodell- oder Migrationsänderungen
- tiefere funktionale Umbauten

## Globales Umsetzungsprinzip

Die Umsetzung sollte zentral und so wenig invasiv wie möglich erfolgen:

1. Rolle `LESER` als expliziten UI-Read-only-Modus behandeln.
2. Diesen Modus in Seiten-Containern, Formularen und Sidebar-Panels durchreichen.
3. Vorhandene `readOnly`-Mechaniken wiederverwenden, wo sie schon existieren.
4. Wo noch kein `readOnly` existiert, nur die minimal nötigen Props ergänzen.
5. Keine fachliche Logik umdeuten, sondern nur Sichtbarkeit und Bedienbarkeit anpassen.

## Vollständige UI-Anpassungsliste

## 1. Globale Einstiege und Navigation

Für `Leser` dürfen keine UI-Einstiege in Neuanlagen sichtbar sein.

Zu verbergen sind insbesondere:

- `Neuer Kunde`
- `Projekt anlegen`
- `Neuer Mitarbeiter`
- kalenderweite `Termin erstellen`-Einstiege

Das betrifft insbesondere die Listen- und Startcontainer, in denen diese Aktionen heute verdrahtet sind.

## 2. Kalender allgemein

Kalenderansichten bleiben sichtbar und benutzbar, aber ohne schreibende Aktionen.

Für `Leser` gilt in allen Kalenderansichten:

- keine Funktion `Termin erstellen`
- kein Drag & Drop
- keine verschiebenden oder mutierenden Terminaktionen
- keine Wochenplanungsaktionen
- Wochennotizen nur lesbar

### 2.1 Wochenkalender

Im Wochenkalender müssen ausgeblendet werden:

- das `+` zum Erstellen eines Termins in den Lane-/Tagesköpfen
- Aktionen zur Wochenplanung im Lane-Menü
- Aktionen zum Blockieren oder Freigeben einer Wochenplanung

Sichtbar bleiben:

- Tour-Lanes
- Termine
- Zähler
- Wochennotiz-Anzeige
- Detail- und Öffnen-Pfade

### 2.2 Monatssicht / MonthSheet

In der MonthSheet-Ansicht müssen ausgeblendet oder unterbunden werden:

- das `+` pro Tag
- Drag & Drop
- das Aktionsmenü an Terminbalken mit Funktionen wie `Stornieren`, `Parken`, `Löschen`

Sichtbar bleiben:

- Terminbalken
- Öffnen bestehender Termine
- Kalenderstruktur und Hervorhebungen

### 2.3 Jahresansicht

In der Jahresansicht muss ausgeblendet werden:

- das `+` pro Tag

Sichtbar bleiben:

- vorhandene Termine
- Öffnen bestehender Termine

## 3. Terminformular

Das Terminformular muss für `Leser` in einen expliziten Rollen-Read-only-Zustand versetzt werden.

### 3.1 Footer

Auszublenden:

- `Speichern`
- `Termin erstellen`

Sichtbar bleiben:

- `Schließen`

### 3.2 Panel Funktionen

Das Panel `Funktionen` bleibt sichtbar, aber seine Action-Elemente verschwinden.

Auszublenden:

- `Stornieren`
- `Parken`
- `Löschen`

### 3.3 Stammdaten und Relationen

Read-only zu setzen sind:

- Datums- und Zeitangaben
- Mitarbeiterzuweisung
- Teamzuweisung
- Tourzuordnung
- Projektzuordnung
- Kundenzuordnung

Das bedeutet:

- keine Mitarbeiter hinzufügen
- keine Mitarbeiter entfernen
- keine Teams zuweisen
- keine Tour setzen oder entfernen
- keine Projekt- oder Kundenrelation ändern

### 3.4 Sidebar-Panels

Panel `Dokumente`:

- sichtbar
- vorhandene Dokumente sichtbar
- kein Upload
- kein Löschen

Panel `Notizen`:

- sichtbar
- vorhandene Notizen sichtbar
- kein Anlegen
- kein Bearbeiten
- kein Pinnen
- kein Löschen

Panel `Tags`:

- sichtbar
- vorhandene Tags sichtbar
- kein Hinzufügen
- kein Entfernen

## 4. Projektformular

Das Projektformular bleibt vollständig lesbar, aber ohne Mutationen.

### 4.1 Einstiege

Auszublenden:

- `Projekt anlegen` in Listen und Seiteneinstiegen

### 4.2 Footer

Auszublenden:

- `Speichern`

Sichtbar bleiben:

- `Schließen`

### 4.3 Panel Funktionen

Das Panel `Funktionen` bleibt sichtbar, aber ohne Aktionen.

Auszublenden:

- `Löschen`

### 4.4 Stammdaten

Read-only zu setzen sind:

- Auftragsnummer
- Projektname
- Auftragswert
- geplanter Termin
- geplante Kalenderwoche
- Beschreibung
- Artikelliste
- Produkt- und Komponentenfelder
- Kundenzuordnung

### 4.5 Sidebar-Panels

Panel `Alle Termine`:

- sichtbar
- vorhandene Termine sichtbar
- keine Add-Aktion `Termin hinzufügen`

Panel `Dokumente`:

- sichtbar
- vorhandene Dokumente sichtbar
- kein Upload
- kein Löschen

Panel `Notizen`:

- sichtbar
- vorhandene Notizen sichtbar
- kein Anlegen
- kein Bearbeiten
- kein Pinnen
- kein Löschen

Panel `Tags`:

- sichtbar
- vorhandene Tags sichtbar
- kein Hinzufügen
- kein Entfernen

## 5. Kundenformular

Das Kundenformular bleibt lesbar, aber ohne schreibende Bedienung.

### 5.1 Einstiege

Auszublenden:

- `Neuer Kunde`

### 5.2 Footer

Auszublenden:

- `Speichern`

Sichtbar bleiben:

- `Schließen`

### 5.3 Stammdaten

Read-only zu setzen sind:

- Kundennummer
- Vorname
- Nachname
- Firma
- Telefon
- E-Mail
- Straße
- Adresszusatz
- PLZ
- Ort
- Land
- Aktiv-Status

### 5.4 Sidebar-Panels

Panel `Projekte`:

- sichtbar
- verknüpfte Projekte sichtbar
- Öffnen bestehender Projekte erlaubt
- keine mutierende Aktion

Panel `Alle Termine`:

- sichtbar
- vorhandene Termine sichtbar
- keine Add-Aktion

Panel `Dokumente`:

- sichtbar
- vorhandene Dokumente sichtbar
- kein Upload
- kein Löschen

Panel `Notizen`:

- sichtbar
- vorhandene Notizen sichtbar
- kein Anlegen
- kein Bearbeiten
- kein Pinnen
- kein Löschen

Panel `Tags`:

- sichtbar
- vorhandene Tags sichtbar
- kein Hinzufügen
- kein Entfernen

## 6. Mitarbeiterformular

Das Mitarbeiterformular bleibt sichtbar und lesbar, aber ohne mutierende Funktionen.

### 6.1 Einstiege

Auszublenden:

- `Neuer Mitarbeiter`

### 6.2 Footer

Auszublenden:

- `Speichern`

Sichtbar bleiben:

- `Schließen`

### 6.3 Stammdaten

Read-only zu setzen sind:

- Vorname
- Nachname
- Telefon
- E-Mail
- Aktiv-Status

### 6.4 Sidebar-Panels

Panel `Dokumente`:

- sichtbar
- vorhandene Dokumente sichtbar
- kein Upload
- kein Löschen

Panel `Notizen`:

- sichtbar
- vorhandene Notizen sichtbar
- kein Anlegen
- kein Bearbeiten
- kein Pinnen
- kein Löschen

Panel `Tags`:

- sichtbar
- vorhandene Tags sichtbar
- kein Hinzufügen
- kein Entfernen

Panel `Team`:

- sichtbar
- nur Anzeige

### 6.5 Termine-Tab

Sichtbar bleiben:

- Terminliste
- Öffnen bestehender Termine

Auszublenden oder nicht zu verdrahten:

- `Mitarbeiter von Termin entfernen`

### 6.6 Wochenplanung-Tab

Sichtbar bleiben:

- Wochenplankarten
- Öffnen der Wochenplanung

Keine Mutationen:

- keine Mitarbeiteränderung
- keine Blockier-/Freigabeaktion
- keine Notizmutation

## 7. Touren

Die Tourenoberfläche ist teilweise schon strenger, muss aber für `Leser` konsequent read-only werden.

### 7.1 Tourenliste

Auszublenden:

- `Tour anlegen`

Sichtbar bleiben:

- Tourkarten
- Öffnen bestehender Touren

### 7.2 Tourformular

### Footer

Auszublenden:

- `Speichern`

Sichtbar bleiben:

- `Schließen`

### Panel Funktionen

Das Panel `Funktionen` bleibt sichtbar, aber die Toggles und Aktionen verschwinden. Das leere Panel darf sichtbar bleiben, wenn diese Grundregel so umgesetzt werden soll.

Auszublenden:

- `KW einfügen`
- `Löschen`

### Stammdaten

Read-only zu setzen sind:

- Tourname
- Farbe

### Termine-Tab

Sichtbar bleiben:

- Terminliste
- Öffnen bestehender Termine

Keine Add-Aktion:

- kein neuer Termin über diese Ansicht

### Wochenplanung-Tab

Sichtbar bleiben:

- Wochenkarten
- bestehende Mitarbeiteranzeigen
- Öffnen der Wochenplanung

Auszublenden:

- `+` zum Hinzufügen von Mitarbeitern
- Entfernen von Mitarbeitern an Badges
- Menüpunkt `Wochenplanung blockieren`
- Menüpunkt `Wochenplanung freigeben`

## 8. Wochenplanung im Detail

Die Detailansicht der Wochenplanung bleibt sichtbar, aber rein lesend.

### Footer

Auszublenden:

- `Wochenplanung blockieren`
- `Wochenplanung freigeben`

Sichtbar bleiben:

- `Schließen`

### Stammdatenbereich

Auszublenden:

- `Mitarbeiter wählen`
- sämtliche Add-/Remove-Aktionen an Mitarbeiter-Badges

### Sidebar

Panel `Notizen`:

- sichtbar
- vorhandene Notizen sichtbar
- kein Anlegen
- kein Bearbeiten
- kein Pinnen
- kein Löschen

### Termine-Tab

Sichtbar bleiben:

- Terminliste
- Öffnen bestehender Termine

Keine Mutationen:

- keine Add-Aktion
- keine Mitarbeiterzuweisung über den Umweg Wochenplanung

## 9. Panels mit generischer Regel

Für alle Sidebar-Panels mit Action-Headern oder Badge-Aktionen soll für `Leser` grundsätzlich gelten:

- Header bleibt sichtbar
- Panel bleibt sichtbar
- Daten bleiben sichtbar
- Add-Buttons verschwinden
- Delete-Aktionen verschwinden
- Remove-Aktionen verschwinden
- Upload-Aktionen verschwinden
- Toggle-Aktionen verschwinden
- Kontextmenü-Mutationen verschwinden

Das betrifft insbesondere:

- Dokumente
- Notizen
- Tags
- Termine-Panels mit Add-Aktion
- Wochenplanungsfunktionen

## Technische Leitlinien für die Umsetzung

Die UI-Änderung sollte möglichst über wenige wiederverwendbare Regeln umgesetzt werden.

Empfohlen ist:

- zentrale Rollenhilfe für `isReader`
- zentraler UI-Modus wie `isRoleReadOnly`
- Durchreichen dieses Modus in Formulare und Sidebar-Komponenten
- vorhandene `readOnly`-Props nutzen, wo vorhanden
- Add-/Delete-/Toggle-Verdrahtungen nur für schreibberechtigte Rollen setzen

Wo es bereits eine Komponente mit `readOnly` gibt, sollte diese bevorzugt genutzt werden. Wo noch keine Prop existiert, soll nur die minimal nötige Ergänzung vorgenommen werden.

## Bekannte technische Schwerpunkte

Für die spätere Umsetzung ist mit kleinen Ergänzungen an gemeinsamen Komponenten zu rechnen. Besonders relevant sind:

- Kalender-Wrapper und Seiten-Container, die Neuanlagen aktuell noch verdrahten
- Formular-Footer mit Save-Aktionen
- `NotesSection`
- Dokument-Panels
- Tag-Picker
- Relationen-Slots
- Tour- und Wochenplanungsaktionen

## Restarbeiten nach dem Release

Die UI-Absicherung ersetzt nicht die eigentliche Rechte-Reparatur. Folgende Punkte bleiben ausdrücklich als Nacharbeit offen:

### 1. Serverseitige Berechtigungsreparatur

- Termin anlegen, ändern, Anzeige-Modus ändern und löschen gegen `LESER` absichern
- Projekt-Stammdaten serverseitig absichern
- Projekt-Auftragspositionen serverseitig absichern
- Projektnotizen serverseitig absichern
- generische Notiz-API kontextbezogen absichern

### 2. Vereinheitlichung der Frontend-Rollenlogik

- zentrale Rollenhilfen einführen
- Leser-Read-only nicht mehr fallweise in Einzelformen bauen
- Sichtbarkeit und Bedienbarkeit über gemeinsame Regeln steuern

### 3. Testabdeckung

- gezielte UI-Tests für Leser-Sichtbarkeit und Leser-Read-only
- Negativtests auf verborgene Mutationspfade
- serverseitige Reader-Negativtests für alle auditrelevanten Endpunkte

## Risiko- und Restbewertung

Diese Maßnahme reduziert das Risiko vor dem Release spürbar, beseitigt es aber nicht vollständig.

Rest-Risiken:

- direkte API-Aufrufe bleiben möglich, solange serverseitige Guards fehlen
- übersehene UI-Pfade können weiter Mutationen erlauben
- inkonsistente Sonderpfade können trotz Grundregel offen bleiben

Trotzdem ist diese Maßnahme für den Release geeignet, weil sie die sichtbaren und alltäglichen Mutationspfade stark reduziert, ohne kurz vor dem Release in tiefe Architektur- oder Berechtigungsumbauten zu zwingen.

## Erwartetes Ergebnis

Nach Umsetzung dieser Aufgabenliste soll ein `Leser`:

- alle relevanten Informationen sehen können
- bestehende Datensätze öffnen können
- Kalender, Projekte, Kunden, Mitarbeiter, Touren und Wochenplanungen lesen können
- aber keine Stammdaten, Relationen, Notizen, Tags, Dokumente oder Planungszustände mehr über die UI verändern können

Die Oberfläche bleibt damit funktional lesbar, aber operativ schreibgeschützt.
