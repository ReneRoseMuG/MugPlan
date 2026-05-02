# FT (33): Abwesenheiten über interne Personalplanung

## Metadaten

- Status: Spezifiziert
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/34dda094354e81d096b0f47ea36c177e
- Importquelle lokal: `C:/Users/schro/Desktop/FT (33) Abwesenheiten über interne Personalplanung 34dda094354e81d096b0f47ea36c177e.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature ermöglicht die Erfassung und Berücksichtigung von Mitarbeiter-Abwesenheiten, ohne das stillgelegte alte Abwesenheitsmodul zu reaktivieren und ohne eine allgemeine Einführung von Termintypen vorzunehmen. Abwesenheiten werden als kontrollierter Sonderfall bestehender Termine abgebildet:

- interner Kunde **MuG Personalplanung**
- Systemtour **Abwesenheiten**
- regulärer Termin mit Startdatum und optionalem Enddatum
- genau eine Mitarbeiterzuweisung am Termin
- genau ein fachlicher Abwesenheits-Tag: **Urlaub**, **Krankheit** oder **Abwesend**

Die App nutzt weiterhin Termine als zentrale Quelle der Wahrheit. Abwesenheiten werden nicht über ein neues `appointment_type`-Konzept modelliert, sondern über einen dedizierten Mitarbeiter-Abwesenheiten-Flow.

## Fachliche Beschreibung

**Kerndefinition**

Eine Abwesenheit liegt vor, wenn ein Termin folgende Merkmale kumulativ erfüllt:

- Kunde ist **MuG Personalplanung** (Kundennummer `MUG-PERSONALPLANUNG`)
- Tour ist **Abwesenheiten**
- Genau ein Mitarbeiter ist zugewiesen
- Der Termin besitzt ein gültiges Startdatum und optional ein Enddatum
- Genau ein Abwesenheits-Tag ist gesetzt: **Urlaub**, **Krankheit** oder **Abwesend**

Der Abwesenheits-Tag ist nicht optional. Er klassifiziert die Art der Abwesenheit und wird ausschließlich über dedizierte Abwesenheitsfunktionen gesetzt oder geändert. Abwesenheits-Tags sind System-Tags (`isDefault = true`) und erscheinen nicht im normalen User-Tag-Picker.

Abwesenheiten besitzen kein Projekt und fallen dadurch strukturell aus allen projektbasierten Reports heraus – ohne expliziten Filter.

**Erfassung und Pflege**

Abwesenheiten werden ausschließlich über das Mitarbeiterformular im Tab **Abwesenheiten** angelegt, bearbeitet und gelöscht. Die technischen Endpunkte liegen unter `/api/employees/:id/absence-appointments`. Der Server setzt beim Anlegen und Bearbeiten automatisch Kunde, Tour, Mitarbeiter und Tag.

**Systemdaten**

Folgende Systemdaten werden benötigt und zweistufig sichergestellt – über den System-Seed und zusätzlich über Lazy Ensure im Abwesenheiten-Service:

- Systemkunde **MuG Personalplanung** mit Kundennummer `MUG-PERSONALPLANUNG`
- Systemtour **Abwesenheiten** mit Farbe `#64748B`
- Systemtags **Urlaub**, **Krankheit**, **Abwesend** (`isDefault = true`)

**Darstellung im Kalender**

*Wochenkalender:* Die Tour **Abwesenheiten** wird ganz unten als passive Lane eingeblendet. Sie bietet keine Action-Elemente: kein +‑Button, kein Drag & Drop, keine Tag-Bearbeitung, keine Blockier-Aktionen, keine Notizen.

*Monatskalender:* Im Standardmodus **Terminplanung** werden Abwesenheiten ausgeblendet. Ein Toggle im Kopfbereich schaltet zwischen **Terminplanung** und **Abwesenheiten** um. Im Modus **Abwesenheiten** werden ausschließlich Abwesenheitstermine angezeigt, reguläre Termine ausgeblendet. Der Toggle-Zustand wird nicht persistiert.

*Auslastungsübersicht im Mitarbeiterformular:* Abwesenheiten werden gemeinsam mit regulären Terminen angezeigt (`absenceVisibility="include"`).

## Regeln & Randbedingungen

**R-01 Dedizierter Flow**

Abwesenheiten werden über `/api/employees/:id/absence-appointments` erzeugt und gepflegt. Der normale Termin-Flow ist nicht der primäre Erfassungsweg.

**R-02 Systemkontext automatisch setzen**

Beim Anlegen und Bearbeiten setzt der Server automatisch Kunde **MuG Personalplanung**, Tour **Abwesenheiten**, genau einen Mitarbeiter und genau einen Abwesenheits-Tag.

**R-03 Mitarbeiter blockieren**

Der einem Abwesenheitstermin zugewiesene Mitarbeiter gilt im Terminzeitraum als nicht verfügbar. Die bestehende Termin-Überschneidungsprüfung prüft reguläre Termine gegen Abwesenheitstermine.

