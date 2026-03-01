# Alle Nicht funktionalen Anforderungen

# NFR (01): Multi-User-Konsistenz

## 1. Ziel

Das System muss parallele Nutzung durch mehrere Benutzer oder mehrere Browser-Sessions ermöglichen, ohne dass:

- Änderungen still überschrieben werden,
- fachliche Invarianten verletzt werden,
- inkonsistente Zustände entstehen,
- Race Conditions unbemerkt bleiben.

Das System garantiert deterministische Konsistenz bei parallelen Mutationen.

## 2. Geltungsbereich

Diese Anforderung gilt für:

- alle mutierenden REST-Endpoints (POST, PUT, PATCH, DELETE),
- alle versionierten Entitäten,
- alle Service-Operationen mit fachlichen Abhängigkeiten,
- alle Operationen mit zeitlicher Logik (Termine, Mitarbeiterzuweisung).

## 3. Technische Mindestanforderungen

### 3.1 Optimistic Locking (Pflicht)

Alle mutierbaren Kernentitäten müssen eine `version`-Spalte besitzen.

Updates dürfen nur erfolgen, wenn:

```
WHEREid= ?ANDversion= ?
```

Bei Versionsabweichung muss der Server deterministisch antworten mit:

```
HTTP409CONFLICT
code: VERSION_CONFLICT
```

### 3.2 Transaktionale Fachregelprüfung (Pflicht)

Fachregeln mit konkurrierenden Zuständen müssen innerhalb einer DB-Transaktion geprüft und angewendet werden.

Beispiele:

- Mitarbeiter darf keine Terminüberschneidung haben.
- Archivierte Projekte dürfen keine neuen Termine erhalten.
- Gesperrte Termine dürfen nicht verändert werden.

Operationen müssen atomar sein:

- vollständiger Commit
- oder vollständiger Rollback

### 3.3 Server als alleinige Wahrheit

Der Client darf:

- keine Fachregeln erzwingen,
- keine Konfliktentscheidungen treffen,
- keine Versionslogik lokal berechnen.

Der Server entscheidet immer auf Basis des aktuellen DB-Zustands.

### 3.4 Fehlerstandardisierung

Konflikte müssen maschinenlesbar sein:

- `VERSION_CONFLICT`
- `BUSINESS_RULE_CONFLICT`
- `LOCK_VIOLATION`
- `NOT_FOUND`
- `VALIDATION_ERROR`

# NFR (02): Datenintegrität und referenzielle Stabilität

## 1. Ziel

Das System muss sicherstellen, dass zu keinem Zeitpunkt fachlich inkonsistente oder referenziell ungültige Zustände entstehen.

Insbesondere darf es nicht möglich sein, durch API-Nutzung, parallele Requests, UI-Manipulation oder Fehlbedienung Zustände zu erzeugen, die:

- Entitäten ohne erforderliche Referenz enthalten,
- fachliche Invarianten verletzen,
- implizite Annahmen der Domäne unterlaufen,
- oder referenzielle Integrität umgehen.

Das System garantiert strukturelle Konsistenz unabhängig vom Client.

## 2. Geltungsbereich

Diese Anforderung gilt für:

- alle Kernentitäten (Customer, Project, Appointment, Employee, Status, Attachments, Settings),
- alle Many-to-Many-Relationen,
- alle Archivierungsprozesse,
- alle Lösch- und Deaktivierungsoperationen,
- alle neuen Entitäten in zukünftigen Features.

## 3. Entitäten Modell

### 3.1 Hauptentitäten

```
Customer (id, customer_number\*, first_name, last_name, company, phone, email, address, is_active, version)
Project (id, name, customer_id→Customer, description_md, is_active, version)
Appointment (id, project_id→Project, tour_id→Tour?, title, description, start_date, start_time?, end_date?, end_time?, version)
Employee (id, first_name, last_name, phone, email, is_active, team_id→Team?, tour_id→Tour?, version)
```

### 3.2 Stammdaten

```
ProjectStatus (id, title, description, color, sort_order, is_active, is_default, version)
Team (id, name, color, version)
Tour (id, name, description, color, version)
Role (id, code\*, name, description, is_system, version)
User (id, username\*, email\*, password_hash, first_name, last_name, role_id→Role, is_active, created_by→User?, version)
```

### 3.3 Many-to-Many Relationen

