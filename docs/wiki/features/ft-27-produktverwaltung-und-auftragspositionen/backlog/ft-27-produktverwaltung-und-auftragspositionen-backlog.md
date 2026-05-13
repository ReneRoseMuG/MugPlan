# FT (27) Backlog

## BL-27-01: Detailseiten und Attachments für Produkte und Komponenten

- **Status:** Offen
- **Priorität:** Mittel

### Beschreibung

Produkte und Komponenten erhalten jeweils eine Detailseite, die alle Stammdatenfelder strukturiert darstellt. Zusätzlich wird eine Attachment-Funktion integriert, über die technische Dokumente (z. B. Zeichnungen, Montageanleitungen, Aufstellungspläne) pro Produkt oder Komponente abgelegt werden können.

Die Attachment-Infrastruktur basiert vollständig auf FT-19. Es sind zwei neue Tabellen erforderlich (`product_attachments`, `component_attachments`). Upload und Löschen sind Administratoren vorbehalten, Download steht auch Disponenten zur Verfügung.

### Betroffene Use Cases

- UC 27/08: Detailseite anzeigen (Produkt / Komponente)
- UC 27/09: Attachment hochladen (Admin)
- UC 27/10: Attachment löschen (Admin)

### Abhängigkeiten

- FT-19 (Attachments): Infrastruktur wird übernommen, neue Domänen `product` und `component` werden ergänzt.
