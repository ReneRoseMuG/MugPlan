# UC 02/16: Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)

## Metadaten

- Feature: [FT (02): Projekte](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e80648c40dc62565d437e
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Administrator

## Ziel

Sicherstellen, dass der Kundenwert eines Projekts stabil bleibt, sobald Termine existieren, und dass Konsistenz zwischen Projekt-Kunde und Termin-Kunden garantiert ist.

## Vorbedingungen

- Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Administratorrechte.
- Projekt ist einem Kunden zugeordnet.
- Optional: Dem Projekt sind Termine zugeordnet.

### **Invarianten**

1. **Readonly-Regel:** Wenn ein Projekt mindestens einen Termin hat, ist der Kundenwert des Projekts **readonly**. Ein Kundenwechsel ist nicht zulässig.
2. **Konsistenzregel:** Alle Termine eines Projekts müssen denselben Kundenwert haben wie das Projekt. Dies ist eine Invariante ohne Ausnahme.
3. **Lösch-Blockade:** Ein Projekt kann nur gelöscht werden, wenn es keine Termine besitzt (analog zur Readonly-Regel).

### **Ablauf – Beispiel 1: Projekt mit Terminen hat readonly Kunden**

1. Projekt P existiert mit Kunde K.
2. Termin T wird Projekt P zugewiesen (Kundenwert von T muss K sein, siehe UC 01/02).
3. Administrator versucht, den Kunden von Projekt P zu wechseln.
4. System erkennt: Projekt hat Termin → readonly.
5. System blockiert Kundenwechsel mit Fehlermeldung.

### **Ablauf – Beispiel 2: Projekt ohne Termine erlaubt Kundenwechsel**

1. Projekt P existiert mit Kunde K.
2. Projekt P hat keine Termine.
3. Administrator wechselt Kunde zu K'.
4. System prüft: Keine Termine vorhanden → Wechsel ist zulässig.
5. System speichert neue Kundenreferenz.

### **Ablauf – Beispiel 3: Termin-Anlage mit Projekt erzwingt Kundenwert**

1. Administrator legt Termin an, wählt Kunde K und Projekt P.
2. System prüft: Ist K == P.customer_id?
3. Falls nein: System blockiert mit Fehlermeldung (siehe UC 01/02).
4. Falls ja: System speichert Termin mit konsistenten Werten.
5. Nach Speicherung: Projekt P wird readonly für Kundenwechsel.

## Ablauf

Nicht angegeben in der Notion-Quelle.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Projekt-Kundenwerte sind stabil und unveränderbar, sobald Termine existieren.
- Alle Termine eines Projekts haben garantiert denselben Kundenwert wie das Projekt.
- Keine verwaisten oder inkonsistenten Projekt-Termin-Kunde-Beziehungen entstehen.
- Administratoren wissen eindeutig: Wer ein Projekt bearbeiten will, muss zuerst prüfen, ob Termine existieren.
