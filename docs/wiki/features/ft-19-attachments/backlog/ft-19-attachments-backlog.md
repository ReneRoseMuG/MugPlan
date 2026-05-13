# FT (19) Backlog

## BL-19-01: Attachment-Unterstützung für Produkte und Komponenten

- **Status:** Offen
- **Priorität:** Mittel

### Beschreibung

Die bestehende Attachment-Infrastruktur wird um zwei neue Parent-Domänen erweitert: `product` (Produkte) und `component` (Komponenten). Dazu werden die Tabellen `product_attachments` und `component_attachments` nach dem bestehenden Strukturmuster angelegt. Alle Upload-, Download- und Lösch-Regeln aus FT-19 gelten unverändert.

### Abhängigkeiten

- FT-27 (Produktverwaltung und Auftragspositionen): treibt diese Erweiterung, Backlog-Item BL-27-01.
