# FT (02) Backlog

## BL (08): Projekttypen / Projektkategorisierung

Quelle: https://www.notion.so/313da094354e81c2886eeedc2c42e5b4

Status: In Bearbeitung / teilweise implementiert

### Ziel / Zweck

Projekte sollen strukturiert kategorisiert werden können, damit fachlich unterschiedliche Projektarten systematisch unterschieden und perspektivisch unterschiedlich behandelt werden können.

Die Projektgrundlogik aus FT (02) bleibt dabei erhalten. Projekttypen sollen die bestehende Projektlogik nicht fragmentieren, sondern eine kontrollierte Differenzierung für Formulare, Darstellung und strukturierte Zusatzdaten ermöglichen.

### Teilimplementierungsstand

Im Code existiert bereits ein stiller Projekttyp:

- `projects.type` ist als Pflichtfeld mit Default `1` vorhanden.
- `projectTypeSchema` akzeptiert positive Ganzzahlen und defaultet auf `1`.
- Das Projektformular führt `projectType` intern mit.
- `resolveProjectEditForm()` normalisiert aktuell jeden Projekttyp auf Typ `1` und liefert als Formularschlüssel `sauna` mit Label „Typ 1 - Sauna“.
- Create- und Update-Pfade speichern den normalisierten Typ mit.
- Der Typ ist derzeit nicht als fachliche Auswahl, Filterung oder sichtbare Projektkategorie umgesetzt.

Damit ist die technische Basis teilweise vorhanden, aber die vollständige fachliche Implementierung steht noch aus.

### Fachliche Beschreibung

Jedes Projekt kann genau einem Projekttyp zugeordnet sein. Der Projekttyp definiert die fachliche Kategorie eines Projekts.

Perspektivisch kann ein Projekttyp steuern:

- unterschiedliche Eingabeformulare
- unterschiedliche Pflichtfelder
- typabhängige Zusatzbereiche
- differenzierte Kartenlayouts oder Detailansichten
- unterschiedliche visuelle Kennzeichnung
- strukturierte Produktdaten und Attributsets, zum Beispiel Sauna-Projekt gegenüber Serviceeinsatz
- optionale spätere Ressourcenbindungen

### Regeln & Randbedingungen

- Die Kernlogik von Projekten bleibt typunabhängig gültig.
- Kundenbezug, Termine und Kernattribute bleiben unabhängig vom Projekttyp konsistent.
- Projekttypen sind nicht gleichbedeutend mit freien Projekt-Tags.
- Keine Änderung der Terminlogik im Rahmen dieses Backlog-Punkts.
- Keine automatische Ableitung von Preisen oder Material im Rahmen dieses Backlog-Punkts.
- Keine Prozessautomatisierung im Rahmen dieses Backlog-Punkts.
- Rollen und Berechtigungen sind vor vollständiger Umsetzung zu klären; Sichtbarkeit, Pflege und Änderung von Projekttypen dürfen nicht nur über UI-Logik abgesichert werden.

### Abgrenzung

FT (28): Universelles Tagging-System bleibt für freie und systemgeschützte Markierungen zuständig. Projekttypen sollen dagegen eine strukturierte, genau eine fachliche Projektkategorie bilden.

FT (27): Produktverwaltung und Auftragspositionen ist berührt, weil Typ `1` aktuell mit dem Sauna-Formular und Artikellisten verknüpft ist.

### Offene Klärungen

- Welche Projekttypen soll es fachlich geben?
- Ist der Projekttyp bei Projektanlage Pflicht oder gibt es einen neutralen Default?
- Wer darf Projekttypen verwalten?
- Wer darf den Projekttyp eines Projekts setzen oder ändern?
- Darf ein Projekttyp nachträglich geändert werden, wenn bereits Termine, Auftragspositionen oder Anhänge existieren?
- Welche Formularfelder, Pflichtfelder und Zusatzbereiche hängen konkret am Projekttyp?
- Wie wird der bestehende stille Typ `1` fachlich benannt und sichtbar gemacht?
