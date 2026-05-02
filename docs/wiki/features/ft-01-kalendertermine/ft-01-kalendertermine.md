# FT (01): Kalendertermine

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importquelle lokal: `C:/Users/schro/Downloads/fd760130-f46b-4dd7-ad03-a9418a06c2fc_ExportBlock-54a7010f-d9fa-4b71-bbd6-7d995c62dc71.zip`
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermÃ¶glicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu Ã¤ndern, zu verschieben, zuzuweisen und zu Ã¼berwachen**, immer mit fachlichem Kundenkontext. Dieser Kundenkontext kann direkt Ã¼ber einen Kunden oder indirekt Ã¼ber ein Projekt entstehen.

FT (01) ist die **fachliche Quelle der Wahrheit fÃ¼r alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, Ã¼berwachen oder ausgeben, leiten ihre Informationen **ausschlieÃŸlich** aus den hier verwalteten Terminen ab.

Die Mitarbeiterzuweisung an Termine unterliegt der ÃœberschneidungsprÃ¼fung, die sicherstellt, dass kein Mitarbeiter im selben Zeitraum mehreren Terminen zugewiesen ist.

## Fachliche Beschreibung

Ein Termin ist eine zeitliche Planungseinheit mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin ist einem Kunden direkt zugeordnet. Ein Termin kann optional einem Projekt zugeordnet sein. Wenn ein Termin einem Projekt zugeordnet ist, muss der Kundenwert des Termins identisch mit dem Kundenwert des Projekts sein â€“ dies ist eine Konsistenzregel ohne Ausnahme. Die Kunde-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung; das Projekt ist eine optionale Spezialisierung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen durch Zuweisung von Mitarbeitern Ã¼ber ein Team oder individuell. Gespeichert wird am Termin stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte gefÃ¼hrt, damit spÃ¤tere Anforderungen an â€žechte Uhrzeitenâ€œ ohne erneute Modellmigration mÃ¶glich sind. In der UI bleiben Uhrzeiten zunÃ¤chst optional, weil der aktuelle Arbeitsmodus weiterhin primÃ¤r tagesbasiert ist.

Ein Termin kann optional Notizen enthalten. Notizen sind freie TexteintrÃ¤ge (Titel und Inhalt), die direkt am Termin hÃ¤ngen und fÃ¼r die Dokumentation von Besonderheiten, Absprachen oder Hinweisen dienen. Notizen bleiben bei Terminen bestehen, unabhÃ¤ngig davon, ob der Termin bearbeitet, das Projekt gewechselt, die Tour verÃ¤ndert oder Mitarbeiter zugewiesen oder entfernt werden. Notizen kÃ¶nnen unabhÃ¤ngig vom Termin gelÃ¶scht werden.

Ein Termin kann storniert werden, solange er nicht in der Vergangenheit liegt â€” **auÃŸer durch einen Administrator, der auch historische Termine stornieren darf.** Der Storno-Workflow ist ein expliziter, nicht umkehrbarer Vorgang: Er zieht alle zugeordneten Mitarbeiter vom Termin ab, setzt den Auftragswert des zugeordneten Projekts auf 0 und markiert den Termin mit dem Tag â€žStorniertâ€œ. Damit wird der Termin dauerhaft gesperrt und verhÃ¤lt sich wie ein historischer Termin: read-only, nicht editierbar, nicht lÃ¶schbar, nicht verschiebbar. Ein stornierter Termin bleibt in allen Sichten sichtbar, geht aber nicht in Umsatzkalkulationen und Reports ein, die auf dem Auftragswert basieren.

Ein Termin kann:

- unabhÃ¤ngig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- Ã¼ber Teams mit Mitarbeitern belegt werden,
- Mitarbeiter kÃ¶nnen nur einmal im Termin existieren, keine Dupletten durch Team-Zuweisung,
- Mitarbeiter dÃ¼rfen nur zugewiesen werden, wenn sich dadurch keine Ãœberschneidungen mit anderen Terminen des Mitarbeiters ergeben.
- in verschiedenen Kalender- und Ãœbersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine kÃ¶nnen auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschlieÃŸender Projektzuweisung.

