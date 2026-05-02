# UC 01/15: Konsistenz bei parallelen Änderungen (Optimistic Locking)

## Metadaten

- Feature: [FT (01): Kalendertermine](../feature.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Verhindern, dass parallele Bearbeitungen am selben Termin zu Lost Updates führen. Wenn zwei Benutzer denselben Termin bearbeiten, darf eine spätere Speicherung nicht stillschweigend frühere Änderungen überschreiben. Stattdessen muss das System Versionskonflikte erkennen, die Speicherung blockieren und den Benutzer so informieren, dass er den aktuellen Stand neu laden und seine Änderungen bewusst erneut anwenden kann.

## Vorbedingungen

- Der Termin existiert.
- Das System verwendet eine Versionsinformation für Termine, mit der Änderungen gegen parallele Updates abgesichert werden.
- Zwei Benutzer können gleichzeitig auf denselben Termin zugreifen.

## Ablauf

1. Benutzer A öffnet einen bestehenden Termin im Terminformular.
2. Benutzer B öffnet denselben Termin im Terminformular, ohne von der Bearbeitung von Benutzer A zu wissen.
3. Benutzer A ändert den Termin und speichert.
4. Das System speichert die Änderungen von Benutzer A und erhöht die Versionsinformation des Termins.
5. Benutzer B ändert den Termin auf Basis seines nun veralteten Stands und versucht zu speichern.
6. Das System erkennt anhand der Versionsinformation, dass der Stand von Benutzer B veraltet ist, und blockiert die Speicherung mit einem Versionskonflikt.
7. Das System informiert Benutzer B eindeutig über den Konflikt und bietet einen Weg an, den Termin neu zu laden.
8. Benutzer B lädt den aktuellen Stand und entscheidet anschließend bewusst, ob und wie er seine Änderungen erneut anwenden möchte.
9. Benutzer B speichert erneut, diesmal auf Basis der aktuellen Version.

## Alternativen

- Konflikt beim Löschen: Wenn Benutzer B versucht zu löschen, während Benutzer A den Termin geändert hat, muss das System den Löschvorgang ebenfalls über einen Versionskonflikt blockieren, sodass keine unbeabsichtigte Löschung eines inzwischen geänderten Stands erfolgt.
- Konflikt bei Mitarbeiterzuordnungen: Wenn Benutzer A die Mitarbeiterliste geändert hat und Benutzer B parallel ebenfalls Änderungen an Mitarbeiterzuordnungen vornimmt, muss der Versionskonflikt ebenfalls greifen, sodass keine Join-Änderungen verloren gehen oder teilweise überschrieben werden.
- Abbruch: Benutzer B bricht nach Konfliktmeldung ab. Dann bleibt der Termin im Stand von Benutzer A erhalten.

## Ergebnis

Parallele Änderungen führen nicht zu stillen Überschreibungen. Stattdessen wird ein Versionskonflikt erkannt und die zweite Speicherung blockiert, bis der Benutzer auf Basis des aktuellen Stands erneut speichert. Der Termin und die Join-Tabelle Termin–Mitarbeiter bleiben konsistent, ohne Lost Updates und ohne Teilzustände.
