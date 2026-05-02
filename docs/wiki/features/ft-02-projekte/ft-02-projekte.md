# FT (02): Projekte

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importquelle lokal: `C:/Users/schro/Desktop/FT (02) Projekte 30dda094354e80648c40dc62565d437e.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature ermöglicht der Disposition, **Projekte als zentrale fachliche Einheit** anzulegen, zu pflegen und in ihrem Lebenszyklus zu steuern.

Ein Projekt bildet den fachlichen Rahmen für alle zugehörigen Termine und bündelt alle projektbezogenen Informationen wie Beschreibung, Tags, Notizen und Anhänge.

## Fachliche Beschreibung

Ein Projekt repräsentiert einen Auftrag oder Vorgang (z. B. Aufbau, Service, Nachbesserung).

Es ist immer genau **einem Kunden** zugeordnet. Projektbezogene fachliche Markierungen werden nicht mehr über einen eigenen Projektstatus gepflegt, sondern über das universelle Tagging-System abgebildet.

Alle fachlichen Informationen, die **nicht terminspezifisch** sind, werden am Projekt gepflegt:

- eine ausführliche Projektbeschreibung (formatierter Text, z. B. Markdown),
- optionale Notizen (als eigenständiges Domainobjekt),
- projektbezogene Anhänge (z. B. Auftrag, Auftragsbestätigung, Pläne, Fotos).

Ein Projekt kann **ohne Termine** existieren.

Termine können **innerhalb eines Projekts** angelegt werden. Termine Können auch im Kalender angelegt werden, wo dann die Projektzuordnung erfolgt.

Projekt-Details sind immer **projektweit gültig** und gelten automatisch für alle zugehörigen Termine. Aus Termin- oder Kalenderansichten können Projekt-Details eingesehen, jedoch nicht zwingend dort bearbeitet werden.

In der Projektliste wird standardmäßig nur die für die Disposition relevante Arbeitsmenge angezeigt. Unter „Aktuelle Projekte“ versteht das System Projekte, die mindestens einen Termin besitzen, dessen Startdatum heute oder in der Zukunft liegt. Projekte ohne Termine sind im Standardfall bewusst ausgeblendet, weil sie nicht disponierbar sind. Über eine explizite Umschaltoption kann die Liste stattdessen auf „Projekte ohne Termine“ umgestellt werden; in diesem Modus werden ausschließlich Projekte angezeigt, die keinen Termin besitzen. Zusätzliche Filter wie Titel- oder Tagfilter wirken immer nur auf die jeweils geladene Projektmenge und definieren nicht die Grundmenge.

Notizen sind zusätzliche, frei formulierte Texteinträge, die projektspezifische Informationen, Absprachen oder Besonderheiten dokumentieren. Jede Notiz besteht aus einem Titel und einem Inhalt und ist dauerhaft dem Projekt zugeordnet. Ein Projekt kann mehrere Notizen enthalten. Notizen sind unabhängig von Terminplanungen, Tag-Änderungen oder Kundenanpassungen – sie bleiben bestehen und können jederzeit ergänzt oder überarbeitet werden. Notizen sind für alle zum Projekt gehörenden Termine verfügbar und können optional in Druckausgaben oder Exportformaten mitgeführt werden.

## Regeln & Randbedingungen

- Ein Projekt ist immer genau **einem Kunden** zugeordnet.
- Ein Projekt kann projektbezogene Tags besitzen.
- Projektbezogene Markierungen werden über das universelle Tagging-System gepflegt.
    - System-Tags und fachlich geschützte Tags werden gemäß FT (28) verwaltet.
- Der Systemzustand **Reklamation** wird nicht über die generische Projekt-Tag-Pflege gesetzt oder entfernt, sondern über den Reklamationsworkflow aus FT (06). Dieser Workflow setzt bzw. entfernt das geschützte System-Tag **Reklamation** und kann optional eine Projektnotiz aus der Reklamationsvorlage vorschlagen.
- Ein Projekt kann ohne Termine existieren.
- Projekt-Details (Beschreibung, Notizen, Anhänge) gehören **ausschließlich** zum Projekt, nicht zum Termin.
- Notizen sind optional und frei pflegbar.
- Anhänge sind optional; ein Projekt kann mehrere Anhänge besitzen.
- Anhänge sind dauerhaft dem Projekt zugeordnet.
- Das physische Löschen eines Projekts ist nur zulässig, wenn keine Termine existieren.

**Notizen an Projekten**

- Ein Projekt kann null, eine oder mehrere Notizen haben.
- Jede Notiz besitzt einen Titel und einen Inhalt (Body), beide sind Pflichtfelder.
- Notizen sind unabhängig vom Projekt; Änderungen am Projekt (Kundenänderung, Tag-Änderung, Anhänge) wirken sich nicht auf die Notizen aus.
- Notizen werden nicht automatisch gelöscht, wenn ein Projekt bearbeitet wird. Sie bleiben solange erhalten, bis sie explizit entfernt oder das gesamte Projekt gelöscht wird.
- Eine Reklamationsnotiz kann beim Setzen des Systemzustands **Reklamation** vorgeschlagen werden. Beim Aufheben der Reklamation entscheidet der Akteur ausdrücklich, ob eine vorhandene Reklamationsnotiz entfernt oder behalten wird.
- Wenn ein Projekt gelöscht wird, werden auch seine zugeordneten Notizen entfernt.
- Notizen sind für alle zugehörigen Termine sichtbar, sofern das Termindetail oder die Projektreferenz angezeigt wird.
- Notizen können optional in Druckausgaben, CSV-Exporten oder anderen Exportformaten mitgeführt werden, sofern das jeweilige Feature dies vorsieht.

## Use Cases

- [UC 02/01: Projekt anlegen](use-cases/uc-02-01-projekt-anlegen.md)
- [UC 02/02: Projekt bearbeiten](use-cases/uc-02-02-projekt-bearbeiten.md)
- [UC 02/03: Projekt anzeigen](use-cases/uc-02-03-projekt-anzeigen.md)
- [UC 02/04: Projekt-Tags ändern](use-cases/uc-02-04-projekt-tags-aendern.md)
- [UC 02/05: Projektnotizen pflegen](use-cases/uc-02-05-projektnotizen-pflegen.md)
- [UC 02/06: Projektanhänge verwalten](use-cases/uc-02-06-projektanhaenge-verwalten.md)
- [UC 02/07: Projekte anzeigen (Liste)](use-cases/uc-02-07-projekte-anzeigen-liste.md)
- [UC 02/08: Projekt löschen](use-cases/uc-02-08-projekt-loeschen.md)
- [UC 02/09: Projektänderung wird in Terminansichten konsistent dargestellt](use-cases/uc-02-09-projektaenderung-wird-in-terminansichten-konsistent-dargestellt.md)
- [UC 02/10: Projekt-Tag-Änderung wirkt systemweit konsistent](use-cases/uc-02-10-projekt-tag-aenderung-wirkt-systemweit-konsistent.md)
- [UC 02/11: Projektlöschung wird systemweit korrekt verarbeitet](use-cases/uc-02-11-projektloeschung-wird-systemweit-korrekt-verarbeitet.md)
- [UC 02/12: Projekt in abhängigen Sichten anzeigen (Quer­sicht-Vertrag)](use-cases/uc-02-12-projekt-in-abhaengigen-sichten-anzeigen-quer-sicht-vertrag.md)
- [UC 02/13: Denormalisierte Projektanzeige aktualisieren (Quer­sicht-Vertrag)](use-cases/uc-02-13-denormalisierte-projektanzeige-aktualisieren-quer-sicht-vertrag.md)
- [UC 02/14: Konsistenz bei parallelen Änderungen an Projekten (Optimistic Locking)](use-cases/uc-02-14-konsistenz-bei-parallelen-aenderungen-an-projekten-optimistic-locking.md)
- [UC 02/15: Projekt-Join-Konsistenz (Projekt ↔ Tags)](use-cases/uc-02-15-projekt-join-konsistenz-projekt-tags.md)
- [UC 02/16: Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)](use-cases/uc-02-16-projekt-referenz-konsistenz-projekt-kunde.md)
- [UC 02/17: Projekt-Mengenlogik-Konsistenz (Projektübersicht)](use-cases/uc-02-17-projekt-mengenlogik-konsistenz-projektuebersicht.md)
- [UC 02/18: Race Condition bei Projektlöschung](use-cases/uc-02-18-race-condition-bei-projektloeschung.md)
- [UC 02/19: Projekt in abhängigen Sichten anzeigen (Quer­sicht-Vertrag)](use-cases/uc-02-19-projekt-in-abhaengigen-sichten-anzeigen-quer-sicht-vertrag.md)
- [UC 02/20: ENTFERNT — Duplikat von UC 02/13](use-cases/uc-02-20-entfernt-duplikat-von-uc-02-13.md)
- [UC 02/21: Termin für Projekt ohne Termine anlegen (über Kalendersicht)](use-cases/uc-02-21-termin-fuer-projekt-ohne-termine-anlegen-ueber-kalendersicht.md)
- [UC 02/22: Notiz von Projekt entfernen](use-cases/uc-02-22-notiz-von-projekt-entfernen.md)
- [UC 02/23: Notiz anpinnen / lospinnen](use-cases/uc-02-23-notiz-anpinnen-lospinnen.md)
- [UC 02/24: Projekt aktivieren / deaktivieren](use-cases/uc-02-24-projekt-aktivieren-deaktivieren.md)
- [UC 02/26: Auftragspositionen verwalten](use-cases/uc-02-26-auftragspositionen-verwalten.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

### Betroffene Schema-Objekte

**Primäre Tabelle(n)**

- `projects` — `id`, `title`, `description`, `order_number` (NOT NULL), `customer_id` (FK → customers, NOT NULL), `is_active`, `version` (Optimistic Locking), `created_at`, `updated_at`
- `notes` — `id`, `title`, `body`, `is_pinned`, `color`, `version`, `created_at`, `updated_at`
- `project_attachments` — `id`, `project_id` (FK → projects), `original_name`, `storage_name`, `mime_type`, `size`, `created_at`

**Beteiligte Join-Tabellen**

- `project_notes` — `project_id` × `note_id` (1:n, Notiz gehört genau einem Projekt)
- `tag_relations` — `entity_type = 'project'`, `entity_id`, `tag_id`, `version`
- `project_order_items` — `id`, `project_id`, Bezeichnung, Menge, Einheit

**Kritische Felder** *(mit Nullable-Hinweis)*

- `order_number` — NOT NULL, Pflichtfeld bei Anlage (422 wenn leer)
- `customer_id` — NOT NULL, readonly wenn Termine existieren
- `version` — NOT NULL, Optimistic Locking auf `projects` und `tag_relations`
- `is_active` — default TRUE, steuert Sichtbarkeit in Standardliste

### Verwandte Features & Abhängigkeiten

**Dieses Feature konsumiert (abhängig von):**

- FT (09) Kundenverwaltung — Kunde muss existieren und aktiv sein; `customer_id` wird referenziert
- FT (13) Notizverwaltung — Notiz-Domainobjekt, Vorlagen, Pinning, Versioning, Sortierlogik
- FT (19) Attachments — Upload-, Download- und Löschworkflow für Anhänge
- FT (28) Tagging — universelles Tagging-System, System-Tags, Versioning der Tag-Relationen

**Dieses Feature wird konsumiert von:**

- FT (01) Kalendertermine — Termin referenziert `project_id` und erbt `customer_id` vom Projekt
- FT (03) Kalenderansichten — Projektdaten werden in Termin-Karten angezeigt
- FT (06) Druckfunktionen — Projektnotizen können in Druckausgaben mitgeführt werden

**Seiteneffekte bei Änderungen:**

- Kundenwechsel am Projekt → kaskadierendes Update auf `appointments.customer_id` für alle Termine des Projekts
- Projektlöschung → Cascade auf `project_notes`, `notes`, `project_attachments`, `project_order_items`, `tag_relations`
- Physische Dateien bei Projektlöschung → verbleiben im Upload-Verzeichnis (kein automatisches Aufräumen)

## Entscheidungen & Offene Punkte

### Offene Fragen

- Sollen inaktive Projekte (`is_active = false`) in der Kalenderansicht noch sichtbar sein, wenn ihre Termine noch laufen?
- Soll bei Projektlöschung eine Bereinigung verwaister physischer Anhang-Dateien erfolgen (Cleanup-Job)?
- Sollen Auftragspositionen in Druckausgaben (FT 06) erscheinen?

### Entscheidungslog

- **2025**: Projektstatus wird nicht mehr als eigenständiges Feld gepflegt, sondern über das universelle Tagging-System (FT 28) abgebildet. Grund: Flexibilität bei fachlichen Markierungen.
- **2025**: Physische Projektlöschung statt Soft-Delete. Grund: Datenhygiene, kein archivierter Altbestand in der Standardliste.
- **2026 (Review)**: Anhangslöschung in FT 02 freigegeben, da FT 19 explizit einen zweistufigen Löschworkflow vorsieht. UC 02/06 entsprechend korrigiert.

### Bekannte Abweichungen Code ↔ Spec

- **BEHOBEN**: UC 02/06 alt beschrieb „Anhangslöschung nicht vorgesehen“ — Code und FT 19 erlauben Löschung. UC 02/06 wurde korrigiert.
- **BEHOBEN**: `order_number` war im Feature-Dokument nicht als Pflichtfeld erwähnt, ist aber im Code 422-validiert. UC 02/01 wurde korrigiert.
- **BEHOBEN**: Notiz-Endpunkt für Update läuft über generische `notesRoutes` (PUT), nicht über `projectNotesRoutes`. UC 02/05 dokumentiert dies jetzt.
- **OFFEN**: UC 02/19 und UC 02/20 waren Duplikate von UC 02/12 / 02/13. Als ENTFERNT markiert, aber noch nicht physisch aus Notion gelöscht.
