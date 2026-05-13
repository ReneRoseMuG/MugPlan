# FT (01): Kalendertermine

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermöglicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu ändern, zu verschieben, zuzuweisen und zu überwachen**, immer mit fachlichem Kundenkontext. Dieser Kundenkontext kann direkt über einen Kunden oder indirekt über ein Projekt entstehen.

FT (01) ist die **fachliche Quelle der Wahrheit für alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, überwachen oder ausgeben, leiten ihre Informationen **ausschließlich** aus den hier verwalteten Terminen ab.

Die Mitarbeiterzuweisung an Termine unterliegt der Überschneidungsprüfung, die sicherstellt, dass kein Mitarbeiter im selben Zeitraum mehreren Terminen zugewiesen ist.

## Fachliche Beschreibung

Ein Termin ist eine zeitliche Planungseinheit mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin ist einem Kunden direkt zugeordnet. Ein Termin kann optional einem Projekt zugeordnet sein. Wenn ein Termin einem Projekt zugeordnet ist, muss der Kundenwert des Termins identisch mit dem Kundenwert des Projekts sein – dies ist eine Konsistenzregel ohne Ausnahme. Die Kunde-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung; das Projekt ist eine optionale Spezialisierung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen durch Zuweisung von Mitarbeitern über ein Team oder individuell. Gespeichert wird am Termin stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte geführt, damit spätere Anforderungen an „echte Uhrzeiten“ ohne erneute Modellmigration möglich sind. In der UI bleiben Uhrzeiten zunächst optional, weil der aktuelle Arbeitsmodus weiterhin primär tagesbasiert ist.

Ein Termin kann optional Notizen enthalten. Notizen sind freie Texteinträge (Titel und Inhalt), die direkt am Termin hängen und für die Dokumentation von Besonderheiten, Absprachen oder Hinweisen dienen. Notizen bleiben bei Terminen bestehen, unabhängig davon, ob der Termin bearbeitet, das Projekt gewechselt, die Tour verändert oder Mitarbeiter zugewiesen oder entfernt werden. Notizen können unabhängig vom Termin gelöscht werden.

Ein Termin kann storniert werden, solange er nicht in der Vergangenheit liegt — **außer durch einen Administrator, der auch historische Termine stornieren darf.** Der Storno-Workflow ist ein expliziter, nicht umkehrbarer Vorgang: Er zieht alle zugeordneten Mitarbeiter vom Termin ab, setzt den Auftragswert des zugeordneten Projekts auf 0 und markiert den Termin mit dem Tag „Storniert“. Damit wird der Termin dauerhaft gesperrt und verhält sich wie ein historischer Termin: read-only, nicht editierbar, nicht löschbar, nicht verschiebbar. Ein stornierter Termin bleibt in allen Sichten sichtbar, geht aber nicht in Umsatzkalkulationen und Reports ein, die auf dem Auftragswert basieren.

Ein Termin kann:

- unabhängig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- über Teams mit Mitarbeitern belegt werden,
- Mitarbeiter können nur einmal im Termin existieren, keine Dupletten durch Team-Zuweisung,
- Mitarbeiter dürfen nur zugewiesen werden, wenn sich dadurch keine Überschneidungen mit anderen Terminen des Mitarbeiters ergeben.
- in verschiedenen Kalender- und Übersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine können auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschließender Projektzuweisung.

Unabhängig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gültig, wenn ihm ein Projekt oder ein Kunde zugeordnet ist.**

## Benutzerführung über Dialoge und Meldungen

Terminbezogene Speicherentscheidungen laufen über den Termin-Speichern-Review. Dieser Review bündelt Entscheidungen, die fachlich zum Speichern eines Termins gehören, und ersetzt einzelne Alert-Dialoge, sofern die Entscheidung logisch bis zum Speichern warten kann.

Der Termin-Speichern-Review kann insbesondere folgende Schritte enthalten:

