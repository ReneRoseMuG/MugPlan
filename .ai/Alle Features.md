# Alle Features

# FT (01): **Kalendertermine verwalten**

## FT (01) Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermöglicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu ändern, zu verschieben, zuzuweisen und zu überwachen**, immer im Kontext eines Projekts.

FT (01) ist die **fachliche Quelle der Wahrheit für alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, überwachen oder ausgeben, leiten ihre Informationen **ausschließlich** aus den hier verwalteten Terminen ab.

## FT (01) Fachliche Beschreibung

Ein Termin ist eine **zeitliche Planungseinheit** mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin gehört **immer genau zu einem Projekt**. Über das Projekt ist der Termin **indirekt** einem Kunden zugeordnet. Die Projekt-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen automatisch, durch Zuweisung von Mitarbeitern über eine Tour, ein Team oder individuell. Gespeichert wird am Termin jedoch stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte geführt, damit spätere Anforderungen an „echte Uhrzeiten“ ohne erneute Modellmigration möglich sind. In der UI bleiben Uhrzeiten zunächst optional, weil der aktuelle Arbeitsmodus weiterhin primär tagesbasiert ist.

Ein Termin kann:

- unabhängig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- über Teams mit Mitarbeitern belegt werden,
- über die Tourzuweisung mit Mitarbeitern belegt werden,
- Mitarbeiter können nur einmal im Termin existieren, keine Dupletten durch Team- oder Tourzuweisung,
- Mitarbeiter dürfen nur zugewiesen werden, wenn sich dadurch keine Überschneidungen mit anderen Terminen des Mitarbeiters ergeben,
- in verschiedenen Kalender- und Übersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine können auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschließender Projektzuweisung.

Unabhängig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gültig, wenn ihm ein Projekt zugeordnet ist.**

## FT (01) Regeln & Randbedingungen

**Grundlegende Terminregeln**

- Ein Termin gehört **immer genau zu einem Projekt**.
- Ein Projekt kann **null, einen oder mehrere Termine** besitzen.
- Termine ohne Projektzuordnung sind **nicht zulässig**.
- Termine enthalten **keine eigenen Kunden- oder Projektdatenkopien**.
- Kunden- und Projektinformationen werden stets **referenziert**, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- Mehrtägige Termine gelten für **alle Tage ihres Zeitraums**.
- Vergangene Termine sind **read-only** und dürfen nicht verändert werden.
- Ein Termin besitzt intern einen Startzeitpunkt und einen Endzeitpunkt.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird eine Startuhrzeit erfasst, leitet das System initial eine Standarddauer von einer Stunde ab.

**Mitarbeiterzuweisung**

- Einem Termin können **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich überschneidend** mehreren Terminen zugewiesen sein.
    
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelösten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Der Termin übernimmt die Mitarbeiter, die der Tour zugeordnet sind
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung.
- Das Wechseln der Tour entfernt die Mitarbeiter der vorherigen Tour vom Termin und fügt die der neuen Tour an
- Das Entfernen der Tour entfernt die Mitarbeiter der Tour vom Termin

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Der Termin übernimmt die Mitarbeiter des Teams

## **FT (01) Use Cases**

### UC 01/01: Termin anlegen

### **Akteur**

Disponent, Administrator

### **Ziel**

Für ein bestehendes Projekt einen neuen Termin im Kalender anlegen. Der Use Case unterstützt beide Wege der Terminanlage, nämlich das Anlegen aus einem Projekt heraus und das Anlegen aus dem Kalender heraus.

### **Vorbedingungen**

- Projekt existiert.
- Kunde existiert.
- Kunde ist dem Projekt zugeordnet.
- Team existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur editiert ein vorhandenes Projekt und klickt in der Terminliste rechts auf „+“ (Termin anlegen). Das System öffnet das Terminformular, verknüpft den Termin mit dem Projekt und ermittelt den Kunden indirekt über das Projekt.
    1. Das System setzt das Startdatum auf den aktuellen Tag.
2. Der Akteur klickt im Kalender auf einen „+“-Button (Termin anlegen). Das System öffnet das Terminformular.
    1. Das System setzt das Startdatum auf den angeklickten Tag.
    2. Der angeklickte „+“-Button gehörte zu einer Tour-Lane.
        1. Das System verknüpft den Termin mit dieser Tour und befüllt die Mitarbeiterliste des Termins mit den Mitarbeitern der Tour.
3. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
4. Der Akteur weist dem Termin optional eine Tour zu, falls noch keine Tour verknüpft ist.
5. Der Akteur weist dem Termin optional ein Team zu.
6. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
7. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum. Mitarbeiter dürfen keine überschneidenden Termine haben. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt.
8. Das System speichert den Termin und zeigt ihn im Kalender an.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an.
- Abbruch: Der Termin wird nicht gespeichert.
    - Es wird kein neuer Termin-Datensatz in der Datenbank angelegt.
    - Es werden keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter angelegt, auch dann nicht, wenn zwischenzeitlich Mitarbeiter im Formular ausgewählt wurden.
- Speichern ohne Projektzuordnung: Der Akteur versucht zu speichern, ohne dass ein Projekt zugeordnet ist. Das System blockiert den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: „Projekt erforderlich – Termin kann nicht ohne Projektkontext gespeichert werden.“

### **Ergebnis**

Der Termin ist einem Projekt zugeordnet und im Kalender sichtbar, entweder mit Tourfarbe oder mit Standardfarbe. Der Termin ist fachlich gültig und zeigt neben der Projektzuordnung auch den zum Projekt gehörenden Kunden (indirekt ermittelt über das Projekt). Die Mitarbeiterzuordnungen des Termins sind als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar.

Für alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Das Projektformular zeigt den Termin in der Projekt-Terminliste. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, der über das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste.

### UC 01/02: Termin bearbeiten

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin ändern, ohne fachliche Inkonsistenzen zu erzeugen. Der Use Case umfasst Änderungen an Zeitraum und Uhrzeit, Änderungen der Projektzuordnung, Änderungen der Tourzuordnung, das Übernehmen von Mitarbeitern über Tour oder Team als Einfügehilfe sowie manuelle Mitarbeiterzuweisungen und -entfernungen.

### **Vorbedingungen**

- Der Termin existiert.
- Das zugehörige Projekt existiert.
- Der zum Projekt gehörende Kunde existiert und ist dem Projekt zugeordnet.
- Optional: Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur öffnet einen bestehenden Termin im Terminformular.
2. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
3. Der Akteur ändert optional die Projektzuordnung des Termins.
    1. Das System aktualisiert die indirekt ermittelte Kundenzuordnung entsprechend dem neu gewählten Projekt, weil der Kunde ausschließlich über das Projekt bestimmt wird und keine direkte Kunde–Termin-Beziehung existiert.
4. Der Akteur weist dem Termin optional eine Tour zu oder ändert eine bereits verknüpfte Tour.
    1. Wenn eine Tour neu zugewiesen wird, verknüpft das System die Tour und übernimmt die Tour-Mitarbeiter in die Mitarbeiterliste des Termins.
    2. Wenn die Tour gewechselt wird, müssen die Mitarbeiterzuordnungen so aktualisiert werden, dass die Tour-Mitarbeiter der neuen Tour übernommen werden und die Tour-bedingten Zuordnungen der alten Tour nicht bestehen bleiben. Die ursprüngliche Mitarbeiterliste wird zuvor geleert.
5. Der Akteur entfernt optional eine Tourzuordnung.
    1. Das System löst die Tourverknüpfung am Termin. Die Mitarbeiter, welche der Tour zugewiesen sind, bleiben am Termin hängen und werden ausdrücklich nicht entfernt.
6. Der Akteur verwendet optional ein Team als Einfügehilfe.
    1. Das System übernimmt die Team-Mitarbeiter in die Mitarbeiterliste des Termins zusätzlich zu bereits vorhandenen Mitarbeitern.
    2. Das System speichert keine Teamzuordnung am Termin, sondern ausschließlich die konkrete Mitarbeiterliste.
7. Der Akteur weist optional weitere Mitarbeiter manuell zu oder entfernt einzelne Mitarbeiter manuell.
8. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt.
9. Das System speichert die Änderungen am Termin und aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert das Speichern und zeigt einen Konflikt an, der den betroffenen Mitarbeiter und den kollidierenden Zeitraum verständlich benennt.
- Abbruch: Der Akteur bricht die Bearbeitung ab. Das System speichert keine Änderungen am Termin und es entstehen keine Teiländerungen, also insbesondere keine neuen oder gelöschten Einträge in der Join-Tabelle Termin–Mitarbeiter.
- Speichern ohne Projektzuordnung: Falls der Akteur versucht zu speichern, ohne dass ein Projekt zugeordnet ist, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: „Projekt erforderlich – Termin kann nicht ohne Projektkontext gespeichert werden.“
- Tourwechsel oder Tourentfernung in Konflikt: Falls die durch Tourübernahme entstehenden Mitarbeiterzuordnungen zu Überschneidungen führen, blockiert das System den Vorgang vollständig, sodass weder die Tourverknüpfung noch die Mitarbeiterliste teilweise gespeichert wird.

### **Ergebnis**

Der Termin ist mit den geänderten Daten gespeichert und weiterhin einem Projekt zugeordnet. Der Kunde ist weiterhin ausschließlich indirekt über das Projekt bestimmt. Die Mitarbeiterzuordnungen sind als Einträge in der Join-Tabelle Termin–Mitarbeiter konsistent abrufbar, ohne Duplikate und ohne Teilzustände.

Die aktualisierten Termindaten sind in allen konsumierenden Sichten konsistent sichtbar. Das bedeutet, dass das Mitarbeiterformular den Termin in der Mitarbeiter-Terminliste für alle zugeordneten Mitarbeiter korrekt anzeigt, das Projektformular den Termin in der Projekt-Terminliste anzeigt und das Kundenformular den Termin in der Terminliste des Kunden anzeigt, der über das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, verschwindet der Termin entsprechend aus dieser Tour-Sicht.

### UC 01/03: Termin verschieben

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin auf ein anderes Datum verschieben, ohne die Uhrzeit unbeabsichtigt zu verändern und ohne fachliche Inkonsistenzen oder Mitarbeiterüberschneidungen zu erzeugen. Der Use Case umfasst sowohl das Verschieben über das Terminformular als auch das Verschieben per Drag-and-drop im Kalender.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Die zugehörigen Mitarbeiterzuordnungen sind vorhanden oder der Termin hat keine zugeordneten Mitarbeiter.
- Optional: Der Termin ist einer Tour zugeordnet.

### **Ablauf**

1. Der Akteur verschiebt den Termin auf einen anderen Tag, entweder über das Terminformular oder per Drag-and-drop im Kalender.
2. Wenn der Termin über das Terminformular verschoben wird, editiert der Akteur Startdatum und optional Enddatum.
3. Wenn der Termin per Drag-and-drop verschoben wird, verschiebt der Akteur den Termin im Kalender auf den gewünschten Tag.
    1. Das System darf dabei die bestehende Startuhrzeit nicht unbeabsichtigt verändern, sondern übernimmt die Uhrzeit unverändert.
4. Das System führt die Überschneidungsprüfung für alle dem Termin zugeordneten Mitarbeiter durch.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin nach dem Verschieben umfasst.
5. Eine evtl. vorhandene Tour Zuordnung bleibt erhalten. Das Verschieben des Termins per D&D auf eine andere Tour ist nicht möglich.
6. Das System speichert den Termin mit dem neuen Datum beziehungsweise Zeitraum.
7. Das System aktualisiert die Kalenderansichten und alle relevanten Sichten, die den Termin anzeigen.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert das Verschieben und zeigt einen Konflikt an. Der Termin bleibt unverändert auf dem ursprünglichen Datum, und es entstehen keine Teiländerungen an Termin oder Join-Einträgen.
- Abbruch: Der Akteur bricht den Vorgang ab. Der Termin bleibt unverändert.
- Historischer Zeitraum: Wenn das Verschieben dazu führen würde, dass der Termin in einen nicht zulässigen historischen Zeitraum fällt, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an. Es wird nichts gespeichert.

### **Ergebnis**

Der Termin ist auf das neue Datum beziehungsweise den neuen Zeitraum verschoben und bleibt weiterhin einem Projekt zugeordnet. Die Uhrzeit ist nach einem mausgesteuerten Verschieben unverändert geblieben. Alle Mitarbeiterzuordnungen bleiben konsistent als Einträge in der Join-Tabelle Termin–Mitarbeiter erhalten, sofern das Verschieben erfolgreich war.

Der Termin erscheint in der neuen Tages- beziehungsweise Wochen-Sicht und ist in der alten Sicht nicht mehr vorhanden. Für alle zugeordneten Mitarbeiter ist der Termin in der Mitarbeiter-Terminliste sichtbar, und wenn der Termin einer Tour zugeordnet ist, ist er auch in der Tour-Terminliste sichtbar.

### UC 01/04: Termin löschen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin vollständig löschen, sodass keine fachlichen Restzustände bestehen bleiben. Insbesondere dürfen nach dem Löschen keine Mitarbeiterzuordnungen mehr existieren, und der Termin darf in keiner Sicht (Kalender, Projekt, Mitarbeiter, Tour, Kunde) mehr erscheinen.

### **Vorbedingungen**

- Der Termin existiert und liegt nicht in der Vergangenheit.
- Der Termin ist einem Projekt zugeordnet.
- Optional: Dem Termin sind Mitarbeiter manuell zugeordnet oder über Tour/Team übernommen.
- Optional: Der Termin ist einer Tour zugeordnet.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular oder startet das Löschen aus einer Terminliste.
2. Der Akteur löst die Löschaktion aus und bestätigt diese, sofern eine Bestätigung vorgesehen ist.
3. Das System löscht den Termin in der Datenbank.
4. Das System entfernt alle zugehörigen Einträge in der Join-Tabelle Termin–Mitarbeiter, sodass keine Mitarbeiterzuordnungen bestehen bleiben.
5. Das System aktualisiert alle Sichten, die Termine anzeigen, insbesondere Kalender- und Listenansichten sowie Detailansichten zu Projekt, Mitarbeiter, Tour und Kunde.

### **Alternativen**

- Abbruch: Der Akteur bricht den Löschvorgang ab. Der Termin bleibt unverändert bestehen, und es werden keine Daten gelöscht.
- Konflikt beim Löschen: Falls das System das Löschen blockiert, muss es eine eindeutige Fehlermeldung anzeigen und sicherstellen, dass weder der Termin noch Join-Einträge teilweise entfernt wurden.
- Das System blockiert bzw. verhindert das Löschen historischer Termine effektiv. Unter anderem zeigen die Kalendersichten keine + Buttons vor dem aktuellen Tag.

### **Ergebnis**

Der Termin ist vollständig gelöscht. Es existiert kein Termin-Datensatz mehr in der Datenbank, und es existieren keine Einträge mehr in der Join-Tabelle Termin–Mitarbeiter für diesen Termin.

Der Termin ist in keiner Sicht mehr auffindbar. Das bedeutet, dass er weder im Kalender noch in der Projekt-Terminliste, noch in der Mitarbeiter-Terminliste, noch in einer Tour-Terminliste, noch in einer kundenbezogenen Terminliste erscheint.

### UC 01/05: Tour einem Termin zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin einer Tour zuweisen, sodass der Termin mit der Tour verknüpft wird, die Tourfarbe für die Darstellung genutzt werden kann und die Mitarbeiterliste des Termins vollständig aus den Tour-Mitarbeitern besteht. Beim Setzen oder Wechseln der Tour werden zuvor vorhandene Mitarbeiterzuordnungen entfernt, sofern dadurch keine Mitarbeiterüberschneidungen entstehen.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Die Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Der Termin hat bereits manuell zugeordnete Mitarbeiter oder bereits eine Tourzuordnung.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur weist dem Termin eine Tour zu oder ändert eine bereits verknüpfte Tour.
3. Das System verknüpft den Termin mit der ausgewählten Tour.
4. Das System ersetzt die komplette Mitarbeiterliste des Termins durch die Mitarbeiter der ausgewählten Tour.
    1. Alle zuvor am Termin zugeordneten Mitarbeiter werden entfernt.
    2. Anschließend werden die Tour-Mitarbeiter als einzige Termin-Mitarbeiter gesetzt.
5. Das System führt die Überschneidungsprüfung für alle dem Termin zugeordneten Mitarbeiter durch, also für die Tour-Mitarbeiter.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei der Änderung der Termin-Mitarbeiterliste ausgeführt, also insbesondere beim Ersetzen der Mitarbeiterliste durch die Tour.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in den relevanten Sichten.
    1. Der Termin wird im Kalender mit der Tourfarbe dargestellt, sofern Tourfarben für die Kalenderdarstellung verwendet werden.
    2. Der Termin ist in der Tour-Sicht auffindbar, sofern diese eine Terminliste anbietet.
    3. Der Termin ist in der Mitarbeiter-Sicht auffindbar, und zwar genau für die Tour-Mitarbeiter, die nun dem Termin zugeordnet sind.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Weder die Tourverknüpfung noch das Entfernen und Neusetzen der Mitarbeiterzuordnungen werden gespeichert, und es entstehen keine Teilzustände in Termin oder Join-Tabelle.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.

### **Ergebnis**

Der Termin ist mit der Tour verknüpft. Die Mitarbeiterliste des Termins besteht ausschließlich aus den Mitarbeitern der Tour, und alle zuvor vorhandenen Mitarbeiterzuordnungen wurden entfernt. Die Mitarbeiterzuordnungen sind als Einträge in der Join-Tabelle Termin–Mitarbeiter konsistent abrufbar.

Der Termin ist im Kalender sichtbar und wird je nach Darstellungsregel mit Tourfarbe oder Standardfarbe angezeigt. Der Termin ist in der Tour-Terminliste sichtbar, sofern eine Tour-Terminliste existiert, und er ist in den Mitarbeiter-Terminlisten aller Tour-Mitarbeiter sichtbar, während er bei zuvor entfernten Mitarbeitern nicht mehr erscheint.

### UC 01/06: Tourzuweisung eines Termins entfernen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tourzuweisung von einem Termin entfernen, sodass der Termin anschließend keiner Tour mehr zugeordnet ist. Beim Entfernen der Tourzuweisung bleiben die bereits am Termin zugeordneten Mitarbeiter unverändert bestehen.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Der Termin ist aktuell einer Tour zugeordnet.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur entfernt die Tourzuweisung.
3. Das System löst die Tourverknüpfung des Termins.
4. Das System verändert die Mitarbeiterliste des Termins nicht. Alle aktuell zugeordneten Mitarbeiter bleiben weiterhin dem Termin zugeordnet.
5. Das System speichert den Termin.
6. Das System aktualisiert die Darstellung in allen relevanten Sichten, insbesondere Kalender- und Listenansichten sowie Tour- und Mitarbeiter-Sichten.

### **Alternativen**

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Konflikt beim Speichern: Falls das Speichern fehlschlägt, muss das System sicherstellen, dass weder die Tourverknüpfung noch andere Daten teilweise gespeichert wurden, und eine eindeutige Fehlermeldung anzeigen.

### **Ergebnis**

Der Termin ist keiner Tour mehr zugeordnet und wird im Kalender nach den Regeln für Termine ohne Tour dargestellt, insbesondere nicht mehr mit Tourfarbe.

Die Mitarbeiterzuordnungen des Termins bleiben unverändert und sind weiterhin konsistent als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Der Termin ist in der Tour-Terminliste nicht mehr sichtbar. In Mitarbeiter-Terminlisten bleibt der Termin für alle zugeordneten Mitarbeiter sichtbar.

### UC 01/07: Mitarbeiter über Team zuweisen

### **Ziel**

Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen, indem ein Team als Einfügehilfe verwendet wird. Das Team selbst wird dabei nicht am Termin gespeichert, sondern nur die daraus resultierende konkrete Mitarbeiterliste des Termins.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Das Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur wählt ein Team als Einfügehilfe aus.
3. Das System übernimmt die Mitarbeiter des Teams in die Mitarbeiterliste des Termins.
4. Das System speichert keine Teamzuordnung am Termin, sondern ausschließlich die konkrete Mitarbeiterliste.
5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch die Team-Übernahme.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Team ohne Mitarbeiter: Falls das gewählte Team keine Mitarbeiter enthält, muss das System den Vorgang blockieren und eine eindeutige Fehlermeldung anzeigen.

### **Ergebnis**

Die Mitarbeiter des ausgewählten Teams sind dem Termin zugeordnet und als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Am Termin ist keine Teamzuordnung gespeichert, sondern ausschließlich die daraus resultierende Mitarbeiterliste.

Für alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Der Termin erscheint in den projektbezogenen Terminsichten und, sofern vorhanden, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.

### UC 01/08: Mitarbeiter einem Termin zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einem bestehenden Termin einen einzelnen Mitarbeiter manuell zuweisen, sodass der Mitarbeiter im Termin als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in allen relevanten Sichten für diesen Mitarbeiter sichtbar ist, sofern keine Überschneidung entsteht.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Der Mitarbeiter existiert.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur klickt im Bereich „Zugeordnete Mitarbeiter“ auf „+“ (Mitarbeiter hinzufügen) oder nutzt die entsprechende Auswahlfunktion.
3. Der Akteur wählt einen Mitarbeiter aus.
4. Das System fügt den Mitarbeiter der Mitarbeiterliste des Termins hinzu.
5. Das System prüft Mitarbeiter-Überschneidungen im Zeitraum.
    1. Mitarbeiter dürfen keine überschneidenden Termine haben.
    2. Die Überschneidungsprüfung erfolgt tagesbasiert für alle zugeordneten Mitarbeiter und für alle Tage, die der Termin umfasst.
    3. Die Überschneidungsprüfung wird bei jeder Änderung der Termin-Mitarbeiterliste erneut ausgeführt, also auch durch das manuelle Hinzufügen.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Überschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Der Mitarbeiter wird nicht zugeordnet, es werden keine Änderungen gespeichert und es entstehen keine Teilzustände, insbesondere keine neuen Einträge in der Join-Tabelle Termin–Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Mitarbeiter bereits zugeordnet: Wenn der ausgewählte Mitarbeiter bereits dem Termin zugeordnet ist, darf das System keinen Duplikat-Eintrag erzeugen und muss entweder die Auswahl verhindern oder eine eindeutige Meldung anzeigen.

### **Ergebnis**

Der Mitarbeiter ist dem Termin zugeordnet und erscheint im Termin in der Liste der zugeordneten Mitarbeiter. Die Zuordnung ist als Eintrag in der Join-Tabelle Termin–Mitarbeiter abrufbar, ohne Duplikate.

Der Termin ist für diesen Mitarbeiter in der Mitarbeiter-Terminliste sichtbar. Der Termin ist außerdem weiterhin in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.

### UC 01/09: Mitarbeiter von einem Termin entfernen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen einem Termin zugeordneten Mitarbeiter wieder entfernen, sodass der Mitarbeiter im Termin nicht mehr als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in den relevanten Sichten dieses Mitarbeiters nicht mehr auftaucht.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Dem Termin ist mindestens ein Mitarbeiter zugeordnet.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur entfernt im Bereich „Zugeordnete Mitarbeiter“ einen konkreten Mitarbeiter, zum Beispiel über eine Entfernen-Aktion am Listeneintrag.
3. Das System entfernt den Mitarbeiter aus der Mitarbeiterliste des Termins.
4. Das System speichert den Termin.
5. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Änderungen gespeichert.
- Mitarbeiter nicht (mehr) zugeordnet: Wenn der Mitarbeiter zum Zeitpunkt des Speicherns nicht mehr zugeordnet ist, muss das System sicherstellen, dass kein Fehler durch inkonsistente Zwischenzustände entsteht, und der Termin bleibt konsistent gespeichert.

### **Ergebnis**

Der Mitarbeiter ist dem Termin nicht mehr zugeordnet und erscheint im Termin nicht mehr in der Liste der zugeordneten Mitarbeiter. Die entsprechende Zuordnung ist in der Join-Tabelle Termin–Mitarbeiter entfernt.

Der Termin ist für diesen Mitarbeiter nicht mehr in der Mitarbeiter-Terminliste sichtbar. Für andere weiterhin zugeordnete Mitarbeiter bleibt der Termin sichtbar. Der Termin bleibt in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten über die Projekt-Kunden-Beziehung.

### UC 01/10: Termin in abhängigen Sichten anzeigen (Quersicht-Vertrag)

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass nach jeder terminrelevanten Aktion die abhängigen Sichten, die ihre Terminlisten über API-Endpunkte beziehen, konsistent sind. Ein Termin muss dort erscheinen oder verschwinden, wo es fachlich aus den Beziehungen folgt, damit Projekt-, Kunden-, Mitarbeiter- und Tour-Formulare stets den gleichen Datenstand wie der Kalender widerspiegeln.

### **Vorbedingungen**

- Ein Termin existiert oder wird gerade neu angelegt.
- Der Termin ist einem Projekt zugeordnet, weil ein Termin ohne Projekt nicht zulässig ist.
- Über das Projekt ist der Kunde indirekt bestimmt.
- Optional: Dem Termin sind Mitarbeiter zugeordnet.
- Optional: Dem Termin ist eine Tour zugeordnet.

### **Ablauf**

1. Der Akteur führt eine terminrelevante Aktion aus, zum Beispiel Termin anlegen, Termin bearbeiten, Termin verschieben, Mitarbeiter zuweisen oder entfernen, Team als Einfügehilfe verwenden, Tour zuweisen oder Tour entfernen.
2. Das System speichert die Änderung vollständig und atomar, sodass keine Teilzustände entstehen, insbesondere keine halbfertigen Join-Einträge Termin–Mitarbeiter.
3. Das System aktualisiert alle abhängigen Sichten, die Termine anzeigen.
4. Das System stellt sicher, dass die abhängigen Sichten denselben fachlichen Zustand ausliefern, der sich aus den Beziehungen ergibt.

### **Alternativen**

- Abbruch: Der Akteur bricht die Aktion ab. Es werden keine Änderungen gespeichert, und folglich dürfen sich auch keine abhängigen Sichten ändern.
- Blockade durch Konflikt oder Regelverletzung: Wenn eine Aktion wegen Überschneidung oder anderer Regeln blockiert wird, wird nichts gespeichert, und keine abhängige Sicht darf einen veränderten Zustand anzeigen.

### **Ergebnis**

Der Termin ist in allen relevanten Sichten konsistent sichtbar oder nicht sichtbar, abhängig vom Ergebnis der Aktion.

Das bedeutet insbesondere: Das Mitarbeiterformular zeigt den Termin in der Mitarbeiter-Terminliste für alle dem Termin aktuell zugeordneten Mitarbeiter, und zeigt ihn nicht für Mitarbeiter, die nicht (mehr) zugeordnet sind. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, der über das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, ist der Termin in dieser Tour-Sicht nicht mehr sichtbar.

### UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Sichten, die Termin-Informationen denormalisiert anzeigen, nach Änderungen an Kunden- oder Projektdaten stets die aktuellen Werte ausliefern. Es darf nicht vorkommen, dass ein Termin in einer Kalender- oder Listenansicht noch veraltete Kunden- oder Projektnamen anzeigt, obwohl die Stammdaten bereits geändert wurden.

### **Vorbedingungen**

- Mindestens ein Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Über das Projekt ist der Kunde indirekt bestimmt.
- Es existiert mindestens eine Sicht, die Kunden- oder Projektnamen denormalisiert ausliefert, zum Beispiel eine Kalender- oder Terminlisten-Projektion.

### **Ablauf**

1. Der Akteur ändert Stammdaten, die in Terminprojektionen angezeigt werden, zum Beispiel den Namen eines Projekts oder den Namen eines Kunden.
2. Das System speichert die Stammdatenänderung.
3. Das System stellt sicher, dass alle Sichten, die Termine denormalisiert ausliefern, bei der nächsten Abfrage die aktualisierten Namen liefern.
4. Das System zeigt in diesen Sichten keine veralteten Namen mehr an.

### **Alternativen**

- Abbruch: Der Akteur bricht die Stammdatenänderung ab. Es werden keine Änderungen gespeichert, und es darf keine Sicht einen veränderten Namen anzeigen.
- Fehler beim Speichern: Falls das Speichern der Stammdaten fehlschlägt, dürfen nachfolgende Terminprojektionen keine teilweise aktualisierten oder inkonsistenten Namen ausliefern.

### **Ergebnis**

Alle Terminprojektionen und Terminlisten, die Kunden- oder Projektnamen anzeigen, liefern die aktuellen Namen konsistent aus. Ein Termin zeigt in Kalender- und Listenansichten die aktuellen Projekt- und Kundeninformationen, die sich aus Termin → Projekt → Kunde ergeben.

### UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)

### **Akteur**

Disponent, Administrator

### **Ziel**

Termine in Kalender- und Listenansichten anzeigen und über Filter so einschränken, dass das System konsistent genau die Termine liefert, die zum gewählten Zeitraum und zu den gewählten Kriterien passen. Die Projektion muss dabei die fachlich korrekten Beziehungen berücksichtigen, insbesondere dass jeder Termin einem Projekt zugeordnet ist und der Kunde indirekt über das Projekt bestimmt wird.

### **Vorbedingungen**

- Es existieren Termine in der Datenbank.
- Jeder Termin ist einem Projekt zugeordnet.
- Projekte sind Kunden zugeordnet, sodass der Kunde eines Termins indirekt über das Projekt ermittelt werden kann.
- Es existiert mindestens ein API-Endpunkt, der Termine als Kalender-/Listenprojektion ausliefert.

### **Ablauf**

1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.
2. Das System lädt die Termine für einen gewählten Zeitraum, zum Beispiel für einen Tag, eine Woche oder einen frei wählbaren Zeitraum.
3. Der Akteur setzt optional Filterkriterien, zum Beispiel nach Projekt, nach Tour oder nach Mitarbeiter.
4. Das System lädt die Termine erneut und liefert dabei nur die Termine aus, die sowohl im Zeitraum liegen als auch alle gesetzten Filterkriterien erfüllen.
5. Der Akteur ändert Filterkriterien oder den Zeitraum, und das System aktualisiert die Ergebnisliste entsprechend.

### **Alternativen**

- Keine Treffer: Wenn im Zeitraum oder mit den gesetzten Filtern keine Termine existieren, liefert das System eine leere Liste und die Ansicht bleibt stabil bedienbar.
- Ungültiger Zeitraum: Wenn ein ungültiger Zeitraum übergeben wird, blockiert das System die Anfrage mit einer eindeutigen Fehlermeldung und liefert keine Teilantwort.
- Filteränderung während paralleler Änderungen: Wenn sich Termine während der Nutzung durch andere Benutzer ändern, muss das System beim nächsten Laden konsistent den aktuellen Stand ausliefern.

### **Ergebnis**

Die Ansicht zeigt die vom System gelieferten Termine konsistent und reproduzierbar an. Die Terminmenge entspricht dem gewählten Zeitraum und den gesetzten Filtern. Alle in der Projektion angezeigten Projekt- und Kundeninformationen entsprechen den aktuellen Daten, wobei der Kunde stets indirekt über das Projekt bestimmt wird.

### UC 01/13: Termin-Farbdarstellung ableiten

### **Akteur**

Disponent, Administrator

### **Ziel**

Termine in Kalender- und Listenansichten mit einer konsistent abgeleiteten Farbe darstellen. Wenn ein Termin einer Tour zugeordnet ist, wird die Tourfarbe verwendet. Wenn keine Tour zugeordnet ist, wird eine definierte Standardfarbe verwendet. Diese Ableitung muss in allen Sichten identisch funktionieren und darf sich nicht zwischen Kalender, Listenprojektionen und Detailansichten widersprechen.

### **Vorbedingungen**

- Es existieren Termine in der Datenbank.
- Es existieren Touren mit definierter Farbe.
- Ein Termin kann einer Tour zugeordnet sein oder keine Tourzuordnung besitzen.
- Es existiert mindestens eine Sicht (Kalender oder Liste), die Termine farblich darstellt oder eine Farbe als Feld aus der Projektion bezieht.

### **Ablauf**

1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.
2. Das System lädt Termine als Projektion und stellt sie dar.
3. Für jeden Termin leitet das System die Darstellungsfarbe nach einer festen Regel ab.
    1. Wenn der Termin einer Tour zugeordnet ist, verwendet das System die Farbe dieser Tour.
    2. Wenn der Termin keiner Tour zugeordnet ist, verwendet das System eine definierte Standardfarbe.
4. Der Akteur weist einem Termin eine Tour zu oder entfernt die Tourzuweisung.
5. Das System aktualisiert die Darstellung, sodass sich die Farbe des Termins entsprechend der Regel sofort und konsistent ändert.

### **Alternativen**

- Tour ohne Farbe: Wenn eine Tour keine gültige Farbe besitzt, muss das System eine robuste Fallback-Regel anwenden, zum Beispiel die Standardfarbe, und darf keine fehlerhafte oder leere Darstellung erzeugen.
- Abbruch oder Blockade: Wenn eine Änderung (Tour setzen oder Tour entfernen) abgebrochen oder wegen Konflikt blockiert wird, darf sich die angezeigte Farbe nicht dauerhaft ändern, weil kein persistierter Zustand entstanden ist.

### **Ergebnis**

Jeder Termin wird in allen Sichten konsistent mit der korrekten Farbe dargestellt. Termine mit Tourzuordnung nutzen die Tourfarbe, Termine ohne Tourzuordnung nutzen die Standardfarbe. Nach Änderungen an der Tourzuordnung ist die Darstellung ohne Inkonsistenzen aktualisiert.

### UC 01/14: Historische Termine sind read-only

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass historische Termine nicht mehr veränderbar sind und dass das System keine neuen historischen Termine zulässt. Historisch bedeutet dabei, dass Datum oder Startzeit nicht vor dem aktuellen Zeitpunkt liegen dürfen. Das System muss Bearbeiten, Verschieben, Löschen sowie das Ändern von Zuordnungen (Tour, Team als Einfügehilfe, Mitarbeiter) für historische Termine blockieren und gleichzeitig verhindern, dass über UI-Aktionen historische Termine überhaupt neu angelegt werden können.

### **Vorbedingungen**

- Es existieren Termine in der Datenbank, darunter mindestens ein Termin, dessen Startzeitpunkt in der Vergangenheit liegt.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System verfügt über Validierung und Guard-Regeln, die historische Eingaben blockieren.

### **Ablauf**

1. Der Akteur öffnet einen historischen Termin im Terminformular.
2. Das System erkennt, dass der Termin historisch ist, und stellt den Termin im Read-only-Modus dar.
3. Das System verhindert alle Änderungen am Termin, insbesondere Änderungen an Startdatum, Enddatum, Startzeit, Projektzuordnung, Tourzuordnung und Mitarbeiterzuordnungen.
4. Das System verhindert das Löschen des historischen Termins, sofern Löschen für historische Termine nicht zulässig ist, oder blockiert das Löschen zumindest dann, wenn dadurch historische Daten verändert würden.
5. Der Akteur versucht im Kalender oder in einer Terminliste einen neuen Termin in der Vergangenheit anzulegen.
6. Das System blockiert die Terminerstellung in der Vergangenheit und stellt sicher, dass keine Speichern-Aktion möglich ist und keine persistierten Datensätze entstehen.

### **Alternativen**

- Grenzfall „heute, aber Startzeit in der Vergangenheit“: Wenn ein Benutzer für den heutigen Tag eine Startzeit in der Vergangenheit eingibt, blockiert das System den Vorgang ebenso wie bei einem Datum in der Vergangenheit.
- Abbruch: Wenn der Akteur die Bearbeitung abbricht, bleibt der Termin unverändert und es entstehen keine Teilzustände.
- Paralleländerungen: Wenn ein Termin während der Anzeige durch einen anderen Benutzer in einen historischen Zustand gerät, muss das System spätestens beim nächsten Speichern die Änderung blockieren und den Benutzer verständlich informieren.

### **Ergebnis**

Historische Termine sind nicht veränderbar. Es gibt keine Möglichkeit, historische Termine neu anzulegen oder bestehende Termine in die Vergangenheit zu verschieben. Das System stellt sicher, dass weder Termin-Datensätze noch Join-Einträge Termin–Mitarbeiter als Teilzustand entstehen, wenn eine historische Eingabe blockiert wird.

### UC 01/15: Konsistenz bei parallelen Änderungen (Optimistic Locking)

### **Akteur**

Disponent, Administrator

### **Ziel**

Verhindern, dass parallele Bearbeitungen am selben Termin zu Lost Updates führen. Wenn zwei Benutzer denselben Termin bearbeiten, darf eine spätere Speicherung nicht stillschweigend frühere Änderungen überschreiben. Stattdessen muss das System Versionskonflikte erkennen, die Speicherung blockieren und den Benutzer so informieren, dass er den aktuellen Stand neu laden und seine Änderungen bewusst erneut anwenden kann.

### **Vorbedingungen**

- Der Termin existiert.
- Das System verwendet eine Versionsinformation für Termine, mit der Änderungen gegen parallele Updates abgesichert werden.
- Zwei Benutzer können gleichzeitig auf denselben Termin zugreifen.

### **Ablauf**

