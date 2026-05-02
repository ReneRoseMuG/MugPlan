# UC 09/16: StatusÃ¤nderung des Kunden wÃ¤hrend Notiz- oder Attachment-Operation

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass parallele StatusÃ¤nderungen eines Kunden (Deaktivieren / LÃ¶schen) keine inkonsistenten ZustÃ¤nde bei Notiz- oder Attachment-Operationen erzeugen.

## Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Akteure sind gleichzeitig authentifiziert.
- Einer der Akteure besitzt Administratorrechte.
- Der Kunde ist initial aktiv (`is_active = true`).

---

## Ablauf â€“ Beispiel 1: Notiz hinzufÃ¼gen wÃ¤hrend Deaktivierung

1. Akteur A (Disponent) Ã¶ffnet die Kundendetailansicht und beginnt, eine Notiz zu erstellen.
2. Akteur B (Administrator) deaktiviert den Kunden.
3. Das System persistiert `is_active = false` und erhÃ¶ht die Versionskennung.
4. Akteur A speichert die Notiz.
5. Das System prÃ¼ft:
    - Existenz des Kunden,
    - aktuellen Status,
    - Versionskonsistenz des Parent-Objekts.
6. Das System erlaubt die Notizspeicherung, da Deaktivierung keine fachliche Sperre fÃ¼r bestehende Stammdatenoperationen darstellt.

---

## Ablauf â€“ Beispiel 2: Notiz hinzufÃ¼gen wÃ¤hrend LÃ¶schung

1. Akteur A beginnt mit dem Erstellen einer Notiz.
2. Akteur B lÃ¶scht den Kunden gemÃ¤ÃŸ UC 13.
3. Das System entfernt den Kundendatensatz.
4. Akteur A speichert die Notiz.
5. Das System prÃ¼ft die Parent-Existenz.
6. Das System erkennt, dass der Kunde nicht mehr existiert.
7. Das System blockiert mit 404 oder 409.

---

## Ablauf â€“ Beispiel 3: Attachment-Upload wÃ¤hrend Deaktivierung

1. Akteur A startet einen Upload.
2. Akteur B deaktiviert den Kunden.
3. Das System persistiert `is_active = false`.
4. Der Upload wird abgeschlossen.
5. Das System erlaubt die Persistierung des Attachment-Datensatzes, da Deaktivierung keine Parent-LÃ¶schung darstellt.

---

## Ablauf â€“ Beispiel 4: Attachment-Upload wÃ¤hrend LÃ¶schung

1. Akteur A startet Upload.
2. Akteur B lÃ¶scht den Kunden.
3. Das System entfernt den Kundendatensatz.
4. Der Upload versucht, den Attachment-Datensatz zu persistieren.
5. Das System prÃ¼ft die Parent-Existenz.
6. Das System blockiert mit 404 oder 409.

---

### Konsistenzregeln

- Notiz- und Attachment-Operationen sind nur zulÃ¤ssig, wenn der Parent-Kunde existiert.
- Deaktivierung verhindert keine fachlich zulÃ¤ssigen Operationen auf bestehende Kunden.
- LÃ¶schung eines Kunden verhindert jede weitere Operation auf diesem Parent.
- Es dÃ¼rfen keine verwaisten Notizen oder Attachments entstehen.
- Referenzielle IntegritÃ¤t ist serverseitig garantiert.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Versionskonflikt â†’ System blockiert mit 409.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Es entstehen keine verwaisten DatensÃ¤tze.
- Deaktivierung und LÃ¶schung sind sauber voneinander abgegrenzt.
- Parent-IntegritÃ¤t bleibt auch bei parallelen Operationen gewahrt.

