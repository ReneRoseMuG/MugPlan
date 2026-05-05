# UC 09/11: Rollenabhängige Filterung von Kundenlisten

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Kundenlisten serverseitig rollenabhängig gefiltert werden und Disponenten ausschließlich aktive Kunden sehen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Mindestens ein aktiver oder inaktiver Kunde existiert.

---

### Ablauf – Disponent

1. Der Akteur mit Rolle Disponent ruft die Kundenliste auf.
2. Das System ermittelt die Rolle des Akteurs.
3. Das System führt eine serverseitige Abfrage aus, die ausschließlich Kunden mit `is_active = true` berücksichtigt.
4. Das System liefert die gefilterte Liste zurück.
5. Die UI zeigt ausschließlich aktive Kunden an.

---

### Ablauf – Administrator

1. Der Akteur mit Rolle Administrator ruft die Kundenliste auf.
2. Das System erkennt die Rolle Administrator.
3. Das System führt eine Abfrage ohne Aktiv-Filter aus oder ermöglicht eine explizite Filterauswahl.
4. Das System liefert aktive und inaktive Kunden zurück.
5. Die UI kennzeichnet inaktive Kunden eindeutig.

---

### Query-Vertrag

- Die Filterung erfolgt serverseitig.
- Ein Disponent kann durch Manipulation der UI oder Query-Parameter keine inaktiven Kunden erhalten.
- Die API muss rollenabhängig prüfen und darf sich nicht auf clientseitige Filter verlassen.

---

## Ablauf


## Alternativen

- Keine Kunden vorhanden → System liefert leere Liste.
- Akteur nicht authentifiziert → System antwortet mit 401.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Disponenten sehen ausschließlich aktive Kunden.
- Administratoren sehen vollständige Daten.
- Die Datenintegrität ist unabhängig vom Client garantiert.
