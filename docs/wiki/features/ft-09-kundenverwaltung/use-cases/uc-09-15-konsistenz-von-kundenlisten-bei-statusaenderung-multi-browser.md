# UC 09/15: Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../feature.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Kundenlisten bei Statusänderungen (Deaktivieren / Reaktivieren / Löschen) konsistent bleiben und keine veralteten Zustände persistieren.

## Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Browser-Sitzungen sind aktiv.
- Mindestens ein Akteur besitzt Administratorrechte.

---

### Ablauf – Beispiel: Deaktivieren in Browser A

1. Browser A (Administrator) öffnet die Kundendetailansicht eines aktiven Kunden.
2. Browser B (Disponent) zeigt eine Kundenliste mit diesem Kunden an.
3. Administrator in Browser A deaktiviert den Kunden.
4. Das System setzt `is_active = false` und persistiert die Änderung.
5. Browser B führt eine erneute Abfrage der Kundenliste aus (z. B. durch Seitenwechsel, Filterwechsel oder explizites Neuladen).
6. Das System liefert serverseitig gefilterte Daten gemäß Rolle.
7. Der deaktivierte Kunde erscheint nicht mehr in der Liste des Disponenten.

---

### Ablauf – Beispiel: Löschen

1. Administrator löscht einen Kunden ohne Referenzen (UC 13).
2. Ein anderer Browser versucht, denselben Kunden erneut zu laden.
3. Das System prüft Existenz.
4. Das System antwortet mit 404.

---

### Konsistenzregeln

- Die Datenquelle ist ausschließlich serverseitig maßgeblich.
- Es existiert keine clientseitige Cache-Logik, die serverseitige Filter übersteuern darf.
- Jede neue Anfrage muss den aktuellen Persistenzzustand widerspiegeln.
- Es ist nicht erforderlich, dass andere Browser aktiv gepusht werden; Konsistenz ist spätestens bei der nächsten Serverabfrage garantiert.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Browser verwendet veralteten lokalen Zustand → bei nächster Serveranfrage wird Zustand korrigiert.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Kundenlisten sind rollenabhängig und statusabhängig konsistent.
- Es entstehen keine dauerhaft sichtbaren veralteten Zustände.
- Gelöschte oder deaktivierte Kunden können nicht dauerhaft angezeigt werden.
