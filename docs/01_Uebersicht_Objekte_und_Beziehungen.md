# Lastenheft – Übersicht (Objekte & Beziehungen)

Stand: Projektzentriertes Lastenheft nach FT (01)–FT (13) inkl. Entscheidung „Notizen als gemeinsames Domainobjekt für Projekt und Kunde“.

## Zentrale Domänenobjekte

### Projekt (zentral)
- Repräsentiert einen Auftrag/Vorgang (z. B. Aufbau, Service, Nachbesserung).
- Beziehungen:
  - genau **1 Kunde**
  - genau **1 Projektstatus**
  - **0..n Termine**
  - **0..n Notizen** (über Relation)
  - **0..n Anhänge**

### Kunde
- Kundenstammdaten, werden von Projekten referenziert.
- Kunden werden **nicht** physisch gelöscht, sondern können deaktiviert/archiviert werden.
- Beziehungen:
  - **0..n Projekte**
  - **0..n Notizen** (über Relation)

### Projektstatus
- Pflegbare Statusliste (DB-Tabelle).
- Default-Statuswerte sind geschützt (nicht löschbar).
- Projekte referenzieren genau einen Status.

### Termin
- Reine Planungseinheit (ganztägig) mit Startdatum und optional Enddatum.
- Beziehungen:
  - gehört immer zu genau **1 Projekt**
  - optionale **Tour**
  - **0..n Mitarbeiter**
- Notizen/Anhänge/Beschreibung gehören **nicht** zum Termin, sondern zum Projekt.

### Mitarbeiter
- Mitarbeiterstammdaten.
- Beziehungen:
  - **0..n Termine** (Zuweisung)
  - **0..n Abwesenheiten**

### Abwesenheit
- Zeitraumbezogen (Start/Ende) je Mitarbeiter.
- Typen: Urlaub, Krankheit.
- Wird prüfend in der Terminplanung verwendet (Warnung/Blockade je nach Regel).

### Tour
- Ordnungsobjekt zur visuellen Struktur (Farbe).
- Beziehungen:
  - **0..n Termine**
- Keine Routen-, Fahrzeug-, Personal- oder Zeitlogik.

### Team-Vorlage
- Reine Eingabehilfe: Bezeichnung + Liste aktiver Mitarbeiter.
- Wird beim Termin anwenden als Vorschlag genutzt; am Termin wird immer die konkrete Mitarbeiterliste gespeichert.
- Keine Historie, keine Rückwirkung.

### Note (gemeinsames Notizobjekt)
- Ein freier Notizeintrag (Text), ohne fachliche Wirkung.
- Wird über Relationstabellen Projekten und Kunden zugeordnet.

### Projekt-Anhang
- Datei/Attachment am Projekt (Auftrag + Auftragsbestätigung etc.).

### Externe Kalender / Datei-Fallback
- Read-only Fallback-Sichten:
  - pro Team ein externer Kalender
  - zusätzlich ein zentraler Planungskalender
  - Excel-Export als Momentaufnahme
- Synchronisationsstatus wird überwacht.

---

## Beziehungen (kompakt)

- **Customer 1 — n Project**
- **ProjectStatus 1 — n Project**
- **Project 1 — n Appointment (Termin)**
- **Tour 1 — n Appointment** (optional am Termin)
- **Appointment n — m Employee** (Terminzuweisung)
- **Employee 1 — n Absence**
- **TeamTemplate n — m Employee** (Vorlagen-Mitglieder)
- **Project 1 — n ProjectAttachment**
- **Project n — m Note** (über `project_note`)
- **Customer n — m Note** (über `customer_note`)

---

## Feature-zu-Objekt-Mapping (Kurz)

- **FT (13) Projektverwaltung**: Project, ProjectStatus, Customer-Referenz
- **FT (02) Projekt-Details**: Project.Description (Markdown), ProjectAttachment, Notizen (über Note + project_note)
- **FT (09) Kundenverwaltung**: Customer (inkl. Notizen über Note + customer_note)
- **FT (01) Kalendertermine**: Appointment, Appointment↔Employee, Appointment↔Tour (optional)
- **FT (04) Tourenplanung**: Tour, Tour→Termine anzeigen
- **FT (05) Mitarbeiterverwaltung**: Employee, Mitarbeiter-Termindarstellung (aus Relation)
- **FT (08) Abwesenheiten**: Absence, Prüfregeln bei Planung
- **FT (11) Team-Vorlagen**: TeamTemplate, TeamTemplate↔Employee
- **FT (03) Kalenderansichten**: reine Sichten auf Appointment (+ Filter Tour)
- **FT (12) Dispositionsübersichten**: Wochenbasierte Ableitungen aus Appointment↔Employee↔Tour
- **FT (10) Monitoring**: Ableitungen/Listen aus Appointment-Daten (informativ)
- **FT (06) Druck**: Ausgaben aus bestehenden Sichten (keine Datenänderung)
- **FT (07) Fallback**: Kalender-Anbindung, Sync-Status, Excel-Export
