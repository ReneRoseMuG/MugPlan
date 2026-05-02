# UC 09/13: Kunde lÃ¶schen ohne Referenzen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Einen Kunden endgÃ¼ltig lÃ¶schen, sofern keine referenzierenden Projekte existieren, ohne inkonsistente ZustÃ¤nde zu erzeugen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden sind **keine Projekte** zugeordnet.
- Eine gÃ¼ltige Versionskennung liegt vor.

---

## Ablauf

1. Der Administrator Ã¶ffnet die Detailansicht des Kunden.
2. Der Administrator lÃ¶st die Aktion â€žLÃ¶schenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - ob referenzierende Projekte existieren.
4. Das System stellt fest, dass keine Projekte referenzieren.
5. Das System lÃ¶scht den Kundendatensatz.
6. Das System lÃ¶scht alle zugehÃ¶rigen Notizen Ã¼ber CASCADE (`customer_note`).
7. Das System entfernt alle Attachment-Referenzen zum Kunden (Dateien verbleiben gemÃ¤ÃŸ globaler Regel physisch bestehen, sofern kein anderes LÃ¶schkonzept definiert ist).
8. Das System bestÃ¤tigt die LÃ¶schung.

---

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Referenzierende Projekte vorhanden â†’ System blockiert mit 409 (siehe UC 14).
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Der Kunde existiert nicht mehr im System.
- Es existieren keine verwaisten Notizen oder Attachment-Referenzen.
- Es existieren keine Projekte oder Termine, die auf einen gelÃ¶schten Kunden verweisen.
- Der Datenzustand bleibt konsistent.

