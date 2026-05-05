# FT (03) Backlog

## FT-03: Kartenansicht (Termin- und Tourvisualisierung)

Quelle: https://www.notion.so/33bda094354e8148b4e2e6f00241a41a

Status: Backlog / nicht begonnen

Herkunft: ehemaliges FT-22, fachlich zu FT (03): Kalenderansichten zurückgestuft.

### Ziel / Zweck

Die bestehende Kalenderansicht soll um eine räumliche Visualisierungsebene erweitert werden.

Termine und Touren sollen auf einer Kartenansicht dargestellt werden, damit geografische Zusammenhänge, räumliche Ballungen und Tourverteilungen besser erkennbar sind. Die Kartenansicht dient ausschließlich der visuellen Orientierung und verändert keine fachlichen Daten.

### Fachliche Beschreibung

Die Kartenansicht stellt Termine als Marker auf einer OpenStreetMap-basierten Karte dar. Grundlage der Positionierung ist die Adresse des dem Termin zugeordneten Kunden.

Die Adresse soll serverseitig zur Laufzeit geokodiert werden. Die ermittelten Koordinaten werden nach aktuellem Backlog-Stand nicht persistent gespeichert, sondern nur für die Darstellung verwendet.

Die Darstellung berücksichtigt folgende fachliche Beziehungen:

- Termin -> Projekt -> Kunde -> Adresse
- Termin -> Tour -> Tourfarbe
- Termin -> Mitarbeiter

Marker übernehmen die Farbe der zugeordneten Tour. Termine ohne Tour werden in einer neutralen Standardfarbe dargestellt. Mehrere Termine an derselben Adresse können als überlagerte Marker oder als Cluster-Marker erscheinen.

Die Kartenansicht soll dieselben Filtermechanismen wie Kalender- und Terminlistenansicht verwenden. Angezeigt werden ausschließlich die aktuell gefilterten Termine.

### Regeln & Randbedingungen

- Die Kartenansicht ist rein lesend.
- Über die Kartenansicht können keine Termine erstellt, bearbeitet oder gelöscht werden.
- Es findet keine Routenberechnung statt.
- Es findet keine Entfernungsberechnung statt.
- Es findet keine Optimierung oder Bewertung von Touren statt.
- Geokodierung erfolgt ausschließlich serverseitig.
- Kundendaten werden nicht persistent verändert.
- Fehlgeschlagene Geokodierung darf nicht zu Datenverlust führen.
- Termine ohne erfolgreich ermittelbare Koordinaten werden nicht angezeigt oder klar als nicht lokalisierbar gekennzeichnet.
- Rollen und Sichtbarkeit sind vor Umsetzung serverseitig zu klären; eine reine UI-Sichtbarkeit reicht nicht aus.

### Erwartete Darstellung

Jeder Termin wird als Marker dargestellt. Ein Tooltip oder Popup soll mindestens folgende Informationen anzeigen:

- Kundennummer
- Kundenname
- Postleitzahl
- Projekttitel
- Terminzeitraum
- Zugeordnete Tour
- Zugeordnete Mitarbeiter

Die Karte ist verschiebbar, zoombar und frei navigierbar. Die initiale Ansicht orientiert sich an der geografischen Mitte der angezeigten Termine oder an einem definierten Standardbereich.

### Zurückgestellte Use Cases aus Notion

Die folgenden Use Cases stammen aus dem zurückgestuften Notion-Feature und bleiben als Backlog-Hinweis erhalten, ohne bereits als lokale Use-Case-Dateien geführt zu werden:

- Kartenansicht anzeigen
- Kartenansicht nach Tour filtern
- Marker-Details anzeigen

### Offene Klärungen

- Welche Rollen dürfen die Kartenansicht sehen?
- Welche Daten dürfen im Marker-Popup je Rolle angezeigt werden?
- Welcher Geokodierungsdienst ist zulässig und wie werden Datenschutz, Rate Limits und Fehlerfälle behandelt?
- Sollen Koordinaten bewusst nicht gespeichert bleiben oder ist später ein Cache erforderlich?
- Wie werden nicht lokalisierbare Termine in der Oberfläche sichtbar gemacht?
- Wie verhält sich die Kartenansicht zu Druckansichten und Reports aus FT (26)?