1. Benutzer A öffnet einen bestehenden Termin im Terminformular.
2. Benutzer B öffnet denselben Termin im Terminformular, ohne von der Bearbeitung von Benutzer A zu wissen.
3. Benutzer A ändert den Termin und speichert.
4. Das System speichert die Änderungen von Benutzer A und erhöht die Versionsinformation des Termins.
5. Benutzer B ändert den Termin auf Basis seines nun veralteten Stands und versucht zu speichern.
6. Das System erkennt anhand der Versionsinformation, dass der Stand von Benutzer B veraltet ist, und blockiert die Speicherung mit einem Versionskonflikt.
7. Das System informiert Benutzer B eindeutig über den Konflikt und bietet einen Weg an, den Termin neu zu laden.
8. Benutzer B lädt den aktuellen Stand und entscheidet anschließend bewusst, ob und wie er seine Änderungen erneut anwenden möchte.
9. Benutzer B speichert erneut, diesmal auf Basis der aktuellen Version.

### **Alternativen**

- Konflikt beim Löschen: Wenn Benutzer B versucht zu löschen, während Benutzer A den Termin geändert hat, muss das System den Löschvorgang ebenfalls über einen Versionskonflikt blockieren, sodass keine unbeabsichtigte Löschung eines inzwischen geänderten Stands erfolgt.
- Konflikt bei Mitarbeiterzuordnungen: Wenn Benutzer A die Mitarbeiterliste geändert hat und Benutzer B parallel ebenfalls Änderungen an Mitarbeiterzuordnungen vornimmt, muss der Versionskonflikt ebenfalls greifen, sodass keine Join-Änderungen verloren gehen oder teilweise überschrieben werden.
- Abbruch: Benutzer B bricht nach Konfliktmeldung ab. Dann bleibt der Termin im Stand von Benutzer A erhalten.

### **Ergebnis**

Parallele Änderungen führen nicht zu stillen Überschreibungen. Stattdessen wird ein Versionskonflikt erkannt und die zweite Speicherung blockiert, bis der Benutzer auf Basis des aktuellen Stands erneut speichert. Der Termin und die Join-Tabelle Termin–Mitarbeiter bleiben konsistent, ohne Lost Updates und ohne Teilzustände.

### UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Zuordnungen zwischen Termin und Mitarbeitern deterministisch und konsistent bleiben. Insbesondere dürfen keine Duplikate in der Join-Tabelle Termin–Mitarbeiter entstehen, und wiederholte Eingaben oder mehrfache Anwendung von Einfügehilfen dürfen nicht zu instabilen oder inkonsistenten Mitarbeiterlisten führen.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Es existieren Mitarbeiter.
- Optional: Es existiert ein Team mit mindestens einem Mitarbeiter.
- Optional: Es existiert eine Tour mit mindestens einem Mitarbeiter.

### **Ablauf**

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur führt eine oder mehrere Zuweisungsaktionen aus, zum Beispiel:
    1. denselben Mitarbeiter mehrfach hinzufügen,
    2. ein Team als Einfügehilfe mehrfach anwenden,
    3. eine Tour zuweisen oder die Tour wechseln,
    4. Mitarbeiter manuell hinzufügen und anschließend wieder entfernen.
3. Das System aktualisiert die Mitarbeiterliste des Termins gemäß den fachlichen Regeln.
4. Das System speichert den Termin.
5. Das System stellt sicher, dass die Persistenz konsistent ist, insbesondere in der Join-Tabelle Termin–Mitarbeiter.

### **Alternativen**

- Wiederholte Auswahl desselben Mitarbeiters: Wenn der Akteur denselben Mitarbeiter erneut auswählt, muss das System entweder die Auswahl verhindern oder die Aktion als No-op behandeln. In keinem Fall darf ein Duplikat entstehen.
- Mehrfaches Anwenden derselben Einfügehilfe: Wenn Team oder Tour wiederholt angewendet wird, muss das Ergebnis deterministisch bleiben, ohne doppelte Join-Einträge und ohne instabile Reihenfolgen, und die Mitarbeiterliste muss den definierten Regeln entsprechen.
- Abbruch: Wenn der Akteur abbricht, werden keine Änderungen gespeichert und es entstehen keine Zwischenzustände in der Join-Tabelle.

### **Ergebnis**

Die Mitarbeiterzuordnungen eines Termins sind konsistent und duplikatfrei. Für jede Kombination aus Termin und Mitarbeiter existiert höchstens ein Join-Eintrag. Wiederholte Eingaben, Mehrfachklicks oder erneute Anwendung von Einfügehilfen erzeugen keine inkonsistenten Zustände. Die abhängigen Sichten zeigen denselben konsistenten Zustand, der in der Join-Tabelle persistiert ist.

# FT (02): Projekte

## FT (02) Ziel / Zweck

Dieses Feature ermöglicht der Disposition, **Projekte als zentrale fachliche Einheit** anzulegen, zu pflegen und in ihrem Lebenszyklus zu steuern.

Ein Projekt bildet den fachlichen Rahmen für alle zugehörigen Termine und bündelt alle projektbezogenen Informationen wie Beschreibung, Status, Notizen und Anhänge.

## FT (02) Fachliche Beschreibung

Ein Projekt repräsentiert einen Auftrag oder Vorgang (z. B. Aufbau, Service, Nachbesserung).

Es ist immer genau **einem Kunden** zugeordnet und besitzt Null, **eine oder mehrere Projektstatus Flaggen** aus einer administrierbaren Statusliste, 
die über eine n:m Beziehung organisiert werden.

Alle fachlichen Informationen, die **nicht terminspezifisch** sind, werden am Projekt gepflegt:

- eine ausführliche Projektbeschreibung (formatierter Text, z. B. Markdown),
- optionale Notizen (als eigenständiges Domainobjekt),
- projektbezogene Anhänge (z. B. Auftrag, Auftragsbestätigung, Pläne, Fotos).

Ein Projekt kann **ohne Termine** existieren.

Termine können **innerhalb eines Projekts** angelegt werden. Termine Können auch im Kalender angelegt werden, wo dann die Projektzuordnung erfolgt.

Projekt-Details sind immer **projektweit gültig** und gelten automatisch für alle zugehörigen Termine. Aus Termin- oder Kalenderansichten können Projekt-Details eingesehen, jedoch nicht zwingend dort bearbeitet werden.

In der Projektliste wird standardmäßig nur die für die Disposition relevante Arbeitsmenge angezeigt. Unter „Aktuelle Projekte“ versteht das System Projekte, die mindestens einen Termin besitzen, dessen Startdatum heute oder in der Zukunft liegt. Projekte ohne Termine sind im Standardfall bewusst ausgeblendet, weil sie nicht disponierbar sind. Über eine explizite Umschaltoption kann die Liste stattdessen auf „Projekte ohne Termine“ umgestellt werden; in diesem Modus werden ausschließlich Projekte angezeigt, die keinen Termin besitzen. Zusätzliche Filter wie Titel- oder Statusfilter wirken immer nur auf die jeweils geladene Projektmenge und definieren nicht die Grundmenge.

## FT (02) Regeln & Randbedingungen

- Ein Projekt ist immer genau **einem Kunden** zugeordnet.
- Ein Projekt hat einen oder mehrere **Status Flags**.
- Projektstatus werden in einer **eigenen Stammdatentabelle** gepflegt.
    - Default-Statuswerte sind geschützt und nicht löschbar.
- Ein Projekt kann ohne Termine existieren.
- Projekt-Details (Beschreibung, Notizen, Anhänge) gehören **ausschließlich** zum Projekt, nicht zum Termin.
- Notizen sind optional und frei pflegbar.
- Anhänge sind optional; ein Projekt kann mehrere Anhänge besitzen.
- Anhänge sind dauerhaft dem Projekt zugeordnet.
- Das physische Löschen eines Projekts ist nur zulässig, wenn keine Termine existieren.

## **FT (02) Use Cases**

### UC 02/01: Projekt anlegen

### **Akteur**

Administrator, Disponent

### **Ziel**

Ein neues Projekt erfassen, einem Kunden zuordnen und einen initialen Status setzen.

### **Vorbedingungen**

- Kunde existiert.
- Mindestens ein Projektstatus existiert.

### **Ablauf**

1. Akteur startet „Projekt anlegen“.
2. Akteur wählt einen Kunden.
3. Akteur erfasst Titel und optional eine Beschreibung (Markdown).
4. Akteur wählt einen Projektstatus (Default z. B. „In Planung“).
5. System speichert das Projekt.

### **Ergebnis**

Projekt existiert und kann für Terminplanung genutzt werden.

### UC 02/02: Projekt bearbeiten

### **Akteur**

Administrator, Disponent

### **Ziel**

Projektdaten und fachliche Inhalte ändern.

### **Vorbedingungen**

Projekt existiert.

### **Ablauf**

1. Akteur öffnet ein Projekt.
2. Akteur ändert zulässige Felder (Titel, Kunde, Status, Beschreibung).
3. System speichert die Änderungen.

### **Ergebnis**

Projekt ist aktualisiert.

### UC 02/03: Projekt anzeigen

### Akteur

Administrator, Disponent

### Ziel

Alle fachlichen Informationen eines Projekts einsehen.

### Vorbedingungen

- Projekt existiert.
- Projekt ist genau einem bestehenden Kunden zugeordnet.
- Der Akteur besitzt Leserechte gemäß seiner Rolle.

### Ablauf

1. Akteur öffnet ein Projekt
2. System zeigt Projektdaten, Beschreibung, Notizen, Anhänge und zugehörige Termine an.
3. System zeigt alle dem Projekt zugeordneten Status (n:m-Beziehung) an.
4. System zeigt den dem Projekt zugeordneten Kunden mit seinen Stammdaten an.

### Alternativen

- Projekt nicht vorhanden → System antwortet mit 404.
- Akteur ohne ausreichende Leserechte → System blockiert mit 403.
- Projekt besitzt keine Status → Statusbereich bleibt leer.
- Projekt besitzt keine Notizen → Notizenliste ist leer.
- Projekt besitzt keine Anhänge → Anhangsliste ist leer.
- Projekt besitzt keine Termine → Terminliste ist leer.

### Ergebnis

Vollständiger Überblick über das Projekt.

Alle projektbezogenen Informationen (Kunde, Status, Notizen, Anhänge, Termine) werden konsistent angezeigt.

Es erfolgt keine fachliche Datenänderung.

### UC 02/04: Projektstatus ändern

### Akteur

Administrator, Disponent

### Ziel

Den aktuellen Projektstatus anpassen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.
- Mindestens ein gültiger Projektstatus ist im System definiert.

### Ablauf

1. Akteur öffnet ein Projekt.
2. Akteur löscht einen vorhandenen Status und wählt einen neuen oder wählt einen zusätzlichen Status zu den vorhandenen.
3. System prüft, ob der gewählte Status aktiv ist.
4. System speichert die Änderung der n:m-Beziehung zwischen Projekt und Status.

### Alternativen

- Projekt nicht vorhanden → System antwortet mit 404.
- Akteur ohne Änderungsrechte → System blockiert mit 403.
- Gewählter Status ist deaktiviert → System verweigert die Zuweisung.
- Doppelte Statuszuweisung → System verhindert Mehrfacheintrag.

### Ergebnis

Projekt befindet sich im neuen Status.

Die Statusänderung wirkt ausschließlich auf das Projekt.

### UC 02/05: Projektnotizen pflegen

### Akteur

Administrator, Disponent

### Ziel

Zusätzliche projektbezogene Notizen erfassen oder ändern.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.

### Ablauf

1. Akteur öffnet das Projekt.
2. Akteur ergänzt eine neue Notiz oder ändert eine bestehende Notiz.
3. System validiert die Eingabe gemäß den Regeln aus FT (13).
4. System speichert die Notiz projektbezogen.

### Alternativen

- Projekt nicht vorhanden → System antwortet mit 404.
- Akteur ohne Änderungsrechte → System blockiert mit 403.
- Eingabe ungültig → System speichert nicht und zeigt eine Fehlermeldung.
- Abbruch der Bearbeitung → Keine Änderung wird gespeichert.

### Ergebnis

Notizen sind dem Projekt eindeutig zugeordnet und verfügbar.

Bestehende Beziehungen zu Kunde, Status und Terminen bleiben unverändert.

### UC 02/06: Projektanhänge verwalten

### Akteur

Administrator, Disponent

### Ziel

Dokumente zu einem Projekt hinzufügen und projektbezogene Anhänge einsehen bzw. herunterladen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.
- Die hochzuladende Datei entspricht den systemseitig erlaubten Formaten.

### Ablauf

1. Akteur öffnet das Projekt.
2. System zeigt die Liste der vorhandenen Anhänge an (mit Metadaten wie Dateiname und Zeitstempel, sofern verfügbar).
3. Akteur fügt einen oder mehrere Anhänge hinzu (Upload).
4. System prüft die Existenz des Projekts und ordnet die hochgeladenen Dateien eindeutig dem Projekt zu.
5. System speichert die neuen Anhänge.
6. Akteur kann vorhandene Anhänge öffnen (Preview) oder herunterladen.

### Alternativen

- Projekt nicht vorhanden → System antwortet mit 404.
- Akteur ohne Änderungsrechte → System blockiert mit 403.
- Upload abgebrochen oder Datei ungültig → System speichert keinen neuen Anhang und zeigt eine verständliche Fehlermeldung.
- Anhänge können nicht gelöscht werden → Eine „Entfernen/Löschen“-Aktion wird nicht angeboten.

### Ergebnis

Anhänge sind korrekt dem Projekt zugeordnet und stehen für alle zugehörigen Termine zur Verfügung.

Bestehende Daten (Projekt, Status, Notizen, Termine) bleiben unverändert.

### UC 02/07: Projekte anzeigen

### Akteur

Administrator, Disponent

### Ziel

Der Akteur sieht eine für die tägliche Arbeit passende Projektliste und kann bei Bedarf auf Projekte ohne Termine umschalten.

### Vorbedingungen

- Projekte sind im System vorhanden.
- Der Akteur besitzt Leserechte gemäß seiner Rolle.

### Ablauf

1. Der Akteur öffnet die Projektübersicht.
2. Das System lädt standardmäßig die Projektmenge „Aktuelle Projekte“.
3. Das System zeigt ausschließlich Projekte an, die mindestens einen Termin mit Startdatum heute oder in der Zukunft besitzen.
4. Der Akteur kann die Umschaltoption „Ohne Termine“ aktivieren.
5. Das System lädt ausschließlich Projekte ohne Termine und zeigt diese an.
6. Der Akteur kann zurück auf „Aktuelle Projekte“ umschalten; das System lädt wieder die Standardmenge.
7. Titel- oder Statusfilter wirken ausschließlich auf die jeweils geladene Grundmenge.

### Alternativen

- Keine Projekte in der jeweiligen Grundmenge vorhanden → System zeigt eine leere Liste an.
- Akteur ohne Leserechte → System blockiert mit 403.

### Ergebnis

Der Akteur sieht entweder die aktuellen Projekte oder ausschließlich Projekte ohne Termine, jeweils als klar getrennte Mengen. Es findet keine Vermischung der Grundmengen statt. Es erfolgt keine fachliche Datenänderung.

### UC 02/08: Projekt löschen

### Akteur

Administrator, Disponent

### Ziel

Ein Projekt dauerhaft aus dem System entfernen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Löschrechte gemäß seiner Rolle.
- Dem Projekt sind keine Termine zugeordnet.

### Ablauf

1. Akteur öffnet das Projekt.
2. Akteur wählt die Funktion „Projekt löschen“.
3. System prüft, ob dem Projekt Termine zugeordnet sind.
4. System prüft die Berechtigung des Akteurs.
5. System entfernt das Projekt sowie alle zugeordneten Statusbeziehungen und Projektnotizen.
6. System entfernt die projektbezogene Referenz auf Anhänge.
7. System bestätigt die erfolgreiche Löschung.

### Alternativen

- Projekt nicht vorhanden → System antwortet mit 404.
- Akteur ohne Löschrechte → System blockiert mit 403.
- Projekt besitzt mindestens einen Termin → System blockiert mit 409 und löscht nicht.

### Ergebnis

Das Projekt ist dauerhaft entfernt.

Zugehörige Statusbeziehungen und Notizen existieren nicht mehr.

Termine bleiben unverändert bestehen, da eine Löschung nur ohne vorhandene Termine möglich ist.

### UC 02/09: Projektänderung wird in Terminansichten konsistent dargestellt

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Änderungen an Projektdaten in allen Terminansichten korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind mindestens ein oder mehrere Termine zugeordnet.
- Eine Terminansicht (Kalender oder Tabelle) ist geöffnet.

### Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde oder Beschreibung).
2. System speichert die Änderung.
3. System invalidiert betroffene Ansichten.
4. Offene Terminansichten aktualisieren die referenzierten Projektdaten.

### Alternativen

- Keine Terminansicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Projekt ohne Termine → Keine Terminansicht betroffen.

### Ergebnis

Alle Terminansichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten Projektreferenzen in Termin-Karten.

### UC 02/10: Projektstatusänderung wirkt systemweit konsistent

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Statusänderungen eines Projekts in allen relevanten Sichten korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein Status ist zugeordnet oder wird geändert.

### Ablauf

1. Akteur ändert den Projektstatus.
2. System speichert die n:m-Änderung.
3. System aktualisiert Projektübersichten und Filterergebnisse.
4. Terminansichten aktualisieren Statusanzeigen, sofern diese angezeigt werden.

### Alternativen

- Status wird entfernt → Darstellung aktualisiert sich entsprechend.
- Status wird hinzugefügt → Darstellung aktualisiert sich entsprechend.

### Ergebnis

Projektstatus ist in allen Sichten identisch sichtbar.

Statusfilter liefern konsistente Ergebnisse.

### UC 02/11: Projektlöschung wird systemweit korrekt verarbeitet

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die Löschung eines Projekts keine inkonsistenten Referenzen hinterlässt.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind keine Termine zugeordnet.

### Ablauf

1. Akteur löscht ein Projekt.
2. System entfernt das Projekt.
3. System aktualisiert Projektübersichten.
4. Offene Detailansichten schließen sich oder wechseln in einen neutralen Zustand.

### Alternativen

- Projekt besitzt Termine → Löschung wird blockiert, keine Ansicht ändert sich.

### Ergebnis

Es existieren keine Referenzen auf das gelöschte Projekt.

Alle Sichten sind konsistent.

### UC 02/12: Projekt in abhängigen Sichten anzeigen (Quer­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Projekt ist mindestens einer abhängigen Sicht referenziert (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte.

### Ablauf

1. Eine abhängige Sicht (z. B. Terminliste oder Kalender) lädt ein oder mehrere Termine mit Projektbezug.
2. System stellt sicher, dass projektrelevante Anzeigedaten nicht lokal dupliziert oder eigenständig persistiert werden.
3. Die Sicht bezieht projektrelevante Informationen ausschließlich aus der gültigen Projektquelle.
4. Darstellung erfolgt konsistent mit der Projekt-Detailansicht.

### Alternativen

- Projekt wurde zwischenzeitlich gelöscht → Referenz darf nicht mehr existieren.
- Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.

### Ergebnis

Alle abhängigen Sichten zeigen identische und konsistente Projektdaten.

Es existieren keine widersprüchlichen Projektrepräsentationen zwischen Detailansicht und Quer­sichten.

### UC 02/13: Denormalisierte Projektanzeige aktualisieren (Quer­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Änderungen an Projektdaten in allen abhängigen Sichten ohne Inkonsistenz sichtbar werden.

### Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhängigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).
- Der Akteur besitzt Änderungsrechte.

### Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde, Status oder Beschreibung).
2. System speichert die Änderung am Projekt.
3. System erkennt betroffene abhängige Sichten.
4. System invalidiert veraltete Projektrepräsentationen in diesen Sichten.
5. Abhängige Sichten laden die aktualisierten Projektdaten neu.

### Alternativen

- Keine abhängige Sicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Änderung wird verworfen oder schlägt fehl → Keine Sicht wird aktualisiert.

### Ergebnis

Alle abhängigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprüchlichen Projektinformationen im System.

### UC 02/14: Konsistenz bei parallelen Änderungen an Projekten (Optimistic Locking)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass parallele Änderungen an einem Projekt keine inkonsistenten Zustände oder stillen Überschreibungen verursachen.

### Vorbedingungen

- Projekt existiert.
- Projekt wird von mindestens zwei Akteurn parallel geöffnet.
- Projekt besitzt ein Versionierungsmerkmal (z. B. Versionsnummer oder Zeitstempel).
- Beide Akteur besitzen Änderungsrechte.

### Ablauf

1. Akteur A und Akteur B öffnen dasselbe Projekt.
2. Akteur A ändert Projektdaten und speichert.
3. System erhöht die Projektversion.
4. Akteur B ändert Projektdaten auf Basis der alten Version und speichert.
5. System erkennt die veraltete Versionsbasis.
6. System verweigert das Speichern und antwortet mit einem Konflikt (z. B. 409 Conflict).

### Alternativen

- Keine parallele Änderung → Speichern erfolgt regulär.
- Akteur B lädt das Projekt nach dem Konflikt neu → Aktuelle Version wird geladen.

### Ergebnis

Es kommt zu keiner stillen Überschreibung von Projektdaten.

Das Projekt bleibt in einem konsistenten Zustand.

Abhängige Sichten zeigen ausschließlich den zuletzt erfolgreich gespeicherten Zustand.

### UC 02/15: Projekt-Join-Konsistenz (Projekt ↔ Status)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die n:m-Beziehung zwischen Projekt und Projektstatus jederzeit konsistent, eindeutig und frei von verwaisten Relationen ist.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein Projektstatus ist im System definiert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.

### Ablauf

1. Akteur fügt einem Projekt einen oder mehrere Status hinzu oder entfernt bestehende Status.
2. System prüft vor dem Speichern, ob der Status existiert.
3. System verhindert die Mehrfachzuweisung desselben Status zum selben Projekt.
4. System speichert die Join-Änderung atomar.
5. Bei Projektlöschung entfernt das System alle zugehörigen Join-Einträge.

### Alternativen

- Status existiert nicht → System verweigert die Zuweisung.
- Status ist deaktiviert → System verweigert neue Zuweisungen.
- Parallele Änderung der Statusliste → System erkennt Versionskonflikt und antwortet mit 409 Conflict.

### Ergebnis

Die n:m-Beziehung zwischen Projekt und Status ist eindeutig und konsistent gespeichert.

Es existieren keine doppelten oder verwaisten Join-Einträge.

Die Integrität bleibt auch bei Projektlöschung gewahrt.

### UC 02/16: Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass jedes Projekt jederzeit genau einem gültigen Kunden zugeordnet ist und keine inkonsistenten Referenzen entstehen.

### Vorbedingungen

- Projekt existiert oder wird bearbeitet.
- Mindestens ein Kunde ist im System definiert.
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.

### Ablauf

1. Akteur legt ein Projekt an oder ändert den zugeordneten Kunden eines bestehenden Projekts.
2. System prüft, ob der ausgewählte Kunde existiert.
3. System prüft, ob der ausgewählte Kunde aktiv ist.
4. System speichert die Kundenreferenz am Projekt.
5. Bei Deaktivierung eines Kunden bleiben bestehende Projekte unverändert referenziert.

### Alternativen

- Kein Kunde ausgewählt → System verweigert das Speichern.
- Kunde existiert nicht → System verweigert das Speichern.
- Kunde ist deaktiviert → System verweigert neue Zuweisungen.
- Kunde soll gelöscht werden, während Projekte referenzieren → Löschung wird blockiert.

### Ergebnis

Jedes Projekt ist genau einem gültigen Kunden zugeordnet.

Es existieren keine Projekte ohne Kundenreferenz.

Historische Projekte mit deaktivierten Kunden bleiben konsistent lesbar.

### UC 02/17: Projekt-Mengenlogik-Konsistenz (Projektübersicht)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die Projektübersicht die fachlich definierten Grundmengen korrekt und disjunkt darstellt.

### Vorbedingungen

- Projekte sind im System vorhanden.
- Projekte können Termine in Vergangenheit, Gegenwart oder Zukunft besitzen.
- Der Akteur besitzt Leserechte gemäß seiner Rolle.

### Ablauf

1. Akteur öffnet die Projektübersicht.
2. System lädt standardmäßig die Grundmenge „Aktuelle Projekte“.
3. System berücksichtigt ausschließlich Projekte, die mindestens einen Termin mit Startdatum ≥ heute besitzen.
4. Akteur kann auf die Grundmenge „Ohne Termine“ umschalten.
5. System lädt ausschließlich Projekte ohne zugeordnete Termine.
6. Filter (z. B. Titel, Status) wirken ausschließlich innerhalb der jeweils geladenen Grundmenge.

### Alternativen

- Projekt besitzt ausschließlich vergangene Termine → Projekt erscheint nicht in „Aktuelle Projekte“.
- Projekt besitzt vergangene und zukünftige Termine → Projekt erscheint in „Aktuelle Projekte".
- Projekt besitzt keine Termine → Projekt erscheint nur in „Ohne Termine".
- Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.

### Ergebnis

Die Grundmengen „Aktuelle Projekte" und „Ohne Termine" sind disjunkt.

Filter verändern nicht die zugrunde liegende Grundmenge.

Die Projektübersicht ist fachlich konsistent und nachvollziehbar.

### UC 02/18: Race Condition bei Projektlöschung

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass eine Projektlöschung nicht zu inkonsistenten Zuständen führt, wenn parallel ein Termin für dieses Projekt angelegt wird.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind zum Zeitpunkt der Löschprüfung keine Termine zugeordnet.
- Der Akteur besitzt Löschrechte gemäß seiner Rolle.

### Ablauf

1. Akteur initiiert die Löschung eines Projekts.
2. System prüft, ob dem Projekt Termine zugeordnet sind.
3. Zwischen Prüfung und tatsächlicher Löschung wird serverseitig eine atomare Konsistenzprüfung durchgeführt.
4. Falls währenddessen ein Termin für dieses Projekt angelegt wurde, erkennt das System die neue Referenz.
5. System bricht die Löschung ab und antwortet mit einem Konflikt (z. B. 409 Conflict).
6. Nur wenn keine Terminreferenz existiert, löscht das System das Projekt.

### Alternativen

- Projekt existiert nicht → System antwortet mit 404.
- Akteur ohne Löschrechte → System blockiert mit 403.
- Keine parallele Terminanlage → Löschung erfolgt regulär.

### Ergebnis

Es entsteht kein inkonsistenter Zustand zwischen Projekt- und Terminobjekten.

Ein Projekt mit Terminreferenz kann nicht gelöscht werden.

Die referenzielle Integrität bleibt jederzeit gewahrt.

### UC 02/19: Projekt in abhängigen Sichten anzeigen (Quer­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Projektdaten in allen abhängigen Sichten konsistent und referenziell korrekt dargestellt werden.

### Vorbedingungen

