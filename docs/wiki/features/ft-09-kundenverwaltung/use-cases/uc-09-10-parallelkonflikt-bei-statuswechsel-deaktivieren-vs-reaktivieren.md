# UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass bei parallelen StatusÃ¤nderungen eines Kunden keine inkonsistenten Aktiv-ZustÃ¤nde entstehen.

## Vorbedingungen

- Ein Kunde existiert.
- Zwei Administratoren sind gleichzeitig authentifiziert.
- Beide Administratoren laden denselben Kunden mit identischer Versionskennung.
- Der Kunde befindet sich in einem definierten Ausgangszustand (`is_active = true` oder `false`).

---

### Ablauf â€“ Beispiel: paralleles Deaktivieren

1. Administrator A Ã¶ffnet die Detailansicht eines aktiven Kunden.
2. Administrator B Ã¶ffnet denselben Kunden.
3. Administrator A lÃ¶st â€žDeaktivierenâ€œ aus.
4. Das System prÃ¼ft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert und erhÃ¶ht die Versionskennung.
6. Administrator B lÃ¶st ebenfalls â€žDeaktivierenâ€œ aus.
7. Das System prÃ¼ft die Versionskennung.
8. Das System erkennt die veraltete Version.
9. Das System antwortet mit 409 (Konflikt).

---

### Ablauf â€“ Beispiel: Deaktivieren vs. Reaktivieren

1. Administrator A Ã¶ffnet einen aktiven Kunden.
2. Administrator B Ã¶ffnet denselben Kunden.
3. Administrator A deaktiviert den Kunden.
4. Das System persistiert `is_active = false` und erhÃ¶ht die Versionskennung.
5. Administrator B versucht, den Kunden zu reaktivieren (auf Basis veralteter Version).
6. Das System prÃ¼ft die Versionskennung.
7. Das System erkennt den Konflikt.
8. Das System blockiert mit 409.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Einer der Administratoren lÃ¤dt vor dem Statuswechsel neu â†’ kein Konflikt.
- Ein Statuswechsel wird vor dem parallelen Zugriff vollstÃ¤ndig abgeschlossen â†’ der zweite Vorgang wird mit aktuellem Status geprÃ¼ft und ggf. als â€žkeine ZustandsÃ¤nderungâ€œ behandelt.
- Technischer Fehler â†’ System antwortet mit 500.

---

## Ergebnis

- Der Aktiv-Status eines Kunden ist jederzeit eindeutig und konsistent.
- Es existiert kein Zustand, in dem zwei widersprÃ¼chliche StatusÃ¤nderungen gleichzeitig persistiert werden.
- Optimistic Locking gilt auch fÃ¼r reine Statusoperationen.

