# A-06 - FT-03 Monatsübersicht mit KW-Navigation und gleitendem Fenster

## Metadaten

- Status: offen
- Priorität: Hoch
- Typ: Implementierung
- Erstellt: 06.05.26
- Quelle: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-kalender-kw-navigation.md`
- Verantwortlich: offen

## Beziehungen

- Features:
  - [FT (03): Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
- Use Cases:
  - [UC 03/02 - Zeitraum wechseln](../features/ft-03-kalenderansichten/use-cases/uc-03-02-zeitraum-wechseln.md)
  - [UC 03/05 - Monatsübersicht anzeigen](../features/ft-03-kalenderansichten/use-cases/uc-03-05-monatsuebersicht-anzeigen.md)
  - [UC 03/06 - Auslastungsansicht eines Mitarbeiters anzeigen](../features/ft-03-kalenderansichten/use-cases/uc-03-06-auslastungsansicht-eines-mitarbeiters-anzeigen.md)
- Entscheidungen:
  - Keine direkte Decision verknüpft.
- Weitere Bezüge:
  - FT-34 Kalendermarker, weil der Ladezeitraum künftig am sichtbaren Fenster hängen muss.

## Ziel

Die Monatsübersicht soll zusätzlich zur bestehenden Monatsnavigation eine wochenweise Navigation erhalten. Das Navigationsmodell soll dafür auf ein gleitendes Fenster mit einer einzigen steuernden Variable `windowStart` umgestellt werden.

## Ausgangslage

Die Monatsübersicht verwendet bisher einen fixen Monatsanker. Der neue Auftrag beschreibt ein Fensterprinzip, bei dem `windowStart` immer ein Montag ist, die Fenstergröße konstant bleibt und Wochenaktionen frei um jeweils sieben Tage verschieben. Die bestehenden Monatsaktionen bleiben erhalten, springen aber auf den Wochenbeginn des ersten Tages des Zielmonats.

## Umfang

Zur Aufgabe gehören:

- Navigationsmodell der Monatsübersicht auf `windowStart` umstellen
- neue Aktionen für eine Woche vor und eine Woche zurück ergänzen
- bestehende Monatsnavigation auf Snap-Verhalten zum Zielmonat anpassen
- adaptiven Header für einmonatige und monatsübergreifende Fenster einführen
- KW-Angabe je Wochenzeile kompakt anzeigen
- `windowStart` reloadfest speichern
- Ladebereiche für Termindaten und FT-34-Kalendermarker auf das volle sichtbare Fenster ausrichten
- Auslastungsansicht im Mitarbeiterformular auf Übertragbarkeit prüfen

Nicht Teil der Aufgabe sind neue Terminlogik, neue API-Endpunkte, DB-Schemaänderungen, Änderungen an Rollenprüfungen, Änderungen an Sperrregeln, Drag-and-Drop-Fachlogik, Kachelmodus oder Tourenmodus.

## Umsetzungshinweise

- `windowStart` muss immer auf einen Montag normalisiert werden.
- Bei ungültigem gespeicherten Wert ist auf Montag der aktuellen Woche zurückzufallen.
- Die Fenstergröße ist konstant und wird anhand des bestehenden Layouts festgelegt.
- Termindaten müssen von `windowStart` bis zum letzten sichtbaren Fenstertag geladen werden.
- FT-34-Kalendermarker müssen denselben sichtbaren Zeitraum abdecken.
- Falls `windowStart` als URL-Parameter gespeichert wird, ist direktes Teilen einer Fensterposition erwünscht.
- Die Auslastungsansicht wird nur übernommen, wenn sie ohne unverhältnismäßigen Mehraufwand dasselbe Modell nutzen kann; andernfalls bleibt sie unverändert und wird in der Umsetzung dokumentiert.

## Rollen- und Sicherheitsbezug

Die Aufgabe darf Rollen-, Termin-, Tour-, Drag-and-Drop- und Sperrregeln nicht verändern. Bestehende serverseitige Berechtigungen bleiben maßgeblich. Die neue Navigation darf nur den sichtbaren Zeitraum steuern und keine Daten für unzulässige Rollen oder Nebenpfade freigeben.

## Erwartete Tests und Prüfungen

- Wochennavigation vorwärts verschiebt das Fenster exakt um sieben Tage.
- Wochennavigation rückwärts verschiebt das Fenster exakt um sieben Tage.
- Monatsnavigation vorwärts springt unabhängig von aktueller Position auf den Wochenbeginn des ersten Tages des nächsten Monats.
- Monatsnavigation rückwärts verhält sich analog für den vorherigen Monat.
- Header zeigt bei monatsübergreifendem Fenster beide Monatsnamen.
- Reload stellt dieselbe Fensterposition wieder her.
- Manipulierter oder ungültiger `windowStart` wird ohne Crash normalisiert.
- Termine am letzten sichtbaren Fenstertag werden geladen und dargestellt.

## Anhänge

- Auftragsdatei: `C:\Users\r.rose\Downloads\codex-auftrag-ft03-kalender-kw-navigation.md`

## Blocker und offene Fragen

- Konkreter Persistenzmechanismus für `windowStart` ist anhand der bestehenden Architektur zu wählen.
- Konkrete Fenstergröße ist anhand des bestehenden Monatsübersicht-Layouts festzulegen.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen
