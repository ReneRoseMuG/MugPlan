# FT (17): UI Komposition

## Ziel / Zweck

Dieses Feature definiert eine eigene, klar abgegrenzte Kompositionsschicht für UI-Bausteine und die dazugehörige Dokumentation. Das Ziel ist es, wiederkehrende Layout- und Strukturmuster als verbindliche Vorlagen zu etablieren, sodass neue Screens nicht jedes Mal „frei“ komponiert werden, sondern sich kontrolliert aus stabilen, getesteten Mustern zusammensetzen. Dadurch sinken Komplexität, UI-Drift und Duplikation, während Refactorings nachvollziehbar und risikoarm bleiben.

Dieses Feature ist bewusst kein Fachfeature, sondern eine technische und gestalterische Leitplanke. Es beschreibt, welche UI-Komponenten als „Kompositionsvorlagen“ gelten, wie sie verwendet werden, welche Slots und Zuständigkeiten sie besitzen und wie sich neue Patterns ergänzen lassen, ohne bestehende Screens zu destabilisieren.

## Fachliche Beschreibung

### CardListLayout

`CardListLayout` ist das zentrale Seitenlayout für kartenbasierte Listenansichten und stellt den konsistenten Rahmen aus Header, optionalen Aktionen, Content-Grid sowie optionaler Bottom-Bar bereit. Die Komponente lebt in `client/src/components/ui/card-list-layout.tsx` und kapselt zusätzlich die Hilfetext-Integration über `helpKey`, indem sie bei gesetztem `helpKey` einen Hilfe-Button im Header rendert und den Text über React Query (`/api/help-texts`, `helpKey`) lädt.

`CardListLayout` ist eine Basiskomponente ohne eigene Ableitungen im Sinne „extends“, wird aber durch `FilteredCardListLayout` gezielt als Wrapper wiederverwendet, um Filterleisten einheitlich zu gestalten.

`CardListLayout` wird direkt in folgenden Navigationspunkten verwendet, weil diese Screens die Seite unmittelbar mit diesem Layout aufbauen: `helpTexts` über `client/src/components/HelpTextsPage.tsx`, `noteTemplates` über `client/src/components/NoteTemplatesPage.tsx`, `teams` über `client/src/components/TeamManagement.tsx` sowie `tours` über `client/src/components/TourManagement.tsx`.

`CardListLayout` wird indirekt in den Listenpunkten `customerList`, `projectList` und `employees` genutzt, weil diese Listen die Wrapper-Komponente `FilteredCardListLayout` verwenden, die wiederum `CardListLayout` rendert.

---

### FilteredCardListLayout

`FilteredCardListLayout` ist der standardisierte Wrapper für alle Listenansichten, die eine Filterleiste am unteren Rand haben sollen, und befindet sich in `client/src/components/ui/filtered-card-list-layout.tsx`. Technisch ist es eine dünne Schicht über `CardListLayout`, die dessen `bottomBar` belegt und dort eine einheitliche „Filter“-Sektion inklusive Icon und Layout für die Filtercontrols rendert.

Die Ableitungskette ist hier eindeutig: `FilteredCardListLayout` → `CardListLayout`.

`FilteredCardListLayout` wird in folgenden Navigationspunkten genutzt: `customerList` über `client/src/components/CustomerList.tsx`, `projectList` über `client/src/components/ProjectList.tsx` und `employees` über `client/src/components/EmployeeList.tsx` (wobei `EmployeeList` als Unterkomponente in der Mitarbeiter-Seite verwendet wird).

---

### EntityCard

`EntityCard` ist die Basis-Kartenkomponente für die eigentlichen „Entity-Karten“ innerhalb von Listen und Verwaltungsansichten und liegt in `client/src/components/ui/entity-card.tsx`. Sie kapselt den Header mit Titel, optionalem Icon, optionalen Actions und optionalem Delete-Button, den Content-Slot sowie optional einen Footer-Bereich. Zusätzlich unterstützt sie ein linkes Farbakzent-Border-Verhalten, indem sie bei gesetztem `style.borderLeftColor` automatisch eine linke Border aktiviert.

Die wichtigste Ableitung in diesem Projekt ist `ColoredEntityCard`, das als Wrapper die linke Border-Farbe als `borderColor`-Prop anbietet und intern an `EntityCard` durchreicht.