- Projekt existiert.
- Projekt wird in mindestens einer abhängigen Sicht verwendet (z. B. Terminliste, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte gemäß seiner Rolle.

### Ablauf

1. Eine abhängige Sicht lädt Termine oder Listen mit Projektbezug.
2. System stellt sicher, dass Projektdaten nicht lokal dupliziert oder eigenständig persistiert werden.
3. Die Sicht bezieht Projektdaten ausschließlich über die gültige Projektquelle.
4. Die Darstellung erfolgt konsistent zur Projekt-Detailansicht.

### Alternativen

- Projekt wurde gelöscht → Referenz darf nicht mehr angezeigt werden.
- Projekt besitzt keine abhängigen Sichten → Keine weitere Aktion erforderlich.

### Ergebnis

Alle abhängigen Sichten zeigen identische Projektdaten.

Es existieren keine widersprüchlichen Projektrepräsentationen im System.

### UC 02/20: Denormalisierte Projektanzeige aktualisieren

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Änderungen an Projektdaten in allen abhängigen Sichten ohne Inkonsistenz sichtbar werden.

### Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhängigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Änderungsrechte gemäß seiner Rolle.

### Ablauf

1. Akteur ändert Projektdaten (z. B. Titel, Kunde oder Beschreibung).
2. System speichert die Änderung am Projekt.
3. System erkennt alle betroffenen abhängigen Sichten.
4. System invalidiert veraltete Projektrepräsentationen in diesen Sichten.
5. Abhängige Sichten laden die aktualisierten Projektdaten neu.

### Alternativen

- Keine abhängige Sicht geöffnet → Aktualisierung erfolgt beim nächsten Laden.
- Änderung wird verworfen oder schlägt fehl → Keine Sicht wird aktualisiert.

### Ergebnis

Alle abhängigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprüchlichen Projektinformationen.

# FT (03): Kalenderansichten

## FT (03) Ziel / Zweck

Dieses Feature stellt Kalenderansichten bereit, um Termine über definierte Zeiträume hinweg übersichtlich darzustellen und die Disposition bei der Orientierung und Planung zu unterstützen. Es enthält ausschließlich Anzeige-, Navigations- und Drilldown-Funktionen und verändert keine Termindaten.

## FT (03) Fachliche Beschreibung

Die Anwendung visualisiert Termine in periodischen Kalenderansichten (Woche, Monat, mehrmonatige Übersicht, Jahresübersicht). Termine werden als **farbige Balken** dargestellt, deren Farbe aus der **Tourzuordnung** abgeleitet wird. Der Balken deckt den vollständigen Zeitraum des Termins ab und zeigt kompakt **Kundenname** und **Postleitzahl** an. 
FT (03) Terminplanung und Kalen…

Zusätzlich bietet jeder Termin einen **Tooltip** in Form einer größeren Informationskarte. Diese Karte fasst Informationen aus **Projekt**, **Kunde** und **Team/Mitarbeiterzuweisung** zusammen. Die Informationen werden aus den bestehenden Beziehungen abgeleitet (Termin → Projekt → Kunde sowie Termin → Mitarbeiter und optional Termin → Tour).

Die Ansichten müssen „heruntergebrochen“ werden können, also die Kalenderdarstellung muss wahlweise auf **Tour**, **Team** oder **Mitarbeiter** fokussiert werden, ohne dass sich die Terminlogik ändert.

## FT (03) Regeln & Randbedingungen

Die Kalenderansichten sind Dispositionsoberflächen und nicht nur Anzeigeansichten. In allen Kalenderansichten können Termine über den `+`-Button pro Kalendertag angelegt werden, und Termine können per Drag & Drop verschoben werden. Beide Aktionen sind fachliche Änderungen und gehören zum Kernprozess der Disposition.

Für das Anlegen und Bearbeiten von Terminen wird ausschließlich das in **FT (01)** definierte Terminformular verwendet. Die Kalenderansichten führen keine eigene Logik zum Erstellen oder Editieren von Terminen ein, sondern öffnen das bestehende Formular im passenden Modus. Beim Klick auf `+` wird das Formular im Modus „Neuer Termin“ geöffnet und das Startdatum wird auf den angeklickten Tag gesetzt. Beim Klick auf einen bestehenden Termin wird das Formular im Modus „Termin bearbeiten“ geöffnet.

Für alle ändernden Aktionen gelten die gleichen Sperr- und Rollenregeln wie beim Bearbeiten eines Termins. Ein Termin darf ab seinem Starttag von normalen Benutzern nicht mehr geändert werden. Administratoren dürfen diese Sperre übersteuern und Termine auch nachträglich verändern. In gesperrten Fällen sind Drag & Drop sowie das Bearbeiten über Klick zu verhindern oder eindeutig mit einer Fehlermeldung abzulehnen.

Das Verschieben eines Termins per Drag & Drop führt immer zu einer deterministischen Neuordnung der Termindarstellung in allen betroffenen Kalendertagen. Betroffen sind mindestens der Quelltag und der Zieltag, bei mehrtägigen Terminen alle Tage der Termindauer. Nach dem Drop müssen die Platzierungs- und Sortierregeln erneut angewendet werden, damit die Darstellung konsistent bleibt und keine visuellen Überschneidungen entstehen.

Die Monats- und Jahresansicht nutzen eine kompakte Termindarstellung als farbigen waagerechten Balken. Dieser Balken muss mindestens Kundennummer, Postleitzahl und Projekttitel darstellen können. Welche Teile tatsächlich sichtbar sind, richtet sich nach der verfügbaren Breite des Balkens; bei geringer Breite werden Informationen gekürzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht.

Die Wochenansicht nutzt eine detailreichere Termindarstellung als größere Fläche. Diese Darstellung muss Projekttitel, Projektbeschreibung und Projektstatus anzeigen können sowie vom Kunden mindestens Kundennummer und Name. Zusätzlich muss sie die dem Termin zugewiesenen Mitarbeiter anzeigen können. Die Wochenansicht kann kollabierbare Reihen oder Bereiche besitzen; dies verändert die Informationsdichte, aber nicht die fachlichen Regeln.

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bündelt. Dieses Popover muss mindestens den Informationsumfang der detailreichen Termindarstellung der Wochenansicht bereitstellen. Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern das die Bedienbarkeit verbessert; es dürfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

Die Kalenderansichten benötigen für die dargestellten Termine Zugriff auf Projekt- und Kundendaten sowie auf die Mitarbeiterzuordnungen. Diese Informationen dürfen serverseitig zusammengeführt oder bei Bedarf nachgeladen werden, solange die Oberfläche ohne spürbare Verzögerung bedienbar bleibt. Mouse-Over darf Details nachladen, muss jedoch pro Termin zwischenspeichern, damit wiederholtes Hovering keine wiederholten Ladevorgänge auslöst.

## FT (03) Darstellung

## Gesamtkonzept: Einheitliche Logik, verschiedene Render-Modi

In den drei Hauptansichten **Woche**, **Monat** und **Jahr** werden Termine grundsätzlich einheitlich visualisiert, jedoch mit unterschiedlichen Informationsdichten. Die **grafische Grundstruktur der Kalendertage** (Raster, Tageskacheln, Kopfzeilen, etc.) bleibt unverändert. Der Unterschied liegt ausschließlich in der Art, wie Termine innerhalb der Tagesflächen angeordnet und gerendert werden.

Die Kalenderansichten können sowohl als eigenständige Ansicht als auch innerhalb eines **Dialogs/Popups** geöffnet werden. Die Darstellung und Interaktionsregeln bleiben dabei identisch; der Dialogmodus ist ausschließlich eine alternative Einbettung mit reduziertem Kontext.

In allen Kalenderansichten muss eine **Filtermöglichkeit nach Mitarbeiter** vorgesehen werden. Der Filter wirkt auf die dargestellten Termine und reduziert die sichtbaren Termine auf solche, denen der gewählte Mitarbeiter zugewiesen ist. Der Filter darf optional Mehrfachauswahl unterstützen, muss aber mindestens die Auswahl eines einzelnen Mitarbeiters ermöglichen.

Ein Termin ist ein Zeitraum mit **Startdatum** und optional **Enddatum**. Ein Termin kann optional einer **Tour** zugeordnet sein. Eine Tour besitzt eine **individuelle Farbe**, die die Terminfarbe bestimmt. Ist keine Tour zugeordnet, wird eine **neutrale Farbe** verwendet.

Ein Termin kann optional eine **Startzeit** haben. Solche Termine werden als **Intraday-Termine** bezeichnet. Intraday-Termine werden optisch weiterhin wie Ein-Tages-Termine behandelt, d. h. sie sind nicht als „stundenbasierte Zeitleiste“ darzustellen. Die Startzeit wird lediglich als zusätzliche Information im Termin angezeigt und beeinflusst die Sortierung.

## Begriffe und Layout-Grundlage

Kalendertage sind innerhalb einer Ansicht in einem Raster angeordnet. Zur Vereinfachung wird die sichtbare Fläche eines einzelnen Kalendertags als **Tag** bezeichnet.

Termine werden innerhalb eines Tags nicht übereinander gelegt, sondern vertikal in **Zeilen** organisiert. Diese Zeilen heißen im Folgenden **Lanes** (oder Slots). Eine Lane ist eine reine Organisations- und Positionierungshilfe und ist in der UI nicht als eigene Linie sichtbar.

Die konkrete Höhe einer Lane hängt vom jeweiligen Darstellungsmodus (kompakt oder detailliert) und den verwendeten UI-Komponenten (Schrifthöhen, Padding, etc.) ab.

## Lane-System: Ziel und Grundregeln

Das Lane-System hat zwei Ziele.

Erstens soll es sicherstellen, dass mehrere Termine am selben Tag **nicht überlappen**, sondern vertikal untereinander dargestellt werden.

Zweitens soll es, wo möglich, Termine gleicher Tour so anordnen, dass sie visuell als zusammengehörige „Spur“ wahrgenommen werden.

Die Lane-Zuordnung wird **nicht** aus global existierenden Touren abgeleitet, sondern aus den Terminen, die im jeweiligen sichtbaren Abschnitt tatsächlich vorkommen. Dadurch bleibt die Darstellung kompakt und wächst nur dort, wo es wirklich nötig ist.

### Lane-Zuordnung

Für die Lane-Zuordnung wird pro sichtbarem Abschnitt (je nach Ansicht) eine Lane-Struktur berechnet.

In der **Monatsansicht** und **Jahresansicht** wird die Lane-Struktur pro **Kalenderreihe** (also pro Wochenzeile im Raster) bestimmt.

In der **Wochenansicht** wird die Lane-Struktur pro **Woche** (bzw. pro dargestelltem Wochenabschnitt) bestimmt.

Für jede Tour, die in diesem Abschnitt vorkommt, existiert mindestens eine Lane. Zusätzlich existiert eine Lane für **Termine ohne Tour**, die unterhalb der Tour-Lanes liegt. Damit ergibt sich eine stabile vertikale Grundordnung: „Tour-Lanes oben, tourlose Termine darunter“.

## Darstellung eines Termins: Balken über mehrere Tage

Termine werden grundsätzlich als **waagerechte Elemente** dargestellt, die sich über die Tage spannen, die zum Termin gehören.

Ein Ein-Tages-Termin belegt nur den Tag des Startdatums.

Ein Mehrtages-Termin überspannt alle Tage vom Startdatum bis einschließlich Enddatum.

Intraday-Termine (mit Startzeit) werden geometrisch wie Ein-Tages-Termine behandelt. Ein Intraday-Termin hat kein abweichendes Enddatum. Der Unterschied besteht lediglich darin, dass die Startzeit angezeigt wird und die Sortierung innerhalb einer Lane beeinflusst wird.

Die Farbe des Termin-Elements folgt der Tourfarbe oder ist neutral, wenn keine Tour zugeordnet ist.

## Konflikte innerhalb einer Lane: Mehrere Termine am selben Tag

Wenn innerhalb derselben Lane am selben Tag mehrere Termine angezeigt werden müssen, werden diese innerhalb der Lane vertikal gestapelt. Dabei gilt.

Zuerst werden All-day- und Mehrtages-Termine platziert.

Danach werden Intraday-Termine platziert.

Intraday-Termine werden nach Startzeit aufsteigend sortiert.

Bei gleichen Startzeiten wird als Tie-Breaker eine stabile Sortierung verwendet (z. B. ID).

In der Monats- und Jahresansicht wird die erforderliche Höhe pro Reihe so bestimmt, dass alle Stapelungen in dieser Reihe sichtbar sind, oder es wird eine explizit definierte Verdichtungsregel verwendet.

In der Wochenansicht ist eine variable Höhe aufgrund von Detaildarstellung zulässig.

## Render-Modi: Kompakt vs. Detailliert

Damit die Darstellung in Woche, Monat und Jahr konsistent bleibt, wird zwischen zwei Render-Modi unterschieden.

### Kompakter Modus (Balken)

Der Termin wird als flacher Balken dargestellt. Der Balken muss mindestens folgende Informationen darstellen können.

Erstens die **Kundennummer**.

Zweitens die **Postleitzahl**.

Drittens den **Projekttitel**.

Abhängig von der verfügbaren Breite werden Teile dieser Informationen gekürzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht. Intraday-Termine zeigen zusätzlich die Startzeit.

Dieser Modus ist der Standard in **Monatsansicht** und **Jahresansicht**.

### Detaillierter Modus (Termin-Panel)

Der Termin wird als größere Fläche dargestellt. Diese Darstellung muss mindestens folgenden Informationsumfang abbilden können.

Vom Projekt müssen **Titel**, **Beschreibung** und **Status** dargestellt werden.

Vom Kunden müssen mindestens **Kundennummer** und **Name** dargestellt werden.

Außerdem müssen die dem Termin **zugewiesenen Mitarbeiter** dargestellt werden können.

Dieser Modus wird in der **Wochenansicht** genutzt.

## Popover bei Mouse-Over

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bündelt. Dieses Popover muss mindestens den Informationsumfang des detaillierten Termin-Panels enthalten und darf dieselben Inhaltsbausteine wiederverwenden, damit keine abweichenden Varianten entstehen.

Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern dies die Bedienbarkeit verbessert. Es dürfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

## Wochenansicht: Detailkarten und Kollabierbarkeit

In der Wochenansicht gelten dieselben Lane-Regeln wie oben. Die Darstellung innerhalb einer Lane ist kollabierbar, d. h. Termine können zwischen kompakt und detailliert wechseln.

Die Lane-Reihenfolge bleibt stabil.

Die Höhe darf sich verändern, wenn Termin-Panels aufgeklappt werden.

Die Interaktion „Alle aufklappen“ wirkt als globaler Schalter für diesen Render-Modus.

## Monatsansicht: Balken und Reihenstabilität

In der Monatsansicht dominiert der kompakte Balkenmodus.

Alle Tage einer Kalenderreihe werden gleich hoch dargestellt.

Die erforderliche Reihenhöhe wird so berechnet, dass die maximal benötigte Slot-/Stapelanzahl innerhalb dieser Reihe passt.

Wenn die Zahl der Termine in einer Reihe sehr hoch ist, wird eine explizite Verdichtung verwendet, zum Beispiel „Anzeige nur der ersten N Termine“ und eine Kennzeichnung wie „+X weitere“. Die konkrete Verdichtung muss explizit festgelegt werden, damit das Verhalten deterministisch bleibt.

## Jahresansicht: Stark verdichtete Darstellung

In der Jahresansicht ist die Tagesfläche noch kleiner als im Monat.

Es wird grundsätzlich im kompakten Balkenmodus gerendert.

Informationen werden maximal reduziert.

Verdichtung ist typischerweise zwingend, wenn viele Termine auftreten.

## Drag & Drop: Verschieben von Terminen

Termine können per Drag & Drop verschoben werden.

Das Neupositionieren eines Termins löst eine Neuberechnung der Lane-Zuordnung in den betroffenen sichtbaren Abschnitten aus.

Betroffen sind die Abschnitte, in denen der Termin vorher lag, und die Abschnitte, in denen er nachher liegt.

Bei Mehrtages-Terminen betrifft dies alle Abschnitte, die von der Spanne des Termins geschnitten werden.

Nach dem Drop müssen Sortierung und Lane-Zuordnung wieder deterministisch nach denselben Regeln hergestellt werden.

# FT (03) **Use Cases**

### **UC 03/01: UC: Kalenderansicht anzeigen (Woche/Monat/Mehrmonat/Jahr)**

Der Benutzer wählt eine der periodischen Ansichten und erhält die Terminbalken inklusive Kundenname und Postleitzahl.

### **UC 03/02: Kalenderzeitraum wechseln**

Der Benutzer navigiert vor/zurück oder wählt ein Datum; das System aktualisiert die Anzeige.

### **UC 03/03: Tourbezogene Planung anzeigen**

Der Benutzer wählt eine Tour; das System zeigt die Termine dieser Tour im gewählten Zeitraum.

### UC 03/04: Darstellung auf Mitarbeiter fokussieren

Der Benutzer wählt einen Mitarbeiter; das System zeigt dessen Termine im gewählten Zeitraum.

# FT (04): Tourenplanung

## FT (04) Ziel / Zweck

Dieses Feature ermöglicht der Disposition die Verwaltung von Touren zur logischen Gruppierung von Terminen im Kalender. Touren dienen ausschließlich der organisatorischen Bündelung und der visuellen Orientierung innerhalb der Terminplanung.

## FT (04) Fachliche Beschreibung

Eine Tour ist eine abstrakte Planungseinheit, mit der mehrere Termine logisch zusammengefasst werden können. Touren haben keinen fachlichen Bezug zu Fahrzeugen, Routen oder Arbeitszeiten. Sie dienen ausschließlich der Strukturierung und besseren Übersicht in der Terminplanung. Touren fungieren auch als Gruppenvorlage für die zeitweilige Gruppierung von Mitarbeitern.

Termine können einer Tour zugeordnet oder aus einer Tour entfernt werden. Alle Termine einer Tour teilen sich eine gemeinsame Farbe, die im Kalender als zentrales visuelles Ordnungsmerkmal dient. Zusätzlich zeigen Termine ihre Postleitzahl an, um eine grobe räumliche Orientierung innerhalb einer Tour zu ermöglichen.

Touren können manuell angelegt und bearbeitet werden. Eine Übersicht ermöglicht es, alle einer Tour zugeordneten Termine gesammelt anzuzeigen. Touren enthalten selbst keine Terminlogik und keine zeitliche oder räumliche Auswertungsfunktion.

## FT (04) Regeln & Randbedingungen

- Eine Tour dient ausschließlich der organisatorischen Gruppierung von Terminen.
- Touren sind nicht an Fahrzeuge oder feste Ziele gebunden.
- Ein Termin kann maximal einer Tour zugeordnet sein.
- Eine Tour kann mehrere Termine enthalten.
- Die Farbe einer Tour ist das primäre visuelle Identifikationsmerkmal im Kalender.
- Touren enthalten keine Routen-, Zeit- oder Entfernungslogik.
- Touren dürfen keine implizite Fahrzeugbedeutung haben.
- Eine Tour kann nur gelöscht werden, wenn ihr keine Termine mehr zugeordnet sind.
- Tour erhält eine **Mitarbeiterzuordnung** (0..n).
- **Mitarbeiter kann nur einer Tour angehören** (0..1 aus Sicht Mitarbeiter).
- Mehrere Mitarbeiter können einer Tour zugewiesen werden
- Löschen einer Tour: weiterhin nur, wenn keine Termine zugeordnet sind, aber zusätzlich: **keine Kaskade**, sondern nur Mitarbeiter.Tour_ID auf NULL/0 setzen. (Die bestehende Löschregel “nur wenn keine Termine” steht bereits drin.)

## FT (04) **Use Cases**

### **UC 04/01: Tour anlegen**

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine neue Tour zur organisatorischen Gruppierung von Terminen im Kalender anlegen.

### **Beschreibung**

Der Akteur legt eine neue Tour an. Der Name der Tour wird systemseitig automatisch generiert und ist nicht editierbar. Bei der Erstellung können die Farbe der Tour sowie optional eine Mitarbeiterzuordnung festgelegt werden. Das System stellt sicher, dass nur Mitarbeiter ausgewählt werden können, die aktuell keiner anderen Tour zugeordnet sind.

### **Vorbedingungen**

- Der Akteur ist angemeldet.
- Das System ist betriebsbereit.
- Die Tourenverwaltung ist verfügbar.
- Mitarbeiter existieren optional im System.

### **Ablauf**

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt die Funktion „Tour anlegen“.
3. Das System erzeugt einen neuen Tourdatensatz mit einem automatisch generierten Namen.
4. Das System zeigt den generierten Namen als read-only an.
5. Der Akteur wählt eine Farbe für die Tour aus.
6. Das System bietet im Auswahlfeld ausschließlich Mitarbeiter an, die derzeit keiner Tour zugeordnet sind.
7. Der Akteur kann optional einen oder mehrere angebotene Mitarbeiter hinzufügen.
8. Der Akteur bestätigt die Eingabe.
9. Das System speichert die neue Tour.
10. Das System aktualisiert alle relevanten Sichten.

### **Alternativabläufe**

- **Abbruch durch den Akteur:**
    
    Die Tour wird nicht gespeichert.
    
- **Technischer Konflikt (z. B. parallele Zuordnung eines Mitarbeiters):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Die neue Tour ist im System angelegt.
- Der Tourname ist systemseitig vergeben und unveränderlich.
- Die Tour besitzt eine definierte Farbe.
- Die zugeordneten Mitarbeiter sind eindeutig dieser Tour zugeordnet.
- Kein Mitarbeiter ist mehreren Touren zugeordnet.
- Die Tour steht für Terminzuweisungen zur Verfügung.
- Kalender- und Wochenansichten berücksichtigen die neue Tour korrekt.

### **UC 04/02: Tour bearbeiten**

### **Akteur**

Disponent, Administrator

### **Ziel**

Die Eigenschaften einer bestehenden Tour anpassen, indem Farbe und Mitarbeiterliste geändert werden.

### **Beschreibung**

Der Akteur bearbeitet eine vorhandene Tour. Der Name der Tour ist systemseitig autogeneriert und nicht veränderbar. Änderbar sind ausschließlich die Farbe der Tour sowie die zugeordneten Mitarbeiter. Das System stellt sicher, dass die Regel „Ein Mitarbeiter kann nur einer Tour angehören“ eingehalten wird.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Mitarbeiter existieren im System.

### **Ablauf**

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt eine bestehende Tour aus.
3. Das System zeigt die Tourdetails an.
4. Der Name der Tour wird als read-only angezeigt.
5. Das System zeigt die aktuell zugeordneten Mitarbeiter an.
6. Das System bietet im Auswahlfeld ausschließlich Mitarbeiter an, die keiner anderen Tour zugeordnet sind.
7. Der Akteur ändert die Farbe der Tour und/oder passt die Mitarbeiterliste an.
8. Der Akteur bestätigt die Änderungen.
9. Das System speichert die Änderungen.
10. Das System aktualisiert alle relevanten Sichten.

### **Alternativabläufe**

- **Abbruch durch den Akteur:**
    
    Das System verwirft die Änderungen.
    
- **Technischer Konflikt (z. B. parallele Änderung):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Der Tourname bleibt unverändert.
- Die Tourfarbe ist aktualisiert.
- Die Mitarbeiterliste entspricht der bestätigten Auswahl.
- Kein Mitarbeiter ist mehreren Touren zugeordnet.
- Kalenderansichten, Wochenübersichten und Kartenansicht übernehmen die aktualisierte Farbe und Mitarbeiterzuordnung korrekt.

### UC **04/**03: Mitarbeiter einer Tour zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tour-Vorlage anpassen, indem Mitarbeiter hinzugefügt oder entfernt werden, ohne gegen die Regel zu verstoßen, dass ein Mitarbeiter nur einer Tour angehören darf.

### **Beschreibung**

Der Akteur bearbeitet eine bestehende Tour und passt deren Mitarbeiterliste an. Das System stellt sicher, dass nur Mitarbeiter hinzugefügt werden können, die aktuell keiner anderen Tour zugeordnet sind. Dadurch wird verhindert, dass ein Mitarbeiter mehreren Touren gleichzeitig angehört.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Mitarbeiter existieren im System.

### **Ablauf**

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt eine bestehende Tour aus.
3. Das System zeigt die aktuell zugeordneten Mitarbeiter dieser Tour an.
4. Das System bietet im Auswahlfeld ausschließlich Mitarbeiter an, die derzeit keiner Tour zugeordnet sind.
5. Der Akteur fügt einen oder mehrere angebotene Mitarbeiter hinzu oder entfernt bestehende Mitarbeiter aus der Tour.
6. Der Akteur bestätigt die Änderungen.
7. Das System speichert die aktualisierte Tourzuordnung.
8. Das System aktualisiert alle relevanten Sichten.

### **Alternativabläufe**

- **Abbruch durch den Akteur:**
    
    Das System verwirft die Änderungen.
    
- **Technischer Konflikt (z. B. parallele Änderung):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Jeder Mitarbeiter ist maximal einer Tour zugeordnet.
- Es existieren keine Mehrfachzuordnungen.
- Die Tour enthält ausschließlich gültig zugewiesene Mitarbeiter.
- Wochenübersichten und Mitarbeiterdetailansichten spiegeln den aktuellen Zustand korrekt wider.

### UC **04/**04: Tour löschen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tour vollständig aus dem System entfernen, sofern keine Termine mehr dieser Tour zugeordnet sind.

### **Beschreibung**

Der Akteur löscht eine bestehende Tour aus der Tourenverwaltung. Das Löschen ist nur zulässig, wenn der Tour keine Termine mehr zugeordnet sind. Beim erfolgreichen Löschen dürfen keine inkonsistenten Zustände entstehen. Insbesondere dürfen Mitarbeiter weiterhin bestehen bleiben, verlieren jedoch ihre Tourzuordnung.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Der Tour sind keine Termine zugeordnet.

### **Ablauf**

1. Der Akteur öffnet die Tourenverwaltung.
2. Der Akteur wählt eine bestehende Tour aus.
3. Der Akteur löst die Funktion „Tour löschen“ aus.
4. Das System prüft, ob der Tour Termine zugeordnet sind.
5. Das System löscht die Tour.
6. Das System setzt bei allen zuvor zugeordneten Mitarbeitern die Tour_ID auf NULL bzw. entfernt die Tourreferenz.
7. Das System aktualisiert alle Sichten, in denen die Tour angezeigt wurde.

### **Alternativabläufe**

- **Tour enthält noch Termine:**
    
    Das System blockiert den Löschvorgang und zeigt eine eindeutige Fehlermeldung an. Es wird nichts gelöscht.
    
- **Abbruch durch den Akteur:**
    
    Der Löschvorgang wird nicht ausgeführt. Es erfolgen keine Änderungen.
    

### **Ergebnis**

Die Tour existiert nicht mehr im System.

- Es existiert kein Tour-Datensatz mehr in der Datenbank.
- Es bestehen keine Mitarbeiterreferenzen mehr auf diese Tour.
- Alle betroffenen Sichten zeigen die Tour nicht mehr an.
- Es sind keine Teilzustände oder verwaisten Referenzen vorhanden.

### UC **04/**05: Tourliste anzeigen

### **Akteur**

Disponent, Administrator, Monteur

### **Ziel**

Alle bestehenden Touren im System in einer Übersicht anzeigen, entsprechend der Rolle des Akteurs.

### **Beschreibung**

Der Akteur ruft die Tourenverwaltung auf. Das System zeigt eine Übersicht aller vorhandenen Touren an. Die Darstellung enthält die grundlegenden Eigenschaften der Touren. Abhängig von der Rolle des Akteurs werden zusätzlich Mutationsfunktionen angezeigt oder ausgeblendet.

### **Vorbedingungen**

- Der Akteur ist angemeldet.
- Touren können im System vorhanden oder nicht vorhanden sein.

### **Ablauf**

1. Der Akteur öffnet die Tourenübersicht.
2. Das System ermittelt alle bestehenden Touren.
3. Das System stellt für jede Tour mindestens folgende Informationen dar:
    - Systemseitig generierter Name
    - Farbe
    - Anzahl der zugeordneten Mitarbeiter
4. Das System rendert die Oberfläche rollenabhängig:
    - Disponent und Administrator sehen zusätzlich die Funktionen zum Anlegen, Bearbeiten und Löschen.
    - Monteur sieht die Touren ausschließlich im Lesemodus ohne Mutationsfunktionen.
5. Das System stellt sicher, dass nicht berechtigte UI-Elemente für Monteure nicht gerendert werden.

### **Alternativabläufe**

- **Keine Touren vorhanden:**
    
    Das System zeigt eine leere Übersicht mit entsprechendem Hinweis an.
    
- **Direkter Zugriff auf eine Mutationsfunktion durch nicht berechtigten Akteur:**
    
    Das System blockiert die Aktion serverseitig und führt keine Datenänderung aus.
    

### **Ergebnis**

- Der Akteur sieht eine vollständige und konsistente Übersicht aller Touren.
- Die Darstellung entspricht der Rolle des Akteurs.
- Monteure können keine Tourdaten verändern.
- Es entstehen keine inkonsistenten Zustände durch unzulässige Aktionen.

### UC **04/**06: Kalenderdarstellung nach Touränderung aktualisieren

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Änderungen an einer Tour (Farbe oder Mitarbeiterzuordnung) unmittelbar und konsistent in allen Kalenderansichten sichtbar werden.

### **Beschreibung**

Der Akteur ändert Eigenschaften einer bestehenden Tour. Das System übernimmt diese Änderungen in allen Kalenderansichten, in denen Termine dieser Tour dargestellt werden. Die Kalenderdarstellung leitet ihre Informationen ausschließlich aus den aktuellen Tour- und Termindaten ab. Es dürfen keine veralteten oder inkonsistenten Darstellungen bestehen bleiben.

### **Vorbedingungen**

- Eine Tour existiert.
- Der Tour sind mindestens ein oder mehrere Termine zugeordnet.
- Der Akteur ist berechtigt, Touren zu bearbeiten.

### **Ablauf**

1. Der Akteur bearbeitet eine bestehende Tour.
2. Der Akteur ändert die Farbe der Tour und/oder die Mitarbeiterliste.
3. Der Akteur bestätigt die Änderungen.
4. Das System speichert die aktualisierten Tourdaten.
5. Das System aktualisiert alle Kalenderansichten.
6. Das System stellt sicher:
    - Termine dieser Tour werden mit der neuen Farbe dargestellt.
    - Die Terminzuordnungen bleiben fachlich unverändert.
    - Andere Touren und tourlose Termine bleiben unverändert dargestellt.

### **Alternativabläufe**

- **Abbruch durch den Akteur:**
    
    Es erfolgt keine Änderung in den Kalenderansichten.
    
- **Tour besitzt keine Termine:**
    
    Es erfolgt keine sichtbare Änderung im Kalender, da keine Termine betroffen sind.
    

### **Ergebnis**

- Alle Termine der geänderten Tour werden konsistent mit der aktuellen Tourfarbe dargestellt.
- Keine anderen Termine werden unbeabsichtigt verändert.
- Es existieren keine widersprüchlichen oder veralteten Darstellungen.
- Die Kalenderansicht entspricht jederzeit dem aktuellen Datenzustand.

### UC **04/**07: Wochenübersicht nach Touränderung korrekt ableiten

### **Akteur**

Disponent

### **Ziel**

Sicherstellen, dass die mitarbeiter- und tourbezogenen Wochenübersichten jederzeit den aktuellen Tour- und Mitarbeiterzuordnungen entsprechen.

### **Beschreibung**

Der Akteur ruft eine mitarbeiterbezogene oder tourbezogene Wochenübersicht auf. Die angezeigten Informationen werden vollständig aus den aktuellen Termin- und Tourdaten abgeleitet. Änderungen an Tourfarbe oder Mitarbeiterzuordnung dürfen keine inkonsistenten oder veralteten Einträge erzeugen.

### **Vorbedingungen**

- Termine mit Tour- und Mitarbeiterzuordnung existieren.
- Mindestens eine Kalenderwoche enthält relevante Termine.
- Der Akteur ist berechtigt, Dispositionsübersichten einzusehen.

### **Ablauf**

1. Der Akteur ruft eine Wochenübersicht auf (mitarbeiterbezogen oder tourbezogen).
2. Das System ermittelt alle relevanten Termine.
3. Das System leitet aus den Terminen die zugehörigen Touren und Mitarbeiter pro Kalenderwoche ab.
4. Der Akteur nimmt eine Änderung an einer Tour vor (z. B. Farbänderung oder Anpassung der Mitarbeiterliste).
5. Das System speichert die Änderung.
6. Das System aktualisiert die Wochenübersicht.
7. Das System stellt sicher:
    - Die Zuordnung von Mitarbeitern zu Touren pro Woche entspricht dem aktuellen Datenstand.
    - Entfernte Mitarbeiter erscheinen nicht mehr in der betroffenen Woche.
    - Neu hinzugefügte Mitarbeiter erscheinen korrekt in der betroffenen Woche.
    - Leere Wochen werden entsprechend als leer dargestellt.

### **Alternativabläufe**

- **Keine Termine vorhanden:**
    
    Das System zeigt eine leere Übersicht.
    
- **Abbruch der Touränderung:**
    
    Die Wochenübersicht bleibt unverändert.
    

### **Ergebnis**

- Die Wochenübersicht ist konsistent mit dem aktuellen Zustand von Terminen, Touren und Mitarbeiterzuordnungen.
- Es existieren keine veralteten oder widersprüchlichen Anzeigen.
- Die Übersicht bleibt rein informativ und verändert keine fachlichen Daten.

### UC **04/**08: Parallele Mitarbeiterzuweisung zu unterschiedlichen Touren

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass ein Mitarbeiter bei gleichzeitigen Bearbeitungen niemals mehreren Touren zugeordnet wird.

### **Beschreibung**

Zwei Akteure versuchen nahezu zeitgleich, denselben Mitarbeiter unterschiedlichen Touren zuzuweisen. Das System muss sicherstellen, dass die Regel „Ein Mitarbeiter kann nur einer Tour angehören“ jederzeit eingehalten wird.

### **Vorbedingungen**

- Mindestens zwei Touren existieren.
- Ein Mitarbeiter existiert und ist aktuell keiner Tour zugeordnet.
- Zwei Akteure sind gleichzeitig angemeldet.

### **Ablauf**

1. Akteur A öffnet Tour A zur Bearbeitung.
2. Akteur B öffnet Tour B zur Bearbeitung.
3. Beide Akteure sehen denselben Mitarbeiter als auswählbar.
4. Akteur A fügt den Mitarbeiter Tour A hinzu und speichert.
5. Das System speichert die Zuordnung erfolgreich.
6. Akteur B versucht anschließend, denselben Mitarbeiter Tour B hinzuzufügen und zu speichern.
7. Das System erkennt die zwischenzeitliche Zuordnung des Mitarbeiters.
8. Das System blockiert die Speicherung bei Akteur B und zeigt eine eindeutige Fehlermeldung an.

### **Alternativabläufe**

- Akteur B speichert zuerst → dann wird Akteur A blockiert.
- Einer der Akteure bricht vor Speicherung ab → keine Konfliktsituation.

### **Ergebnis**

- Der Mitarbeiter ist genau einer Tour zugeordnet.
- Es existiert keine Mehrfachzuordnung.
- Das System bleibt konsistent.

### UC **04/**09: Parallele Bearbeitung derselben Tour

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass parallele Änderungen an derselben Tour nicht zu stillen Überschreibungen oder inkonsistenten Zuständen führen.

### **Beschreibung**

Zwei Akteure bearbeiten gleichzeitig dieselbe Tour. Änderungen an Farbe oder Mitarbeiterliste dürfen nicht unkontrolliert überschrieben werden.

### **Vorbedingungen**

- Eine Tour existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Beide Akteure öffnen dieselbe Tour zur Bearbeitung.

### **Ablauf**

1. Akteur A öffnet die Tour zur Bearbeitung.
2. Akteur B öffnet dieselbe Tour zur Bearbeitung.
3. Akteur A ändert die Farbe oder Mitarbeiterliste und speichert.
4. Das System speichert die Änderung.
5. Akteur B versucht anschließend, seine Version zu speichern.
6. Das System erkennt, dass sich der Datensatz seit dem Öffnen geändert hat.
7. Das System blockiert die Speicherung und fordert zur Aktualisierung auf.

### **Alternativabläufe**

- Akteur B speichert zuerst → dann wird Akteur A blockiert.
- Ein Akteur bricht die Bearbeitung ab → keine Konfliktsituation.

### **Ergebnis**

- Es entsteht keine stille Überschreibung.
- Die Tour befindet sich in einem konsistenten Zustand.
- Änderungen erfolgen kontrolliert und nachvollziehbar.

### UC **04/**10: Löschkonflikt bei paralleler Terminzuordnung

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass eine Tour nicht gelöscht wird, wenn ihr parallel ein Termin zugeordnet wird.

### **Beschreibung**

Ein Akteur versucht, eine Tour zu löschen, während ein anderer Akteur parallel einen Termin dieser Tour zuordnet. Das System muss verhindern, dass die Löschregel verletzt wird.

### **Vorbedingungen**

- Eine Tour existiert.
- Der Tour sind aktuell keine Termine zugeordnet.
- Zwei Akteure sind gleichzeitig angemeldet.

### **Ablauf**

1. Akteur A öffnet die Tour und initiiert den Löschvorgang.
2. Vor Abschluss des Löschvorgangs ordnet Akteur B einen Termin dieser Tour zu.
3. Das System speichert die Terminzuordnung.
4. Das System prüft beim Löschvorgang erneut, ob der Tour Termine zugeordnet sind.
5. Das System erkennt die neue Zuordnung.
6. Das System blockiert den Löschvorgang.

### **Alternativabläufe**

- Der Löschvorgang wird vollständig abgeschlossen, bevor ein Termin zugeordnet wird → die Terminzuordnung schlägt fehl.
- Einer der Akteure bricht ab → kein Konflikt.

### **Ergebnis**

- Eine Tour wird niemals gelöscht, wenn ihr mindestens ein Termin zugeordnet ist.
- Es entstehen keine verwaisten Terminreferenzen.
- Der Datenzustand bleibt konsistent.

# FT (05): Mitarbeiterverwaltung

## FT (05) Ziel / Zweck

Dieses Feature dient der zentralen Verwaltung von Mitarbeitern als ausführende Ressourcen für Termine. Ziel ist es, Mitarbeiter als Stammdaten zu pflegen und ihre Einsätze über Termine hinweg nachvollziehbar darzustellen, ohne Terminplanung und Ressourcendarstellung fachlich zu vermischen.

## FT (05) Fachliche Beschreibung

Die Mitarbeiterverwaltung stellt Funktionen zum Anlegen, Bearbeiten und Anzeigen von Mitarbeitern bereit. Mitarbeiter können unabhängig von Terminen existieren und werden im Rahmen der Terminvergabe optional Terminen zugewiesen. Die Zuweisung selbst erfolgt nicht innerhalb dieses Features, sondern im Kontext der Terminplanung.
Disponenten erhalten serverseitig nur aktive Mitarbeiter und können Mitarbeiter damit nur aus dem aktiven Bestand auswählen. Die Verwaltung von aktiven und inaktiven Mitarbeitern (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation.
Für jeden Mitarbeiter ist eine Terminübersicht verfügbar. Diese Übersicht zeigt alle Termine, denen der Mitarbeiter aktuell oder in der Vergangenheit zugewiesen war, und bildet damit die Einsatzhistorie des Mitarbeiters ab. Die Terminliste wird ausschließlich aus der Relation zwischen Termin und Mitarbeiter abgeleitet und ist jederzeit vollständig einsehbar.
Änderungen an zukünftigen Terminen wirken sich unmittelbar auf die Terminliste eines Mitarbeiters aus. Vergangene Termine sind read-only und dürfen nicht nachträglich verändert werden, um die Stabilität der Einsatzhistorie sicherzustellen.
In der Terminübersicht eines Mitarbeiters sind neben Zeitraum und Bezeichnung des Termins auch die zugehörige Tour sowie der Kunde erkennbar, da Termine diese Informationen referenzieren.
In der Mitarbeiterdetailansicht können dem Mitarbeiter Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## FT (05) Regeln & Randbedingungen

- Mitarbeiter können unabhängig von Terminen existieren.
- Die Zuweisung eines Mitarbeiters zu einem Termin ist optional.
- Ein Mitarbeiter kann einem oder mehreren Terminen zugewiesen sein.
- Disponenten erhalten serverseitig nur aktive Mitarbeiter zur Auswahl.
- Die Terminliste eines Mitarbeiters wird ausschließlich aus den aktuellen Termindaten abgeleitet.
- Vergangene Termine sind read-only und dürfen nicht verändert werden.
- Wird ein Mitarbeiter vor Durchführung eines Termins ersetzt, darf dieser Termin nicht mehr in der Terminliste des abgelösten Mitarbeiters erscheinen.
- Es dürfen keine widersprüchlichen Zustände entstehen, bei denen ein Mitarbeiter als zugewiesen gilt, ohne dass ein entsprechender Termin existiert.
- Mitarbeiter existieren unabhängig von Tour-Zugehörigkeit und Team-Zugehörigkeit. Löschungen von Tour oder Team wirken sich nur auf die FK-Eigenschaften des Mitarbeiters aus (Setzen auf NULL).
- Mitarbeiteranhänge sind mitarbeiterbezogen und unabhängig von Terminen; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## FT (05) **Use Cases**

### **UC 05/01: Mitarbeiter anlegen**

## Akteur

Administrator, Disponent

## Ziel

Einen neuen Mitarbeiter als aktive Stammdatenressource im System anlegen.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Die erforderlichen Pflichtfelder sind bekannt und im Formular sichtbar.
- Es besteht keine System-Sperre (z. B. Wartungsmodus).

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt die Funktion „Mitarbeiter anlegen“.
3. System öffnet ein leeres Mitarbeiterformular im Modus „Neu“.
4. Akteur erfasst die erforderlichen Stammdaten.
5. Akteur speichert den neuen Mitarbeiter.
6. System validiert alle Pflichtfelder.
7. System legt den Mitarbeiter mit `is_active = true` an.
8. System persistiert den Datensatz.
9. System aktualisiert alle abhängigen Listen- und Auswahlansichten.

## Alternativen

- Pflichtfeld fehlt oder ist ungültig →
    
    System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).
    
- Akteur ohne Berechtigung →
    
    System blockiert den Zugriff (HTTP 403).
    
- Technischer Persistenzfehler →
    
    System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.
    
- Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an →
    
    Beide Datensätze werden unabhängig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.
    

## Ergebnis

- Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.
- Der Mitarbeiter besitzt standardmäßig `is_active = true`.
- Der Mitarbeiter erscheint:
    - in der Mitarbeiterlistenansicht (Board und Tabelle),
    - in Dialoglisten zur Mitarbeiterzuweisung,
    - in Terminformularen zur Auswahl,
    - in Filtern, sofern aktive Mitarbeiter abgefragt werden.
- Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.
- Die Terminübersicht des Mitarbeiters ist initial leer.
- Es wurden keine bestehenden Termine oder Projekte verändert.

### **UC 05/02: Mitarbeiter bearbeiten**

## Akteur

Administrator, Disponent

## Ziel

Bestehende Stammdaten eines Mitarbeiters ändern, ohne Termin- oder Historienlogik zu beeinflussen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Der Mitarbeiterdatensatz enthält eine gültige Versionskennung (Optimistic Locking).
- Der Mitarbeiter ist nicht physisch gelöscht.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen bestehenden Mitarbeiter.
3. System lädt die aktuellen Stammdaten einschließlich Versionskennung.
4. Akteur ändert zulässige Felder.
5. Akteur speichert die Änderungen.
6. System prüft die Versionskennung.
7. System validiert die Eingaben.
8. System persistiert die Änderungen.
9. System erhöht die Versionskennung.
10. System aktualisiert alle abhängigen Anzeige- und Auswahlansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung →
    
    System blockiert mit 403.
    
- Versionskonflikt (parallele Bearbeitung) →
    
    System blockiert mit 409 und speichert nicht.
    
- Ungültige Eingaben →
    
    System antwortet mit 400 und speichert nicht.
    
- Technischer Persistenzfehler →
    
    System antwortet mit 500.
    

## Ergebnis

- Die geänderten Stammdaten sind persistent gespeichert.
- Die Versionskennung wurde erhöht.
- Terminzuweisungen bleiben unverändert.
- Historische Termine bleiben unverändert.
- Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.
- Es entstehen keine inkonsistenten FK-Zustände.

### **UC 05/03: Mitarbeiter-Termine anzeigen**

**Akteur**

Administrator, Disponent, Leser

**Ziel**

Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.

**Vorbedingungen**

- Der Mitarbeiter existiert.
- Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.

**Auslöser**

Der Nutzer wählt einen Mitarbeiter zur Anzeige aus.

**Ablauf**

1. Der Nutzer wählt einen bestehenden Mitarbeiter aus.
2. Das System zeigt die Stammdaten des Mitarbeiters an.
3. Das System ermittelt alle Termine (Terminauswahl in der Sidebar und alle Termine auf Anfrage), denen der Mitarbeiter zugewiesen ist, über die Termin-Mitarbeiter-Relation.
4. Das System zeigt zu jedem Termin die relevanten Informationen an.
5. Das System stellt sicher, dass auch vergangene Termine angezeigt werden.

**Alternativabläufe**

- Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.

**Ergebnis**

Die Stammdaten des Mitarbeiters sowie eine vollständige Übersicht aller zugeordneten Termine sind sichtbar.

Die Terminliste bildet die Einsatzhistorie des Mitarbeiters ab.

**Angezeigte Informationen (Terminliste)**

- Terminzeitraum (Start- und ggf. Enddatum)
- Terminbezeichnung
- Zugeordnete Tour
- Zugeordneter Kunde

### **UC 05/04: Mitarbeiter deaktivieren**

## Akteur

Administrator

## Ziel

Einen bestehenden Mitarbeiter für zukünftige Dispositionsvorgänge sperren, ohne historische oder bestehende Terminzuordnungen zu verändern.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell aktiv (`is_active = true`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen aktiven Mitarbeiter.
3. Akteur löst die Aktion „Deaktivieren“ aus.
4. System prüft die Berechtigung.
5. System prüft die Versionskennung.
6. System setzt `is_active = false`.
7. System persistiert die Änderung.
8. System erhöht die Versionskennung.
9. System aktualisiert abhängige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle →
    
    System blockiert mit 403.
    
- Versionskonflikt →
    
    System blockiert mit 409.
    
- Mitarbeiter bereits deaktiviert →
    
    System antwortet mit 200 ohne Zustandsänderung.
    
- Technischer Fehler →
    
    System antwortet mit 500.
    

## Ergebnis

- Mitarbeiter ist im System weiterhin vorhanden.
- `is_active = false`.
- Bestehende Terminzuordnungen bleiben unverändert.
- Vergangene und zukünftige Termine zeigen den Mitarbeiter weiterhin an.
- Der Mitarbeiter erscheint nicht mehr:
    - in Mitarbeiter-Auswahllisten für Disponenten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern, die nur aktive Mitarbeiter berücksichtigen.
- Administratoren können den Mitarbeiter weiterhin in der Stammdatenliste sehen.

### **UC 05/05: Mitarbeiter reaktivieren**

## Akteur

Administrator

## Ziel

Einen zuvor deaktivierten Mitarbeiter wieder für zukünftige Dispositionsvorgänge freigeben.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell deaktiviert (`is_active = false`).
- Eine gültige Versionskennung liegt vor.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen deaktivierten Mitarbeiter.
3. Akteur löst die Aktion „Reaktivieren“ aus.
4. System prüft die Berechtigung.
5. System prüft die Versionskennung.
6. System setzt `is_active = true`.
7. System persistiert die Änderung.
8. System erhöht die Versionskennung.
9. System aktualisiert abhängige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle →
    
    System blockiert mit 403.
    
- Versionskonflikt →
    
    System blockiert mit 409.
    
- Mitarbeiter bereits aktiv →
    
    System antwortet mit 200 ohne Zustandsänderung.
    
- Technischer Fehler →
    
    System antwortet mit 500.
    

## Ergebnis

- Mitarbeiter ist wieder aktiv.
- `is_active = true`.
- Bestehende Terminzuordnungen bleiben unverändert.
- Der Mitarbeiter erscheint wieder:
    - in Mitarbeiterlisten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern für aktive Mitarbeiter.
- Es wurden keine bestehenden Termine oder Projekte verändert.

### UC **05/**06: Mitarbeiteranhänge verwalten

## Akteur

Administrator, Disponent

## Ziel

Dokumente einem Mitarbeiter hinzufügen sowie bestehende Anhänge einsehen und herunterladen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte für Mitarbeiter.
- Die hochzuladende Datei entspricht den erlaubten Formaten und Größenbeschränkungen.

## Ablauf – Upload

1. Akteur öffnet die Detailansicht eines Mitarbeiters.
2. Akteur wählt die Funktion „Anhang hinzufügen“.
3. Akteur wählt eine Datei aus.
4. System prüft:
    - Dateiformat,
    - Dateigröße,
    - Authentifizierung.
5. System speichert die Datei serverseitig.
6. System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.
7. System gibt die gespeicherten Metadaten zurück.
8. System aktualisiert die Anhangsliste in der UI.

## Ablauf – Anzeigen / Herunterladen

1. Akteur öffnet die Anhangsliste.
2. System lädt alle dem Mitarbeiter zugeordneten Attachments.
3. Akteur wählt einen Anhang.
4. System liefert Datei über gesicherten Download-Endpunkt aus.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung →
    
    System blockiert mit 403.
    
- Ungültiges Dateiformat oder Größe →
    
    System antwortet mit 400.
    
- Technischer Speicherfehler →
    
    System antwortet mit 500.
    
- DELETE-Anfrage auf Attachment →
    
    System blockiert mit 405 oder 403.
    

## Ergebnis

- Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.
- Keine Termin- oder Projektdaten wurden verändert.
- Mehrere Anhänge sind parallel zulässig.
- Anhänge existieren unabhängig von Terminzuweisungen.
- Es erfolgt keine physische Löschung bestehender Dateien.
- Parallele Uploads verschiedener Akteure sind zulässig und erzeugen getrennte Datensätze.

### UC **05/**07: Mitarbeiter anzeigen

## Akteur

Administrator, Disponent, Monteur (Leserolle)

## Ziel

Mitarbeiterdaten in Listen- und Detailansichten anzeigen, rollenbasiert gefiltert.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Mitarbeiterbestand ist im System vorhanden.

## Ablauf – Listenansicht

1. Akteur öffnet die Mitarbeiterverwaltung.
2. System ermittelt die Rolle des Akteurs.
3. System lädt Mitarbeiterdaten:
    - Administrator erhält aktive und inaktive Mitarbeiter.
    - Disponent erhält ausschließlich aktive Mitarbeiter.
    - Monteur erhält ausschließlich Lesedaten gemäß seiner Rolle.
4. System stellt Daten in Board- oder Tabellenansicht dar.

## Ablauf – Detailansicht

1. Akteur wählt einen Mitarbeiter aus der Liste.
2. System lädt vollständige Stammdaten.
3. System lädt zugehörige Anhänge.
4. System lädt Terminübersicht gemäß UC 03.
5. System zeigt Detailansicht an.

## Alternativen

- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Leserechte →
    
    System blockiert mit 403.
    
- Keine Mitarbeiter vorhanden →
    
    System zeigt leere Liste ohne Fehler.
    
- Parallel wird Mitarbeiter deaktiviert →
    
    Disponent erhält bei nächster Abfrage aktualisierte Liste ohne diesen Mitarbeiter.
    

## Ergebnis

- Mitarbeiterdaten werden rollenbasiert korrekt angezeigt.
- Disponenten sehen keine deaktivierten Mitarbeiter.
- Administratoren sehen vollständigen Bestand.
- Terminübersicht entspricht dem aktuellen Stand der Terminrelation.
- Es erfolgt keinerlei fachliche Datenänderung.
- Es entstehen keine inkonsistenten Zustände durch Anzeigeoperationen.

### UC **05/**08: Versionskonflikt bei paralleler Mitarbeiterbearbeitung

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Mitarbeiters keine unbeabsichtigten Datenüberschreibungen entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Beide Akteure haben Änderungsrechte.
- Der Mitarbeiterdatensatz besitzt eine Versionskennung.
- Beide Akteure öffnen denselben Mitarbeiterdatensatz.

## Ablauf

1. Akteur A öffnet die Detailansicht des Mitarbeiters.
2. Akteur B öffnet denselben Mitarbeiter.
3. System liefert beiden Akteuren denselben Versionsstand.
4. Akteur A ändert Daten und speichert.
5. System validiert die Version.
6. System persistiert die Änderungen.
7. System erhöht die Versionskennung.
8. Akteur B ändert Daten auf Basis der alten Version.
9. Akteur B speichert.
10. System erkennt eine abweichende Versionskennung.
11. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lädt vor dem Speichern neu →
    
    System liefert aktuellen Stand, kein Konflikt.
    
- Einer der Akteure bricht ab →
    
    Kein Konflikt.
    
- Technischer Fehler →
    
    System antwortet mit 500.
    

## Ergebnis

- Der zuletzt gültig gespeicherte Zustand bleibt unverändert.
- Es erfolgt keine stille Überschreibung.
- Das System antwortet mit HTTP 409 Conflict.
- Die Fehlermeldung weist explizit auf einen Versionskonflikt hin.
- Der Akteur muss den Datensatz neu laden, bevor erneut gespeichert werden kann.
- Die Datenbank enthält zu keinem Zeitpunkt einen inkonsistenten Zustand.

### UC **05/**09: Konflikt bei paralleler Deaktivierung und Terminzuweisung

## Akteur

Administrator, Disponent

## Ziel

Verhindern, dass ein zwischenzeitlich deaktivierter Mitarbeiter einem Termin neu zugewiesen wird.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist aktiv.
- Ein Termin existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Der Mitarbeiter ist im Terminformular auswählbar.

## Ablauf

1. Akteur A öffnet das Terminformular.
2. System lädt aktive Mitarbeiter zur Auswahl.
3. Akteur A wählt den Mitarbeiter aus.
4. Vor dem Speichern deaktiviert Akteur B denselben Mitarbeiter.
5. System setzt `is_active = false`.
6. Akteur A speichert den Termin.
7. System prüft beim Speichern:
    - ob alle ausgewählten Mitarbeiter weiterhin aktiv sind.
8. System erkennt, dass der Mitarbeiter deaktiviert wurde.
9. System blockiert den Speichervorgang.

## Alternativen

- Deaktivierung erfolgt nach erfolgreicher Termin-Speicherung →
    
    Termin bleibt gültig, da Zuweisung vor Deaktivierung erfolgte.
    
- Akteur A lädt das Formular neu →
    
    Der deaktivierte Mitarbeiter erscheint nicht mehr in der Auswahl.
    
- Einer der Akteure bricht ab →
    
    Kein Konflikt.
    

## Ergebnis

- Ein deaktivierter Mitarbeiter kann nicht neu einem Termin zugewiesen werden.
- Das System antwortet mit HTTP 409 Conflict oder 400 Validation Error.
- Die Fehlermeldung weist auf den zwischenzeitlich deaktivierten Mitarbeiter hin.
- Es entsteht kein inkonsistenter Zustand.
- Bereits bestehende Terminzuweisungen bleiben unverändert.
- Historische Termine bleiben unverändert.

### UC **05/**10: Löschversuch bei bestehenden Terminreferenzen

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Mitarbeiter nicht gelöscht werden kann, wenn noch Terminreferenzen bestehen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Mindestens ein Termin enthält den Mitarbeiter in seiner gespeicherten Mitarbeiterliste.
- Der Akteur besitzt Administratorrechte.

## Ablauf

1. Akteur öffnet die Mitarbeiterverwaltung.
2. Akteur wählt einen bestehenden Mitarbeiter.
3. Akteur löst die Löschaktion aus.
4. System prüft, ob Terminreferenzen existieren.
5. System erkennt mindestens eine bestehende Zuordnung.
6. System blockiert den Löschvorgang.

## Alternativen

- Mitarbeiter besitzt keine Terminreferenzen →
    
    System erlaubt die Löschung.
    
- Mitarbeiter existiert nicht →
    
    System antwortet mit 404.
    
- Akteur ohne Administratorrolle →
    
    System blockiert mit 403.
    
- Technischer Fehler →
    
    System antwortet mit 500.
    

## Ergebnis

- Mitarbeiter bleibt im System erhalten.
- Es entstehen keine verwaisten Terminreferenzen.
- System antwortet mit HTTP 409 Conflict bei bestehender Referenz.
- Die Datenbank bleibt konsistent.

### UC **05/**11: Konflikt bei paralleler Reaktivierung und Bearbeitung

## Akteur

Administrator, Disponent

## Ziel

Verhindern, dass bei gleichzeitiger Reaktivierung und Bearbeitung widersprüchliche Zustände entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist deaktiviert.
- Zwei Akteure sind angemeldet.
- Der Datensatz besitzt eine Versionskennung.

## Ablauf

1. Akteur A öffnet den deaktivierten Mitarbeiter.
2. Akteur B öffnet denselben Mitarbeiter.
3. Akteur A reaktiviert den Mitarbeiter.
4. System setzt `is_active = true` und erhöht die Version.
5. Akteur B ändert Stammdaten auf Basis der alten Version.
6. Akteur B speichert.
7. System erkennt Versionsabweichung.
8. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lädt neu →
    
    Kein Konflikt.
    
- Reaktivierung erfolgt nach erfolgreicher Bearbeitung →
    
    Kein Konflikt.
    

## Ergebnis

- Kein Zustand wird überschrieben.
- HTTP 409 bei Versionskonflikt.
- Der gültige Zustand bleibt erhalten.
- Keine Terminzuweisungen werden verändert.

### UC **05/**12: Rollenverletzung bei API-Direktzugriff

## Akteur

Nicht berechtigter Benutzer (z. B. Monteur)

## Ziel

Sicherstellen, dass unberechtigte Rollen keine schreibenden Aktionen auf Mitarbeiter ausführen können.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Änderungs- oder Adminrechte.

## Ablauf

1. Akteur sendet direkt einen API-Request:
    - POST `/employees`
    - PATCH `/employees/:id`
    - DELETE `/employees/:id`
    - PATCH `/employees/:id/active`
2. System prüft Rollenberechtigung.
3. System erkennt fehlende Berechtigung.
4. System blockiert die Operation.

## Alternativen

- Akteur ist nicht authentifiziert →
    
    HTTP 401 Unauthorized.
    
- Technischer Fehler →
    
    HTTP 500.
    

## Ergebnis

- Keine Datenänderung erfolgt.
- System antwortet mit HTTP 403 Forbidden.
- Der Mitarbeiterbestand bleibt unverändert.
- Es entstehen keine inkonsistenten Zustände.

### UC **05/**13: Query-Konsistenz zwischen Listen- und Dialogansicht

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die in der Mitarbeiterliste angezeigten aktiven Mitarbeiter mit den in Dialoglisten zur Terminzuweisung verfügbaren Mitarbeitern konsistent sind.

## Vorbedingungen

- Mitarbeiter existieren im System.
- Mindestens ein Mitarbeiter ist deaktiviert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für Mitarbeiter.

## Ablauf

1. Akteur öffnet die Mitarbeiterlistenansicht.
2. System lädt Mitarbeiterdaten gemäß Rollenregel:
    - Administrator erhält aktive und inaktive Mitarbeiter.
    - Disponent erhält ausschließlich aktive Mitarbeiter.
3. Akteur öffnet ein Terminformular.
4. System lädt die Mitarbeiterauswahlliste.
5. System wendet dieselbe Aktiv-Filterlogik an.
6. System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.

## Alternativen

- Ein Mitarbeiter wird zwischenzeitlich deaktiviert →
    
    Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.
    
- Unterschiedliche API-Endpunkte liefern unterschiedliche Filter →
    
    System muss als fehlerhaft betrachtet werden.
    

## Ergebnis

- Disponenten sehen in Listen- und Dialogansicht ausschließlich aktive Mitarbeiter.
- Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.
- Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.
- Es existiert keine Divergenz zwischen:
    - GET `/employees`
    - GET `/employees?active=true`
    - internen Dialogabfragen.
- Integrationstests können prüfen:
    - gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog
    - deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.

# FT (06): Druckfunktionen

## FT (06) Ziel / Zweck

Dieses Feature ermöglicht die Ausgabe zentraler Planungs- und Übersichtsansichten als Papierdruck oder PDF. Die Druckfunktionen dienen der Unterstützung von Abstimmungen, Briefings und interner Kommunikation außerhalb des Systems.

## FT (06) Fachliche Beschreibung

Die Druckfunktionen stellen verschiedene Sichten der Terminplanung und -übersicht in druckbarer Form bereit. Grundlage für alle Druckausgaben sind die im System verfügbaren Kalender- und Übersichtsansichten. Die Druckausgaben bilden diese Ansichten inhaltlich vollständig ab, sind jedoch in ihrer Darstellung für Papier oder PDF optimiert.

Unterstützt werden sowohl kalenderbasierte Ansichten (z. B. Planungs- und Auslastungsansichten) als auch tabellarische Übersichten (z. B. nächste Termine oder Mitarbeitertermine). Für jede Druckausgabe kann ein Zeitraum festgelegt werden. Je nach Drucktyp können zusätzlich Filter oder Darstellungsvarianten gewählt werden.

Kalenderdrucke übernehmen die visuelle Strukturierung der jeweiligen Ansicht, insbesondere Farben, Stapelung und Sortierung. Interaktive Elemente wie Tooltips werden nicht gedruckt; relevante Kurzinformationen werden stattdessen direkt in der Terminfläche oder in ergänzenden Spalten bzw. Legenden dargestellt.

Die Ausgabe erfolgt wahlweise als direkter Papierdruck oder als PDF-Export.

## FT (06) Regeln & Randbedingungen

- Jede Druckausgabe basiert auf einer bestehenden Ansicht oder Übersicht.
- Für jede Druckausgabe kann ein Zeitraum gewählt werden.
- Team- und Mitarbeiterdrucke sind gefilterte Sichten.
- Kalenderdrucke übernehmen die bestehende visuelle Darstellung (Farben, Stapelung, Sortierung).
- Interaktive UI-Elemente (z. B. Tooltips) werden nicht gedruckt.
- Relevante Kurzinformationen werden statisch dargestellt (Terminfläche, Spalten, Legende).
- Die Druckfunktion verändert keine Daten und ist rein ausgabebezogen.

## FT (06) **Use Cases**

### **UC 06/01: Druck: Planungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Kalender-Planungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Eine Planungsansicht ist geöffnet.

**Ablauf**

1. Benutzer wählt die Druckfunktion.
2. Benutzer wählt den Zeitraum.
3. Benutzer wählt die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.
5. Benutzer startet den Druck oder speichert die Ausgabe als PDF.

**Ergebnis**

Die gewählte Planungsansicht liegt als Druck oder PDF vor.

### **UC 06/02: Druck: Auslastungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Die Auslastungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Die Auslastungsansicht ist verfügbar.

**Ablauf**

1. Benutzer wählt die Auslastungsansicht.
2. Benutzer startet die Druckfunktion.
3. Benutzer wählt den Zeitraum und die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.

**Ergebnis**

Die Auslastungsansicht liegt als Druck oder PDF vor.

### **UC 06/03: Druck: Nächste Termine ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Übersicht der nächsten Termine als Druck oder PDF ausgeben.

**Vorbedingungen**

- Termine sind vorhanden.

**Ablauf**

1. Benutzer wählt die Funktion „Nächste Termine“.
2. Benutzer wählt den Zeitraum und ggf. Filter.
3. Benutzer startet die Druckfunktion.
4. System erzeugt die Ausgabe.

**Ergebnis**

Die Übersicht der nächsten Termine liegt als Druck oder PDF vor.

### **UC 06/04: Druck: Mitarbeitertermine ausgeben**

**Akteur**

Disponent

**Ziel**

Die Termine eines ausgewählten Mitarbeiters als Druck oder PDF ausgeben.

**Vorbedingungen**

- Der Mitarbeiter existiert.

**Ablauf**

1. Benutzer wählt einen Mitarbeiter.
2. Benutzer wählt die Darstellungsart (tabellarisch oder als Kalender).
3. Benutzer wählt den Zeitraum.
4. Benutzer startet die Druckfunktion.
5. System erzeugt die Ausgabe.

**Ergebnis**

Die Termine des Mitarbeiters liegen als Druck oder PDF vor.

# FT (07): Fallback-Kalender und Datei

## FT (07) Ziel / Zweck

Sicherstellung der kurzfristigen operativen Handlungsfähigkeit bei Systemausfällen durch automatische, änderungsabhängige Generierung eines Excel-Fallback-Kalenders sowie eines PDF-Dokuments „Anstehende Termine“, inklusive täglichem E-Mail-Versand und administrativer Monitoring-Sicht.

## FT (07) Fachliche Beschreibung

Das System erzeugt täglich automatisiert ein Fallback-Dokument, sofern seit dem letzten erfolgreichen Export relevante Daten geändert wurden.

Das Fallback besteht aus:

- einem Excel-Dokument mit:
    - Wochenkalender-Nachbildung,
    - maximal 3 aktiven Tour-Lanes,
    - 2 Slots pro Tour und Tag,
    - einem Bereich „Ohne Tour“,
    - zwei Zeilen pro Termin (Kundendaten + Projektdaten),
    - einem Detail-Sheet mit vollständigem Termin-Snapshot,
    - zusätzlichen Sheets für Projekte, Kunden und Mitarbeiter.
- einem PDF-Dokument „Anstehende Termine“ für den Zeitraum „heute + 2 Monate“, sortiert nach Datum und Uhrzeit.

Beide Dokumente werden:

- serverseitig gespeichert,
- per E-Mail versendet,
- im System protokolliert.

Backups älter als 30 Tage werden automatisch gelöscht.

Logeinträge bleiben dauerhaft erhalten.

Ein Administrator kann vergangene Backups einsehen und herunterladen.

Das Excel-Dokument ist ein Snapshot und ersetzt nicht das produktive System.

Zusätzlich zum Excel-Fallback und PDF-Dokument synchronisiert das System Termine mit einem externen CalDAV-Kalender (Nextcloud).

Die Synchronisation erfolgt:

- event-getrieben bei Terminänderungen,
- serverseitig,
- nicht blockierend,
- ausschließlich vom System zum externen Kalender.

Der externe Kalender dient als zusätzliche Anzeige- und Fallback-Instanz, ist jedoch kein führendes System.

Es wird genau ein externer Kalender verwendet.

Alle Termine werden dort eindeutig als MuGPlan-Termine gekennzeichnet.

## FT (07) Regeln & Randbedingungen

- Export erfolgt nur bei tatsächlicher Datenänderung.
- Änderungsprüfung über MAX(updated_at) relevanter Tabellen.
- Relevante Tabellen: Termine, Projekte, Kunden, Mitarbeiter, Touren.
- Maximal 3 aktive Touren werden im Kalender dargestellt.
- Pro Tour und Tag maximal 2 Termine im Raster.
- Bei Überschreitung wird „+1“ angezeigt.
- Keine Rücksynchronisation aus Excel.
- Scheduler läuft täglich um 02:00 Uhr.
- Migration der Tabelle `backup_log` auf _dev und _test.
- Backup-Dateien werden 30 Tage gespeichert.
- Monitoring nur für Admin sichtbar.
- Keine Änderung bestehender Fachlogik.
- Keine Änderung bestehender REST-Endpunkte.
- Es wird genau ein CalDAV-Kalender synchronisiert.
- Die Synchronisation erfolgt bei:
    - Termin-Neuanlage,
    - Terminänderung,
    - Terminlöschung.
- Externer Kalender ist nicht führend.
- Es erfolgt keine Rücksynchronisation.
- Externe Änderungen werden bei nächster Aktualisierung überschrieben.
- Jeder Termin besitzt eine stabile externe UID.
- Die UID darf sich niemals ändern.
- Synchronisationsfehler dürfen Termin-Speicherung nicht blockieren.
- Fehler werden protokolliert.
- Authentifizierung erfolgt über Nextcloud-App-Passwort.
- Kommunikation erfolgt ausschließlich über HTTPS.
- CalDAV-Zugangsdaten werden über Umgebungsvariablen konfiguriert.

---

## FT (07) **Use Cases**

### UC 07/01: Änderungsabhängige Backup-Prüfung

### Akteur:

System (Scheduler)

### Ziel:

Feststellen, ob ein neues Backup erzeugt werden muss.

Vorbedingungen:

- Scheduler wurde gestartet.
- Tabelle `backup_log` existiert.

### Ablauf:

- System liest Zeitpunkt des letzten erfolgreichen Exports.
- System ermittelt MAX(updated_at) aller relevanten Tabellen.
- System vergleicht beide Zeitpunkte.
- Falls keine Änderung vorliegt, wird Lauf als „skipped“ protokolliert.
- Falls Änderung vorliegt, wird Exportprozess gestartet.

### Alternativen:

- Fehler bei Datenbankzugriff → Lauf wird als „error“ protokolliert.

### Ergebnis:

Backup wird nur bei tatsächlicher Datenänderung erzeugt.

### UC 07/02: Excel-Fallback-Dokument erzeugen

### Akteur:

System

### Ziel:

Erzeugung eines vollständigen Excel-Fallback-Dokuments.

Vorbedingungen:

- Änderungsprüfung hat Exportbedarf festgestellt.

### Ablauf:

- System lädt alle relevanten Daten.
- System erzeugt Kalender-Sheet mit Wochenstruktur.
- System erzeugt Detail-Sheet mit vollständigem Termin-Snapshot.
- System erzeugt zusätzliche Sheets (Projekte, Kunden, Mitarbeiter).
- Datei wird serverseitig gespeichert.

### Alternativen:

- Fehler bei Dateigenerierung → Lauf wird als „error“ protokolliert.

### Ergebnis:

Excel-Dokument ist persistent gespeichert.

### UC 07/03: PDF „Anstehende Termine“ erzeugen

### Akteur:

System

### Ziel:

Erzeugung einer operativen Terminliste für 2 Monate.

Vorbedingungen:

- Exportprozess läuft.

### Ablauf:

- System ermittelt Termine im Zeitraum „heute + 2 Monate“.
- Termine werden nach Datum und Uhrzeit sortiert.
- PDF wird generiert.
- Datei wird gespeichert.

### Alternativen:

- Fehler bei PDF-Erstellung → Lauf wird als „error“ protokolliert.

### Ergebnis:

PDF-Dokument ist persistent gespeichert.

### UC 07/04: Backup per E-Mail versenden

### Akteur:

System

### Ziel:

Versand des Fallback-Dokuments an definierte Empfänger.

Vorbedingungen:

- Excel- und PDF-Dateien wurden erfolgreich erzeugt.

### Ablauf:

- System erstellt E-Mail mit Datum im Betreff.
- Excel- und PDF-Dateien werden angehängt.
- E-Mail wird versendet.
- Mailstatus wird im Log gespeichert.

### Alternativen:

- Versand schlägt fehl → Mailstatus „failed“, Laufstatus „error“.

### Ergebnis:

Empfänger erhalten Backup-Dokumente per E-Mail.

### UC 07/05: Backup-Historie einsehen

### Akteur:

Administrator

### Ziel:

Nachvollziehen aller Backup-Läufe.

Vorbedingungen:

- Administrator ist angemeldet.

### Ablauf:

- Admin öffnet Einstellungsbereich.
- Admin wechselt zum Tab „Backups“.
- System zeigt tabellarische Liste aller `backup_log`Einträge.

### Alternativen:

- Keine Logeinträge vorhanden → Leere Liste.

### Ergebnis:

Admin kann Status und Verlauf aller Backups einsehen.

### UC 07/06: Backup herunterladen

### Akteur:

Administrator

### Ziel:

Herunterladen eines gespeicherten Backups.

Vorbedingungen:

- Backup-Datei existiert serverseitig.

### Ablauf:

- Admin doppelklickt auf einen Eintrag.
- System prüft Berechtigung.
- System liefert Datei über geschützten Endpoint aus.

### Alternativen:

- Datei nicht vorhanden → Fehlermeldung anzeigen.

### Ergebnis:

Backup-Datei wird lokal gespeichert.

### UC 07/07: Alte Backups automatisch löschen

### Akteur:

System (Scheduler)

### Ziel:

Speicherbereinigung gemäß Retention-Regel.

Vorbedingungen:

- Scheduler-Lauf wird ausgeführt.

### Ablauf:

- System prüft gespeicherte Dateien.
- Dateien älter als 30 Tage werden gelöscht.
- Löschvorgang wird protokolliert.

### Alternativen:

- Datei nicht auffindbar → Fehler protokollieren.

### Ergebnis:

Speicher bleibt kontrolliert, Log bleibt erhalten.

### UC 07/08: Termin in externen Kalender übertragen

### Akteur:

System

### Ziel:

Neuen Termin im externen Kalender anlegen.

Vorbedingungen:

- Termin wurde neu erstellt.
- Externer Kalender ist konfiguriert.

### Ablauf:

- System erzeugt Event-Daten aus Termin.
- System sendet Event an Kalender-API.
- Externe Event-ID wird gespeichert.
- Status wird protokolliert.

### Alternativen:

- API nicht erreichbar → Fehler wird protokolliert.

### Ergebnis:

Termin ist im externen Kalender sichtbar.

### UC 07/09: Synchronisationsfehler protokollieren

### Akteur:

System

### Ziel:

Nachvollziehbarkeit von Synchronisationsproblemen.

Vorbedingungen:

- Fehler bei API-Kommunikation.

### Ablauf:

- System speichert Fehlermeldung.
- Termin bleibt intern unverändert.
- Optional Retry bei nächstem Lauf.

### Alternativen:

Keine.

### Ergebnis:

Synchronisationsprobleme sind nachvollziehbar, Fachlogik bleibt stabil.

### UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren

### Akteur:

System

### Ziel:

Externen Kalender an geänderten Termin anpassen.

Vorbedingungen:

- Termin besitzt external_event_id.

### Ablauf:

- System erzeugt aktualisierte iCalendar-Daten.
- System sendet HTTP PUT an bestehende Event-URL.
- Status wird aktualisiert.
- Logeintrag wird erstellt.

### Alternativen:

- Event extern nicht vorhanden → Event wird neu angelegt.

### Ergebnis:

Externer Kalender entspricht internem Stand.

### UC 07/11: Termin im CalDAV-Kalender löschen

### Akteur:

System

### Ziel:

Externes Event entfernen.

Vorbedingungen:

- Termin wird intern gelöscht.
- external_event_id ist vorhanden.

### Ablauf:

- System sendet HTTP DELETE an Event-URL.
- external_event_id wird entfernt.
- Logeintrag wird erstellt.

### Alternativen:

- Event nicht auffindbar → Fehler protokollieren, intern fortfahren.

### Ergebnis:

Termin ist extern nicht mehr sichtbar.

### UC 07/12: Synchronisationsfehler protokollieren

### Akteur:

System

### Ziel:

Nachvollziehbarkeit von Synchronisationsproblemen.

Vorbedingungen:

- Fehler bei CalDAV-Kommunikation.

### Ablauf:

- System speichert Fehlermeldung im calendar_sync_log.
- Termin bleibt intern unverändert.

### Alternativen:

Keine.

### Ergebnis:

Synchronisationsprobleme sind nachvollziehbar, ohne Fachlogik zu beeinträchtigen.

# FT (09): Kundenverwaltung

## FT (09) Ziel / Zweck

Dieses Feature stellt die Verwaltung von Kundenstammdaten bereit, damit Termine nicht mehr mit frei erfassten Kundendaten arbeiten müssen. Termine referenzieren künftig ein Projekt und über dieses einen Kunden und übernehmen Adresse sowie Kontaktdaten daraus, um Konsistenz, Wiederverwendbarkeit und saubere Historien sicherzustellen. Einem Kunden können Notizen zugeordnet werden.

## FT (09) Fachliche Beschreibung

Die Kundenverwaltung ermöglicht das Anlegen, Bearbeiten und Anzeigen von Kunden. Pro Kunde werden Stammdaten gespeichert, insbesondere **Name/Firma**, **Kundennummer**, **Adresse** und **Telefonnummer**.

Ein Kunde kann beliebig viele Projekte und damit indirekt beliebig viele Termine besitzen. In der Kundendetailansicht wird eine **Projektliste** angezeigt, die alle dem Kunden zugeordneten Projekte umfasst (z. B. Aufbau, Service, Nachbesserung).

Disponenten erhalten serverseitig nur aktive Kunden und können daher nur aktive Kunden für neue Projekte auswählen. Die Verwaltung von aktiven und inaktiven Kunden (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation für Disponenten.

Kunden haben eine **Notizenliste** (0..n). Notizen werden in der Kundendetailansicht als vertikale Kärtchenliste dargestellt und über einen Richtext-Editor verwaltet. Die Verwaltungslogik für Notizen ist in FT (13): Notizverwaltung definiert. Notizen sind **kundenbezogen** und **projektunabhängig**.

In der Kundendetailansicht können dem Kunden zusätzlich Dokumente als Anhänge zugeordnet werden. Der Disponent kann Anhänge hochladen, in einer Anhangsliste einsehen, per Vorschau öffnen und bei Bedarf herunterladen. Eine Löschfunktion für Anhänge ist nicht vorgesehen.

## FT (09) Regeln & Randbedingungen

- Kundendaten (Name, Kundennummer, Adresse, Telefon) werden **zentral** am Kunden gepflegt.
- Kunden dürfen **nicht gelöscht** werden, wenn sie in Projekten verwendet werden.
- Disponenten erhalten serverseitig nur aktive Kunden und können nur aktive Kunden für neue Projekte auswählen.
- Pflichtfelder:
    - Kundennummer (aus WAWI).
- Notizen sind optional und werden über die Relationstabelle `customer_note` mit dem Kunden verknüpft.
- Ein Kunde kann 0..n Notizen haben.
- Notizen werden gemäß FT (13): Notizverwaltung verwaltet.
- Das Löschen eines Kunden löscht auch alle zugehörigen Notizen (CASCADE über customer_note).
- Kundenanhänge sind kundenbezogen und unabhängig von Projekten; Anhänge können hinzugefügt und heruntergeladen werden, eine physische Löschung ist nicht vorgesehen.

## FT (09) **Use Cases**

### **UC 09/01: Kunde anlegen**

### Akteur

Disponent, Administrator

### Ziel

Ein neuer Kunde wird mit vollständigen Stammdaten angelegt und steht anschließend für Projektzuordnungen zur Verfügung.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Anlage von Kunden.
- Pflichtfelder sind im System definiert.

### Ablauf

1. Der Akteur startet die Funktion „Kunde anlegen“.
2. Das System zeigt ein Formular zur Erfassung der Kundendaten an.
3. Der Akteur erfasst mindestens:
    - Kundenname bzw. Firma,
    - Telefonnummer,
    - Kundennummer,
    - Adresse (sofern für Planung oder Druck erforderlich).
4. Der Akteur bestätigt die Eingabe.
5. Das System validiert:
    - Pflichtfelder,
    - formale Korrektheit der Daten,
    - optionale Dublettenprüfung anhand Name/Adresse/Kundennummer.
6. Bei erfolgreicher Validierung speichert das System den Kunden mit `is_active = true`.
7. Das System erzeugt eine Versionskennung (z. B. `version` oder `updated_at`).
8. Das System zeigt die Kundendetailansicht des neu angelegten Kunden an.

### Alternativen

- Pflichtfeld fehlt → System antwortet mit Validierungsfehler, kein Persistieren.
- Formale Validierung schlägt fehl → System lehnt ab und markiert Feld.
- Dublettenprüfung schlägt an → System warnt oder blockiert gemäß Regel.
- Technischer Fehler → System antwortet mit 500, kein Kunde wird angelegt.

### Ergebnis

- Ein neuer Kundendatensatz existiert persistent.
- `is_active = true`.
- Der Kunde erscheint:
    - in Kundenlisten,
    - in Projektauswahldialogen (nur für aktive Kunden),
    - in Filterkomponenten für aktive Kunden.
- Es existieren noch keine Projekte, Termine oder Notizen für diesen Kunden.

### **UC 09/02: Kunde bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Bestehende Kundendaten werden aktualisiert, ohne referenzierende Projekte oder Termine inkonsistent zu machen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte.
- Eine gültige Versionskennung des Kunden liegt vor (Optimistic Locking).

### Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.
2. Das System zeigt:
    - Kundendaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.
3. Der Akteur startet die Funktion „Bearbeiten“.
4. Das System zeigt ein editierbares Formular mit den aktuellen Werten.
5. Der Akteur ändert zulässige Felder (z. B. Adresse, Telefonnummer, Kundennummer, Name).
6. Der Akteur bestätigt die Änderungen.
7. Das System prüft:
    - Berechtigung,
    - Pflichtfelder,
    - formale Validierung,
    - Versionskennung (Konfliktprüfung).
8. Bei erfolgreicher Prüfung speichert das System die Änderungen.
9. Das System erhöht die Versionskennung.
10. Das System aktualisiert abhängige Ansichten.

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur nicht berechtigt → System blockiert mit 403.
- Validierungsfehler → System lehnt ab, keine Speicherung.
- Versionskonflikt → System blockiert mit 409, fordert Neuladen.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- Kundendaten sind aktualisiert persistiert.
- Bestehende Projekte und Termine referenzieren weiterhin denselben Kunden.
- In Projektansichten, Kalender-Tooltips und Druckfunktionen erscheinen die aktualisierten Kundendaten.
- Es werden keine Projekte, Termine oder Notizen verändert.

### **UC 09/03: Kunde anzeigen (inkl. Terminliste)**

### Akteur

Disponent, Administrator

### Ziel

Die vollständige Kundendetailansicht wird angezeigt, einschließlich aller referenzierten Projekte sowie kundenbezogener Notizen und Anhänge.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.
- Der Kunde ist aktiv oder der Akteur besitzt Admin-Rechte zur Anzeige inaktiver Kunden.

### Ablauf

1. Der Akteur wählt einen Kunden aus einer Liste oder über eine Suche.
2. Das System lädt den Kundendatensatz.
3. Das System lädt alle dem Kunden zugeordneten Projekte.
4. Das System lädt alle kundenbezogenen Notizen.
5. Das System lädt alle kundenbezogenen Anhänge.
6. Das System zeigt die Kundendetailansicht mit folgenden Bereichen:
    - Stammdaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.

### Anzeige- und Query-Regeln

- Disponenten erhalten serverseitig nur aktive Kunden.
- Administratoren können aktive und inaktive Kunden laden.
- Die Projektliste wird ausschließlich aus der Projekt-Kunden-Relation abgeleitet.
- Termine werden nicht direkt geladen, sondern indirekt über Projekte referenziert.
- Notizen werden gemäß FT (13) geladen und sortiert.
- Anhänge werden gemäß FT (19) geladen.

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- Die Kundendetailansicht ist vollständig und konsistent dargestellt.
- Es werden keine Daten verändert.
- Die dargestellten Daten entsprechen dem aktuellen persistenten Zustand.

### **UC 09/04: Kunde deaktivieren / archivieren**

### Akteur

Administrator

### Ziel

Ein bestehender Kunde wird deaktiviert, sodass er nicht mehr für neue Projekte auswählbar ist, jedoch historisch erhalten bleibt.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell aktiv (`is_active = true`).
- Eine gültige Versionskennung liegt vor.

### Ablauf

1. Der Akteur öffnet die Detailansicht eines aktiven Kunden.
2. Der Akteur löst die Aktion „Deaktivieren“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = false`.
5. Das System persistiert die Änderung.
6. Das System erhöht die Versionskennung.
7. Das System aktualisiert abhängige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der deaktivierte Kunde erscheint nicht mehr:
    - in Projektauswahldialogen,
    - in Standard-Kundenlisten für Disponenten,
    - in Filtern für aktive Kunden.
- Bestehende Projekte und Termine bleiben unverändert referenziert.
- Historische Daten bleiben vollständig erhalten.
- Administratoren können den Kunden weiterhin laden und anzeigen.

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Kunde bereits deaktiviert → System antwortet mit 200 ohne Zustandsänderung.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- `is_active = false`.
- Der Kunde ist archiviert.
- Keine Projekte, Termine, Notizen oder Anhänge werden verändert oder gelöscht.
- Es entstehen keine verwaisten Referenzen.

### **UC 09/05: Kundennotizen verwalten**

### Akteur

Disponent, Administrator

### Ziel

Notizen werden einem Kunden zugeordnet, angezeigt, bearbeitet und strukturiert dargestellt, ohne Projektabhängigkeit zu erzeugen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; für Änderungen zusätzlich Änderungsrechte.
- Die Notizverwaltungslogik gemäß FT (13) ist verfügbar.

### Ablauf – Notiz hinzufügen

1. Der Akteur öffnet die Kundendetailansicht.
2. Der Akteur startet „Notiz hinzufügen“.
3. Das System öffnet den Richtext-Editor.
4. Optional wählt der Akteur eine Notizvorlage.
5. Das System kopiert Titel und Inhalt der Vorlage in den Editor (einmalig).
6. Der Akteur erfasst oder ändert Titel und Inhalt.
7. Der Akteur speichert die Notiz.
8. Das System validiert Eingaben.
9. Das System persistiert die Notiz und verknüpft sie über `customer_note` mit dem Kunden.
10. Das System aktualisiert die Notizenliste.

### Ablauf – Notiz bearbeiten

1. Der Akteur wählt eine bestehende Notiz.
2. Das System lädt die Notizdaten.
3. Der Akteur ändert Inhalt oder Pin-Status (`is_pinned`).
4. Der Akteur speichert.
5. Das System validiert und persistiert.
6. Das System aktualisiert `updated_at`.
7. Die Notizenliste wird neu sortiert.

### Anzeige- und Sortierregeln

- Notizen sind kundenbezogen und projektunabhängig.
- Angepinnte Notizen erscheinen vor nicht-angepinnten.
- Innerhalb beider Gruppen erfolgt Sortierung nach `updated_at` absteigend.
- Änderungen an Vorlagen wirken sich nicht auf bestehende Notizen aus.
- Notizen besitzen keine Versionierungshistorie.

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Änderungsrecht → System blockiert mit 403.
- Validierungsfehler → Speicherung wird abgelehnt.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- Notizen sind korrekt mit dem Kunden verknüpft.
- Es bestehen keine Referenzen zu Projekten oder Terminen.
- Die Kundendetailansicht zeigt die aktualisierte, korrekt sortierte Notizenliste.
- Keine Auswirkung auf Terminplanung oder Geschäftslogik.

### **UC 09/06: Kunde reaktivieren**

### Akteur

Administrator

### Ziel

Ein deaktivierter Kunde wird wieder aktiviert, sodass er erneut für neue Projekte auswählbar ist.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell deaktiviert (`is_active = false`).
- Eine gültige Versionskennung liegt vor.

### Ablauf

1. Der Akteur öffnet die Detailansicht eines deaktivierten Kunden.
2. Der Akteur löst die Aktion „Reaktivieren“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = true`.
5. Das System persistiert die Änderung.
6. Das System erhöht die Versionskennung.
7. Das System aktualisiert abhängige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der Kunde erscheint wieder:
    - in Kundenlisten für Disponenten,
    - in Projektauswahldialogen,
    - in Filtern für aktive Kunden.
- Bestehende Projekte, Termine, Notizen und Anhänge bleiben unverändert.
- Es erfolgt keine automatische Änderung an Projekten oder Terminen.

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Kunde bereits aktiv → System antwortet mit 200 ohne Zustandsänderung.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- `is_active = true`.
- Der Kunde ist wieder vollständig auswählbar.
- Keine fachlichen Seiteneffekte auf bestehende Projekte oder Termine.

### UC 09/07: Kundenanhänge verwalten

### Akteur

Disponent, Administrator

### Ziel

Dokumente werden einem Kunden zugeordnet, angezeigt und heruntergeladen, ohne die fachliche Integrität des Kunden oder referenzierender Projekte zu beeinträchtigen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; für Upload zusätzlich Änderungsrechte.
- Die hochzuladende Datei entspricht erlaubten Formaten und Größenbeschränkungen.

---

## Ablauf – Anhang hochladen

1. Der Akteur öffnet die Kundendetailansicht.
2. Der Akteur startet die Funktion „Anhang hinzufügen“.
3. Der Akteur wählt eine Datei aus.
4. Das System prüft:
    - Authentifizierung,
    - Berechtigung,
    - Dateiformat,
    - Dateigröße.
5. Das System speichert die Datei serverseitig unter persistentem Speichername.
6. Das System legt einen Attachment-Datensatz mit Parent-Referenz auf den Kunden an.
7. Das System speichert Metadaten (Originalname, MIME-Typ, Größe, Zeitstempel).
8. Das System aktualisiert die Anhangsliste in der UI.

---

## Ablauf – Anhang anzeigen / herunterladen

1. Der Akteur öffnet die Anhangsliste des Kunden.
2. Das System lädt alle dem Kunden zugeordneten Attachments.
3. Der Akteur wählt einen Anhang aus.
4. Das System liefert die Datei über einen gesicherten Download-Endpunkt aus.
5. Je nach Dateityp erfolgt Inline-Anzeige oder Download.

---

## Regeln und Einschränkungen

- Ein Attachment kann nicht ohne Parent-Kunde existieren.
- Attachments sind kundenbezogen und unabhängig von Projekten.
- Eine physische Löschung von Attachments ist systemweit nicht vorgesehen.
- Das Löschen eines Kunden entfernt referenzierte Notizen (CASCADE), jedoch keine physische Dateilöschung ist spezifiziert.
- Mehrere Akteure können parallel Anhänge hochladen; jeder Upload erzeugt einen eigenständigen Attachment-Datensatz.

---

## Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Berechtigung → System blockiert mit 403.
- Datei ungültig → System lehnt Upload mit Validierungsfehler ab.
- Technischer Fehler → System antwortet mit 500.

---

## Ergebnis

- Der Anhang ist persistent gespeichert und eindeutig dem Kunden zugeordnet.
- Die Anhangsliste zeigt alle vorhandenen Attachments konsistent an.
- Es entstehen keine Auswirkungen auf Projekte oder Termine.
- Es entstehen keine verwaisten Attachment-Referenzen.

### UC 09/08: Versionskonflikt bei paralleler Kundenbearbeitung

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Kunden keine stillen Datenüberschreibungen (Lost Updates) entstehen.

### Vorbedingungen

- Ein Kunde existiert.
- Zwei Akteure sind gleichzeitig authentifiziert.
- Beide Akteure haben Bearbeitungsrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

### Ablauf

1. Akteur A öffnet die Kundendetailansicht.
2. Akteur B öffnet dieselbe Kundendetailansicht.
3. Beide erhalten denselben Versionsstand (z. B. `version = 5`).
4. Akteur A ändert Kundendaten und speichert.
5. Das System prüft die Versionskennung.
6. Das System persistiert die Änderung.
7. Das System erhöht die Versionskennung auf `version = 6`.
8. Akteur B speichert nun seine Änderungen mit veralteter Versionskennung (`version = 5`).
9. Das System prüft die Versionskennung.
10. Das System erkennt die Abweichung.
11. Das System blockiert den Speichervorgang mit 409 (Konflikt).
12. Das System fordert Akteur B zum Neuladen auf.

### Alternativen

- Akteur B lädt vor dem Speichern neu → kein Konflikt.
- Akteur B bricht ab → keine Änderung.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- Es kommt zu keinem stillen Überschreiben von Kundendaten.
- Der zuletzt gespeicherte, valide Stand bleibt erhalten.
- Das System garantiert Optimistic Locking für Kundenänderungen.

### UC 09/09: Statuskonflikt bei parallelem Bearbeiten und Deaktivieren

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass eine Kundenbearbeitung nicht erfolgreich gespeichert werden kann, wenn der Kunde zwischenzeitlich deaktiviert wurde.

### Vorbedingungen

- Ein Kunde existiert und ist aktiv (`is_active = true`).
- Zwei Akteure sind gleichzeitig authentifiziert.
- Akteur A besitzt Bearbeitungsrechte (Disponent oder Administrator).
- Akteur B besitzt Administratorrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

### Ablauf

1. Akteur A öffnet die Kundendetailansicht und beginnt mit der Bearbeitung.
2. Akteur B öffnet denselben Kunden.
3. Akteur B löst „Deaktivieren“ aus.
4. Das System prüft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert die Änderung und erhöht die Versionskennung.
6. Akteur A speichert nun seine Änderungen mit veralteter Versionskennung.
7. Das System prüft:
    - Versionskennung,
    - aktuellen Status (`is_active`).
8. Das System erkennt den Konflikt.
9. Das System blockiert den Speichervorgang mit 409.
10. Das System fordert Akteur A zum Neuladen auf.

### Alternativen

- Akteur A lädt vor dem Speichern neu → das System zeigt den Kunden als deaktiviert an; Bearbeitung ist nur eingeschränkt möglich oder blockiert.
- Akteur B bricht die Deaktivierung ab → kein Konflikt.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

- Ein deaktivierter Kunde kann nicht unbemerkt durch parallele Bearbeitung wieder verändert werden.
- Es entstehen keine inkonsistenten Zustände zwischen Aktiv-Status und Stammdaten.
- Optimistic Locking wird auch bei Statusänderungen konsequent durchgesetzt.

### UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)

### Akteur

Administrator

### Ziel

Sicherstellen, dass bei parallelen Statusänderungen eines Kunden keine inkonsistenten Aktiv-Zustände entstehen.

### Vorbedingungen

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

### Alternativen

- Einer der Administratoren lädt vor dem Statuswechsel neu → kein Konflikt.
- Ein Statuswechsel wird vor dem parallelen Zugriff vollständig abgeschlossen → der zweite Vorgang wird mit aktuellem Status geprüft und ggf. als „keine Zustandsänderung“ behandelt.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Der Aktiv-Status eines Kunden ist jederzeit eindeutig und konsistent.
- Es existiert kein Zustand, in dem zwei widersprüchliche Statusänderungen gleichzeitig persistiert werden.
- Optimistic Locking gilt auch für reine Statusoperationen.

### UC 09/11: Rollenabhängige Filterung von Kundenlisten

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass Kundenlisten serverseitig rollenabhängig gefiltert werden und Disponenten ausschließlich aktive Kunden sehen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Mindestens ein aktiver oder inaktiver Kunde existiert.

---

### Ablauf – Disponent

1. Der Akteur mit Rolle Disponent ruft die Kundenliste auf.
2. Das System ermittelt die Rolle des Akteurs.
3. Das System führt eine serverseitige Abfrage aus, die ausschließlich Kunden mit `is_active = true` berücksichtigt.
4. Das System liefert die gefilterte Liste zurück.
5. Die UI zeigt ausschließlich aktive Kunden an.

---

### Ablauf – Administrator

1. Der Akteur mit Rolle Administrator ruft die Kundenliste auf.
2. Das System erkennt die Rolle Administrator.
3. Das System führt eine Abfrage ohne Aktiv-Filter aus oder ermöglicht eine explizite Filterauswahl.
4. Das System liefert aktive und inaktive Kunden zurück.
5. Die UI kennzeichnet inaktive Kunden eindeutig.

---

### Query-Vertrag

- Die Filterung erfolgt serverseitig.
- Ein Disponent kann durch Manipulation der UI oder Query-Parameter keine inaktiven Kunden erhalten.
- Die API muss rollenabhängig prüfen und darf sich nicht auf clientseitige Filter verlassen.

---

### Alternativen

- Keine Kunden vorhanden → System liefert leere Liste.
- Akteur nicht authentifiziert → System antwortet mit 401.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Disponenten sehen ausschließlich aktive Kunden.
- Administratoren sehen vollständige Daten.
- Die Datenintegrität ist unabhängig vom Client garantiert.

### UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren

### Akteur

Disponent

### Ziel

Sicherstellen, dass ein Disponent weder über direkte URL noch über manipulierte API-Requests auf einen inaktiven Kunden zugreifen kann.

### Vorbedingungen

- Ein Kunde existiert mit `is_active = false`.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Disponent.

---

### Ablauf

1. Der Disponent versucht, einen inaktiven Kunden zu laden, z. B.:
    - durch direkte URL-Eingabe,
    - durch manipulierten API-Request,
    - durch gespeicherte alte Detailansicht.
2. Das System ermittelt:
    - Rolle des Akteurs,
    - Aktiv-Status des Kunden.
3. Das System prüft serverseitig die Zugriffsberechtigung.
4. Das System blockiert den Zugriff.
5. Das System antwortet mit 404 oder 403 gemäß Sicherheitskonzept.

---

### Sicherheits- und Query-Regel

- Die Zugriffskontrolle erfolgt ausschließlich serverseitig.
- Der Aktiv-Status wird vor Auslieferung des Datensatzes geprüft.
- Es darf kein vollständiger Kundendatensatz an einen Disponenten ausgeliefert werden, wenn `is_active = false`.

---

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ist Administrator → Zugriff wird erlaubt.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Disponenten können inaktive Kunden nicht laden oder anzeigen.
- Administratoren behalten vollständigen Zugriff.
- Die Zugriffskontrolle ist unabhängig von der UI durchgesetzt.

### UC 09/13: Kunde löschen ohne Referenzen

### Akteur

Administrator

### Ziel

Einen Kunden endgültig löschen, sofern keine referenzierenden Projekte existieren, ohne inkonsistente Zustände zu erzeugen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden sind **keine Projekte** zugeordnet.
- Eine gültige Versionskennung liegt vor.

---

### Ablauf

1. Der Administrator öffnet die Detailansicht des Kunden.
2. Der Administrator löst die Aktion „Löschen“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - ob referenzierende Projekte existieren.
4. Das System stellt fest, dass keine Projekte referenzieren.
5. Das System löscht den Kundendatensatz.
6. Das System löscht alle zugehörigen Notizen über CASCADE (`customer_note`).
7. Das System entfernt alle Attachment-Referenzen zum Kunden (Dateien verbleiben gemäß globaler Regel physisch bestehen, sofern kein anderes Löschkonzept definiert ist).
8. Das System bestätigt die Löschung.

---

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Referenzierende Projekte vorhanden → System blockiert mit 409 (siehe UC 14).
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Der Kunde existiert nicht mehr im System.
- Es existieren keine verwaisten Notizen oder Attachment-Referenzen.
- Es existieren keine Projekte oder Termine, die auf einen gelöschten Kunden verweisen.
- Der Datenzustand bleibt konsistent.

### UC 09/14: Kunde löschen mit Referenzen (Blockade)

### Akteur

Administrator

### Ziel

Sicherstellen, dass ein Kunde nicht gelöscht werden kann, wenn ihm mindestens ein Projekt zugeordnet ist, um referenzielle Integrität zu gewährleisten.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden ist mindestens ein Projekt zugeordnet.
- Eine gültige Versionskennung liegt vor.

---

### Ablauf

1. Der Administrator öffnet die Detailansicht des Kunden.
2. Der Administrator löst die Aktion „Löschen“ aus.
3. Das System prüft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - Existenz referenzierender Projekte.
4. Das System stellt fest, dass mindestens ein Projekt existiert.
5. Das System blockiert den Löschvorgang.
6. Das System antwortet mit 409 (Konflikt) und gibt einen Hinweis auf bestehende Referenzen.

---

### Alternativen

- Kunde existiert nicht → System antwortet mit 404.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Der Kunde bleibt unverändert im System bestehen.
- Bestehende Projekte und Termine behalten ihre Referenzen.
- Es entstehen keine verwaisten Fremdschlüssel oder inkonsistenten Zustände.

### UC 09/15: Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass Kundenlisten bei Statusänderungen (Deaktivieren / Reaktivieren / Löschen) konsistent bleiben und keine veralteten Zustände persistieren.

### Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Browser-Sitzungen sind aktiv.
- Mindestens ein Akteur besitzt Administratorrechte.

---

### Ablauf – Beispiel: Deaktivieren in Browser A

1. Browser A (Administrator) öffnet die Kundendetailansicht eines aktiven Kunden.
2. Browser B (Disponent) zeigt eine Kundenliste mit diesem Kunden an.
3. Administrator in Browser A deaktiviert den Kunden.
4. Das System setzt `is_active = false` und persistiert die Änderung.
5. Browser B führt eine erneute Abfrage der Kundenliste aus (z. B. durch Seitenwechsel, Filterwechsel oder explizites Neuladen).
6. Das System liefert serverseitig gefilterte Daten gemäß Rolle.
7. Der deaktivierte Kunde erscheint nicht mehr in der Liste des Disponenten.

---

### Ablauf – Beispiel: Löschen

1. Administrator löscht einen Kunden ohne Referenzen (UC 13).
2. Ein anderer Browser versucht, denselben Kunden erneut zu laden.
3. Das System prüft Existenz.
4. Das System antwortet mit 404.

---

### Konsistenzregeln

- Die Datenquelle ist ausschließlich serverseitig maßgeblich.
- Es existiert keine clientseitige Cache-Logik, die serverseitige Filter übersteuern darf.
- Jede neue Anfrage muss den aktuellen Persistenzzustand widerspiegeln.
- Es ist nicht erforderlich, dass andere Browser aktiv gepusht werden; Konsistenz ist spätestens bei der nächsten Serverabfrage garantiert.

---

### Alternativen

- Browser verwendet veralteten lokalen Zustand → bei nächster Serveranfrage wird Zustand korrigiert.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Kundenlisten sind rollenabhängig und statusabhängig konsistent.
- Es entstehen keine dauerhaft sichtbaren veralteten Zustände.
- Gelöschte oder deaktivierte Kunden können nicht dauerhaft angezeigt werden.

### UC 09/16: Statusänderung des Kunden während Notiz- oder Attachment-Operation

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass parallele Statusänderungen eines Kunden (Deaktivieren / Löschen) keine inkonsistenten Zustände bei Notiz- oder Attachment-Operationen erzeugen.

### Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Akteure sind gleichzeitig authentifiziert.
- Einer der Akteure besitzt Administratorrechte.
- Der Kunde ist initial aktiv (`is_active = true`).

---

## Ablauf – Beispiel 1: Notiz hinzufügen während Deaktivierung

1. Akteur A (Disponent) öffnet die Kundendetailansicht und beginnt, eine Notiz zu erstellen.
2. Akteur B (Administrator) deaktiviert den Kunden.
3. Das System persistiert `is_active = false` und erhöht die Versionskennung.
4. Akteur A speichert die Notiz.
5. Das System prüft:
    - Existenz des Kunden,
    - aktuellen Status,
    - Versionskonsistenz des Parent-Objekts.
6. Das System erlaubt die Notizspeicherung, da Deaktivierung keine fachliche Sperre für bestehende Stammdatenoperationen darstellt.

---

## Ablauf – Beispiel 2: Notiz hinzufügen während Löschung

1. Akteur A beginnt mit dem Erstellen einer Notiz.
2. Akteur B löscht den Kunden gemäß UC 13.
3. Das System entfernt den Kundendatensatz.
4. Akteur A speichert die Notiz.
5. Das System prüft die Parent-Existenz.
6. Das System erkennt, dass der Kunde nicht mehr existiert.
7. Das System blockiert mit 404 oder 409.

---

## Ablauf – Beispiel 3: Attachment-Upload während Deaktivierung

1. Akteur A startet einen Upload.
2. Akteur B deaktiviert den Kunden.
3. Das System persistiert `is_active = false`.
4. Der Upload wird abgeschlossen.
5. Das System erlaubt die Persistierung des Attachment-Datensatzes, da Deaktivierung keine Parent-Löschung darstellt.

---

## Ablauf – Beispiel 4: Attachment-Upload während Löschung

1. Akteur A startet Upload.
2. Akteur B löscht den Kunden.
3. Das System entfernt den Kundendatensatz.
4. Der Upload versucht, den Attachment-Datensatz zu persistieren.
5. Das System prüft die Parent-Existenz.
6. Das System blockiert mit 404 oder 409.

---

### Konsistenzregeln

- Notiz- und Attachment-Operationen sind nur zulässig, wenn der Parent-Kunde existiert.
- Deaktivierung verhindert keine fachlich zulässigen Operationen auf bestehende Kunden.
- Löschung eines Kunden verhindert jede weitere Operation auf diesem Parent.
- Es dürfen keine verwaisten Notizen oder Attachments entstehen.
- Referenzielle Integrität ist serverseitig garantiert.

---

### Alternativen

- Versionskonflikt → System blockiert mit 409.
- Technischer Fehler → System antwortet mit 500.

---

### Ergebnis

- Es entstehen keine verwaisten Datensätze.
- Deaktivierung und Löschung sind sauber voneinander abgegrenzt.
- Parent-Integrität bleibt auch bei parallelen Operationen gewahrt.

# FT (11): Team Verwaltung

## FT (11) Ziel / Zweck

Teams ermöglichen der Disposition, häufig verwendete Mitarbeiterkombinationen schnell und konsistent auf Termine anzuwenden. Ziel ist es, die Mitarbeiterzuweisung zu beschleunigen, ohne die Terminplanung fachlich zu verändern oder zu verkomplizieren.

## FT (11) Fachliche Beschreibung

Teams sind **reine Dispositionshilfen**. Ein Team besteht aus einer Bezeichnung und einer Liste aktiver Mitarbeiter. Sie kann beim Anlegen oder Bearbeiten eines Termins ausgewählt werden; das System übernimmt dann die enthaltenen Mitarbeiter **als Vorschlag** in die Mitarbeiterzuweisung des Termins.

Am Termin selbst wird **immer die konkrete Mitarbeiterliste** gespeichert, nicht das Team. Änderungen an Teams wirken sich **nicht rückwirkend** auf bestehende oder vergangene Termine aus. Teams besitzen **keine Historie** und haben **keine fachliche Bedeutung** über die Vereinfachung der Eingabe hinaus.

Teams können unabhängig von Terminen existieren. Sie dürfen ausschließlich **aktive Mitarbeiter** enthalten. Beim Anwenden eines Teams ist eindeutig festzulegen, ob die Mitarbeiter **ersetzt** oder **hinzugefügt** werden; die Entscheidung ist systemweit konsistent umzusetzen.

## FT (11) Regeln & Randbedingungen

- Teams sind **nicht** direkt mit Terminen verknüpft.
- Gespeichert wird am Termin stets die **konkrete Mitarbeiterzuweisung**.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Teams enthalten **nur aktive Mitarbeiter**.
- Ein Termin kann mehrere Mitarbeiter haben; die Mitarbeiterzuweisung ist optional.
- Teams besitzen **keine Historie** und **keinen Status**.
- Teams können ohne Bezug zu Terminen existieren.
- Ein Mitarbeiter darf zu einem Zeitpunkt nur genau einem Team zugeordnet sein.
- Eine Teamzuweisung ist nur zulässig, wenn der Mitarbeiter keinem anderen Team zugeordnet ist.
- Bei paralleler Zuweisung entscheidet das System deterministisch durch serverseitige Validierung (409 bei Konflikt).

## FT (11) **Use Cases**

### **UC 11/01: Team anlegen**

### Akteur

Disponent

### Ziel

Ein neues Team anlegen, um häufig genutzte Mitarbeiterkombinationen schnell verwenden zu können.

### Vorbedingungen

- Es existieren aktive Mitarbeiter.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teamanlage.

### Auslöser

Der Akteur startet die Funktion „Team anlegen“.

### Ablauf

1. Das System erzeugt automatisch eine Bezeichnung für das neue Team.
2. Das System lädt ausschließlich aktive Mitarbeiter ohne bestehende Teamzuordnung (`team_id = null`).
3. Der Akteur wählt einen oder mehrere angezeigte Mitarbeiter aus.
4. Der Akteur bestätigt die Eingabe.
5. Das System prüft serverseitig für jeden ausgewählten Mitarbeiter:
    - Der Mitarbeiter existiert.
    - Der Mitarbeiter ist aktiv.
    - Der Mitarbeiter besitzt keine bestehende Teamzuordnung.
6. Das System persistiert das Team.
7. Das System setzt für jeden ausgewählten Mitarbeiter das Feld `team_id` auf die ID des neu angelegten Teams.
8. Das System erzeugt eine Versionskennung für das Team.

### Alternativabläufe

- Keine Mitarbeiter ausgewählt → Das System lehnt die Speicherung ab und fordert zur Auswahl auf.
- Ein ausgewählter Mitarbeiter ist zwischenzeitlich einem anderen Team zugeordnet worden → Das System antwortet mit 409 Conflict, es erfolgt keine Persistierung.
- Versionskonflikt bei paralleler Anlage mit identischer Bezeichnung → Das System behandelt dies gemäß allgemeiner Persistenzregeln.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.

### Ergebnis

- Ein neues Team existiert persistent.
- Alle zugeordneten Mitarbeiter besitzen `team_id = neuesTeam`.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Teamliste ist konsistent.

### **UC 11/02: Team bearbeiten**

### UC 11/02: Team bearbeiten

### Akteur

Disponent

### Ziel

Ein bestehendes Team anpassen, indem Mitarbeiter hinzugefügt oder entfernt werden.

### Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teambearbeitung.
- Das Team besitzt eine gültige Versionskennung.

### Auslöser

Der Akteur öffnet ein bestehendes Team zur Bearbeitung.

### Ablauf

1. Das System lädt Teamdaten inklusive aktueller Versionskennung.
2. Das System lädt als auswählbare Mitarbeiter:
    - alle aktiven Mitarbeiter ohne Teamzuordnung (`team_id = null`),
    - alle aktiven Mitarbeiter, die bereits diesem Team zugeordnet sind.
3. Der Akteur verändert die Mitarbeiterliste.
4. Der Akteur bestätigt die Änderungen.
5. Das System prüft serverseitig:
    - Versionskennung ist unverändert.
    - Jeder neu hinzugefügte Mitarbeiter existiert.
    - Jeder neu hinzugefügte Mitarbeiter ist aktiv.
    - Kein neu hinzugefügter Mitarbeiter ist einem anderen Team zugeordnet.
6. Das System entfernt `team_id` bei Mitarbeitern, die aus dem Team entfernt wurden.
7. Das System setzt `team_id` bei neu hinzugefügten Mitarbeitern auf die Team-ID.
8. Das System erhöht die Versionskennung des Teams.
9. Das System persistiert die Änderungen atomar.

### Alternativabläufe

- Versionskennung hat sich zwischenzeitlich geändert → Das System antwortet mit 409 Conflict, keine Persistierung.
- Ein neu hinzugefügter Mitarbeiter wurde parallel einem anderen Team zugeordnet → Das System antwortet mit 409 Conflict, keine Persistierung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung erfolgt.

### Ergebnis

- Die Mitarbeiterliste des Teams ist aktualisiert.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Team-Version ist erhöht.
- Der Datenzustand ist konsistent.

### **UC 11/03: Team löschen**

### Akteur

Disponent

### Ziel

Ein nicht mehr benötigtes Team entfernen.

### Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zum Löschen von Teams.
- Das Team besitzt eine gültige Versionskennung.

### Auslöser

Der Akteur wählt ein Team zum Löschen aus.

### Ablauf

1. Der Akteur startet „Team löschen“.
2. Das System fordert eine Bestätigung an.
3. Der Akteur bestätigt den Löschvorgang.
4. Das System prüft serverseitig die Versionskennung.
5. Das System setzt bei allen Mitarbeitern dieses Teams das Feld `team_id = null`.
6. Das System löscht das Team.

### Alternativabläufe

- Versionskonflikt → Das System antwortet mit 409 Conflict, keine Löschung.
- Abbruch durch den Akteur → Keine Löschung.
- Technischer Fehler → Das System antwortet mit 500, keine Teilpersistierung.

### Ergebnis

- Das Team existiert nicht mehr.
- Alle ehemals zugeordneten Mitarbeiter besitzen `team_id = null`.
- Kein verwaister Zustand entsteht.

### **UC 11/04: Team anzeigen**

### Akteur

Disponent

### Ziel

Eine Übersicht über vorhandene Teams und deren Zusammensetzung erhalten.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.

### Auslöser

Der Akteur ruft die Teamübersicht auf oder wählt ein Team aus.

### Ablauf

1. Das System lädt alle Teams.
2. Das System lädt zu jedem Team die aktuell zugeordneten aktiven Mitarbeiter (`team_id = teamId`).
3. Das System zeigt Bezeichnung und Mitarbeiterliste an.

### Alternativabläufe

- Keine Teams vorhanden → Das System zeigt eine entsprechende Information an.
- Technischer Fehler → Das System antwortet mit 500.

### Ergebnis

- Die Zusammensetzung der Teams ist vollständig und konsistent sichtbar.

# FT (12): Dispositionsübersicht

## FT (12) Ziel / Zweck

Dieses Feature unterstützt die Disposition durch eine übersichtliche, wochenbezogene Darstellung von Mitarbeiter- und Tourzuordnungen. Ziel ist es, Einsatzverteilungen transparent zu machen und Planungsentscheidungen zu erleichtern, ohne in bestehende Termin- oder Ressourcendaten einzugreifen.

## FT (12) Fachliche Beschreibung

Die Dispositionsübersicht stellt aus bestehenden Termindaten abgeleitete Wochenübersichten bereit. Sie zeigt, **welcher Mitarbeiter in welchen Kalenderwochen auf welchen Touren eingesetzt ist** und umgekehrt, **welche Mitarbeiter innerhalb einer Kalenderwoche auf einer bestimmten Tour eingeplant sind**.

Die Übersichten basieren ausschließlich auf vorhandenen Termin-, Mitarbeiter- und Tourzuordnungen. Es findet keine Bewertung, Priorisierung oder automatische Korrektur statt. Die Darstellung dient der Orientierung und Ergänzung der Terminplanung, insbesondere zur Erkennung von Mehrfachzuordnungen oder häufigen Tourwechseln innerhalb einer Woche.

Die Dispositionsübersicht berücksichtigt aktuelle und zukünftige Termine. Vergangene Termine können optional angezeigt werden, sind jedoch rein informativ und nicht veränderbar.

## FT (12) Regeln & Randbedingungen

- Die Übersichten werden ausschließlich aus bestehenden Terminen abgeleitet.
- Es werden nur Termine berücksichtigt, denen mindestens ein Mitarbeiter zugewiesen ist.
- Die Darstellung erfolgt kalenderwochenbezogen.
- Ein Mitarbeiter kann innerhalb einer Kalenderwoche nur einer Tour zugeordnet sein
- Soll ein Mitarbeiter innerhalb einer Woche an Terminen verschieder Touren teilnehmen, kann dies über die direkte Mitarbeiter - Termizuweisung realisiert werden
- Tourwechsel innerhalb einer Woche sind nicht möglich
- Die Übersicht trifft keine fachliche Bewertung und löst keine Warnungen aus.
- Die Anzeige ist rein informativ und verändert keine Termine, Mitarbeiter oder Touren.

## FT (12) **Use Cases**

### **UC 12/01: Mitarbeiterbezogene Wochenübersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, auf welchen Touren ein Mitarbeiter innerhalb einzelner Kalenderwochen eingesetzt ist.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Übersicht der Einsätze eines Mitarbeiters bereit. Die Übersicht wird aus bestehenden Terminen abgeleitet und zeigt die Tourzuordnung pro Kalenderwoche.

**Vorbedingungen**

- Es existieren Termine mit Mitarbeiter- und Tourzuordnung.
- Der Disponent ist berechtigt, Dispositionsübersichten einzusehen.

**Auslöser**

Der Disponent ruft die Dispositionsübersicht für einen Mitarbeiter auf.

**Ablauf**

1. Der Disponent wählt einen Mitarbeiter aus.
2. Das System ermittelt alle Termine, denen der Mitarbeiter zugewiesen ist.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugehörigen Touren je Woche ab.
5. Das System stellt die Wochenübersicht des Mitarbeiters dar.

**Alternativabläufe**

- Dem Mitarbeiter sind keine Termine zugeordnet: Das System zeigt eine leere Übersicht an.

**Ergebnis**

Der Disponent erhält eine Übersicht, aus der ersichtlich ist, auf welchen Touren der Mitarbeiter in den einzelnen Kalenderwochen eingesetzt ist.

**Ausgegebene Informationen**

- Kalenderwoche
- Mitarbeiter
- Zugeordnete Tour(en)

**Regeln & Randbedingungen**

- Die Übersicht ist informativ und nicht blockierend.
- Die Anzeige verändert keine fachlichen Daten.

### **UC 12/02: Tourbezogene Wochenübersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, welche Mitarbeiter innerhalb einzelner Kalenderwochen auf einer bestimmten Tour eingesetzt sind.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Übersicht einer Tour bereit. Die Übersicht zeigt, welche Mitarbeiter in einer Kalenderwoche Terminen dieser Tour zugeordnet sind.

**Vorbedingungen**

- Es existieren Termine mit Tour- und Mitarbeiterzuordnung.
- Der Disponent ist berechtigt, Dispositionsübersichten einzusehen.

**Auslöser**

Der Disponent ruft die Dispositionsübersicht für eine Tour auf.

**Ablauf**

1. Der Disponent wählt eine Tour aus.
2. Das System ermittelt alle Termine, die dieser Tour zugeordnet sind.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugeordneten Mitarbeiter je Woche ab.
5. Das System stellt die Wochenübersicht der Tour dar.

**Alternativabläufe**

- Der Tour sind keine Termine zugeordnet: Das System zeigt eine leere Übersicht an.

**Ergebnis**

Der Disponent erhält eine Übersicht, aus der ersichtlich ist, welche Mitarbeiter in den einzelnen Kalenderwochen auf der ausgewählten Tour eingesetzt sind.

**Ausgegebene Informationen**

- Kalenderwoche
- Tour
- Zugeordnete Mitarbeiter

**Regeln & Randbedingungen**

- Ein Mitarbeiter kann innerhalb einer Woche mehrfach oder auf mehreren Touren erscheinen.
- Die Übersicht trifft keine fachliche Bewertung.
- Die Anzeige verändert keine Termine, Mitarbeiter oder Touren.

# FT (13): Notizverwaltung

## FT (13) Ziel / Zweck

Dieses Feature ermöglicht die Verwaltung von Notizen als eigenständige Domainobjekte, die sowohl Projekten als auch Kunden zugeordnet werden können. Notizen dienen der Dokumentation zusätzlicher Informationen, Hinweise oder Besonderheiten, die im Kontext eines Projekts oder Kunden relevant sind.

Zusätzlich bietet das Feature vordefinierte Notizvorlagen als Eingabehilfe sowie die Möglichkeit, wichtige Notizen anzupinnen, damit diese stets oben in der Notizliste erscheinen.

## FT (13) Fachliche Beschreibung

Notizen sind eigenständige Textobjekte mit Titel, formatierbarer Beschreibung und Zeitstempeln für Erstellung und letzte Bearbeitung. Sie werden über Relationstabellen entweder Projekten oder Kunden zugeordnet und ermöglichen eine flexible Dokumentation ohne strukturelle Abhängigkeiten.

Eine Notiz gehört immer genau einem Parent-Objekt (Projekt oder Kunde). Eine Notiz existiert nie unabhängig – sie wird immer im Kontext ihres Parents erstellt, verwaltet und gelöscht.

Notizen werden in den Detailansichten von Projekt und Kunde als vertikale Kärtchenliste dargestellt. Die Bearbeitung erfolgt über einen schwebenden Richtext-Editor, der Textformatierung sowie Text- und Hintergrundfarben unterstützt.

**Angepinnte Notizen** werden in der Liste immer zuerst angezeigt, unabhängig von Erstellungs- oder Änderungsdatum. Innerhalb der gepinnten und nicht-gepinnten Gruppen erfolgt die Sortierung nach Änderungsdatum (neueste zuerst).

**Notizvorlagen** sind vordefinierte Textbausteine, die beim Erstellen einer neuen Notiz als Ausgangspunkt gewählt werden können. Vorlagen werden zentral in den Stammdaten verwaltet und stehen bei der Notizerstellung als Auswahlliste zur Verfügung. Die Vorlage wird beim Erstellen in die neue Notiz kopiert – danach besteht keine Verbindung mehr zwischen Vorlage und Notiz.

Notizen haben keine fachliche Wirkung auf Termine, Status oder Planungslogik. Sie dienen ausschließlich der Information und Dokumentation. Das Löschen einer Notiz erfolgt direkt über die Detailansicht des zugehörigen Parents und ist endgültig.

**Neu: Kennzeichnungsfarbe für Notizvorlagen (optional, Admin-only).** Notizvorlagen können optional eine zusätzliche Eigenschaft `color` besitzen, die eine fachliche Kennzeichnung darstellt und nicht mit Text- oder Hintergrundfarben innerhalb des Richtext-Inhalts zu verwechseln ist. Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden. Wird anschließend eine Notiz aus dieser Vorlage erzeugt, wird diese `color` beim Erstellen auf die neue Notiz übertragen. Daraus folgt, dass `color` als administrativ gepflegte Eigenschaft zu behandeln ist, die nur durch Administratoren gesetzt oder geändert werden darf.

## FT (13) Regeln & Randbedingungen

**Allgemeine Regeln für Notizen**

- Eine Notiz ist ein eigenständiges Domainobjekt mit eigener ID.
- Eine Notiz gehört immer genau einem Parent-Objekt (Projekt oder Kunde).
- Eine Notiz kann nie ohne Parent-Zuordnung existieren.
- Pflichtfelder einer Notiz:
    - Titel (Text)
    - Beschreibung (formatierter Text)
- Automatisch gepflegte Felder:
    - created_at (Erstellungszeitpunkt)
    - updated_at (letzter Bearbeitungszeitpunkt)
- Eine Notiz wird über Relationstabellen verknüpft mit:
    - genau 1 Projekt (über `project_note`) ODER
    - genau 1 Kunde (über `customer_note`)
- Das Löschen einer Notiz ist endgültig und entfernt automatisch die zugehörige Relation (CASCADE).
- Das Löschen eines Projekts oder Kunden entfernt automatisch alle zugehörigen Notizen und deren Relationen (CASCADE).
- Notizen werden ausschließlich in den Detailansichten von Projekt oder Kunde verwaltet.
- Es gibt keine separate Notizverwaltung in der Navigation.
- Notizen haben keine Versionierung oder Historie.
- Notizen sind rein informativ und haben keine Auswirkung auf Terminplanung oder Geschäftslogik.

**Regeln für angepinnte Notizen**

- Eine Notiz kann über das Feld `is_pinned` als angepinnt markiert werden.
- Angepinnte Notizen erscheinen in der Notizliste immer vor nicht-angepinnten Notizen.
- Innerhalb der gepinnten Gruppe erfolgt die Sortierung nach `updated_at` absteigend.
- Innerhalb der nicht-gepinnten Gruppe erfolgt die Sortierung ebenfalls nach `updated_at` absteigend.
- Das Pinning kann jederzeit aktiviert oder deaktiviert werden.

**Regeln für Notizvorlagen**

- Notizvorlagen sind eigenständige Stammdatenobjekte mit Titel und vordefiniertem Inhalt.
- Vorlagen existieren unabhängig von Projekten und Kunden.
- Vorlagen werden in einem eigenen Stammdatenbereich verwaltet (z.B. unter Einstellungen oder Stammdaten).
- Beim Erstellen einer Notiz kann optional eine Vorlage ausgewählt werden.
- Bei Auswahl einer Vorlage werden Titel und Beschreibung in den Editor kopiert.
- Nach dem Kopieren besteht keine Verbindung zwischen Vorlage und erstellter Notiz.
- Änderungen an einer Vorlage wirken sich nicht auf bereits erstellte Notizen aus.
- Vorlagen können eine Sortierreihenfolge haben, um die Anzeige in der Auswahlliste zu steuern.
- Vorlagen können deaktiviert werden, ohne sie zu löschen.
- 

**Neu: Regeln zur Kennzeichnungsfarbe (`color`)**

- Notizvorlagen können optional eine Kennzeichnungsfarbe `color` besitzen.
- `color` ist eine Admin-only Eigenschaft und darf nur von Administratoren gesetzt oder geändert werden.
- Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden.
- Wird eine Notiz aus einer Vorlage erstellt, wird `color` beim Erstellen der Notiz in die Notiz übernommen, sofern die Vorlage eine `color` besitzt.
- Die Übernahme der `color` ist einmalig beim Erstellen; spätere Änderungen an der Vorlagen-`color` verändern bereits erstellte Notizen nicht automatisch.
- `color` ist fachliche Kennzeichnung und unabhängig von Richtext-Formatierungen (Text-/Hintergrundfarben) im Feld `body`.

## FT (13) **Use Cases**

### **UC 13/01: Notiz zu Projekt hinzufügen**

### kteur

Disponent

### Ziel

Eine neue Notiz erstellen und einem Projekt zuordnen.

### Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Projektnotizen.

### Ablauf

1. Der Akteur öffnet die Projektdetailansicht.
2. Der Akteur wählt „Notiz hinzufügen“.
3. Das System öffnet einen Richtext-Editor.
4. Optional zeigt das System aktive Vorlagen an.
5. Wählt der Akteur eine Vorlage, übernimmt das System Titel und Inhalt.
6. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese einmalig.
7. Der Akteur erfasst oder ändert Titel und Beschreibung.
8. Der Akteur bestätigt.
9. Das System validiert Pflichtfelder.
10. Das System persistiert die Notiz mit Projektreferenz.
11. Das System aktualisiert die Notizenliste.

### Alternativen

- Pflichtfelder fehlen → Validierungsfehler.
- Abbruch → keine Persistenz.

### Ergebnis

Die Notiz ist persistent gespeichert und projektbezogen referenziert.

### **UC 13/02: Notiz zu Kunde hinzufügen**

### Akteur

Disponent, Administrator

### Ziel

Eine neue Notiz erstellen und eindeutig einem bestehenden Kunden zuordnen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Kundennotizen.
- Das System erzwingt eine eindeutige Parent-Zuordnung (Kunde).

### Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.
2. Der Akteur wählt die Funktion „Notiz hinzufügen“.
3. Das System öffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschließlich aktive Notizvorlagen zur Auswahl an.
5. Optional wählt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewählt, übernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewählte Vorlage eine Kennzeichnungsfarbe (`color`), übernimmt das System diese Kennzeichnungsfarbe einmalig in die neue Notiz.
8. Der Akteur erfasst oder ändert Titel und Beschreibung der Notiz.
9. Der Akteur bestätigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz ausschließlich auf den gewählten Kunden
    - Keine Projekt-Referenz
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz persistent.
13. Das System aktualisiert die Notizenliste in der Kundendetailansicht gemäß Sortierlogik.

### Alternativabläufe

- Pflichtfelder fehlen → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler bei Speicherung → HTTP 500, keine persistente Notiz entsteht.

### Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist ausschließlich dem Kunden zugeordnet.
- Die Notiz erscheint in der Notizenliste des Kunden.
- Es entstehen keine zusätzlichen Referenzen oder Seiteneffekte in anderen Domänen.

### **UC 13/03: Notiz bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notiz ändern, ohne parallele Änderungen anderer Akteure still zu überschreiben.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Notiz aus der Notizenliste eines Kunden oder Projekts.
2. Das System lädt die vollständigen Notizdaten einschließlich des aktuellen Versionsmerkmals.
3. Der Akteur ändert Titel und/oder Beschreibung der Notiz.
4. Änderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestätigt die Änderungen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.
8. Das System erhöht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### Alternativabläufe

- Pflichtfelder ungültig → Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Speicherung.
- Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geändert oder gelöscht) →
    
    Das System antwortet mit HTTP 409 Conflict, speichert keine Änderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.
    
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Änderung wird gespeichert.

### Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Die Notiz bleibt konsistent dem ursprünglichen Parent-Objekt zugeordnet.
- Es entstehen keine inkonsistenten Zwischenzustände oder Lost Updates.

### **UC 13/04: Notiz löschen**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notiz vollständig und konsistent entfernen.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Notizenliste im jeweiligen Parent-Kontext (Kunde oder Projekt).
2. Der Akteur wählt eine bestehende Notiz aus.
3. Der Akteur wählt die Funktion „Notiz löschen“.
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestätigt das Löschen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des übermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen überein, löscht das System die Notiz sowie die zugehörige Parent-Relation endgültig.
8. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### Alternativabläufe

- Der Akteur bricht die Sicherheitsabfrage ab → Die Notiz bleibt unverändert bestehen.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt (Notiz wurde zwischenzeitlich geändert oder bereits gelöscht) →
    
    Das System antwortet mit HTTP 409 Conflict, es erfolgt keine Löschung, der Akteur wird zum Neuladen aufgefordert.
    
- Technischer Fehler → HTTP 500, keine Löschung erfolgt.

### Ergebnis

- Die Notiz ist im Erfolgsfall vollständig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizenliste mehr.
- Parallele Aktionen führen nicht zu inkonsistenten Zuständen oder unbeabsichtigten Löschungen.
- Die Konsistenz der Parent-Relation bleibt gewahrt.

### **UC 13/05: Notizen eines Projekts anzeigen**

### Akteur

Disponent, Administrator, Leser

### Ziel

Alle einem Projekt eindeutig zugeordneten Notizen vollständig und konsistent einsehen.

### Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte für das Projekt.

### Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Projekts.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale Kärtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Die Darstellung enthält keine Bearbeitungselemente, sofern der Akteur ausschließlich Leserechte besitzt.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.

### Ergebnis

- Alle projektbezogenen Notizen sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieses Projekts angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verändert keine persistierten Daten.

### **UC 13/06: Notizen eines Kunden anzeigen**

### Akteur

Disponent, Administrator, Leser

### Ziel

Alle einem Kunden eindeutig zugeordneten Notizen vollständig und konsistent einsehen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte für den Kunden.

### Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt ausschließlich die Notizen, die eindeutig diesem Kunden zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale Kärtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Enthält der Akteur ausschließlich Leserechte, werden keine Bearbeitungs- oder Löschfunktionen angezeigt.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte → HTTP 403, keine Anzeige.
- Es existieren keine Notizen → Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler → HTTP 500, keine Anzeige.

### Ergebnis

- Alle kundenspezifischen Notizen sind konsistent sichtbar.
- Es werden ausschließlich Notizen dieses Kunden angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verändert keine persistierten Daten und hat keine Seiteneffekte auf Projektnotizen.

### **UC 13/07: Notiz anpinnen / Pinning aufheben**

### Akteur

Disponent, Administrator

### Ziel

Die Position einer bestehenden Notiz innerhalb der Notizenliste deterministisch beeinflussen, indem sie angepinnt oder das Pinning aufgehoben wird.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte für Notizen.
- Die Notiz verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wählt eine bestehende Notiz aus.
3. Der Akteur wählt die Funktion „Anpinnen“ oder „Pinning aufheben“.
4. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher Prüfung setzt das System `is_pinned` entsprechend auf TRUE oder FALSE.
6. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System sortiert die Notizenliste neu gemäß Sortierlogik:
    - Gepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
8. Das System rendert die aktualisierte Liste.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.
- Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Änderung.

### Ergebnis

- Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.
- Die Sortierung der Notizenliste ist deterministisch und konsistent.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Es entstehen keine Duplikate oder inkonsistenten Sortierzustände.

### **UC 13/08: Notizvorlage erstellen**

### Akteur

Disponent, Administrator

### Ziel

Eine neue Notizvorlage anlegen, die bei der Erstellung von Notizen ausgewählt werden kann.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.

### Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt die Funktion „Vorlage hinzufügen“.
3. Das System öffnet einen Editor zur Erfassung der Vorlagendaten.
4. Der Akteur erfasst mindestens Titel und vordefinierten Inhalt.
5. Optional legt der Akteur eine Sortierreihenfolge fest.
6. Optional legt der Administrator eine Kennzeichnungsfarbe (`color`) fest. Disponenten können die Kennzeichnungsfarbe nicht setzen oder ändern.
7. Der Akteur bestätigt die Eingabe.
8. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder.
9. Das System erstellt die Vorlage mit folgenden Initialwerten:
    - `is_active = true`,
    - Setzen von `created_at` und `updated_at`.
10. Das System speichert die Vorlage persistent.
11. Das System aktualisiert die Vorlagenliste gemäß definierter Sortierlogik.

### Alternativabläufe

- Pflichtfelder fehlen → Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Persistierung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Persistierung.
- Technischer Fehler → HTTP 500, keine Persistierung.
- Abbruch durch den Akteur → Keine Persistierung.

### Ergebnis

- Eine neue Notizvorlage existiert persistent.
- Die Vorlage ist aktiv (`is_active = true`) und erscheint in der Auswahlliste bei der Notizerstellung.
- Die Kennzeichnungsfarbe ist ausschließlich gesetzt, wenn sie durch einen Administrator definiert wurde.
- Es entstehen keine Seiteneffekte auf bereits bestehende Notizen.

### **UC 13/09: Notizvorlage bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notizvorlage ändern, ohne bereits erstellte Notizen rückwirkend zu beeinflussen.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Das System lädt die Vorlagendaten einschließlich Versionsmerkmal.
4. Der Akteur ändert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.
5. Optional ändert der Administrator die Kennzeichnungsfarbe (`color`). Disponenten dürfen die Kennzeichnungsfarbe nicht setzen oder ändern.
6. Der Akteur bestätigt die Änderungen.
7. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder,
    - Übereinstimmung des Versionsmerkmals.
8. Stimmen die Versionsinformationen überein, speichert das System die Änderungen.
9. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
10. Das System aktualisiert die Vorlagenliste gemäß Sortierlogik.

### Alternativabläufe

- Pflichtfelder ungültig → Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.
- Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.
- Abbruch durch den Akteur → Keine Persistierung.
- Technischer Fehler → HTTP 500, keine Änderung.

### Ergebnis

- Die Vorlage ist im Erfolgsfall aktualisiert.
- Bereits erstellte Notizen bleiben unverändert, einschließlich ihrer übernommenen Kennzeichnungsfarbe.
- Parallele Änderungen führen nicht zu stillen Überschreibungen.
- Die Vorlage steht weiterhin gemäß `is_active`Status in Auswahllisten zur Verfügung.

### **UC 13/10: Notizvorlage deaktivieren/aktivieren**

### Akteur

Disponent, Administrator

### Ziel

Den Aktivstatus einer bestehenden Notizvorlage ändern, ohne sie physisch zu löschen.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Der Akteur wählt die Funktion „Deaktivieren“ oder „Aktivieren“.
4. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher Prüfung setzt das System das Feld `is_active` entsprechend auf TRUE oder FALSE.
6. Das System erhöht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System speichert die Änderung persistent.
8. Das System aktualisiert die Vorlagenliste.

### Alternativabläufe

- Der Akteur ist nicht authentifiziert → HTTP 401, keine Änderung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Änderung.
- Versionskonflikt → HTTP 409 Conflict, keine Änderung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Änderung.

### Ergebnis

- Der Aktivstatus der Vorlage ist aktualisiert.
- Nur Vorlagen mit `is_active = true` erscheinen in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverändert.
- Es entsteht keine physische Löschung der Vorlage.

### **UC 13/11: Notizvorlage löschen**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notizvorlage endgültig aus dem System entfernen, ohne bereits erstellte Notizen zu verändern.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäß Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Der Akteur wählt die Funktion „Löschen“.
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestätigt das Löschen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des Versionsmerkmals.
7. Stimmen die Versionsinformationen überein, löscht das System die Vorlage endgültig aus der Persistenz.
8. Das System aktualisiert die Vorlagenliste.

### Alternativabläufe

- Der Akteur bricht die Sicherheitsabfrage ab → Die Vorlage bleibt unverändert bestehen.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt → HTTP 409 Conflict, keine Löschung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Löschung.

### Ergebnis

- Die Vorlage ist im Erfolgsfall vollständig aus dem System entfernt.
- Gelöschte Vorlagen erscheinen nicht mehr in der Vorlagenverwaltung und nicht in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverändert bestehen.
- Es entstehen keine verwaisten Referenzen oder Seiteneffekte in bestehenden Notizen.

### UC 13/12: Notizen bei zulässiger Projektlöschung kaskadierend entfernen

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass bei einer fachlich zulässigen Löschung eines Projekts alle eindeutig zugeordneten Projektnotizen konsistent und automatisch entfernt werden.

### Vorbedingungen

- Das Projekt existiert.
- Dem Projekt sind eine oder mehrere Notizen eindeutig zugeordnet.
- Mit dem Projekt ist **kein Termin verbunden**.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Löschrechte für Projekte.
- Das Projekt verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur öffnet die Detailansicht eines bestehenden Projekts.
2. Der Akteur wählt die Funktion „Löschen“.
3. Das System prüft vor Anzeige der Sicherheitsabfrage, ob mit dem Projekt Termine verknüpft sind.
4. Sind keine Termine verknüpft, zeigt das System eine Sicherheitsabfrage an.
5. Der Akteur bestätigt die Löschung.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Übereinstimmung des Versionsmerkmals des Projekts,
    - weiterhin das Nichtvorhandensein verknüpfter Termine.
7. Stimmen alle Prüfungen, löscht das System das Projekt.
8. Das System entfernt automatisch alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
9. Das System stellt sicher, dass keine verwaisten Projektnotizen verbleiben.
10. Das System bestätigt den erfolgreichen Löschvorgang.

### Alternativabläufe

- Mit dem Projekt sind Termine verknüpft → HTTP 409 Conflict, keine Löschung.
- Der Akteur bricht die Sicherheitsabfrage ab → Keine Löschung.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt → HTTP 409 Conflict, keine Löschung.
- Technischer Fehler → HTTP 500, keine Löschung.

### Ergebnis

- Das Projekt ist im Erfolgsfall vollständig gelöscht.
- Alle zugeordneten Projektnotizen sind vollständig entfernt.
- Kundennotizen bleiben unverändert bestehen.
- Es existieren keine verwaisten Notizen.
- Die referenzielle Integrität bleibt gewahrt.

# FT (14): Benutzer- und Rollenverwaltung

## FT (14) Ziel / Zweck

Dieses Feature definiert die Benutzerrollen und deren Berechtigungen im System. Ziel ist eine klare, nachvollziehbare und technisch durchsetzbare Trennung von Leserechten, operativen Bearbeitungsrechten und administrativen Systemrechten. Die Rollen wirken systemweit und bilden die Grundlage für sichere UI- und Backend-Logik.

## FT (14) Fachliche Beschreibung

Das System arbeitet rollenbasiert. Jeder Benutzer besitzt genau eine Rolle. Die Rolle bestimmt, welche Inhalte sichtbar sind und welche Aktionen erlaubt sind. Die Durchsetzung der Berechtigungen erfolgt sowohl in der Benutzeroberfläche (Sichtbarkeit und Bedienbarkeit) als auch serverseitig zur Absicherung gegen manipulierte Requests.

Es existieren drei Rollen:

- Leser
- Disponent
- Admin

Die Rollen beziehen sich auf alle fachlichen Objekte, insbesondere Kunden und Notizen, wie sie in FT (09) und FT (13) beschrieben sind. Bestimmte Felder und Aktionen (z. B. Archivierung von Kunden) sind bewusst ausschließlich administrativen Benutzern vorbehalten.

## FT (14) Regeln und Randbedingungen

Ein Benutzer besitzt genau eine Rolle. Mehrfachrollen oder temporäre Rollen sind nicht vorgesehen.

Berechtigungen müssen serverseitig geprüft werden. UI-seitige Einschränkungen dienen ausschließlich der Benutzerführung und ersetzen keine serverseitige Prüfung.

Kunden dürfen von normalen Benutzern nicht gelöscht werden. Die Deaktivierung bzw. Archivierung eines Kunden ist eine Admin-Funktion. Für nicht berechtigte Rollen bleibt der Status sichtbar, aber nicht veränderbar.

Notizen existieren ausschließlich im Kontext eines übergeordneten Objekts (Kunde oder Projekt). Es gibt keine eigenständige Notizverwaltung. Schreib- und Löschrechte für Notizen sind rollenabhängig.

Leser dürfen keinerlei schreibende Aktionen durchführen. Disponenten dürfen fachlich arbeiten, aber keine systemkritischen Zustände verändern. Admins dürfen alle Aktionen durchführen.

## FT (14) Use Cases

### UC 14/01: Benutzer anlegen

### Akteur

Admin

### Ziel

Einen neuen Benutzer mit einer gültigen Rolle im System anlegen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Es existiert mindestens ein weiterer Admin im System.

### Ablauf

1. Der Akteur öffnet die Benutzerverwaltung.
2. Der Akteur wählt die Funktion „Benutzer anlegen“.
3. Das System zeigt ein Formular zur Erfassung der Benutzerdaten an.
4. Der Akteur erfasst die erforderlichen Stammdaten.
5. Der Akteur wählt eine Rolle aus (Leser, Disponent oder Admin).
6. Der Akteur speichert.
7. Das System prüft die Admin-Berechtigung serverseitig.
8. Das System validiert die Eingaben.
9. Das System persistiert den Benutzer mit der gewählten Rolle.

### Alternativen

- Der Akteur besitzt keine Admin-Rolle → System antwortet mit 403.
- Pflichtfelder fehlen → System lehnt ab und speichert nicht.
- Technischer Fehler → System antwortet mit 500.

### Ergebnis

Ein neuer Benutzer existiert persistent mit genau einer Rolle.

### UC 14/02: Rolle eines Benutzers ändern

### Akteur

Admin

### Ziel

Die Rolle eines bestehenden Benutzers ändern.

### Vorbedingungen

- Der Benutzer existiert.
- Der Akteur besitzt die Rolle Admin.
- Es bleibt mindestens ein Admin im System erhalten.

### Ablauf

1. Der Akteur öffnet die Detailansicht eines Benutzers.
2. Der Akteur ändert die Rolle.
3. Der Akteur speichert.
4. Das System prüft serverseitig die Admin-Berechtigung.
5. Das System prüft, ob nach der Änderung mindestens ein Admin verbleibt.
6. Das System persistiert die neue Rolle.

### Alternativen

- Letzter Admin würde entfernt → System blockiert mit 409.
- Akteur ohne Admin-Rolle → System blockiert mit 403.
- Versionskonflikt → System blockiert mit 409.

### Ergebnis

Die Rolle ist aktualisiert und wirkt systemweit.

### UC 14/03: Unzulässige Mutation blockieren

### Akteur

Leser oder Disponent ohne ausreichende Rechte

### Ziel

Verhindern, dass ein Benutzer eine nicht erlaubte Mutation ausführt.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

### Ablauf

1. Der Akteur löst eine schreibende Aktion aus.
2. Das System prüft serverseitig die Rolle.
3. Das System erkennt fehlende Berechtigung.
4. Das System blockiert die Mutation.
5. Das System antwortet mit 403.

### Alternativen

- UI verhindert bereits die Anzeige der Aktion → Keine Mutation möglich.
- Manipulierter Request → Serverseitige Blockade greift.

### Ergebnis

Keine fachliche Änderung wird persistiert.

### UC 14/04: Letzten Admin schützen

### Akteur

Admin

### Ziel

Sicherstellen, dass das System niemals ohne Admin bleibt.

### Vorbedingungen

- Es existiert genau ein Admin.
- Der Akteur versucht, diesen herabzustufen oder zu löschen.

### Ablauf

1. Der Akteur startet die Rollenänderung oder Löschung.
2. Das System prüft die Anzahl verbleibender Admins.
3. Das System erkennt, dass kein weiterer Admin existiert.
4. Das System blockiert die Aktion.
5. Das System antwortet mit 409.

### Alternativen

- Es existieren mehrere Admins → Aktion wird erlaubt.

### Ergebnis

Mindestens ein Admin bleibt im System erhalten.

---

### UC 14/05: Rollenabhängige UI-Reduktion

### Akteur

Leser

### Ziel

Sicherstellen, dass ein Leser keine schreibenden UI-Elemente sieht.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt die Rolle Leser.

### Ablauf

1. Der Akteur öffnet eine fachliche Ansicht.
2. Das System rendert die UI rollenabhängig.
3. Das System blendet schreibende Elemente aus.
4. Der Akteur kann ausschließlich lesende Aktionen durchführen.

### Alternativen

- Deep-Link auf Bearbeitungsroute → Serverseitige Prüfung blockiert.

### Ergebnis

Die UI ist funktionsreduziert, ohne Datenmodelländerung.

---

### UC 14/06: Deep-Link serverseitig validieren

### Akteur

Benutzer ohne ausreichende Rolle

### Ziel

Sicherstellen, dass direkte URL-Aufrufe keine unzulässigen Aktionen ermöglichen.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

### Ablauf

1. Der Akteur ruft eine geschützte Route direkt auf.
2. Das System prüft serverseitig die Rolle.
3. Das System verweigert Zugriff.
4. Das System antwortet mit 403.

### Alternativen

- Route existiert nicht → 404.
- Technischer Fehler → 500.

### Ergebnis

Keine unzulässige Aktion wird ausgeführt.

---

### UC 14/07: Multi-Browser-Rollenänderung konsistent darstellen

### Akteur

Admin

### Ziel

Sicherstellen, dass Rollenänderungen in parallelen Sitzungen konsistent wirksam werden.

### Vorbedingungen

- Ein Benutzer ist in zwei Browsern angemeldet.
- Eine Rolle wird geändert.

### Ablauf

1. Der Akteur ändert die Rolle eines Benutzers.
2. Das System persistiert die neue Rolle.
3. In der zweiten Sitzung wird eine neue Anfrage gestellt.
4. Das System prüft die Rolle erneut serverseitig.
5. Das System setzt die neue Berechtigungsstufe durch.

### Alternativen

- Sitzung verwendet veraltete Tokens → System validiert bei nächstem Request.

### Ergebnis

Rollenänderungen wirken konsistent in allen Sitzungen.

# FT (15): Projekt Status Verwaltung

## FT (15) Ziel / Zweck

Dieses Feature beschreibt die Verwaltung von Projektstatus-Etiketten als administrative Stammdaten.

Projektstatus dienen der fachlichen Einordnung und Orientierung von Projekten über ihren gesamten Lebenszyklus hinweg. Sie ermöglichen es, einem Projekt mehrere Status parallel zuzuordnen, ohne die technische Planung oder Terminlogik direkt zu beeinflussen.

Ziel ist eine klar strukturierte, erweiterbare und historientaugliche Statusverwaltung, die unabhängig von der eigentlichen Projektbearbeitung gepflegt werden kann.

## FT (15) **Fachliche Beschreibung**

Projektstatus sind fachliche Etiketten, die zusätzlich zum Aktiv-Status eines Projekts (`is_active`) verwendet werden. Ein Projekt kann keinen, einen oder mehrere Projektstatus gleichzeitig besitzen. Die Status haben keinen unmittelbaren Einfluss auf Termine oder Kalenderfunktionen, dienen jedoch der fachlichen Orientierung, Filterung, Auswertung und Kommunikation im Dispositionsprozess.

Projektstatus werden in einer eigenen Stammdatentabelle gepflegt und über eine n:m-Beziehung Projekten zugeordnet.

Die Pflege der Statusliste erfolgt ausschließlich administrativ durch die Rolle **Admin**. Disponenten dürfen Projektstatus im Rahmen der Projektbearbeitung auswählen und entfernen, jedoch keine Status anlegen, ändern oder löschen.

Projektstatus besitzen einen Aktiv-Status (`is_active`).

- **Aktive Status** stehen Disponenten zur Auswahl bei neuen oder geänderten Projekten zur Verfügung.
- **Deaktivierte Status** stehen nicht mehr für neue Zuordnungen zur Verfügung, bleiben jedoch an bestehenden Projekten sichtbar und erhalten.

Ein Projektstatus darf nur dann physisch gelöscht werden, wenn er keinem Projekt mehr zugeordnet ist.

Ist ein Status mindestens einem Projekt zugeordnet, ist eine Löschung nicht zulässig; in diesem Fall kann der Status ausschließlich deaktiviert werden.

Bestimmte Status können als Default-Status definiert sein. Diese sind systemseitig geschützt und dürfen nicht gelöscht werden, unabhängig vom Verwendungszustand.

## FT (15) **Regeln & Randbedingungen**

- Projektstatus sind zentrale Stammdaten und werden systemweit verwendet.
- Ein Projekt kann keinen, einen oder mehrere Projektstatus besitzen.
- Die Zuordnung von Projektstatus zu Projekten erfolgt über eine n:m-Beziehung.
- Projektstatus haben keine direkte technische Wirkung auf Termine oder Kalenderlogik.
- Jeder Projektstatus besitzt ein Aktiv-Flag (`is_active`).

### Sichtbarkeit

- **Nur aktive Projektstatus erscheinen in Auswahllisten für Disponenten.**
- Deaktivierte Projektstatus:
    - bleiben an bestehenden Projekten sichtbar,
    - werden in Projekt-Detailansichten weiterhin angezeigt,
    - erscheinen nicht mehr in Auswahlkomponenten zur Neu-Zuordnung,
    - sind nicht Bestandteil von Auswahllisten im Dispositionskontext.
- Disponenten haben keinen Zugriff auf die Stammdatenverwaltung.
- Admins sehen in der Stammdatenverwaltung sowohl aktive als auch deaktivierte Status.
- API-Trennregel:
    - Endpunkte zur Statusauswahl filtern nach `is_active = true`.
    - Endpunkte zur Projektanzeige liefern alle zugeordneten Status unabhängig vom Aktiv-Flag.

### Löschregeln

- Ein Projektstatus darf nur gelöscht werden, wenn:
    - er keinem Projekt zugeordnet ist,
    - und er kein geschützter Default-Status ist.
- Ist ein Projektstatus mindestens einem Projekt zugeordnet, wird eine Löschung strikt blockiert.
- Eine blockierte Löschung darf **nicht** automatisch in eine Deaktivierung umgewandelt werden.
- Default-Statuswerte sind systemgeschützt und nicht löschbar.
- Die Pflege (Anlegen, Bearbeiten, Aktivieren, Deaktivieren, Löschen) ist ausschließlich der Rolle **Admin** vorbehalten.
- Disponenten dürfen Status ausschließlich Projekten zuordnen oder von Projekten entfernen.

## FT (15) **Use Cases**

### **UC 15/01: Projektstatus anzeigen**

### Akteur

Disponent, Admin

### Ziel

Eine Übersicht über verfügbare Projektstatus anzeigen.

### Vorbedingungen

- Mindestens ein Projektstatus existiert.

### Ablauf

1. Der Akteur öffnet ein Projekt oder eine Statusauswahl.
2. Das System ermittelt alle Projektstatus mit `is_active = true`.
3. Das System sortiert die Status gemäß definierter Standardsortierung.
4. Das System zeigt die Statusliste an.

### Ergebnis

Die aktiven Projektstatus sind sichtbar und auswählbar.

### **UC 15/02: Projektstatus zu Projekt zuordnen**

### Akteur

Disponent

### Ziel

Einem Projekt einen oder mehrere aktive Projektstatus zuweisen.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein aktiver Projektstatus existiert.

### Ablauf

1. Der Akteur öffnet ein Projekt.
2. Der Akteur wählt einen oder mehrere Status aus der Liste.
3. Das System prüft für jeden gewählten Status `is_active = true`.
4. Das System verhindert doppelte Zuordnungen.
5. Das System speichert die n:m-Beziehung.

### Ergebnis

Das Projekt besitzt die ausgewählten Status-Etiketten.

### **UC 15/03: Projektstatus entfernen**

### Akteur

Disponent

### Ziel

Einen bestehenden Projektstatus von einem Projekt entfernen.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt ist mindestens ein Status zugeordnet.

### Ablauf

1. Der Akteur öffnet das Projekt.
2. Der Akteur entfernt einen Status.
3. Das System entfernt die entsprechende n:m-Verknüpfung.
4. Das System speichert die Änderung.

### Ergebnis

Der Status ist nicht mehr dem Projekt zugeordnet. Andere Status bleiben unverändert.

### **UC 15/04: Projektstatus verwalten**

### Akteur

Admin

### Ziel

Projektstatus administrativ anlegen, bearbeiten, aktivieren, deaktivieren oder löschen.

### Vorbedingungen

- Der Akteur ist angemeldet.

### Ablauf

1. Der Akteur öffnet die Projektstatusverwaltung.
2. Der Akteur legt neue Status an oder bearbeitet bestehende.
3. Der Akteur aktiviert oder deaktiviert Status.
4. Der Akteur versucht einen Status zu löschen.
5. Das System prüft Referenzen und Default-Schutz.
6. Das System führt die zulässige Aktion aus oder blockiert sie mit Fehlermeldung.
7. Das System speichert die Änderung.

### Ergebnis

Die Statusliste ist konsistent gepflegt. Kein verwendeter oder geschützter Status wurde gelöscht.

### UC 15/05: Nicht verwendeten Projektstatus löschen

### Akteur

Admin

### Ziel

Einen nicht referenzierten und nicht geschützten Projektstatus dauerhaft löschen.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.
- Keine Projektzuordnung existiert.
- Kein Default-Schutz besteht.

### Ablauf

1. Der Akteur öffnet die Statusverwaltung.
2. Der Akteur wählt einen Status.
3. Der Akteur löst die Löschung aus.
4. Das System prüft Referenzen.
5. Das System prüft Default-Schutz.
6. Das System löscht den Status physisch.

### Ergebnis

Der Status ist vollständig aus dem System entfernt.

### UC 15/06: Verwendeten Projektstatus löschen (blockiert)

### Akteur

Admin

### Ziel

Verhindern, dass ein referenzierter Status gelöscht wird.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status ist mindestens einem Projekt zugeordnet.

### Ablauf

1. Der Akteur öffnet die Statusverwaltung.
2. Der Akteur löst die Löschung aus.
3. Das System erkennt bestehende Referenzen.
4. Das System blockiert die Löschung.
5. Das System gibt eine Fehlermeldung zurück.

### Ergebnis

Der Status bleibt unverändert bestehen.

### UC 15/07: Geschützten Default-Status löschen (blockiert)

### Akteur

Admin

### Ziel

Verhindern, dass ein referenzierter Status gelöscht wird.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status ist mindestens einem Projekt zugeordnet.

### Ablauf

1. Der Akteur öffnet die Statusverwaltung.
2. Der Akteur löst die Löschung aus.
3. Das System erkennt bestehende Referenzen.
4. Das System blockiert die Löschung.
5. Das System gibt eine Fehlermeldung zurück.

### Ergebnis

Der Status bleibt unverändert bestehen.

### UC 15/08: Projektstatus deaktivieren

### Akteur

Admin

### Ziel

Einen Status für zukünftige Auswahl deaktivieren.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.

### Ablauf

1. Der Akteur öffnet die Statusverwaltung.
2. Der Akteur setzt `is_active = false`.
3. Das System speichert die Änderung.
4. Das System stellt sicher, dass der Status nicht mehr in Auswahlendpunkten erscheint.

### Ergebnis

Der Status bleibt historisch erhalten, ist jedoch nicht mehr neu auswählbar.

### UC 15/09: Projektstatus bearbeiten

### Akteur

Admin

### Ziel

Den Namen oder die fachliche Bezeichnung eines bestehenden Projektstatus ändern.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.

### Ablauf

1. Der Akteur öffnet die Statusverwaltung.
2. Der Akteur wählt einen Status.
3. Der Akteur ändert den Namen.
4. Das System validiert die Eingabe.
5. Das System speichert die Änderung.

### Ergebnis

Der Status ist mit aktualisierter Bezeichnung gespeichert und in allen Projekten konsistent sichtbar.

# FT (16): Hilfetexte verwalten

## FT (16) Ziel / Zweck

Dieses Feature ermöglicht die zentrale Verwaltung von Hilfetexten in der Anwendung, die von Benutzern kontextbezogen über Hilfe-Symbole in der UI abgerufen werden können. Ziel ist, fachliche Bedienhinweise konsistent, wartbar und rollenbasiert bereitzustellen, ohne dass Hilfetexte in einzelnen UI-Views dupliziert oder fest im Frontend verdrahtet werden müssen.

## FT (16) Fachliche Beschreibung

Ein Hilfetext ist ein eigenständiges, administrierbares Objekt mit eindeutiger Kennung („help_key“), Titel und formatierbarem Inhalt (Markdown). Hilfetexte werden in der UI kontextbezogen über ein Hilfe-Symbol (z. B. „?“ oder „i“) angezeigt. Die UI übergibt beim Abruf den help_key, das System liefert den passenden Hilfetext zurück.

Hilfetexte sind rein informativ. Sie verändern keine fachlichen Daten (Kunden, Projekte, Termine, Touren etc.) und sind unabhängig von Termin- und Planungslogik. Sie dienen der besseren Bedienbarkeit, der Einarbeitung und der Reduzierung von Rückfragen.

Die Pflege der Hilfetexte erfolgt administrativ. Disponenten und Leser können Hilfetexte anzeigen, aber nicht verändern. Admins können Hilfetexte anlegen, bearbeiten, aktivieren/deaktivieren und verwalten.

## FT (16) Regeln & Randbedingungen

Ein Hilfetext besitzt einen eindeutigen help_key und darf pro help_key nur einmal existieren.

Hilfetexte sind global gültig; die Kontextbindung erfolgt ausschließlich über den help_key, nicht über direkte Fremdschlüssel auf Domainobjekte.

Hilfetexte haben keine fachliche Wirkung und sind ausschließlich Anzeige-/Dokumentationsinhalte.

Hilfetexte können aktiviert/deaktiviert werden; deaktivierte Hilfetexte sind in der UI nicht abrufbar, bleiben aber aus Gründen der Nachvollziehbarkeit erhalten.

Die Verwaltung (CRUD) der Hilfetexte ist ausschließlich der Rolle Admin vorbehalten.

Die Anzeige der Hilfetexte ist für alle Rollen erlaubt, sofern der Text aktiv ist.

Der Inhalt wird als Markdown gespeichert; externe Ressourcen- oder Dateipfadabhängigkeiten aus dem Client sind nicht vorgesehen.

## FT (16) **Use Cases**

### UC 16/01: Hilfetext anzeigen (kontextbezogen)

### Akteur

Disponent, Leser, Admin

### Ziel

Einen aktiven Hilfetext im jeweiligen UI-Kontext abrufen und anzeigen.

### Vorbedingungen

- Ein Hilfetext mit dem entsprechenden help_key existiert.
- Der Hilfetext ist als aktiv gekennzeichnet.
- Der help_key ist im UI-Kontext hinterlegt.
- Der Akteur ist authentifiziert.

### Ablauf

1. Der Akteur klickt in der UI auf das Hilfe-Symbol des jeweiligen Elements.
2. Die UI übergibt den hinterlegten help_key an das System.
3. Das System prüft, ob ein aktiver Hilfetext mit diesem help_key existiert.
4. Das System lädt Titel und Markdown-Inhalt des Hilfetextes.
5. Die UI stellt den Hilfetext als Tooltip, Popover oder Modal dar.

### Alternativen

- Es existiert kein Hilfetext mit diesem help_key → Das System liefert einen leeren Status zurück; die UI zeigt „Keine Hilfe verfügbar“ oder blendet das Symbol aus.
- Der Hilfetext ist deaktiviert → Das System liefert keinen Inhalt zurück; die UI zeigt keine Hilfe an.
- Technischer Fehler → Das System antwortet mit einem Fehlerstatus; die UI zeigt eine Fehlermeldung oder keine Hilfe an.

### Ergebnis

Der Akteur sieht den zum aktuellen UI-Kontext passenden Hilfetext. Es werden keine fachlichen Daten verändert.

### UC 16/02: Hilfetext anlegen

### kteur

Admin

### Ziel

Einen neuen Hilfetext erstellen, um einen UI-Kontext erklärbar zu machen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der gewünschte help_key ist noch nicht vergeben.

### Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt die Funktion „Hilfetext anlegen“.
3. Der Akteur erfasst help_key, Titel und Markdown-Inhalt.
4. Der Akteur legt fest, ob der Hilfetext aktiv ist.
5. Der Akteur speichert den Datensatz.
6. Das System validiert Pflichtfelder und Datentypen.
7. Das System prüft serverseitig die Eindeutigkeit des help_key.
8. Bei erfolgreicher Validierung speichert das System den Hilfetext persistent.

### Alternativen

- Pflichtfeld fehlt → Das System lehnt die Speicherung mit Validierungsfehler ab.
- help_key existiert bereits → Das System blockiert die Speicherung und fordert zur Korrektur auf.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Ein neuer Hilfetext ist persistent gespeichert und über seinen help_key referenzierbar. Der Hilfetext ist je nach gesetztem Status in der UI abrufbar oder nicht abrufbar.

### UC 16/03: Hilfetext bearbeiten

### Akteur

Admin

### Ziel

Einen bestehenden Hilfetext inhaltlich aktualisieren.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

### Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus der Liste aus.
3. Das System lädt die aktuellen Daten des Hilfetextes.
4. Der Akteur ändert Titel und/oder Markdown-Inhalt.
5. Der Akteur speichert die Änderungen.
6. Das System validiert die Eingaben.
7. Das System speichert die aktualisierten Daten persistent.

### Alternativen

- Der Akteur bricht den Vorgang ab → Es erfolgt keine Änderung.
- Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Der Hilfetext ist aktualisiert. Bei zukünftigen Abrufen über den help_key wird die neue Version angezeigt.

### UC 16/04: Hilfetext aktivieren/deaktivieren

### Akteur

Admin

### Ziel

Einen bestehenden Hilfetext aktivieren oder deaktivieren, um seine Sichtbarkeit in der UI zu steuern.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

### Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus.
3. Der Akteur ändert den Status auf „aktiv“ oder „inaktiv“.
4. Der Akteur speichert die Änderung.
5. Das System persistiert den neuen Status.

### Alternativen

- Der Akteur bricht den Vorgang ab → Der Status bleibt unverändert.
- Der Hilfetext existiert nicht mehr → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Der Hilfetext ist entsprechend dem gesetzten Status in der UI abrufbar oder nicht abrufbar. Bestehende fachliche Daten bleiben unverändert.

### UC 16/05: Hilfetexte durchsuchen und anzeigen

### Akteur

Admin

### Ziel

Hilfetexte anhand von Suchkriterien auffinden und zur weiteren Bearbeitung anzeigen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Es existieren Hilfetexte im System.

### Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Das System lädt die Liste der Hilfetexte.
3. Der Akteur gibt ein Suchkriterium ein, beispielsweise help_key oder Titel.
4. Das System filtert die Hilfetexte serverseitig anhand des eingegebenen Suchkriteriums.
5. Das System zeigt die gefilterte Trefferliste an.
6. Der Akteur kann einen Hilfetext aus der Liste auswählen, um dessen Detailansicht zu öffnen.

### Alternativen

- Keine Hilfetexte vorhanden → Das System zeigt eine leere Liste an.
- Suchkriterium liefert keine Treffer → Das System zeigt eine leere Trefferliste an.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück und zeigt keine oder eine unvollständige Liste an.

### Ergebnis

Der Akteur erhält eine gefilterte und konsistente Übersicht der Hilfetexte und kann einzelne Datensätze zur weiteren Bearbeitung auswählen.

### UC 16/06: Hilfetext löschen

### Akteur

Admin

### Ziel

Einen bestehenden Hilfetext dauerhaft aus dem System entfernen.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

### Ablauf

1. Der Akteur öffnet die Hilfetext-Verwaltung.
2. Der Akteur wählt einen bestehenden Hilfetext aus.
3. Der Akteur löst die Löschaktion aus.
4. Das System prüft die Berechtigung des Akteurs.
5. Das System löscht den Hilfetext persistent.
6. Das System aktualisiert die Hilfetextliste.

### Alternativen

- Der Hilfetext existiert nicht → Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte → Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler → Das System löscht nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Der Hilfetext ist nicht mehr im System vorhanden und kann über seinen help_key nicht mehr abgerufen werden.

### UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes

### Akteur

Admin

### Ziel

Sicherstellen, dass parallele Änderungen an einem Hilfetext nicht zu stillen Überschreibungen führen.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der Hilfetext besitzt eine gültige Versionskennung.

### Ablauf

1. Der Akteur öffnet einen bestehenden Hilfetext zur Bearbeitung.
2. Das System übermittelt die aktuelle Versionskennung des Hilfetextes.
3. Ein zweiter Akteur speichert zwischenzeitlich eine Änderung desselben Hilfetextes.
4. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.
5. Der erste Akteur speichert auf Basis der veralteten Versionskennung.
6. Das System erkennt die veraltete Versionskennung.
7. Das System blockiert die Speicherung mit einem Konfliktstatus.
8. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

### Alternativen

- Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.

### Ergebnis

Es entstehen keine Lost Updates. Der Hilfetext bleibt konsistent und entspricht stets dem zuletzt erfolgreich gespeicherten Zustand.

### UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern

### Akteur

Disponent, Leser

### Ziel

Sicherstellen, dass nur Administratoren Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen dürfen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Admin-Rechte.

### Ablauf

1. Der Akteur versucht, die Hilfetext-Verwaltung aufzurufen oder eine Verwaltungsaktion auszuführen.
2. Das System prüft serverseitig die Rolle des Akteurs.
3. Das System verweigert den Zugriff auf Verwaltungsfunktionen.
4. Das System liefert einen Berechtigungsfehler zurück.

### Alternativen

- Der Akteur versucht, direkt über einen API-Endpunkt eine Verwaltungsaktion auszuführen → Das System prüft die Rolle und blockiert ebenfalls mit einem Berechtigungsfehler.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück.

### Ergebnis

Nicht berechtigte Rollen können keine Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder löschen. Die Integrität der Hilfetexte bleibt gewahrt.

# FT (17): UI Komposition

## FT (17) Ziel / Zweck

Dieses Feature definiert eine eigene, klar abgegrenzte Kompositionsschicht für UI-Bausteine und die dazugehörige Dokumentation. Das Ziel ist es, wiederkehrende Layout- und Strukturmuster als verbindliche Vorlagen zu etablieren, sodass neue Screens nicht jedes Mal „frei“ komponiert werden, sondern sich kontrolliert aus stabilen, getesteten Mustern zusammensetzen. Dadurch sinken Komplexität, UI-Drift und Duplikation, während Refactorings nachvollziehbar und risikoarm bleiben.

Dieses Feature ist bewusst kein Fachfeature, sondern eine technische und gestalterische Leitplanke. Es beschreibt, welche UI-Komponenten als „Kompositionsvorlagen“ gelten, wie sie verwendet werden, welche Slots und Zuständigkeiten sie besitzen und wie sich neue Patterns ergänzen lassen, ohne bestehende Screens zu destabilisieren.

## FT (17) Fachliche Beschreibung

### UI-Komponenten-Dokumentation

#### 1. Ziel und Lesart

Dieses Dokument ist als technische Lesedokumentation aufgebaut, nicht als Datei-Inventar.

Es beschreibt:

- welche UI-Komponenten es gibt,
- wo sie in der GUI sichtbar sind,
- wie Wrapper, Ableitungen und Basiskomponenten zusammenarbeiten.

#### 2. GUI-Landkarte

#### Hauptnavigation

Die Anwendung ist in der linken Sidebar nach Funktionsbereichen gegliedert:

- Terminplanung: Wochen-, Monats-, Jahresansicht und Terminliste
- Projektplanung: Projekte und Kunden
- Mitarbeiterverwaltung: Mitarbeiter, Teams, Touren
- Administration: Notizvorlagen, Projektstatus, Hilfetexte, Benutzer, Einstellungen, Demo-Daten

#### Arbeitsfläche rechts

Die rechte Hauptfläche zeigt je nach Navigation:

- Listenansichten (Board/Tabelle),
- Detail-Formulare,
- Dialoge für Auswahl oder Bearbeitung,
- Kalenderansichten mit Bottom-Filterbereich.

#### 3. Architektur in einem Satz

`ListLayout` bildet den wiederkehrenden Seitenrahmen; innerhalb davon wechseln `BoardView` und `TableView`, während fachliche Badges auf `InfoBadge` aufbauen und Vorschauen über `HoverPreview` anzeigen.

#### 4. Komponenten mit GUI-Kontext

#### 4.1 Layout- und Seitenstruktur

#### `ListLayout`

**Kurztext:** Strukturkomponente für fast alle Listenbildschirme. Sie ordnet Kopfbereich, Inhaltsfläche, Filterbereich und Fußbereich einheitlich an.

**Wo sichtbar:** Kundenliste, Projektliste, Mitarbeiterliste, Terminliste, Hilfetexte, Notizvorlagen, Projektstatus sowie Dialoglisten (z. B. Mitarbeiterauswahl).

#### `BoardView`

**Kurztext:** Kartenraster für visuelle Übersichten. Eignet sich für „auf einen Blick“-Szenarien mit kompakten Karten.

**Wo sichtbar:** Board-Modus in Kunden, Projekten, Mitarbeitern, Hilfetexten, Notizvorlagen, Teams, Touren und Projektstatus.

#### `TableView`

**Kurztext:** Tabellarische Ansicht für dichte Daten, Sortierung und zielsichere Auswahl per Doppelklick.

**Wo sichtbar:** Tabellenmodus in Kunden, Projekten, Mitarbeitern, Hilfetexten; standardmäßig in der Terminliste und in Dialoglisten.

#### 4.2 Karten, Form-Rahmen und Dialograhmen

#### `EntityCard`

**Kurztext:** Einheitliche Karte für Board-Ansichten mit Titelbereich, Inhalt und optionalen Aktionen/Footer.

**Wo sichtbar:** Karten in Kunden-, Projekt- und Mitarbeiter-Boards.

#### `EntityFormLayout`

**Kurztext:** Formularrahmen für große Detail- und Bearbeitungsseiten mit klarer Aktionsleiste.

**Wo sichtbar:** Projektformular und Terminformular.

#### `EntityEditDialog`

**Kurztext:** Dialograhmen für fokussierte Bearbeitung innerhalb einer Liste ohne Seitenwechsel.

**Wo sichtbar:** Mitarbeiter-Detaildialog in der Mitarbeiterverwaltung.

#### 4.3 Filterkomponenten

#### `FilterPanel`

**Kurztext:** Technische Basiskomponente für Filter-Container mit konsistenter Typografie und Layout.

**Wo sichtbar:** Als Grundlage in allen spezialisierten Filterleisten.

#### `CustomerFilterPanel`

**Kurztext:** Filter für Name und Kundennummer zur schnellen Eingrenzung.

**Wo sichtbar:** Unterer Filterbereich der Kundenliste.

#### `ProjectFilterPanel`

**Kurztext:** Mehrteiliges Filterpanel für Projekttitel, Kundenbezug, Statusauswahl und Scope.

**Wo sichtbar:** Unterer Filterbereich der Projektliste.

#### `EmployeeFilterPanel`

**Kurztext:** Filter für Mitarbeitername plus Umschaltung aktiv/alle.

**Wo sichtbar:** Unterer Filterbereich der Mitarbeiterliste.

#### `AppointmentsFilterPanel`

**Kurztext:** Umfangreicher Filter für Terminliste (Mitarbeiter, Projekt, Kunde, Tour, Datum, Statusflags).

**Wo sichtbar:** Unterer Filterbereich der Terminliste.

#### `CalendarFilterPanel`

**Kurztext:** Schlanker Kalenderfilter für Mitarbeiterselektion.

**Wo sichtbar:** Fußbereich in Monats-, Wochen- und Jahreskalender.

#### 4.4 Badge-System (Wrapper und Ableitungen)

#### `InfoBadge` (Basis)

**Kurztext:** Neutrale Badge-Basis mit optionaler Hover-Vorschau und Add/Remove-Aktion.

**Wo sichtbar:** Nicht direkt fachlich, sondern als Fundament aller fachlichen Info-Badges.

#### `PersonInfoBadge` und `ColoredInfoBadge` (generische Wrapper)

**Kurztext:** `PersonInfoBadge` standardisiert Darstellung für Personen; `ColoredInfoBadge` kapselt farbcodierte Fachobjekte.

**Wo sichtbar:** Indirekt in Kunden-, Mitarbeiter-, Team-, Tour- und Statusdarstellungen.

#### Fachliche Badges

- `CustomerInfoBadge`: Kunde im Terminformular und in projektnahen Kontexten.
- `EmployeeInfoBadge`: Mitarbeiter in Terminformular, Team- und Tourverwaltung sowie Auswahl-/Editdialogen.
- `ProjectInfoBadge`: Projektbezug im Terminformular.
- `TeamInfoBadge`: Teamzuordnung in Mitarbeiterkarten und Mitarbeiterdetail.
- `TourInfoBadge`: Tourzuordnung in Mitarbeiterkarten, Mitarbeiterdetail und Terminbezug.
- `ProjectStatusInfoBadge`: Projektstatus in projektbezogenen Panels und Kalender-Teilansichten.
- `TerminInfoBadge`: Terminzusammenfassung in Termin-Panels.
- `AttachmentInfoBadge`: Dateianhänge in Attachment-Panels.

#### Preview-Ableitungen (`create...Preview`, `...Preview`)

**Kurztext:** Jeder fachliche Badge kann eine typisierte Vorschau erzeugen, ohne die Basis zu überladen.

**Wo sichtbar:** Hover-Vorschauen bei Badges und Terminzeilen, z. B. Termin-Wochenpanel-Preview in Tabellen.

#### 4.5 Formulare und fachliche Panel-Komponenten

#### `AppointmentForm`

**Kurztext:** Zentrales Terminformular für Neu- und Bearbeitung mit Projekt-, Tour- und Mitarbeiterbezug.

**Wo sichtbar:** Hauptarbeitsfläche bei Terminbearbeitung.

**GUI-Rolle:** kombiniert Badge-Informationen, Datums-/Zeitfelder, Auswahl-Dialoge und Konfliktbestätigungen.

#### `ProjectForm`

**Kurztext:** Projektformular mit Stammdaten, Kundenzuordnung, Notizen, Status und angehängten Bereichen.

**Wo sichtbar:** Hauptarbeitsfläche bei Projekterstellung und Projektbearbeitung.

**GUI-Rolle:** fungiert als fachliches Hub für Termine, Status und Anhänge eines Projekts.

#### `CustomerData`

**Kurztext:** Kundenstammdaten-Formular mit eingebetteten Zusatzpanels.

**Wo sichtbar:** Hauptarbeitsfläche in der Kunden-Detailansicht.

**GUI-Rolle:** vereint Kundenfelder, Terminbezug und Dateianhänge in einer Bearbeitungsansicht.

#### `ProjectAppointmentsPanel`, `CustomerAppointmentsPanel`, `EmployeeAppointmentsPanel`

**Kurztext:** Kontext-Panels für Terminbezug innerhalb eines Fachobjekts.

**Wo sichtbar:** In den jeweiligen Detailformularen/-dialogen rechts oder im unteren Abschnitt.

#### `ProjectAttachmentsPanel`, `CustomerAttachmentsPanel`, `EmployeeAttachmentsPanel`

**Kurztext:** Dateibezogene Panels für Upload, Anzeige und Zugriff auf verknüpfte Dokumente.

**Wo sichtbar:** In den jeweiligen Detailformularen oder Detaildialogen.

#### 4.6 Dialoglisten und Picker

#### `EmployeePickerDialogList`

**Kurztext:** Tabellarischer Auswahldialog für Mitarbeiter mit Filter und Preview.

**Wo sichtbar:** Im Terminformular und in Edit-Dialogen mit Mitarbeiterzuweisung.

#### `EmployeeAppointmentsTableDialog`

**Kurztext:** Tabellenfokussierter Termin-Dialog im Mitarbeiterkontext.

**Wo sichtbar:** Aus dem Mitarbeiter-Detaildialog heraus öffnend.

#### 5. Zusammenhänge (Wrapper, Ableitungen, Komposition)

#### Badge-Kompositionsketten

- `TeamInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `TourInfoBadge -> ColoredInfoBadge -> InfoBadge`
- `CustomerInfoBadge -> PersonInfoBadge -> InfoBadge`
- `EmployeeInfoBadge -> PersonInfoBadge -> InfoBadge`
- `ProjectInfoBadge -> InfoBadge`
- `TerminInfoBadge -> InfoBadge`
- `AttachmentInfoBadge -> InfoBadge`

#### Preview-Ketten

- `TeamInfoBadge -> createTeamInfoBadgePreview -> TeamInfoBadgePreview`
- `TourInfoBadge -> createTourInfoBadgePreview -> TourInfoBadgePreview`
- `CustomerInfoBadge -> createCustomerInfoBadgePreview -> CustomerInfoBadgePreview`
- `EmployeeInfoBadge -> createEmployeeInfoBadgePreview -> EmployeeInfoBadgePreview`
- `ProjectInfoBadge -> createProjectInfoBadgePreview -> ProjectInfoBadgePreview`
- `TerminInfoBadge -> createAppointmentInfoBadgePreview -> AppointmentInfoBadgePreview`
- `AttachmentInfoBadge -> createAttachmentInfoBadgePreview -> AttachmentInfoBadgePreview`

#### Listenkomposition

- Seite/Dialog -> `ListLayout`
- Inhaltsmodus -> `BoardView` oder `TableView`
- Detailverdichtung -> Hover-Preview über `rowPreviewRenderer` oder Badge-Preview

#### 6. Public API-Dokumentationsstandard

Für jede Komponente wird dokumentiert:

- `Props` inkl. Pflichtfeldern und Defaults
- ausgehende Events/Callbacks (`on*`)
- Slots/Children bzw. Renderbereiche
- Weitergabe, Einschränkung oder Erweiterung bei Wrappern

Bei Ableitungen wird die Differenz zur Basiskomponente tabellarisch erfasst:

- Merkmal
- Basisverhalten
- Verhalten der Ableitung
- Grund der Abweichung

#### 7. A11y-, Theming- und Responsive-Hinweise

Pro Komponente werden verpflichtend beschrieben:

- semantische Struktur und Tastaturbedienung,
- verwendete Design-Tokens/Utility-Klassen,
- Verhalten auf schmalen Breiten (Umbruch, Scroll, Sticky Header, Grid-Wechsel).

#### 8. Best Practices und Anti-Patterns

#### Best Practices

- Fachwissen in Wrappern kapseln, Basiskomponenten technisch halten.
- Ein Preview-Typ pro Fachobjekt, klar benannt und wiederverwendbar.
- In Listen nur einen Interaktionspfad pro Aktion (z. B. Doppelklick zum Öffnen).

#### Anti-Patterns

- Fachregeln direkt in `ListLayout`, `TableView` oder `InfoBadge`.
- Uneinheitliche Filterposition zwischen vergleichbaren Listen.
- Mehrere konkurrierende Vorschau-Mechanismen für denselben Datentyp.

#### 9. Migration und Deprecation

Wenn Komponenten ersetzt werden, wird immer dokumentiert:

- Altkomponente und Nachfolger,
- API-Unterschiede,
- Migrationshinweis für Aufrufer,
- Lifecycle-Status (`aktiv`, `deprecated`, `experimentell`).

Bekannte abgeschlossene Altstruktur:

- früheres `badgeType`/`badgeData`-Pattern entfernt
- zentrale Registry für Badge-Previews entfernt

#### 10. Pflegeprozess

Dokumentationsupdate ist Pflicht bei:

- neuer Komponente,
- API-Änderung,
- neuer Wrapper- oder Ableitungskette,
- Deprecation/Entfernung.

Arbeitsreihenfolge:

1. Komponentenporträt aktualisieren.
2. GUI-Kontext prüfen und ergänzen.
3. Zusammenhangslisten (Komposition/Preview) nachziehen.
4. Lifecycle-Status setzen.

#### 11. Template für neue Komponentenporträts

```markdown
## <Komponentenname>
- Kategorie: `Basis | Wrapper | Ableitung | Fachkomponente`
- Status: `aktiv | deprecated | experimentell`
### Kurzbeschreibung
<2-4 Sätze mit fachlichem Nutzen>
### Wo sichtbar in der GUI
- <Ansicht/Formular/Dialog>
- <Position im Screen, z. B. Header, Content, Footer, rechter Panelbereich>
### Public API
| Element | Typ | Pflicht | Default | Bedeutung |
|---|---|---|---|---|
| `<prop oder event>` | `<type>` | `ja/nein` | `<wert>` | `<text>` |
### Beziehungen
- Verwendet: <Basis/Helper>
- Verwendet von: <Screens/Formulare/Wrapper>
- Ableitungen: <falls vorhanden>
### Hinweise
- A11y:
- Responsiveness:
- Bekannte Einschränkungen:
```

## FT (17) Regeln & Randbedingungen

Die Kompositionsschicht enthält ausschließlich Layout- und Strukturkomponenten, die keine fachliche Logik besitzen und keine Datenhaltung erzwingen. Fachlogik, Mutationen und Validierungen verbleiben in den Feature-Screens oder in fachnahen Hooks, während die Kompositionskomponenten nur definierte Slots bereitstellen.

Die Vorlagen sollen so geschnitten sein, dass sie in mehreren Screens wiederverwendbar sind, ohne dass diese Screens Layout-Sonderfälle in die Vorlagen hineindrücken müssen. Wenn ein Sonderfall häufiger wird, wird er als Erweiterung des Patterns dokumentiert und als neue, bewusst benannte Variante umgesetzt, statt über ad-hoc Props und Ausnahmen zu wachsen.

Hilfetexte werden systemweit über einen `helpKey` angebunden. Wenn ein `helpKey` gesetzt ist, muss die UI konsistent einen Hilfe-Trigger anzeigen und den Hilfetext über denselben Mechanismus laden und darstellen, wie es die bestehenden List-Layouts bereits tun. Damit ist gewährleistet, dass Hilfetexte zentral gepflegt werden können und das Nutzererlebnis unabhängig vom Screen gleich bleibt.

Neue Kompositionskomponenten werden nur dann eingeführt, wenn sie mindestens zwei echte Wiederholungsfälle vereinheitlichen oder absehbar ein Standardpattern etablieren. Reine „Einmal-Wrapper“ ohne Wiederverwendung sind nicht Teil dieser Schicht.

# FT (18): User Preferences

## FT (18) Ziel / Zweck

Dieses Feature stellt editierbare Einstellungen zu App-Funktionen direkt in der Anwendung bereit. Ziel ist, dass definierte Verhaltensweisen und Parameter ohne Code-Änderungen konfigurierbar sind und die Lösung auch bei wachsender Anzahl und Vielfalt von Einstellungstypen stabil und wartbar bleibt.

## FT (18) Fachliche Beschreibung

Die Anwendung bietet eine zentrale Oberfläche, in der berechtigte Nutzer Einstellungen anzeigen und ändern können. Jede Einstellung ist durch einen eindeutigen Schlüssel identifiziert und besitzt einen fest definierten Datentyp sowie einen Standardwert. Der wirksame Wert ergibt sich aus einem gespeicherten Wert; sofern kein Wert gespeichert ist, gilt der Standardwert.

Die Eingabe und Darstellung in der UI erfolgt generisch anhand des Einstellungstyps. Bool-Einstellungen werden als Schalter bedient, Zahlen als numerische Eingabe und Farben über eine Farbauswahl. Das System ist so gestaltet, dass weitere Typen und neue Einstellungen ergänzt werden können, ohne dass dafür für jede Einstellung eine eigene Persistenzlogik oder ein eigener Screen erforderlich wird.

## FT (18) Regeln & Randbedingungen

Eine Einstellung darf nur gespeichert werden, wenn der Wert zum definierten Typ passt und die fachlich vorgesehenen Constraints erfüllt. Ungültige Eingaben werden abgelehnt und mit einer verständlichen Fehlermeldung zurückgemeldet.

Jede Einstellung besitzt einen Standardwert. Wenn kein Wert gespeichert ist, wird ausschließlich der Standardwert verwendet. Der aktuell wirksame Wert muss in der UI transparent angezeigt werden.

Berechtigungen müssen eindeutig greifen. Normale Nutzer dürfen ausschließlich ihre benutzerspezifischen Einstellungen bearbeiten. Administratoren dürfen zusätzlich Einstellungen bearbeiten, die in einem übergeordneten Kontext gelten, sofern solche Kontexte im Produkt genutzt werden.

Zu Beginn müssen mindestens die Typen Zahl, Bool (Aktivität) und Farbe unterstützt werden. Weitere Typen wie Text, Auswahlwerte (Enum) oder Wertebereiche (Min/Max/Step) sollen später ohne Bruch ergänzt werden können.

## FT (18) Use Cases

### UC 18/01: Persönliche Einstellung ändern

### Akteur

Disponent, Leser, Admin

### Ziel

Eine persönliche Einstellung ändern, sodass diese ausschließlich für den jeweiligen Akteur wirksam ist.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Die persönliche Einstellung ist im System definiert.
- Für den Akteur existiert ein gültiger Benutzerkontext.

### Ablauf

1. Der Akteur öffnet den Bereich für persönliche Einstellungen.
2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur ändert eine oder mehrere Einstellungen.
4. Der Akteur speichert die Änderungen.
5. Das System validiert Datentyp und Wertebereich der geänderten Einstellungen.
6. Das System speichert die Einstellungen persistent und ordnet sie eindeutig dem Akteur zu.
7. Das System bestätigt die erfolgreiche Speicherung.
8. Die geänderte Einstellung wird bei zukünftigen Aktionen des Akteurs angewendet.

### Alternativen

- Ungültiger Wert → Das System lehnt die Speicherung mit Validierungsfehler ab.
- Der Akteur bricht ab → Es erfolgt keine Änderung.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Die geänderte Einstellung ist persistent gespeichert und wirkt ausschließlich für den betreffenden Akteur. Andere Akteure sind nicht betroffen.

### UC 18/02: Persönliche Einstellung auf Standardwert zurücksetzen

### Akteur

Disponent, Leser, Admin

### Ziel

Eine persönliche Einstellung auf den systemseitig definierten Standardwert zurücksetzen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Für die betreffende Einstellung ist ein systemweiter Standardwert definiert.
- Für den Akteur existiert eine gespeicherte individuelle Einstellung.

### Ablauf

1. Der Akteur öffnet den Bereich für persönliche Einstellungen.
2. Das System lädt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur wählt für eine Einstellung die Funktion „Auf Standard zurücksetzen“.
4. Der Akteur bestätigt die Aktion.
5. Das System entfernt oder überschreibt den individuellen Wert des Akteurs.
6. Das System speichert den Standardwert als wirksame Einstellung.
7. Das System bestätigt die erfolgreiche Zurücksetzung.
8. Bei zukünftigen Aktionen wird der Standardwert angewendet.

### Alternativen

- Der Akteur bricht die Zurücksetzung ab → Der individuelle Wert bleibt unverändert.
- Für die Einstellung existiert kein definierter Standardwert → Das System blockiert die Aktion mit einem Fehlerstatus.
- Technischer Fehler → Das System speichert nicht und liefert einen Fehlerstatus zurück.

### Ergebnis

Die persönliche Einstellung entspricht dem systemweit definierten Standardwert und wirkt ausschließlich für den betreffenden Akteur.

### UC 18/03: Unberechtigten Zugriff auf persönliche Einstellungen verhindern

### Akteur

Disponent, Leser, Admin

### Ziel

Sicherstellen, dass ein Akteur ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern kann.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Für mindestens einen weiteren Akteur existieren gespeicherte persönliche Einstellungen.

### Ablauf

1. Der Akteur ruft den Bereich für persönliche Einstellungen auf.
2. Das System ermittelt anhand des Benutzerkontextes die Identität des Akteurs.
3. Das System lädt ausschließlich die dem Akteur zugeordneten Einstellungen.
4. Der Akteur versucht, direkt oder indirekt Einstellungen eines anderen Akteurs abzurufen oder zu ändern.
5. Das System prüft serverseitig die Benutzerzuordnung.
6. Das System verweigert den Zugriff auf fremde Einstellungen und liefert einen Berechtigungsfehler zurück.

### Alternativen

- Der Akteur ruft ausschließlich seine eigenen Einstellungen auf → Das System erlaubt Zugriff.
- Technischer Fehler → Das System liefert einen Fehlerstatus zurück.

### Ergebnis

Ein Akteur kann ausschließlich seine eigenen persönlichen Einstellungen einsehen und ändern. Einstellungen anderer Akteure bleiben geschützt und unverändert.

### UC 18/04: Versionskonflikt bei paralleler Änderung persönlicher Einstellungen

### Akteur

Disponent, Leser, Admin

### Ziel

Sicherstellen, dass parallele Änderungen persönlicher Einstellungen desselben Akteurs nicht zu stillen Überschreibungen führen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Für den Akteur existieren gespeicherte persönliche Einstellungen.
- Die Einstellungen besitzen eine gültige Versionskennung.

### Ablauf

1. Der Akteur öffnet in Browser A den Bereich für persönliche Einstellungen.
2. Das System übermittelt die aktuelle Versionskennung der Einstellungen.
3. Der Akteur öffnet in Browser B ebenfalls den Bereich für persönliche Einstellungen.
4. Browser A speichert eine Änderung der Einstellungen.
5. Das System erhöht die Versionskennung nach erfolgreicher Speicherung.
6. Browser B speichert eine Änderung auf Basis der veralteten Versionskennung.
7. Das System erkennt die veraltete Versionskennung.
8. Das System blockiert die Speicherung mit einem Konfliktstatus.
9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

### Alternativen

- Der Akteur lädt den aktuellen Stand und speichert erneut → Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab → Der zuletzt erfolgreich gespeicherte Stand bleibt unverändert.

### Ergebnis

Es entstehen keine Lost Updates. Die persönlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.

# FT (19): Attachments

## FT (19) Ziel / Zweck

Dieses Feature stellt eine domänenübergreifende Infrastruktur zur Verfügung, um Dateien strukturiert an fachliche Objekte zu binden. Ziel ist es, Upload, Speicherung, Anzeige und Download von Dokumenten einheitlich, sicher und wartbar umzusetzen, ohne die jeweilige Fachdomäne mit technischer Dateilogik zu belasten.

Attachments sind keine fachlichen Kerndaten, sondern ergänzende Dokumente zur Dokumentation, Nachvollziehbarkeit und Kommunikation.

## FT (19) Fachliche Beschreibung

Ein Attachment ist eine Datei, die eindeutig einem Parent-Objekt zugeordnet ist. Ein Attachment kann nie ohne Parent existieren.

Das System unterstützt Attachments aktuell für folgende Domänen:

- Projekt
- Kunde
- Mitarbeiter

Die technische Behandlung ist für alle Domänen identisch. Unterschiede bestehen ausschließlich in der Parent-Zuordnung.

Ein Attachment besitzt Metadaten wie:

- Originaldateiname
- Persistenter Speichername
- MIME-Typ
- Dateigröße
- Erstellungszeitpunkt

Dateien werden serverseitig gespeichert und über einen gesicherten Download-Endpunkt ausgeliefert. Die UI zeigt Attachments als kompakte Liste mit Vorschau- bzw. Download-Funktion.

Das Öffnen eines Attachments kann je nach Dateityp inline (z. B. PDF, Bild) oder als Download erfolgen. Eine explizite Download-Option ist zusätzlich verfügbar.

Eine physische Löschung von Attachments ist systemweit nicht vorgesehen.

## FT (19) Regeln & Randbedingungen

### Allgemeine Struktur

- Ein Attachment gehört immer genau einem Parent-Objekt.
- Ein Attachment kann nie ohne Parent-Zuordnung existieren.
- Für jede unterstützte Domäne existiert eine eigene Attachment-Tabelle.
- Die Tabellen sind strukturgleich aufgebaut.
- Zwischen Parent und Attachment besteht eine referenzielle Integrität (FK).

### Upload

- Upload erfolgt über Multipart-Request.
- Feldname für die Datei ist systemweit einheitlich.
- Es gilt eine definierte maximale Dateigröße.
- Der Originaldateiname wird serverseitig sanitisiert.
- Der persistente Dateiname wird eindeutig generiert.
- Metadaten werden in der jeweiligen Attachment-Tabelle gespeichert.

Ungültige Dateien oder Überschreiten der Größenbegrenzung führen zu einem Fehler und werden nicht gespeichert.

### Speicherung

- Dateien werden serverseitig in einem definierten Upload-Verzeichnis gespeichert.
- Der physische Speicherort wird nicht vom Client bestimmt.
- Der Storage-Pfad wird als Metadatum gespeichert.
- Attachments werden nicht versioniert.

### Download

- Download erfolgt ausschließlich über definierte API-Endpunkte.
- Der Endpunkt liefert:
    - korrekten MIME-Typ
    - passende Content-Disposition
- Für bestimmte Dateitypen (z. B. PDF, Bilder) kann Inline-Anzeige erlaubt sein.
- Über einen expliziten Parameter kann Download erzwungen werden.

Direkter Zugriff auf das Upload-Verzeichnis ist nicht vorgesehen.

### Löschung

- Eine Löschfunktion für Attachments ist systemweit deaktiviert.
- Es existiert kein fachlicher Use Case zur physischen Entfernung von Dateien.
- API-seitig sind Delete-Endpunkte entweder nicht vorhanden oder blockiert.
- Die Entscheidung zur Nicht-Löschung ist bewusst systemweit einheitlich.

### Sicherheit und Verantwortlichkeit

- Die Parent-Existenz wird vor Speicherung eines Attachments geprüft.
- Attachments haben keine eigenständigen Berechtigungen, sondern folgen den Berechtigungen ihres Parents.
- UI-seitige Einschränkungen ersetzen keine serverseitige Prüfung.
- Der Download erfolgt ausschließlich nach erfolgreicher Identifikation des Attachments.

## FT (19) Use Cases

### UC 19/01: Attachment hochladen

**Akteur**

Disponent

**Ziel**

Eine Datei einem bestehenden Parent-Objekt (Projekt, Kunde oder Mitarbeiter) hinzufügen.

**Vorbedingungen**

- Das Parent-Objekt existiert persistent.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Änderungsrechte für das Parent-Objekt.
- Die Detailansicht des Parent-Objekts ist geöffnet.
- Die maximal zulässige Dateigröße ist systemseitig definiert.

**Ablauf**

1. Der Akteur wählt in der Detailansicht des Parent-Objekts die Funktion „Attachment hinzufügen“.
2. Das System öffnet einen Dateiauswahldialog.
3. Der Akteur wählt eine lokale Datei aus.
4. Das System überträgt die Datei per Multipart-Request an den Server.
5. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung des Akteurs,
    - Existenz des Parent-Objekts,
    - Dateigröße,
    - grundlegende Dateieigenschaften.
6. Das System generiert einen eindeutigen persistenten Speichername.
7. Das System speichert die Datei im definierten Upload-Verzeichnis.
8. Das System legt einen Attachment-Datensatz mit Parent-Referenz an.
9. Das System speichert Metadaten (Originaldateiname, persistenter Speichername, MIME-Typ, Dateigröße, Erstellungszeitpunkt).
10. Das System aktualisiert die Attachmentliste in der UI.

**Alternativabläufe**

- Der Akteur bricht den Upload vor Bestätigung ab → Es wird kein Attachment gespeichert.
- Das Parent-Objekt existiert nicht → System antwortet mit 404.
- Der Akteur besitzt keine Änderungsrechte → System blockiert mit 403.
- Die Datei überschreitet das Größenlimit oder ist ungültig → System antwortet mit 400, speichert nichts.
- Technischer Fehler bei Speicherung → System antwortet mit 500, speichert nichts.

**Ergebnis**

- Die Datei ist persistent gespeichert.
- Ein Attachment-Datensatz mit korrekter Parent-Referenz existiert.
- Die Attachmentliste zeigt das neue Attachment konsistent an.

### UC 19/02: Attachmentliste anzeigen

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Alle einem Parent-Objekt zugeordneten Attachments anzeigen.

**Vorbedingungen**

- Das Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

**Ablauf**

1. Der Akteur öffnet die Detailansicht des Parent-Objekts.
2. Das System prüft serverseitig die Leseberechtigung.
3. Das System lädt alle dem Parent-Objekt zugeordneten Attachments.
4. Das System liefert für jedes Attachment mindestens:
    - Originaldateiname,
    - Dateigröße,
    - MIME-Typ,
    - Erstellungszeitpunkt.
5. Das System zeigt die strukturierte Liste in der UI an.

**Alternativabläufe**

- Keine Attachments vorhanden → System zeigt eine leere Liste.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Alle vorhandenen Attachments sind vollständig und konsistent sichtbar.
- Es werden keine Daten verändert.

### UC 19/03: Attachment öffnen (Inline-Anzeige)

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Ein Attachment direkt im Browser anzeigen, sofern der Dateityp Inline-Anzeige unterstützt.

**Vorbedingungen**

- Das Attachment existiert.
- Das zugehörige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

**Ablauf**

1. Der Akteur wählt ein Attachment aus der Liste.
2. Das System prüft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt auf.
4. Das System liefert die Datei mit:
    - korrektem MIME-Typ,
    - Content-Disposition „inline“, sofern Dateityp Inline-Anzeige erlaubt.
5. Der Browser zeigt die Datei an.

**Alternativabläufe**

- Dateityp nicht inlinefähig → System liefert Content-Disposition „attachment“.
- Attachment existiert nicht → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Das Attachment wird inline angezeigt oder als Download behandelt.
- Es werden keine persistenten Daten verändert.

### UC 19/04: Attachment herunterladen

**Akteur**

Disponent, Leser (rollenabhängig)

**Ziel**

Ein Attachment lokal speichern.

**Vorbedingungen**

- Das Attachment existiert.
- Das zugehörige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte für das Parent-Objekt.

**Ablauf**

1. Der Akteur wählt die Download-Funktion für ein Attachment.
2. Das System prüft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt mit Download-Parameter auf.
4. Das System liefert:
    - korrekten MIME-Typ,
    - Content-Disposition „attachment“,
    - den gespeicherten Dateistream.
5. Der Browser startet den Download.

**Alternativabläufe**

- Attachment nicht auffindbar → System antwortet mit 404.
- Akteur ohne Leserechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Die Datei wird lokal gespeichert.
- Es werden keine persistenten Daten verändert.

### UC 19/05: Attachment-Upload validieren (Größe / Typ)

**Akteur**

System

**Ziel**

Sicherstellen, dass ausschließlich zulässige Dateien gespeichert werden.

**Vorbedingungen**

- Eine Datei wurde im Rahmen eines Upload-Vorgangs übermittelt.

**Ablauf**

1. Das System liest die übermittelte Dateigröße.
2. Das System vergleicht die Größe mit dem definierten Maximalwert.
3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).
4. Das System prüft, ob der Dateityp grundsätzlich zulässig ist.
5. Bei gültiger Datei wird der Upload-Prozess fortgesetzt.
6. Bei ungültiger Datei wird der Upload-Prozess abgebrochen.

**Alternativabläufe**

- Datei überschreitet Größenlimit → System antwortet mit 400 und speichert nichts.
- Datei besitzt unzulässigen Typ → System antwortet mit 400 und speichert nichts.
- Technischer Fehler bei Validierung → System antwortet mit 500 und speichert nichts.

**Ergebnis**

- Nur valide Dateien werden persistiert.
- Ungültige Dateien werden vollständig verworfen.
- Es entstehen keine unvollständigen Attachment-Datensätze.

### UC 19/06: Attachment physisch löschen verhindern

**Akteur**

System

**Ziel**

Sicherstellen, dass Attachments systemweit nicht physisch gelöscht werden können.

**Vorbedingungen**

- Ein Attachment-Datensatz existiert.
- Ein Löschversuch wird initiiert (direkt oder indirekt, z. B. über API).

**Ablauf**

1. Das System prüft, ob eine Löschoperation für ein Attachment angefordert wurde.
2. Das System erkennt, dass physische Löschung von Attachments nicht vorgesehen ist.
3. Das System blockiert die Löschoperation.
4. Das System liefert einen definierten Fehlerstatus zurück.

**Alternativabläufe**

- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Der Attachment-Datensatz bleibt unverändert bestehen.
- Die physische Datei bleibt im Upload-Verzeichnis erhalten.
- Es entstehen keine verwaisten Referenzen.

### UC 19/07: Verhalten bei Löschung eines Parent-Objekts

**Akteur**

Administrator, Disponent

**Ziel**

Sicherstellen, dass bei Löschung eines Parent-Objekts keine verwaisten Attachment-Referenzen entstehen.

**Vorbedingungen**

- Ein Parent-Objekt (Projekt, Kunde oder Mitarbeiter) existiert.
- Dem Parent-Objekt sind ein oder mehrere Attachments zugeordnet.
- Der Akteur besitzt Löschrechte für das Parent-Objekt.

**Ablauf**

1. Der Akteur initiiert die Löschung des Parent-Objekts.
2. Das System prüft die Berechtigung des Akteurs.
3. Das System prüft referenzielle Integrität.
4. Das System entfernt den Parent-Datensatz gemäß den Regeln des jeweiligen Features.
5. Das System stellt sicher, dass Attachment-Datensätze nicht ohne Parent-Zuordnung bestehen bleiben.
6. Das System verhindert verwaiste Fremdschlüsselzustände.

**Alternativabläufe**

- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Löschrechte → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Es existieren keine verwaisten Attachment-Referenzen.
- Die physische Löschung der Datei erfolgt weiterhin nicht.
- Die Datenbank bleibt konsistent.

### UC 19/08: Serverseitige Berechtigungsprüfung bei Attachment-Zugriff

**Akteur**

System

**Ziel**

Sicherstellen, dass jeder Zugriff auf ein Attachment ausschließlich auf Basis der Parent-Berechtigungen erfolgt.

**Vorbedingungen**

- Ein Attachment existiert.
- Ein Zugriff (Anzeige oder Download) wird angefordert.

**Ablauf**

1. Das System identifiziert das angeforderte Attachment.
2. Das System ermittelt das zugehörige Parent-Objekt.
3. Das System prüft die Berechtigung des Akteurs für dieses Parent-Objekt.
4. Bei gültiger Berechtigung wird der Zugriff gewährt.
5. Bei fehlender Berechtigung wird der Zugriff verweigert.

**Alternativabläufe**

- Attachment existiert nicht → System antwortet mit 404.
- Parent-Objekt existiert nicht → System antwortet mit 404.
- Akteur ohne Berechtigung → System blockiert mit 403.
- Technischer Fehler → System antwortet mit 500.

**Ergebnis**

- Attachment-Zugriffe sind vollständig an Parent-Berechtigungen gebunden.
- Es existieren keine eigenständigen Attachment-Berechtigungen.
- Direkter Zugriff auf das Upload-Verzeichnis ist nicht möglich.

# FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung

## FT (20) Ziel / Zweck

Dieses Feature definiert die fachliche Bedeutung der Rollen **Admin**, **Disponent(in)** und **Monteur** innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfügbar sind.

Ziel ist es, eine klare Verantwortungsstruktur im System zu etablieren, ohne die bestehende Daten- oder Terminlogik zu verändern. Die Zugriffsbeschränkungen betreffen ausschließlich Sichtbarkeit, Bedienbarkeit und serverseitig durchgesetzte Autorisierung.

Die fachliche Sicherheit bleibt stets serverseitig abgesichert (vgl. FT (14)); FT (20) ergänzt diese Grundlage um UI-seitige Steuerung und klare Nutzungsmodelle.

## FT (20) Fachliche Beschreibung

Jeder Benutzer besitzt genau eine Rolle. Diese Rolle definiert seinen funktionalen Handlungsspielraum im System.

Die Anwendung unterscheidet drei Rollen:

### 1. Admin

Der Admin besitzt systemweite Verantwortung.

Er darf:

- Benutzer verwalten und Rollen ändern
- Systemnahe Stammdaten verwalten
- Gesperrte Termine bearbeiten
- Alle Funktionen der Disposition nutzen

Der Admin ist die höchste Berechtigungsstufe. Es muss stets mindestens ein Admin im System existieren.

### 2. Disponent(in)

Der Disponent ist der operative Hauptnutzer der Anwendung.

Er darf:

- Projekte anlegen, bearbeiten und deaktivieren
- Termine anlegen, verschieben, bearbeiten und löschen
- Mitarbeiter zuweisen
- Touren und Teams verwalten
- Notizen und Anhänge verwalten
- Druckfunktionen nutzen

Der Disponent darf keine Benutzerrollen ändern und keine systemweiten Administrationsfunktionen ausführen.

### 3. Monteur

Der Monteur ist ein rein lesender Nutzer.

Er darf:

- Kalenderansichten anzeigen
- Projekt- und Kundendetails einsehen
- Eigene und fremde Termine einsehen
- Dispositionsübersichten lesen

Der Monteur darf keine Daten verändern, anlegen oder löschen.

Die Oberfläche für Monteure ist funktional reduziert und enthält keine aktiven Bearbeitungselemente.

## Grundprinzipien

1. Sicherheit wird serverseitig durchgesetzt.
2. UI-Sichtbarkeit ist eine Komfortfunktion, keine Sicherheitsmaßnahme.
3. Die fachliche Datenstruktur bleibt unverändert.
4. Es wird keine Rechte-Matrix eingeführt.
5. Rollen wirken ausschließlich auf Funktionsverfügbarkeit, nicht auf Datenmodellierung.

## FT (20) Regeln & Randbedingungen

- Rollen ändern keine Datenmodelle.
- Rollen beeinflussen keine Aggregationslogik.
- Rollen beeinflussen keine Query-Struktur.
- Rollen verändern keine Termin-Lane-Logik.
- Navigation wird nicht umstrukturiert, sondern nur ergänzt oder konditional gerendert.
- Deep-Link-Aufrufe werden serverseitig validiert.
- Es darf keine clientseitige Autorisierungslogik ohne serverseitige Gegenprüfung existieren.
- Ein Monteur sieht alle Termine, jedoch ausschließlich im Lesemodus.
- Der letzte Admin darf nicht entfernt oder herabgestuft werden.

## FT (20) Use Cases

### UC 20/01: Unzulässige Aktion wird blockiert

### Akteur

Admin, Disponent, Monteur

### Ziel

Verhindern, dass ein Akteur eine fachliche Mutation ausführt, für die seine Rolle keine Berechtigung besitzt.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Die angeforderte Aktion erfordert eine bestimmte Rolle.
- Der Akteur besitzt diese Rolle nicht.

### Ablauf

1. Akteur startet eine fachliche Mutation (z. B. Anlegen, Bearbeiten oder Löschen eines Objekts).
2. Das System prüft serverseitig die Rolle des Akteurs.
3. Das System vergleicht die Rolle mit den für die Aktion definierten Berechtigungen.
4. Das System verweigert die Ausführung der Mutation.
5. Das System antwortet mit HTTP-Status 403.

### Alternativen

- Die Aktion wird ausschließlich über die UI angeboten, aber serverseitig ebenfalls geprüft.
- Der Akteur versucht einen Direktaufruf eines Endpunkts → Das System blockiert mit 403.

### Ergebnis

Die Mutation wird nicht durchgeführt.

Es erfolgt keine Datenänderung.

### UC 20/02: Rollenabhängige Navigation anzeigen

### Akteur

Admin, Disponent, Monteur

### Ziel

Die Navigation zeigt ausschließlich die für die Rolle des Akteurs vorgesehenen Bereiche.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Dem Akteur ist genau eine Rolle zugeordnet.

### Ablauf

1. Akteur öffnet die Anwendung.
2. Das System ermittelt serverseitig die Rolle des Akteurs.
3. Das System rendert die Navigation gemäß der Rollendefinition.
4. Nicht zulässige Navigationspunkte werden nicht angezeigt.
5. Bei Direktaufruf eines nicht zulässigen Bereichs prüft das System serverseitig die Berechtigung.
6. Das System blockiert mit 403 bei fehlender Berechtigung.

### Alternativen

- Der Akteur besitzt die höchste Rolle → Alle vorgesehenen Bereiche werden angezeigt.
- Der Akteur besitzt ausschließlich Leserechte → Nur lesende Bereiche werden angezeigt.

### Ergebnis

Die Navigation entspricht der funktionalen Rolle.

Unzulässige Bereiche sind weder sichtbar noch serverseitig zugänglich.

### UC 20/03: Admin verwaltet Benutzerrollen

### Akteur

Admin

### Ziel

Die Rolle eines bestehenden Benutzers ändern.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Der zu ändernde Benutzer existiert.
- Mindestens ein Admin bleibt im System erhalten.

### Ablauf

1. Akteur öffnet die Benutzerverwaltung.
2. Akteur wählt einen Benutzer aus.
3. Akteur wählt eine neue Rolle.
4. Das System prüft, ob durch die Änderung kein letzter Admin entfernt wird.
5. Das System speichert die neue Rolle.
6. Das System macht die neue Rolle unmittelbar wirksam.

### Alternativen

- Der zu ändernde Benutzer existiert nicht → System antwortet mit 404.
- Die Änderung würde den letzten Admin entfernen → System blockiert mit 409.
- Der Akteur besitzt keine Admin-Rolle → System blockiert mit 403.

### Ergebnis

Die neue Rolle ist persistiert.

Die Berechtigungen des betroffenen Benutzers ändern sich entsprechend.

# FT (21): KI-gestützte Dokumentenextraktion

## FT (21) Ziel / Zweck

FT (21) erweitert das System um eine kontextgebundene Dokumentenextraktion zur Unterstützung der Disposition.

Aus einem textbasierten Auftragsdokument (PDF) sollen automatisiert folgende Daten extrahiert werden:

- Kundendaten gemäß bestehendem Kundenschema
- Saunamodell (als Projekttitel-Vorschlag)
- Artikelliste (Menge + Beschreibung, mehrzeilig möglich, ohne Preise)

Die extrahierten Daten werden als editierbarer Vorschlag präsentiert und können in das aktuelle Formular (Neues Projekt oder Neuer Termin) übernommen werden.

Das Feature dient ausschließlich der Arbeitserleichterung.

Es ersetzt keine bestehende Validierungs- oder Sicherheitslogik.

## FT (21) Fachliche Beschreibung

Die Extraktionsfunktion ist ausschließlich in folgenden Kontexten verfügbar:

- Formular **Neues Projekt**
- Formular **Neuer Termin**

Die Disponentin kann ein PDF in einen definierten Extraktionsbereich ziehen.

Das System:

1. Extrahiert den Text aus dem Dokument.
2. Segmentiert strukturelle Bereiche (Kunde, Artikelliste, Auftragsblock).
3. Extrahiert strukturierte Kundendaten.
4. Extrahiert eine Artikelliste.
5. Erkennt das Saunamodell.
6. Kategorisiert die Artikelliste semantisch.
7. Liefert ein validiertes Ergebnis zurück.

### KI-Zusatzfunktion: Kategorisierung

Die extrahierte Artikelliste wird semantisch gruppiert und sortiert.

Beispielhafte Kategorien:

- Saunatyp
- Dachvariante
- Farbe
- Ofen
- Fenster
- Inneneinrichtung
- Zubehör
- Sondermaße
- Einzelteile

Die Kategorisierung darf die ursprünglichen Inhalte nicht verändern.

Bei Unsicherheit bleibt die ursprüngliche Reihenfolge erhalten.

## Präsentation

Nach erfolgreicher Extraktion erscheint ein schwebender Dialog.

### Bereich 1 – Kundendaten

Nachbildung des Kunden-Edit-Formulars mit vorbefüllten Feldern.

Alle Felder sind editierbar.

### Bereich 2 – Projektvorschlag

Titelfeld:

- Vorgefüllt mit erkanntem Saunamodell.

Editorfeld (RTF/HTML-kompatibel):

- Extrahierte, sortierte Artikelliste.
- Darstellung als strukturierte HTML-Auflistung.
- Vollständig editierbar.

## FT (21) Regeln & Randbedingungen

- Die Verarbeitung erfolgt ausschließlich serverseitig.
- Es werden keine Dokumente oder Texte an externe Dienste übertragen.
- Das KI-Modell läuft lokal.
- Dokumenttexte werden nicht persistiert.
- Prompts und Rohtexte werden nicht geloggt.
- Die KI-Ausgabe gilt als nicht vertrauenswürdig und wird vollständig validiert.
- Ungültige oder unvollständige Daten dürfen nicht gespeichert werden.
- Die Speicherung erfolgt nur nach Benutzerbestätigung.
- Rollen- und Berechtigungslogik wird serverseitig geprüft.
- FT (21) verändert das Attachment-Modell aus FT (19) nicht.
- FT (21) verändert keine bestehenden Domänenmodelle.
- Das Feature darf keine impliziten Datenänderungen auslösen.
- Bei strukturell ungeeigneten Dokumenten muss der Prozess sauber abbrechen.

## FT (21) **Use Cases**

### UC 21/01: Dokumentextraktion starten

### Akteur

Disponent, Administrator

### Ziel

Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare Datenvorschläge erzeugen.

### Vorbedingungen

- Ein Attachment existiert und ist einem fachlichen Objekt zugeordnet.
- Das Dokument ist technisch lesbar.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Dokumentextraktion.

### Ablauf

1. Der Akteur wählt ein vorhandenes Attachment aus.
2. Der Akteur startet die Funktion „Dokument extrahieren“.
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.
5. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.
6. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.
7. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.

### Alternativen

- Dokument ist technisch nicht lesbar → Das System bricht ab und zeigt eine Fehlermeldung an.
- Parsing-Regeln liefern keine verwertbaren Daten → Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.
- Validierung schlägt fehl → Das System zeigt einen strukturierten Fehlerstatus an; es werden keine Daten persistiert.

### Ergebnis

Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Stammdaten persistiert.

### UC 21/02: Extrahierte Daten bestätigen

### Akteur

Disponent, Administrator

### Ziel

Einen durch Parsing erzeugten Extraktionsvorschlag prüfen, anpassen und in die entsprechenden Domänenobjekte übernehmen.

### Vorbedingungen

- Ein validierter Extraktionsvorschlag liegt vor.
- Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verändern.

### Ablauf

1. Der Akteur prüft die vorbefüllten Kundendaten.
2. Der Akteur passt bei Bedarf einzelne Felder an.
3. Der Akteur prüft die extrahierte Artikelliste.
4. Der Akteur bestätigt die Übernahme.
5. Das System validiert die Daten gemäß den jeweiligen Domänenregeln.
6. Das System persistiert die Daten transaktional in den betroffenen Domänenobjekten.
7. Das System aktualisiert betroffene Sichten und Auswahlkomponenten.

### Alternativen

- Der Akteur bricht den Vorgang ab → Es erfolgt keine Speicherung; bestehende Daten bleiben unverändert.
- Bei der Persistierung tritt ein Validierungsfehler auf → Das System zeigt eine Fehlermeldung an; es werden keine Teilzustände gespeichert.
- Während der Persistierung tritt ein Versionskonflikt auf → Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.

### Ergebnis

Die bestätigten Daten sind persistent gespeichert und fachlich korrekt den jeweiligen Domänenobjekten zugeordnet.

### UC 21/03: Ungeeignetes Dokument behandeln

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass ungeeignete oder nicht strukturierbare Dokumente nicht zu inkonsistenten Daten führen.

### Vorbedingungen

- Das Dokument enthält keine ausreichend strukturierbaren Daten oder entspricht nicht dem erwarteten Format.
- Der Akteur startet die Dokumentextraktion.

### Ablauf

1. Der Akteur startet die Extraktion.
2. Das System extrahiert den Text.
3. Das System führt die Parsing-Regeln aus.
4. Das System erkennt, dass keine hinreichend verwertbaren strukturierten Daten erzeugt werden können.
5. Das System bricht den Prozess mit einer klaren Fehlermeldung ab.

### Alternativen

- Das Dokument enthält teilweise verwertbare Daten → Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollständige Felder.

### Ergebnis

Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.

### UC 21/04: Kategorisierung schlägt fehl

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass eine fehlgeschlagene regelbasierte Gruppierung von Positionen die Extraktion nicht blockiert.

### Vorbedingungen

- Eine Artikelliste wurde extrahiert.
- Die regelbasierte Gruppierung liefert kein eindeutiges Ergebnis.

### Ablauf

1. Das System versucht, die Artikelliste anhand definierter Regeln zu gruppieren.
2. Das System erkennt, dass keine eindeutige Gruppierung möglich ist.
3. Das System stellt die Artikelliste in der ursprünglichen Reihenfolge dar.
4. Der Akteur kann die Liste weiterhin bearbeiten und übernehmen.

### Alternativen

- Teilweise Gruppierung möglich → Das System gruppiert nur eindeutig identifizierbare Bereiche; übrige Positionen bleiben in Originalreihenfolge.

### Ergebnis

Die Extraktion bleibt nutzbar. Es wird keine Blockade des Prozesses verursacht.

### UC 21/05: Dokumentextraktion im Formular „Neues Projekt“ starten

### Akteur

Disponent, Administrator

### Ziel

Innerhalb des Formulars „Neues Projekt“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

### Vorbedingungen

- Das Formular „Neues Projekt“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Projektanlage.
- Ein PDF-Dokument ist verfügbar.

### Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Formulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

### Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Projektformular bleibt unverändert.

### Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neues Projekt“ zur Verfügung. Es wurden keine Projektdaten gespeichert.

### UC 21/06: Dokumentextraktion im Formular „Neuer Termin“ starten

### Akteur

Disponent, Administrator

### Ziel

Innerhalb des Formulars „Neuer Termin“ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

### Vorbedingungen

- Das Formular „Neuer Termin“ ist geöffnet.
- Der Akteur besitzt die Berechtigung zur Terminanlage.
- Ein PDF-Dokument ist verfügbar.

### Ablauf

1. Der Akteur lädt ein PDF in den definierten Extraktionsbereich des Terminformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemäß UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

### Alternativen

- Das Dokument ist nicht geeignet → Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverändert.

### Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars „Neuer Termin“ zur Verfügung. Es wurden keine Termin- oder Projektdaten gespeichert.

### UC 21/07: Kundendaten übernehmen – Scope Neues Projekt

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Kundendaten im Kontext „Neues Projekt“ übernehmen und einen Kunden korrekt anlegen oder ersetzen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular „Neues Projekt“ ist geöffnet.

### Ablauf

1. Der Akteur wählt die Übernahme der Kundendaten.
2. Wenn kein Kunde ausgewählt ist:
    1. Das System fragt, ob ein neuer Kunde mit den erkannten Daten angelegt werden soll.
    2. Das System führt eine Duplikatsprüfung gemäß Kundenregeln durch.
    3. Das System legt bei Bestätigung einen neuen Kunden an.
    4. Das System verknüpft den neuen Kunden mit dem Projekt.
3. Wenn bereits ein Kunde ausgewählt ist:
    1. Das System warnt, dass der aktuell gewählte Kunde ersetzt wird.
    2. Bei Bestätigung führt das System eine Duplikatsprüfung durch.
    3. Das System legt einen neuen Kunden an.
    4. Das System verknüpft den neuen Kunden mit dem Projekt.

### Alternativen

- Der Akteur bricht ab → Es erfolgt keine Kundenanlage und keine Änderung der Projektzuordnung.
- Duplikatsprüfung schlägt fehl → Das System blockiert die Anlage oder weist auf einen bestehenden Kunden hin.

### Ergebnis

Der Projektentwurf ist mit einem neu angelegten oder bestätigten Kunden verknüpft. Es entstehen keine widersprüchlichen Kundenreferenzen.

### UC 21/08: Kundendaten übernehmen – Scope Neuer Termin

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Kundendaten im Kontext „Neuer Termin“ übernehmen und korrekt mit Termin und ggf. Projekt verknüpfen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Kein Projekt ist im Terminformular ausgewählt.

### Ablauf

1. Der Akteur wählt die Übernahme der Kundendaten.
2. Das System fragt, ob ein neuer Kunde angelegt werden soll.
3. Das System führt eine Duplikatsprüfung gemäß Kundenregeln durch.
4. Das System legt bei Bestätigung einen neuen Kunden an.
5. Das System setzt den neu angelegten Kunden im Terminformular.

### Alternativen

- Der Akteur bricht ab → Keine Kundenanlage, keine Formularänderung.
- Duplikatsprüfung schlägt fehl → Das System blockiert die Anlage oder bietet Auswahl eines bestehenden Kunden an.

### Ergebnis

Der Terminentwurf referenziert einen neu angelegten oder bestätigten Kunden. Es existieren keine verwaisten Referenzen.

### UC 21/09: Projekt übernehmen – Scope Neues Projekt

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Projektinformationen im Kontext „Neues Projekt“ übernehmen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Das Formular „Neues Projekt“ ist geöffnet.

### Ablauf

1. Der Akteur wählt die Übernahme der Projektdaten.
2. Wenn Titel und Beschreibung leer sind:
    1. Das System setzt den Titel auf das erkannte Modell oder den erkannten Projektnamen.
    2. Das System fügt die extrahierte Artikelliste als HTML in das Beschreibungsfeld ein.
3. Wenn Felder bereits befüllt sind:
    1. Das System zeigt einen Warnhinweis vor dem Überschreiben.
    2. Bei Bestätigung ersetzt das System die bestehenden Inhalte.

### Alternativen

- Der Akteur lehnt das Überschreiben ab → Bestehende Inhalte bleiben unverändert.

### Ergebnis

Das Projektformular enthält die übernommenen Projektdaten gemäß Bestätigung des Akteurs.

### UC 21/10: Projekt übernehmen – Scope Neuer Termin

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Projektinformationen im Kontext „Neuer Termin“ übernehmen und ein neues Projekt erzeugen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Kein Projekt ist im Terminformular ausgewählt.

### Ablauf

1. Der Akteur wählt die Übernahme der Projektdaten.
2. Das System legt ein neues Projekt an.
3. Das System setzt den Projekttitel auf das erkannte Modell oder den erkannten Projektnamen.
4. Das System setzt die Projektbeschreibung auf die extrahierte HTML-Artikelliste.
5. Das System verknüpft das neue Projekt mit dem Termin.
6. Das System verknüpft den zugehörigen Kunden mit dem Projekt.
7. Das System speichert alle Änderungen transaktional.

### Alternativen

- Der Akteur bricht vor Bestätigung ab → Kein Projekt wird angelegt; das Terminformular bleibt unverändert.
- Während der Anlage tritt ein Validierungs- oder Versionskonflikt auf → Das System bricht ab; es werden keine Teilzustände gespeichert.

### Ergebnis

Ein neues Projekt ist persistent angelegt und korrekt mit Termin und Kunde verknüpft. Alle Referenzen sind konsistent.

### UC 21/11: Extraktionsvorgang abbrechen

### Akteur

Disponent, Administrator

### Ziel

Einen gestarteten Extraktionsvorgang ohne Persistierung fachlicher Daten kontrolliert abbrechen.

### Vorbedingungen

- Ein Extraktionsdialog mit Vorschlagsdaten ist geöffnet.
- Es wurden noch keine fachlichen Stammdaten gespeichert.

### Ablauf

1. Der Akteur wählt im Extraktionsdialog die Funktion „Abbrechen“.
2. Das System verwirft alle extrahierten, nicht bestätigten Vorschlagsdaten.
3. Das System schließt den Extraktionsdialog.
4. Das System stellt den ursprünglichen Zustand des aufrufenden Formulars wieder her.

### Alternativen

- Der Akteur schließt den Dialog über die Fenstersteuerung → Das System behandelt dies identisch zum aktiven Abbruch.

### Ergebnis

Es wurden keine fachlichen Stammdaten angelegt oder verändert. Das System verbleibt im Zustand vor Beginn der Extraktion.

### UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass extrahierte Kundendaten im Kontext „Neuer Termin“ nicht automatisch einen bestehenden, bereits gesetzten Kunden überschreiben.

### Vorbedingungen

- Das Formular „Neuer Termin“ ist geöffnet.
- Ein Kunde ist bereits im Terminformular ausgewählt.
- Ein Extraktionsvorschlag mit Kundendaten liegt vor.

### Ablauf

1. Der Akteur wählt die Übernahme der extrahierten Kundendaten.
2. Das System erkennt, dass bereits ein Kunde im Terminformular gesetzt ist.
3. Das System zeigt einen eindeutigen Warnhinweis über das Ersetzen der bestehenden Kundenreferenz.
4. Der Akteur bestätigt oder verwirft die Ersetzung.
5. Bei Bestätigung führt das System eine Duplikatsprüfung durch.
6. Das System legt gegebenenfalls einen neuen Kunden an.
7. Das System ersetzt die Kundenreferenz im Terminformular.

### Alternativen

- Der Akteur verwirft die Ersetzung → Die bestehende Kundenreferenz bleibt unverändert.
- Die Duplikatsprüfung ergibt einen bestehenden Kunden → Das System bietet die Auswahl des vorhandenen Kunden an.

### Ergebnis

Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es existieren keine stillen Überschreibungen.

### UC 21/13: Wiederholte Extraktion desselben Dokuments

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass die wiederholte Extraktion desselben Attachments keine inkonsistenten oder doppelten Stammdaten erzeugt.

### Vorbedingungen

- Ein Attachment wurde bereits extrahiert.
- Es wurden noch keine oder bereits bestätigte Daten aus diesem Dokument übernommen.

### Ablauf

1. Der Akteur startet erneut die Funktion „Dokument extrahieren“ für dasselbe Attachment.
2. Das System führt die regelbasierte Parsing-Analyse erneut vollständig aus.
3. Das System erzeugt einen neuen, unabhängigen Extraktionsvorschlag.
4. Der Akteur bestätigt oder verwirft den neuen Vorschlag.
5. Bei Bestätigung führt das System reguläre Duplikats- und Validierungsprüfungen durch.

### Alternativen

- Der Akteur verwirft den neuen Vorschlag → Keine Änderung an bestehenden Daten.
- Duplikatsprüfung verhindert eine doppelte Kunden- oder Projektanlage → Das System blockiert oder verweist auf bestehende Datensätze.

### Ergebnis

Es entstehen keine automatischen Dubletten. Jede Persistierung erfolgt ausschließlich nach expliziter Bestätigung des Akteurs und unter Anwendung der bestehenden Domänenregeln.

### UC 21/14: Extraktion bei zwischenzeitlich gelöschtem Parent-Objekt

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass eine laufende Extraktion nicht zu inkonsistenten Referenzen führt, wenn das aufrufende Objekt zwischenzeitlich gelöscht wurde.

### Vorbedingungen

- Ein Extraktionsdialog ist geöffnet.
- Das zugrunde liegende Projekt- oder Terminformular wurde in einem anderen Browser oder durch einen anderen Akteur gelöscht oder geschlossen.

### Ablauf

1. Der Akteur bestätigt im Extraktionsdialog die Übernahme der Daten.
2. Das System prüft vor Persistierung die Existenz des referenzierten Parent-Objekts.
3. Das System erkennt, dass das Parent-Objekt nicht mehr existiert.
4. Das System bricht den Vorgang ab.
5. Das System informiert den Akteur über den Konflikt.

### Alternativen

- Das Parent-Objekt existiert, aber wurde verändert → Das System prüft Versionsinformationen und behandelt einen Konflikt gemäß den jeweiligen Domänenregeln.

### Ergebnis

Es werden keine Daten mit ungültigen oder nicht existierenden Referenzen gespeichert. Die Systemkonsistenz bleibt gewahrt.

# FT (22): Termin- und Tourvisualisierung in Maps

## FT (22) Ziel / Zweck

Dieses Feature erweitert die bestehende Terminplanung um eine **räumliche Visualisierungsebene**. Ziel ist es, Termine und Touren auf einer Kartenansicht darzustellen, um geografische Zusammenhänge, räumliche Ballungen und Tourverteilungen besser erkennen zu können.

Die Kartenansicht dient ausschließlich der visuellen Orientierung und unterstützt die Disposition bei der räumlichen Einschätzung geplanter Einsätze. Sie verändert keine fachlichen Daten und ersetzt keine bestehende Termin- oder Tourlogik.

FT (22) ist ein reines Darstellungs- und Analysefeature.

## FT (22) Fachliche Beschreibung

Die Kartenansicht stellt Termine als Marker auf einer OpenStreetMap-basierten Karte dar. Grundlage der Positionierung ist die Adresse des dem Termin zugeordneten Kunden.

Die Adresse wird serverseitig zur Laufzeit geokodiert. Die daraus resultierenden Koordinaten werden nicht persistent gespeichert, sondern ausschließlich zur Darstellung verwendet.

Jeder Marker repräsentiert einen Termin im gewählten Zeitraum.

Die Darstellung berücksichtigt bestehende fachliche Beziehungen:

- Termin → Projekt → Kunde → Adresse
- Termin → Tour → Tourfarbe
- Termin → Mitarbeiter

Marker übernehmen die Farbe der zugeordneten Tour. Termine ohne Tour werden in einer neutralen Standardfarbe dargestellt.

Mehrere Termine an derselben Adresse können entweder:

- als überlagerte Marker erscheinen oder
- als visuell zusammengefasster Marker (Cluster) dargestellt werden.

Die Kartenansicht verwendet dieselben Filtermechanismen wie Kalender- und Terminlistenansicht. Es werden ausschließlich die aktuell gefilterten Termine dargestellt.

## FT (22) Regeln & Randbedingungen

- Die Kartenansicht ist rein lesend.
- Über die Kartenansicht können keine Termine erstellt, bearbeitet oder gelöscht werden.
- Es findet keine Routenberechnung statt.
- Es findet keine Entfernungsberechnung statt.
- Es findet keine Optimierung oder Bewertung von Touren statt.
- Geokodierung erfolgt ausschließlich serverseitig.
- Dokumenttexte oder Kundendaten werden nicht persistent verändert.
- Fehlgeschlagene Geokodierung führt nicht zu Datenverlust.
- Termine ohne erfolgreich ermittelbare Koordinaten werden nicht angezeigt oder klar als nicht lokalisierbar gekennzeichnet.

Die Kartenansicht verändert keine bestehenden Features:

- FT (01) Terminverwaltung bleibt unverändert.
- FT (02) Projekte bleiben unverändert.
- FT (04) Tourenplanung bleibt unverändert.
- FT (03) Kalenderansichten bleiben unverändert.

## FT (22) Darstellung

### Marker

Jeder Termin wird als Marker dargestellt.

Der Marker zeigt im Tooltip oder Popup mindestens:

- Kundennummer
- Kundenname
- Postleitzahl
- Projekttitel
- Terminzeitraum
- Zugeordnete Tour
- Zugeordnete Mitarbeiter

Die Markerfarbe entspricht der Tourfarbe.

Tourlose Termine werden neutral dargestellt.

### Kartensteuerung

Die Karte ist:

- verschiebbar
- zoombar
- frei navigierbar

Die initiale Ansicht orientiert sich:

- an der geografischen Mitte der angezeigten Termine oder
- an einem vordefinierten Standardbereich.

## FT (22) Use Cases

### UC 22/01: Kartenansicht anzeigen

### Akteur:

Disponent, Admin, Monteur (Leserolle)

### Ziel:

Termine im gewählten Zeitraum räumlich visualisieren.

**Vorbedingungen:**

- Termine existieren.
- Kunden besitzen gültige Adressen.
- Benutzer besitzt Leserechte.

### Ablauf:

1. Benutzer öffnet die Kartenansicht.
2. System ermittelt die aktuell gefilterten Termine.
3. System extrahiert die zugehörigen Kundenadressen.
4. System führt serverseitig eine Geokodierung durch.
5. System rendert Marker auf der Karte.
6. Benutzer kann Marker anklicken, um Details einzusehen.

### Alternativen:

- Adresse nicht geokodierbar → Marker wird nicht angezeigt oder als „nicht lokalisierbar“ markiert.
- Keine Termine vorhanden → Karte wird ohne Marker angezeigt.

### Ergebnis:

Die ausgewählten Termine sind räumlich visualisiert.

### UC 22/02: Kartenansicht nach Tour filtern

**Akteur:**

Disponent

### Ziel:

Nur Termine einer bestimmten Tour räumlich anzeigen.

**Vorbedingungen:**

- Touren existieren.
- Termine sind Touren zugeordnet.

### Ablauf:

1. Benutzer wählt Tourfilter.
2. System filtert Termine.
3. System aktualisiert Marker-Darstellung.

### Ergebnis:

Nur Termine der gewählten Tour sind sichtbar.

### UC 22/03: Marker-Details anzeigen

**Akteur:**

Disponent, Admin, Monteur

### Ziel:

Detailinformationen zu einem Termin auf der Karte anzeigen.

**Vorbedingungen:**

- Marker existiert.

### Ablauf:

1. Benutzer klickt Marker.
2. System zeigt Popup mit Termindetails.

### Ergebnis:

Benutzer erhält vollständige Terminübersicht im Kartenkontext.