- Speichern ohne Mitarbeiter: Wenn einem Termin keine Mitarbeiter zugeordnet sind, verlangt das System eine bewusste Bestätigung.
- Ressourcen- oder Wochenplanprüfung: Wenn eine Tour- oder Wochenplanänderung save-relevante Mitarbeiterfolgen hat, werden Vorschau, Konflikte und resultierende Mitarbeiterliste im Review behandelt.
- Terminnotizen prüfen: Wenn Startdatum, Enddatum oder Startzeit eines bestehenden Termins geändert werden und der Termin eigene Terminnotizen besitzt, verlangt das System eine bewusste Bestätigung, dass diese Notizen geprüft wurden.

Terminnotizen werden durch eine Terminverschiebung nicht automatisch geändert oder gelöscht. Der Review weist nur darauf hin, dass datum- oder uhrzeitbezogene Inhalte in den Notizen fachlich veraltet sein könnten.

Sofortaktionen bleiben möglich, wenn der Akteur direkt eine fachliche Reaktion erwartet. Dazu gehören insbesondere direkte Touränderungen mit unmittelbarer Wochenplanvorschau und der Reklamationsbutton im Terminformular.

## Regeln & Randbedingungen

**Abgrenzung zu Kalendermarkern**

Kalendermarker aus FT (34) sind keine Termine. Feiertage, Betriebsfeiertage und Betriebsferien erzeugen keine Terminobjekte, keine Kunden- oder Projektzuordnung, keine Mitarbeiterzuweisung, keine Überschneidungsprüfung und keine Reportwirkung.

**Grundlegende Terminregeln**

- Ein Termin ist immer einem Kunden direkt zugeordnet (customer_id, NOT NULL).
- Ein Termin ist optional einem Projekt zugeordnet (project_id, NULLABLE).
- Wenn ein Termin einem Projekt zugeordnet ist, muss gelten: appointment.customer_id == project.customer_id. Dies ist eine Invariante ohne Ausnahme.
- Ein Termin ohne Kundenzuordnung ist nicht zulässig.
- Termine enthalten keine eigenen Kunden- oder Projektdatenkopien.
- Kunden- und Projektinformationen werden stets referenziert, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- Mehrtägige Termine gelten für **alle Tage ihres Zeitraums**.
- Vergangene Termine sind für **Disponenten read-only** und dürfen von ihnen nicht verändert werden.
- **Administratoren dürfen historische Termine unbegrenzt bearbeiten**, verschieben, löschen, stornieren sowie Tags setzen und entfernen. Diese Ausnahme gilt für alle Schreiboperationen auf Terminen.
- Das `isLocked`-Flag im API-Response spiegelt diese Rollenlogik wider: Es ist `true` für Disponenten bei historischen Terminen, `false` für Administratoren.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird ein Termin auf ein neues Datum verschoben, prüft das System die Verfügbarkeit aller bestehenden Mitarbeiter des Termins über alle Tage des neuen Zeitraums. Sind Mitarbeiter nicht verfügbar, zeigt das System eine Meldung mit den betroffenen Mitarbeitern. Nach expliziter Bestätigung durch den Disponenten werden diese Mitarbeiter vom Termin entfernt. Ohne Bestätigung wird der Termin nicht gespeichert.

**Mitarbeiterzuweisung**

- Einem Termin können **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich überschneidend** mehreren Terminen zugewiesen sein. Das gilt bei Mehrtagesterminen für die gesamte Termindauern
    
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelösten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Das Zuweisen oder Wechseln einer Tour an einem Termin löst eine Prüfung aus, ob für die Kalenderwoche des Terminstartdatums in der (neuen) Tour eine Wochenplanung (tour_week_employees) hinterlegt ist. Wenn ja, wird dem Disponenten sofort ein Vorschau-Dialog angezeigt: welche Mitarbeiter hinzugefügt würden, welche Konflikte bestehen (Typ-2: Termin-Überschneidung), welche Mitarbeiter wegen manueller oder Team-Zuweisung unverändert bleiben. Erst nach expliziter Bestätigung werden die ausgewählten Mitarbeiter in die Mitarbeiterliste des Termins übernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverändert. Ist keine Wochenplanung hinterlegt, ändert sich die Mitarbeiterliste nicht.
- Das Entfernen einer Tour am Termin hat keine Auswirkungen auf die Mitarbeiterliste des Termins.
- Mitarbeiter, die manuell oder über ein Team dem Termin zugewiesen wurden, werden durch Tour-Änderungen nicht automatisch entfernt. Sie erscheinen im Vorschau-Dialog als „bleibt unverändert“ mit Angabe des Herkunftsgrunds.
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung im Kalender.

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Der Termin übernimmt die Mitarbeiter des Teams

