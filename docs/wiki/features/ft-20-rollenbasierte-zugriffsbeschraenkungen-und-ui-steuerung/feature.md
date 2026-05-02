# FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/f29fe0b8f4a443f982ef140a3983e737
- Importquelle lokal: `C:/Users/schro/Desktop/FT (20) Rollenbasierte Zugriffsbeschränkungen und  f29fe0b8f4a443f982ef140a3983e737.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature definiert die fachliche Bedeutung der Rollen **Admin**, **Disponent(in)** und **Monteur** innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfügbar sind.

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

### 3. Monteur

Der Monteur ist ein rein lesender Nutzer.

Er darf:

- Kalenderansichten anzeigen
- Projekt- und Kundendetails einsehen
- Eigene und fremde Termine einsehen
- Dispositionsübersichten lesen

Der Monteur darf keine Daten verändern, anlegen oder löschen.

Die Oberfläche für Monteure ist funktional reduziert und enthält keine aktiven Bearbeitungselemente.

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
- Ein Monteur sieht alle Termine, jedoch ausschließlich im Lesemodus.
- Der letzte Admin darf nicht entfernt oder herabgestuft werden.

## Use Cases

- [UC 20/01: Unzulässige Aktion wird blockiert](use-cases/uc-20-01-unzulaessige-aktion-wird-blockiert.md)
- [UC 20/02: Rollenabhängige Navigation anzeigen](use-cases/uc-20-02-rollenabhaengige-navigation-anzeigen.md)
- [UC 20/03: Admin verwaltet Benutzerrollen](use-cases/uc-20-03-admin-verwaltet-benutzerrollen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
