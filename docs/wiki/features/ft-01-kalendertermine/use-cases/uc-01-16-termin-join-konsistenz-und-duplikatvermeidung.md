# UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Sicherstellen, dass Zuordnungen zwischen Termin und Mitarbeitern deterministisch und konsistent bleiben. Insbesondere dÃ¼rfen keine Duplikate in der Join-Tabelle Terminâ€“Mitarbeiter entstehen, und wiederholte Eingaben oder mehrfache Anwendung von EinfÃ¼gehilfen dÃ¼rfen nicht zu instabilen oder inkonsistenten Mitarbeiterlisten fÃ¼hren.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Es existieren Mitarbeiter.
- Optional: Es existiert ein Team mit mindestens einem Mitarbeiter.
- Optional: Es existiert eine Tour mit mindestens einem Mitarbeiter.

## Ablauf

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur fÃ¼hrt eine oder mehrere Zuweisungsaktionen aus, zum Beispiel:
    1. denselben Mitarbeiter mehrfach hinzufÃ¼gen,
    2. ein Team als EinfÃ¼gehilfe mehrfach anwenden,
    3. eine Tour zuweisen oder die Tour wechseln,
    4. Mitarbeiter manuell hinzufÃ¼gen und anschlieÃŸend wieder entfernen.
3. Das System aktualisiert die Mitarbeiterliste des Termins gemÃ¤ÃŸ den fachlichen Regeln.
4. Das System speichert den Termin.
5. Das System stellt sicher, dass die Persistenz konsistent ist, insbesondere in der Join-Tabelle Terminâ€“Mitarbeiter.

## Alternativen

- Wiederholte Auswahl desselben Mitarbeiters: Wenn der Akteur denselben Mitarbeiter erneut auswÃ¤hlt, muss das System entweder die Auswahl verhindern oder die Aktion als No-op behandeln. In keinem Fall darf ein Duplikat entstehen.
- Mehrfaches Anwenden derselben EinfÃ¼gehilfe: Wenn Team oder Tour wiederholt angewendet wird, muss das Ergebnis deterministisch bleiben, ohne doppelte Join-EintrÃ¤ge und ohne instabile Reihenfolgen, und die Mitarbeiterliste muss den definierten Regeln entsprechen.
- Abbruch: Wenn der Akteur abbricht, werden keine Ã„nderungen gespeichert und es entstehen keine ZwischenzustÃ¤nde in der Join-Tabelle.

## Ergebnis

Die Mitarbeiterzuordnungen eines Termins sind konsistent und duplikatfrei. FÃ¼r jede Kombination aus Termin und Mitarbeiter existiert hÃ¶chstens ein Join-Eintrag. Wiederholte Eingaben, Mehrfachklicks oder erneute Anwendung von EinfÃ¼gehilfen erzeugen keine inkonsistenten ZustÃ¤nde. Die abhÃ¤ngigen Sichten zeigen denselben konsistenten Zustand, der in der Join-Tabelle persistiert ist.