**Notizen an Terminen**

- Ein Termin kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Termin; Änderungen am Termin (Datum, Projekt, Tour, Mitarbeiter) wirken sich nicht auf die Notizen aus.
- Werden Startdatum, Enddatum oder Startzeit eines Termins geändert und besitzt der Termin eigene Terminnotizen, fordert der Termin-Speichern-Review eine bewusste Prüfung dieser Notizen.
- Notizen werden nicht automatisch gelöscht, wenn ein Termin bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder der gesamte Termin gelöscht wird.
- Eine Reklamationsnotiz kann beim Setzen des Systemzustands **Reklamation** vorgeschlagen werden. Beim Aufheben der Reklamation entscheidet der Akteur ausdrücklich, ob eine vorhandene Reklamationsnotiz entfernt oder behalten wird.
- Wenn ein Termin gelöscht wird, werden auch seine zugeordneten Notizen entfernt.

**Storno-Regeln**

- Storno ist für **Disponenten** nur für aktuelle und zukünftige Termine zulässig. Historische Termine (Startdatum in der Vergangenheit) können von Disponenten nicht storniert werden.
- **Administratoren dürfen auch historische Termine stornieren.**
- Ein stornierter Termin kann nicht erneut storniert werden.
- Der Storno-Workflow ist atomar: Mitarbeiterabzug, Setzen des Auftragswerts auf 0 am Projekt und Setzen des Tags „Storniert“ erfolgen in einer einzigen, nicht teilbaren Operation. Entweder alle Schritte werden ausgeführt oder keiner.
- Nach dem Storno ist der Termin dauerhaft gesperrt (read-only). Er kann weder bearbeitet noch gelöscht noch verschoben noch reaktiviert werden.
- Ein stornierter Termin ist in allen Sichten weiterhin sichtbar, jedoch optisch als storniert gekennzeichnet.
- Der Auftragswert des zugeordneten Projekts wird auf 0 gesetzt, damit stornierte Termine nicht in Umsatzkalkulationen und Reports eingehen.
- Hat der Termin kein Projekt (project_id = NULL), entfällt der Schritt „Auftragswert auf 0“; die übrigen Schritte bleiben unverändert.
- Die freigegebenen Mitarbeiter sind nach dem Storno für andere Termine im selben Zeitraum wieder verfügbar (Überschneidungsprüfung greift neu).

## Use Cases