`EntityCard` wird direkt in folgenden Navigationspunkten verwendet: `customerList` über `client/src/components/CustomerList.tsx`, `projectList` über `client/src/components/ProjectList.tsx`, `employees` über `client/src/components/EmployeeList.tsx` sowie `helpTexts` über `client/src/components/HelpTextsPage.tsx`.

---

### ColoredEntityCard

`ColoredEntityCard` ist der definierte Wrapper über `EntityCard` und lebt in `client/src/components/ui/colored-entity-card.tsx`. Er übersetzt `borderColor` nach `style.borderLeftWidth` und `style.borderLeftColor` und delegiert ansonsten vollständig an `EntityCard`, wodurch Struktur und Verhalten nicht dupliziert werden.

Die Ableitungskette ist: `ColoredEntityCard` → `EntityCard`.

`ColoredEntityCard` wird in folgenden Navigationspunkten genutzt: `tours` über `client/src/components/TourManagement.tsx`, `teams` über `client/src/components/TeamManagement.tsx`, `noteTemplates` über `client/src/components/NoteTemplatesPage.tsx` sowie `projectStatus` über `client/src/components/ProjectStatusList.tsx` (wobei `ProjectStatusList` als Unterkomponente der Projekt-Status-Seite dient).

---

### InfoBadge

`InfoBadge` ist die Basis für kompakte Informations-Badges mit optionaler Add/Remove-Action und liegt in `client/src/components/ui/info-badge.tsx`. Die Komponente rendert ein Badge mit Icon links, einem beliebigen `label`-ReactNode als Inhalt und optional einer Action-Spalte rechts, die je nach `action` bzw. vorhandenen Handlern `+`, `-` oder `X` anzeigt. Zusätzlich unterstützt `InfoBadge` die Varianten `size="default" | "sm"` und `fullWidth`, sowie eine linke farbige Border über `borderColor`.

In diesem Snapshot ist `InfoBadge` nicht nur „Basis unter ColoredInfoBadge“, sondern auch die direkte Basis für mehrere fachliche Spezialisierungen, die bewusst als Wrapper/Komposition umgesetzt sind.

Die wichtigsten Ableitungsketten sind: `ColoredInfoBadge` → `InfoBadge`, `PersonInfoBadge` → `InfoBadge`, `ProjectInfoBadge` → `InfoBadge`, `TerminInfoBadge` → `InfoBadge`, sowie die weiteren personenspezifischen Wrapper `CustomerInfoBadge` → `PersonInfoBadge` → `InfoBadge` und `EmployeeInfoBadge` → `PersonInfoBadge` → `InfoBadge`.

`InfoBadge` selbst wird im Projekt überwiegend indirekt genutzt, also über diese Wrapper-Komponenten, und wird daher im FT (17) am sinnvollsten als „stabile Basisschicht“ dokumentiert, während die fachlich sichtbaren Varianten die genannten Wrapper sind.

---

### ColoredInfoBadge

`ColoredInfoBadge` ist der einfachste Wrapper über `InfoBadge` und befindet sich in `client/src/components/ui/colored-info-badge.tsx`. Er übersetzt `color` nach `borderColor` und delegiert ansonsten vollständig an `InfoBadge`.

Die Ableitungskette ist: `ColoredInfoBadge` → `InfoBadge`.

`ColoredInfoBadge` wird in folgenden Navigationspunkten bzw. Screens verwendet: im Termin-Workflow `appointment` über `client/src/components/AppointmentForm.tsx`, im Mitarbeiterbereich `employees` über `client/src/components/EmployeeList.tsx` und `client/src/components/EmployeePage.tsx`, im Kundenbereich `customer` über `client/src/components/LinkedProjectCard.tsx` (verknüpfte Projekte), sowie im Projektbereich `project` über `client/src/components/ProjectStatusSection.tsx`. Zusätzlich wird `ColoredInfoBadge` in `client/src/components/ProjectList.tsx` genutzt.

---

### PersonInfoBadge

`PersonInfoBadge` ist ein fachlich neutraler Wrapper für Personen-Darstellung und liegt in `client/src/components/ui/person-info-badge.tsx`. Er baut auf `InfoBadge` auf, generiert ein Avatar-Icon mit Initialen aus Vor- und Nachnamen (inklusive Fallback aus dem Titel), und rendert darunter optional mehrere Detailzeilen. Dadurch wird Personenanzeige im gesamten Projekt als einheitliches Badge-Pattern umgesetzt.

Die Ableitungskette ist: `PersonInfoBadge` → `InfoBadge`.

`PersonInfoBadge` wird in der Regel nicht direkt in den Screens verwendet, sondern über `CustomerInfoBadge` und `EmployeeInfoBadge`, die die visuelle Identität (Farblogik) und die typischen Detailzeilen festlegen.

---

### CustomerInfoBadge

`CustomerInfoBadge` ist die kundenspezifische Spezialisierung und liegt in `client/src/components/ui/customer-info-badge.tsx`. Sie delegiert an `PersonInfoBadge`, liefert die typischen Zeilen wie Kundennummer und Telefon und erzeugt eine konsistente Farblogik für den Avatar-Rand, die deterministisch auf `id` basiert und andernfalls eine Session-Farbe nutzt.

Die Ableitungskette ist: `CustomerInfoBadge` → `PersonInfoBadge` → `InfoBadge`.

Die Verwendung erfolgt im Projekt indirekt überall dort, wo Kunden als Badge dargestellt werden, wobei im Snapshot die direkte Importverwendung in Screens nicht im Vordergrund steht, sondern als UI-Baustein für Picker- und Kontextdarstellungen gedacht ist.

---

### EmployeeInfoBadge

`EmployeeInfoBadge` ist die mitarbeiterspezifische Spezialisierung und liegt in `client/src/components/ui/employee-info-badge.tsx`. Sie delegiert an `PersonInfoBadge`, setzt die typischen Zeilen wie Tour und Team und verwendet eine deterministische bzw. sessionbasierte Hintergrundfarbe für den Avatar.

Die Ableitungskette ist: `EmployeeInfoBadge` → `PersonInfoBadge` → `InfoBadge`.

`EmployeeInfoBadge` wird zentral in `EmployeeSelectEntityEditDialog` verwendet, um ausgewählte Mitglieder als entfernbare Badges darzustellen, und liegt damit funktional im Kontext der Verwaltungsdialoge für Teams/Touren, also indirekt in den Navigationspunkten `teams` und `tours`.

---

### ProjectInfoBadge

`ProjectInfoBadge` ist eine projektspezifische Spezialisierung auf `InfoBadge` und liegt in `client/src/components/ui/project-info-badge.tsx`. Sie bildet typische Projekt-Kompaktinfos ab, insbesondere Kundenzuordnung und Terminanzahl bzw. frühester Termin, und verwendet dafür ein mehrzeiliges Label.

Die Ableitungskette ist: `ProjectInfoBadge` → `InfoBadge`.

Diese Komponente ist im Snapshot als eigenständiger UI-Baustein vorhanden und eignet sich genau für Situationen wie „Verknüpfte Projekte“ oder projektbezogene Picker, auch wenn der konkrete Screen-Import nicht zwingend in jeder Ansicht direkt erfolgt.

---

### TerminInfoBadge

`TerminInfoBadge` ist die terminspezifische Spezialisierung und liegt in `client/src/components/ui/termin-info-badge.tsx`. Sie baut auf `InfoBadge` auf, formatiert das Datum (`dd.MM.yy`), zeigt bei Mehrtages-Terminen eine kleine `nT`-Plakette, und zeigt bei eintägigen Terminen optional eine kompakte Startstundenanzeige. Die sekundäre Zeile wird über `mode` (`kunde`, `projekt`, `mitarbeiter`) gesteuert und rendert jeweils den passenden Kontext-Labeltext.

Die Ableitungskette ist: `TerminInfoBadge` → `InfoBadge`.

Diese Komponente ist ein klarer Kandidat für Sidebar- oder Kontextlisten in Termin- und Detailansichten, weil sie Informationsdichte bei geringer Höhe ermöglicht, ohne dass Screens ihre eigene Mini-Kartenlogik erfinden.

---

### EntityFormLayout

`EntityFormLayout` ist das Standardlayout für Formularseiten und liegt in `client/src/components/ui/entity-form-layout.tsx`. Es kapselt den Card-Rahmen, den Header mit Icon/Titel, das Scroll-/Breitenverhalten sowie den konsistenten Action-Footer mit Speichern/Abbrechen. Zusätzlich kann es über `onSubmit` einen async Submit-Flow abbilden und auf Wunsch nach erfolgreichem Submit automatisch schließen.

Die Komponente wird im Snapshot als zentraler Formularrahmen benutzt und ist damit der formale Gegenpart zu `CardListLayout`, das die Listen-/Übersichtsseiten standardisiert.

---

### EntityEditDialog, ColorSelectEntityEditDialog, EmployeeSelectEntityEditDialog

`EntityEditDialog` ist die Dialog-Basis für Create/Edit im Modal und liegt in `client/src/components/ui/entity-edit-dialog.tsx`. Es standardisiert Titelzeile, Icon, optionalen Header-Zusatz, Save/Cancel-Handling sowie einen optionalen async Submit-Flow mit Auto-Close-Option.

`ColorSelectEntityEditDialog` liegt in `client/src/components/ui/color-select-entity-edit-dialog.tsx` und erweitert `EntityEditDialog`, indem es oberhalb des Children-Inhalts einen `ColorSelectButton` einhängt. Die Ableitungskette ist: `ColorSelectEntityEditDialog` → `EntityEditDialog`.

`EmployeeSelectEntityEditDialog` liegt in `client/src/components/ui/employee-select-entity-edit-dialog.tsx` und erweitert `ColorSelectEntityEditDialog` um die standardisierte Mitglieder-Zuweisung. Hierzu rendert es eine Liste der bereits ausgewählten Mitarbeiter als `EmployeeInfoBadge` und bietet einen separaten Vollbild-Dialog zur Auswahl über `EmployeeListView` (aus `client/src/components/EmployeeList.tsx`). Die Ableitungskette ist: `EmployeeSelectEntityEditDialog` → `ColorSelectEntityEditDialog` → `EntityEditDialog`.

Diese Dialogkette ist für FT (17) besonders wichtig, weil sie die „richtige“ Stelle ist, an der Farblogik und Mitgliederzuweisung zentralisiert werden, statt dass Teams/Touren ihre eigenen Sonderdialoge bauen.

---

### SearchFilterInput

`SearchFilterInput` ist das standardisierte Eingabefeld für Textsuche in Listenfiltern und liegt in `client/src/components/ui/search-filter-input.tsx`. Es ist als Baustein gedacht, damit Filterleisten in `FilteredCardListLayout` in Bedienung und Optik nicht auseinanderlaufen.

## SidebarChildPanel

`SidebarChildPanel` ist die standardisierte Layout- und Kompositionskomponente für rechte Seitenleistenbereiche in Formularen, also für die wiederkehrenden „Child-Collections“ wie verknüpfte Projekte, Termine, Dokumente, Status-Listen und ähnliche Nebeninformationen. Die Komponente dient genau dem Zweck, Header, Action-Zone, Content-Slot und optionalen Footer so zu vereinheitlichen, dass die einzelnen Screens keine eigenen Sidepanel-Strukturen mehr erfinden müssen.

`SidebarChildPanel` ist bewusst rein strukturell und enthält keine Fachlogik und keine Datenlogik. Änderungen an den angezeigten Einträgen entstehen ausschließlich dadurch, dass der Parent neue Children rendert und optional `count` aktualisiert, während `SidebarChildPanel` selbst keine Collections verwaltet, keine Mutationen kennt und keine API-Calls ausführt.

Die Komponente orientiert sich am etablierten `.sub-panel`-Pattern, indem sie die Seitenleistenoptik konsistent hält, aber zusätzlich eine klar definierte Header- und Action-Struktur bereitstellt. Sie bietet im Header links Icon und Titel, optional ergänzt um eine Count-Anzeige, und rechts eine feste Action-Zone, die entweder vollständig über einen freien `headerActions`-Slot belegt wird oder über eine einfache Standard-Konfiguration einen Add-Button anbietet. Ein optionaler Footer wird nur gerendert, wenn er explizit befüllt wird, und ist das vorgesehene Ziel für Toggle- oder Filter-Controls, ohne dass dafür Sonderlogik in der Komponente entsteht.

## Abgeleitete Listen auf Basis von SidebarChildPanel

Unter „abgeleitete Listen“ ist im Snapshot vor allem das standardisierte Terminlisten-Muster gemeint, das aus einer linearen Ableitungskette besteht und genau dafür sorgt, dass Terminlisten in den Sidebars von Kunde, Projekt und Mitarbeiter überall gleich aussehen, ohne dass Kontextlogik in die Darstellung rutscht.

### TerminInfoBadge als Listeneintrag

`TerminInfoBadge` ist der standardisierte Eintragstyp für Terminlisten innerhalb von Sidebars und ist als Spezialisierung auf `InfoBadge` gedacht. Es kapselt die kompakte Datumsdarstellung inklusive Mehrtages-Kennzeichnung und rendert die Sekundärzeile kontextabhängig über `mode` (`kunde`, `projekt`, `mitarbeiter`), damit derselbe Termin in unterschiedlichen Sidebars konsistent erscheinen kann, ohne dass jeder Screen seine eigene Zeilenlogik schreibt.

### AppointmentsPanel als generische Terminliste

`AppointmentsPanel` ist die rein darstellende Terminlisten-Komponente für Formular-Sidebars. Sie nutzt `SidebarChildPanel` als Hülle, rendert die übergebenen Items als `TerminInfoBadge` und stellt im Footer den Toggle „Alle Termine“ bereit. Die Komponente enthält keine Fetch-Logik und keine Kontextlogik, weil sie weder Query-Keys noch API-Endpunkte kennen darf, sondern ausschließlich ein einheitliches Item-Format erwartet.

Der Toggle „Alle Termine“ ist UI-Verhalten und gehört damit in `AppointmentsPanel`, aber die Frage, ob überhaupt vergangene Termine verfügbar sind, ist eine Kontextentscheidung und gehört in die Wrapper, weil das Panel sonst ein Versprechen („Alle“) geben würde, das der Wrapper nicht einlösen kann.

### Kontext-Wrapper als abgeleitete Listen

Auf `AppointmentsPanel` sitzen kontextspezifische Wrapper, die die jeweilige Ableitung und die Datenbeschaffung kapseln und anschließend nur noch das Panel füttern. Dadurch bleibt der Screen selbst schlank, und Abfrage- und Mappinglogik wird nicht über mehrere Formulare verteilt.

`ProjectAppointmentsPanel` ist der Wrapper für Terminlisten im Projektformular und darf projektspezifische Regeln kapseln, etwa Sperrlogik oder projektspezifische Labels, ohne dass diese Regeln in die generische Darstellung rutschen.

`CustomerAppointmentsPanel` kapselt die Ableitung „Kunde → Projekte → Termine“ und verhindert damit, dass kundenbezogene Formularseiten projektbezogene Abfragelogik selbst implementieren oder duplizieren.

`EmployeeAppointmentsPanel` kapselt die Ableitung „Mitarbeiter → Terminzuordnungen“ und stellt sicher, dass Einsatzlisten nicht in Dialogen oder Screens mehrfach unterschiedlich implementiert werden.

### Kalender- und Termin-Komponenten

Die Kalenderdarstellung setzt sich aus drei Hauptansichten (Monat, Woche, Jahr) zusammen, die alle denselben Datenhook und dieselben Termin-Bausteine verwenden. Legacy-Wrapper sorgen dafür, dass bestehende Einstiegspunkte stabil bleiben.

**CalendarGrid** (`client/src/components/CalendarGrid.tsx`) und **WeekGrid** (`client/src/components/WeekGrid.tsx`) sind reine Wrapper. Sie delegieren an die jeweilige View und reichen Filter sowie Callbacks weiter (`currentDate`, `employeeFilterId`, `onNewAppointment`, `onOpenAppointment`).

**CalendarMonthView** (`client/src/components/calendar/CalendarMonthView.tsx`) bildet das Monatsraster mit Termin-Lanes und Drag & Drop. **CalendarWeekView** (`client/src/components/calendar/CalendarWeekView.tsx`) zeigt eine detailreichere Wochenansicht mit Panel-Karten. **CalendarYearView** (`client/src/components/calendar/CalendarYearView.tsx`) komprimiert Termine in einer 12‑Monats-Übersicht. Alle drei verwenden dieselben Props:

