# UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)

## Metadaten

- Feature: [FT (09): Kundenverwaltung](../ft-09-kundenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/a8d8fb71a9a04a6fac413845c3d8fbad
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass bei parallelen Statusänderungen eines Kunden keine inkonsistenten Aktiv-Zustände entstehen.

## Vorbedingungen

- Ein Kunde existiert.
- Zwei Administratoren sind gleichzeitig authentifiziert.
- Beide Administratoren laden denselben Kunden mit identischer Versionskennung.
- Der Kunde befindet sich in einem definierten Ausgangszustand (`is_active = true` oder `false`).

---

### Ablauf – Beispiel: paralleles Deaktivieren

1. Administrator A öffnet die Detailansicht eines aktiven Kunden.
2. Administrator B öffnet denselben Kunden.
3. Administrator A löst „Deaktivieren“ aus.
4. Das System prüft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert und erhöht die Versionskennung.
6. Administrator B löst ebenfalls „Deaktivieren“ aus.
7. Das System prüft die Versionskennung.
8. Das System erkennt die veraltete Version.
9. Das System antwortet mit 409 (Konflikt).

---

### Ablauf – Beispiel: Deaktivieren vs. Reaktivieren

1. Administrator A öffnet einen aktiven Kunden.
2. Administrator B öffnet denselben Kunden.
3. Administrator A deaktiviert den Kunden.
4. Das System persistiert `is_active = false` und erhöht die Versionskennung.
5. Administrator B versucht, den Kunden zu reaktivieren (auf Basis veralteter Version).
6. Das System prüft die Versionskennung.
7. Das System erkennt den Konflikt.
8. Das System blockiert mit 409.

---

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

- Einer der Administratoren lädt vor dem Statuswechsel neu → kein Konflikt.
- Ein Statuswechsel wird vor dem parallelen Zugriff vollständig abgeschlossen → der zweite Vorgang wird mit aktuellem Status geprüft und ggf. als „keine Zustandsänderung“ behandelt.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Der Aktiv-Status eines Kunden ist jederzeit eindeutig und konsistent.
- Es existiert kein Zustand, in dem zwei widersprüchliche Statusänderungen gleichzeitig persistiert werden.
- Optimistic Locking gilt auch für reine Statusoperationen.