- [UC 01/01: Termin anlegen](use-cases/uc-01-01-termin-anlegen.md)
- [UC 01/02: Termin bearbeiten](use-cases/uc-01-02-termin-bearbeiten.md)
- [UC 01/03: Termin verschieben](use-cases/uc-01-03-termin-verschieben.md)
- [UC 01/04: Termin löschen](use-cases/uc-01-04-termin-loeschen.md)
- [UC 01/05: Tour einem Termin zuweisen](use-cases/uc-01-05-tour-einem-termin-zuweisen.md)
- [UC 01/06: Tourzuweisung eines Termins entfernen](use-cases/uc-01-06-tourzuweisung-eines-termins-entfernen.md)
- [UC 01/07: Mitarbeiter über Team zuweisen](use-cases/uc-01-07-mitarbeiter-ueber-team-zuweisen.md)
- [UC 01/08: Mitarbeiter einem Termin zuweisen](use-cases/uc-01-08-mitarbeiter-einem-termin-zuweisen.md)
- [UC 01/09: Mitarbeiter von einem Termin entfernen](use-cases/uc-01-09-mitarbeiter-von-einem-termin-entfernen.md)
- [UC 01/10: Termin in abhängigen Sichten anzeigen (Quersicht-Vertrag)](use-cases/uc-01-10-termin-in-abhaengigen-sichten-anzeigen-quersicht-vertrag.md)
- [UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)](use-cases/uc-01-11-denormalisierte-terminanzeige-aktualisieren-quersicht-vertrag.md)
- [UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)](use-cases/uc-01-12-termin-anzeigen-und-filtern-kalender-listenprojektion.md)
- [UC 01/13: Termin-Farbdarstellung ableiten](use-cases/uc-01-13-termin-farbdarstellung-ableiten.md)
- [UC 01/14: Historische Termine — Rollenbasiertes Verhalten](use-cases/uc-01-14-historische-termine-rollenbasiertes-verhalten.md)
- [UC 01/15: Konsistenz bei parallelen Änderungen (Optimistic Locking)](use-cases/uc-01-15-konsistenz-bei-parallelen-aenderungen-optimistic-locking.md)
- [UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung](use-cases/uc-01-16-termin-join-konsistenz-und-duplikatvermeidung.md)
- [UC 01/17: Notiz an Termin anlegen](use-cases/uc-01-17-notiz-an-termin-anlegen.md)
- [UC 01/18: Notiz am Termin bearbeiten](use-cases/uc-01-18-notiz-am-termin-bearbeiten.md)
- [UC 01/19: Notiz von Termin entfernen](use-cases/uc-01-19-notiz-von-termin-entfernen.md)
- [UC 01/20: Notizen beim Termin-Löschen entfernen](use-cases/uc-01-20-notizen-beim-termin-loeschen-entfernen.md)
- [UC 01/21: Termin anlegen – Nur mit Kunde, ohne Projekt](use-cases/uc-01-21-termin-anlegen-nur-mit-kunde-ohne-projekt.md)
- [UC 01/22: Termin stornieren](use-cases/uc-01-22-termin-stornieren.md)

## Backlogs

- [BL (09): Termintypen / Terminkategorisierung](backlog/ft-01-kalendertermine-backlog.md)

## Architektur & Kontext

### Betroffene Schema-Objekte

**Primäre Tabelle**

- `appointments` — Zentrale Terminentität; enthält Zeitraum, FK auf Kunde, optional Projekt und Tour

**Beteiligte Join-Tabellen**

- `appointment_employee` — Many-to-Many Termin ↔ Mitarbeiter (PK: appointment_id + employee_id, cascade on delete)
- `appointment_note` — Many-to-Many Termin ↔ Notiz (PK: appointment_id + note_id, cascade)
- `appointment_tags` — Many-to-Many Termin ↔ Tag (PK: appointment_id + tag_id, cascade)
- `appointment_attachment` — Anhänge am Termin (cascade on delete)

**Kritische Felder**

| Feld | Typ | Nullable | Bedeutung |
| --- | --- | --- | --- |
| `customer_id` | bigint FK | NOT NULL | Pflicht; onDelete restrict — Kunde kann nicht gelöscht werden, solange Termine existieren |
| `project_id` | bigint FK | NULLABLE | Optional; onDelete set null — Projekt löschen entkoppelt den Termin, löscht ihn nicht |
| `tour_id` | int FK | NULLABLE | Optional; onDelete restrict |
| `start_date` | date | NOT NULL | Pflichtfeld; Basis der historischen Schreibsperre |
| `start_time` | time | NULLABLE | Optional; wenn gesetzt → Zeittermin |
| `end_date` | date | NULLABLE | Optional; wenn gesetzt → Mehrtagestermin |
| `version` | int | NOT NULL default 1 | Optimistic Locking |
| `display_mode` | varchar | NOT NULL | Steuert Kalenderdarstellung |
| `external_event_id` | varchar | NULLABLE | CalDAV-Sync-Handle |

### Verwandte Features & Abhängigkeiten

**Dieses Feature konsumiert (abhängig von):**

