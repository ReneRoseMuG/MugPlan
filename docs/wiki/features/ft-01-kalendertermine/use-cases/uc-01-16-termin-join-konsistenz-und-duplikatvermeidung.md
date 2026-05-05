# UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Zuordnungen zwischen Termin und Mitarbeitern deterministisch und konsistent bleiben. Insbesondere dürfen keine Duplikate in der Join-Tabelle Termin–Mitarbeiter entstehen, und wiederholte Eingaben oder mehrfache Anwendung von Einfügehilfen dürfen nicht zu instabilen oder inkonsistenten Mitarbeiterlisten führen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Es existieren Mitarbeiter.
- Optional: Es existiert ein Team mit mindestens einem Mitarbeiter.
- Optional: Es existiert eine Tour mit mindestens einem Mitarbeiter.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur führt eine oder mehrere Zuweisungsaktionen aus, zum Beispiel:
    1. denselben Mitarbeiter mehrfach hinzufügen,
    2. ein Team als Einfügehilfe mehrfach anwenden,
    3. eine Tour zuweisen oder die Tour wechseln,
    4. Mitarbeiter manuell hinzufügen und anschließend wieder entfernen.
3. Das System aktualisiert die Mitarbeiterliste des Termins gemäß den fachlichen Regeln.
4. Das System speichert den Termin.
5. Das System stellt sicher, dass die Persistenz konsistent ist, insbesondere in der Join-Tabelle Termin–Mitarbeiter.

## Alternativen

- Wiederholte Auswahl desselben Mitarbeiters: Wenn der Akteur denselben Mitarbeiter erneut auswählt, muss das System entweder die Auswahl verhindern oder die Aktion als No-op behandeln. In keinem Fall darf ein Duplikat entstehen.
- Mehrfaches Anwenden derselben Einfügehilfe: Wenn Team oder Tour wiederholt angewendet wird, muss das Ergebnis deterministisch bleiben, ohne doppelte Join-Einträge und ohne instabile Reihenfolgen, und die Mitarbeiterliste muss den definierten Regeln entsprechen.
- Abbruch: Wenn der Akteur abbricht, werden keine Änderungen gespeichert und es entstehen keine Zwischenzustände in der Join-Tabelle.

## Ergebnis

Die Mitarbeiterzuordnungen eines Termins sind konsistent und duplikatfrei. Für jede Kombination aus Termin und Mitarbeiter existiert höchstens ein Join-Eintrag. Wiederholte Eingaben, Mehrfachklicks oder erneute Anwendung von Einfügehilfen erzeugen keine inkonsistenten Zustände. Die abhängigen Sichten zeigen denselben konsistenten Zustand, der in der Join-Tabelle persistiert ist.