UnabhÃ¤ngig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gÃ¼ltig, wenn ihm ein Projekt oder ein Kunde zugeordnet ist.**

## Regeln & Randbedingungen

**Abgrenzung zu Kalendermarkern**

Kalendermarker aus FT (34) sind keine Termine. Feiertage, Betriebsfeiertage und Betriebsferien erzeugen keine Terminobjekte, keine Kunden- oder Projektzuordnung, keine Mitarbeiterzuweisung, keine ÃœberschneidungsprÃ¼fung und keine Reportwirkung.

**Grundlegende Terminregeln**

- Ein Termin ist immer einem Kunden direkt zugeordnet (customer_id, NOT NULL).
- Ein Termin ist optional einem Projekt zugeordnet (project_id, NULLABLE).
- Wenn ein Termin einem Projekt zugeordnet ist, muss gelten: appointment.customer_id == project.customer_id. Dies ist eine Invariante ohne Ausnahme.
- Ein Termin ohne Kundenzuordnung ist nicht zulÃ¤ssig.
- Termine enthalten keine eigenen Kunden- oder Projektdatenkopien.
- Kunden- und Projektinformationen werden stets referenziert, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- MehrtÃ¤gige Termine gelten fÃ¼r **alle Tage ihres Zeitraums**.
- Vergangene Termine sind fÃ¼r **Disponenten read-only** und dÃ¼rfen von ihnen nicht verÃ¤ndert werden.
- **Administratoren dÃ¼rfen historische Termine unbegrenzt bearbeiten**, verschieben, lÃ¶schen, stornieren sowie Tags setzen und entfernen. Diese Ausnahme gilt fÃ¼r alle Schreiboperationen auf Terminen.
- Das `isLocked`-Flag im API-Response spiegelt diese Rollenlogik wider: Es ist `true` fÃ¼r Disponenten bei historischen Terminen, `false` fÃ¼r Administratoren.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird ein Termin auf ein neues Datum verschoben, prÃ¼ft das System die VerfÃ¼gbarkeit aller bestehenden Mitarbeiter des Termins Ã¼ber alle Tage des neuen Zeitraums. Sind Mitarbeiter nicht verfÃ¼gbar, zeigt das System eine Meldung mit den betroffenen Mitarbeitern. Nach expliziter BestÃ¤tigung durch den Disponenten werden diese Mitarbeiter vom Termin entfernt. Ohne BestÃ¤tigung wird der Termin nicht gespeichert.

**Mitarbeiterzuweisung**

- Einem Termin kÃ¶nnen **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich Ã¼berschneidend** mehreren Terminen zugewiesen sein. Das gilt bei Mehrtagesterminen fÃ¼r die gesamte Termindauern
    
- Wird ein Mitarbeiter vor DurchfÃ¼hrung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelÃ¶sten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Das Zuweisen oder Wechseln einer Tour an einem Termin lÃ¶st eine PrÃ¼fung aus, ob fÃ¼r die Kalenderwoche des Terminstartdatums in der (neuen) Tour eine Wochenplanung (tour_week_employees) hinterlegt ist. Wenn ja, wird dem Disponenten sofort ein Vorschau-Dialog angezeigt: welche Mitarbeiter hinzugefÃ¼gt wÃ¼rden, welche Konflikte bestehen (Typ-2: Termin-Ãœberschneidung), welche Mitarbeiter wegen manueller oder Team-Zuweisung unverÃ¤ndert bleiben. Erst nach expliziter BestÃ¤tigung werden die ausgewÃ¤hlten Mitarbeiter in die Mitarbeiterliste des Termins Ã¼bernommen. Bei Abbruch bleibt die Tour-Auswahl gesetzt, die Mitarbeiterliste bleibt unverÃ¤ndert. Ist keine Wochenplanung hinterlegt, Ã¤ndert sich die Mitarbeiterliste nicht.
- Das Entfernen einer Tour am Termin hat keine Auswirkungen auf die Mitarbeiterliste des Termins.
- Mitarbeiter, die manuell oder Ã¼ber ein Team dem Termin zugewiesen wurden, werden durch Tour-Ã„nderungen nicht automatisch entfernt. Sie erscheinen im Vorschau-Dialog als â€žbleibt unverÃ¤ndertâ€œ mit Angabe des Herkunftsgrunds.
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung im Kalender.

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Ã„nderungen an Teams wirken **nicht rÃ¼ckwirkend**.
- Der Termin Ã¼bernimmt die Mitarbeiter des Teams

