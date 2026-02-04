# SidebarChildPanel

## Zweck
SidebarChildPanel ist eine reine Kompositions- und Layout-Komponente für Child-Collections innerhalb von Formularen oder Detailansichten (z. B. Termine, Projekte, Dokumente, Projekt-Status). Sie stellt eine standardisierte Kopfzeile, einen Content-Bereich und optional einen Footer bereit, ohne Fachlogik zu enthalten oder Datenhaltung zu erzwingen.

## Abgrenzung zu subPanel
Das bestehende subPanel ist eine reine visuelle CSS-Hilfe für Unterbereiche. SidebarChildPanel baut darauf auf und ergänzt eine strukturierte Header-/Content-/Footer-Komposition inklusive optionaler Actions und HelpKey-Integration, ohne die Verwendung von subPanel selbst zu ersetzen oder zu verändern.

## Öffentliche API (Props)

- title: Titeltext im Header.
- icon: Icon links neben dem Titel.
- children: Inhalt des Panels (z. B. Liste, Formularelemente, Hinweise).
- count (optional): Zähler, der im Header angezeigt wird. Die Aktualisierung erfolgt ausschließlich durch Re-Render des Parents, z. B. über items.length oder Query-Daten. SidebarChildPanel verwaltet diesen Zustand nicht selbst.
- helpKey (optional): Schlüssel für Hilfetexte. Wenn gesetzt, erscheint im Header ein Hilfe-Trigger mit dem gleichen Ladeverhalten wie in den CardListLayouts der Hauptnavigation.
- headerActions (optional): Frei übergebener Actions-Slot im Header. Dieser Slot hat immer Vorrang vor den Default-Actions.
- addAction (optional): Default-Action für das Hinzufügen. Enthält onClick, optional disabled, ariaLabel und testId.
- closeAction (optional): Default-Action für das Schließen. Enthält onClick, optional disabled, ariaLabel und testId. Der Button löst ausschließlich den Callback aus; die Sichtbarkeit steuert der Parent.
- footer (optional): Footer-Inhalt. Wird nur gerendert, wenn Content übergeben wurde.

## Render-Prioritäten
Wenn headerActions gesetzt ist, werden addAction und closeAction nicht gerendert. Ohne headerActions erscheinen die Default-Actions entsprechend ihrer jeweiligen Konfiguration.

## HelpKey-Verhalten
Bei gesetztem helpKey wird derselbe Mechanismus wie in CardListLayouts genutzt, inklusive der Zustände „lädt“, „Fehler“ und „kein Text vorhanden“. Dadurch erhalten Nutzerinnen und Nutzer dasselbe Hilfe-Erlebnis wie auf Listenseiten.

## Footer-Regel
Der Footer ist standardmäßig unsichtbar und erscheint nur, wenn explizit Footer-Content übergeben wurde. Er ist visuell vom Content getrennt, sodass er für Filter, Counter oder ähnliche Steuerelemente geeignet ist.

## Beispiele (textuell)
- Dokumente am Projektformular: Der Parent setzt title auf „Dokumente“, icon auf ein Dokumenten-Icon, count auf die Länge der Dokumentenliste und addAction auf einen Callback zum Hinzufügen. Der Footer enthält einen Filter-Umschalter. Beim Re-Render aktualisiert sich der Count automatisch.
- Termine am Mitarbeiterformular: Der Parent setzt title auf „Termine“, icon auf ein Kalender-Icon, helpKey auf „employee-appointments“ und closeAction auf einen Callback, der das Panel ausblendet. Ohne headerActions erscheinen die Default-Actions, und der Hilfe-Trigger zeigt die bekannten Lade-/Fehler-/Leerzustände.

## Was die Komponente bewusst nicht tut
SidebarChildPanel lädt keine Daten, führt keine Mutationen aus, verwaltet keine Collections und entfernt keine DOM-Elemente eigenständig. Sie rendert ausschließlich anhand von Props und Children.

## Nicht-Ziele und Stabilitätsgarantien
Diese Implementierung führt keinerlei Änderungen im Bestand aus und soll keine bestehenden Screens beeinflussen. Eine spätere Konsolidierung der Help-Popover-Logik ist ausdrücklich nicht Teil dieses Auftrags.