- `currentDate`, `employeeFilterId`
- `onNewAppointment`, `onOpenAppointment`

Der globale Filter ist **CalendarEmployeeFilter** (`client/src/components/calendar/CalendarEmployeeFilter.tsx`). Er lädt aktive Mitarbeiter und ermöglicht die Auswahl „Alle Mitarbeiter“. Props:

- `value` (employeeId oder `null`)
- `onChange`

Für die eigentliche Terminvisualisierung gibt es zwei Bausteine:

**CalendarAppointmentCompactBar** (`client/src/components/calendar/CalendarAppointmentCompactBar.tsx`) ist die kompakte Leiste für Monat/Jahr (mit Popover und DnD).

**CalendarWeekAppointmentPanel** (`client/src/components/calendar/CalendarWeekAppointmentPanel.tsx`) ist die Detailkarte der Wochenansicht.

Termin-Details sind zentralisiert:

**CalendarAppointmentPopover** (`client/src/components/calendar/CalendarAppointmentPopover.tsx`) ist der Overlay-Container,

**CalendarAppointmentDetails** (`client/src/components/calendar/CalendarAppointmentDetails.tsx`) liefert das wiederverwendete Detail-Template (Popover/Panel).

Für Terminlisten außerhalb der Kalenderansicht gibt es Panels und Badges.

**AppointmentsPanel** (`client/src/components/AppointmentsPanel.tsx`) ist das Standard-Panel mit „Alle Termine“-Toggle, Items, Actions und optionalem Hinweistext.

Kontext-spezifische Panels darauf aufbauend:

- **CustomerAppointmentsPanel** (`client/src/components/CustomerAppointmentsPanel.tsx`) aggregiert Termine über alle Projekte eines Kunden.
- **EmployeeAppointmentsPanel** (`client/src/components/EmployeeAppointmentsPanel.tsx`) lädt kommende oder alle Termine eines Mitarbeiters.
- **ProjectAppointmentsPanel** (`client/src/components/ProjectAppointmentsPanel.tsx`) listet Termine im Projekt-Kontext inkl. Lösch- und Sperrlogik.

Die UI für einzelne Einträge ist **TerminInfoBadge** (`client/src/components/ui/termin-info-badge.tsx`), das Datum, Mehrtages-Labels, Startzeit und Kontextzeile darstellt.

Zum Erstellen und Bearbeiten von Terminen dient **AppointmentForm** (`client/src/components/AppointmentForm.tsx`) mit Projekt-/Tour-/Mitarbeiter-Zuordnung, Validierung und Sperrlogik.

## Regeln & Randbedingungen

Die Kompositionsschicht enthält ausschließlich Layout- und Strukturkomponenten, die keine fachliche Logik besitzen und keine Datenhaltung erzwingen. Fachlogik, Mutationen und Validierungen verbleiben in den Feature-Screens oder in fachnahen Hooks, während die Kompositionskomponenten nur definierte Slots bereitstellen.

Die Vorlagen sollen so geschnitten sein, dass sie in mehreren Screens wiederverwendbar sind, ohne dass diese Screens Layout-Sonderfälle in die Vorlagen hineindrücken müssen. Wenn ein Sonderfall häufiger wird, wird er als Erweiterung des Patterns dokumentiert und als neue, bewusst benannte Variante umgesetzt, statt über ad-hoc Props und Ausnahmen zu wachsen.

Hilfetexte werden systemweit über einen `helpKey` angebunden. Wenn ein `helpKey` gesetzt ist, muss die UI konsistent einen Hilfe-Trigger anzeigen und den Hilfetext über denselben Mechanismus laden und darstellen, wie es die bestehenden List-Layouts bereits tun. Damit ist gewährleistet, dass Hilfetexte zentral gepflegt werden können und das Nutzererlebnis unabhängig vom Screen gleich bleibt.

Neue Kompositionskomponenten werden nur dann eingeführt, wenn sie mindestens zwei echte Wiederholungsfälle vereinheitlichen oder absehbar ein Standardpattern etablieren. Reine „Einmal-Wrapper“ ohne Wiederverwendung sind nicht Teil dieser Schicht.

# Projekt Verwaltung

### Aufgaben

[Unbenannt](Unbenannt%202fdda094354e80c28a95d83fedabf9f5.csv)