# UC 01/03: Termin verschieben

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Einen bestehenden Termin auf ein anderes Datum verschieben, ohne die Uhrzeit unbeabsichtigt zu verÃ¤ndern und ohne fachliche Inkonsistenzen oder MitarbeiterÃ¼berschneidungen zu erzeugen. Der Use Case umfasst sowohl das Verschieben Ã¼ber das Terminformular als auch das Verschieben per Drag-and-drop im Kalender.

## Vorbedingungen

- Der Termin existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte (Disponent oder Administrator).
- **Rollenbasierte DatumsbeschrÃ¤nkung:** Disponenten dÃ¼rfen Termine nicht in die Vergangenheit verschieben und kÃ¶nnen keine historischen Termine verschieben. Administratoren dÃ¼rfen Termine auf beliebige Datumsangaben verschieben â€” einschlieÃŸlich Vergangenheit.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Die zugehÃ¶rigen Mitarbeiterzuordnungen sind vorhanden oder der Termin hat keine zugeordneten Mitarbeiter.
- Optional: Der Termin ist einer Tour zugeordnet.

## Ablauf

1. Der Akteur verschiebt den Termin auf einen anderen Tag, entweder Ã¼ber das Terminformular oder per Drag-and-drop im Kalender.
2. Wenn der Termin Ã¼ber das Terminformular verschoben wird, editiert der Akteur Startdatum und optional Enddatum.
3. Wenn der Termin per Drag-and-drop verschoben wird, verschiebt der Akteur den Termin im Kalender auf den gewÃ¼nschten Tag.
    1. Das System darf dabei die bestehende Startuhrzeit nicht unbeabsichtigt verÃ¤ndern, sondern Ã¼bernimmt die Uhrzeit unverÃ¤ndert.
4. Das System fÃ¼hrt die ÃœberschneidungsprÃ¼fung fÃ¼r alle dem Termin zugeordneten Mitarbeiter durch.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin nach dem Verschieben umfasst.
5. Eine evtl. vorhandene Tour Zuordnung bleibt erhalten. Das Verschieben des Termins per D&D auf eine andere Tour ist nicht mÃ¶glich.
6. Das System speichert den Termin mit dem neuen Datum beziehungsweise Zeitraum.
7. Das System aktualisiert die Kalenderansichten und alle relevanten Sichten, die den Termin anzeigen.

## Alternativen

- Ãœberschneidung erkannt: Das System blockiert das Verschieben und zeigt einen Konflikt an. Der Termin bleibt unverÃ¤ndert auf dem ursprÃ¼nglichen Datum, und es entstehen keine TeilÃ¤nderungen an Termin oder Join-EintrÃ¤gen.
- KW-Wechsel mit Wochenplanung: Wenn das Verschieben zu einem Wechsel der Kalenderwoche fÃ¼hrt und fÃ¼r die alte oder neue Tour-KW-Kombination WochenplanungseintrÃ¤ge vorhanden sind, zeigt das System vor dem Speichern einen Vorschau-Dialog: welche Mitarbeiter aus der alten KW entfernt werden, welche aus der neuen KW hinzugefÃ¼gt werden, welche Konflikte bestehen, welche Mitarbeiter unverÃ¤ndert bleiben. Erst nach BestÃ¤tigung wird der Termin gespeichert. Bei Abbruch wird der Termin nicht verschoben.
- Abbruch: Der Akteur bricht den Vorgang ab. Der Termin bleibt unverÃ¤ndert.
- Historischer Zeitraum (nur Disponent): Wenn ein Disponent einen Termin auf ein Datum in der Vergangenheit verschieben wÃ¼rde oder einen historischen Termin verschieben mÃ¶chte, blockiert das System mit HTTP 409 PAST_APPOINTMENT_READONLY. Es wird nichts gespeichert. Administratoren dÃ¼rfen Termine auf beliebige Datumsangaben â€” einschlieÃŸlich Vergangenheit â€” verschieben.

## Ergebnis

Der Termin ist auf das neue Datum beziehungsweise den neuen Zeitraum verschoben und bleibt weiterhin fachlich gÃ¼ltig. Ein vorhandener Projektbezug bleibt erhalten; andernfalls bleibt der direkte Kundenbezug erhalten. Die Uhrzeit ist nach einem mausgesteuerten Verschieben unverÃ¤ndert geblieben. Alle Mitarbeiterzuordnungen bleiben konsistent als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter erhalten, sofern das Verschieben erfolgreich war.

Der Termin erscheint in der neuen Tages- beziehungsweise Wochen-Sicht und ist in der alten Sicht nicht mehr vorhanden. FÃ¼r alle zugeordneten Mitarbeiter ist der Termin in der Mitarbeiter-Terminliste sichtbar, und wenn der Termin einer Tour zugeordnet ist, ist er auch in der Tour-Terminliste sichtbar.