```
appointment_employee (appointment_id→Appointment, employee_id→Employee, version) [PK: beide]
project_project_status (project_id→Project, project_status_id→ProjectStatus, version) [PK: beide]
project_note (project_id→Project, note_id→Note, version) [PK: beide]
customer_note (customer_id→Customer, note_id→Note, version) [PK: beide]
```

### 3.4 Attachments

```
project_attachment (id, project_id→Project, filename, original_name, mime_type, file_size, storage_path, version)
customer_attachment (id, customer_id→Customer, filename, original_name, mime_type, file_size, storage_path, version)
employee_attachment (id, employee_id→Employee, filename, original_name, mime_type, file_size, storage_path, version)
```

### 3.5 Weitere Entitäten

```
Note (id, title, body, is_pinned, color, version)
NoteTemplate (id, title, body, sort_order, is_active, color, version)
HelpText (id, help_key\*, title, body, is_active, version)
UserSettingsValue (id, setting_key, scope_type, scope_id, value_json, updated_by→User?, version) [UK: key+scope_type+scope_id]
AuditLog (id, user_id→User, action, entity_type, entity_id, description, old_values, new_values, ip_address, created_at)
```

## 4. Fachregeln nach Entität

### 4.1 Customer (Kunde)

### Pflicht-Invarianten

- **FR-C-01:** Ein Kunde MUSS eine eindeutige Kundennummer haben (UNIQUE customer_number)
- **FR-C-02:** Ein Kunde MUSS Vorname, Nachname und Telefonnummer haben (NOT NULL)
- **FR-C-03:** Der full_name MUSS konsistent zu Vor- und Nachname sein
- **FR-C-04:** Ein Kunde KANN null, ein oder mehrere Projekte haben
- **FR-C-05:** Ein Kunde DARF NICHT gelöscht werden, wenn er aktive Projekte besitzt (RESTRICT)

### Archivierungsregeln

- **FR-C-06:** Statt physischer Löschung wird is_active = 0 gesetzt
- **FR-C-07:** Inaktive Kunden dürfen NICHT neuen Projekten zugeordnet werden
- **FR-C-08:** Bestehende Projektzuordnungen bleiben beim Archivieren erhalten

### Sichtbarkeitsregeln

- **FR-C-09:** Disponenten erhalten serverseitig NUR aktive Kunden (is_active = 1)
- **FR-C-10:** Admins können sowohl aktive als auch inaktive Kunden abrufen

### Attachment-Regeln

- **FR-C-11:** Alle Attachments eines Kunden werden beim Löschen des Kunden mit gelöscht (CASCADE)
- **FR-C-12:** Ein Attachment DARF NICHT ohne gültigen Customer existieren

### Notizen-Regeln

- **FR-C-13:** Customer-Note-Relationen werden beim Löschen der Note oder des Customers gelöscht (CASCADE)

### 4.2 Project (Projekt)

### **Pflicht-Invarianten**

- FR-P-01: Ein Projekt MUSS IMMER genau einen Kunden haben (NOT NULL customer_id)
- FR-P-02: Ein Projekt MUSS einen Namen haben (NOT NULL name)
- FR-P-03: Ein Projekt KANN null, einen oder mehrere Termine haben
- FR-P-04: Die Kunde-Projekt-Beziehung ist RESTRICT (Kunde darf nicht gelöscht werden, wenn Projekte existieren)

### **Löschregeln**

- FR-P-05: Ein Projekt DARF physisch gelöscht werden, wenn es KEINE Termine besitzt
- FR-P-06: Vor physischer Löschung MUSS geprüft werden, ob Termine existieren (RESTRICT)
- FR-P-07: Beim physischen Löschen werden alle zugehörigen Daten (Notizen, Anhänge, Status-Relationen) mit gelöscht (CASCADE)

### **Attachment-Regeln**

- FR-P-08: Alle Attachments eines Projekts werden beim Löschen des Projekts mit gelöscht (CASCADE)
- FR-P-09: Ein Projekt-Attachment DARF NICHT ohne gültiges Projekt existieren

### **Notizen-Regeln**

- FR-P-10: Project-Note-Relationen werden beim Löschen der Note oder des Projekts gelöscht (CASCADE)

### **Status-Regeln**

