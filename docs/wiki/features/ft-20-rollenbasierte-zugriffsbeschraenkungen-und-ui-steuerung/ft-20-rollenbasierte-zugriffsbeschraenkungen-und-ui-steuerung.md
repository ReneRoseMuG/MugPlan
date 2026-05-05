# FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature definiert die fachliche Bedeutung der Rollen **Admin**, **Disponent(in)** und **Leser** innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfügbar sind.

Ziel ist es, eine klare Verantwortungsstruktur im System zu etablieren, ohne die bestehende Daten- oder Terminlogik zu verändern. Die Zugriffsbeschränkungen betreffen ausschließlich Sichtbarkeit, Bedienbarkeit und serverseitig durchgesetzte Autorisierung.

Die fachliche Sicherheit bleibt stets serverseitig abgesichert (vgl. FT (14)); FT (20) ergänzt diese Grundlage um UI-seitige Steuerung und klare Nutzungsmodelle.

## Fachliche Beschreibung

Jeder Benutzer besitzt genau eine Rolle. Diese Rolle definiert seinen funktionalen Handlungsspielraum im System.

Die Anwendung unterscheidet drei Rollen:

### 1. Admin

Der Admin besitzt systemweite Verantwortung.

Er darf:

- Benutzer verwalten und Rollen ändern
- Systemnahe Stammdaten verwalten
- Gesperrte Termine bearbeiten
- Alle Funktionen der Disposition nutzen

Der Admin ist die höchste Berechtigungsstufe. Es muss stets mindestens ein Admin im System existieren.

### 2. Disponent(in)

Der Disponent ist der operative Hauptnutzer der Anwendung.

Er darf:

- Projekte anlegen, bearbeiten und deaktivieren
- Termine anlegen, verschieben, bearbeiten und löschen
- Mitarbeiter zuweisen
- Touren und Teams verwalten
- Notizen und Anhänge verwalten
- Druckfunktionen nutzen

Der Disponent darf keine Benutzerrollen ändern und keine systemweiten Administrationsfunktionen ausführen.

### 3. Leser

Der Leser ist ein rein lesender Nutzer.

Er darf:

- Kalenderansichten anzeigen
- Projekt- und Kundendetails einsehen
- Eigene und fremde Termine einsehen
- Mitarbeiteransichten im Lesemodus öffnen
- Reports lesend aufrufen und erzeugen

Der Leser darf keine Daten verändern, anlegen oder löschen.

Die Oberfläche für Leser ist funktional reduziert und enthält keine aktiven Bearbeitungselemente. Das Journal bleibt für Leser verborgen. Monitoring bleibt weiterhin Disponenten und Admins vorbehalten.

## Grundprinzipien

1. Sicherheit wird serverseitig durchgesetzt.
2. UI-Sichtbarkeit ist eine Komfortfunktion, keine Sicherheitsmaßnahme.
3. Die fachliche Datenstruktur bleibt unverändert.
4. Es wird keine Rechte-Matrix eingeführt.
5. Rollen wirken ausschließlich auf Funktionsverfügbarkeit, nicht auf Datenmodellierung.

## Regeln & Randbedingungen

- Rollen ändern keine Datenmodelle.
- Rollen beeinflussen keine Aggregationslogik.
- Rollen beeinflussen keine Query-Struktur.
- Rollen verändern keine Termin-Lane-Logik.
- Navigation wird nicht umstrukturiert, sondern nur ergänzt oder konditional gerendert.
- Deep-Link-Aufrufe werden serverseitig validiert.
- Es darf keine clientseitige Autorisierungslogik ohne serverseitige Gegenprüfung existieren.
- Ein Leser sieht alle Termine, jedoch ausschließlich im Lesemodus.
- Reports sind für Leser serverseitig lesbar; globale Preset-Verwaltung und andere administrative Reportfunktionen bleiben eingeschränkt.
- Der Mitarbeiterbereich darf für Leser sichtbar sein, bleibt dort aber vollständig read-only.
- Das Journal bleibt für Leser unsichtbar und serverseitig gesperrt.
- Der letzte Admin darf nicht entfernt oder herabgestuft werden.

## Use Cases

- [UC 20/01: Unzulässige Aktion wird blockiert](use-cases/uc-20-01-unzulaessige-aktion-wird-blockiert.md)
- [UC 20/02: Rollenabhängige Navigation anzeigen](use-cases/uc-20-02-rollenabhaengige-navigation-anzeigen.md)
- [UC 20/03: Admin verwaltet Benutzerrollen](use-cases/uc-20-03-admin-verwaltet-benutzerrollen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