**Notizen an Terminen**

- Ein Termin kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhÃ¤ngig vom Termin; Ã„nderungen am Termin (Datum, Projekt, Tour, Mitarbeiter) wirken sich nicht auf die Notizen aus.
- Notizen werden nicht automatisch gelÃ¶scht, wenn ein Termin bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder der gesamte Termin gelÃ¶scht wird.
- Eine Reklamationsnotiz kann beim Setzen des Systemzustands **Reklamation** vorgeschlagen werden. Beim Aufheben der Reklamation entscheidet der Akteur ausdrÃ¼cklich, ob eine vorhandene Reklamationsnotiz entfernt oder behalten wird.
- Wenn ein Termin gelÃ¶scht wird, werden auch seine zugeordneten Notizen entfernt.

**Storno-Regeln**

- Storno ist fÃ¼r **Disponenten** nur fÃ¼r aktuelle und zukÃ¼nftige Termine zulÃ¤ssig. Historische Termine (Startdatum in der Vergangenheit) kÃ¶nnen von Disponenten nicht storniert werden.
- **Administratoren dÃ¼rfen auch historische Termine stornieren.**
- Ein stornierter Termin kann nicht erneut storniert werden.
- Der Storno-Workflow ist atomar: Mitarbeiterabzug, Setzen des Auftragswerts auf 0 am Projekt und Setzen des Tags â€žStorniertâ€œ erfolgen in einer einzigen, nicht teilbaren Operation. Entweder alle Schritte werden ausgefÃ¼hrt oder keiner.
- Nach dem Storno ist der Termin dauerhaft gesperrt (read-only). Er kann weder bearbeitet noch gelÃ¶scht noch verschoben noch reaktiviert werden.
- Ein stornierter Termin ist in allen Sichten weiterhin sichtbar, jedoch optisch als storniert gekennzeichnet.
- Der Auftragswert des zugeordneten Projekts wird auf 0 gesetzt, damit stornierte Termine nicht in Umsatzkalkulationen und Reports eingehen.
- Hat der Termin kein Projekt (project_id = NULL), entfÃ¤llt der Schritt â€žAuftragswert auf 0â€œ; die Ã¼brigen Schritte bleiben unverÃ¤ndert.
- Die freigegebenen Mitarbeiter sind nach dem Storno fÃ¼r andere Termine im selben Zeitraum wieder verfÃ¼gbar (ÃœberschneidungsprÃ¼fung greift neu).

## Use Cases