- FR-P-11: Ein Projekt KANN null, einen oder mehrere Status haben
- FR-P-12: Ein Projekt darf NICHT denselben Status mehrfach haben (PK Constraint)
- FR-P-13: Wenn ein ProjectStatus gelöscht werden soll, MUSS geprüft werden, ob Projekte diesen Status nutzen (RESTRICT)
- FR-P-14: Project-Status-Relationen werden beim Löschen des Projekts gelöscht (CASCADE)

### 4.3 Appointment (Termin)

### Pflicht-Invarianten

- **FR-A-01:** Ein Termin MUSS IMMER genau ein Projekt haben (NOT NULL project_id)
- **FR-A-02:** Ein Termin DARF NIEMALS ohne gültiges Projekt existieren
- **FR-A-03:** Ein Termin MUSS ein Startdatum haben (NOT NULL start_date)
- **FR-A-04:** Ein Termin MUSS einen Titel haben (NOT NULL title)

### Projekt-Beziehung

- **FR-A-05:** Wenn ein Projekt gelöscht wird, werden alle seine Termine mit gelöscht (CASCADE)

### Zeitliche Regeln

- **FR-A-06:** Wenn end_date gesetzt ist, MUSS end_date >= start_date sein
- **FR-A-07:** Wenn start_time gesetzt ist, gilt der Termin als Zeittermin (nicht Ganztag)
- **FR-A-08:** Wenn end_time gesetzt ist, MUSS auch end_date gesetzt sein
- **FR-A-09:** Bei gleichem Start- und Enddatum MUSS end_time > start_time sein (wenn beide gesetzt)
- **FR-A-10:** Vergangene Termine (start_date < heute) sind READ-ONLY
- **FR-A-11:** Ein Termin besitzt intern einen Startzeitpunkt und einen Endzeitpunkt
- **FR-A-12:** Wenn keine Uhrzeit (start_time) erfasst ist, gilt der Termin als Ganztagstermin
- **FR-A-13:** Wenn eine Startuhrzeit (start_time) erfasst ist, wird der Termin als Zeittermin behandelt
- **FR-A-14:** Wenn eine Startuhrzeit erfasst ist, leitet das System initial eine Standarddauer von einer Stunde ab (sofern end_time nicht gesetzt)

### Tour-Regeln

- **FR-A-15:** Ein Termin KANN optional eine Tour haben (tour_id nullable)
- **FR-A-16:** Wenn eine Tour gelöscht wird, bleibt der Termin bestehen mit tour_id = NULL (SET NULL)
- **FR-A-17:** Wenn einem Termin eine Tour zugewiesen wird, werden die Mitarbeiter der Tour übernommen
- **FR-A-18:** Beim Wechsel der Tour werden die Mitarbeiter der vorherigen Tour vom Termin entfernt und die Mitarbeiter der neuen Tour an den Termin angehängt
- **FR-A-19:** Beim Entfernen der Tour werden alle Mitarbeiter, die der Tour zugeordnet sind, vom Termin entfernt
- **FR-A-20:** Beim Wechsel oder Entfernen einer Tour MUSS geprüft werden, ob durch das Entfernen von Mitarbeitern Konflikte mit anderen Terminen entstehen (Überschneidungsprüfung für abgehängte Mitarbeiter)

### Mitarbeiter-Zuweisungsregeln

- **FR-A-21:** Ein Termin KANN null, einen oder mehrere Mitarbeiter haben
- **FR-A-22:** Ein Mitarbeiter DARF NICHT mehrfach am selben Termin sein (PK Constraint)
- **FR-A-23:** Ein Mitarbeiter DARF NICHT zeitlich überschneidenden Terminen zugewiesen sein (BLOCKING)
    - Prüfung: Für jeden zuzuweisenden Mitarbeiter prüfen, ob im Zeitraum [start_date, end_date OR start_date] bereits andere Termine existieren
    - Bei Überschneidung: HTTP 409 CONFLICT mit EMPLOYEE_OVERLAP_CONFLICT
- **FR-A-24:** Nur AKTIVE Mitarbeiter (is_active = 1) dürfen NEUEN oder ZUKÜNFTIGEN Terminen zugewiesen werden
- **FR-A-25:** Wenn ein Mitarbeiter gelöscht wird, werden alle seine Terminzuordnungen mit gelöscht (CASCADE)

### Team-Zuweisungsregeln

