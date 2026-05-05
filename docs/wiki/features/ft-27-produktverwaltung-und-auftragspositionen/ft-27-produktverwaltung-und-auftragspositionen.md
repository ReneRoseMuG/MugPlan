# FT (27): Produktverwaltung und Auftragspositionen

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Produkte (Saunamodelle) und ihre Komponenten (Bauteile/Varianten) werden als strukturierte Stammdaten mit optionalen Spezifikationen erfasst und gepflegt. Damit werden Auftragspositionen präzise referenzierbar, statt nur Freitextbeschreibungen zu verwenden. Admin-Benutzer verwalten die Produktkatalogdaten, Disponenten nutzen diese zum Erfassen von Auftragspositionen.

## Fachliche Beschreibung

### Produkte und Produktkategorien

Ein **Produkt** repräsentiert ein fertiges Saunamodell (z.B. Kolmikko, Suuri, Mini). Jedes Produkt wird genau einer **Produktkategorie** zugeordnet (z.B. "Sauna-Modelle", "Zubehör"). Produkte haben einen eindeutigen Namen, eine optionale Beschreibung und ein Aktivitätskennzeichen. Nur Admins können Produkte anlegen, bearbeiten oder deaktivieren.

### Komponenten und Komponentenkategorien

Eine **Komponente** ist ein eigenständiges Bauteil (z.B. Rückwand, Ofen, Vorderwand, Fenster, Türen). Jede Komponente wird genau einer **Komponentenkategorie** zugeordnet (z.B. "Wände", "Heizung", "Türen") und kann eine optionale Beschreibung haben. Komponenten und Produkte sind voneinander unabhängige Stammdatenbereiche ohne strukturelle Verknüpfung.

### Integration mit Auftragsmanagement

Auftragspositionen (`project_order_items`) werden pro Projekt verwaltet, um eine Artikelliste pflegen zu können. Eine Position referenziert entweder ein Produkt oder eine Komponente — beide Felder sind unabhängig voneinander wählbar (kein Cascade-Dropdown). Mindestens eines von beiden muss gesetzt sein. Eine optionale freie Beschreibung kann zusätzlich angegeben werden. Die Zuordnung erfolgt strukturiert über Foreign Keys, nicht als Freitextbeschreibung.

## Regeln & Randbedingungen

### Namensuniqueness und Eindeutigkeit

- Produktnamen sind global eindeutig (UNIQUE).
- Komponentennamen sind global eindeutig (UNIQUE).
- Kategorienamen sind eindeutig innerhalb ihres Typs.

### Kategorien

- Jedes Produkt muss genau einer Produktkategorie zugeordnet sein.
- Jede Komponente muss genau einer Komponentenkategorie zugeordnet sein.
- Kategorien sind pflegende Stammdaten (Admin-Only).

### Lebenszyklus und Deaktivierung

- Inaktive Produkte, Komponenten und Kategorien werden nicht gelöscht, sondern über `is_active = false` deaktiviert.
- Deaktivierte Stammdaten werden in Auswahlfeldern nicht mehr angeboten.
- Historische Auftragspositionen, die auf inaktive Stammdaten verweisen, bleiben konsistent referenzierbar.
- Löschen ist blockiert, solange aktive Referenzen existieren (z.B. Auftragspositionen, die eine Komponente nutzen).

### Berechtigungen

- **Admins:** Volle Mutations- und Löschrechte auf Kategorien, Produkte und Komponenten.
- **Disponenten:** Lesezugriff auf alle Stammdaten. Keine Mutations- oder Löschrechte.
- Serverseitige Berechtigungsprüfung ist verpflichtend; UI-seitige Beschränkung reicht nicht.

### Referenzintegrität

- Beim Löschen eines Produkts oder einer Komponente wird geprüft, ob noch aktive Auftragspositionen darauf verweisen; wenn ja, wird das Löschen blockiert.

## Use Cases

- [UC 27/01: Produktkategorie anlegen (Admin)](use-cases/uc-27-01-produktkategorie-anlegen-admin.md)
- [UC 27/02: Produkt anlegen (Admin)](use-cases/uc-27-02-produkt-anlegen-admin.md)
- [UC 27/03: Komponentenkategorie anlegen (Admin)](use-cases/uc-27-03-komponentenkategorie-anlegen-admin.md)
- [UC 27/04: Komponente anlegen (Admin)](use-cases/uc-27-04-komponente-anlegen-admin.md)
- [UC 27/05: Auftragsposition manuell erfassen (Disponent / Admin)](use-cases/uc-27-05-auftragsposition-manuell-erfassen-disponent-admin.md)
- [UC 27/06: Auftragsposition bearbeiten (Disponent / Admin)](use-cases/uc-27-06-auftragsposition-bearbeiten-disponent-admin.md)
- [UC 27/07: Auftragsposition löschen (Admin)](use-cases/uc-27-07-auftragsposition-loeschen-admin.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
