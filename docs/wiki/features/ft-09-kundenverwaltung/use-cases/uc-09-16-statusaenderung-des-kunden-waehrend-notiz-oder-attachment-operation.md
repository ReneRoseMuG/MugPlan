# UC 09/16: Statusänderung des Kunden während Notiz- oder Attachment-Operation

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass parallele Statusänderungen eines Kunden (Deaktivieren / Löschen) keine inkonsistenten Zustände bei Notiz- oder Attachment-Operationen erzeugen.

## Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Akteure sind gleichzeitig authentifiziert.
- Einer der Akteure besitzt Administratorrechte.
- Der Kunde ist initial aktiv (`is_active = true`).

---

## Ablauf – Beispiel 1: Notiz hinzufügen während Deaktivierung

1. Akteur A (Disponent) öffnet die Kundendetailansicht und beginnt, eine Notiz zu erstellen.
2. Akteur B (Administrator) deaktiviert den Kunden.
3. Das System persistiert `is_active = false` und erhöht die Versionskennung.
4. Akteur A speichert die Notiz.
5. Das System prüft:
    - Existenz des Kunden,
    - aktuellen Status,
    - Versionskonsistenz des Parent-Objekts.
6. Das System erlaubt die Notizspeicherung, da Deaktivierung keine fachliche Sperre für bestehende Stammdatenoperationen darstellt.

---

## Ablauf – Beispiel 2: Notiz hinzufügen während Löschung

1. Akteur A beginnt mit dem Erstellen einer Notiz.
2. Akteur B löscht den Kunden gemäÃŸ UC 13.
3. Das System entfernt den Kundendatensatz.
4. Akteur A speichert die Notiz.
5. Das System prüft die Parent-Existenz.
6. Das System erkennt, dass der Kunde nicht mehr existiert.
7. Das System blockiert mit 404 oder 409.

---

## Ablauf – Beispiel 3: Attachment-Upload während Deaktivierung

1. Akteur A startet einen Upload.
2. Akteur B deaktiviert den Kunden.
3. Das System persistiert `is_active = false`.
4. Der Upload wird abgeschlossen.
5. Das System erlaubt die Persistierung des Attachment-Datensatzes, da Deaktivierung keine Parent-Löschung darstellt.

---

## Ablauf – Beispiel 4: Attachment-Upload während Löschung

1. Akteur A startet Upload.
2. Akteur B löscht den Kunden.
3. Das System entfernt den Kundendatensatz.
4. Der Upload versucht, den Attachment-Datensatz zu persistieren.
5. Das System prüft die Parent-Existenz.
6. Das System blockiert mit 404 oder 409.

---

### Konsistenzregeln

- Notiz- und Attachment-Operationen sind nur zulässig, wenn der Parent-Kunde existiert.
- Deaktivierung verhindert keine fachlich zulässigen Operationen auf bestehende Kunden.
- Löschung eines Kunden verhindert jede weitere Operation auf diesem Parent.
- Es dürfen keine verwaisten Notizen oder Attachments entstehen.
- Referenzielle Integrität ist serverseitig garantiert.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Versionskonflikt → System blockiert mit 409.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Es entstehen keine verwaisten Datensätze.
- Deaktivierung und Löschung sind sauber voneinander abgegrenzt.
- Parent-Integrität bleibt auch bei parallelen Operationen gewahrt.