- **FR-A-26:** Teams sind reine Eingabehilfen, es wird IMMER die konkrete Mitarbeiterliste gespeichert
- **FR-A-27:** Beim Zuweisen eines Teams werden die Mitarbeiter des Teams einmalig als konkrete Mitarbeiter-Zuordnungen am Termin gespeichert
- **FR-A-28:** Änderungen an Teams wirken NICHT rückwirkend auf bestehende Termine

### Verschiebungsregeln

- **FR-A-29:** Beim Verschieben eines Termins (Drag & Drop) MUSS die Überschneidungsprüfung erneut durchgeführt werden
- **FR-A-30:** Terminverschiebung (Drag & Drop) erfolgt tageweise. Eine vorhandene Startuhrzeit (start_time) bleibt bei mausgesteuerten Verschiebungen unverändert

### 4.4 Employee (Mitarbeiter)

### Pflicht-Invarianten

- **FR-E-01:** Ein Mitarbeiter MUSS Vorname und Nachname haben (NOT NULL)
- **FR-E-02:** Der full_name MUSS konsistent zu Vor- und Nachname sein

### Team-Regeln

- **FR-E-03:** Ein Mitarbeiter KANN optional einem Team zugeordnet sein (team_id nullable)
- **FR-E-04:** Wenn ein Team gelöscht wird, bleiben die Mitarbeiter bestehen mit team_id = NULL (SET NULL)
- **FR-E-05:** Das Entfernen eines Mitarbeiters aus einem Team darf NICHT automatisch Terminzuweisungen ändern

### Tour-Regeln

- **FR-E-06:** Ein Mitarbeiter KANN optional einer Tour zugeordnet sein (tour_id nullable)
- **FR-E-07:** Wenn eine Tour gelöscht wird, bleiben die Mitarbeiter bestehen mit tour_id = NULL (SET NULL)
- **FR-E-08:** Das Entfernen eines Mitarbeiters aus einer Tour darf NICHT automatisch Terminzuweisungen ändern

### Terminbeziehung

- **FR-E-09:** Ein Mitarbeiter KANN null, einem oder mehreren Terminen zugewiesen sein
- **FR-E-10:** Wenn ein Mitarbeiter gelöscht wird, werden alle seine Terminzuordnungen mit gelöscht (CASCADE)

### Archivierungsregeln

- **FR-E-11:** Statt physischer Löschung wird is_active = 0 gesetzt
- **FR-E-12:** Inaktive Mitarbeiter dürfen NICHT neuen oder zukünftigen Terminen zugewiesen werden
- **FR-E-13:** Bestehende Terminzuordnungen bleiben beim Archivieren erhalten

### Sichtbarkeitsregeln

- **FR-E-14:** Disponenten erhalten serverseitig NUR aktive Mitarbeiter (is_active = 1)
- **FR-E-15:** Admins können sowohl aktive als auch inaktive Mitarbeiter abrufen

### Attachment-Regeln

- **FR-E-16:** Alle Attachments eines Mitarbeiters werden beim Löschen des Mitarbeiters mit gelöscht (CASCADE)

### 4.5 ProjectStatus

#### Pflicht-Invarianten

- **FR-PS-01:** Ein ProjectStatus MUSS einen Titel und eine Farbe haben (NOT NULL)
- **FR-PS-02:** Es KANN maximal einen Default-Status geben (`is_default = 1`)

#### Archivierungsregeln

- **FR-PS-03:** Statt physischer Löschung wird `is_active = 0` gesetzt
- **FR-PS-04:** Inaktive Status dürfen NICHT neuen Projekten zugewiesen werden
- **FR-PS-05:** Bestehende Projektzuordnungen bleiben beim Archivieren erhalten

#### Löschregeln

- **FR-PS-06:** Ein ProjectStatus DARF NICHT gelöscht werden, solange Projekte diesen Status nutzen (RESTRICT)
- **FR-PS-07:** Vor Löschung MUSS geprüft werden: `SELECT COUNT(\*) FROM project_project_status WHERE project_status_id = ?`

### 4.6 Team

#### Pflicht-Invarianten

- **FR-T-01:** Ein Team MUSS einen Namen und eine Farbe haben (NOT NULL)
- **FR-T-02:** Ein Team KANN null, einen oder mehrere Mitarbeiter haben

#### Löschregeln