- [UC 01/01: Termin anlegen](use-cases/uc-01-01-termin-anlegen.md)
- [UC 01/02: Termin bearbeiten](use-cases/uc-01-02-termin-bearbeiten.md)
- [UC 01/03: Termin verschieben](use-cases/uc-01-03-termin-verschieben.md)
- [UC 01/04: Termin lÃ¶schen](use-cases/uc-01-04-termin-loeschen.md)
- [UC 01/05: Tour einem Termin zuweisen](use-cases/uc-01-05-tour-einem-termin-zuweisen.md)
- [UC 01/06: Tourzuweisung eines Termins entfernen](use-cases/uc-01-06-tourzuweisung-eines-termins-entfernen.md)
- [UC 01/07: Mitarbeiter Ã¼ber Team zuweisen](use-cases/uc-01-07-mitarbeiter-ueber-team-zuweisen.md)
- [UC 01/08: Mitarbeiter einem Termin zuweisen](use-cases/uc-01-08-mitarbeiter-einem-termin-zuweisen.md)
- [UC 01/09: Mitarbeiter von einem Termin entfernen](use-cases/uc-01-09-mitarbeiter-von-einem-termin-entfernen.md)
- [UC 01/10: Termin in abhÃ¤ngigen Sichten anzeigen (Quersicht-Vertrag)](use-cases/uc-01-10-termin-in-abhaengigen-sichten-anzeigen-quersicht-vertrag.md)
- [UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)](use-cases/uc-01-11-denormalisierte-terminanzeige-aktualisieren-quersicht-vertrag.md)
- [UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)](use-cases/uc-01-12-termin-anzeigen-und-filtern-kalender-listenprojektion.md)
- [UC 01/13: Termin-Farbdarstellung ableiten](use-cases/uc-01-13-termin-farbdarstellung-ableiten.md)
- [UC 01/14: Historische Termine â€” Rollenbasiertes Verhalten](use-cases/uc-01-14-historische-termine-rollenbasiertes-verhalten.md)
- [UC 01/15: Konsistenz bei parallelen Ã„nderungen (Optimistic Locking)](use-cases/uc-01-15-konsistenz-bei-parallelen-aenderungen-optimistic-locking.md)
- [UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung](use-cases/uc-01-16-termin-join-konsistenz-und-duplikatvermeidung.md)
- [UC 01/17: Notiz an Termin anlegen](use-cases/uc-01-17-notiz-an-termin-anlegen.md)
- [UC 01/18: Notiz am Termin bearbeiten](use-cases/uc-01-18-notiz-am-termin-bearbeiten.md)
- [UC 01/19: Notiz von Termin entfernen](use-cases/uc-01-19-notiz-von-termin-entfernen.md)
- [UC 01/20: Notizen beim Termin-LÃ¶schen entfernen](use-cases/uc-01-20-notizen-beim-termin-loeschen-entfernen.md)
- [UC 01/21: Termin anlegen â€“ Nur mit Kunde, ohne Projekt](use-cases/uc-01-21-termin-anlegen-nur-mit-kunde-ohne-projekt.md)
- [UC 01/22: Termin stornieren](use-cases/uc-01-22-termin-stornieren.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

### Betroffene Schema-Objekte

**PrimÃ¤re Tabelle**

- `appointments` â€” Zentrale TerminentitÃ¤t; enthÃ¤lt Zeitraum, FK auf Kunde, optional Projekt und Tour

**Beteiligte Join-Tabellen**

- `appointment_employee` â€” Many-to-Many Termin â†” Mitarbeiter (PK: appointment_id + employee_id, cascade on delete)
- `appointment_note` â€” Many-to-Many Termin â†” Notiz (PK: appointment_id + note_id, cascade)
- `appointment_tags` â€” Many-to-Many Termin â†” Tag (PK: appointment_id + tag_id, cascade)
- `appointment_attachment` â€” AnhÃ¤nge am Termin (cascade on delete)

**Kritische Felder**

| Feld | Typ | Nullable | Bedeutung |
| --- | --- | --- | --- |
| `customer_id` | bigint FK | NOT NULL | Pflicht; onDelete restrict â€” Kunde kann nicht gelÃ¶scht werden, solange Termine existieren |
| `project_id` | bigint FK | NULLABLE | Optional; onDelete set null â€” Projekt lÃ¶schen entkoppelt den Termin, lÃ¶scht ihn nicht |
| `tour_id` | int FK | NULLABLE | Optional; onDelete restrict |
| `start_date` | date | NOT NULL | Pflichtfeld; Basis der historischen Schreibsperre |
| `start_time` | time | NULLABLE | Optional; wenn gesetzt â†’ Zeittermin |
| `end_date` | date | NULLABLE | Optional; wenn gesetzt â†’ Mehrtagestermin |
| `version` | int | NOT NULL default 1 | Optimistic Locking |
| `display_mode` | varchar | NOT NULL | Steuert Kalenderdarstellung |
| `external_event_id` | varchar | NULLABLE | CalDAV-Sync-Handle |

### Verwandte Features & AbhÃ¤ngigkeiten

**Dieses Feature konsumiert (abhÃ¤ngig von):**

- [FT-02: Projektverwaltung](https://app.notion.com/p/30dda094354e80648c40dc62565d437e) â€” project.customer_id wird zur KonsistenzprÃ¼fung gegen appointment.customer_id verwendet
- [FT-04: Kalenderansicht](https://app.notion.com/p/746286ccf41d46629ec614541a871345) â€” Tour-Farblogik: appointment.tour_id â†’ tours.color
- [FT-05: Mitarbeiterverwaltung](https://app.notion.com/p/19c06c719b6a45ef9b6b5da509e5b0c5) â€” Mitarbeiter Ã¼ber appointment_employee; Inaktiv- und ÃœberschneidungsprÃ¼fung
- [FT-09: Kundenverwaltung](https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad) â€” customer_id NOT NULL; Inaktiv-PrÃ¼fung bei Zuweisung
- [FT-28: Tagging](https://app.notion.com/p/317da094354e81279271fc1c2d18eba4) â€” Reservierte Tags (Storniert, Reklamation, Messe, Geparkt) steuern Workflow-ZustÃ¤nde
- [FT-06: Automatische Regeln](../ft-06-automatische-regeln/ft-06-automatische-regeln.md) â€” Reklamationsworkflow setzt bzw. entfernt den Systemzustand Reklamation und steuert den optionalen Notizfluss
- [FT-30/FT-31: Touren & Disposition](https://app.notion.com/p/322da094354e80d9b02edfad47429c4d) â€” tour_id am Termin; Wochenplanungs-Preview-Dialog

**Dieses Feature wird konsumiert von:**

- [FT-04: Kalenderansicht](https://app.notion.com/p/746286ccf41d46629ec614541a871345) â€” stellt Termine dar, leitet Darstellungsfarbe aus tour_id ab
- [FT-09: Kundenverwaltung](https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad) â€” Kundenterminliste Ã¼ber appointment.customer_id
- [FT-02: Projektverwaltung](https://app.notion.com/p/30dda094354e80648c40dc62565d437e) â€” Projektterminliste Ã¼ber appointment.project_id
- FT-26: Reports/Vorlaufliste â€” liest Termine fÃ¼r Druckausgabe *(Notion-Link fehlt)*

**Seiteneffekte bei Ã„nderungen:**

- Ã„nderung am customer_id-Feld â†’ FT-09-Terminliste muss neu projizieren
- Ã„nderung an start_date/end_date-Logik â†’ ÃœberschneidungsprÃ¼fung in FT-05 betroffen
- Ã„nderung an der Storno-Logik â†’ FT-28 (reservierter Tag Storniert) direkt betroffen
- Ã„nderung am project_order.amount = 0 beim Storno â†’ FT-02 und FT-26 (Reports) betroffen

## Entscheidungen & Offene Punkte

### Offene Fragen

- W-01 (inaktiver Kunde bei Admin): Code blockiert aktuell auch fÃ¼r Admins via `ensureActiveCustomer`. UC 01/01 und 01/02 beschreiben Admin-Zugriff auf inaktive Kunden â€” noch nicht im Code umgesetzt.

### Entscheidungslog

- **05.26:** Admin darf historische Termine unbegrenzt Ã¤ndern. Gilt fÃ¼r: Anlegen, Bearbeiten, Verschieben, LÃ¶schen, Stornieren, Tags setzen/entfernen, Mitarbeiter entfernen, Reklamation, Parken. Ausnahmen: stornierte Termine (alle Rollen gesperrt), Abwesenheitstermine (nur Ã¼ber Mitarbeiterformular), gesperrte Tour-Wochen.
- **05.26:** Admin darf historische Termine unbegrenzt Ã¤ndern. Die Rollenausnahme `allowsHistoricalAppointmentMutation(roleKey) â†’ roleKey === "ADMIN"` wird offiziell in die Spec Ã¼bernommen. Gilt fÃ¼r: Anlegen, Bearbeiten, Verschieben, LÃ¶schen, Stornieren, Tags setzen/entfernen, Mitarbeiter entfernen, Reklamation setzen/entfernen, Parken. Ausnahmen: stornierte Termine (alle Rollen gesperrt), Abwesenheitstermine (nur Ã¼ber Mitarbeiterformular), gesperrte Tour-Wochen.

### Bekannte Abweichungen Code â†” Spec

| ID | Bereich | Code |
| --- | --- | --- |
| W-01 | Inaktiver Kunde | ensureActiveCustomer blockiert unabhÃ¤ngig von Rolle â€” auch Admin kann keinen inaktiven Kunden zuweisen |
| W-07 | Historische Termine | BEHOBEN â€” in Spec Ã¼bernommen (05.26) |
| W-08 | Storno historisch | Admin darf auch historische Termine stornieren |

