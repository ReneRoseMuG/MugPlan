# UC 09/15: Konsistenz von Kundenlisten bei StatusÃ¤nderung (Multi-Browser)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Kundenlisten bei StatusÃ¤nderungen (Deaktivieren / Reaktivieren / LÃ¶schen) konsistent bleiben und keine veralteten ZustÃ¤nde persistieren.

## Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Browser-Sitzungen sind aktiv.
- Mindestens ein Akteur besitzt Administratorrechte.

---

### Ablauf â€“ Beispiel: Deaktivieren in Browser A

1. Browser A (Administrator) Ã¶ffnet die Kundendetailansicht eines aktiven Kunden.
2. Browser B (Disponent) zeigt eine Kundenliste mit diesem Kunden an.
3. Administrator in Browser A deaktiviert den Kunden.
4. Das System setzt `is_active = false` und persistiert die Ã„nderung.
5. Browser B fÃ¼hrt eine erneute Abfrage der Kundenliste aus (z. B. durch Seitenwechsel, Filterwechsel oder explizites Neuladen).
6. Das System liefert serverseitig gefilterte Daten gemÃ¤ÃŸ Rolle.
7. Der deaktivierte Kunde erscheint nicht mehr in der Liste des Disponenten.

---

### Ablauf â€“ Beispiel: LÃ¶schen

1. Administrator lÃ¶scht einen Kunden ohne Referenzen (UC 13).
2. Ein anderer Browser versucht, denselben Kunden erneut zu laden.
3. Das System prÃ¼ft Existenz.
4. Das System antwortet mit 404.

---

### Konsistenzregeln

- Die Datenquelle ist ausschlieÃŸlich serverseitig maÃŸgeblich.
- Es existiert keine clientseitige Cache-Logik, die serverseitige Filter Ã¼bersteuern darf.
- Jede neue Anfrage muss den aktuellen Persistenzzustand widerspiegeln.
- Es ist nicht erforderlich, dass andere Browser aktiv gepusht werden; Konsistenz ist spÃ¤testens bei der nÃ¤chsten Serverabfrage garantiert.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Browser verwendet veralteten lokalen Zustand â†’ bei nÃ¤chster Serveranfrage wird Zustand korrigiert.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Kundenlisten sind rollenabhÃ¤ngig und statusabhÃ¤ngig konsistent.
- Es entstehen keine dauerhaft sichtbaren veralteten ZustÃ¤nde.
- GelÃ¶schte oder deaktivierte Kunden kÃ¶nnen nicht dauerhaft angezeigt werden.