- **FR-T-03:** Beim Löschen eines Teams bleiben die Mitarbeiter bestehen (SET NULL auf `[employee.team](http://employee.team)_id`)
- **FR-T-04:** Das Löschen eines Teams darf NICHT automatisch Terminzuweisungen ändern
- **FR-T-05:** Teams dienen nur der Organisation, nicht der dauerhaften Verknüpfung

### 4.7 Tour

#### Pflicht-Invarianten

- **FR-TO-01:** Eine Tour MUSS einen Namen und eine Farbe haben (NOT NULL)
- **FR-TO-02:** Eine Tour KANN null, einen oder mehrere Mitarbeiter haben
- **FR-TO-03:** Eine Tour KANN null, einen oder mehrere Termine haben

#### Löschregeln

- **FR-TO-04:** Beim Löschen einer Tour bleiben die Mitarbeiter bestehen (SET NULL auf `employee.tour_id`)
- **FR-TO-05:** Beim Löschen einer Tour bleiben die Termine bestehen (SET NULL auf `appointment.tour_id`)
- **FR-TO-06:** Das Löschen einer Tour darf NICHT automatisch Terminzuweisungen der Mitarbeiter ändern
- **FR-TO-07:** Touren dienen der visuellen Organisation und Mitarbeitervorlage, nicht der Datenbindung

### 4.8 User & Role

#### Pflicht-Invarianten

- **FR-U-01:** Ein User MUSS einen eindeutigen Username und eine eindeutige Email haben (UNIQUE)
- **FR-U-02:** Ein User MUSS einer Rolle zugeordnet sein (NOT NULL `role_id`)
- **FR-U-03:** Ein User MUSS Vor- und Nachname haben (NOT NULL)
- **FR-U-04:** Der `full_name` MUSS konsistent zu Vor- und Nachname sein

#### Rollen-Regeln

- **FR-U-05:** Es MUSS mindestens ein aktiver Admin existieren
- **FR-U-06:** Der letzte Admin DARF NICHT gelöscht oder deaktiviert werden (BLOCKING)
- **FR-U-07:** Der letzte Admin DARF NICHT auf eine andere Rolle geändert werden (BLOCKING)
- **FR-U-08:** Eine Rolle DARF NICHT gelöscht werden, solange User dieser Rolle zugeordnet sind (RESTRICT)
- **FR-U-09:** System-Rollen (`is_system = 1`) DÜRFEN NICHT gelöscht werden

#### Archivierungsregeln

- **FR-U-10:** Statt physischer Löschung wird `is_active = 0` gesetzt
- **FR-U-11:** Inaktive User können sich nicht mehr anmelden

#### Self-Reference

- **FR-U-12:** Ein User KANN optional einen `created_by` User haben (Self-FK)
- **FR-U-13:** Wenn der `created_by` User gelöscht wird, bleibt der User bestehen mit `created_by = NULL` (SET NULL)

### 4.9 Note & NoteTemplate

#### Pflicht-Invarianten

- **FR-N-01:** Eine Note MUSS einen Titel und Body haben (NOT NULL)
- **FR-N-02:** Ein NoteTemplate MUSS einen Titel und Body haben (NOT NULL)

#### Löschregeln

- **FR-N-03:** Beim Löschen einer Note werden alle Relationen (zu Projects und Customers) mit gelöscht (CASCADE)
- **FR-N-04:** NoteTemplates sind eigenständig und haben keine Relationen

#### Archivierungsregeln

- **FR-NT-01:** Statt physischer Löschung von NoteTemplates wird `is_active = 0` gesetzt

### 4.10 Attachments

#### Gemeinsame Regeln

- **FR-AT-01:** Jedes Attachment MUSS genau einem Parent-Objekt zugeordnet sein (NOT NULL Foreign Key)
- **FR-AT-02:** Ein Attachment DARF NIEMALS ohne gültiges Parent-Objekt existieren
- **FR-AT-03:** Beim Löschen des Parent-Objekts werden alle Attachments mit gelöscht (CASCADE)
- **FR-AT-04:** Attachments MÜSSEN filename, original_name, mime_type, file_size und storage_path haben (NOT NULL)

#### Spezifische Regeln

