# UC 09/11: RollenabhÃ¤ngige Filterung von Kundenlisten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Kundenlisten serverseitig rollenabhÃ¤ngig gefiltert werden und Disponenten ausschlieÃŸlich aktive Kunden sehen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Mindestens ein aktiver oder inaktiver Kunde existiert.

---

### Ablauf â€“ Disponent

1. Der Akteur mit Rolle Disponent ruft die Kundenliste auf.
2. Das System ermittelt die Rolle des Akteurs.
3. Das System fÃ¼hrt eine serverseitige Abfrage aus, die ausschlieÃŸlich Kunden mit `is_active = true` berÃ¼cksichtigt.
4. Das System liefert die gefilterte Liste zurÃ¼ck.
5. Die UI zeigt ausschlieÃŸlich aktive Kunden an.

---

### Ablauf â€“ Administrator

1. Der Akteur mit Rolle Administrator ruft die Kundenliste auf.
2. Das System erkennt die Rolle Administrator.
3. Das System fÃ¼hrt eine Abfrage ohne Aktiv-Filter aus oder ermÃ¶glicht eine explizite Filterauswahl.
4. Das System liefert aktive und inaktive Kunden zurÃ¼ck.
5. Die UI kennzeichnet inaktive Kunden eindeutig.

---

### Query-Vertrag

- Die Filterung erfolgt serverseitig.
- Ein Disponent kann durch Manipulation der UI oder Query-Parameter keine inaktiven Kunden erhalten.
- Die API muss rollenabhÃ¤ngig prÃ¼fen und darf sich nicht auf clientseitige Filter verlassen.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Keine Kunden vorhanden â†’ System liefert leere Liste.
- Akteur nicht authentifiziert â†’ System antwortet mit 401.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Disponenten sehen ausschlieÃŸlich aktive Kunden.
- Administratoren sehen vollstÃ¤ndige Daten.
- Die DatenintegritÃ¤t ist unabhÃ¤ngig vom Client garantiert.