**R-04 Keine Wochenplanungsübernahme**

Für die Systemtour **Abwesenheiten** darf keine automatische Mitarbeiterübernahme aus der Tour- oder Kalenderwochenplanung ausgeführt werden.

**R-05 Tag-Wechsel kontrolliert**

Beim Wechsel der Abwesenheitsart entfernt der Server alle anderen Abwesenheits-Tags und setzt genau den neuen Tag.

## Use Cases

- [UC 33/01: Abwesenheiten anzeigen](use-cases/uc-33-01-abwesenheiten-anzeigen.md)
- [UC 33/02: Abwesenheit anlegen](use-cases/uc-33-02-abwesenheit-anlegen.md)
- [UC 33/03: Abwesenheit bearbeiten](use-cases/uc-33-03-abwesenheit-bearbeiten.md)
- [UC 33/04: Abwesenheit löschen](use-cases/uc-33-04-abwesenheit-loeschen.md)
- [UC 33/05: Einplanung mit abwesendem Mitarbeiter verhindern](use-cases/uc-33-05-einplanung-mit-abwesendem-mitarbeiter-verhindern.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

### Betroffene Schema-Objekte

**Primäre Tabelle(n)**

`appointments` – Abwesenheiten sind reguläre Termine ohne Projekt.

**Beteiligte Join-Tabellen**

- `appointment_employees` – genau ein Eintrag pro Abwesenheitstermin
- `appointment_tags` – genau ein Abwesenheits-Tag pro Abwesenheitstermin

**Kritische Felder** *(mit Nullable-Hinweis)*

- `start_date` – Pflichtfeld
- `end_date` – nullable, bei Mehrtagestermin gesetzt
- `start_time` – immer null (ganztägig)
- `tour_id` – Systemtour Abwesenheiten (not null)
- `customer_id` – Systemkunde MuG Personalplanung (not null)
- `project_id` – immer null

### Verwandte Features & Abhängigkeiten

**Dieses Feature konsumiert (abhängig von):**

- FT-04 Termine – Terminlogik, Überschneidungsprüfung, Lösch- und Versionsprüfung
- FT-30 Tour-Management – Systemtour Abwesenheiten, Wochenplanungsausschluss
- Tag-Management – isDefault-Konzept für System-Tags

**Dieses Feature wird konsumiert von:**

- FT-31 Dispositions-Monitoring – Überschneidungserkennung berücksichtigt Abwesenheitstermine
- Wochenkalender – passive Anzeige der Tour Abwesenheiten
- Monatskalender – Toggle Terminplanung / Abwesenheiten

**Seiteneffekte bei Änderungen:**

- Änderungen an der Überschneidungsprüfung in FT-04 betreffen direkt R-03.
- Umbenennung der Systemtour bricht `isAbsenceTourName()`-Checks im gesamten Client und Server.
- Änderungen am isDefault-Konzept betreffen die Sichtbarkeit der Abwesenheits-Tags im Picker.

## Entscheidungen & Offene Punkte

### Offene Fragen

Keine.

### Entscheidungslog

**Abwesenheiten als kontrollierter Sonderfall regulärer Termine**

Kein neues `appointment_type`-Konzept, kein reaktiviertes altes Abwesenheitsmodul. Identifikation über Kombination aus Systemtour, Systemkunde und Abwesenheits-Tag.

**Ein Termin pro Mitarbeiter**

Keine Sammeltermine mit mehreren Mitarbeitern. Pro abwesendem Mitarbeiter ein eigener Termin.

**Erfassungsweg ausschließlich über Mitarbeiterformular**

Kein Drag & Drop auf die Tour Abwesenheiten, kein +‑Button in der Abwesenheits-Lane des Kalenders.

**Abwesenheits-Tags als System-Tags**

Tags mit `isDefault = true` erscheinen nicht im normalen User-Tag-Picker und können nur über dedizierte Abwesenheitsfunktionen gesetzt werden.

**Keine eigene globale Abwesenheitsliste**

Die bestehende Terminliste ist nach Tour und Tag filterbar und reicht für Auswertungen aus.

**Lazy Ensure zusätzlich zum Seed**

Systemdaten werden beim Abwesenheits-Flow zusätzlich sichergestellt, damit fehlende Systemdaten keinen Fehler verursachen.

### Bekannte Abweichungen Code ↔ Spec

**Toggle-Zustand Monatskalender**

Spec: „Beim erneuten Aufruf des Monatskalenders startet die Ansicht immer in Terminplanung." Code: Der Toggle-Zustand überlebt einen View-Wechsel innerhalb der Session. Erst ein Seitenneuladen setzt ihn zurück.

**Auslastungsübersicht Mitarbeiterformular**

Implementierungsaufgabe beschreibt eine dedizierte Abwesenheits-Lane. Implementiert ist `absenceVisibility="include"` auf der bestehenden Monatsrasteransicht: Abwesenheiten erscheinen gemeinsam mit regulären Terminen, nicht als separate Lane.
