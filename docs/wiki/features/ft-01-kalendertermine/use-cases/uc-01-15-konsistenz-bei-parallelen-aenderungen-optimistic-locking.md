# UC 01/15: Konsistenz bei parallelen Ã„nderungen (Optimistic Locking)

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Disponent, Administrator

## Ziel

Verhindern, dass parallele Bearbeitungen am selben Termin zu Lost Updates fÃ¼hren. Wenn zwei Benutzer denselben Termin bearbeiten, darf eine spÃ¤tere Speicherung nicht stillschweigend frÃ¼here Ã„nderungen Ã¼berschreiben. Stattdessen muss das System Versionskonflikte erkennen, die Speicherung blockieren und den Benutzer so informieren, dass er den aktuellen Stand neu laden und seine Ã„nderungen bewusst erneut anwenden kann.

## Vorbedingungen

- Der Termin existiert.
- Das System verwendet eine Versionsinformation fÃ¼r Termine, mit der Ã„nderungen gegen parallele Updates abgesichert werden.
- Zwei Benutzer kÃ¶nnen gleichzeitig auf denselben Termin zugreifen.

## Ablauf

1. Benutzer A Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Benutzer B Ã¶ffnet denselben Termin im Terminformular, ohne von der Bearbeitung von Benutzer A zu wissen.
3. Benutzer A Ã¤ndert den Termin und speichert.
4. Das System speichert die Ã„nderungen von Benutzer A und erhÃ¶ht die Versionsinformation des Termins.
5. Benutzer B Ã¤ndert den Termin auf Basis seines nun veralteten Stands und versucht zu speichern.
6. Das System erkennt anhand der Versionsinformation, dass der Stand von Benutzer B veraltet ist, und blockiert die Speicherung mit einem Versionskonflikt.
7. Das System informiert Benutzer B eindeutig Ã¼ber den Konflikt und bietet einen Weg an, den Termin neu zu laden.
8. Benutzer B lÃ¤dt den aktuellen Stand und entscheidet anschlieÃŸend bewusst, ob und wie er seine Ã„nderungen erneut anwenden mÃ¶chte.
9. Benutzer B speichert erneut, diesmal auf Basis der aktuellen Version.

## Alternativen

- Konflikt beim LÃ¶schen: Wenn Benutzer B versucht zu lÃ¶schen, wÃ¤hrend Benutzer A den Termin geÃ¤ndert hat, muss das System den LÃ¶schvorgang ebenfalls Ã¼ber einen Versionskonflikt blockieren, sodass keine unbeabsichtigte LÃ¶schung eines inzwischen geÃ¤nderten Stands erfolgt.
- Konflikt bei Mitarbeiterzuordnungen: Wenn Benutzer A die Mitarbeiterliste geÃ¤ndert hat und Benutzer B parallel ebenfalls Ã„nderungen an Mitarbeiterzuordnungen vornimmt, muss der Versionskonflikt ebenfalls greifen, sodass keine Join-Ã„nderungen verloren gehen oder teilweise Ã¼berschrieben werden.
- Abbruch: Benutzer B bricht nach Konfliktmeldung ab. Dann bleibt der Termin im Stand von Benutzer A erhalten.

## Ergebnis

Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen. Stattdessen wird ein Versionskonflikt erkannt und die zweite Speicherung blockiert, bis der Benutzer auf Basis des aktuellen Stands erneut speichert. Der Termin und die Join-Tabelle Terminâ€“Mitarbeiter bleiben konsistent, ohne Lost Updates und ohne TeilzustÃ¤nde.