- [FT-02: Projektverwaltung](https://app.notion.com/p/30dda094354e80648c40dc62565d437e) — project.customer_id wird zur Konsistenzprüfung gegen appointment.customer_id verwendet
- [FT-04: Kalenderansicht](https://app.notion.com/p/746286ccf41d46629ec614541a871345) — Tour-Farblogik: appointment.tour_id → tours.color
- [FT-05: Mitarbeiterverwaltung](https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5) — Mitarbeiter über appointment_employee; Inaktiv- und Überschneidungsprüfung
- [FT-09: Kundenverwaltung](https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad) — customer_id NOT NULL; Inaktiv-Prüfung bei Zuweisung
- [FT-28: Tagging](https://app.notion.com/p/317da094354e81279271fc1c2d18eba4) — Reservierte Tags (Storniert, Reklamation, Messe, Geparkt) steuern Workflow-Zustände
- [FT-06: Automatische Regeln](../ft-06-automatische-regeln/ft-06-automatische-regeln.md) — Reklamationsworkflow setzt bzw. entfernt den Systemzustand Reklamation und steuert den optionalen Notizfluss
- [FT-30/FT-31: Touren & Disposition](https://app.notion.com/p/322da094354e80d9b02edfad47429c4d) — tour_id am Termin; Wochenplanungs-Preview-Dialog

**Dieses Feature wird konsumiert von:**

- [FT-04: Kalenderansicht](https://app.notion.com/p/746286ccf41d46629ec614541a871345) — stellt Termine dar, leitet Darstellungsfarbe aus tour_id ab
- [FT-09: Kundenverwaltung](https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad) — Kundenterminliste über appointment.customer_id
- [FT-02: Projektverwaltung](https://app.notion.com/p/30dda094354e80648c40dc62565d437e) — Projektterminliste über appointment.project_id
- FT-26: Reports/Vorlaufliste — liest Termine für Druckausgabe

**Seiteneffekte bei Änderungen:**

- Änderung am customer_id-Feld → FT-09-Terminliste muss neu projizieren
- Änderung an start_date/end_date-Logik → Überschneidungsprüfung in FT-05 betroffen
- Änderung an der Storno-Logik → FT-28 (reservierter Tag Storniert) direkt betroffen
- Änderung am project_order.amount = 0 beim Storno → FT-02 und FT-26 (Reports) betroffen

## Entscheidungen & Offene Punkte

### Offene Fragen

- W-01 (inaktiver Kunde bei Admin): Code blockiert aktuell auch für Admins via `ensureActiveCustomer`. UC 01/01 und 01/02 beschreiben Admin-Zugriff auf inaktive Kunden — noch nicht im Code umgesetzt.

### Entscheidungslog

- **05.26:** Admin darf historische Termine unbegrenzt ändern. Gilt für: Anlegen, Bearbeiten, Verschieben, Löschen, Stornieren, Tags setzen/entfernen, Mitarbeiter entfernen, Reklamation, Parken. Ausnahmen: stornierte Termine (alle Rollen gesperrt), Abwesenheitstermine (nur über Mitarbeiterformular), gesperrte Tour-Wochen.
- **05.26:** Admin darf historische Termine unbegrenzt ändern. Die Rollenausnahme `allowsHistoricalAppointmentMutation(roleKey) → roleKey === "ADMIN"` wird offiziell in die Spec übernommen. Gilt für: Anlegen, Bearbeiten, Verschieben, Löschen, Stornieren, Tags setzen/entfernen, Mitarbeiter entfernen, Reklamation setzen/entfernen, Parken. Ausnahmen: stornierte Termine (alle Rollen gesperrt), Abwesenheitstermine (nur über Mitarbeiterformular), gesperrte Tour-Wochen.

### Bekannte Abweichungen Code ↔ Spec

| ID | Bereich | Code |
| --- | --- | --- |
| W-01 | Inaktiver Kunde | ensureActiveCustomer blockiert unabhängig von Rolle — auch Admin kann keinen inaktiven Kunden zuweisen |
| W-07 | Historische Termine | BEHOBEN — in Spec übernommen (05.26) |
| W-08 | Storno historisch | Admin darf auch historische Termine stornieren |