- **FR-AT-05:** `project_attachment.project_id` → CASCADE bei Project-Löschung
- **FR-AT-06:** `customer_attachment.customer_id` → CASCADE bei Customer-Löschung
- **FR-AT-07:** `employee_attachment.employee_id` → CASCADE bei Employee-Löschung

### 4.11 UserSettingsValue

#### Pflicht-Invarianten

- **FR-USV-01:** Ein Setting MUSS `setting_key`, `scope_type`, `scope_id` und `value_json` haben (NOT NULL)
- **FR-USV-02:** Die Kombination `(setting_key, scope_type, scope_id)` MUSS eindeutig sein (UNIQUE KEY)
- **FR-USV-03:** Settings können optional einen `updated_by` User haben (nullable FK)

### 4.12 AuditLog

#### Pflicht-Invarianten

- **FR-AL-01:** Ein AuditLog-Eintrag MUSS einen User haben (NOT NULL `user_id`)
- **FR-AL-02:** Ein AuditLog-Eintrag MUSS Action, Entity_Type und Timestamp haben (NOT NULL)
- **FR-AL-03:** AuditLog darf NIEMALS gelöscht werden (READ-ONLY nach Creation)
- **FR-AL-04:** User dürfen NICHT gelöscht werden, wenn AuditLog-Einträge existieren (RESTRICT)

### 4.13 HelpText

#### Pflicht-Invarianten

- **FR-HT-01:** Ein HelpText MUSS einen eindeutigen `help_key` haben (UNIQUE)
- **FR-HT-02:** Ein HelpText MUSS Title und Body haben (NOT NULL)

#### Archivierungsregeln

- **FR-HT-03:** Statt physischer Löschung wird `is_active = 0` gesetzt

## 5. Transaktionale Fachregeln (Cross-Entity)

Diese Prüfungen MÜSSEN innerhalb von Service-Transaktionen erfolgen, bevor Mutationen committed werden.

### 5.1 Mitarbeiter-Terminüberschneidungen

**FR-TRANS-01: Überschneidende Termine**

Vor Zuweisung eines Mitarbeiters zu einem Termin:

1. Bestimme den Zeitraum des Ziel-Termins: [start_date, end_date OR start_date]
2. Prüfe, ob der Mitarbeiter in diesem Zeitraum bereits anderen Terminen zugewiesen ist
3. Falls JA → HTTP 409 CONFLICT mit Code: EMPLOYEE_OVERLAP_CONFLICT

Zusätzlich: Diese Prüfung MUSS auch bei Terminverschiebung (Drag & Drop) und bei Tour-Zuweisung erfolgen.

### 5.2 Inaktive Entitäten

**FR-TRANS-02: Inaktiver Kunde zu neuem Projekt**

Vor Anlegen eines neuen Projekts mit customer_id:

Prüfe is_active des Kunden.
Falls is_active = 0 → HTTP 409 CONFLICT mit Code: INACTIVE_ENTITY_ASSIGNMENT

**FR-TRANS-03: Inaktiver Mitarbeiter zu neuem Termin**

Vor Zuweisung eines Mitarbeiters zu einem neuen oder zukünftigen Termin:

Prüfe is_active des Mitarbeiters.
Falls is_active = 0 → HTTP 409 CONFLICT mit Code: INACTIVE_ENTITY_ASSIGNMENT

**FR-TRANS-04: Inaktiver Status zu neuem Projekt**

Vor Zuweisung eines ProjectStatus zu einem Projekt:

Prüfe is_active des Status.
Falls is_active = 0 → HTTP 409 CONFLICT mit Code: INACTIVE_ENTITY_ASSIGNMENT

### 5.3 Projektstatus-Abhängigkeit

**FR-TRANS-05: ProjectStatus mit Projekten**

Vor Löschung eines ProjectStatus:

Prüfe, ob Projekte diesen Status verwenden (project_project_status).
Falls COUNT > 0 → HTTP 409 CONFLICT mit Code: DEPENDENCY_EXISTS

### 5.4 Admin-Schutz

**FR-TRANS-06: Letzter Admin**

Vor Deaktivierung oder Rollenänderung eines Users mit role_id = 'ADMIN':

Prüfe, ob mindestens ein weiterer aktiver Admin existiert.
Falls COUNT = 0 → HTTP 409 CONFLICT mit Code: LAST_ADMIN_PROTECTION

### 5.5 Kunde-Projekt-Abhängigkeit

**FR-TRANS-07: Kunde mit Projekten**

