# UC 09/13: Kunde löschen ohne Referenzen

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Administrator

## Ziel

Einen Kunden endgültig löschen, sofern keine referenzierenden Projekte existieren, ohne inkonsistente Zustände zu erzeugen.

## Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden sind **keine Projekte** zugeordnet.
- Eine gültige Versionskennung liegt vor.

---

## Ablauf

1. Der Administrator öffnet die Detailansicht des Kunden.
2. Der Administrator löst die Aktion „Löschen“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - ob referenzierende Projekte existieren.
4. Das System stellt fest, dass keine Projekte referenzieren.
5. Das System löscht den Kundendatensatz.
6. Das System löscht alle zugehörigen Notizen über CASCADE (`customer_note`).
7. Das System entfernt alle Attachment-Referenzen zum Kunden (Dateien verbleiben gemäß globaler Regel physisch bestehen, sofern kein anderes Löschkonzept definiert ist).
8. Das System bestätigt die Löschung.

---

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Referenzierende Projekte vorhanden → System blockiert mit 409 (siehe UC 14).
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Der Kunde existiert nicht mehr im System.
- Es existieren keine verwaisten Notizen oder Attachment-Referenzen.
- Es existieren keine Projekte oder Termine, die auf einen gelöschten Kunden verweisen.
- Der Datenzustand bleibt konsistent.
