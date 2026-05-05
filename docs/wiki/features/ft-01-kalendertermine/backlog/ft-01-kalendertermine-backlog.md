# FT (01) Backlog

## BL (09): Termintypen / Terminkategorisierung

Quelle: https://www.notion.so/313da094354e81c1adf7c74b2177b0a6

Status: Backlog / nicht begonnen

### Ziel / Zweck

Termine sollen über fachliche Termintypen kategorisiert werden können.

Termintypen sollen bestimmte Nutzungen freier Tags teilweise ersetzen und künftig ermöglichen, Workflows und Formulare gezielter an eine Terminart zu koppeln.

### Fachliche Beschreibung

Der Kern der Anforderung liegt bei FT (01): Kalendertermine, weil der Termintyp die fachliche Bedeutung eines Termins beschreibt und voraussichtlich am Termin selbst ausgewählt oder gespeichert wird.

FT (28): Universelles Tagging-System bleibt ein verwandtes, aber abgegrenztes Feature. Tags sind generische Markierungen an mehreren Domänenobjekten. Termintypen sollen dagegen strukturierte Termin-Kategorien bilden und können damit als fachlicher Auslöser für Formularverhalten, Workflowregeln, Pflichtfelder oder Darstellungslogik dienen.

FT (06): Automatische Regeln ist ebenfalls berührt, falls Termintypen automatische Folgeaktionen, Vorschläge oder Workflowzustände auslösen sollen.

### Regeln & Randbedingungen

- Termintypen ersetzen freie Tags nicht vollständig, sondern nur ausgewählte Tag-Anwendungsfälle an Terminen.
- Ein Termintyp darf nicht stillschweigend wie ein frei pflegbarer Tag behandelt werden.
- Formular- und Workflowwirkungen eines Termintyps müssen vor Umsetzung explizit beschrieben werden.
- Bestehende Systemzustände wie Storniert, Reklamation, Geparkt und Messe bleiben bis zu einer ausdrücklichen Fachentscheidung über die bestehenden Workflowpfade geschützt.
- Rollen und Berechtigungen sind offen: Verwaltung von Termintypen, Setzen am Termin und daraus folgende Workflowaktionen müssen vor Umsetzung geklärt werden.

### Offene Klärungen

- Ist ein Termintyp Pflicht oder optional?
- Darf ein Termin genau einen oder mehrere Termintypen besitzen?
- Wer darf Termintypen anlegen, bearbeiten, deaktivieren oder löschen?
- Wer darf den Termintyp eines Termins setzen oder ändern?
- Welche Formulare, Pflichtfelder oder Workflows sollen je Termintyp steuerbar sein?
- Welche bestehenden Tag-Anwendungsfälle sollen konkret durch Termintypen ersetzt werden?