Vor Löschung eines Customers:

Prüfe, ob Projekte mit diesem customer_id existieren.
Falls COUNT > 0 → HTTP 409 CONFLICT mit Code: DEPENDENCY_EXISTS

Alternativ: Archivierung statt Löschung verwenden

### 5.6 Projekt-Termin-Abhängigkeit

**FR-TRANS-08: Projekt mit Terminen**

Vor Löschung eines Projekts:

Prüfe, ob Termine mit diesem project_id existieren.
Falls COUNT > 0 → HTTP 409 CONFLICT mit Code: DEPENDENCY_EXISTS

## **6. Technische Mindestanforderungen**

### 6.1 Harte Domänen-Invarianten (Pflicht)

Folgende Invarianten MÜSSEN serverseitig durchgesetzt werden:

- **Ein Termin darf niemals ohne gültiges Projekt existieren** (FR-A-01, FR-A-02)
- **Ein Attachment darf niemals ohne gültiges Parent-Objekt existieren** (FR-AT-01, FR-AT-02)
- **Ein Projektstatus darf nicht gelöscht werden, solange Referenzen bestehen** (FR-PS-06, FR-PS-07)
- **Ein Projekt darf nicht gelöscht werden, solange Termine existieren** (FR-P-06, FR-TRANS-08)
- **Mitarbeiter dürfen keine zeitlich überschneidenden Termine haben** (FR-A-23, FR-TRANS-01)
- **Beim Wechseln oder Entfernen einer Tour muss Überschneidungsprüfung für abgehängte Mitarbeiter erfolgen** (FR-A-20)
- **Many-to-Many-Relationen dürfen keine Duplikate enthalten** (PK Constraints)
- **Es muss mindestens ein aktiver Admin existieren** (FR-U-05, FR-U-06, FR-U-07, FR-TRANS-06)
- **Nur aktive Mitarbeiter dürfen neuen Terminen zugewiesen werden** (FR-A-24)
- **Nur aktive Kunden dürfen neuen Projekten zugeordnet werden** (FR-C-07)
- **Nur aktive Projektstatus dürfen neuen Projekten zugewiesen werden** (FR-PS-04)

Diese Regeln dürfen NICHT ausschließlich im Frontend validiert werden.

### 6.2 Referentielle Integrität auf Datenbankebene (Pflicht)

Für alle abhängigen Entitäten gelten:

### CASCADE Regeln (Parent löschen → Children löschen):

- project.id → appointments.project_id (FR-A-05)
- project.id → project_attachment.project_id (FR-P-08)
- customer.id → customer_attachment.customer_id (FR-C-11)
- employee.id → employee_attachment.employee_id (FR-E-16)
- appointment.id → appointment_employee.appointment_id (FR-A-25)
- employee.id → appointment_employee.employee_id (FR-E-10)
- project.id → project_project_status.project_id (FR-P-14)
- project.id → project_note.project_id (FR-P-10)
- customer.id → customer_note.customer_id (FR-C-13)
- note.id → project_note.note_id (FR-N-03)
- note.id → customer_note.note_id (FR-N-03)

### RESTRICT Regeln (Löschung nur ohne Referenzen):

- customer.id ← project.customer_id (FR-C-05, FR-TRANS-07)
- project.id ← appointment.project_id (FR-P-06, FR-TRANS-08)
- project_status.id ← project_project_status.project_status_id (FR-PS-06, FR-TRANS-05)
- role.id ← users.role_id (FR-U-08)
- users.id ← audit_log.user_id (FR-AL-04)

### SET NULL Regeln (Referenz wird NULL, Entity bleibt):

- tour.id ← appointment.tour_id (FR-A-16, FR-TO-05)
- tour.id ← employee.tour_id (FR-E-07, FR-TO-04)
- team.id ← employee.team_id (FR-E-04, FR-T-03)
- users.id ← users.created_by (FR-U-13)
- users.id ← user_settings_value.updated_by

Datenbankseitige Integrität darf NICHT durch Service-Workarounds ersetzt werden.

## 6.3 Archivierung statt physischer Löschung

Kernentitäten werden archiviert, nicht gelöscht:

- **Customer** → is_active = 0 (FR-C-06, FR-C-07)
- **Employee** → is_active = 0 (FR-E-11, FR-E-12, FR-E-13)
- **ProjectStatus** → is_active = 0 (FR-PS-03, FR-PS-04)
- **NoteTemplate** → is_active = 0 (FR-NT-01)
- **HelpText** → is_active = 0 (FR-HT-03)
- **User** → is_active = 0 (FR-U-10, FR-U-11)

Physische Löschung ist nur zulässig, wenn:

- keine abhängigen Datensätze existieren,
- keine Historienverletzung entsteht,
- und die Operation fachlich explizit erlaubt ist.

**Hinweis:** Projekte werden physisch gelöscht (nicht archiviert), wenn sie keine Termine besitzen (FR-P-05, FR-P-06, FR-P-07).

## 6.4 Sichtbarkeit nach Rolle

Disponenten erhalten serverseitig nur aktive Entitäten:

- **Kunden:** Nur is_active = 1 (FR-C-09)
- **Mitarbeiter:** Nur is_active = 1 (FR-E-14)
- **Projektstatus:** Nur is_active = 1 für Auswahllisten (FR-PS-04)

Admins können sowohl aktive als auch inaktive Entitäten abrufen:

- **Kunden:** Alle (FR-C-10)
- **Mitarbeiter:** Alle (FR-E-15)
- **Projektstatus:** Alle in Stammdatenverwaltung

## 6.5 Keine impliziten Seiteneffekte

Operationen dürfen keine verdeckten Nebenwirkungen erzeugen:

- Entfernen eines Mitarbeiters aus einer Tour darf KEINE Terminzuweisung löschen (FR-E-08, FR-TO-06)
- Löschen eines Teams darf KEINE Mitarbeiter löschen (FR-T-03)
- Entfernen eines Status darf NICHT automatisch andere Status verändern
- Ändern von Team-Mitgliedern wirkt NICHT rückwirkend auf Termine (FR-A-28)
- Tour-Zuweisungen an Termine sind Snapshots, keine Live-Referenzen (FR-A-26, FR-A-27)

## 6.6 Service als Invarianten-Grenze

Alle referenziellen Prüfungen MÜSSEN:

- im Service stattfinden,
- innerhalb einer Transaktion erfolgen, wenn mehrere Entitäten betroffen sind,
- deterministisch mit klarer Fehlermeldung abbrechen,
- parallel zu Datenbankconstraints implementiert werden (Defense in Depth),
- die Datenbankconstraints NICHT umgehen.

## 6.7 Optimistic Locking für alle Mutationen

Alle mutierbaren Kernentitäten besitzen eine version-Spalte:

Customer, Project, Appointment, Employee, ProjectStatus, Team, Tour, Role, User, Note, NoteTemplate, HelpText, UserSettingsValue, appointment_employee, project_project_status, project_note, customer_note, project_attachment, customer_attachment, employee_attachment

Updates MÜSSEN prüfen:

UPDATE entity SET ..., version = version + 1
WHERE id = ? AND version = ?

Bei Versionskonflikt:

HTTP 409 CONFLICT
code: VERSION_CONFLICT

## 7. Fehlerstandardisierung

Verstöße gegen NFR-02 MÜSSEN maschinenlesbar sein:

## Allgemeine Fehler

- `VERSION_CONFLICT` – Optimistic Locking Konflikt (NFR-01)
- `REFERENTIAL_INTEGRITY_VIOLATION` – FK Constraint verletzt
- `DEPENDENCY_EXISTS` – Löschung blockiert durch Referenzen
- `INVALID_RELATION_STATE` – Ungültiger Beziehungsstatus
- `VALIDATION_ERROR` – Eingabevalidierung fehlgeschlagen
- `NOT_FOUND` – Entität existiert nicht

## Spezifische Fachfehler

- `EMPLOYEE_OVERLAP_CONFLICT` – Mitarbeiter-Terminüberschneidung (FR-A-23, FR-TRANS-01)
- `INACTIVE_ENTITY_ASSIGNMENT` – Versuch, inaktive Entität zuzuweisen (FR-A-24, FR-C-07, FR-PS-04)
- `LAST_ADMIN_PROTECTION` – Letzter Admin darf nicht entfernt werden (FR-U-06, FR-TRANS-06)
- `PAST_APPOINTMENT_READONLY` – Vergangener Termin nicht änderbar (FR-A-10)

Freitextfehler sind unzulässig.