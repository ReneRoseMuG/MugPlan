# Kapitel (02): Features (Zsf)

# FT (01): **Kalendertermine verwalten**

## FT (01) Ziel / Zweck

Dieses Feature bildet die **zentrale fachliche Grundlage der Terminplanung**.

Es ermÃ¶glicht der Disposition, Termine als zeitliche Planungseinheiten **anzulegen, zu Ã¤ndern, zu verschieben, zuzuweisen und zu Ã¼berwachen**, immer im Kontext eines Projekts.

FT (01) ist die **fachliche Quelle der Wahrheit fÃ¼r alle Termindaten**. Alle weiteren Features, die Termine anzeigen, auswerten, Ã¼berwachen oder ausgeben, leiten ihre Informationen **ausschlieÃŸlich** aus den hier verwalteten Terminen ab.

## FT (01) Fachliche Beschreibung

Ein Termin ist eine **zeitliche Planungseinheit** mit einem Startzeitpunkt und einem optionalen Endzeitpunkt. Jeder Termin gehÃ¶rt **immer genau zu einem Projekt**. Ãœber das Projekt ist der Termin **indirekt** einem Kunden zugeordnet. Die Projekt-Termin-Beziehung ist die fachlich relevante und stabile Zuordnung.

Termine sind Mitarbeitern zugeordnet. Die Zuordnungen entstehen automatisch, durch Zuweisung von Mitarbeitern Ã¼ber eine Tour, ein Team oder individuell. Gespeichert wird am Termin jedoch stets die konkrete Mitarbeiterliste, nicht die Vorlage.

Zeitangaben werden technisch als echte Zeitpunkte gefÃ¼hrt, damit spÃ¤tere Anforderungen an â€žechte Uhrzeitenâ€œ ohne erneute Modellmigration mÃ¶glich sind. In der UI bleiben Uhrzeiten zunÃ¤chst optional, weil der aktuelle Arbeitsmodus weiterhin primÃ¤r tagesbasiert ist.

Ein Termin kann:

- unabhÃ¤ngig von einer Tour existieren,
- null, einen oder mehrere Mitarbeiter zugewiesen bekommen,
- Ã¼ber Teams mit Mitarbeitern belegt werden,
- Ã¼ber die Tourzuweisung mit Mitarbeitern belegt werden,
- Mitarbeiter kÃ¶nnen nur einmal im Termin existieren, keine Dupletten durch Team- oder Tourzuweisung,
- Mitarbeiter dÃ¼rfen nur zugewiesen werden, wenn sich dadurch keine Ãœberschneidungen mit anderen Terminen des Mitarbeiters ergeben,
- in verschiedenen Kalender- und Ãœbersichtsansichten dargestellt werden,
- ohne Uhrzeit als Ganztagstermin gelten,
- optional eine Startuhrzeit besitzen, um einen Termin innerhalb eines Tages zeitlich zu verorten.

Termine kÃ¶nnen auf zwei fachlich gleichwertige Arten entstehen:

- durch Anlegen eines Termins **innerhalb eines Projekts**, oder
- durch Anlegen eines Termins **im Kalender** mit anschlieÃŸender Projektzuweisung.

UnabhÃ¤ngig vom Einstiegspunkt gilt:

**Ein Termin ist erst fachlich gÃ¼ltig, wenn ihm ein Projekt zugeordnet ist.**

## FT (01) Regeln & Randbedingungen

**Grundlegende Terminregeln**

- Ein Termin gehÃ¶rt **immer genau zu einem Projekt**.
- Ein Projekt kann **null, einen oder mehrere Termine** besitzen.
- Termine ohne Projektzuordnung sind **nicht zulÃ¤ssig**.
- Termine enthalten **keine eigenen Kunden- oder Projektdatenkopien**.
- Kunden- und Projektinformationen werden stets **referenziert**, nicht gespeichert.

**Zeitliche Regeln**

- Ein Termin besitzt ein Startdatum und optional ein Enddatum.
- MehrtÃ¤gige Termine gelten fÃ¼r **alle Tage ihres Zeitraums**.
- Vergangene Termine sind **read-only** und dÃ¼rfen nicht verÃ¤ndert werden.
- Ein Termin besitzt intern einen Startzeitpunkt und einen Endzeitpunkt.
- Wird keine Uhrzeit erfasst, gilt der Termin als Ganztagstermin.
- Wird eine Startuhrzeit erfasst, wird der Termin als Zeittermin behandelt.
- Wird eine Startuhrzeit erfasst, leitet das System initial eine Standarddauer von einer Stunde ab.

**Mitarbeiterzuweisung**

- Einem Termin kÃ¶nnen **null, ein oder mehrere Mitarbeiter** zugewiesen werden.
- **Harte Regel (blockierend):**
    
    Ein Mitarbeiter darf im Zeitraum eines Termins **nicht zeitlich Ã¼berschneidend** mehreren Terminen zugewiesen sein.
    
- Wird ein Mitarbeiter vor DurchfÃ¼hrung eines Termins ersetzt, darf der Termin **nicht mehr** in der Historie des abgelÃ¶sten Mitarbeiters erscheinen.

**Zuweisung einer Tour**

- Der Termin Ã¼bernimmt die Mitarbeiter, die der Tour zugeordnet sind
- Ein Termin ohne Tour wird in einer **Standardfarbe** dargestellt.
- Touren dienen der organisatorischen Gruppierung und visuellen Orientierung.
- Das Wechseln der Tour entfernt die Mitarbeiter der vorherigen Tour vom Termin und fÃ¼gt die der neuen Tour an
- Das Entfernen der Tour entfernt die Mitarbeiter der Tour vom Termin

**Zuweisung eines Team**

- Team sind **reine Eingabehilfen**.
- Gespeichert wird am Termin **immer die konkrete Mitarbeiterliste**, niemals die Vorlage.
- Ã„nderungen an Teams wirken **nicht rÃ¼ckwirkend**.
- Der Termin Ã¼bernimmt die Mitarbeiter des Teams

## **FT (01) Use Cases**

### UC 01/01: Termin anlegen

### **Akteur**

Disponent, Administrator

### **Ziel**

FÃ¼r ein bestehendes Projekt einen neuen Termin im Kalender anlegen. Der Use Case unterstÃ¼tzt beide Wege der Terminanlage, nÃ¤mlich das Anlegen aus einem Projekt heraus und das Anlegen aus dem Kalender heraus.

### **Vorbedingungen**

- Projekt existiert.
- Kunde existiert.
- Kunde ist dem Projekt zugeordnet.
- Team existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur editiert ein vorhandenes Projekt und klickt in der Terminliste rechts auf â€ž+â€œ (Termin anlegen). Das System Ã¶ffnet das Terminformular, verknÃ¼pft den Termin mit dem Projekt und ermittelt den Kunden indirekt Ã¼ber das Projekt.
    1. Das System setzt das Startdatum auf den aktuellen Tag.
2. Der Akteur klickt im Kalender auf einen â€ž+â€œ-Button (Termin anlegen). Das System Ã¶ffnet das Terminformular.
    1. Das System setzt das Startdatum auf den angeklickten Tag.
    2. Der angeklickte â€ž+â€œ-Button gehÃ¶rte zu einer Tour-Lane.
        1. Das System verknÃ¼pft den Termin mit dieser Tour und befÃ¼llt die Mitarbeiterliste des Termins mit den Mitarbeitern der Tour.
3. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
4. Der Akteur weist dem Termin optional eine Tour zu, falls noch keine Tour verknÃ¼pft ist.
5. Der Akteur weist dem Termin optional ein Team zu.
6. Der Akteur weist dem Termin optional Mitarbeiter manuell zu.
7. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
8. Das System speichert den Termin und zeigt ihn im Kalender an.

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an.
- Abbruch: Der Termin wird nicht gespeichert.
    - Es wird kein neuer Termin-Datensatz in der Datenbank angelegt.
    - Es werden keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter angelegt, auch dann nicht, wenn zwischenzeitlich Mitarbeiter im Formular ausgewÃ¤hlt wurden.
- Speichern ohne Projektzuordnung: Der Akteur versucht zu speichern, ohne dass ein Projekt zugeordnet ist. Das System blockiert den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: â€žProjekt erforderlich â€“ Termin kann nicht ohne Projektkontext gespeichert werden.â€œ

### **Ergebnis**

Der Termin ist einem Projekt zugeordnet und im Kalender sichtbar, entweder mit Tourfarbe oder mit Standardfarbe. Der Termin ist fachlich gÃ¼ltig und zeigt neben der Projektzuordnung auch den zum Projekt gehÃ¶renden Kunden (indirekt ermittelt Ã¼ber das Projekt). Die Mitarbeiterzuordnungen des Termins sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar.

FÃ¼r alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Das Projektformular zeigt den Termin in der Projekt-Terminliste. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, der Ã¼ber das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste.

### UC 01/02: Termin bearbeiten

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin Ã¤ndern, ohne fachliche Inkonsistenzen zu erzeugen. Der Use Case umfasst Ã„nderungen an Zeitraum und Uhrzeit, Ã„nderungen der Projektzuordnung, Ã„nderungen der Tourzuordnung, das Ãœbernehmen von Mitarbeitern Ã¼ber Tour oder Team als EinfÃ¼gehilfe sowie manuelle Mitarbeiterzuweisungen und -entfernungen.

### **Vorbedingungen**

- Der Termin existiert.
- Das zugehÃ¶rige Projekt existiert.
- Der zum Projekt gehÃ¶rende Kunde existiert und ist dem Projekt zugeordnet.
- Optional: Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Der Akteur editiert Startdatum und optional Enddatum sowie optional eine Startuhrzeit.
3. Der Akteur Ã¤ndert optional die Projektzuordnung des Termins.
    1. Das System aktualisiert die indirekt ermittelte Kundenzuordnung entsprechend dem neu gewÃ¤hlten Projekt, weil der Kunde ausschlieÃŸlich Ã¼ber das Projekt bestimmt wird und keine direkte Kundeâ€“Termin-Beziehung existiert.
4. Der Akteur weist dem Termin optional eine Tour zu oder Ã¤ndert eine bereits verknÃ¼pfte Tour.
    1. Wenn eine Tour neu zugewiesen wird, verknÃ¼pft das System die Tour und Ã¼bernimmt die Tour-Mitarbeiter in die Mitarbeiterliste des Termins.
    2. Wenn die Tour gewechselt wird, mÃ¼ssen die Mitarbeiterzuordnungen so aktualisiert werden, dass die Tour-Mitarbeiter der neuen Tour Ã¼bernommen werden und die Tour-bedingten Zuordnungen der alten Tour nicht bestehen bleiben. Die ursprÃ¼ngliche Mitarbeiterliste wird zuvor geleert.
5. Der Akteur entfernt optional eine Tourzuordnung.
    1. Das System lÃ¶st die TourverknÃ¼pfung am Termin. Die Mitarbeiter, welche der Tour zugewiesen sind, bleiben am Termin hÃ¤ngen und werden ausdrÃ¼cklich nicht entfernt.
6. Der Akteur verwendet optional ein Team als EinfÃ¼gehilfe.
    1. Das System Ã¼bernimmt die Team-Mitarbeiter in die Mitarbeiterliste des Termins zusÃ¤tzlich zu bereits vorhandenen Mitarbeitern.
    2. Das System speichert keine Teamzuordnung am Termin, sondern ausschlieÃŸlich die konkrete Mitarbeiterliste.
7. Der Akteur weist optional weitere Mitarbeiter manuell zu oder entfernt einzelne Mitarbeiter manuell.
8. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt.
9. Das System speichert die Ã„nderungen am Termin und aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert das Speichern und zeigt einen Konflikt an, der den betroffenen Mitarbeiter und den kollidierenden Zeitraum verstÃ¤ndlich benennt.
- Abbruch: Der Akteur bricht die Bearbeitung ab. Das System speichert keine Ã„nderungen am Termin und es entstehen keine TeilÃ¤nderungen, also insbesondere keine neuen oder gelÃ¶schten EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- Speichern ohne Projektzuordnung: Falls der Akteur versucht zu speichern, ohne dass ein Projekt zugeordnet ist, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an, zum Beispiel: â€žProjekt erforderlich â€“ Termin kann nicht ohne Projektkontext gespeichert werden.â€œ
- Tourwechsel oder Tourentfernung in Konflikt: Falls die durch TourÃ¼bernahme entstehenden Mitarbeiterzuordnungen zu Ãœberschneidungen fÃ¼hren, blockiert das System den Vorgang vollstÃ¤ndig, sodass weder die TourverknÃ¼pfung noch die Mitarbeiterliste teilweise gespeichert wird.

### **Ergebnis**

Der Termin ist mit den geÃ¤nderten Daten gespeichert und weiterhin einem Projekt zugeordnet. Der Kunde ist weiterhin ausschlieÃŸlich indirekt Ã¼ber das Projekt bestimmt. Die Mitarbeiterzuordnungen sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter konsistent abrufbar, ohne Duplikate und ohne TeilzustÃ¤nde.

Die aktualisierten Termindaten sind in allen konsumierenden Sichten konsistent sichtbar. Das bedeutet, dass das Mitarbeiterformular den Termin in der Mitarbeiter-Terminliste fÃ¼r alle zugeordneten Mitarbeiter korrekt anzeigt, das Projektformular den Termin in der Projekt-Terminliste anzeigt und das Kundenformular den Termin in der Terminliste des Kunden anzeigt, der Ã¼ber das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, verschwindet der Termin entsprechend aus dieser Tour-Sicht.

### UC 01/03: Termin verschieben

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin auf ein anderes Datum verschieben, ohne die Uhrzeit unbeabsichtigt zu verÃ¤ndern und ohne fachliche Inkonsistenzen oder MitarbeiterÃ¼berschneidungen zu erzeugen. Der Use Case umfasst sowohl das Verschieben Ã¼ber das Terminformular als auch das Verschieben per Drag-and-drop im Kalender.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Die zugehÃ¶rigen Mitarbeiterzuordnungen sind vorhanden oder der Termin hat keine zugeordneten Mitarbeiter.
- Optional: Der Termin ist einer Tour zugeordnet.

### **Ablauf**

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

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert das Verschieben und zeigt einen Konflikt an. Der Termin bleibt unverÃ¤ndert auf dem ursprÃ¼nglichen Datum, und es entstehen keine TeilÃ¤nderungen an Termin oder Join-EintrÃ¤gen.
- Abbruch: Der Akteur bricht den Vorgang ab. Der Termin bleibt unverÃ¤ndert.
- Historischer Zeitraum: Wenn das Verschieben dazu fÃ¼hren wÃ¼rde, dass der Termin in einen nicht zulÃ¤ssigen historischen Zeitraum fÃ¤llt, blockiert das System den Vorgang und zeigt eine eindeutige Fehlermeldung an. Es wird nichts gespeichert.

### **Ergebnis**

Der Termin ist auf das neue Datum beziehungsweise den neuen Zeitraum verschoben und bleibt weiterhin einem Projekt zugeordnet. Die Uhrzeit ist nach einem mausgesteuerten Verschieben unverÃ¤ndert geblieben. Alle Mitarbeiterzuordnungen bleiben konsistent als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter erhalten, sofern das Verschieben erfolgreich war.

Der Termin erscheint in der neuen Tages- beziehungsweise Wochen-Sicht und ist in der alten Sicht nicht mehr vorhanden. FÃ¼r alle zugeordneten Mitarbeiter ist der Termin in der Mitarbeiter-Terminliste sichtbar, und wenn der Termin einer Tour zugeordnet ist, ist er auch in der Tour-Terminliste sichtbar.

### UC 01/04: Termin lÃ¶schen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin vollstÃ¤ndig lÃ¶schen, sodass keine fachlichen RestzustÃ¤nde bestehen bleiben. Insbesondere dÃ¼rfen nach dem LÃ¶schen keine Mitarbeiterzuordnungen mehr existieren, und der Termin darf in keiner Sicht (Kalender, Projekt, Mitarbeiter, Tour, Kunde) mehr erscheinen.

### **Vorbedingungen**

- Der Termin existiert und liegt nicht in der Vergangenheit.
- Der Termin ist einem Projekt zugeordnet.
- Optional: Dem Termin sind Mitarbeiter manuell zugeordnet oder Ã¼ber Tour/Team Ã¼bernommen.
- Optional: Der Termin ist einer Tour zugeordnet.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular oder startet das LÃ¶schen aus einer Terminliste.
2. Der Akteur lÃ¶st die LÃ¶schaktion aus und bestÃ¤tigt diese, sofern eine BestÃ¤tigung vorgesehen ist.
3. Das System lÃ¶scht den Termin in der Datenbank.
4. Das System entfernt alle zugehÃ¶rigen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter, sodass keine Mitarbeiterzuordnungen bestehen bleiben.
5. Das System aktualisiert alle Sichten, die Termine anzeigen, insbesondere Kalender- und Listenansichten sowie Detailansichten zu Projekt, Mitarbeiter, Tour und Kunde.

### **Alternativen**

- Abbruch: Der Akteur bricht den LÃ¶schvorgang ab. Der Termin bleibt unverÃ¤ndert bestehen, und es werden keine Daten gelÃ¶scht.
- Konflikt beim LÃ¶schen: Falls das System das LÃ¶schen blockiert, muss es eine eindeutige Fehlermeldung anzeigen und sicherstellen, dass weder der Termin noch Join-EintrÃ¤ge teilweise entfernt wurden.
- Das System blockiert bzw. verhindert das LÃ¶schen historischer Termine effektiv. Unter anderem zeigen die Kalendersichten keine + Buttons vor dem aktuellen Tag.

### **Ergebnis**

Der Termin ist vollstÃ¤ndig gelÃ¶scht. Es existiert kein Termin-Datensatz mehr in der Datenbank, und es existieren keine EintrÃ¤ge mehr in der Join-Tabelle Terminâ€“Mitarbeiter fÃ¼r diesen Termin.

Der Termin ist in keiner Sicht mehr auffindbar. Das bedeutet, dass er weder im Kalender noch in der Projekt-Terminliste, noch in der Mitarbeiter-Terminliste, noch in einer Tour-Terminliste, noch in einer kundenbezogenen Terminliste erscheint.

### UC 01/05: Tour einem Termin zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einen bestehenden Termin einer Tour zuweisen, sodass der Termin mit der Tour verknÃ¼pft wird, die Tourfarbe fÃ¼r die Darstellung genutzt werden kann und die Mitarbeiterliste des Termins vollstÃ¤ndig aus den Tour-Mitarbeitern besteht. Beim Setzen oder Wechseln der Tour werden zuvor vorhandene Mitarbeiterzuordnungen entfernt, sofern dadurch keine MitarbeiterÃ¼berschneidungen entstehen.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Die Tour existiert und hat mindestens einen zugeordneten Mitarbeiter.
- Optional: Der Termin hat bereits manuell zugeordnete Mitarbeiter oder bereits eine Tourzuordnung.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur weist dem Termin eine Tour zu oder Ã¤ndert eine bereits verknÃ¼pfte Tour.
3. Das System verknÃ¼pft den Termin mit der ausgewÃ¤hlten Tour.
4. Das System ersetzt die komplette Mitarbeiterliste des Termins durch die Mitarbeiter der ausgewÃ¤hlten Tour.
    1. Alle zuvor am Termin zugeordneten Mitarbeiter werden entfernt.
    2. AnschlieÃŸend werden die Tour-Mitarbeiter als einzige Termin-Mitarbeiter gesetzt.
5. Das System fÃ¼hrt die ÃœberschneidungsprÃ¼fung fÃ¼r alle dem Termin zugeordneten Mitarbeiter durch, also fÃ¼r die Tour-Mitarbeiter.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei der Ã„nderung der Termin-Mitarbeiterliste ausgefÃ¼hrt, also insbesondere beim Ersetzen der Mitarbeiterliste durch die Tour.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in den relevanten Sichten.
    1. Der Termin wird im Kalender mit der Tourfarbe dargestellt, sofern Tourfarben fÃ¼r die Kalenderdarstellung verwendet werden.
    2. Der Termin ist in der Tour-Sicht auffindbar, sofern diese eine Terminliste anbietet.
    3. Der Termin ist in der Mitarbeiter-Sicht auffindbar, und zwar genau fÃ¼r die Tour-Mitarbeiter, die nun dem Termin zugeordnet sind.

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Weder die TourverknÃ¼pfung noch das Entfernen und Neusetzen der Mitarbeiterzuordnungen werden gespeichert, und es entstehen keine TeilzustÃ¤nde in Termin oder Join-Tabelle.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.

### **Ergebnis**

Der Termin ist mit der Tour verknÃ¼pft. Die Mitarbeiterliste des Termins besteht ausschlieÃŸlich aus den Mitarbeitern der Tour, und alle zuvor vorhandenen Mitarbeiterzuordnungen wurden entfernt. Die Mitarbeiterzuordnungen sind als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter konsistent abrufbar.

Der Termin ist im Kalender sichtbar und wird je nach Darstellungsregel mit Tourfarbe oder Standardfarbe angezeigt. Der Termin ist in der Tour-Terminliste sichtbar, sofern eine Tour-Terminliste existiert, und er ist in den Mitarbeiter-Terminlisten aller Tour-Mitarbeiter sichtbar, wÃ¤hrend er bei zuvor entfernten Mitarbeitern nicht mehr erscheint.

### UC 01/06: Tourzuweisung eines Termins entfernen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tourzuweisung von einem Termin entfernen, sodass der Termin anschlieÃŸend keiner Tour mehr zugeordnet ist. Beim Entfernen der Tourzuweisung bleiben die bereits am Termin zugeordneten Mitarbeiter unverÃ¤ndert bestehen.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Der Termin ist aktuell einer Tour zugeordnet.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur entfernt die Tourzuweisung.
3. Das System lÃ¶st die TourverknÃ¼pfung des Termins.
4. Das System verÃ¤ndert die Mitarbeiterliste des Termins nicht. Alle aktuell zugeordneten Mitarbeiter bleiben weiterhin dem Termin zugeordnet.
5. Das System speichert den Termin.
6. Das System aktualisiert die Darstellung in allen relevanten Sichten, insbesondere Kalender- und Listenansichten sowie Tour- und Mitarbeiter-Sichten.

### **Alternativen**

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Konflikt beim Speichern: Falls das Speichern fehlschlÃ¤gt, muss das System sicherstellen, dass weder die TourverknÃ¼pfung noch andere Daten teilweise gespeichert wurden, und eine eindeutige Fehlermeldung anzeigen.

### **Ergebnis**

Der Termin ist keiner Tour mehr zugeordnet und wird im Kalender nach den Regeln fÃ¼r Termine ohne Tour dargestellt, insbesondere nicht mehr mit Tourfarbe.

Die Mitarbeiterzuordnungen des Termins bleiben unverÃ¤ndert und sind weiterhin konsistent als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar. Der Termin ist in der Tour-Terminliste nicht mehr sichtbar. In Mitarbeiter-Terminlisten bleibt der Termin fÃ¼r alle zugeordneten Mitarbeiter sichtbar.

### UC 01/07: Mitarbeiter Ã¼ber Team zuweisen

### **Ziel**

Mehrere Mitarbeiter in einem Schritt einem Termin zuweisen, indem ein Team als EinfÃ¼gehilfe verwendet wird. Das Team selbst wird dabei nicht am Termin gespeichert, sondern nur die daraus resultierende konkrete Mitarbeiterliste des Termins.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Das Team existiert und hat mindestens einen zugeordneten Mitarbeiter.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur wÃ¤hlt ein Team als EinfÃ¼gehilfe aus.
3. Das System Ã¼bernimmt die Mitarbeiter des Teams in die Mitarbeiterliste des Termins.
4. Das System speichert keine Teamzuordnung am Termin, sondern ausschlieÃŸlich die konkrete Mitarbeiterliste.
5. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt, also auch durch die Team-Ãœbernahme.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Es werden keine Ã„nderungen gespeichert und es entstehen keine TeilzustÃ¤nde, insbesondere keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Team ohne Mitarbeiter: Falls das gewÃ¤hlte Team keine Mitarbeiter enthÃ¤lt, muss das System den Vorgang blockieren und eine eindeutige Fehlermeldung anzeigen.

### **Ergebnis**

Die Mitarbeiter des ausgewÃ¤hlten Teams sind dem Termin zugeordnet und als EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar. Am Termin ist keine Teamzuordnung gespeichert, sondern ausschlieÃŸlich die daraus resultierende Mitarbeiterliste.

FÃ¼r alle dem Termin zugeordneten Mitarbeiter zeigt das Mitarbeiterformular diesen Termin in der Mitarbeiter-Terminliste. Der Termin erscheint in den projektbezogenen Terminsichten und, sofern vorhanden, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

### UC 01/08: Mitarbeiter einem Termin zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Einem bestehenden Termin einen einzelnen Mitarbeiter manuell zuweisen, sodass der Mitarbeiter im Termin als zugeordnet erscheint, die Join-Tabelle konsistent aktualisiert wird und der Termin in allen relevanten Sichten fÃ¼r diesen Mitarbeiter sichtbar ist, sofern keine Ãœberschneidung entsteht.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Der Mitarbeiter existiert.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur klickt im Bereich â€žZugeordnete Mitarbeiterâ€œ auf â€ž+â€œ (Mitarbeiter hinzufÃ¼gen) oder nutzt die entsprechende Auswahlfunktion.
3. Der Akteur wÃ¤hlt einen Mitarbeiter aus.
4. Das System fÃ¼gt den Mitarbeiter der Mitarbeiterliste des Termins hinzu.
5. Das System prÃ¼ft Mitarbeiter-Ãœberschneidungen im Zeitraum.
    1. Mitarbeiter dÃ¼rfen keine Ã¼berschneidenden Termine haben.
    2. Die ÃœberschneidungsprÃ¼fung erfolgt tagesbasiert fÃ¼r alle zugeordneten Mitarbeiter und fÃ¼r alle Tage, die der Termin umfasst.
    3. Die ÃœberschneidungsprÃ¼fung wird bei jeder Ã„nderung der Termin-Mitarbeiterliste erneut ausgefÃ¼hrt, also auch durch das manuelle HinzufÃ¼gen.
6. Das System speichert den Termin.
7. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Ãœberschneidung erkannt: Das System blockiert den Vorgang und zeigt einen Konflikt an. Der Mitarbeiter wird nicht zugeordnet, es werden keine Ã„nderungen gespeichert und es entstehen keine TeilzustÃ¤nde, insbesondere keine neuen EintrÃ¤ge in der Join-Tabelle Terminâ€“Mitarbeiter.
- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Mitarbeiter bereits zugeordnet: Wenn der ausgewÃ¤hlte Mitarbeiter bereits dem Termin zugeordnet ist, darf das System keinen Duplikat-Eintrag erzeugen und muss entweder die Auswahl verhindern oder eine eindeutige Meldung anzeigen.

### **Ergebnis**

Der Mitarbeiter ist dem Termin zugeordnet und erscheint im Termin in der Liste der zugeordneten Mitarbeiter. Die Zuordnung ist als Eintrag in der Join-Tabelle Terminâ€“Mitarbeiter abrufbar, ohne Duplikate.

Der Termin ist fÃ¼r diesen Mitarbeiter in der Mitarbeiter-Terminliste sichtbar. Der Termin ist auÃŸerdem weiterhin in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

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

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur entfernt im Bereich â€žZugeordnete Mitarbeiterâ€œ einen konkreten Mitarbeiter, zum Beispiel Ã¼ber eine Entfernen-Aktion am Listeneintrag.
3. Das System entfernt den Mitarbeiter aus der Mitarbeiterliste des Termins.
4. Das System speichert den Termin.
5. Das System aktualisiert die Darstellung in allen relevanten Sichten.

### **Alternativen**

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Mitarbeiter nicht (mehr) zugeordnet: Wenn der Mitarbeiter zum Zeitpunkt des Speicherns nicht mehr zugeordnet ist, muss das System sicherstellen, dass kein Fehler durch inkonsistente ZwischenzustÃ¤nde entsteht, und der Termin bleibt konsistent gespeichert.

### **Ergebnis**

Der Mitarbeiter ist dem Termin nicht mehr zugeordnet und erscheint im Termin nicht mehr in der Liste der zugeordneten Mitarbeiter. Die entsprechende Zuordnung ist in der Join-Tabelle Terminâ€“Mitarbeiter entfernt.

Der Termin ist fÃ¼r diesen Mitarbeiter nicht mehr in der Mitarbeiter-Terminliste sichtbar. FÃ¼r andere weiterhin zugeordnete Mitarbeiter bleibt der Termin sichtbar. Der Termin bleibt in projektbezogenen Terminsichten sichtbar und, sofern vorgesehen, in kundenbezogenen Terminsichten Ã¼ber die Projekt-Kunden-Beziehung.

### UC 01/10: Termin in abhÃ¤ngigen Sichten anzeigen (Quersicht-Vertrag)

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass nach jeder terminrelevanten Aktion die abhÃ¤ngigen Sichten, die ihre Terminlisten Ã¼ber API-Endpunkte beziehen, konsistent sind. Ein Termin muss dort erscheinen oder verschwinden, wo es fachlich aus den Beziehungen folgt, damit Projekt-, Kunden-, Mitarbeiter- und Tour-Formulare stets den gleichen Datenstand wie der Kalender widerspiegeln.

### **Vorbedingungen**

- Ein Termin existiert oder wird gerade neu angelegt.
- Der Termin ist einem Projekt zugeordnet, weil ein Termin ohne Projekt nicht zulÃ¤ssig ist.
- Ãœber das Projekt ist der Kunde indirekt bestimmt.
- Optional: Dem Termin sind Mitarbeiter zugeordnet.
- Optional: Dem Termin ist eine Tour zugeordnet.

### **Ablauf**

1. Der Akteur fÃ¼hrt eine terminrelevante Aktion aus, zum Beispiel Termin anlegen, Termin bearbeiten, Termin verschieben, Mitarbeiter zuweisen oder entfernen, Team als EinfÃ¼gehilfe verwenden, Tour zuweisen oder Tour entfernen.
2. Das System speichert die Ã„nderung vollstÃ¤ndig und atomar, sodass keine TeilzustÃ¤nde entstehen, insbesondere keine halbfertigen Join-EintrÃ¤ge Terminâ€“Mitarbeiter.
3. Das System aktualisiert alle abhÃ¤ngigen Sichten, die Termine anzeigen.
4. Das System stellt sicher, dass die abhÃ¤ngigen Sichten denselben fachlichen Zustand ausliefern, der sich aus den Beziehungen ergibt.

### **Alternativen**

- Abbruch: Der Akteur bricht die Aktion ab. Es werden keine Ã„nderungen gespeichert, und folglich dÃ¼rfen sich auch keine abhÃ¤ngigen Sichten Ã¤ndern.
- Blockade durch Konflikt oder Regelverletzung: Wenn eine Aktion wegen Ãœberschneidung oder anderer Regeln blockiert wird, wird nichts gespeichert, und keine abhÃ¤ngige Sicht darf einen verÃ¤nderten Zustand anzeigen.

### **Ergebnis**

Der Termin ist in allen relevanten Sichten konsistent sichtbar oder nicht sichtbar, abhÃ¤ngig vom Ergebnis der Aktion.

Das bedeutet insbesondere: Das Mitarbeiterformular zeigt den Termin in der Mitarbeiter-Terminliste fÃ¼r alle dem Termin aktuell zugeordneten Mitarbeiter, und zeigt ihn nicht fÃ¼r Mitarbeiter, die nicht (mehr) zugeordnet sind. Das Projektformular zeigt den Termin in der Projekt-Terminliste des zugeordneten Projekts. Das Kundenformular zeigt den Termin in der Terminliste des Kunden, der Ã¼ber das Projekt ermittelt wird. Wenn der Termin einer Tour zugeordnet ist, zeigt das Tour-Formular den Termin in der Tour-Terminliste, und wenn die Tourzuordnung entfernt wurde, ist der Termin in dieser Tour-Sicht nicht mehr sichtbar.

### UC 01/11: Denormalisierte Terminanzeige aktualisieren (Quersicht-Vertrag)

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Sichten, die Termin-Informationen denormalisiert anzeigen, nach Ã„nderungen an Kunden- oder Projektdaten stets die aktuellen Werte ausliefern. Es darf nicht vorkommen, dass ein Termin in einer Kalender- oder Listenansicht noch veraltete Kunden- oder Projektnamen anzeigt, obwohl die Stammdaten bereits geÃ¤ndert wurden.

### **Vorbedingungen**

- Mindestens ein Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Ãœber das Projekt ist der Kunde indirekt bestimmt.
- Es existiert mindestens eine Sicht, die Kunden- oder Projektnamen denormalisiert ausliefert, zum Beispiel eine Kalender- oder Terminlisten-Projektion.

### **Ablauf**

1. Der Akteur Ã¤ndert Stammdaten, die in Terminprojektionen angezeigt werden, zum Beispiel den Namen eines Projekts oder den Namen eines Kunden.
2. Das System speichert die StammdatenÃ¤nderung.
3. Das System stellt sicher, dass alle Sichten, die Termine denormalisiert ausliefern, bei der nÃ¤chsten Abfrage die aktualisierten Namen liefern.
4. Das System zeigt in diesen Sichten keine veralteten Namen mehr an.

### **Alternativen**

- Abbruch: Der Akteur bricht die StammdatenÃ¤nderung ab. Es werden keine Ã„nderungen gespeichert, und es darf keine Sicht einen verÃ¤nderten Namen anzeigen.
- Fehler beim Speichern: Falls das Speichern der Stammdaten fehlschlÃ¤gt, dÃ¼rfen nachfolgende Terminprojektionen keine teilweise aktualisierten oder inkonsistenten Namen ausliefern.

### **Ergebnis**

Alle Terminprojektionen und Terminlisten, die Kunden- oder Projektnamen anzeigen, liefern die aktuellen Namen konsistent aus. Ein Termin zeigt in Kalender- und Listenansichten die aktuellen Projekt- und Kundeninformationen, die sich aus Termin â†’ Projekt â†’ Kunde ergeben.

### UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)

### **Akteur**

Disponent, Administrator

### **Ziel**

Termine in Kalender- und Listenansichten anzeigen und Ã¼ber Filter so einschrÃ¤nken, dass das System konsistent genau die Termine liefert, die zum gewÃ¤hlten Zeitraum und zu den gewÃ¤hlten Kriterien passen. Die Projektion muss dabei die fachlich korrekten Beziehungen berÃ¼cksichtigen, insbesondere dass jeder Termin einem Projekt zugeordnet ist und der Kunde indirekt Ã¼ber das Projekt bestimmt wird.

### **Vorbedingungen**

- Es existieren Termine in der Datenbank.
- Jeder Termin ist einem Projekt zugeordnet.
- Projekte sind Kunden zugeordnet, sodass der Kunde eines Termins indirekt Ã¼ber das Projekt ermittelt werden kann.
- Es existiert mindestens ein API-Endpunkt, der Termine als Kalender-/Listenprojektion ausliefert.

### **Ablauf**

1. Der Akteur Ã¶ffnet eine Kalender- oder Terminlistenansicht.
2. Das System lÃ¤dt die Termine fÃ¼r einen gewÃ¤hlten Zeitraum, zum Beispiel fÃ¼r einen Tag, eine Woche oder einen frei wÃ¤hlbaren Zeitraum.
3. Der Akteur setzt optional Filterkriterien, zum Beispiel nach Projekt, nach Tour oder nach Mitarbeiter.
4. Das System lÃ¤dt die Termine erneut und liefert dabei nur die Termine aus, die sowohl im Zeitraum liegen als auch alle gesetzten Filterkriterien erfÃ¼llen.
5. Der Akteur Ã¤ndert Filterkriterien oder den Zeitraum, und das System aktualisiert die Ergebnisliste entsprechend.

### **Alternativen**

- Keine Treffer: Wenn im Zeitraum oder mit den gesetzten Filtern keine Termine existieren, liefert das System eine leere Liste und die Ansicht bleibt stabil bedienbar.
- UngÃ¼ltiger Zeitraum: Wenn ein ungÃ¼ltiger Zeitraum Ã¼bergeben wird, blockiert das System die Anfrage mit einer eindeutigen Fehlermeldung und liefert keine Teilantwort.
- FilterÃ¤nderung wÃ¤hrend paralleler Ã„nderungen: Wenn sich Termine wÃ¤hrend der Nutzung durch andere Benutzer Ã¤ndern, muss das System beim nÃ¤chsten Laden konsistent den aktuellen Stand ausliefern.

### **Ergebnis**

Die Ansicht zeigt die vom System gelieferten Termine konsistent und reproduzierbar an. Die Terminmenge entspricht dem gewÃ¤hlten Zeitraum und den gesetzten Filtern. Alle in der Projektion angezeigten Projekt- und Kundeninformationen entsprechen den aktuellen Daten, wobei der Kunde stets indirekt Ã¼ber das Projekt bestimmt wird.

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

1. Der Akteur Ã¶ffnet eine Kalender- oder Terminlistenansicht.
2. Das System lÃ¤dt Termine als Projektion und stellt sie dar.
3. FÃ¼r jeden Termin leitet das System die Darstellungsfarbe nach einer festen Regel ab.
    1. Wenn der Termin einer Tour zugeordnet ist, verwendet das System die Farbe dieser Tour.
    2. Wenn der Termin keiner Tour zugeordnet ist, verwendet das System eine definierte Standardfarbe.
4. Der Akteur weist einem Termin eine Tour zu oder entfernt die Tourzuweisung.
5. Das System aktualisiert die Darstellung, sodass sich die Farbe des Termins entsprechend der Regel sofort und konsistent Ã¤ndert.

### **Alternativen**

- Tour ohne Farbe: Wenn eine Tour keine gÃ¼ltige Farbe besitzt, muss das System eine robuste Fallback-Regel anwenden, zum Beispiel die Standardfarbe, und darf keine fehlerhafte oder leere Darstellung erzeugen.
- Abbruch oder Blockade: Wenn eine Ã„nderung (Tour setzen oder Tour entfernen) abgebrochen oder wegen Konflikt blockiert wird, darf sich die angezeigte Farbe nicht dauerhaft Ã¤ndern, weil kein persistierter Zustand entstanden ist.

### **Ergebnis**

Jeder Termin wird in allen Sichten konsistent mit der korrekten Farbe dargestellt. Termine mit Tourzuordnung nutzen die Tourfarbe, Termine ohne Tourzuordnung nutzen die Standardfarbe. Nach Ã„nderungen an der Tourzuordnung ist die Darstellung ohne Inkonsistenzen aktualisiert.

### UC 01/14: Historische Termine sind read-only

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass historische Termine nicht mehr verÃ¤nderbar sind und dass das System keine neuen historischen Termine zulÃ¤sst. Historisch bedeutet dabei, dass Datum oder Startzeit nicht vor dem aktuellen Zeitpunkt liegen dÃ¼rfen. Das System muss Bearbeiten, Verschieben, LÃ¶schen sowie das Ã„ndern von Zuordnungen (Tour, Team als EinfÃ¼gehilfe, Mitarbeiter) fÃ¼r historische Termine blockieren und gleichzeitig verhindern, dass Ã¼ber UI-Aktionen historische Termine Ã¼berhaupt neu angelegt werden kÃ¶nnen.

### **Vorbedingungen**

- Es existieren Termine in der Datenbank, darunter mindestens ein Termin, dessen Startzeitpunkt in der Vergangenheit liegt.
- Es existieren Kalender- oder Listenansichten sowie das Terminformular.
- Das System verfÃ¼gt Ã¼ber Validierung und Guard-Regeln, die historische Eingaben blockieren.

### **Ablauf**

1. Der Akteur Ã¶ffnet einen historischen Termin im Terminformular.
2. Das System erkennt, dass der Termin historisch ist, und stellt den Termin im Read-only-Modus dar.
3. Das System verhindert alle Ã„nderungen am Termin, insbesondere Ã„nderungen an Startdatum, Enddatum, Startzeit, Projektzuordnung, Tourzuordnung und Mitarbeiterzuordnungen.
4. Das System verhindert das LÃ¶schen des historischen Termins, sofern LÃ¶schen fÃ¼r historische Termine nicht zulÃ¤ssig ist, oder blockiert das LÃ¶schen zumindest dann, wenn dadurch historische Daten verÃ¤ndert wÃ¼rden.
5. Der Akteur versucht im Kalender oder in einer Terminliste einen neuen Termin in der Vergangenheit anzulegen.
6. Das System blockiert die Terminerstellung in der Vergangenheit und stellt sicher, dass keine Speichern-Aktion mÃ¶glich ist und keine persistierten DatensÃ¤tze entstehen.

### **Alternativen**

- Grenzfall â€žheute, aber Startzeit in der Vergangenheitâ€œ: Wenn ein Benutzer fÃ¼r den heutigen Tag eine Startzeit in der Vergangenheit eingibt, blockiert das System den Vorgang ebenso wie bei einem Datum in der Vergangenheit.
- Abbruch: Wenn der Akteur die Bearbeitung abbricht, bleibt der Termin unverÃ¤ndert und es entstehen keine TeilzustÃ¤nde.
- ParallelÃ¤nderungen: Wenn ein Termin wÃ¤hrend der Anzeige durch einen anderen Benutzer in einen historischen Zustand gerÃ¤t, muss das System spÃ¤testens beim nÃ¤chsten Speichern die Ã„nderung blockieren und den Benutzer verstÃ¤ndlich informieren.

### **Ergebnis**

Historische Termine sind nicht verÃ¤nderbar. Es gibt keine MÃ¶glichkeit, historische Termine neu anzulegen oder bestehende Termine in die Vergangenheit zu verschieben. Das System stellt sicher, dass weder Termin-DatensÃ¤tze noch Join-EintrÃ¤ge Terminâ€“Mitarbeiter als Teilzustand entstehen, wenn eine historische Eingabe blockiert wird.

### UC 01/15: Konsistenz bei parallelen Ã„nderungen (Optimistic Locking)

### **Akteur**

Disponent, Administrator

### **Ziel**

Verhindern, dass parallele Bearbeitungen am selben Termin zu Lost Updates fÃ¼hren. Wenn zwei Benutzer denselben Termin bearbeiten, darf eine spÃ¤tere Speicherung nicht stillschweigend frÃ¼here Ã„nderungen Ã¼berschreiben. Stattdessen muss das System Versionskonflikte erkennen, die Speicherung blockieren und den Benutzer so informieren, dass er den aktuellen Stand neu laden und seine Ã„nderungen bewusst erneut anwenden kann.

### **Vorbedingungen**

- Der Termin existiert.
- Das System verwendet eine Versionsinformation fÃ¼r Termine, mit der Ã„nderungen gegen parallele Updates abgesichert werden.
- Zwei Benutzer kÃ¶nnen gleichzeitig auf denselben Termin zugreifen.

### **Ablauf**

1. Benutzer A Ã¶ffnet einen bestehenden Termin im Terminformular.
2. Benutzer B Ã¶ffnet denselben Termin im Terminformular, ohne von der Bearbeitung von Benutzer A zu wissen.
3. Benutzer A Ã¤ndert den Termin und speichert.
4. Das System speichert die Ã„nderungen von Benutzer A und erhÃ¶ht die Versionsinformation des Termins.
5. Benutzer B Ã¤ndert den Termin auf Basis seines nun veralteten Stands und versucht zu speichern.
6. Das System erkennt anhand der Versionsinformation, dass der Stand von Benutzer B veraltet ist, und blockiert die Speicherung mit einem Versionskonflikt.
7. Das System informiert Benutzer B eindeutig Ã¼ber den Konflikt und bietet einen Weg an, den Termin neu zu laden.
8. Benutzer B lÃ¤dt den aktuellen Stand und entscheidet anschlieÃŸend bewusst, ob und wie er seine Ã„nderungen erneut anwenden mÃ¶chte.
9. Benutzer B speichert erneut, diesmal auf Basis der aktuellen Version.

### **Alternativen**

- Konflikt beim LÃ¶schen: Wenn Benutzer B versucht zu lÃ¶schen, wÃ¤hrend Benutzer A den Termin geÃ¤ndert hat, muss das System den LÃ¶schvorgang ebenfalls Ã¼ber einen Versionskonflikt blockieren, sodass keine unbeabsichtigte LÃ¶schung eines inzwischen geÃ¤nderten Stands erfolgt.
- Konflikt bei Mitarbeiterzuordnungen: Wenn Benutzer A die Mitarbeiterliste geÃ¤ndert hat und Benutzer B parallel ebenfalls Ã„nderungen an Mitarbeiterzuordnungen vornimmt, muss der Versionskonflikt ebenfalls greifen, sodass keine Join-Ã„nderungen verloren gehen oder teilweise Ã¼berschrieben werden.
- Abbruch: Benutzer B bricht nach Konfliktmeldung ab. Dann bleibt der Termin im Stand von Benutzer A erhalten.

### **Ergebnis**

Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen. Stattdessen wird ein Versionskonflikt erkannt und die zweite Speicherung blockiert, bis der Benutzer auf Basis des aktuellen Stands erneut speichert. Der Termin und die Join-Tabelle Terminâ€“Mitarbeiter bleiben konsistent, ohne Lost Updates und ohne TeilzustÃ¤nde.

### UC 01/16: Termin-Join-Konsistenz und Duplikatvermeidung

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Zuordnungen zwischen Termin und Mitarbeitern deterministisch und konsistent bleiben. Insbesondere dÃ¼rfen keine Duplikate in der Join-Tabelle Terminâ€“Mitarbeiter entstehen, und wiederholte Eingaben oder mehrfache Anwendung von EinfÃ¼gehilfen dÃ¼rfen nicht zu instabilen oder inkonsistenten Mitarbeiterlisten fÃ¼hren.

### **Vorbedingungen**

- Der Termin existiert.
- Der Termin ist einem Projekt zugeordnet.
- Es existieren Mitarbeiter.
- Optional: Es existiert ein Team mit mindestens einem Mitarbeiter.
- Optional: Es existiert eine Tour mit mindestens einem Mitarbeiter.

### **Ablauf**

1. Der Akteur Ã¶ffnet den Termin im Terminformular.
2. Der Akteur fÃ¼hrt eine oder mehrere Zuweisungsaktionen aus, zum Beispiel:
    1. denselben Mitarbeiter mehrfach hinzufÃ¼gen,
    2. ein Team als EinfÃ¼gehilfe mehrfach anwenden,
    3. eine Tour zuweisen oder die Tour wechseln,
    4. Mitarbeiter manuell hinzufÃ¼gen und anschlieÃŸend wieder entfernen.
3. Das System aktualisiert die Mitarbeiterliste des Termins gemÃ¤ÃŸ den fachlichen Regeln.
4. Das System speichert den Termin.
5. Das System stellt sicher, dass die Persistenz konsistent ist, insbesondere in der Join-Tabelle Terminâ€“Mitarbeiter.

### **Alternativen**

- Wiederholte Auswahl desselben Mitarbeiters: Wenn der Akteur denselben Mitarbeiter erneut auswÃ¤hlt, muss das System entweder die Auswahl verhindern oder die Aktion als No-op behandeln. In keinem Fall darf ein Duplikat entstehen.
- Mehrfaches Anwenden derselben EinfÃ¼gehilfe: Wenn Team oder Tour wiederholt angewendet wird, muss das Ergebnis deterministisch bleiben, ohne doppelte Join-EintrÃ¤ge und ohne instabile Reihenfolgen, und die Mitarbeiterliste muss den definierten Regeln entsprechen.
- Abbruch: Wenn der Akteur abbricht, werden keine Ã„nderungen gespeichert und es entstehen keine ZwischenzustÃ¤nde in der Join-Tabelle.

### **Ergebnis**

Die Mitarbeiterzuordnungen eines Termins sind konsistent und duplikatfrei. FÃ¼r jede Kombination aus Termin und Mitarbeiter existiert hÃ¶chstens ein Join-Eintrag. Wiederholte Eingaben, Mehrfachklicks oder erneute Anwendung von EinfÃ¼gehilfen erzeugen keine inkonsistenten ZustÃ¤nde. Die abhÃ¤ngigen Sichten zeigen denselben konsistenten Zustand, der in der Join-Tabelle persistiert ist.

# FT (02): Projekte

## FT (02) Ziel / Zweck

Dieses Feature ermÃ¶glicht der Disposition, **Projekte als zentrale fachliche Einheit** anzulegen, zu pflegen und in ihrem Lebenszyklus zu steuern.

Ein Projekt bildet den fachlichen Rahmen fÃ¼r alle zugehÃ¶rigen Termine und bÃ¼ndelt alle projektbezogenen Informationen wie Beschreibung, Status, Notizen und AnhÃ¤nge.

## FT (02) Fachliche Beschreibung

Ein Projekt reprÃ¤sentiert einen Auftrag oder Vorgang (z. B. Aufbau, Service, Nachbesserung).

Es ist immer genau **einem Kunden** zugeordnet und besitzt Null, **eine oder mehrere Projektstatus Flaggen** aus einer administrierbaren Statusliste, 
die Ã¼ber eine n:m Beziehung organisiert werden.

Alle fachlichen Informationen, die **nicht terminspezifisch** sind, werden am Projekt gepflegt:

- eine ausfÃ¼hrliche Projektbeschreibung (formatierter Text, z. B. Markdown),
- optionale Notizen (als eigenstÃ¤ndiges Domainobjekt),
- projektbezogene AnhÃ¤nge (z. B. Auftrag, AuftragsbestÃ¤tigung, PlÃ¤ne, Fotos).

Ein Projekt kann **ohne Termine** existieren.

Termine kÃ¶nnen **innerhalb eines Projekts** angelegt werden. Termine KÃ¶nnen auch im Kalender angelegt werden, wo dann die Projektzuordnung erfolgt.

Projekt-Details sind immer **projektweit gÃ¼ltig** und gelten automatisch fÃ¼r alle zugehÃ¶rigen Termine. Aus Termin- oder Kalenderansichten kÃ¶nnen Projekt-Details eingesehen, jedoch nicht zwingend dort bearbeitet werden.

In der Projektliste wird standardmÃ¤ÃŸig nur die fÃ¼r die Disposition relevante Arbeitsmenge angezeigt. Unter â€žAktuelle Projekteâ€œ versteht das System Projekte, die mindestens einen Termin besitzen, dessen Startdatum heute oder in der Zukunft liegt. Projekte ohne Termine sind im Standardfall bewusst ausgeblendet, weil sie nicht disponierbar sind. Ãœber eine explizite Umschaltoption kann die Liste stattdessen auf â€žProjekte ohne Termineâ€œ umgestellt werden; in diesem Modus werden ausschlieÃŸlich Projekte angezeigt, die keinen Termin besitzen. ZusÃ¤tzliche Filter wie Titel- oder Statusfilter wirken immer nur auf die jeweils geladene Projektmenge und definieren nicht die Grundmenge.

## FT (02) Regeln & Randbedingungen

- Ein Projekt ist immer genau **einem Kunden** zugeordnet.
- Ein Projekt hat einen oder mehrere **Status Flags**.
- Projektstatus werden in einer **eigenen Stammdatentabelle** gepflegt.
    - Default-Statuswerte sind geschÃ¼tzt und nicht lÃ¶schbar.
- Ein Projekt kann ohne Termine existieren.
- Projekt-Details (Beschreibung, Notizen, AnhÃ¤nge) gehÃ¶ren **ausschlieÃŸlich** zum Projekt, nicht zum Termin.
- Notizen sind optional und frei pflegbar.
- AnhÃ¤nge sind optional; ein Projekt kann mehrere AnhÃ¤nge besitzen.
- AnhÃ¤nge sind dauerhaft dem Projekt zugeordnet.
- Das physische LÃ¶schen eines Projekts ist nur zulÃ¤ssig, wenn keine Termine existieren.

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

1. Akteur startet â€žProjekt anlegenâ€œ.
2. Akteur wÃ¤hlt einen Kunden.
3. Akteur erfasst Titel und optional eine Beschreibung (Markdown).
4. Akteur wÃ¤hlt einen Projektstatus (Default z. B. â€žIn Planungâ€œ).
5. System speichert das Projekt.

### **Ergebnis**

Projekt existiert und kann fÃ¼r Terminplanung genutzt werden.

### UC 02/02: Projekt bearbeiten

### **Akteur**

Administrator, Disponent

### **Ziel**

Projektdaten und fachliche Inhalte Ã¤ndern.

### **Vorbedingungen**

Projekt existiert.

### **Ablauf**

1. Akteur Ã¶ffnet ein Projekt.
2. Akteur Ã¤ndert zulÃ¤ssige Felder (Titel, Kunde, Status, Beschreibung).
3. System speichert die Ã„nderungen.

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
- Der Akteur besitzt Leserechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur Ã¶ffnet ein Projekt
2. System zeigt Projektdaten, Beschreibung, Notizen, AnhÃ¤nge und zugehÃ¶rige Termine an.
3. System zeigt alle dem Projekt zugeordneten Status (n:m-Beziehung) an.
4. System zeigt den dem Projekt zugeordneten Kunden mit seinen Stammdaten an.

### Alternativen

- Projekt nicht vorhanden â†’ System antwortet mit 404.
- Akteur ohne ausreichende Leserechte â†’ System blockiert mit 403.
- Projekt besitzt keine Status â†’ Statusbereich bleibt leer.
- Projekt besitzt keine Notizen â†’ Notizenliste ist leer.
- Projekt besitzt keine AnhÃ¤nge â†’ Anhangsliste ist leer.
- Projekt besitzt keine Termine â†’ Terminliste ist leer.

### Ergebnis

VollstÃ¤ndiger Ãœberblick Ã¼ber das Projekt.

Alle projektbezogenen Informationen (Kunde, Status, Notizen, AnhÃ¤nge, Termine) werden konsistent angezeigt.

Es erfolgt keine fachliche DatenÃ¤nderung.

### UC 02/04: Projektstatus Ã¤ndern

### Akteur

Administrator, Disponent

### Ziel

Den aktuellen Projektstatus anpassen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.
- Mindestens ein gÃ¼ltiger Projektstatus ist im System definiert.

### Ablauf

1. Akteur Ã¶ffnet ein Projekt.
2. Akteur lÃ¶scht einen vorhandenen Status und wÃ¤hlt einen neuen oder wÃ¤hlt einen zusÃ¤tzlichen Status zu den vorhandenen.
3. System prÃ¼ft, ob der gewÃ¤hlte Status aktiv ist.
4. System speichert die Ã„nderung der n:m-Beziehung zwischen Projekt und Status.

### Alternativen

- Projekt nicht vorhanden â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte â†’ System blockiert mit 403.
- GewÃ¤hlter Status ist deaktiviert â†’ System verweigert die Zuweisung.
- Doppelte Statuszuweisung â†’ System verhindert Mehrfacheintrag.

### Ergebnis

Projekt befindet sich im neuen Status.

Die StatusÃ¤nderung wirkt ausschlieÃŸlich auf das Projekt.

### UC 02/05: Projektnotizen pflegen

### Akteur

Administrator, Disponent

### Ziel

ZusÃ¤tzliche projektbezogene Notizen erfassen oder Ã¤ndern.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur Ã¶ffnet das Projekt.
2. Akteur ergÃ¤nzt eine neue Notiz oder Ã¤ndert eine bestehende Notiz.
3. System validiert die Eingabe gemÃ¤ÃŸ den Regeln aus FT (13).
4. System speichert die Notiz projektbezogen.

### Alternativen

- Projekt nicht vorhanden â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte â†’ System blockiert mit 403.
- Eingabe ungÃ¼ltig â†’ System speichert nicht und zeigt eine Fehlermeldung.
- Abbruch der Bearbeitung â†’ Keine Ã„nderung wird gespeichert.

### Ergebnis

Notizen sind dem Projekt eindeutig zugeordnet und verfÃ¼gbar.

Bestehende Beziehungen zu Kunde, Status und Terminen bleiben unverÃ¤ndert.

### UC 02/06: ProjektanhÃ¤nge verwalten

### Akteur

Administrator, Disponent

### Ziel

Dokumente zu einem Projekt hinzufÃ¼gen und projektbezogene AnhÃ¤nge einsehen bzw. herunterladen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.
- Die hochzuladende Datei entspricht den systemseitig erlaubten Formaten.

### Ablauf

1. Akteur Ã¶ffnet das Projekt.
2. System zeigt die Liste der vorhandenen AnhÃ¤nge an (mit Metadaten wie Dateiname und Zeitstempel, sofern verfÃ¼gbar).
3. Akteur fÃ¼gt einen oder mehrere AnhÃ¤nge hinzu (Upload).
4. System prÃ¼ft die Existenz des Projekts und ordnet die hochgeladenen Dateien eindeutig dem Projekt zu.
5. System speichert die neuen AnhÃ¤nge.
6. Akteur kann vorhandene AnhÃ¤nge Ã¶ffnen (Preview) oder herunterladen.

### Alternativen

- Projekt nicht vorhanden â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrechte â†’ System blockiert mit 403.
- Upload abgebrochen oder Datei ungÃ¼ltig â†’ System speichert keinen neuen Anhang und zeigt eine verstÃ¤ndliche Fehlermeldung.
- AnhÃ¤nge kÃ¶nnen nicht gelÃ¶scht werden â†’ Eine â€žEntfernen/LÃ¶schenâ€œ-Aktion wird nicht angeboten.

### Ergebnis

AnhÃ¤nge sind korrekt dem Projekt zugeordnet und stehen fÃ¼r alle zugehÃ¶rigen Termine zur VerfÃ¼gung.

Bestehende Daten (Projekt, Status, Notizen, Termine) bleiben unverÃ¤ndert.

### UC 02/07: Projekte anzeigen

### Akteur

Administrator, Disponent

### Ziel

Der Akteur sieht eine fÃ¼r die tÃ¤gliche Arbeit passende Projektliste und kann bei Bedarf auf Projekte ohne Termine umschalten.

### Vorbedingungen

- Projekte sind im System vorhanden.
- Der Akteur besitzt Leserechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Der Akteur Ã¶ffnet die ProjektÃ¼bersicht.
2. Das System lÃ¤dt standardmÃ¤ÃŸig die Projektmenge â€žAktuelle Projekteâ€œ.
3. Das System zeigt ausschlieÃŸlich Projekte an, die mindestens einen Termin mit Startdatum heute oder in der Zukunft besitzen.
4. Der Akteur kann die Umschaltoption â€žOhne Termineâ€œ aktivieren.
5. Das System lÃ¤dt ausschlieÃŸlich Projekte ohne Termine und zeigt diese an.
6. Der Akteur kann zurÃ¼ck auf â€žAktuelle Projekteâ€œ umschalten; das System lÃ¤dt wieder die Standardmenge.
7. Titel- oder Statusfilter wirken ausschlieÃŸlich auf die jeweils geladene Grundmenge.

### Alternativen

- Keine Projekte in der jeweiligen Grundmenge vorhanden â†’ System zeigt eine leere Liste an.
- Akteur ohne Leserechte â†’ System blockiert mit 403.

### Ergebnis

Der Akteur sieht entweder die aktuellen Projekte oder ausschlieÃŸlich Projekte ohne Termine, jeweils als klar getrennte Mengen. Es findet keine Vermischung der Grundmengen statt. Es erfolgt keine fachliche DatenÃ¤nderung.

### UC 02/08: Projekt lÃ¶schen

### Akteur

Administrator, Disponent

### Ziel

Ein Projekt dauerhaft aus dem System entfernen.

### Vorbedingungen

- Projekt existiert.
- Der Akteur besitzt LÃ¶schrechte gemÃ¤ÃŸ seiner Rolle.
- Dem Projekt sind keine Termine zugeordnet.

### Ablauf

1. Akteur Ã¶ffnet das Projekt.
2. Akteur wÃ¤hlt die Funktion â€žProjekt lÃ¶schenâ€œ.
3. System prÃ¼ft, ob dem Projekt Termine zugeordnet sind.
4. System prÃ¼ft die Berechtigung des Akteurs.
5. System entfernt das Projekt sowie alle zugeordneten Statusbeziehungen und Projektnotizen.
6. System entfernt die projektbezogene Referenz auf AnhÃ¤nge.
7. System bestÃ¤tigt die erfolgreiche LÃ¶schung.

### Alternativen

- Projekt nicht vorhanden â†’ System antwortet mit 404.
- Akteur ohne LÃ¶schrechte â†’ System blockiert mit 403.
- Projekt besitzt mindestens einen Termin â†’ System blockiert mit 409 und lÃ¶scht nicht.

### Ergebnis

Das Projekt ist dauerhaft entfernt.

ZugehÃ¶rige Statusbeziehungen und Notizen existieren nicht mehr.

Termine bleiben unverÃ¤ndert bestehen, da eine LÃ¶schung nur ohne vorhandene Termine mÃ¶glich ist.

### UC 02/09: ProjektÃ¤nderung wird in Terminansichten konsistent dargestellt

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen Terminansichten korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind mindestens ein oder mehrere Termine zugeordnet.
- Eine Terminansicht (Kalender oder Tabelle) ist geÃ¶ffnet.

### Ablauf

1. Akteur Ã¤ndert Projektdaten (z. B. Titel, Kunde oder Beschreibung).
2. System speichert die Ã„nderung.
3. System invalidiert betroffene Ansichten.
4. Offene Terminansichten aktualisieren die referenzierten Projektdaten.

### Alternativen

- Keine Terminansicht geÃ¶ffnet â†’ Aktualisierung erfolgt beim nÃ¤chsten Laden.
- Projekt ohne Termine â†’ Keine Terminansicht betroffen.

### Ergebnis

Alle Terminansichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten Projektreferenzen in Termin-Karten.

### UC 02/10: ProjektstatusÃ¤nderung wirkt systemweit konsistent

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass StatusÃ¤nderungen eines Projekts in allen relevanten Sichten korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein Status ist zugeordnet oder wird geÃ¤ndert.

### Ablauf

1. Akteur Ã¤ndert den Projektstatus.
2. System speichert die n:m-Ã„nderung.
3. System aktualisiert ProjektÃ¼bersichten und Filterergebnisse.
4. Terminansichten aktualisieren Statusanzeigen, sofern diese angezeigt werden.

### Alternativen

- Status wird entfernt â†’ Darstellung aktualisiert sich entsprechend.
- Status wird hinzugefÃ¼gt â†’ Darstellung aktualisiert sich entsprechend.

### Ergebnis

Projektstatus ist in allen Sichten identisch sichtbar.

Statusfilter liefern konsistente Ergebnisse.

### UC 02/11: ProjektlÃ¶schung wird systemweit korrekt verarbeitet

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die LÃ¶schung eines Projekts keine inkonsistenten Referenzen hinterlÃ¤sst.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind keine Termine zugeordnet.

### Ablauf

1. Akteur lÃ¶scht ein Projekt.
2. System entfernt das Projekt.
3. System aktualisiert ProjektÃ¼bersichten.
4. Offene Detailansichten schlieÃŸen sich oder wechseln in einen neutralen Zustand.

### Alternativen

- Projekt besitzt Termine â†’ LÃ¶schung wird blockiert, keine Ansicht Ã¤ndert sich.

### Ergebnis

Es existieren keine Referenzen auf das gelÃ¶schte Projekt.

Alle Sichten sind konsistent.

### UC 02/12: Projekt in abhÃ¤ngigen Sichten anzeigen (QuerÂ­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Projektdaten in allen abhÃ¤ngigen Sichten konsistent und referenziell korrekt angezeigt werden.

### Vorbedingungen

- Projekt existiert.
- Projekt ist mindestens einer abhÃ¤ngigen Sicht referenziert (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte.

### Ablauf

1. Eine abhÃ¤ngige Sicht (z. B. Terminliste oder Kalender) lÃ¤dt ein oder mehrere Termine mit Projektbezug.
2. System stellt sicher, dass projektrelevante Anzeigedaten nicht lokal dupliziert oder eigenstÃ¤ndig persistiert werden.
3. Die Sicht bezieht projektrelevante Informationen ausschlieÃŸlich aus der gÃ¼ltigen Projektquelle.
4. Darstellung erfolgt konsistent mit der Projekt-Detailansicht.

### Alternativen

- Projekt wurde zwischenzeitlich gelÃ¶scht â†’ Referenz darf nicht mehr existieren.
- Projekt besitzt keine abhÃ¤ngigen Sichten â†’ Keine weitere Aktion erforderlich.

### Ergebnis

Alle abhÃ¤ngigen Sichten zeigen identische und konsistente Projektdaten.

Es existieren keine widersprÃ¼chlichen ProjektreprÃ¤sentationen zwischen Detailansicht und QuerÂ­sichten.

### UC 02/13: Denormalisierte Projektanzeige aktualisieren (QuerÂ­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen abhÃ¤ngigen Sichten ohne Inkonsistenz sichtbar werden.

### Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhÃ¤ngigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabelle).
- Der Akteur besitzt Ã„nderungsrechte.

### Ablauf

1. Akteur Ã¤ndert Projektdaten (z. B. Titel, Kunde, Status oder Beschreibung).
2. System speichert die Ã„nderung am Projekt.
3. System erkennt betroffene abhÃ¤ngige Sichten.
4. System invalidiert veraltete ProjektreprÃ¤sentationen in diesen Sichten.
5. AbhÃ¤ngige Sichten laden die aktualisierten Projektdaten neu.

### Alternativen

- Keine abhÃ¤ngige Sicht geÃ¶ffnet â†’ Aktualisierung erfolgt beim nÃ¤chsten Laden.
- Ã„nderung wird verworfen oder schlÃ¤gt fehl â†’ Keine Sicht wird aktualisiert.

### Ergebnis

Alle abhÃ¤ngigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprÃ¼chlichen Projektinformationen im System.

### UC 02/14: Konsistenz bei parallelen Ã„nderungen an Projekten (Optimistic Locking)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass parallele Ã„nderungen an einem Projekt keine inkonsistenten ZustÃ¤nde oder stillen Ãœberschreibungen verursachen.

### Vorbedingungen

- Projekt existiert.
- Projekt wird von mindestens zwei Akteurn parallel geÃ¶ffnet.
- Projekt besitzt ein Versionierungsmerkmal (z. B. Versionsnummer oder Zeitstempel).
- Beide Akteur besitzen Ã„nderungsrechte.

### Ablauf

1. Akteur A und Akteur B Ã¶ffnen dasselbe Projekt.
2. Akteur A Ã¤ndert Projektdaten und speichert.
3. System erhÃ¶ht die Projektversion.
4. Akteur B Ã¤ndert Projektdaten auf Basis der alten Version und speichert.
5. System erkennt die veraltete Versionsbasis.
6. System verweigert das Speichern und antwortet mit einem Konflikt (z. B. 409 Conflict).

### Alternativen

- Keine parallele Ã„nderung â†’ Speichern erfolgt regulÃ¤r.
- Akteur B lÃ¤dt das Projekt nach dem Konflikt neu â†’ Aktuelle Version wird geladen.

### Ergebnis

Es kommt zu keiner stillen Ãœberschreibung von Projektdaten.

Das Projekt bleibt in einem konsistenten Zustand.

AbhÃ¤ngige Sichten zeigen ausschlieÃŸlich den zuletzt erfolgreich gespeicherten Zustand.

### UC 02/15: Projekt-Join-Konsistenz (Projekt â†” Status)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die n:m-Beziehung zwischen Projekt und Projektstatus jederzeit konsistent, eindeutig und frei von verwaisten Relationen ist.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein Projektstatus ist im System definiert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur fÃ¼gt einem Projekt einen oder mehrere Status hinzu oder entfernt bestehende Status.
2. System prÃ¼ft vor dem Speichern, ob der Status existiert.
3. System verhindert die Mehrfachzuweisung desselben Status zum selben Projekt.
4. System speichert die Join-Ã„nderung atomar.
5. Bei ProjektlÃ¶schung entfernt das System alle zugehÃ¶rigen Join-EintrÃ¤ge.

### Alternativen

- Status existiert nicht â†’ System verweigert die Zuweisung.
- Status ist deaktiviert â†’ System verweigert neue Zuweisungen.
- Parallele Ã„nderung der Statusliste â†’ System erkennt Versionskonflikt und antwortet mit 409 Conflict.

### Ergebnis

Die n:m-Beziehung zwischen Projekt und Status ist eindeutig und konsistent gespeichert.

Es existieren keine doppelten oder verwaisten Join-EintrÃ¤ge.

Die IntegritÃ¤t bleibt auch bei ProjektlÃ¶schung gewahrt.

### UC 02/16: Projekt-Referenz-Konsistenz (Projekt â†” Kunde)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass jedes Projekt jederzeit genau einem gÃ¼ltigen Kunden zugeordnet ist und keine inkonsistenten Referenzen entstehen.

### Vorbedingungen

- Projekt existiert oder wird bearbeitet.
- Mindestens ein Kunde ist im System definiert.
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur legt ein Projekt an oder Ã¤ndert den zugeordneten Kunden eines bestehenden Projekts.
2. System prÃ¼ft, ob der ausgewÃ¤hlte Kunde existiert.
3. System prÃ¼ft, ob der ausgewÃ¤hlte Kunde aktiv ist.
4. System speichert die Kundenreferenz am Projekt.
5. Bei Deaktivierung eines Kunden bleiben bestehende Projekte unverÃ¤ndert referenziert.

### Alternativen

- Kein Kunde ausgewÃ¤hlt â†’ System verweigert das Speichern.
- Kunde existiert nicht â†’ System verweigert das Speichern.
- Kunde ist deaktiviert â†’ System verweigert neue Zuweisungen.
- Kunde soll gelÃ¶scht werden, wÃ¤hrend Projekte referenzieren â†’ LÃ¶schung wird blockiert.

### Ergebnis

Jedes Projekt ist genau einem gÃ¼ltigen Kunden zugeordnet.

Es existieren keine Projekte ohne Kundenreferenz.

Historische Projekte mit deaktivierten Kunden bleiben konsistent lesbar.

### UC 02/17: Projekt-Mengenlogik-Konsistenz (ProjektÃ¼bersicht)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass die ProjektÃ¼bersicht die fachlich definierten Grundmengen korrekt und disjunkt darstellt.

### Vorbedingungen

- Projekte sind im System vorhanden.
- Projekte kÃ¶nnen Termine in Vergangenheit, Gegenwart oder Zukunft besitzen.
- Der Akteur besitzt Leserechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur Ã¶ffnet die ProjektÃ¼bersicht.
2. System lÃ¤dt standardmÃ¤ÃŸig die Grundmenge â€žAktuelle Projekteâ€œ.
3. System berÃ¼cksichtigt ausschlieÃŸlich Projekte, die mindestens einen Termin mit Startdatum â‰¥ heute besitzen.
4. Akteur kann auf die Grundmenge â€žOhne Termineâ€œ umschalten.
5. System lÃ¤dt ausschlieÃŸlich Projekte ohne zugeordnete Termine.
6. Filter (z. B. Titel, Status) wirken ausschlieÃŸlich innerhalb der jeweils geladenen Grundmenge.

### Alternativen

- Projekt besitzt ausschlieÃŸlich vergangene Termine â†’ Projekt erscheint nicht in â€žAktuelle Projekteâ€œ.
- Projekt besitzt vergangene und zukÃ¼nftige Termine â†’ Projekt erscheint in â€žAktuelle Projekte".
- Projekt besitzt keine Termine â†’ Projekt erscheint nur in â€žOhne Termine".
- Keine Projekte in der gewÃ¤hlten Grundmenge â†’ System zeigt eine leere Liste.

### Ergebnis

Die Grundmengen â€žAktuelle Projekte" und â€žOhne Termine" sind disjunkt.

Filter verÃ¤ndern nicht die zugrunde liegende Grundmenge.

Die ProjektÃ¼bersicht ist fachlich konsistent und nachvollziehbar.

### UC 02/18: Race Condition bei ProjektlÃ¶schung

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass eine ProjektlÃ¶schung nicht zu inkonsistenten ZustÃ¤nden fÃ¼hrt, wenn parallel ein Termin fÃ¼r dieses Projekt angelegt wird.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt sind zum Zeitpunkt der LÃ¶schprÃ¼fung keine Termine zugeordnet.
- Der Akteur besitzt LÃ¶schrechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur initiiert die LÃ¶schung eines Projekts.
2. System prÃ¼ft, ob dem Projekt Termine zugeordnet sind.
3. Zwischen PrÃ¼fung und tatsÃ¤chlicher LÃ¶schung wird serverseitig eine atomare KonsistenzprÃ¼fung durchgefÃ¼hrt.
4. Falls wÃ¤hrenddessen ein Termin fÃ¼r dieses Projekt angelegt wurde, erkennt das System die neue Referenz.
5. System bricht die LÃ¶schung ab und antwortet mit einem Konflikt (z. B. 409 Conflict).
6. Nur wenn keine Terminreferenz existiert, lÃ¶scht das System das Projekt.

### Alternativen

- Projekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne LÃ¶schrechte â†’ System blockiert mit 403.
- Keine parallele Terminanlage â†’ LÃ¶schung erfolgt regulÃ¤r.

### Ergebnis

Es entsteht kein inkonsistenter Zustand zwischen Projekt- und Terminobjekten.

Ein Projekt mit Terminreferenz kann nicht gelÃ¶scht werden.

Die referenzielle IntegritÃ¤t bleibt jederzeit gewahrt.

### UC 02/19: Projekt in abhÃ¤ngigen Sichten anzeigen (QuerÂ­sicht-Vertrag)

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Projektdaten in allen abhÃ¤ngigen Sichten konsistent und referenziell korrekt dargestellt werden.

### Vorbedingungen

- Projekt existiert.
- Projekt wird in mindestens einer abhÃ¤ngigen Sicht verwendet (z. B. Terminliste, Kalender, Tabellenansicht).
- Der Akteur besitzt Leserechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Eine abhÃ¤ngige Sicht lÃ¤dt Termine oder Listen mit Projektbezug.
2. System stellt sicher, dass Projektdaten nicht lokal dupliziert oder eigenstÃ¤ndig persistiert werden.
3. Die Sicht bezieht Projektdaten ausschlieÃŸlich Ã¼ber die gÃ¼ltige Projektquelle.
4. Die Darstellung erfolgt konsistent zur Projekt-Detailansicht.

### Alternativen

- Projekt wurde gelÃ¶scht â†’ Referenz darf nicht mehr angezeigt werden.
- Projekt besitzt keine abhÃ¤ngigen Sichten â†’ Keine weitere Aktion erforderlich.

### Ergebnis

Alle abhÃ¤ngigen Sichten zeigen identische Projektdaten.

Es existieren keine widersprÃ¼chlichen ProjektreprÃ¤sentationen im System.

### UC 02/20: Denormalisierte Projektanzeige aktualisieren

### Akteur

Administrator, Disponent

### Ziel

Sicherstellen, dass Ã„nderungen an Projektdaten in allen abhÃ¤ngigen Sichten ohne Inkonsistenz sichtbar werden.

### Vorbedingungen

- Projekt existiert.
- Projektdaten werden in mindestens einer abhÃ¤ngigen Sicht dargestellt (z. B. Terminansicht, Kalender, Tabellenansicht).
- Der Akteur besitzt Ã„nderungsrechte gemÃ¤ÃŸ seiner Rolle.

### Ablauf

1. Akteur Ã¤ndert Projektdaten (z. B. Titel, Kunde oder Beschreibung).
2. System speichert die Ã„nderung am Projekt.
3. System erkennt alle betroffenen abhÃ¤ngigen Sichten.
4. System invalidiert veraltete ProjektreprÃ¤sentationen in diesen Sichten.
5. AbhÃ¤ngige Sichten laden die aktualisierten Projektdaten neu.

### Alternativen

- Keine abhÃ¤ngige Sicht geÃ¶ffnet â†’ Aktualisierung erfolgt beim nÃ¤chsten Laden.
- Ã„nderung wird verworfen oder schlÃ¤gt fehl â†’ Keine Sicht wird aktualisiert.

### Ergebnis

Alle abhÃ¤ngigen Sichten zeigen konsistente und aktuelle Projektdaten.

Es existieren keine veralteten oder widersprÃ¼chlichen Projektinformationen.

# FT (03): Kalenderansichten

## FT (03) Ziel / Zweck

Dieses Feature stellt Kalenderansichten bereit, um Termine Ã¼ber definierte ZeitrÃ¤ume hinweg Ã¼bersichtlich darzustellen und die Disposition bei der Orientierung und Planung zu unterstÃ¼tzen. Es enthÃ¤lt ausschlieÃŸlich Anzeige-, Navigations- und Drilldown-Funktionen und verÃ¤ndert keine Termindaten.

## FT (03) Fachliche Beschreibung

Die Anwendung visualisiert Termine in periodischen Kalenderansichten (Woche, Monat, mehrmonatige Ãœbersicht, JahresÃ¼bersicht). Termine werden als **farbige Balken** dargestellt, deren Farbe aus der **Tourzuordnung** abgeleitet wird. Der Balken deckt den vollstÃ¤ndigen Zeitraum des Termins ab und zeigt kompakt **Kundenname** und **Postleitzahl** an. 
FT (03) Terminplanung und Kalenâ€¦

ZusÃ¤tzlich bietet jeder Termin einen **Tooltip** in Form einer grÃ¶ÃŸeren Informationskarte. Diese Karte fasst Informationen aus **Projekt**, **Kunde** und **Team/Mitarbeiterzuweisung** zusammen. Die Informationen werden aus den bestehenden Beziehungen abgeleitet (Termin â†’ Projekt â†’ Kunde sowie Termin â†’ Mitarbeiter und optional Termin â†’ Tour).

Die Ansichten mÃ¼ssen â€žheruntergebrochenâ€œ werden kÃ¶nnen, also die Kalenderdarstellung muss wahlweise auf **Tour**, **Team** oder **Mitarbeiter** fokussiert werden, ohne dass sich die Terminlogik Ã¤ndert.

## FT (03) Regeln & Randbedingungen

Die Kalenderansichten sind DispositionsoberflÃ¤chen und nicht nur Anzeigeansichten. In allen Kalenderansichten kÃ¶nnen Termine Ã¼ber den `+`-Button pro Kalendertag angelegt werden, und Termine kÃ¶nnen per Drag & Drop verschoben werden. Beide Aktionen sind fachliche Ã„nderungen und gehÃ¶ren zum Kernprozess der Disposition.

FÃ¼r das Anlegen und Bearbeiten von Terminen wird ausschlieÃŸlich das in **FT (01)** definierte Terminformular verwendet. Die Kalenderansichten fÃ¼hren keine eigene Logik zum Erstellen oder Editieren von Terminen ein, sondern Ã¶ffnen das bestehende Formular im passenden Modus. Beim Klick auf `+` wird das Formular im Modus â€žNeuer Terminâ€œ geÃ¶ffnet und das Startdatum wird auf den angeklickten Tag gesetzt. Beim Klick auf einen bestehenden Termin wird das Formular im Modus â€žTermin bearbeitenâ€œ geÃ¶ffnet.

FÃ¼r alle Ã¤ndernden Aktionen gelten die gleichen Sperr- und Rollenregeln wie beim Bearbeiten eines Termins. Ein Termin darf ab seinem Starttag von normalen Benutzern nicht mehr geÃ¤ndert werden. Administratoren dÃ¼rfen diese Sperre Ã¼bersteuern und Termine auch nachtrÃ¤glich verÃ¤ndern. In gesperrten FÃ¤llen sind Drag & Drop sowie das Bearbeiten Ã¼ber Klick zu verhindern oder eindeutig mit einer Fehlermeldung abzulehnen.

Das Verschieben eines Termins per Drag & Drop fÃ¼hrt immer zu einer deterministischen Neuordnung der Termindarstellung in allen betroffenen Kalendertagen. Betroffen sind mindestens der Quelltag und der Zieltag, bei mehrtÃ¤gigen Terminen alle Tage der Termindauer. Nach dem Drop mÃ¼ssen die Platzierungs- und Sortierregeln erneut angewendet werden, damit die Darstellung konsistent bleibt und keine visuellen Ãœberschneidungen entstehen.

Die Monats- und Jahresansicht nutzen eine kompakte Termindarstellung als farbigen waagerechten Balken. Dieser Balken muss mindestens Kundennummer, Postleitzahl und Projekttitel darstellen kÃ¶nnen. Welche Teile tatsÃ¤chlich sichtbar sind, richtet sich nach der verfÃ¼gbaren Breite des Balkens; bei geringer Breite werden Informationen gekÃ¼rzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht.

Die Wochenansicht nutzt eine detailreichere Termindarstellung als grÃ¶ÃŸere FlÃ¤che. Diese Darstellung muss Projekttitel, Projektbeschreibung und Projektstatus anzeigen kÃ¶nnen sowie vom Kunden mindestens Kundennummer und Name. ZusÃ¤tzlich muss sie die dem Termin zugewiesenen Mitarbeiter anzeigen kÃ¶nnen. Die Wochenansicht kann kollabierbare Reihen oder Bereiche besitzen; dies verÃ¤ndert die Informationsdichte, aber nicht die fachlichen Regeln.

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bÃ¼ndelt. Dieses Popover muss mindestens den Informationsumfang der detailreichen Termindarstellung der Wochenansicht bereitstellen. Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern das die Bedienbarkeit verbessert; es dÃ¼rfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

Die Kalenderansichten benÃ¶tigen fÃ¼r die dargestellten Termine Zugriff auf Projekt- und Kundendaten sowie auf die Mitarbeiterzuordnungen. Diese Informationen dÃ¼rfen serverseitig zusammengefÃ¼hrt oder bei Bedarf nachgeladen werden, solange die OberflÃ¤che ohne spÃ¼rbare VerzÃ¶gerung bedienbar bleibt. Mouse-Over darf Details nachladen, muss jedoch pro Termin zwischenspeichern, damit wiederholtes Hovering keine wiederholten LadevorgÃ¤nge auslÃ¶st.

## FT (03) Darstellung

## Gesamtkonzept: Einheitliche Logik, verschiedene Render-Modi

In den drei Hauptansichten **Woche**, **Monat** und **Jahr** werden Termine grundsÃ¤tzlich einheitlich visualisiert, jedoch mit unterschiedlichen Informationsdichten. Die **grafische Grundstruktur der Kalendertage** (Raster, Tageskacheln, Kopfzeilen, etc.) bleibt unverÃ¤ndert. Der Unterschied liegt ausschlieÃŸlich in der Art, wie Termine innerhalb der TagesflÃ¤chen angeordnet und gerendert werden.

Die Kalenderansichten kÃ¶nnen sowohl als eigenstÃ¤ndige Ansicht als auch innerhalb eines **Dialogs/Popups** geÃ¶ffnet werden. Die Darstellung und Interaktionsregeln bleiben dabei identisch; der Dialogmodus ist ausschlieÃŸlich eine alternative Einbettung mit reduziertem Kontext.

In allen Kalenderansichten muss eine **FiltermÃ¶glichkeit nach Mitarbeiter** vorgesehen werden. Der Filter wirkt auf die dargestellten Termine und reduziert die sichtbaren Termine auf solche, denen der gewÃ¤hlte Mitarbeiter zugewiesen ist. Der Filter darf optional Mehrfachauswahl unterstÃ¼tzen, muss aber mindestens die Auswahl eines einzelnen Mitarbeiters ermÃ¶glichen.

Ein Termin ist ein Zeitraum mit **Startdatum** und optional **Enddatum**. Ein Termin kann optional einer **Tour** zugeordnet sein. Eine Tour besitzt eine **individuelle Farbe**, die die Terminfarbe bestimmt. Ist keine Tour zugeordnet, wird eine **neutrale Farbe** verwendet.

Ein Termin kann optional eine **Startzeit** haben. Solche Termine werden als **Intraday-Termine** bezeichnet. Intraday-Termine werden optisch weiterhin wie Ein-Tages-Termine behandelt, d. h. sie sind nicht als â€žstundenbasierte Zeitleisteâ€œ darzustellen. Die Startzeit wird lediglich als zusÃ¤tzliche Information im Termin angezeigt und beeinflusst die Sortierung.

## Begriffe und Layout-Grundlage

Kalendertage sind innerhalb einer Ansicht in einem Raster angeordnet. Zur Vereinfachung wird die sichtbare FlÃ¤che eines einzelnen Kalendertags als **Tag** bezeichnet.

Termine werden innerhalb eines Tags nicht Ã¼bereinander gelegt, sondern vertikal in **Zeilen** organisiert. Diese Zeilen heiÃŸen im Folgenden **Lanes** (oder Slots). Eine Lane ist eine reine Organisations- und Positionierungshilfe und ist in der UI nicht als eigene Linie sichtbar.

Die konkrete HÃ¶he einer Lane hÃ¤ngt vom jeweiligen Darstellungsmodus (kompakt oder detailliert) und den verwendeten UI-Komponenten (SchrifthÃ¶hen, Padding, etc.) ab.

## Lane-System: Ziel und Grundregeln

Das Lane-System hat zwei Ziele.

Erstens soll es sicherstellen, dass mehrere Termine am selben Tag **nicht Ã¼berlappen**, sondern vertikal untereinander dargestellt werden.

Zweitens soll es, wo mÃ¶glich, Termine gleicher Tour so anordnen, dass sie visuell als zusammengehÃ¶rige â€žSpurâ€œ wahrgenommen werden.

Die Lane-Zuordnung wird **nicht** aus global existierenden Touren abgeleitet, sondern aus den Terminen, die im jeweiligen sichtbaren Abschnitt tatsÃ¤chlich vorkommen. Dadurch bleibt die Darstellung kompakt und wÃ¤chst nur dort, wo es wirklich nÃ¶tig ist.

### Lane-Zuordnung

FÃ¼r die Lane-Zuordnung wird pro sichtbarem Abschnitt (je nach Ansicht) eine Lane-Struktur berechnet.

In der **Monatsansicht** und **Jahresansicht** wird die Lane-Struktur pro **Kalenderreihe** (also pro Wochenzeile im Raster) bestimmt.

In der **Wochenansicht** wird die Lane-Struktur pro **Woche** (bzw. pro dargestelltem Wochenabschnitt) bestimmt.

FÃ¼r jede Tour, die in diesem Abschnitt vorkommt, existiert mindestens eine Lane. ZusÃ¤tzlich existiert eine Lane fÃ¼r **Termine ohne Tour**, die unterhalb der Tour-Lanes liegt. Damit ergibt sich eine stabile vertikale Grundordnung: â€žTour-Lanes oben, tourlose Termine darunterâ€œ.

## Darstellung eines Termins: Balken Ã¼ber mehrere Tage

Termine werden grundsÃ¤tzlich als **waagerechte Elemente** dargestellt, die sich Ã¼ber die Tage spannen, die zum Termin gehÃ¶ren.

Ein Ein-Tages-Termin belegt nur den Tag des Startdatums.

Ein Mehrtages-Termin Ã¼berspannt alle Tage vom Startdatum bis einschlieÃŸlich Enddatum.

Intraday-Termine (mit Startzeit) werden geometrisch wie Ein-Tages-Termine behandelt. Ein Intraday-Termin hat kein abweichendes Enddatum. Der Unterschied besteht lediglich darin, dass die Startzeit angezeigt wird und die Sortierung innerhalb einer Lane beeinflusst wird.

Die Farbe des Termin-Elements folgt der Tourfarbe oder ist neutral, wenn keine Tour zugeordnet ist.

## Konflikte innerhalb einer Lane: Mehrere Termine am selben Tag

Wenn innerhalb derselben Lane am selben Tag mehrere Termine angezeigt werden mÃ¼ssen, werden diese innerhalb der Lane vertikal gestapelt. Dabei gilt.

Zuerst werden All-day- und Mehrtages-Termine platziert.

Danach werden Intraday-Termine platziert.

Intraday-Termine werden nach Startzeit aufsteigend sortiert.

Bei gleichen Startzeiten wird als Tie-Breaker eine stabile Sortierung verwendet (z. B. ID).

In der Monats- und Jahresansicht wird die erforderliche HÃ¶he pro Reihe so bestimmt, dass alle Stapelungen in dieser Reihe sichtbar sind, oder es wird eine explizit definierte Verdichtungsregel verwendet.

In der Wochenansicht ist eine variable HÃ¶he aufgrund von Detaildarstellung zulÃ¤ssig.

## Render-Modi: Kompakt vs. Detailliert

Damit die Darstellung in Woche, Monat und Jahr konsistent bleibt, wird zwischen zwei Render-Modi unterschieden.

### Kompakter Modus (Balken)

Der Termin wird als flacher Balken dargestellt. Der Balken muss mindestens folgende Informationen darstellen kÃ¶nnen.

Erstens die **Kundennummer**.

Zweitens die **Postleitzahl**.

Drittens den **Projekttitel**.

AbhÃ¤ngig von der verfÃ¼gbaren Breite werden Teile dieser Informationen gekÃ¼rzt oder schrittweise ausgeblendet, ohne dass die Grunddarstellung bricht. Intraday-Termine zeigen zusÃ¤tzlich die Startzeit.

Dieser Modus ist der Standard in **Monatsansicht** und **Jahresansicht**.

### Detaillierter Modus (Termin-Panel)

Der Termin wird als grÃ¶ÃŸere FlÃ¤che dargestellt. Diese Darstellung muss mindestens folgenden Informationsumfang abbilden kÃ¶nnen.

Vom Projekt mÃ¼ssen **Titel**, **Beschreibung** und **Status** dargestellt werden.

Vom Kunden mÃ¼ssen mindestens **Kundennummer** und **Name** dargestellt werden.

AuÃŸerdem mÃ¼ssen die dem Termin **zugewiesenen Mitarbeiter** dargestellt werden kÃ¶nnen.

Dieser Modus wird in der **Wochenansicht** genutzt.

## Popover bei Mouse-Over

In Monats- und Jahresansicht wird beim Mouse-Over eines Termins ein Popover angezeigt, das die wichtigsten Informationen bÃ¼ndelt. Dieses Popover muss mindestens den Informationsumfang des detaillierten Termin-Panels enthalten und darf dieselben Inhaltsbausteine wiederverwenden, damit keine abweichenden Varianten entstehen.

Die Wochenansicht darf ein identisches Popover ebenfalls verwenden, sofern dies die Bedienbarkeit verbessert. Es dÃ¼rfen jedoch keine voneinander abweichenden Popover-Varianten entstehen.

## Wochenansicht: Detailkarten und Kollabierbarkeit

In der Wochenansicht gelten dieselben Lane-Regeln wie oben. Die Darstellung innerhalb einer Lane ist kollabierbar, d. h. Termine kÃ¶nnen zwischen kompakt und detailliert wechseln.

Die Lane-Reihenfolge bleibt stabil.

Die HÃ¶he darf sich verÃ¤ndern, wenn Termin-Panels aufgeklappt werden.

Die Interaktion â€žAlle aufklappenâ€œ wirkt als globaler Schalter fÃ¼r diesen Render-Modus.

## Monatsansicht: Balken und ReihenstabilitÃ¤t

In der Monatsansicht dominiert der kompakte Balkenmodus.

Alle Tage einer Kalenderreihe werden gleich hoch dargestellt.

Die erforderliche ReihenhÃ¶he wird so berechnet, dass die maximal benÃ¶tigte Slot-/Stapelanzahl innerhalb dieser Reihe passt.

Wenn die Zahl der Termine in einer Reihe sehr hoch ist, wird eine explizite Verdichtung verwendet, zum Beispiel â€žAnzeige nur der ersten N Termineâ€œ und eine Kennzeichnung wie â€ž+X weitereâ€œ. Die konkrete Verdichtung muss explizit festgelegt werden, damit das Verhalten deterministisch bleibt.

## Jahresansicht: Stark verdichtete Darstellung

In der Jahresansicht ist die TagesflÃ¤che noch kleiner als im Monat.

Es wird grundsÃ¤tzlich im kompakten Balkenmodus gerendert.

Informationen werden maximal reduziert.

Verdichtung ist typischerweise zwingend, wenn viele Termine auftreten.

## Drag & Drop: Verschieben von Terminen

Termine kÃ¶nnen per Drag & Drop verschoben werden.

Das Neupositionieren eines Termins lÃ¶st eine Neuberechnung der Lane-Zuordnung in den betroffenen sichtbaren Abschnitten aus.

Betroffen sind die Abschnitte, in denen der Termin vorher lag, und die Abschnitte, in denen er nachher liegt.

Bei Mehrtages-Terminen betrifft dies alle Abschnitte, die von der Spanne des Termins geschnitten werden.

Nach dem Drop mÃ¼ssen Sortierung und Lane-Zuordnung wieder deterministisch nach denselben Regeln hergestellt werden.

# FT (03) **Use Cases**

### **UC 03/01: UC: Kalenderansicht anzeigen (Woche/Monat/Mehrmonat/Jahr)**

Der Benutzer wÃ¤hlt eine der periodischen Ansichten und erhÃ¤lt die Terminbalken inklusive Kundenname und Postleitzahl.

### **UC 03/02: Kalenderzeitraum wechseln**

Der Benutzer navigiert vor/zurÃ¼ck oder wÃ¤hlt ein Datum; das System aktualisiert die Anzeige.

### **UC 03/03: Tourbezogene Planung anzeigen**

Der Benutzer wÃ¤hlt eine Tour; das System zeigt die Termine dieser Tour im gewÃ¤hlten Zeitraum.

### UC 03/04: Darstellung auf Mitarbeiter fokussieren

Der Benutzer wÃ¤hlt einen Mitarbeiter; das System zeigt dessen Termine im gewÃ¤hlten Zeitraum.

# FT (04): Tourenplanung

## FT (04) Ziel / Zweck

Dieses Feature ermÃ¶glicht der Disposition die Verwaltung von Touren zur logischen Gruppierung von Terminen im Kalender. Touren dienen ausschlieÃŸlich der organisatorischen BÃ¼ndelung und der visuellen Orientierung innerhalb der Terminplanung.

## FT (04) Fachliche Beschreibung

Eine Tour ist eine abstrakte Planungseinheit, mit der mehrere Termine logisch zusammengefasst werden kÃ¶nnen. Touren haben keinen fachlichen Bezug zu Fahrzeugen, Routen oder Arbeitszeiten. Sie dienen ausschlieÃŸlich der Strukturierung und besseren Ãœbersicht in der Terminplanung. Touren fungieren auch als Gruppenvorlage fÃ¼r die zeitweilige Gruppierung von Mitarbeitern.

Termine kÃ¶nnen einer Tour zugeordnet oder aus einer Tour entfernt werden. Alle Termine einer Tour teilen sich eine gemeinsame Farbe, die im Kalender als zentrales visuelles Ordnungsmerkmal dient. ZusÃ¤tzlich zeigen Termine ihre Postleitzahl an, um eine grobe rÃ¤umliche Orientierung innerhalb einer Tour zu ermÃ¶glichen.

Touren kÃ¶nnen manuell angelegt und bearbeitet werden. Eine Ãœbersicht ermÃ¶glicht es, alle einer Tour zugeordneten Termine gesammelt anzuzeigen. Touren enthalten selbst keine Terminlogik und keine zeitliche oder rÃ¤umliche Auswertungsfunktion.

## FT (04) Regeln & Randbedingungen

- Eine Tour dient ausschlieÃŸlich der organisatorischen Gruppierung von Terminen.
- Touren sind nicht an Fahrzeuge oder feste Ziele gebunden.
- Ein Termin kann maximal einer Tour zugeordnet sein.
- Eine Tour kann mehrere Termine enthalten.
- Die Farbe einer Tour ist das primÃ¤re visuelle Identifikationsmerkmal im Kalender.
- Touren enthalten keine Routen-, Zeit- oder Entfernungslogik.
- Touren dÃ¼rfen keine implizite Fahrzeugbedeutung haben.
- Eine Tour kann nur gelÃ¶scht werden, wenn ihr keine Termine mehr zugeordnet sind.
- Tour erhÃ¤lt eine **Mitarbeiterzuordnung** (0..n).
- **Mitarbeiter kann nur einer Tour angehÃ¶ren** (0..1 aus Sicht Mitarbeiter).
- Mehrere Mitarbeiter kÃ¶nnen einer Tour zugewiesen werden
- LÃ¶schen einer Tour: weiterhin nur, wenn keine Termine zugeordnet sind, aber zusÃ¤tzlich: **keine Kaskade**, sondern nur Mitarbeiter.Tour_ID auf NULL/0 setzen. (Die bestehende LÃ¶schregel â€œnur wenn keine Termineâ€ steht bereits drin.)

## FT (04) **Use Cases**

### **UC 04/01: Tour anlegen**

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine neue Tour zur organisatorischen Gruppierung von Terminen im Kalender anlegen.

### **Beschreibung**

Der Akteur legt eine neue Tour an. Der Name der Tour wird systemseitig automatisch generiert und ist nicht editierbar. Bei der Erstellung kÃ¶nnen die Farbe der Tour sowie optional eine Mitarbeiterzuordnung festgelegt werden. Das System stellt sicher, dass nur Mitarbeiter ausgewÃ¤hlt werden kÃ¶nnen, die aktuell keiner anderen Tour zugeordnet sind.

### **Vorbedingungen**

- Der Akteur ist angemeldet.
- Das System ist betriebsbereit.
- Die Tourenverwaltung ist verfÃ¼gbar.
- Mitarbeiter existieren optional im System.

### **Ablauf**

1. Der Akteur Ã¶ffnet die Tourenverwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žTour anlegenâ€œ.
3. Das System erzeugt einen neuen Tourdatensatz mit einem automatisch generierten Namen.
4. Das System zeigt den generierten Namen als read-only an.
5. Der Akteur wÃ¤hlt eine Farbe fÃ¼r die Tour aus.
6. Das System bietet im Auswahlfeld ausschlieÃŸlich Mitarbeiter an, die derzeit keiner Tour zugeordnet sind.
7. Der Akteur kann optional einen oder mehrere angebotene Mitarbeiter hinzufÃ¼gen.
8. Der Akteur bestÃ¤tigt die Eingabe.
9. Das System speichert die neue Tour.
10. Das System aktualisiert alle relevanten Sichten.

### **AlternativablÃ¤ufe**

- **Abbruch durch den Akteur:**
    
    Die Tour wird nicht gespeichert.
    
- **Technischer Konflikt (z. B. parallele Zuordnung eines Mitarbeiters):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Die neue Tour ist im System angelegt.
- Der Tourname ist systemseitig vergeben und unverÃ¤nderlich.
- Die Tour besitzt eine definierte Farbe.
- Die zugeordneten Mitarbeiter sind eindeutig dieser Tour zugeordnet.
- Kein Mitarbeiter ist mehreren Touren zugeordnet.
- Die Tour steht fÃ¼r Terminzuweisungen zur VerfÃ¼gung.
- Kalender- und Wochenansichten berÃ¼cksichtigen die neue Tour korrekt.

### **UC 04/02: Tour bearbeiten**

### **Akteur**

Disponent, Administrator

### **Ziel**

Die Eigenschaften einer bestehenden Tour anpassen, indem Farbe und Mitarbeiterliste geÃ¤ndert werden.

### **Beschreibung**

Der Akteur bearbeitet eine vorhandene Tour. Der Name der Tour ist systemseitig autogeneriert und nicht verÃ¤nderbar. Ã„nderbar sind ausschlieÃŸlich die Farbe der Tour sowie die zugeordneten Mitarbeiter. Das System stellt sicher, dass die Regel â€žEin Mitarbeiter kann nur einer Tour angehÃ¶renâ€œ eingehalten wird.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Mitarbeiter existieren im System.

### **Ablauf**

1. Der Akteur Ã¶ffnet die Tourenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Tour aus.
3. Das System zeigt die Tourdetails an.
4. Der Name der Tour wird als read-only angezeigt.
5. Das System zeigt die aktuell zugeordneten Mitarbeiter an.
6. Das System bietet im Auswahlfeld ausschlieÃŸlich Mitarbeiter an, die keiner anderen Tour zugeordnet sind.
7. Der Akteur Ã¤ndert die Farbe der Tour und/oder passt die Mitarbeiterliste an.
8. Der Akteur bestÃ¤tigt die Ã„nderungen.
9. Das System speichert die Ã„nderungen.
10. Das System aktualisiert alle relevanten Sichten.

### **AlternativablÃ¤ufe**

- **Abbruch durch den Akteur:**
    
    Das System verwirft die Ã„nderungen.
    
- **Technischer Konflikt (z. B. parallele Ã„nderung):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Der Tourname bleibt unverÃ¤ndert.
- Die Tourfarbe ist aktualisiert.
- Die Mitarbeiterliste entspricht der bestÃ¤tigten Auswahl.
- Kein Mitarbeiter ist mehreren Touren zugeordnet.
- Kalenderansichten, WochenÃ¼bersichten und Kartenansicht Ã¼bernehmen die aktualisierte Farbe und Mitarbeiterzuordnung korrekt.

### UC **04/**03: Mitarbeiter einer Tour zuweisen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tour-Vorlage anpassen, indem Mitarbeiter hinzugefÃ¼gt oder entfernt werden, ohne gegen die Regel zu verstoÃŸen, dass ein Mitarbeiter nur einer Tour angehÃ¶ren darf.

### **Beschreibung**

Der Akteur bearbeitet eine bestehende Tour und passt deren Mitarbeiterliste an. Das System stellt sicher, dass nur Mitarbeiter hinzugefÃ¼gt werden kÃ¶nnen, die aktuell keiner anderen Tour zugeordnet sind. Dadurch wird verhindert, dass ein Mitarbeiter mehreren Touren gleichzeitig angehÃ¶rt.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Mitarbeiter existieren im System.

### **Ablauf**

1. Der Akteur Ã¶ffnet die Tourenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Tour aus.
3. Das System zeigt die aktuell zugeordneten Mitarbeiter dieser Tour an.
4. Das System bietet im Auswahlfeld ausschlieÃŸlich Mitarbeiter an, die derzeit keiner Tour zugeordnet sind.
5. Der Akteur fÃ¼gt einen oder mehrere angebotene Mitarbeiter hinzu oder entfernt bestehende Mitarbeiter aus der Tour.
6. Der Akteur bestÃ¤tigt die Ã„nderungen.
7. Das System speichert die aktualisierte Tourzuordnung.
8. Das System aktualisiert alle relevanten Sichten.

### **AlternativablÃ¤ufe**

- **Abbruch durch den Akteur:**
    
    Das System verwirft die Ã„nderungen.
    
- **Technischer Konflikt (z. B. parallele Ã„nderung):**
    
    Falls ein Mitarbeiter zwischenzeitlich einer anderen Tour zugeordnet wurde, blockiert das System die Speicherung und zeigt eine eindeutige Fehlermeldung an.
    

### **Ergebnis**

- Jeder Mitarbeiter ist maximal einer Tour zugeordnet.
- Es existieren keine Mehrfachzuordnungen.
- Die Tour enthÃ¤lt ausschlieÃŸlich gÃ¼ltig zugewiesene Mitarbeiter.
- WochenÃ¼bersichten und Mitarbeiterdetailansichten spiegeln den aktuellen Zustand korrekt wider.

### UC **04/**04: Tour lÃ¶schen

### **Akteur**

Disponent, Administrator

### **Ziel**

Eine bestehende Tour vollstÃ¤ndig aus dem System entfernen, sofern keine Termine mehr dieser Tour zugeordnet sind.

### **Beschreibung**

Der Akteur lÃ¶scht eine bestehende Tour aus der Tourenverwaltung. Das LÃ¶schen ist nur zulÃ¤ssig, wenn der Tour keine Termine mehr zugeordnet sind. Beim erfolgreichen LÃ¶schen dÃ¼rfen keine inkonsistenten ZustÃ¤nde entstehen. Insbesondere dÃ¼rfen Mitarbeiter weiterhin bestehen bleiben, verlieren jedoch ihre Tourzuordnung.

### **Vorbedingungen**

- Die Tour existiert.
- Der Akteur ist berechtigt, Touren zu verwalten.
- Der Tour sind keine Termine zugeordnet.

### **Ablauf**

1. Der Akteur Ã¶ffnet die Tourenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Tour aus.
3. Der Akteur lÃ¶st die Funktion â€žTour lÃ¶schenâ€œ aus.
4. Das System prÃ¼ft, ob der Tour Termine zugeordnet sind.
5. Das System lÃ¶scht die Tour.
6. Das System setzt bei allen zuvor zugeordneten Mitarbeitern die Tour_ID auf NULL bzw. entfernt die Tourreferenz.
7. Das System aktualisiert alle Sichten, in denen die Tour angezeigt wurde.

### **AlternativablÃ¤ufe**

- **Tour enthÃ¤lt noch Termine:**
    
    Das System blockiert den LÃ¶schvorgang und zeigt eine eindeutige Fehlermeldung an. Es wird nichts gelÃ¶scht.
    
- **Abbruch durch den Akteur:**
    
    Der LÃ¶schvorgang wird nicht ausgefÃ¼hrt. Es erfolgen keine Ã„nderungen.
    

### **Ergebnis**

Die Tour existiert nicht mehr im System.

- Es existiert kein Tour-Datensatz mehr in der Datenbank.
- Es bestehen keine Mitarbeiterreferenzen mehr auf diese Tour.
- Alle betroffenen Sichten zeigen die Tour nicht mehr an.
- Es sind keine TeilzustÃ¤nde oder verwaisten Referenzen vorhanden.

### UC **04/**05: Tourliste anzeigen

### **Akteur**

Disponent, Administrator, Monteur

### **Ziel**

Alle bestehenden Touren im System in einer Ãœbersicht anzeigen, entsprechend der Rolle des Akteurs.

### **Beschreibung**

Der Akteur ruft die Tourenverwaltung auf. Das System zeigt eine Ãœbersicht aller vorhandenen Touren an. Die Darstellung enthÃ¤lt die grundlegenden Eigenschaften der Touren. AbhÃ¤ngig von der Rolle des Akteurs werden zusÃ¤tzlich Mutationsfunktionen angezeigt oder ausgeblendet.

### **Vorbedingungen**

- Der Akteur ist angemeldet.
- Touren kÃ¶nnen im System vorhanden oder nicht vorhanden sein.

### **Ablauf**

1. Der Akteur Ã¶ffnet die TourenÃ¼bersicht.
2. Das System ermittelt alle bestehenden Touren.
3. Das System stellt fÃ¼r jede Tour mindestens folgende Informationen dar:
    - Systemseitig generierter Name
    - Farbe
    - Anzahl der zugeordneten Mitarbeiter
4. Das System rendert die OberflÃ¤che rollenabhÃ¤ngig:
    - Disponent und Administrator sehen zusÃ¤tzlich die Funktionen zum Anlegen, Bearbeiten und LÃ¶schen.
    - Monteur sieht die Touren ausschlieÃŸlich im Lesemodus ohne Mutationsfunktionen.
5. Das System stellt sicher, dass nicht berechtigte UI-Elemente fÃ¼r Monteure nicht gerendert werden.

### **AlternativablÃ¤ufe**

- **Keine Touren vorhanden:**
    
    Das System zeigt eine leere Ãœbersicht mit entsprechendem Hinweis an.
    
- **Direkter Zugriff auf eine Mutationsfunktion durch nicht berechtigten Akteur:**
    
    Das System blockiert die Aktion serverseitig und fÃ¼hrt keine DatenÃ¤nderung aus.
    

### **Ergebnis**

- Der Akteur sieht eine vollstÃ¤ndige und konsistente Ãœbersicht aller Touren.
- Die Darstellung entspricht der Rolle des Akteurs.
- Monteure kÃ¶nnen keine Tourdaten verÃ¤ndern.
- Es entstehen keine inkonsistenten ZustÃ¤nde durch unzulÃ¤ssige Aktionen.

### UC **04/**06: Kalenderdarstellung nach TourÃ¤nderung aktualisieren

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass Ã„nderungen an einer Tour (Farbe oder Mitarbeiterzuordnung) unmittelbar und konsistent in allen Kalenderansichten sichtbar werden.

### **Beschreibung**

Der Akteur Ã¤ndert Eigenschaften einer bestehenden Tour. Das System Ã¼bernimmt diese Ã„nderungen in allen Kalenderansichten, in denen Termine dieser Tour dargestellt werden. Die Kalenderdarstellung leitet ihre Informationen ausschlieÃŸlich aus den aktuellen Tour- und Termindaten ab. Es dÃ¼rfen keine veralteten oder inkonsistenten Darstellungen bestehen bleiben.

### **Vorbedingungen**

- Eine Tour existiert.
- Der Tour sind mindestens ein oder mehrere Termine zugeordnet.
- Der Akteur ist berechtigt, Touren zu bearbeiten.

### **Ablauf**

1. Der Akteur bearbeitet eine bestehende Tour.
2. Der Akteur Ã¤ndert die Farbe der Tour und/oder die Mitarbeiterliste.
3. Der Akteur bestÃ¤tigt die Ã„nderungen.
4. Das System speichert die aktualisierten Tourdaten.
5. Das System aktualisiert alle Kalenderansichten.
6. Das System stellt sicher:
    - Termine dieser Tour werden mit der neuen Farbe dargestellt.
    - Die Terminzuordnungen bleiben fachlich unverÃ¤ndert.
    - Andere Touren und tourlose Termine bleiben unverÃ¤ndert dargestellt.

### **AlternativablÃ¤ufe**

- **Abbruch durch den Akteur:**
    
    Es erfolgt keine Ã„nderung in den Kalenderansichten.
    
- **Tour besitzt keine Termine:**
    
    Es erfolgt keine sichtbare Ã„nderung im Kalender, da keine Termine betroffen sind.
    

### **Ergebnis**

- Alle Termine der geÃ¤nderten Tour werden konsistent mit der aktuellen Tourfarbe dargestellt.
- Keine anderen Termine werden unbeabsichtigt verÃ¤ndert.
- Es existieren keine widersprÃ¼chlichen oder veralteten Darstellungen.
- Die Kalenderansicht entspricht jederzeit dem aktuellen Datenzustand.

### UC **04/**07: WochenÃ¼bersicht nach TourÃ¤nderung korrekt ableiten

### **Akteur**

Disponent

### **Ziel**

Sicherstellen, dass die mitarbeiter- und tourbezogenen WochenÃ¼bersichten jederzeit den aktuellen Tour- und Mitarbeiterzuordnungen entsprechen.

### **Beschreibung**

Der Akteur ruft eine mitarbeiterbezogene oder tourbezogene WochenÃ¼bersicht auf. Die angezeigten Informationen werden vollstÃ¤ndig aus den aktuellen Termin- und Tourdaten abgeleitet. Ã„nderungen an Tourfarbe oder Mitarbeiterzuordnung dÃ¼rfen keine inkonsistenten oder veralteten EintrÃ¤ge erzeugen.

### **Vorbedingungen**

- Termine mit Tour- und Mitarbeiterzuordnung existieren.
- Mindestens eine Kalenderwoche enthÃ¤lt relevante Termine.
- Der Akteur ist berechtigt, DispositionsÃ¼bersichten einzusehen.

### **Ablauf**

1. Der Akteur ruft eine WochenÃ¼bersicht auf (mitarbeiterbezogen oder tourbezogen).
2. Das System ermittelt alle relevanten Termine.
3. Das System leitet aus den Terminen die zugehÃ¶rigen Touren und Mitarbeiter pro Kalenderwoche ab.
4. Der Akteur nimmt eine Ã„nderung an einer Tour vor (z. B. FarbÃ¤nderung oder Anpassung der Mitarbeiterliste).
5. Das System speichert die Ã„nderung.
6. Das System aktualisiert die WochenÃ¼bersicht.
7. Das System stellt sicher:
    - Die Zuordnung von Mitarbeitern zu Touren pro Woche entspricht dem aktuellen Datenstand.
    - Entfernte Mitarbeiter erscheinen nicht mehr in der betroffenen Woche.
    - Neu hinzugefÃ¼gte Mitarbeiter erscheinen korrekt in der betroffenen Woche.
    - Leere Wochen werden entsprechend als leer dargestellt.

### **AlternativablÃ¤ufe**

- **Keine Termine vorhanden:**
    
    Das System zeigt eine leere Ãœbersicht.
    
- **Abbruch der TourÃ¤nderung:**
    
    Die WochenÃ¼bersicht bleibt unverÃ¤ndert.
    

### **Ergebnis**

- Die WochenÃ¼bersicht ist konsistent mit dem aktuellen Zustand von Terminen, Touren und Mitarbeiterzuordnungen.
- Es existieren keine veralteten oder widersprÃ¼chlichen Anzeigen.
- Die Ãœbersicht bleibt rein informativ und verÃ¤ndert keine fachlichen Daten.

### UC **04/**08: Parallele Mitarbeiterzuweisung zu unterschiedlichen Touren

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass ein Mitarbeiter bei gleichzeitigen Bearbeitungen niemals mehreren Touren zugeordnet wird.

### **Beschreibung**

Zwei Akteure versuchen nahezu zeitgleich, denselben Mitarbeiter unterschiedlichen Touren zuzuweisen. Das System muss sicherstellen, dass die Regel â€žEin Mitarbeiter kann nur einer Tour angehÃ¶renâ€œ jederzeit eingehalten wird.

### **Vorbedingungen**

- Mindestens zwei Touren existieren.
- Ein Mitarbeiter existiert und ist aktuell keiner Tour zugeordnet.
- Zwei Akteure sind gleichzeitig angemeldet.

### **Ablauf**

1. Akteur A Ã¶ffnet Tour A zur Bearbeitung.
2. Akteur B Ã¶ffnet Tour B zur Bearbeitung.
3. Beide Akteure sehen denselben Mitarbeiter als auswÃ¤hlbar.
4. Akteur A fÃ¼gt den Mitarbeiter Tour A hinzu und speichert.
5. Das System speichert die Zuordnung erfolgreich.
6. Akteur B versucht anschlieÃŸend, denselben Mitarbeiter Tour B hinzuzufÃ¼gen und zu speichern.
7. Das System erkennt die zwischenzeitliche Zuordnung des Mitarbeiters.
8. Das System blockiert die Speicherung bei Akteur B und zeigt eine eindeutige Fehlermeldung an.

### **AlternativablÃ¤ufe**

- Akteur B speichert zuerst â†’ dann wird Akteur A blockiert.
- Einer der Akteure bricht vor Speicherung ab â†’ keine Konfliktsituation.

### **Ergebnis**

- Der Mitarbeiter ist genau einer Tour zugeordnet.
- Es existiert keine Mehrfachzuordnung.
- Das System bleibt konsistent.

### UC **04/**09: Parallele Bearbeitung derselben Tour

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass parallele Ã„nderungen an derselben Tour nicht zu stillen Ãœberschreibungen oder inkonsistenten ZustÃ¤nden fÃ¼hren.

### **Beschreibung**

Zwei Akteure bearbeiten gleichzeitig dieselbe Tour. Ã„nderungen an Farbe oder Mitarbeiterliste dÃ¼rfen nicht unkontrolliert Ã¼berschrieben werden.

### **Vorbedingungen**

- Eine Tour existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Beide Akteure Ã¶ffnen dieselbe Tour zur Bearbeitung.

### **Ablauf**

1. Akteur A Ã¶ffnet die Tour zur Bearbeitung.
2. Akteur B Ã¶ffnet dieselbe Tour zur Bearbeitung.
3. Akteur A Ã¤ndert die Farbe oder Mitarbeiterliste und speichert.
4. Das System speichert die Ã„nderung.
5. Akteur B versucht anschlieÃŸend, seine Version zu speichern.
6. Das System erkennt, dass sich der Datensatz seit dem Ã–ffnen geÃ¤ndert hat.
7. Das System blockiert die Speicherung und fordert zur Aktualisierung auf.

### **AlternativablÃ¤ufe**

- Akteur B speichert zuerst â†’ dann wird Akteur A blockiert.
- Ein Akteur bricht die Bearbeitung ab â†’ keine Konfliktsituation.

### **Ergebnis**

- Es entsteht keine stille Ãœberschreibung.
- Die Tour befindet sich in einem konsistenten Zustand.
- Ã„nderungen erfolgen kontrolliert und nachvollziehbar.

### UC **04/**10: LÃ¶schkonflikt bei paralleler Terminzuordnung

### **Akteur**

Disponent, Administrator

### **Ziel**

Sicherstellen, dass eine Tour nicht gelÃ¶scht wird, wenn ihr parallel ein Termin zugeordnet wird.

### **Beschreibung**

Ein Akteur versucht, eine Tour zu lÃ¶schen, wÃ¤hrend ein anderer Akteur parallel einen Termin dieser Tour zuordnet. Das System muss verhindern, dass die LÃ¶schregel verletzt wird.

### **Vorbedingungen**

- Eine Tour existiert.
- Der Tour sind aktuell keine Termine zugeordnet.
- Zwei Akteure sind gleichzeitig angemeldet.

### **Ablauf**

1. Akteur A Ã¶ffnet die Tour und initiiert den LÃ¶schvorgang.
2. Vor Abschluss des LÃ¶schvorgangs ordnet Akteur B einen Termin dieser Tour zu.
3. Das System speichert die Terminzuordnung.
4. Das System prÃ¼ft beim LÃ¶schvorgang erneut, ob der Tour Termine zugeordnet sind.
5. Das System erkennt die neue Zuordnung.
6. Das System blockiert den LÃ¶schvorgang.

### **AlternativablÃ¤ufe**

- Der LÃ¶schvorgang wird vollstÃ¤ndig abgeschlossen, bevor ein Termin zugeordnet wird â†’ die Terminzuordnung schlÃ¤gt fehl.
- Einer der Akteure bricht ab â†’ kein Konflikt.

### **Ergebnis**

- Eine Tour wird niemals gelÃ¶scht, wenn ihr mindestens ein Termin zugeordnet ist.
- Es entstehen keine verwaisten Terminreferenzen.
- Der Datenzustand bleibt konsistent.

# FT (05): Mitarbeiterverwaltung

## FT (05) Ziel / Zweck

Dieses Feature dient der zentralen Verwaltung von Mitarbeitern als ausfÃ¼hrende Ressourcen fÃ¼r Termine. Ziel ist es, Mitarbeiter als Stammdaten zu pflegen und ihre EinsÃ¤tze Ã¼ber Termine hinweg nachvollziehbar darzustellen, ohne Terminplanung und Ressourcendarstellung fachlich zu vermischen.

## FT (05) Fachliche Beschreibung

Die Mitarbeiterverwaltung stellt Funktionen zum Anlegen, Bearbeiten und Anzeigen von Mitarbeitern bereit. Mitarbeiter kÃ¶nnen unabhÃ¤ngig von Terminen existieren und werden im Rahmen der Terminvergabe optional Terminen zugewiesen. Die Zuweisung selbst erfolgt nicht innerhalb dieses Features, sondern im Kontext der Terminplanung.
Disponenten erhalten serverseitig nur aktive Mitarbeiter und kÃ¶nnen Mitarbeiter damit nur aus dem aktiven Bestand auswÃ¤hlen. Die Verwaltung von aktiven und inaktiven Mitarbeitern (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation.
FÃ¼r jeden Mitarbeiter ist eine TerminÃ¼bersicht verfÃ¼gbar. Diese Ãœbersicht zeigt alle Termine, denen der Mitarbeiter aktuell oder in der Vergangenheit zugewiesen war, und bildet damit die Einsatzhistorie des Mitarbeiters ab. Die Terminliste wird ausschlieÃŸlich aus der Relation zwischen Termin und Mitarbeiter abgeleitet und ist jederzeit vollstÃ¤ndig einsehbar.
Ã„nderungen an zukÃ¼nftigen Terminen wirken sich unmittelbar auf die Terminliste eines Mitarbeiters aus. Vergangene Termine sind read-only und dÃ¼rfen nicht nachtrÃ¤glich verÃ¤ndert werden, um die StabilitÃ¤t der Einsatzhistorie sicherzustellen.
In der TerminÃ¼bersicht eines Mitarbeiters sind neben Zeitraum und Bezeichnung des Termins auch die zugehÃ¶rige Tour sowie der Kunde erkennbar, da Termine diese Informationen referenzieren.
In der Mitarbeiterdetailansicht kÃ¶nnen dem Mitarbeiter Dokumente als AnhÃ¤nge zugeordnet werden. Der Disponent kann AnhÃ¤nge hochladen, in einer Anhangsliste einsehen, per Vorschau Ã¶ffnen und bei Bedarf herunterladen. Eine LÃ¶schfunktion fÃ¼r AnhÃ¤nge ist nicht vorgesehen.

## FT (05) Regeln & Randbedingungen

- Mitarbeiter kÃ¶nnen unabhÃ¤ngig von Terminen existieren.
- Die Zuweisung eines Mitarbeiters zu einem Termin ist optional.
- Ein Mitarbeiter kann einem oder mehreren Terminen zugewiesen sein.
- Disponenten erhalten serverseitig nur aktive Mitarbeiter zur Auswahl.
- Die Terminliste eines Mitarbeiters wird ausschlieÃŸlich aus den aktuellen Termindaten abgeleitet.
- Vergangene Termine sind read-only und dÃ¼rfen nicht verÃ¤ndert werden.
- Wird ein Mitarbeiter vor DurchfÃ¼hrung eines Termins ersetzt, darf dieser Termin nicht mehr in der Terminliste des abgelÃ¶sten Mitarbeiters erscheinen.
- Es dÃ¼rfen keine widersprÃ¼chlichen ZustÃ¤nde entstehen, bei denen ein Mitarbeiter als zugewiesen gilt, ohne dass ein entsprechender Termin existiert.
- Mitarbeiter existieren unabhÃ¤ngig von Tour-ZugehÃ¶rigkeit und Team-ZugehÃ¶rigkeit. LÃ¶schungen von Tour oder Team wirken sich nur auf die FK-Eigenschaften des Mitarbeiters aus (Setzen auf NULL).
- MitarbeiteranhÃ¤nge sind mitarbeiterbezogen und unabhÃ¤ngig von Terminen; AnhÃ¤nge kÃ¶nnen hinzugefÃ¼gt und heruntergeladen werden, eine physische LÃ¶schung ist nicht vorgesehen.

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

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt die Funktion â€žMitarbeiter anlegenâ€œ.
3. System Ã¶ffnet ein leeres Mitarbeiterformular im Modus â€žNeuâ€œ.
4. Akteur erfasst die erforderlichen Stammdaten.
5. Akteur speichert den neuen Mitarbeiter.
6. System validiert alle Pflichtfelder.
7. System legt den Mitarbeiter mit `is_active = true` an.
8. System persistiert den Datensatz.
9. System aktualisiert alle abhÃ¤ngigen Listen- und Auswahlansichten.

## Alternativen

- Pflichtfeld fehlt oder ist ungÃ¼ltig â†’
    
    System speichert nicht und liefert Validierungsfehler (HTTP 400 bei API-Aufruf).
    
- Akteur ohne Berechtigung â†’
    
    System blockiert den Zugriff (HTTP 403).
    
- Technischer Persistenzfehler â†’
    
    System liefert Fehlerstatus (HTTP 500) und speichert keinen Datensatz.
    
- Zwei Akteure legen gleichzeitig Mitarbeiter mit identischen Stammdaten an â†’
    
    Beide DatensÃ¤tze werden unabhÃ¤ngig voneinander gespeichert, da keine Eindeutigkeitsregel existiert.
    

## Ergebnis

- Ein neuer Mitarbeiterdatensatz existiert persistent in der Datenbank.
- Der Mitarbeiter besitzt standardmÃ¤ÃŸig `is_active = true`.
- Der Mitarbeiter erscheint:
    - in der Mitarbeiterlistenansicht (Board und Tabelle),
    - in Dialoglisten zur Mitarbeiterzuweisung,
    - in Terminformularen zur Auswahl,
    - in Filtern, sofern aktive Mitarbeiter abgefragt werden.
- Es existieren keine impliziten Beziehungen zu Terminen, Touren oder Teams.
- Die TerminÃ¼bersicht des Mitarbeiters ist initial leer.
- Es wurden keine bestehenden Termine oder Projekte verÃ¤ndert.

### **UC 05/02: Mitarbeiter bearbeiten**

## Akteur

Administrator, Disponent

## Ziel

Bestehende Stammdaten eines Mitarbeiters Ã¤ndern, ohne Termin- oder Historienlogik zu beeinflussen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator oder Disponent.
- Der Mitarbeiterdatensatz enthÃ¤lt eine gÃ¼ltige Versionskennung (Optimistic Locking).
- Der Mitarbeiter ist nicht physisch gelÃ¶scht.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen bestehenden Mitarbeiter.
3. System lÃ¤dt die aktuellen Stammdaten einschlieÃŸlich Versionskennung.
4. Akteur Ã¤ndert zulÃ¤ssige Felder.
5. Akteur speichert die Ã„nderungen.
6. System prÃ¼ft die Versionskennung.
7. System validiert die Eingaben.
8. System persistiert die Ã„nderungen.
9. System erhÃ¶ht die Versionskennung.
10. System aktualisiert alle abhÃ¤ngigen Anzeige- und Auswahlansichten.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung â†’
    
    System blockiert mit 403.
    
- Versionskonflikt (parallele Bearbeitung) â†’
    
    System blockiert mit 409 und speichert nicht.
    
- UngÃ¼ltige Eingaben â†’
    
    System antwortet mit 400 und speichert nicht.
    
- Technischer Persistenzfehler â†’
    
    System antwortet mit 500.
    

## Ergebnis

- Die geÃ¤nderten Stammdaten sind persistent gespeichert.
- Die Versionskennung wurde erhÃ¶ht.
- Terminzuweisungen bleiben unverÃ¤ndert.
- Historische Termine bleiben unverÃ¤ndert.
- Kalenderansichten, Kartenansichten und Terminformulare zeigen bei erneuter Abfrage die aktualisierten Mitarbeiterdaten.
- Es entstehen keine inkonsistenten FK-ZustÃ¤nde.

### **UC 05/03: Mitarbeiter-Termine anzeigen**

**Akteur**

Administrator, Disponent, Leser

**Ziel**

Die Stammdaten eines Mitarbeiters einsehen und nachvollziehen, welchen Terminen dieser Mitarbeiter aktuell oder in der Vergangenheit zugeordnet ist.

**Vorbedingungen**

- Der Mitarbeiter existiert.
- Der Nutzer ist berechtigt, Mitarbeiterdaten einzusehen.

**AuslÃ¶ser**

Der Nutzer wÃ¤hlt einen Mitarbeiter zur Anzeige aus.

**Ablauf**

1. Der Nutzer wÃ¤hlt einen bestehenden Mitarbeiter aus.
2. Das System zeigt die Stammdaten des Mitarbeiters an.
3. Das System ermittelt alle Termine (Terminauswahl in der Sidebar und alle Termine auf Anfrage), denen der Mitarbeiter zugewiesen ist, Ã¼ber die Termin-Mitarbeiter-Relation.
4. Das System zeigt zu jedem Termin die relevanten Informationen an.
5. Das System stellt sicher, dass auch vergangene Termine angezeigt werden.

**AlternativablÃ¤ufe**

- Dem Mitarbeiter sind keine Termine zugewiesen: Das System zeigt eine leere Terminliste an.

**Ergebnis**

Die Stammdaten des Mitarbeiters sowie eine vollstÃ¤ndige Ãœbersicht aller zugeordneten Termine sind sichtbar.

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

Einen bestehenden Mitarbeiter fÃ¼r zukÃ¼nftige DispositionsvorgÃ¤nge sperren, ohne historische oder bestehende Terminzuordnungen zu verÃ¤ndern.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell aktiv (`is_active = true`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen aktiven Mitarbeiter.
3. Akteur lÃ¶st die Aktion â€žDeaktivierenâ€œ aus.
4. System prÃ¼ft die Berechtigung.
5. System prÃ¼ft die Versionskennung.
6. System setzt `is_active = false`.
7. System persistiert die Ã„nderung.
8. System erhÃ¶ht die Versionskennung.
9. System aktualisiert abhÃ¤ngige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle â†’
    
    System blockiert mit 403.
    
- Versionskonflikt â†’
    
    System blockiert mit 409.
    
- Mitarbeiter bereits deaktiviert â†’
    
    System antwortet mit 200 ohne ZustandsÃ¤nderung.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.
    

## Ergebnis

- Mitarbeiter ist im System weiterhin vorhanden.
- `is_active = false`.
- Bestehende Terminzuordnungen bleiben unverÃ¤ndert.
- Vergangene und zukÃ¼nftige Termine zeigen den Mitarbeiter weiterhin an.
- Der Mitarbeiter erscheint nicht mehr:
    - in Mitarbeiter-Auswahllisten fÃ¼r Disponenten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern, die nur aktive Mitarbeiter berÃ¼cksichtigen.
- Administratoren kÃ¶nnen den Mitarbeiter weiterhin in der Stammdatenliste sehen.

### **UC 05/05: Mitarbeiter reaktivieren**

## Akteur

Administrator

## Ziel

Einen zuvor deaktivierten Mitarbeiter wieder fÃ¼r zukÃ¼nftige DispositionsvorgÃ¤nge freigeben.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Mitarbeiter ist aktuell deaktiviert (`is_active = false`).
- Eine gÃ¼ltige Versionskennung liegt vor.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen deaktivierten Mitarbeiter.
3. Akteur lÃ¶st die Aktion â€žReaktivierenâ€œ aus.
4. System prÃ¼ft die Berechtigung.
5. System prÃ¼ft die Versionskennung.
6. System setzt `is_active = true`.
7. System persistiert die Ã„nderung.
8. System erhÃ¶ht die Versionskennung.
9. System aktualisiert abhÃ¤ngige Auswahl- und Listenansichten.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Admin-Rolle â†’
    
    System blockiert mit 403.
    
- Versionskonflikt â†’
    
    System blockiert mit 409.
    
- Mitarbeiter bereits aktiv â†’
    
    System antwortet mit 200 ohne ZustandsÃ¤nderung.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.
    

## Ergebnis

- Mitarbeiter ist wieder aktiv.
- `is_active = true`.
- Bestehende Terminzuordnungen bleiben unverÃ¤ndert.
- Der Mitarbeiter erscheint wieder:
    - in Mitarbeiterlisten,
    - in Dialogen zur Terminzuweisung,
    - in Filtern fÃ¼r aktive Mitarbeiter.
- Es wurden keine bestehenden Termine oder Projekte verÃ¤ndert.

### UC **05/**06: MitarbeiteranhÃ¤nge verwalten

## Akteur

Administrator, Disponent

## Ziel

Dokumente einem Mitarbeiter hinzufÃ¼gen sowie bestehende AnhÃ¤nge einsehen und herunterladen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r Mitarbeiter.
- Die hochzuladende Datei entspricht den erlaubten Formaten und GrÃ¶ÃŸenbeschrÃ¤nkungen.

## Ablauf â€“ Upload

1. Akteur Ã¶ffnet die Detailansicht eines Mitarbeiters.
2. Akteur wÃ¤hlt die Funktion â€žAnhang hinzufÃ¼genâ€œ.
3. Akteur wÃ¤hlt eine Datei aus.
4. System prÃ¼ft:
    - Dateiformat,
    - DateigrÃ¶ÃŸe,
    - Authentifizierung.
5. System speichert die Datei serverseitig.
6. System legt einen Attachment-Datensatz mit Parent-Referenz auf den Mitarbeiter an.
7. System gibt die gespeicherten Metadaten zurÃ¼ck.
8. System aktualisiert die Anhangsliste in der UI.

## Ablauf â€“ Anzeigen / Herunterladen

1. Akteur Ã¶ffnet die Anhangsliste.
2. System lÃ¤dt alle dem Mitarbeiter zugeordneten Attachments.
3. Akteur wÃ¤hlt einen Anhang.
4. System liefert Datei Ã¼ber gesicherten Download-Endpunkt aus.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Berechtigung â†’
    
    System blockiert mit 403.
    
- UngÃ¼ltiges Dateiformat oder GrÃ¶ÃŸe â†’
    
    System antwortet mit 400.
    
- Technischer Speicherfehler â†’
    
    System antwortet mit 500.
    
- DELETE-Anfrage auf Attachment â†’
    
    System blockiert mit 405 oder 403.
    

## Ergebnis

- Der Anhang ist eindeutig dem Mitarbeiter zugeordnet.
- Keine Termin- oder Projektdaten wurden verÃ¤ndert.
- Mehrere AnhÃ¤nge sind parallel zulÃ¤ssig.
- AnhÃ¤nge existieren unabhÃ¤ngig von Terminzuweisungen.
- Es erfolgt keine physische LÃ¶schung bestehender Dateien.
- Parallele Uploads verschiedener Akteure sind zulÃ¤ssig und erzeugen getrennte DatensÃ¤tze.

### UC **05/**07: Mitarbeiter anzeigen

## Akteur

Administrator, Disponent, Monteur (Leserolle)

## Ziel

Mitarbeiterdaten in Listen- und Detailansichten anzeigen, rollenbasiert gefiltert.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Mitarbeiterbestand ist im System vorhanden.

## Ablauf â€“ Listenansicht

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. System ermittelt die Rolle des Akteurs.
3. System lÃ¤dt Mitarbeiterdaten:
    - Administrator erhÃ¤lt aktive und inaktive Mitarbeiter.
    - Disponent erhÃ¤lt ausschlieÃŸlich aktive Mitarbeiter.
    - Monteur erhÃ¤lt ausschlieÃŸlich Lesedaten gemÃ¤ÃŸ seiner Rolle.
4. System stellt Daten in Board- oder Tabellenansicht dar.

## Ablauf â€“ Detailansicht

1. Akteur wÃ¤hlt einen Mitarbeiter aus der Liste.
2. System lÃ¤dt vollstÃ¤ndige Stammdaten.
3. System lÃ¤dt zugehÃ¶rige AnhÃ¤nge.
4. System lÃ¤dt TerminÃ¼bersicht gemÃ¤ÃŸ UC 03.
5. System zeigt Detailansicht an.

## Alternativen

- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Leserechte â†’
    
    System blockiert mit 403.
    
- Keine Mitarbeiter vorhanden â†’
    
    System zeigt leere Liste ohne Fehler.
    
- Parallel wird Mitarbeiter deaktiviert â†’
    
    Disponent erhÃ¤lt bei nÃ¤chster Abfrage aktualisierte Liste ohne diesen Mitarbeiter.
    

## Ergebnis

- Mitarbeiterdaten werden rollenbasiert korrekt angezeigt.
- Disponenten sehen keine deaktivierten Mitarbeiter.
- Administratoren sehen vollstÃ¤ndigen Bestand.
- TerminÃ¼bersicht entspricht dem aktuellen Stand der Terminrelation.
- Es erfolgt keinerlei fachliche DatenÃ¤nderung.
- Es entstehen keine inkonsistenten ZustÃ¤nde durch Anzeigeoperationen.

### UC **05/**08: Versionskonflikt bei paralleler Mitarbeiterbearbeitung

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass bei paralleler Bearbeitung desselben Mitarbeiters keine unbeabsichtigten DatenÃ¼berschreibungen entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Beide Akteure haben Ã„nderungsrechte.
- Der Mitarbeiterdatensatz besitzt eine Versionskennung.
- Beide Akteure Ã¶ffnen denselben Mitarbeiterdatensatz.

## Ablauf

1. Akteur A Ã¶ffnet die Detailansicht des Mitarbeiters.
2. Akteur B Ã¶ffnet denselben Mitarbeiter.
3. System liefert beiden Akteuren denselben Versionsstand.
4. Akteur A Ã¤ndert Daten und speichert.
5. System validiert die Version.
6. System persistiert die Ã„nderungen.
7. System erhÃ¶ht die Versionskennung.
8. Akteur B Ã¤ndert Daten auf Basis der alten Version.
9. Akteur B speichert.
10. System erkennt eine abweichende Versionskennung.
11. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lÃ¤dt vor dem Speichern neu â†’
    
    System liefert aktuellen Stand, kein Konflikt.
    
- Einer der Akteure bricht ab â†’
    
    Kein Konflikt.
    
- Technischer Fehler â†’
    
    System antwortet mit 500.
    

## Ergebnis

- Der zuletzt gÃ¼ltig gespeicherte Zustand bleibt unverÃ¤ndert.
- Es erfolgt keine stille Ãœberschreibung.
- Das System antwortet mit HTTP 409 Conflict.
- Die Fehlermeldung weist explizit auf einen Versionskonflikt hin.
- Der Akteur muss den Datensatz neu laden, bevor erneut gespeichert werden kann.
- Die Datenbank enthÃ¤lt zu keinem Zeitpunkt einen inkonsistenten Zustand.

### UC **05/**09: Konflikt bei paralleler Deaktivierung und Terminzuweisung

## Akteur

Administrator, Disponent

## Ziel

Verhindern, dass ein zwischenzeitlich deaktivierter Mitarbeiter einem Termin neu zugewiesen wird.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist aktiv.
- Ein Termin existiert.
- Zwei Akteure sind gleichzeitig angemeldet.
- Der Mitarbeiter ist im Terminformular auswÃ¤hlbar.

## Ablauf

1. Akteur A Ã¶ffnet das Terminformular.
2. System lÃ¤dt aktive Mitarbeiter zur Auswahl.
3. Akteur A wÃ¤hlt den Mitarbeiter aus.
4. Vor dem Speichern deaktiviert Akteur B denselben Mitarbeiter.
5. System setzt `is_active = false`.
6. Akteur A speichert den Termin.
7. System prÃ¼ft beim Speichern:
    - ob alle ausgewÃ¤hlten Mitarbeiter weiterhin aktiv sind.
8. System erkennt, dass der Mitarbeiter deaktiviert wurde.
9. System blockiert den Speichervorgang.

## Alternativen

- Deaktivierung erfolgt nach erfolgreicher Termin-Speicherung â†’
    
    Termin bleibt gÃ¼ltig, da Zuweisung vor Deaktivierung erfolgte.
    
- Akteur A lÃ¤dt das Formular neu â†’
    
    Der deaktivierte Mitarbeiter erscheint nicht mehr in der Auswahl.
    
- Einer der Akteure bricht ab â†’
    
    Kein Konflikt.
    

## Ergebnis

- Ein deaktivierter Mitarbeiter kann nicht neu einem Termin zugewiesen werden.
- Das System antwortet mit HTTP 409 Conflict oder 400 Validation Error.
- Die Fehlermeldung weist auf den zwischenzeitlich deaktivierten Mitarbeiter hin.
- Es entsteht kein inkonsistenter Zustand.
- Bereits bestehende Terminzuweisungen bleiben unverÃ¤ndert.
- Historische Termine bleiben unverÃ¤ndert.

### UC **05/**10: LÃ¶schversuch bei bestehenden Terminreferenzen

## Akteur

Administrator

## Ziel

Sicherstellen, dass ein Mitarbeiter nicht gelÃ¶scht werden kann, wenn noch Terminreferenzen bestehen.

## Vorbedingungen

- Der Mitarbeiter existiert.
- Mindestens ein Termin enthÃ¤lt den Mitarbeiter in seiner gespeicherten Mitarbeiterliste.
- Der Akteur besitzt Administratorrechte.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterverwaltung.
2. Akteur wÃ¤hlt einen bestehenden Mitarbeiter.
3. Akteur lÃ¶st die LÃ¶schaktion aus.
4. System prÃ¼ft, ob Terminreferenzen existieren.
5. System erkennt mindestens eine bestehende Zuordnung.
6. System blockiert den LÃ¶schvorgang.

## Alternativen

- Mitarbeiter besitzt keine Terminreferenzen â†’
    
    System erlaubt die LÃ¶schung.
    
- Mitarbeiter existiert nicht â†’
    
    System antwortet mit 404.
    
- Akteur ohne Administratorrolle â†’
    
    System blockiert mit 403.
    
- Technischer Fehler â†’
    
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

Verhindern, dass bei gleichzeitiger Reaktivierung und Bearbeitung widersprÃ¼chliche ZustÃ¤nde entstehen.

## Vorbedingungen

- Ein Mitarbeiter existiert und ist deaktiviert.
- Zwei Akteure sind angemeldet.
- Der Datensatz besitzt eine Versionskennung.

## Ablauf

1. Akteur A Ã¶ffnet den deaktivierten Mitarbeiter.
2. Akteur B Ã¶ffnet denselben Mitarbeiter.
3. Akteur A reaktiviert den Mitarbeiter.
4. System setzt `is_active = true` und erhÃ¶ht die Version.
5. Akteur B Ã¤ndert Stammdaten auf Basis der alten Version.
6. Akteur B speichert.
7. System erkennt Versionsabweichung.
8. System blockiert den Speichervorgang.

## Alternativen

- Akteur B lÃ¤dt neu â†’
    
    Kein Konflikt.
    
- Reaktivierung erfolgt nach erfolgreicher Bearbeitung â†’
    
    Kein Konflikt.
    

## Ergebnis

- Kein Zustand wird Ã¼berschrieben.
- HTTP 409 bei Versionskonflikt.
- Der gÃ¼ltige Zustand bleibt erhalten.
- Keine Terminzuweisungen werden verÃ¤ndert.

### UC **05/**12: Rollenverletzung bei API-Direktzugriff

## Akteur

Nicht berechtigter Benutzer (z. B. Monteur)

## Ziel

Sicherstellen, dass unberechtigte Rollen keine schreibenden Aktionen auf Mitarbeiter ausfÃ¼hren kÃ¶nnen.

## Vorbedingungen

- Ein Mitarbeiter existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Ã„nderungs- oder Adminrechte.

## Ablauf

1. Akteur sendet direkt einen API-Request:
    - POST `/employees`
    - PATCH `/employees/:id`
    - DELETE `/employees/:id`
    - PATCH `/employees/:id/active`
2. System prÃ¼ft Rollenberechtigung.
3. System erkennt fehlende Berechtigung.
4. System blockiert die Operation.

## Alternativen

- Akteur ist nicht authentifiziert â†’
    
    HTTP 401 Unauthorized.
    
- Technischer Fehler â†’
    
    HTTP 500.
    

## Ergebnis

- Keine DatenÃ¤nderung erfolgt.
- System antwortet mit HTTP 403 Forbidden.
- Der Mitarbeiterbestand bleibt unverÃ¤ndert.
- Es entstehen keine inkonsistenten ZustÃ¤nde.

### UC **05/**13: Query-Konsistenz zwischen Listen- und Dialogansicht

## Akteur

Administrator, Disponent

## Ziel

Sicherstellen, dass die in der Mitarbeiterliste angezeigten aktiven Mitarbeiter mit den in Dialoglisten zur Terminzuweisung verfÃ¼gbaren Mitarbeitern konsistent sind.

## Vorbedingungen

- Mitarbeiter existieren im System.
- Mindestens ein Mitarbeiter ist deaktiviert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r Mitarbeiter.

## Ablauf

1. Akteur Ã¶ffnet die Mitarbeiterlistenansicht.
2. System lÃ¤dt Mitarbeiterdaten gemÃ¤ÃŸ Rollenregel:
    - Administrator erhÃ¤lt aktive und inaktive Mitarbeiter.
    - Disponent erhÃ¤lt ausschlieÃŸlich aktive Mitarbeiter.
3. Akteur Ã¶ffnet ein Terminformular.
4. System lÃ¤dt die Mitarbeiterauswahlliste.
5. System wendet dieselbe Aktiv-Filterlogik an.
6. System stellt sicher, dass die Ergebnismenge identisch zur Listenlogik ist.

## Alternativen

- Ein Mitarbeiter wird zwischenzeitlich deaktiviert â†’
    
    Bei erneuter Abfrage erscheinen die Daten konsistent gefiltert.
    
- Unterschiedliche API-Endpunkte liefern unterschiedliche Filter â†’
    
    System muss als fehlerhaft betrachtet werden.
    

## Ergebnis

- Disponenten sehen in Listen- und Dialogansicht ausschlieÃŸlich aktive Mitarbeiter.
- Administratoren sehen in der Stammdatenliste aktive und inaktive Mitarbeiter.
- Dialoglisten zur Terminzuweisung enthalten niemals deaktivierte Mitarbeiter.
- Es existiert keine Divergenz zwischen:
    - GET `/employees`
    - GET `/employees?active=true`
    - internen Dialogabfragen.
- Integrationstests kÃ¶nnen prÃ¼fen:
    - gleiche Anzahl aktiver Mitarbeiter in Liste und Dialog
    - deaktivierter Mitarbeiter erscheint in keiner Zuweisungsauswahl.

# FT (06): Druckfunktionen

## FT (06) Ziel / Zweck

Dieses Feature ermÃ¶glicht die Ausgabe zentraler Planungs- und Ãœbersichtsansichten als Papierdruck oder PDF. Die Druckfunktionen dienen der UnterstÃ¼tzung von Abstimmungen, Briefings und interner Kommunikation auÃŸerhalb des Systems.

## FT (06) Fachliche Beschreibung

Die Druckfunktionen stellen verschiedene Sichten der Terminplanung und -Ã¼bersicht in druckbarer Form bereit. Grundlage fÃ¼r alle Druckausgaben sind die im System verfÃ¼gbaren Kalender- und Ãœbersichtsansichten. Die Druckausgaben bilden diese Ansichten inhaltlich vollstÃ¤ndig ab, sind jedoch in ihrer Darstellung fÃ¼r Papier oder PDF optimiert.

UnterstÃ¼tzt werden sowohl kalenderbasierte Ansichten (z. B. Planungs- und Auslastungsansichten) als auch tabellarische Ãœbersichten (z. B. nÃ¤chste Termine oder Mitarbeitertermine). FÃ¼r jede Druckausgabe kann ein Zeitraum festgelegt werden. Je nach Drucktyp kÃ¶nnen zusÃ¤tzlich Filter oder Darstellungsvarianten gewÃ¤hlt werden.

Kalenderdrucke Ã¼bernehmen die visuelle Strukturierung der jeweiligen Ansicht, insbesondere Farben, Stapelung und Sortierung. Interaktive Elemente wie Tooltips werden nicht gedruckt; relevante Kurzinformationen werden stattdessen direkt in der TerminflÃ¤che oder in ergÃ¤nzenden Spalten bzw. Legenden dargestellt.

Die Ausgabe erfolgt wahlweise als direkter Papierdruck oder als PDF-Export.

## FT (06) Regeln & Randbedingungen

- Jede Druckausgabe basiert auf einer bestehenden Ansicht oder Ãœbersicht.
- FÃ¼r jede Druckausgabe kann ein Zeitraum gewÃ¤hlt werden.
- Team- und Mitarbeiterdrucke sind gefilterte Sichten.
- Kalenderdrucke Ã¼bernehmen die bestehende visuelle Darstellung (Farben, Stapelung, Sortierung).
- Interaktive UI-Elemente (z. B. Tooltips) werden nicht gedruckt.
- Relevante Kurzinformationen werden statisch dargestellt (TerminflÃ¤che, Spalten, Legende).
- Die Druckfunktion verÃ¤ndert keine Daten und ist rein ausgabebezogen.

## FT (06) **Use Cases**

### **UC 06/01: Druck: Planungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Kalender-Planungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Eine Planungsansicht ist geÃ¶ffnet.

**Ablauf**

1. Benutzer wÃ¤hlt die Druckfunktion.
2. Benutzer wÃ¤hlt den Zeitraum.
3. Benutzer wÃ¤hlt die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.
5. Benutzer startet den Druck oder speichert die Ausgabe als PDF.

**Ergebnis**

Die gewÃ¤hlte Planungsansicht liegt als Druck oder PDF vor.

### **UC 06/02: Druck: Auslastungsansicht ausgeben**

**Akteur**

Disponent

**Ziel**

Die Auslastungsansicht als Papierdruck oder PDF ausgeben.

**Vorbedingungen**

- Die Auslastungsansicht ist verfÃ¼gbar.

**Ablauf**

1. Benutzer wÃ¤hlt die Auslastungsansicht.
2. Benutzer startet die Druckfunktion.
3. Benutzer wÃ¤hlt den Zeitraum und die Ausgabeform (Papier oder PDF).
4. System erzeugt die Druckansicht.

**Ergebnis**

Die Auslastungsansicht liegt als Druck oder PDF vor.

### **UC 06/03: Druck: NÃ¤chste Termine ausgeben**

**Akteur**

Disponent

**Ziel**

Eine Ãœbersicht der nÃ¤chsten Termine als Druck oder PDF ausgeben.

**Vorbedingungen**

- Termine sind vorhanden.

**Ablauf**

1. Benutzer wÃ¤hlt die Funktion â€žNÃ¤chste Termineâ€œ.
2. Benutzer wÃ¤hlt den Zeitraum und ggf. Filter.
3. Benutzer startet die Druckfunktion.
4. System erzeugt die Ausgabe.

**Ergebnis**

Die Ãœbersicht der nÃ¤chsten Termine liegt als Druck oder PDF vor.

### **UC 06/04: Druck: Mitarbeitertermine ausgeben**

**Akteur**

Disponent

**Ziel**

Die Termine eines ausgewÃ¤hlten Mitarbeiters als Druck oder PDF ausgeben.

**Vorbedingungen**

- Der Mitarbeiter existiert.

**Ablauf**

1. Benutzer wÃ¤hlt einen Mitarbeiter.
2. Benutzer wÃ¤hlt die Darstellungsart (tabellarisch oder als Kalender).
3. Benutzer wÃ¤hlt den Zeitraum.
4. Benutzer startet die Druckfunktion.
5. System erzeugt die Ausgabe.

**Ergebnis**

Die Termine des Mitarbeiters liegen als Druck oder PDF vor.

# FT (07): Automatisierte Datensicherung und Fallback

## FT (07) Ziel / Zweck

Sicherstellung der kurzfristigen operativen HandlungsfÃ¤higkeit bei SystemausfÃ¤llen durch automatische, Ã¤nderungsabhÃ¤ngige Generierung eines Excel-Fallback-Kalenders sowie eines PDF-Dokuments â€žAnstehende Termineâ€œ, inklusive tÃ¤glichem E-Mail-Versand und administrativer Monitoring-Sicht.

## FT (07) Fachliche Beschreibung

Das System erzeugt tÃ¤glich automatisiert ein Fallback-Dokument, sofern seit dem letzten erfolgreichen Export relevante Daten geÃ¤ndert wurden.

Das Fallback besteht aus:

- einem Excel-Dokument mit:
    - Wochenkalender-Nachbildung,
    - maximal 3 aktiven Tour-Lanes,
    - 2 Slots pro Tour und Tag,
    - einem Bereich â€žOhne Tourâ€œ,
    - zwei Zeilen pro Termin (Kundendaten + Projektdaten),
    - einem Detail-Sheet mit vollstÃ¤ndigem Termin-Snapshot,
    - zusÃ¤tzlichen Sheets fÃ¼r Projekte, Kunden und Mitarbeiter.
- einem PDF-Dokument â€žAnstehende Termineâ€œ fÃ¼r den Zeitraum â€žheute + 2 Monateâ€œ, sortiert nach Datum und Uhrzeit.

Beide Dokumente werden:

- serverseitig gespeichert,
- per E-Mail versendet,
- im System protokolliert.

Backups Ã¤lter als 30 Tage werden automatisch gelÃ¶scht.

LogeintrÃ¤ge bleiben dauerhaft erhalten.

Ein Administrator kann vergangene Backups einsehen und herunterladen.

Das Excel-Dokument ist ein Snapshot und ersetzt nicht das produktive System.

ZusÃ¤tzlich zum Excel-Fallback und PDF-Dokument synchronisiert das System Termine mit einem externen CalDAV-Kalender (Nextcloud).

Die Synchronisation erfolgt:

- event-getrieben bei TerminÃ¤nderungen,
- serverseitig,
- nicht blockierend,
- ausschlieÃŸlich vom System zum externen Kalender.

Der externe Kalender dient als zusÃ¤tzliche Anzeige- und Fallback-Instanz, ist jedoch kein fÃ¼hrendes System.

Es wird genau ein externer Kalender verwendet.

Alle Termine werden dort eindeutig als MuGPlan-Termine gekennzeichnet.

## FT (07) Regeln & Randbedingungen

- Export erfolgt nur bei tatsÃ¤chlicher DatenÃ¤nderung.
- Ã„nderungsprÃ¼fung Ã¼ber MAX(updated_at) relevanter Tabellen.
- Relevante Tabellen: Termine, Projekte, Kunden, Mitarbeiter, Touren.
- Maximal 3 aktive Touren werden im Kalender dargestellt.
- Pro Tour und Tag maximal 2 Termine im Raster.
- Bei Ãœberschreitung wird â€ž+1â€œ angezeigt.
- Keine RÃ¼cksynchronisation aus Excel.
- Scheduler lÃ¤uft tÃ¤glich um 02:00 Uhr.
- Migration der Tabelle `backup_log` auf _dev und _test.
- Backup-Dateien werden 30 Tage gespeichert.
- Monitoring nur fÃ¼r Admin sichtbar.
- Keine Ã„nderung bestehender Fachlogik.
- Keine Ã„nderung bestehender REST-Endpunkte.
- Es wird genau ein CalDAV-Kalender synchronisiert.
- Die Synchronisation erfolgt bei:
    - Termin-Neuanlage,
    - TerminÃ¤nderung,
    - TerminlÃ¶schung.
- Externer Kalender ist nicht fÃ¼hrend.
- Es erfolgt keine RÃ¼cksynchronisation.
- Externe Ã„nderungen werden bei nÃ¤chster Aktualisierung Ã¼berschrieben.
- Jeder Termin besitzt eine stabile externe UID.
- Die UID darf sich niemals Ã¤ndern.
- Synchronisationsfehler dÃ¼rfen Termin-Speicherung nicht blockieren.
- Fehler werden protokolliert.
- Authentifizierung erfolgt Ã¼ber Nextcloud-App-Passwort.
- Kommunikation erfolgt ausschlieÃŸlich Ã¼ber HTTPS.
- CalDAV-Zugangsdaten werden Ã¼ber Umgebungsvariablen konfiguriert.

---

## FT (07) **Use Cases**

### UC 07/01: Ã„nderungsabhÃ¤ngige Backup-PrÃ¼fung

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
- Falls keine Ã„nderung vorliegt, wird Lauf als â€žskippedâ€œ protokolliert.
- Falls Ã„nderung vorliegt, wird Exportprozess gestartet.

### Alternativen:

- Fehler bei Datenbankzugriff â†’ Lauf wird als â€žerrorâ€œ protokolliert.

### Ergebnis:

Backup wird nur bei tatsÃ¤chlicher DatenÃ¤nderung erzeugt.

### UC 07/02: Excel-Fallback-Dokument erzeugen

### Akteur:

System

### Ziel:

Erzeugung eines vollstÃ¤ndigen Excel-Fallback-Dokuments.

Vorbedingungen:

- Ã„nderungsprÃ¼fung hat Exportbedarf festgestellt.

### Ablauf:

- System lÃ¤dt alle relevanten Daten.
- System erzeugt Kalender-Sheet mit Wochenstruktur.
- System erzeugt Detail-Sheet mit vollstÃ¤ndigem Termin-Snapshot.
- System erzeugt zusÃ¤tzliche Sheets (Projekte, Kunden, Mitarbeiter).
- Datei wird serverseitig gespeichert.

### Alternativen:

- Fehler bei Dateigenerierung â†’ Lauf wird als â€žerrorâ€œ protokolliert.

### Ergebnis:

Excel-Dokument ist persistent gespeichert.

### UC 07/03: PDF â€žAnstehende Termineâ€œ erzeugen

### Akteur:

System

### Ziel:

Erzeugung einer operativen Terminliste fÃ¼r 2 Monate.

Vorbedingungen:

- Exportprozess lÃ¤uft.

### Ablauf:

- System ermittelt Termine im Zeitraum â€žheute + 2 Monateâ€œ.
- Termine werden nach Datum und Uhrzeit sortiert.
- PDF wird generiert.
- Datei wird gespeichert.

### Alternativen:

- Fehler bei PDF-Erstellung â†’ Lauf wird als â€žerrorâ€œ protokolliert.

### Ergebnis:

PDF-Dokument ist persistent gespeichert.

### UC 07/04: Backup per E-Mail versenden

### Akteur:

System

### Ziel:

Versand des Fallback-Dokuments an definierte EmpfÃ¤nger.

Vorbedingungen:

- Excel- und PDF-Dateien wurden erfolgreich erzeugt.

### Ablauf:

- System erstellt E-Mail mit Datum im Betreff.
- Excel- und PDF-Dateien werden angehÃ¤ngt.
- E-Mail wird versendet.
- Mailstatus wird im Log gespeichert.

### Alternativen:

- Versand schlÃ¤gt fehl â†’ Mailstatus â€žfailedâ€œ, Laufstatus â€žerrorâ€œ.

### Ergebnis:

EmpfÃ¤nger erhalten Backup-Dokumente per E-Mail.

### UC 07/05: Backup-Historie einsehen

### Akteur:

Administrator

### Ziel:

Nachvollziehen aller Backup-LÃ¤ufe.

Vorbedingungen:

- Administrator ist angemeldet.

### Ablauf:

- Admin Ã¶ffnet Einstellungsbereich.
- Admin wechselt zum Tab â€žBackupsâ€œ.
- System zeigt tabellarische Liste aller `backup_log`EintrÃ¤ge.

### Alternativen:

- Keine LogeintrÃ¤ge vorhanden â†’ Leere Liste.

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
- System prÃ¼ft Berechtigung.
- System liefert Datei Ã¼ber geschÃ¼tzten Endpoint aus.

### Alternativen:

- Datei nicht vorhanden â†’ Fehlermeldung anzeigen.

### Ergebnis:

Backup-Datei wird lokal gespeichert.

### UC 07/07: Alte Backups automatisch lÃ¶schen

### Akteur:

System (Scheduler)

### Ziel:

Speicherbereinigung gemÃ¤ÃŸ Retention-Regel.

Vorbedingungen:

- Scheduler-Lauf wird ausgefÃ¼hrt.

### Ablauf:

- System prÃ¼ft gespeicherte Dateien.
- Dateien Ã¤lter als 30 Tage werden gelÃ¶scht.
- LÃ¶schvorgang wird protokolliert.

### Alternativen:

- Datei nicht auffindbar â†’ Fehler protokollieren.

### Ergebnis:

Speicher bleibt kontrolliert, Log bleibt erhalten.

### UC 07/08: Termin in externen Kalender Ã¼bertragen

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

- API nicht erreichbar â†’ Fehler wird protokolliert.

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
- Termin bleibt intern unverÃ¤ndert.
- Optional Retry bei nÃ¤chstem Lauf.

### Alternativen:

Keine.

### Ergebnis:

Synchronisationsprobleme sind nachvollziehbar, Fachlogik bleibt stabil.

### UC 07/10: TerminÃ¤nderung im CalDAV-Kalender aktualisieren

### Akteur:

System

### Ziel:

Externen Kalender an geÃ¤nderten Termin anpassen.

Vorbedingungen:

- Termin besitzt external_event_id.

### Ablauf:

- System erzeugt aktualisierte iCalendar-Daten.
- System sendet HTTP PUT an bestehende Event-URL.
- Status wird aktualisiert.
- Logeintrag wird erstellt.

### Alternativen:

- Event extern nicht vorhanden â†’ Event wird neu angelegt.

### Ergebnis:

Externer Kalender entspricht internem Stand.

### UC 07/11: Termin im CalDAV-Kalender lÃ¶schen

### Akteur:

System

### Ziel:

Externes Event entfernen.

Vorbedingungen:

- Termin wird intern gelÃ¶scht.
- external_event_id ist vorhanden.

### Ablauf:

- System sendet HTTP DELETE an Event-URL.
- external_event_id wird entfernt.
- Logeintrag wird erstellt.

### Alternativen:

- Event nicht auffindbar â†’ Fehler protokollieren, intern fortfahren.

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
- Termin bleibt intern unverÃ¤ndert.

### Alternativen:

Keine.

### Ergebnis:

Synchronisationsprobleme sind nachvollziehbar, ohne Fachlogik zu beeintrÃ¤chtigen.

# FT (09): Kundenverwaltung

## FT (09) Ziel / Zweck

Dieses Feature stellt die Verwaltung von Kundenstammdaten bereit, damit Termine nicht mehr mit frei erfassten Kundendaten arbeiten mÃ¼ssen. Termine referenzieren kÃ¼nftig ein Projekt und Ã¼ber dieses einen Kunden und Ã¼bernehmen Adresse sowie Kontaktdaten daraus, um Konsistenz, Wiederverwendbarkeit und saubere Historien sicherzustellen. Einem Kunden kÃ¶nnen Notizen zugeordnet werden.

## FT (09) Fachliche Beschreibung

Die Kundenverwaltung ermÃ¶glicht das Anlegen, Bearbeiten und Anzeigen von Kunden. Pro Kunde werden Stammdaten gespeichert, insbesondere **Name/Firma**, **Kundennummer**, **Adresse** und **Telefonnummer**.

Ein Kunde kann beliebig viele Projekte und damit indirekt beliebig viele Termine besitzen. In der Kundendetailansicht wird eine **Projektliste** angezeigt, die alle dem Kunden zugeordneten Projekte umfasst (z. B. Aufbau, Service, Nachbesserung).

Disponenten erhalten serverseitig nur aktive Kunden und kÃ¶nnen daher nur aktive Kunden fÃ¼r neue Projekte auswÃ¤hlen. Die Verwaltung von aktiven und inaktiven Kunden (Deaktivieren, Reaktivieren) ist eine Admin-Funktion und nicht Teil dieser Dokumentation fÃ¼r Disponenten.

Kunden haben eine **Notizenliste** (0..n). Notizen werden in der Kundendetailansicht als vertikale KÃ¤rtchenliste dargestellt und Ã¼ber einen Richtext-Editor verwaltet. Die Verwaltungslogik fÃ¼r Notizen ist in FT (13): Notizverwaltung definiert. Notizen sind **kundenbezogen** und **projektunabhÃ¤ngig**.

In der Kundendetailansicht kÃ¶nnen dem Kunden zusÃ¤tzlich Dokumente als AnhÃ¤nge zugeordnet werden. Der Disponent kann AnhÃ¤nge hochladen, in einer Anhangsliste einsehen, per Vorschau Ã¶ffnen und bei Bedarf herunterladen. Eine LÃ¶schfunktion fÃ¼r AnhÃ¤nge ist nicht vorgesehen.

## FT (09) Regeln & Randbedingungen

- Kundendaten (Name, Kundennummer, Adresse, Telefon) werden **zentral** am Kunden gepflegt.
- Kunden dÃ¼rfen **nicht gelÃ¶scht** werden, wenn sie in Projekten verwendet werden.
- Disponenten erhalten serverseitig nur aktive Kunden und kÃ¶nnen nur aktive Kunden fÃ¼r neue Projekte auswÃ¤hlen.
- Pflichtfelder:
    - Kundennummer (aus WAWI).
- Notizen sind optional und werden Ã¼ber die Relationstabelle `customer_note` mit dem Kunden verknÃ¼pft.
- Ein Kunde kann 0..n Notizen haben.
- Notizen werden gemÃ¤ÃŸ FT (13): Notizverwaltung verwaltet.
- Das LÃ¶schen eines Kunden lÃ¶scht auch alle zugehÃ¶rigen Notizen (CASCADE Ã¼ber customer_note).
- KundenanhÃ¤nge sind kundenbezogen und unabhÃ¤ngig von Projekten; AnhÃ¤nge kÃ¶nnen hinzugefÃ¼gt und heruntergeladen werden, eine physische LÃ¶schung ist nicht vorgesehen.

## FT (09) **Use Cases**

### **UC 09/01: Kunde anlegen**

### Akteur

Disponent, Administrator

### Ziel

Ein neuer Kunde wird mit vollstÃ¤ndigen Stammdaten angelegt und steht anschlieÃŸend fÃ¼r Projektzuordnungen zur VerfÃ¼gung.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Anlage von Kunden.
- Pflichtfelder sind im System definiert.

### Ablauf

1. Der Akteur startet die Funktion â€žKunde anlegenâ€œ.
2. Das System zeigt ein Formular zur Erfassung der Kundendaten an.
3. Der Akteur erfasst mindestens:
    - Kundenname bzw. Firma,
    - Telefonnummer,
    - Kundennummer,
    - Adresse (sofern fÃ¼r Planung oder Druck erforderlich).
4. Der Akteur bestÃ¤tigt die Eingabe.
5. Das System validiert:
    - Pflichtfelder,
    - formale Korrektheit der Daten,
    - optionale DublettenprÃ¼fung anhand Name/Adresse/Kundennummer.
6. Bei erfolgreicher Validierung speichert das System den Kunden mit `is_active = true`.
7. Das System erzeugt eine Versionskennung (z. B. `version` oder `updated_at`).
8. Das System zeigt die Kundendetailansicht des neu angelegten Kunden an.

### Alternativen

- Pflichtfeld fehlt â†’ System antwortet mit Validierungsfehler, kein Persistieren.
- Formale Validierung schlÃ¤gt fehl â†’ System lehnt ab und markiert Feld.
- DublettenprÃ¼fung schlÃ¤gt an â†’ System warnt oder blockiert gemÃ¤ÃŸ Regel.
- Technischer Fehler â†’ System antwortet mit 500, kein Kunde wird angelegt.

### Ergebnis

- Ein neuer Kundendatensatz existiert persistent.
- `is_active = true`.
- Der Kunde erscheint:
    - in Kundenlisten,
    - in Projektauswahldialogen (nur fÃ¼r aktive Kunden),
    - in Filterkomponenten fÃ¼r aktive Kunden.
- Es existieren noch keine Projekte, Termine oder Notizen fÃ¼r diesen Kunden.

### **UC 09/02: Kunde bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Bestehende Kundendaten werden aktualisiert, ohne referenzierende Projekte oder Termine inkonsistent zu machen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte.
- Eine gÃ¼ltige Versionskennung des Kunden liegt vor (Optimistic Locking).

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Kunden.
2. Das System zeigt:
    - Kundendaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.
3. Der Akteur startet die Funktion â€žBearbeitenâ€œ.
4. Das System zeigt ein editierbares Formular mit den aktuellen Werten.
5. Der Akteur Ã¤ndert zulÃ¤ssige Felder (z. B. Adresse, Telefonnummer, Kundennummer, Name).
6. Der Akteur bestÃ¤tigt die Ã„nderungen.
7. Das System prÃ¼ft:
    - Berechtigung,
    - Pflichtfelder,
    - formale Validierung,
    - Versionskennung (KonfliktprÃ¼fung).
8. Bei erfolgreicher PrÃ¼fung speichert das System die Ã„nderungen.
9. Das System erhÃ¶ht die Versionskennung.
10. Das System aktualisiert abhÃ¤ngige Ansichten.

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur nicht berechtigt â†’ System blockiert mit 403.
- Validierungsfehler â†’ System lehnt ab, keine Speicherung.
- Versionskonflikt â†’ System blockiert mit 409, fordert Neuladen.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- Kundendaten sind aktualisiert persistiert.
- Bestehende Projekte und Termine referenzieren weiterhin denselben Kunden.
- In Projektansichten, Kalender-Tooltips und Druckfunktionen erscheinen die aktualisierten Kundendaten.
- Es werden keine Projekte, Termine oder Notizen verÃ¤ndert.

### **UC 09/03: Kunde anzeigen (inkl. Terminliste)**

### Akteur

Disponent, Administrator

### Ziel

Die vollstÃ¤ndige Kundendetailansicht wird angezeigt, einschlieÃŸlich aller referenzierten Projekte sowie kundenbezogener Notizen und AnhÃ¤nge.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.
- Der Kunde ist aktiv oder der Akteur besitzt Admin-Rechte zur Anzeige inaktiver Kunden.

### Ablauf

1. Der Akteur wÃ¤hlt einen Kunden aus einer Liste oder Ã¼ber eine Suche.
2. Das System lÃ¤dt den Kundendatensatz.
3. Das System lÃ¤dt alle dem Kunden zugeordneten Projekte.
4. Das System lÃ¤dt alle kundenbezogenen Notizen.
5. Das System lÃ¤dt alle kundenbezogenen AnhÃ¤nge.
6. Das System zeigt die Kundendetailansicht mit folgenden Bereichen:
    - Stammdaten,
    - Projektliste,
    - Notizenliste,
    - Anhangsliste.

### Anzeige- und Query-Regeln

- Disponenten erhalten serverseitig nur aktive Kunden.
- Administratoren kÃ¶nnen aktive und inaktive Kunden laden.
- Die Projektliste wird ausschlieÃŸlich aus der Projekt-Kunden-Relation abgeleitet.
- Termine werden nicht direkt geladen, sondern indirekt Ã¼ber Projekte referenziert.
- Notizen werden gemÃ¤ÃŸ FT (13) geladen und sortiert.
- AnhÃ¤nge werden gemÃ¤ÃŸ FT (19) geladen.

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- Die Kundendetailansicht ist vollstÃ¤ndig und konsistent dargestellt.
- Es werden keine Daten verÃ¤ndert.
- Die dargestellten Daten entsprechen dem aktuellen persistenten Zustand.

### **UC 09/04: Kunde deaktivieren / archivieren**

### Akteur

Administrator

### Ziel

Ein bestehender Kunde wird deaktiviert, sodass er nicht mehr fÃ¼r neue Projekte auswÃ¤hlbar ist, jedoch historisch erhalten bleibt.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell aktiv (`is_active = true`).
- Eine gÃ¼ltige Versionskennung liegt vor.

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines aktiven Kunden.
2. Der Akteur lÃ¶st die Aktion â€žDeaktivierenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = false`.
5. Das System persistiert die Ã„nderung.
6. Das System erhÃ¶ht die Versionskennung.
7. Das System aktualisiert abhÃ¤ngige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der deaktivierte Kunde erscheint nicht mehr:
    - in Projektauswahldialogen,
    - in Standard-Kundenlisten fÃ¼r Disponenten,
    - in Filtern fÃ¼r aktive Kunden.
- Bestehende Projekte und Termine bleiben unverÃ¤ndert referenziert.
- Historische Daten bleiben vollstÃ¤ndig erhalten.
- Administratoren kÃ¶nnen den Kunden weiterhin laden und anzeigen.

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Kunde bereits deaktiviert â†’ System antwortet mit 200 ohne ZustandsÃ¤nderung.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- `is_active = false`.
- Der Kunde ist archiviert.
- Keine Projekte, Termine, Notizen oder AnhÃ¤nge werden verÃ¤ndert oder gelÃ¶scht.
- Es entstehen keine verwaisten Referenzen.

### **UC 09/05: Kundennotizen verwalten**

### Akteur

Disponent, Administrator

### Ziel

Notizen werden einem Kunden zugeordnet, angezeigt, bearbeitet und strukturiert dargestellt, ohne ProjektabhÃ¤ngigkeit zu erzeugen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; fÃ¼r Ã„nderungen zusÃ¤tzlich Ã„nderungsrechte.
- Die Notizverwaltungslogik gemÃ¤ÃŸ FT (13) ist verfÃ¼gbar.

### Ablauf â€“ Notiz hinzufÃ¼gen

1. Der Akteur Ã¶ffnet die Kundendetailansicht.
2. Der Akteur startet â€žNotiz hinzufÃ¼genâ€œ.
3. Das System Ã¶ffnet den Richtext-Editor.
4. Optional wÃ¤hlt der Akteur eine Notizvorlage.
5. Das System kopiert Titel und Inhalt der Vorlage in den Editor (einmalig).
6. Der Akteur erfasst oder Ã¤ndert Titel und Inhalt.
7. Der Akteur speichert die Notiz.
8. Das System validiert Eingaben.
9. Das System persistiert die Notiz und verknÃ¼pft sie Ã¼ber `customer_note` mit dem Kunden.
10. Das System aktualisiert die Notizenliste.

### Ablauf â€“ Notiz bearbeiten

1. Der Akteur wÃ¤hlt eine bestehende Notiz.
2. Das System lÃ¤dt die Notizdaten.
3. Der Akteur Ã¤ndert Inhalt oder Pin-Status (`is_pinned`).
4. Der Akteur speichert.
5. Das System validiert und persistiert.
6. Das System aktualisiert `updated_at`.
7. Die Notizenliste wird neu sortiert.

### Anzeige- und Sortierregeln

- Notizen sind kundenbezogen und projektunabhÃ¤ngig.
- Angepinnte Notizen erscheinen vor nicht-angepinnten.
- Innerhalb beider Gruppen erfolgt Sortierung nach `updated_at` absteigend.
- Ã„nderungen an Vorlagen wirken sich nicht auf bestehende Notizen aus.
- Notizen besitzen keine Versionierungshistorie.

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Ã„nderungsrecht â†’ System blockiert mit 403.
- Validierungsfehler â†’ Speicherung wird abgelehnt.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- Notizen sind korrekt mit dem Kunden verknÃ¼pft.
- Es bestehen keine Referenzen zu Projekten oder Terminen.
- Die Kundendetailansicht zeigt die aktualisierte, korrekt sortierte Notizenliste.
- Keine Auswirkung auf Terminplanung oder GeschÃ¤ftslogik.

### **UC 09/06: Kunde reaktivieren**

### Akteur

Administrator

### Ziel

Ein deaktivierter Kunde wird wieder aktiviert, sodass er erneut fÃ¼r neue Projekte auswÃ¤hlbar ist.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Der Kunde ist aktuell deaktiviert (`is_active = false`).
- Eine gÃ¼ltige Versionskennung liegt vor.

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines deaktivierten Kunden.
2. Der Akteur lÃ¶st die Aktion â€žReaktivierenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung (Optimistic Locking).
4. Das System setzt `is_active = true`.
5. Das System persistiert die Ã„nderung.
6. Das System erhÃ¶ht die Versionskennung.
7. Das System aktualisiert abhÃ¤ngige Listen- und Auswahlansichten.

### Auswirkungen / Query-Vertrag

- Der Kunde erscheint wieder:
    - in Kundenlisten fÃ¼r Disponenten,
    - in Projektauswahldialogen,
    - in Filtern fÃ¼r aktive Kunden.
- Bestehende Projekte, Termine, Notizen und AnhÃ¤nge bleiben unverÃ¤ndert.
- Es erfolgt keine automatische Ã„nderung an Projekten oder Terminen.

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Kunde bereits aktiv â†’ System antwortet mit 200 ohne ZustandsÃ¤nderung.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- `is_active = true`.
- Der Kunde ist wieder vollstÃ¤ndig auswÃ¤hlbar.
- Keine fachlichen Seiteneffekte auf bestehende Projekte oder Termine.

### UC 09/07: KundenanhÃ¤nge verwalten

### Akteur

Disponent, Administrator

### Ziel

Dokumente werden einem Kunden zugeordnet, angezeigt und heruntergeladen, ohne die fachliche IntegritÃ¤t des Kunden oder referenzierender Projekte zu beeintrÃ¤chtigen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte; fÃ¼r Upload zusÃ¤tzlich Ã„nderungsrechte.
- Die hochzuladende Datei entspricht erlaubten Formaten und GrÃ¶ÃŸenbeschrÃ¤nkungen.

---

## Ablauf â€“ Anhang hochladen

1. Der Akteur Ã¶ffnet die Kundendetailansicht.
2. Der Akteur startet die Funktion â€žAnhang hinzufÃ¼genâ€œ.
3. Der Akteur wÃ¤hlt eine Datei aus.
4. Das System prÃ¼ft:
    - Authentifizierung,
    - Berechtigung,
    - Dateiformat,
    - DateigrÃ¶ÃŸe.
5. Das System speichert die Datei serverseitig unter persistentem Speichername.
6. Das System legt einen Attachment-Datensatz mit Parent-Referenz auf den Kunden an.
7. Das System speichert Metadaten (Originalname, MIME-Typ, GrÃ¶ÃŸe, Zeitstempel).
8. Das System aktualisiert die Anhangsliste in der UI.

---

## Ablauf â€“ Anhang anzeigen / herunterladen

1. Der Akteur Ã¶ffnet die Anhangsliste des Kunden.
2. Das System lÃ¤dt alle dem Kunden zugeordneten Attachments.
3. Der Akteur wÃ¤hlt einen Anhang aus.
4. Das System liefert die Datei Ã¼ber einen gesicherten Download-Endpunkt aus.
5. Je nach Dateityp erfolgt Inline-Anzeige oder Download.

---

## Regeln und EinschrÃ¤nkungen

- Ein Attachment kann nicht ohne Parent-Kunde existieren.
- Attachments sind kundenbezogen und unabhÃ¤ngig von Projekten.
- Eine physische LÃ¶schung von Attachments ist systemweit nicht vorgesehen.
- Das LÃ¶schen eines Kunden entfernt referenzierte Notizen (CASCADE), jedoch keine physische DateilÃ¶schung ist spezifiziert.
- Mehrere Akteure kÃ¶nnen parallel AnhÃ¤nge hochladen; jeder Upload erzeugt einen eigenstÃ¤ndigen Attachment-Datensatz.

---

## Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Berechtigung â†’ System blockiert mit 403.
- Datei ungÃ¼ltig â†’ System lehnt Upload mit Validierungsfehler ab.
- Technischer Fehler â†’ System antwortet mit 500.

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

Sicherstellen, dass bei paralleler Bearbeitung desselben Kunden keine stillen DatenÃ¼berschreibungen (Lost Updates) entstehen.

### Vorbedingungen

- Ein Kunde existiert.
- Zwei Akteure sind gleichzeitig authentifiziert.
- Beide Akteure haben Bearbeitungsrechte.
- Beide Akteure laden denselben Kunden mit identischer Versionskennung.

### Ablauf

1. Akteur A Ã¶ffnet die Kundendetailansicht.
2. Akteur B Ã¶ffnet dieselbe Kundendetailansicht.
3. Beide erhalten denselben Versionsstand (z. B. `version = 5`).
4. Akteur A Ã¤ndert Kundendaten und speichert.
5. Das System prÃ¼ft die Versionskennung.
6. Das System persistiert die Ã„nderung.
7. Das System erhÃ¶ht die Versionskennung auf `version = 6`.
8. Akteur B speichert nun seine Ã„nderungen mit veralteter Versionskennung (`version = 5`).
9. Das System prÃ¼ft die Versionskennung.
10. Das System erkennt die Abweichung.
11. Das System blockiert den Speichervorgang mit 409 (Konflikt).
12. Das System fordert Akteur B zum Neuladen auf.

### Alternativen

- Akteur B lÃ¤dt vor dem Speichern neu â†’ kein Konflikt.
- Akteur B bricht ab â†’ keine Ã„nderung.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- Es kommt zu keinem stillen Ãœberschreiben von Kundendaten.
- Der zuletzt gespeicherte, valide Stand bleibt erhalten.
- Das System garantiert Optimistic Locking fÃ¼r KundenÃ¤nderungen.

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

1. Akteur A Ã¶ffnet die Kundendetailansicht und beginnt mit der Bearbeitung.
2. Akteur B Ã¶ffnet denselben Kunden.
3. Akteur B lÃ¶st â€žDeaktivierenâ€œ aus.
4. Das System prÃ¼ft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert die Ã„nderung und erhÃ¶ht die Versionskennung.
6. Akteur A speichert nun seine Ã„nderungen mit veralteter Versionskennung.
7. Das System prÃ¼ft:
    - Versionskennung,
    - aktuellen Status (`is_active`).
8. Das System erkennt den Konflikt.
9. Das System blockiert den Speichervorgang mit 409.
10. Das System fordert Akteur A zum Neuladen auf.

### Alternativen

- Akteur A lÃ¤dt vor dem Speichern neu â†’ das System zeigt den Kunden als deaktiviert an; Bearbeitung ist nur eingeschrÃ¤nkt mÃ¶glich oder blockiert.
- Akteur B bricht die Deaktivierung ab â†’ kein Konflikt.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

- Ein deaktivierter Kunde kann nicht unbemerkt durch parallele Bearbeitung wieder verÃ¤ndert werden.
- Es entstehen keine inkonsistenten ZustÃ¤nde zwischen Aktiv-Status und Stammdaten.
- Optimistic Locking wird auch bei StatusÃ¤nderungen konsequent durchgesetzt.

### UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)

### Akteur

Administrator

### Ziel

Sicherstellen, dass bei parallelen StatusÃ¤nderungen eines Kunden keine inkonsistenten Aktiv-ZustÃ¤nde entstehen.

### Vorbedingungen

- Ein Kunde existiert.
- Zwei Administratoren sind gleichzeitig authentifiziert.
- Beide Administratoren laden denselben Kunden mit identischer Versionskennung.
- Der Kunde befindet sich in einem definierten Ausgangszustand (`is_active = true` oder `false`).

---

### Ablauf â€“ Beispiel: paralleles Deaktivieren

1. Administrator A Ã¶ffnet die Detailansicht eines aktiven Kunden.
2. Administrator B Ã¶ffnet denselben Kunden.
3. Administrator A lÃ¶st â€žDeaktivierenâ€œ aus.
4. Das System prÃ¼ft Berechtigung und Versionskennung.
5. Das System setzt `is_active = false`, persistiert und erhÃ¶ht die Versionskennung.
6. Administrator B lÃ¶st ebenfalls â€žDeaktivierenâ€œ aus.
7. Das System prÃ¼ft die Versionskennung.
8. Das System erkennt die veraltete Version.
9. Das System antwortet mit 409 (Konflikt).

---

### Ablauf â€“ Beispiel: Deaktivieren vs. Reaktivieren

1. Administrator A Ã¶ffnet einen aktiven Kunden.
2. Administrator B Ã¶ffnet denselben Kunden.
3. Administrator A deaktiviert den Kunden.
4. Das System persistiert `is_active = false` und erhÃ¶ht die Versionskennung.
5. Administrator B versucht, den Kunden zu reaktivieren (auf Basis veralteter Version).
6. Das System prÃ¼ft die Versionskennung.
7. Das System erkennt den Konflikt.
8. Das System blockiert mit 409.

---

### Alternativen

- Einer der Administratoren lÃ¤dt vor dem Statuswechsel neu â†’ kein Konflikt.
- Ein Statuswechsel wird vor dem parallelen Zugriff vollstÃ¤ndig abgeschlossen â†’ der zweite Vorgang wird mit aktuellem Status geprÃ¼ft und ggf. als â€žkeine ZustandsÃ¤nderungâ€œ behandelt.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Der Aktiv-Status eines Kunden ist jederzeit eindeutig und konsistent.
- Es existiert kein Zustand, in dem zwei widersprÃ¼chliche StatusÃ¤nderungen gleichzeitig persistiert werden.
- Optimistic Locking gilt auch fÃ¼r reine Statusoperationen.

### UC 09/11: RollenabhÃ¤ngige Filterung von Kundenlisten

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass Kundenlisten serverseitig rollenabhÃ¤ngig gefiltert werden und Disponenten ausschlieÃŸlich aktive Kunden sehen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Mindestens ein aktiver oder inaktiver Kunde existiert.

---

### Ablauf â€“ Disponent

1. Der Akteur mit Rolle Disponent ruft die Kundenliste auf.
2. Das System ermittelt die Rolle des Akteurs.
3. Das System fÃ¼hrt eine serverseitige Abfrage aus, die ausschlieÃŸlich Kunden mit `is_active = true` berÃ¼cksichtigt.
4. Das System liefert die gefilterte Liste zurÃ¼ck.
5. Die UI zeigt ausschlieÃŸlich aktive Kunden an.

---

### Ablauf â€“ Administrator

1. Der Akteur mit Rolle Administrator ruft die Kundenliste auf.
2. Das System erkennt die Rolle Administrator.
3. Das System fÃ¼hrt eine Abfrage ohne Aktiv-Filter aus oder ermÃ¶glicht eine explizite Filterauswahl.
4. Das System liefert aktive und inaktive Kunden zurÃ¼ck.
5. Die UI kennzeichnet inaktive Kunden eindeutig.

---

### Query-Vertrag

- Die Filterung erfolgt serverseitig.
- Ein Disponent kann durch Manipulation der UI oder Query-Parameter keine inaktiven Kunden erhalten.
- Die API muss rollenabhÃ¤ngig prÃ¼fen und darf sich nicht auf clientseitige Filter verlassen.

---

### Alternativen

- Keine Kunden vorhanden â†’ System liefert leere Liste.
- Akteur nicht authentifiziert â†’ System antwortet mit 401.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Disponenten sehen ausschlieÃŸlich aktive Kunden.
- Administratoren sehen vollstÃ¤ndige Daten.
- Die DatenintegritÃ¤t ist unabhÃ¤ngig vom Client garantiert.

### UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren

### Akteur

Disponent

### Ziel

Sicherstellen, dass ein Disponent weder Ã¼ber direkte URL noch Ã¼ber manipulierte API-Requests auf einen inaktiven Kunden zugreifen kann.

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
3. Das System prÃ¼ft serverseitig die Zugriffsberechtigung.
4. Das System blockiert den Zugriff.
5. Das System antwortet mit 404 oder 403 gemÃ¤ÃŸ Sicherheitskonzept.

---

### Sicherheits- und Query-Regel

- Die Zugriffskontrolle erfolgt ausschlieÃŸlich serverseitig.
- Der Aktiv-Status wird vor Auslieferung des Datensatzes geprÃ¼ft.
- Es darf kein vollstÃ¤ndiger Kundendatensatz an einen Disponenten ausgeliefert werden, wenn `is_active = false`.

---

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ist Administrator â†’ Zugriff wird erlaubt.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Disponenten kÃ¶nnen inaktive Kunden nicht laden oder anzeigen.
- Administratoren behalten vollstÃ¤ndigen Zugriff.
- Die Zugriffskontrolle ist unabhÃ¤ngig von der UI durchgesetzt.

### UC 09/13: Kunde lÃ¶schen ohne Referenzen

### Akteur

Administrator

### Ziel

Einen Kunden endgÃ¼ltig lÃ¶schen, sofern keine referenzierenden Projekte existieren, ohne inkonsistente ZustÃ¤nde zu erzeugen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden sind **keine Projekte** zugeordnet.
- Eine gÃ¼ltige Versionskennung liegt vor.

---

### Ablauf

1. Der Administrator Ã¶ffnet die Detailansicht des Kunden.
2. Der Administrator lÃ¶st die Aktion â€žLÃ¶schenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - ob referenzierende Projekte existieren.
4. Das System stellt fest, dass keine Projekte referenzieren.
5. Das System lÃ¶scht den Kundendatensatz.
6. Das System lÃ¶scht alle zugehÃ¶rigen Notizen Ã¼ber CASCADE (`customer_note`).
7. Das System entfernt alle Attachment-Referenzen zum Kunden (Dateien verbleiben gemÃ¤ÃŸ globaler Regel physisch bestehen, sofern kein anderes LÃ¶schkonzept definiert ist).
8. Das System bestÃ¤tigt die LÃ¶schung.

---

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Referenzierende Projekte vorhanden â†’ System blockiert mit 409 (siehe UC 14).
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Der Kunde existiert nicht mehr im System.
- Es existieren keine verwaisten Notizen oder Attachment-Referenzen.
- Es existieren keine Projekte oder Termine, die auf einen gelÃ¶schten Kunden verweisen.
- Der Datenzustand bleibt konsistent.

### UC 09/14: Kunde lÃ¶schen mit Referenzen (Blockade)

### Akteur

Administrator

### Ziel

Sicherstellen, dass ein Kunde nicht gelÃ¶scht werden kann, wenn ihm mindestens ein Projekt zugeordnet ist, um referenzielle IntegritÃ¤t zu gewÃ¤hrleisten.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Administrator.
- Dem Kunden ist mindestens ein Projekt zugeordnet.
- Eine gÃ¼ltige Versionskennung liegt vor.

---

### Ablauf

1. Der Administrator Ã¶ffnet die Detailansicht des Kunden.
2. Der Administrator lÃ¶st die Aktion â€žLÃ¶schenâ€œ aus.
3. Das System prÃ¼ft:
    - Berechtigung (Admin-Rolle),
    - Versionskennung,
    - Existenz referenzierender Projekte.
4. Das System stellt fest, dass mindestens ein Projekt existiert.
5. Das System blockiert den LÃ¶schvorgang.
6. Das System antwortet mit 409 (Konflikt) und gibt einen Hinweis auf bestehende Referenzen.

---

### Alternativen

- Kunde existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Der Kunde bleibt unverÃ¤ndert im System bestehen.
- Bestehende Projekte und Termine behalten ihre Referenzen.
- Es entstehen keine verwaisten FremdschlÃ¼ssel oder inkonsistenten ZustÃ¤nde.

### UC 09/15: Konsistenz von Kundenlisten bei StatusÃ¤nderung (Multi-Browser)

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass Kundenlisten bei StatusÃ¤nderungen (Deaktivieren / Reaktivieren / LÃ¶schen) konsistent bleiben und keine veralteten ZustÃ¤nde persistieren.

### Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Browser-Sitzungen sind aktiv.
- Mindestens ein Akteur besitzt Administratorrechte.

---

### Ablauf â€“ Beispiel: Deaktivieren in Browser A

1. Browser A (Administrator) Ã¶ffnet die Kundendetailansicht eines aktiven Kunden.
2. Browser B (Disponent) zeigt eine Kundenliste mit diesem Kunden an.
3. Administrator in Browser A deaktiviert den Kunden.
4. Das System setzt `is_active = false` und persistiert die Ã„nderung.
5. Browser B fÃ¼hrt eine erneute Abfrage der Kundenliste aus (z. B. durch Seitenwechsel, Filterwechsel oder explizites Neuladen).
6. Das System liefert serverseitig gefilterte Daten gemÃ¤ÃŸ Rolle.
7. Der deaktivierte Kunde erscheint nicht mehr in der Liste des Disponenten.

---

### Ablauf â€“ Beispiel: LÃ¶schen

1. Administrator lÃ¶scht einen Kunden ohne Referenzen (UC 13).
2. Ein anderer Browser versucht, denselben Kunden erneut zu laden.
3. Das System prÃ¼ft Existenz.
4. Das System antwortet mit 404.

---

### Konsistenzregeln

- Die Datenquelle ist ausschlieÃŸlich serverseitig maÃŸgeblich.
- Es existiert keine clientseitige Cache-Logik, die serverseitige Filter Ã¼bersteuern darf.
- Jede neue Anfrage muss den aktuellen Persistenzzustand widerspiegeln.
- Es ist nicht erforderlich, dass andere Browser aktiv gepusht werden; Konsistenz ist spÃ¤testens bei der nÃ¤chsten Serverabfrage garantiert.

---

### Alternativen

- Browser verwendet veralteten lokalen Zustand â†’ bei nÃ¤chster Serveranfrage wird Zustand korrigiert.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Kundenlisten sind rollenabhÃ¤ngig und statusabhÃ¤ngig konsistent.
- Es entstehen keine dauerhaft sichtbaren veralteten ZustÃ¤nde.
- GelÃ¶schte oder deaktivierte Kunden kÃ¶nnen nicht dauerhaft angezeigt werden.

### UC 09/16: StatusÃ¤nderung des Kunden wÃ¤hrend Notiz- oder Attachment-Operation

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass parallele StatusÃ¤nderungen eines Kunden (Deaktivieren / LÃ¶schen) keine inkonsistenten ZustÃ¤nde bei Notiz- oder Attachment-Operationen erzeugen.

### Vorbedingungen

- Ein Kunde existiert.
- Mindestens zwei Akteure sind gleichzeitig authentifiziert.
- Einer der Akteure besitzt Administratorrechte.
- Der Kunde ist initial aktiv (`is_active = true`).

---

## Ablauf â€“ Beispiel 1: Notiz hinzufÃ¼gen wÃ¤hrend Deaktivierung

1. Akteur A (Disponent) Ã¶ffnet die Kundendetailansicht und beginnt, eine Notiz zu erstellen.
2. Akteur B (Administrator) deaktiviert den Kunden.
3. Das System persistiert `is_active = false` und erhÃ¶ht die Versionskennung.
4. Akteur A speichert die Notiz.
5. Das System prÃ¼ft:
    - Existenz des Kunden,
    - aktuellen Status,
    - Versionskonsistenz des Parent-Objekts.
6. Das System erlaubt die Notizspeicherung, da Deaktivierung keine fachliche Sperre fÃ¼r bestehende Stammdatenoperationen darstellt.

---

## Ablauf â€“ Beispiel 2: Notiz hinzufÃ¼gen wÃ¤hrend LÃ¶schung

1. Akteur A beginnt mit dem Erstellen einer Notiz.
2. Akteur B lÃ¶scht den Kunden gemÃ¤ÃŸ UC 13.
3. Das System entfernt den Kundendatensatz.
4. Akteur A speichert die Notiz.
5. Das System prÃ¼ft die Parent-Existenz.
6. Das System erkennt, dass der Kunde nicht mehr existiert.
7. Das System blockiert mit 404 oder 409.

---

## Ablauf â€“ Beispiel 3: Attachment-Upload wÃ¤hrend Deaktivierung

1. Akteur A startet einen Upload.
2. Akteur B deaktiviert den Kunden.
3. Das System persistiert `is_active = false`.
4. Der Upload wird abgeschlossen.
5. Das System erlaubt die Persistierung des Attachment-Datensatzes, da Deaktivierung keine Parent-LÃ¶schung darstellt.

---

## Ablauf â€“ Beispiel 4: Attachment-Upload wÃ¤hrend LÃ¶schung

1. Akteur A startet Upload.
2. Akteur B lÃ¶scht den Kunden.
3. Das System entfernt den Kundendatensatz.
4. Der Upload versucht, den Attachment-Datensatz zu persistieren.
5. Das System prÃ¼ft die Parent-Existenz.
6. Das System blockiert mit 404 oder 409.

---

### Konsistenzregeln

- Notiz- und Attachment-Operationen sind nur zulÃ¤ssig, wenn der Parent-Kunde existiert.
- Deaktivierung verhindert keine fachlich zulÃ¤ssigen Operationen auf bestehende Kunden.
- LÃ¶schung eines Kunden verhindert jede weitere Operation auf diesem Parent.
- Es dÃ¼rfen keine verwaisten Notizen oder Attachments entstehen.
- Referenzielle IntegritÃ¤t ist serverseitig garantiert.

---

### Alternativen

- Versionskonflikt â†’ System blockiert mit 409.
- Technischer Fehler â†’ System antwortet mit 500.

---

### Ergebnis

- Es entstehen keine verwaisten DatensÃ¤tze.
- Deaktivierung und LÃ¶schung sind sauber voneinander abgegrenzt.
- Parent-IntegritÃ¤t bleibt auch bei parallelen Operationen gewahrt.

# FT (11): Team Verwaltung

## FT (11) Ziel / Zweck

Teams ermÃ¶glichen der Disposition, hÃ¤ufig verwendete Mitarbeiterkombinationen schnell und konsistent auf Termine anzuwenden. Ziel ist es, die Mitarbeiterzuweisung zu beschleunigen, ohne die Terminplanung fachlich zu verÃ¤ndern oder zu verkomplizieren.

## FT (11) Fachliche Beschreibung

Teams sind **reine Dispositionshilfen**. Ein Team besteht aus einer Bezeichnung und einer Liste aktiver Mitarbeiter. Sie kann beim Anlegen oder Bearbeiten eines Termins ausgewÃ¤hlt werden; das System Ã¼bernimmt dann die enthaltenen Mitarbeiter **als Vorschlag** in die Mitarbeiterzuweisung des Termins.

Am Termin selbst wird **immer die konkrete Mitarbeiterliste** gespeichert, nicht das Team. Ã„nderungen an Teams wirken sich **nicht rÃ¼ckwirkend** auf bestehende oder vergangene Termine aus. Teams besitzen **keine Historie** und haben **keine fachliche Bedeutung** Ã¼ber die Vereinfachung der Eingabe hinaus.

Teams kÃ¶nnen unabhÃ¤ngig von Terminen existieren. Sie dÃ¼rfen ausschlieÃŸlich **aktive Mitarbeiter** enthalten. Beim Anwenden eines Teams ist eindeutig festzulegen, ob die Mitarbeiter **ersetzt** oder **hinzugefÃ¼gt** werden; die Entscheidung ist systemweit konsistent umzusetzen.

## FT (11) Regeln & Randbedingungen

- Teams sind **nicht** direkt mit Terminen verknÃ¼pft.
- Gespeichert wird am Termin stets die **konkrete Mitarbeiterzuweisung**.
- Ã„nderungen an Teams wirken **nicht rÃ¼ckwirkend**.
- Teams enthalten **nur aktive Mitarbeiter**.
- Ein Termin kann mehrere Mitarbeiter haben; die Mitarbeiterzuweisung ist optional.
- Teams besitzen **keine Historie** und **keinen Status**.
- Teams kÃ¶nnen ohne Bezug zu Terminen existieren.
- Ein Mitarbeiter darf zu einem Zeitpunkt nur genau einem Team zugeordnet sein.
- Eine Teamzuweisung ist nur zulÃ¤ssig, wenn der Mitarbeiter keinem anderen Team zugeordnet ist.
- Bei paralleler Zuweisung entscheidet das System deterministisch durch serverseitige Validierung (409 bei Konflikt).

## FT (11) **Use Cases**

### **UC 11/01: Team anlegen**

### Akteur

Disponent

### Ziel

Ein neues Team anlegen, um hÃ¤ufig genutzte Mitarbeiterkombinationen schnell verwenden zu kÃ¶nnen.

### Vorbedingungen

- Es existieren aktive Mitarbeiter.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teamanlage.

### AuslÃ¶ser

Der Akteur startet die Funktion â€žTeam anlegenâ€œ.

### Ablauf

1. Das System erzeugt automatisch eine Bezeichnung fÃ¼r das neue Team.
2. Das System lÃ¤dt ausschlieÃŸlich aktive Mitarbeiter ohne bestehende Teamzuordnung (`team_id = null`).
3. Der Akteur wÃ¤hlt einen oder mehrere angezeigte Mitarbeiter aus.
4. Der Akteur bestÃ¤tigt die Eingabe.
5. Das System prÃ¼ft serverseitig fÃ¼r jeden ausgewÃ¤hlten Mitarbeiter:
    - Der Mitarbeiter existiert.
    - Der Mitarbeiter ist aktiv.
    - Der Mitarbeiter besitzt keine bestehende Teamzuordnung.
6. Das System persistiert das Team.
7. Das System setzt fÃ¼r jeden ausgewÃ¤hlten Mitarbeiter das Feld `team_id` auf die ID des neu angelegten Teams.
8. Das System erzeugt eine Versionskennung fÃ¼r das Team.

### AlternativablÃ¤ufe

- Keine Mitarbeiter ausgewÃ¤hlt â†’ Das System lehnt die Speicherung ab und fordert zur Auswahl auf.
- Ein ausgewÃ¤hlter Mitarbeiter ist zwischenzeitlich einem anderen Team zugeordnet worden â†’ Das System antwortet mit 409 Conflict, es erfolgt keine Persistierung.
- Versionskonflikt bei paralleler Anlage mit identischer Bezeichnung â†’ Das System behandelt dies gemÃ¤ÃŸ allgemeiner Persistenzregeln.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung erfolgt.

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

Ein bestehendes Team anpassen, indem Mitarbeiter hinzugefÃ¼gt oder entfernt werden.

### Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Teambearbeitung.
- Das Team besitzt eine gÃ¼ltige Versionskennung.

### AuslÃ¶ser

Der Akteur Ã¶ffnet ein bestehendes Team zur Bearbeitung.

### Ablauf

1. Das System lÃ¤dt Teamdaten inklusive aktueller Versionskennung.
2. Das System lÃ¤dt als auswÃ¤hlbare Mitarbeiter:
    - alle aktiven Mitarbeiter ohne Teamzuordnung (`team_id = null`),
    - alle aktiven Mitarbeiter, die bereits diesem Team zugeordnet sind.
3. Der Akteur verÃ¤ndert die Mitarbeiterliste.
4. Der Akteur bestÃ¤tigt die Ã„nderungen.
5. Das System prÃ¼ft serverseitig:
    - Versionskennung ist unverÃ¤ndert.
    - Jeder neu hinzugefÃ¼gte Mitarbeiter existiert.
    - Jeder neu hinzugefÃ¼gte Mitarbeiter ist aktiv.
    - Kein neu hinzugefÃ¼gter Mitarbeiter ist einem anderen Team zugeordnet.
6. Das System entfernt `team_id` bei Mitarbeitern, die aus dem Team entfernt wurden.
7. Das System setzt `team_id` bei neu hinzugefÃ¼gten Mitarbeitern auf die Team-ID.
8. Das System erhÃ¶ht die Versionskennung des Teams.
9. Das System persistiert die Ã„nderungen atomar.

### AlternativablÃ¤ufe

- Versionskennung hat sich zwischenzeitlich geÃ¤ndert â†’ Das System antwortet mit 409 Conflict, keine Persistierung.
- Ein neu hinzugefÃ¼gter Mitarbeiter wurde parallel einem anderen Team zugeordnet â†’ Das System antwortet mit 409 Conflict, keine Persistierung.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung erfolgt.

### Ergebnis

- Die Mitarbeiterliste des Teams ist aktualisiert.
- Kein Mitarbeiter ist mehreren Teams zugeordnet.
- Die Team-Version ist erhÃ¶ht.
- Der Datenzustand ist konsistent.

### **UC 11/03: Team lÃ¶schen**

### Akteur

Disponent

### Ziel

Ein nicht mehr benÃ¶tigtes Team entfernen.

### Vorbedingungen

- Das Team existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zum LÃ¶schen von Teams.
- Das Team besitzt eine gÃ¼ltige Versionskennung.

### AuslÃ¶ser

Der Akteur wÃ¤hlt ein Team zum LÃ¶schen aus.

### Ablauf

1. Der Akteur startet â€žTeam lÃ¶schenâ€œ.
2. Das System fordert eine BestÃ¤tigung an.
3. Der Akteur bestÃ¤tigt den LÃ¶schvorgang.
4. Das System prÃ¼ft serverseitig die Versionskennung.
5. Das System setzt bei allen Mitarbeitern dieses Teams das Feld `team_id = null`.
6. Das System lÃ¶scht das Team.

### AlternativablÃ¤ufe

- Versionskonflikt â†’ Das System antwortet mit 409 Conflict, keine LÃ¶schung.
- Abbruch durch den Akteur â†’ Keine LÃ¶schung.
- Technischer Fehler â†’ Das System antwortet mit 500, keine Teilpersistierung.

### Ergebnis

- Das Team existiert nicht mehr.
- Alle ehemals zugeordneten Mitarbeiter besitzen `team_id = null`.
- Kein verwaister Zustand entsteht.

### **UC 11/04: Team anzeigen**

### Akteur

Disponent

### Ziel

Eine Ãœbersicht Ã¼ber vorhandene Teams und deren Zusammensetzung erhalten.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leseberechtigung.

### AuslÃ¶ser

Der Akteur ruft die TeamÃ¼bersicht auf oder wÃ¤hlt ein Team aus.

### Ablauf

1. Das System lÃ¤dt alle Teams.
2. Das System lÃ¤dt zu jedem Team die aktuell zugeordneten aktiven Mitarbeiter (`team_id = teamId`).
3. Das System zeigt Bezeichnung und Mitarbeiterliste an.

### AlternativablÃ¤ufe

- Keine Teams vorhanden â†’ Das System zeigt eine entsprechende Information an.
- Technischer Fehler â†’ Das System antwortet mit 500.

### Ergebnis

- Die Zusammensetzung der Teams ist vollstÃ¤ndig und konsistent sichtbar.

# FT (12): DispositionsÃ¼bersicht

## FT (12) Ziel / Zweck

Dieses Feature unterstÃ¼tzt die Disposition durch eine Ã¼bersichtliche, wochenbezogene Darstellung von Mitarbeiter- und Tourzuordnungen. Ziel ist es, Einsatzverteilungen transparent zu machen und Planungsentscheidungen zu erleichtern, ohne in bestehende Termin- oder Ressourcendaten einzugreifen.

## FT (12) Fachliche Beschreibung

Die DispositionsÃ¼bersicht stellt aus bestehenden Termindaten abgeleitete WochenÃ¼bersichten bereit. Sie zeigt, **welcher Mitarbeiter in welchen Kalenderwochen auf welchen Touren eingesetzt ist** und umgekehrt, **welche Mitarbeiter innerhalb einer Kalenderwoche auf einer bestimmten Tour eingeplant sind**.

Die Ãœbersichten basieren ausschlieÃŸlich auf vorhandenen Termin-, Mitarbeiter- und Tourzuordnungen. Es findet keine Bewertung, Priorisierung oder automatische Korrektur statt. Die Darstellung dient der Orientierung und ErgÃ¤nzung der Terminplanung, insbesondere zur Erkennung von Mehrfachzuordnungen oder hÃ¤ufigen Tourwechseln innerhalb einer Woche.

Die DispositionsÃ¼bersicht berÃ¼cksichtigt aktuelle und zukÃ¼nftige Termine. Vergangene Termine kÃ¶nnen optional angezeigt werden, sind jedoch rein informativ und nicht verÃ¤nderbar.

## FT (12) Regeln & Randbedingungen

- Die Ãœbersichten werden ausschlieÃŸlich aus bestehenden Terminen abgeleitet.
- Es werden nur Termine berÃ¼cksichtigt, denen mindestens ein Mitarbeiter zugewiesen ist.
- Die Darstellung erfolgt kalenderwochenbezogen.
- Ein Mitarbeiter kann innerhalb einer Kalenderwoche nur einer Tour zugeordnet sein
- Soll ein Mitarbeiter innerhalb einer Woche an Terminen verschieder Touren teilnehmen, kann dies Ã¼ber die direkte Mitarbeiter - Termizuweisung realisiert werden
- Tourwechsel innerhalb einer Woche sind nicht mÃ¶glich
- Die Ãœbersicht trifft keine fachliche Bewertung und lÃ¶st keine Warnungen aus.
- Die Anzeige ist rein informativ und verÃ¤ndert keine Termine, Mitarbeiter oder Touren.

## FT (12) **Use Cases**

### **UC 12/01: Mitarbeiterbezogene WochenÃ¼bersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, auf welchen Touren ein Mitarbeiter innerhalb einzelner Kalenderwochen eingesetzt ist.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Ãœbersicht der EinsÃ¤tze eines Mitarbeiters bereit. Die Ãœbersicht wird aus bestehenden Terminen abgeleitet und zeigt die Tourzuordnung pro Kalenderwoche.

**Vorbedingungen**

- Es existieren Termine mit Mitarbeiter- und Tourzuordnung.
- Der Disponent ist berechtigt, DispositionsÃ¼bersichten einzusehen.

**AuslÃ¶ser**

Der Disponent ruft die DispositionsÃ¼bersicht fÃ¼r einen Mitarbeiter auf.

**Ablauf**

1. Der Disponent wÃ¤hlt einen Mitarbeiter aus.
2. Das System ermittelt alle Termine, denen der Mitarbeiter zugewiesen ist.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugehÃ¶rigen Touren je Woche ab.
5. Das System stellt die WochenÃ¼bersicht des Mitarbeiters dar.

**AlternativablÃ¤ufe**

- Dem Mitarbeiter sind keine Termine zugeordnet: Das System zeigt eine leere Ãœbersicht an.

**Ergebnis**

Der Disponent erhÃ¤lt eine Ãœbersicht, aus der ersichtlich ist, auf welchen Touren der Mitarbeiter in den einzelnen Kalenderwochen eingesetzt ist.

**Ausgegebene Informationen**

- Kalenderwoche
- Mitarbeiter
- Zugeordnete Tour(en)

**Regeln & Randbedingungen**

- Die Ãœbersicht ist informativ und nicht blockierend.
- Die Anzeige verÃ¤ndert keine fachlichen Daten.

### **UC 12/02: Tourbezogene WochenÃ¼bersicht anzeigen**

**Akteur**

Disponent

**Ziel**

Erkennen, welche Mitarbeiter innerhalb einzelner Kalenderwochen auf einer bestimmten Tour eingesetzt sind.

**Beschreibung**

Der Use Case stellt eine wochenbezogene Ãœbersicht einer Tour bereit. Die Ãœbersicht zeigt, welche Mitarbeiter in einer Kalenderwoche Terminen dieser Tour zugeordnet sind.

**Vorbedingungen**

- Es existieren Termine mit Tour- und Mitarbeiterzuordnung.
- Der Disponent ist berechtigt, DispositionsÃ¼bersichten einzusehen.

**AuslÃ¶ser**

Der Disponent ruft die DispositionsÃ¼bersicht fÃ¼r eine Tour auf.

**Ablauf**

1. Der Disponent wÃ¤hlt eine Tour aus.
2. Das System ermittelt alle Termine, die dieser Tour zugeordnet sind.
3. Das System ordnet die Termine den jeweiligen Kalenderwochen zu.
4. Das System leitet aus den Terminen die zugeordneten Mitarbeiter je Woche ab.
5. Das System stellt die WochenÃ¼bersicht der Tour dar.

**AlternativablÃ¤ufe**

- Der Tour sind keine Termine zugeordnet: Das System zeigt eine leere Ãœbersicht an.

**Ergebnis**

Der Disponent erhÃ¤lt eine Ãœbersicht, aus der ersichtlich ist, welche Mitarbeiter in den einzelnen Kalenderwochen auf der ausgewÃ¤hlten Tour eingesetzt sind.

**Ausgegebene Informationen**

- Kalenderwoche
- Tour
- Zugeordnete Mitarbeiter

**Regeln & Randbedingungen**

- Ein Mitarbeiter kann innerhalb einer Woche mehrfach oder auf mehreren Touren erscheinen.
- Die Ãœbersicht trifft keine fachliche Bewertung.
- Die Anzeige verÃ¤ndert keine Termine, Mitarbeiter oder Touren.

# FT (13): Notizverwaltung

## FT (13) Ziel / Zweck

Dieses Feature ermÃ¶glicht die Verwaltung von Notizen als eigenstÃ¤ndige Domainobjekte, die sowohl Projekten als auch Kunden zugeordnet werden kÃ¶nnen. Notizen dienen der Dokumentation zusÃ¤tzlicher Informationen, Hinweise oder Besonderheiten, die im Kontext eines Projekts oder Kunden relevant sind.

ZusÃ¤tzlich bietet das Feature vordefinierte Notizvorlagen als Eingabehilfe sowie die MÃ¶glichkeit, wichtige Notizen anzupinnen, damit diese stets oben in der Notizliste erscheinen.

## FT (13) Fachliche Beschreibung

Notizen sind eigenstÃ¤ndige Textobjekte mit Titel, formatierbarer Beschreibung und Zeitstempeln fÃ¼r Erstellung und letzte Bearbeitung. Sie werden Ã¼ber Relationstabellen entweder Projekten oder Kunden zugeordnet und ermÃ¶glichen eine flexible Dokumentation ohne strukturelle AbhÃ¤ngigkeiten.

Eine Notiz gehÃ¶rt immer genau einem Parent-Objekt (Projekt oder Kunde). Eine Notiz existiert nie unabhÃ¤ngig â€“ sie wird immer im Kontext ihres Parents erstellt, verwaltet und gelÃ¶scht.

Notizen werden in den Detailansichten von Projekt und Kunde als vertikale KÃ¤rtchenliste dargestellt. Die Bearbeitung erfolgt Ã¼ber einen schwebenden Richtext-Editor, der Textformatierung sowie Text- und Hintergrundfarben unterstÃ¼tzt.

**Angepinnte Notizen** werden in der Liste immer zuerst angezeigt, unabhÃ¤ngig von Erstellungs- oder Ã„nderungsdatum. Innerhalb der gepinnten und nicht-gepinnten Gruppen erfolgt die Sortierung nach Ã„nderungsdatum (neueste zuerst).

**Notizvorlagen** sind vordefinierte Textbausteine, die beim Erstellen einer neuen Notiz als Ausgangspunkt gewÃ¤hlt werden kÃ¶nnen. Vorlagen werden zentral in den Stammdaten verwaltet und stehen bei der Notizerstellung als Auswahlliste zur VerfÃ¼gung. Die Vorlage wird beim Erstellen in die neue Notiz kopiert â€“ danach besteht keine Verbindung mehr zwischen Vorlage und Notiz.

Notizen haben keine fachliche Wirkung auf Termine, Status oder Planungslogik. Sie dienen ausschlieÃŸlich der Information und Dokumentation. Das LÃ¶schen einer Notiz erfolgt direkt Ã¼ber die Detailansicht des zugehÃ¶rigen Parents und ist endgÃ¼ltig.

**Neu: Kennzeichnungsfarbe fÃ¼r Notizvorlagen (optional, Admin-only).** Notizvorlagen kÃ¶nnen optional eine zusÃ¤tzliche Eigenschaft `color` besitzen, die eine fachliche Kennzeichnung darstellt und nicht mit Text- oder Hintergrundfarben innerhalb des Richtext-Inhalts zu verwechseln ist. Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden. Wird anschlieÃŸend eine Notiz aus dieser Vorlage erzeugt, wird diese `color` beim Erstellen auf die neue Notiz Ã¼bertragen. Daraus folgt, dass `color` als administrativ gepflegte Eigenschaft zu behandeln ist, die nur durch Administratoren gesetzt oder geÃ¤ndert werden darf.

## FT (13) Regeln & Randbedingungen

**Allgemeine Regeln fÃ¼r Notizen**

- Eine Notiz ist ein eigenstÃ¤ndiges Domainobjekt mit eigener ID.
- Eine Notiz gehÃ¶rt immer genau einem Parent-Objekt (Projekt oder Kunde).
- Eine Notiz kann nie ohne Parent-Zuordnung existieren.
- Pflichtfelder einer Notiz:
    - Titel (Text)
    - Beschreibung (formatierter Text)
- Automatisch gepflegte Felder:
    - created_at (Erstellungszeitpunkt)
    - updated_at (letzter Bearbeitungszeitpunkt)
- Eine Notiz wird Ã¼ber Relationstabellen verknÃ¼pft mit:
    - genau 1 Projekt (Ã¼ber `project_note`) ODER
    - genau 1 Kunde (Ã¼ber `customer_note`)
- Das LÃ¶schen einer Notiz ist endgÃ¼ltig und entfernt automatisch die zugehÃ¶rige Relation (CASCADE).
- Das LÃ¶schen eines Projekts oder Kunden entfernt automatisch alle zugehÃ¶rigen Notizen und deren Relationen (CASCADE).
- Notizen werden ausschlieÃŸlich in den Detailansichten von Projekt oder Kunde verwaltet.
- Es gibt keine separate Notizverwaltung in der Navigation.
- Notizen haben keine Versionierung oder Historie.
- Notizen sind rein informativ und haben keine Auswirkung auf Terminplanung oder GeschÃ¤ftslogik.

**Regeln fÃ¼r angepinnte Notizen**

- Eine Notiz kann Ã¼ber das Feld `is_pinned` als angepinnt markiert werden.
- Angepinnte Notizen erscheinen in der Notizliste immer vor nicht-angepinnten Notizen.
- Innerhalb der gepinnten Gruppe erfolgt die Sortierung nach `updated_at` absteigend.
- Innerhalb der nicht-gepinnten Gruppe erfolgt die Sortierung ebenfalls nach `updated_at` absteigend.
- Das Pinning kann jederzeit aktiviert oder deaktiviert werden.

**Regeln fÃ¼r Notizvorlagen**

- Notizvorlagen sind eigenstÃ¤ndige Stammdatenobjekte mit Titel und vordefiniertem Inhalt.
- Vorlagen existieren unabhÃ¤ngig von Projekten und Kunden.
- Vorlagen werden in einem eigenen Stammdatenbereich verwaltet (z.B. unter Einstellungen oder Stammdaten).
- Beim Erstellen einer Notiz kann optional eine Vorlage ausgewÃ¤hlt werden.
- Bei Auswahl einer Vorlage werden Titel und Beschreibung in den Editor kopiert.
- Nach dem Kopieren besteht keine Verbindung zwischen Vorlage und erstellter Notiz.
- Ã„nderungen an einer Vorlage wirken sich nicht auf bereits erstellte Notizen aus.
- Vorlagen kÃ¶nnen eine Sortierreihenfolge haben, um die Anzeige in der Auswahlliste zu steuern.
- Vorlagen kÃ¶nnen deaktiviert werden, ohne sie zu lÃ¶schen.
- 

**Neu: Regeln zur Kennzeichnungsfarbe (`color`)**

- Notizvorlagen kÃ¶nnen optional eine Kennzeichnungsfarbe `color` besitzen.
- `color` ist eine Admin-only Eigenschaft und darf nur von Administratoren gesetzt oder geÃ¤ndert werden.
- Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden.
- Wird eine Notiz aus einer Vorlage erstellt, wird `color` beim Erstellen der Notiz in die Notiz Ã¼bernommen, sofern die Vorlage eine `color` besitzt.
- Die Ãœbernahme der `color` ist einmalig beim Erstellen; spÃ¤tere Ã„nderungen an der Vorlagen-`color` verÃ¤ndern bereits erstellte Notizen nicht automatisch.
- `color` ist fachliche Kennzeichnung und unabhÃ¤ngig von Richtext-Formatierungen (Text-/Hintergrundfarben) im Feld `body`.

## FT (13) **Use Cases**

### **UC 13/01: Notiz zu Projekt hinzufÃ¼gen**

### kteur

Disponent

### Ziel

Eine neue Notiz erstellen und einem Projekt zuordnen.

### Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Projektnotizen.

### Ablauf

1. Der Akteur Ã¶ffnet die Projektdetailansicht.
2. Der Akteur wÃ¤hlt â€žNotiz hinzufÃ¼genâ€œ.
3. Das System Ã¶ffnet einen Richtext-Editor.
4. Optional zeigt das System aktive Vorlagen an.
5. WÃ¤hlt der Akteur eine Vorlage, Ã¼bernimmt das System Titel und Inhalt.
6. Besitzt die Vorlage eine Kennzeichnungsfarbe (`color`), Ã¼bernimmt das System diese einmalig.
7. Der Akteur erfasst oder Ã¤ndert Titel und Beschreibung.
8. Der Akteur bestÃ¤tigt.
9. Das System validiert Pflichtfelder.
10. Das System persistiert die Notiz mit Projektreferenz.
11. Das System aktualisiert die Notizenliste.

### Alternativen

- Pflichtfelder fehlen â†’ Validierungsfehler.
- Abbruch â†’ keine Persistenz.

### Ergebnis

Die Notiz ist persistent gespeichert und projektbezogen referenziert.

### **UC 13/02: Notiz zu Kunde hinzufÃ¼gen**

### Akteur

Disponent, Administrator

### Ziel

Eine neue Notiz erstellen und eindeutig einem bestehenden Kunden zuordnen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Kundennotizen.
- Das System erzwingt eine eindeutige Parent-Zuordnung (Kunde).

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Kunden.
2. Der Akteur wÃ¤hlt die Funktion â€žNotiz hinzufÃ¼genâ€œ.
3. Das System Ã¶ffnet einen Richtext-Editor zur Erfassung der Notizdaten.
4. Das System zeigt ausschlieÃŸlich aktive Notizvorlagen zur Auswahl an.
5. Optional wÃ¤hlt der Akteur eine Vorlage.
6. Wurde eine Vorlage gewÃ¤hlt, Ã¼bernimmt das System Titel und Inhalt in den Editor.
7. Besitzt die gewÃ¤hlte Vorlage eine Kennzeichnungsfarbe (`color`), Ã¼bernimmt das System diese Kennzeichnungsfarbe einmalig in die neue Notiz.
8. Der Akteur erfasst oder Ã¤ndert Titel und Beschreibung der Notiz.
9. Der Akteur bestÃ¤tigt die Eingabe.
10. Das System validiert Pflichtfelder und Berechtigungen serverseitig.
11. Das System erstellt die Notiz mit folgenden Initialwerten:
    - Referenz ausschlieÃŸlich auf den gewÃ¤hlten Kunden
    - Keine Projekt-Referenz
    - `is_pinned = false`
    - Setzen von `created_at` und `updated_at`
12. Das System speichert die Notiz persistent.
13. Das System aktualisiert die Notizenliste in der Kundendetailansicht gemÃ¤ÃŸ Sortierlogik.

### AlternativablÃ¤ufe

- Pflichtfelder fehlen â†’ Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Speicherung.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler bei Speicherung â†’ HTTP 500, keine persistente Notiz entsteht.

### Ergebnis

- Eine neue Notiz existiert persistent.
- Die Notiz ist ausschlieÃŸlich dem Kunden zugeordnet.
- Die Notiz erscheint in der Notizenliste des Kunden.
- Es entstehen keine zusÃ¤tzlichen Referenzen oder Seiteneffekte in anderen DomÃ¤nen.

### **UC 13/03: Notiz bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notiz Ã¤ndern, ohne parallele Ã„nderungen anderer Akteure still zu Ã¼berschreiben.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Notiz aus der Notizenliste eines Kunden oder Projekts.
2. Das System lÃ¤dt die vollstÃ¤ndigen Notizdaten einschlieÃŸlich des aktuellen Versionsmerkmals.
3. Der Akteur Ã¤ndert Titel und/oder Beschreibung der Notiz.
4. Ã„nderungen an der Kennzeichnungsfarbe (`color`) sind nicht Bestandteil der normalen Bearbeitung durch Disponenten.
5. Der Akteur bestÃ¤tigt die Ã„nderungen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Ã¼bermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen Ã¼berein, speichert das System die Ã„nderungen.
8. Das System erhÃ¶ht das Versionsmerkmal und setzt `updated_at` auf den aktuellen Zeitstempel.
9. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### AlternativablÃ¤ufe

- Pflichtfelder ungÃ¼ltig â†’ Das System verweigert die Speicherung und zeigt Validierungsfehler an.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Speicherung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Speicherung.
- Versionskonflikt (Notiz wurde zwischenzeitlich von einem anderen Akteur geÃ¤ndert oder gelÃ¶scht) â†’
    
    Das System antwortet mit HTTP 409 Conflict, speichert keine Ã„nderungen und fordert den Akteur zum Neuladen des aktuellen Stands auf.
    
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung wird gespeichert.

### Ergebnis

- Die Notiz ist im Erfolgsfall mit neuer Versionsinformation gespeichert.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Die Notiz bleibt konsistent dem ursprÃ¼nglichen Parent-Objekt zugeordnet.
- Es entstehen keine inkonsistenten ZwischenzustÃ¤nde oder Lost Updates.

### **UC 13/04: Notiz lÃ¶schen**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notiz vollstÃ¤ndig und konsistent entfernen.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Notizenliste im jeweiligen Parent-Kontext (Kunde oder Projekt).
2. Der Akteur wÃ¤hlt eine bestehende Notiz aus.
3. Der Akteur wÃ¤hlt die Funktion â€žNotiz lÃ¶schenâ€œ.
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt das LÃ¶schen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Ã¼bermittelten Versionsmerkmals mit dem aktuellen Stand.
7. Stimmen die Versionsinformationen Ã¼berein, lÃ¶scht das System die Notiz sowie die zugehÃ¶rige Parent-Relation endgÃ¼ltig.
8. Das System aktualisiert die Notizenliste im jeweiligen Parent-Kontext.

### AlternativablÃ¤ufe

- Der Akteur bricht die Sicherheitsabfrage ab â†’ Die Notiz bleibt unverÃ¤ndert bestehen.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt (Notiz wurde zwischenzeitlich geÃ¤ndert oder bereits gelÃ¶scht) â†’
    
    Das System antwortet mit HTTP 409 Conflict, es erfolgt keine LÃ¶schung, der Akteur wird zum Neuladen aufgefordert.
    
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung erfolgt.

### Ergebnis

- Die Notiz ist im Erfolgsfall vollstÃ¤ndig aus dem System entfernt.
- Die Notiz erscheint in keiner Notizenliste mehr.
- Parallele Aktionen fÃ¼hren nicht zu inkonsistenten ZustÃ¤nden oder unbeabsichtigten LÃ¶schungen.
- Die Konsistenz der Parent-Relation bleibt gewahrt.

### **UC 13/05: Notizen eines Projekts anzeigen**

### Akteur

Disponent, Administrator, Leser

### Ziel

Alle einem Projekt eindeutig zugeordneten Notizen vollstÃ¤ndig und konsistent einsehen.

### Vorbedingungen

- Das Projekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte fÃ¼r das Projekt.

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Projekts.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System lÃ¤dt alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale KÃ¤rtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. Die Darstellung enthÃ¤lt keine Bearbeitungselemente, sofern der Akteur ausschlieÃŸlich Leserechte besitzt.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte â†’ HTTP 403, keine Anzeige.
- Es existieren keine Notizen â†’ Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler â†’ HTTP 500, keine Anzeige.

### Ergebnis

- Alle projektbezogenen Notizen sind konsistent sichtbar.
- Es werden ausschlieÃŸlich Notizen dieses Projekts angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verÃ¤ndert keine persistierten Daten.

### **UC 13/06: Notizen eines Kunden anzeigen**

### Akteur

Disponent, Administrator, Leser

### Ziel

Alle einem Kunden eindeutig zugeordneten Notizen vollstÃ¤ndig und konsistent einsehen.

### Vorbedingungen

- Der Kunde existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt mindestens Leserechte fÃ¼r den Kunden.

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Kunden.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System lÃ¤dt ausschlieÃŸlich die Notizen, die eindeutig diesem Kunden zugeordnet sind.
4. Das System sortiert die Notizen deterministisch:
    - Angepinnte Notizen (`is_pinned = true`) erscheinen zuerst.
    - Innerhalb gleicher Pin-Logik erfolgt die Sortierung nach `updated_at` absteigend.
5. Das System rendert die Notizen als vertikale KÃ¤rtchenliste.
6. Jede Notiz zeigt mindestens:
    - Titel,
    - Beschreibung (Richtext formatiert),
    - visuelle Kennzeichnung bei gesetzter `color`,
    - ggf. Pin-Symbol.
7. EnthÃ¤lt der Akteur ausschlieÃŸlich Leserechte, werden keine Bearbeitungs- oder LÃ¶schfunktionen angezeigt.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Anzeige.
- Der Akteur besitzt keine Leserechte â†’ HTTP 403, keine Anzeige.
- Es existieren keine Notizen â†’ Das System zeigt eine leere Liste ohne Fehler an.
- Technischer Fehler â†’ HTTP 500, keine Anzeige.

### Ergebnis

- Alle kundenspezifischen Notizen sind konsistent sichtbar.
- Es werden ausschlieÃŸlich Notizen dieses Kunden angezeigt.
- Die Sortierung ist deterministisch und reproduzierbar.
- Die Anzeige verÃ¤ndert keine persistierten Daten und hat keine Seiteneffekte auf Projektnotizen.

### **UC 13/07: Notiz anpinnen / Pinning aufheben**

### Akteur

Disponent, Administrator

### Ziel

Die Position einer bestehenden Notiz innerhalb der Notizenliste deterministisch beeinflussen, indem sie angepinnt oder das Pinning aufgehoben wird.

### Vorbedingungen

- Die Notiz existiert.
- Die Notiz ist eindeutig einem Kunden oder Projekt zugeordnet.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Schreibrechte fÃ¼r Notizen.
- Die Notiz verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Notizenliste im jeweiligen Parent-Kontext.
2. Der Akteur wÃ¤hlt eine bestehende Notiz aus.
3. Der Akteur wÃ¤hlt die Funktion â€žAnpinnenâ€œ oder â€žPinning aufhebenâ€œ.
4. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher PrÃ¼fung setzt das System `is_pinned` entsprechend auf TRUE oder FALSE.
6. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System sortiert die Notizenliste neu gemÃ¤ÃŸ Sortierlogik:
    - Gepinnte Notizen zuerst,
    - danach Sortierung nach `updated_at` absteigend.
8. Das System rendert die aktualisierte Liste.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

### Ergebnis

- Die Notiz ist im Erfolgsfall angepinnt oder nicht mehr angepinnt.
- Die Sortierung der Notizenliste ist deterministisch und konsistent.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Es entstehen keine Duplikate oder inkonsistenten SortierzustÃ¤nde.

### **UC 13/08: Notizvorlage erstellen**

### Akteur

Disponent, Administrator

### Ziel

Eine neue Notizvorlage anlegen, die bei der Erstellung von Notizen ausgewÃ¤hlt werden kann.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.

### Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žVorlage hinzufÃ¼genâ€œ.
3. Das System Ã¶ffnet einen Editor zur Erfassung der Vorlagendaten.
4. Der Akteur erfasst mindestens Titel und vordefinierten Inhalt.
5. Optional legt der Akteur eine Sortierreihenfolge fest.
6. Optional legt der Administrator eine Kennzeichnungsfarbe (`color`) fest. Disponenten kÃ¶nnen die Kennzeichnungsfarbe nicht setzen oder Ã¤ndern.
7. Der Akteur bestÃ¤tigt die Eingabe.
8. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder.
9. Das System erstellt die Vorlage mit folgenden Initialwerten:
    - `is_active = true`,
    - Setzen von `created_at` und `updated_at`.
10. Das System speichert die Vorlage persistent.
11. Das System aktualisiert die Vorlagenliste gemÃ¤ÃŸ definierter Sortierlogik.

### AlternativablÃ¤ufe

- Pflichtfelder fehlen â†’ Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Persistierung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine Persistierung.
- Abbruch durch den Akteur â†’ Keine Persistierung.

### Ergebnis

- Eine neue Notizvorlage existiert persistent.
- Die Vorlage ist aktiv (`is_active = true`) und erscheint in der Auswahlliste bei der Notizerstellung.
- Die Kennzeichnungsfarbe ist ausschlieÃŸlich gesetzt, wenn sie durch einen Administrator definiert wurde.
- Es entstehen keine Seiteneffekte auf bereits bestehende Notizen.

### **UC 13/09: Notizvorlage bearbeiten**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notizvorlage Ã¤ndern, ohne bereits erstellte Notizen rÃ¼ckwirkend zu beeinflussen.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Das System lÃ¤dt die Vorlagendaten einschlieÃŸlich Versionsmerkmal.
4. Der Akteur Ã¤ndert Titel, vordefinierten Inhalt und optional die Sortierreihenfolge.
5. Optional Ã¤ndert der Administrator die Kennzeichnungsfarbe (`color`). Disponenten dÃ¼rfen die Kennzeichnungsfarbe nicht setzen oder Ã¤ndern.
6. Der Akteur bestÃ¤tigt die Ã„nderungen.
7. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Validierung der Pflichtfelder,
    - Ãœbereinstimmung des Versionsmerkmals.
8. Stimmen die Versionsinformationen Ã¼berein, speichert das System die Ã„nderungen.
9. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
10. Das System aktualisiert die Vorlagenliste gemÃ¤ÃŸ Sortierlogik.

### AlternativablÃ¤ufe

- Pflichtfelder ungÃ¼ltig â†’ Validierungsfehler, keine Persistierung.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Abbruch durch den Akteur â†’ Keine Persistierung.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

### Ergebnis

- Die Vorlage ist im Erfolgsfall aktualisiert.
- Bereits erstellte Notizen bleiben unverÃ¤ndert, einschlieÃŸlich ihrer Ã¼bernommenen Kennzeichnungsfarbe.
- Parallele Ã„nderungen fÃ¼hren nicht zu stillen Ãœberschreibungen.
- Die Vorlage steht weiterhin gemÃ¤ÃŸ `is_active`Status in Auswahllisten zur VerfÃ¼gung.

### **UC 13/10: Notizvorlage deaktivieren/aktivieren**

### Akteur

Disponent, Administrator

### Ziel

Den Aktivstatus einer bestehenden Notizvorlage Ã¤ndern, ohne sie physisch zu lÃ¶schen.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Der Akteur wÃ¤hlt die Funktion â€žDeaktivierenâ€œ oder â€žAktivierenâ€œ.
4. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
5. Bei erfolgreicher PrÃ¼fung setzt das System das Feld `is_active` entsprechend auf TRUE oder FALSE.
6. Das System erhÃ¶ht das Versionsmerkmal und aktualisiert `updated_at`.
7. Das System speichert die Ã„nderung persistent.
8. Das System aktualisiert die Vorlagenliste.

### AlternativablÃ¤ufe

- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine Ã„nderung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine Ã„nderung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine Ã„nderung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine Ã„nderung.

### Ergebnis

- Der Aktivstatus der Vorlage ist aktualisiert.
- Nur Vorlagen mit `is_active = true` erscheinen in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverÃ¤ndert.
- Es entsteht keine physische LÃ¶schung der Vorlage.

### **UC 13/11: Notizvorlage lÃ¶schen**

### Akteur

Disponent, Administrator

### Ziel

Eine bestehende Notizvorlage endgÃ¼ltig aus dem System entfernen, ohne bereits erstellte Notizen zu verÃ¤ndern.

### Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemÃ¤ÃŸ Rollenkonzept.
- Die Vorlage verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Vorlagenverwaltung.
2. Der Akteur wÃ¤hlt eine bestehende Vorlage aus.
3. Der Akteur wÃ¤hlt die Funktion â€žLÃ¶schenâ€œ.
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt das LÃ¶schen.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
7. Stimmen die Versionsinformationen Ã¼berein, lÃ¶scht das System die Vorlage endgÃ¼ltig aus der Persistenz.
8. Das System aktualisiert die Vorlagenliste.

### AlternativablÃ¤ufe

- Der Akteur bricht die Sicherheitsabfrage ab â†’ Die Vorlage bleibt unverÃ¤ndert bestehen.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine LÃ¶schung, Neuladen erforderlich.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung.

### Ergebnis

- Die Vorlage ist im Erfolgsfall vollstÃ¤ndig aus dem System entfernt.
- GelÃ¶schte Vorlagen erscheinen nicht mehr in der Vorlagenverwaltung und nicht in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverÃ¤ndert bestehen.
- Es entstehen keine verwaisten Referenzen oder Seiteneffekte in bestehenden Notizen.

### UC 13/12: Notizen bei zulÃ¤ssiger ProjektlÃ¶schung kaskadierend entfernen

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass bei einer fachlich zulÃ¤ssigen LÃ¶schung eines Projekts alle eindeutig zugeordneten Projektnotizen konsistent und automatisch entfernt werden.

### Vorbedingungen

- Das Projekt existiert.
- Dem Projekt sind eine oder mehrere Notizen eindeutig zugeordnet.
- Mit dem Projekt ist **kein Termin verbunden**.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r Projekte.
- Das Projekt verfÃ¼gt Ã¼ber ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines bestehenden Projekts.
2. Der Akteur wÃ¤hlt die Funktion â€žLÃ¶schenâ€œ.
3. Das System prÃ¼ft vor Anzeige der Sicherheitsabfrage, ob mit dem Projekt Termine verknÃ¼pft sind.
4. Sind keine Termine verknÃ¼pft, zeigt das System eine Sicherheitsabfrage an.
5. Der Akteur bestÃ¤tigt die LÃ¶schung.
6. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals des Projekts,
    - weiterhin das Nichtvorhandensein verknÃ¼pfter Termine.
7. Stimmen alle PrÃ¼fungen, lÃ¶scht das System das Projekt.
8. Das System entfernt automatisch alle Notizen, die eindeutig diesem Projekt zugeordnet sind.
9. Das System stellt sicher, dass keine verwaisten Projektnotizen verbleiben.
10. Das System bestÃ¤tigt den erfolgreichen LÃ¶schvorgang.

### AlternativablÃ¤ufe

- Mit dem Projekt sind Termine verknÃ¼pft â†’ HTTP 409 Conflict, keine LÃ¶schung.
- Der Akteur bricht die Sicherheitsabfrage ab â†’ Keine LÃ¶schung.
- Der Akteur ist nicht authentifiziert â†’ HTTP 401, keine LÃ¶schung.
- Der Akteur besitzt keine ausreichende Rolle â†’ HTTP 403, keine LÃ¶schung.
- Versionskonflikt â†’ HTTP 409 Conflict, keine LÃ¶schung.
- Technischer Fehler â†’ HTTP 500, keine LÃ¶schung.

### Ergebnis

- Das Projekt ist im Erfolgsfall vollstÃ¤ndig gelÃ¶scht.
- Alle zugeordneten Projektnotizen sind vollstÃ¤ndig entfernt.
- Kundennotizen bleiben unverÃ¤ndert bestehen.
- Es existieren keine verwaisten Notizen.
- Die referenzielle IntegritÃ¤t bleibt gewahrt.

# FT (14): Benutzer- und Rollenverwaltung

## FT (14) Ziel / Zweck

Dieses Feature definiert die Benutzerrollen und deren Berechtigungen im System. Ziel ist eine klare, nachvollziehbare und technisch durchsetzbare Trennung von Leserechten, operativen Bearbeitungsrechten und administrativen Systemrechten. Die Rollen wirken systemweit und bilden die Grundlage fÃ¼r sichere UI- und Backend-Logik.

## FT (14) Fachliche Beschreibung

Das System arbeitet rollenbasiert. Jeder Benutzer besitzt genau eine Rolle. Die Rolle bestimmt, welche Inhalte sichtbar sind und welche Aktionen erlaubt sind. Die Durchsetzung der Berechtigungen erfolgt sowohl in der BenutzeroberflÃ¤che (Sichtbarkeit und Bedienbarkeit) als auch serverseitig zur Absicherung gegen manipulierte Requests.

Es existieren drei Rollen:

- Leser
- Disponent
- Admin

Die Rollen beziehen sich auf alle fachlichen Objekte, insbesondere Kunden und Notizen, wie sie in FT (09) und FT (13) beschrieben sind. Bestimmte Felder und Aktionen (z. B. Archivierung von Kunden) sind bewusst ausschlieÃŸlich administrativen Benutzern vorbehalten.

## FT (14) Regeln und Randbedingungen

Ein Benutzer besitzt genau eine Rolle. Mehrfachrollen oder temporÃ¤re Rollen sind nicht vorgesehen.

Berechtigungen mÃ¼ssen serverseitig geprÃ¼ft werden. UI-seitige EinschrÃ¤nkungen dienen ausschlieÃŸlich der BenutzerfÃ¼hrung und ersetzen keine serverseitige PrÃ¼fung.

Kunden dÃ¼rfen von normalen Benutzern nicht gelÃ¶scht werden. Die Deaktivierung bzw. Archivierung eines Kunden ist eine Admin-Funktion. FÃ¼r nicht berechtigte Rollen bleibt der Status sichtbar, aber nicht verÃ¤nderbar.

Notizen existieren ausschlieÃŸlich im Kontext eines Ã¼bergeordneten Objekts (Kunde oder Projekt). Es gibt keine eigenstÃ¤ndige Notizverwaltung. Schreib- und LÃ¶schrechte fÃ¼r Notizen sind rollenabhÃ¤ngig.

Leser dÃ¼rfen keinerlei schreibende Aktionen durchfÃ¼hren. Disponenten dÃ¼rfen fachlich arbeiten, aber keine systemkritischen ZustÃ¤nde verÃ¤ndern. Admins dÃ¼rfen alle Aktionen durchfÃ¼hren.

## FT (14) Use Cases

### UC 14/01: Benutzer anlegen

### Akteur

Admin

### Ziel

Einen neuen Benutzer mit einer gÃ¼ltigen Rolle im System anlegen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Es existiert mindestens ein weiterer Admin im System.

### Ablauf

1. Der Akteur Ã¶ffnet die Benutzerverwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žBenutzer anlegenâ€œ.
3. Das System zeigt ein Formular zur Erfassung der Benutzerdaten an.
4. Der Akteur erfasst die erforderlichen Stammdaten.
5. Der Akteur wÃ¤hlt eine Rolle aus (Leser, Disponent oder Admin).
6. Der Akteur speichert.
7. Das System prÃ¼ft die Admin-Berechtigung serverseitig.
8. Das System validiert die Eingaben.
9. Das System persistiert den Benutzer mit der gewÃ¤hlten Rolle.

### Alternativen

- Der Akteur besitzt keine Admin-Rolle â†’ System antwortet mit 403.
- Pflichtfelder fehlen â†’ System lehnt ab und speichert nicht.
- Technischer Fehler â†’ System antwortet mit 500.

### Ergebnis

Ein neuer Benutzer existiert persistent mit genau einer Rolle.

### UC 14/02: Rolle eines Benutzers Ã¤ndern

### Akteur

Admin

### Ziel

Die Rolle eines bestehenden Benutzers Ã¤ndern.

### Vorbedingungen

- Der Benutzer existiert.
- Der Akteur besitzt die Rolle Admin.
- Es bleibt mindestens ein Admin im System erhalten.

### Ablauf

1. Der Akteur Ã¶ffnet die Detailansicht eines Benutzers.
2. Der Akteur Ã¤ndert die Rolle.
3. Der Akteur speichert.
4. Das System prÃ¼ft serverseitig die Admin-Berechtigung.
5. Das System prÃ¼ft, ob nach der Ã„nderung mindestens ein Admin verbleibt.
6. Das System persistiert die neue Rolle.

### Alternativen

- Letzter Admin wÃ¼rde entfernt â†’ System blockiert mit 409.
- Akteur ohne Admin-Rolle â†’ System blockiert mit 403.
- Versionskonflikt â†’ System blockiert mit 409.

### Ergebnis

Die Rolle ist aktualisiert und wirkt systemweit.

### UC 14/03: UnzulÃ¤ssige Mutation blockieren

### Akteur

Leser oder Disponent ohne ausreichende Rechte

### Ziel

Verhindern, dass ein Benutzer eine nicht erlaubte Mutation ausfÃ¼hrt.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

### Ablauf

1. Der Akteur lÃ¶st eine schreibende Aktion aus.
2. Das System prÃ¼ft serverseitig die Rolle.
3. Das System erkennt fehlende Berechtigung.
4. Das System blockiert die Mutation.
5. Das System antwortet mit 403.

### Alternativen

- UI verhindert bereits die Anzeige der Aktion â†’ Keine Mutation mÃ¶glich.
- Manipulierter Request â†’ Serverseitige Blockade greift.

### Ergebnis

Keine fachliche Ã„nderung wird persistiert.

### UC 14/04: Letzten Admin schÃ¼tzen

### Akteur

Admin

### Ziel

Sicherstellen, dass das System niemals ohne Admin bleibt.

### Vorbedingungen

- Es existiert genau ein Admin.
- Der Akteur versucht, diesen herabzustufen oder zu lÃ¶schen.

### Ablauf

1. Der Akteur startet die RollenÃ¤nderung oder LÃ¶schung.
2. Das System prÃ¼ft die Anzahl verbleibender Admins.
3. Das System erkennt, dass kein weiterer Admin existiert.
4. Das System blockiert die Aktion.
5. Das System antwortet mit 409.

### Alternativen

- Es existieren mehrere Admins â†’ Aktion wird erlaubt.

### Ergebnis

Mindestens ein Admin bleibt im System erhalten.

---

### UC 14/05: RollenabhÃ¤ngige UI-Reduktion

### Akteur

Leser

### Ziel

Sicherstellen, dass ein Leser keine schreibenden UI-Elemente sieht.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt die Rolle Leser.

### Ablauf

1. Der Akteur Ã¶ffnet eine fachliche Ansicht.
2. Das System rendert die UI rollenabhÃ¤ngig.
3. Das System blendet schreibende Elemente aus.
4. Der Akteur kann ausschlieÃŸlich lesende Aktionen durchfÃ¼hren.

### Alternativen

- Deep-Link auf Bearbeitungsroute â†’ Serverseitige PrÃ¼fung blockiert.

### Ergebnis

Die UI ist funktionsreduziert, ohne DatenmodellÃ¤nderung.

---

### UC 14/06: Deep-Link serverseitig validieren

### Akteur

Benutzer ohne ausreichende Rolle

### Ziel

Sicherstellen, dass direkte URL-Aufrufe keine unzulÃ¤ssigen Aktionen ermÃ¶glichen.

### Vorbedingungen

- Der Benutzer ist authentifiziert.
- Der Benutzer besitzt nicht die erforderliche Rolle.

### Ablauf

1. Der Akteur ruft eine geschÃ¼tzte Route direkt auf.
2. Das System prÃ¼ft serverseitig die Rolle.
3. Das System verweigert Zugriff.
4. Das System antwortet mit 403.

### Alternativen

- Route existiert nicht â†’ 404.
- Technischer Fehler â†’ 500.

### Ergebnis

Keine unzulÃ¤ssige Aktion wird ausgefÃ¼hrt.

---

### UC 14/07: Multi-Browser-RollenÃ¤nderung konsistent darstellen

### Akteur

Admin

### Ziel

Sicherstellen, dass RollenÃ¤nderungen in parallelen Sitzungen konsistent wirksam werden.

### Vorbedingungen

- Ein Benutzer ist in zwei Browsern angemeldet.
- Eine Rolle wird geÃ¤ndert.

### Ablauf

1. Der Akteur Ã¤ndert die Rolle eines Benutzers.
2. Das System persistiert die neue Rolle.
3. In der zweiten Sitzung wird eine neue Anfrage gestellt.
4. Das System prÃ¼ft die Rolle erneut serverseitig.
5. Das System setzt die neue Berechtigungsstufe durch.

### Alternativen

- Sitzung verwendet veraltete Tokens â†’ System validiert bei nÃ¤chstem Request.

### Ergebnis

RollenÃ¤nderungen wirken konsistent in allen Sitzungen.

# FT (15): Projekt Status Verwaltung

## FT (15) Ziel / Zweck

Dieses Feature beschreibt die Verwaltung von Projektstatus-Etiketten als administrative Stammdaten.

Projektstatus dienen der fachlichen Einordnung und Orientierung von Projekten Ã¼ber ihren gesamten Lebenszyklus hinweg. Sie ermÃ¶glichen es, einem Projekt mehrere Status parallel zuzuordnen, ohne die technische Planung oder Terminlogik direkt zu beeinflussen.

Ziel ist eine klar strukturierte, erweiterbare und historientaugliche Statusverwaltung, die unabhÃ¤ngig von der eigentlichen Projektbearbeitung gepflegt werden kann.

## FT (15) **Fachliche Beschreibung**

Projektstatus sind fachliche Etiketten, die zusÃ¤tzlich zum Aktiv-Status eines Projekts (`is_active`) verwendet werden. Ein Projekt kann keinen, einen oder mehrere Projektstatus gleichzeitig besitzen. Die Status haben keinen unmittelbaren Einfluss auf Termine oder Kalenderfunktionen, dienen jedoch der fachlichen Orientierung, Filterung, Auswertung und Kommunikation im Dispositionsprozess.

Projektstatus werden in einer eigenen Stammdatentabelle gepflegt und Ã¼ber eine n:m-Beziehung Projekten zugeordnet.

Die Pflege der Statusliste erfolgt ausschlieÃŸlich administrativ durch die Rolle **Admin**. Disponenten dÃ¼rfen Projektstatus im Rahmen der Projektbearbeitung auswÃ¤hlen und entfernen, jedoch keine Status anlegen, Ã¤ndern oder lÃ¶schen.

Projektstatus besitzen einen Aktiv-Status (`is_active`).

- **Aktive Status** stehen Disponenten zur Auswahl bei neuen oder geÃ¤nderten Projekten zur VerfÃ¼gung.
- **Deaktivierte Status** stehen nicht mehr fÃ¼r neue Zuordnungen zur VerfÃ¼gung, bleiben jedoch an bestehenden Projekten sichtbar und erhalten.

Ein Projektstatus darf nur dann physisch gelÃ¶scht werden, wenn er keinem Projekt mehr zugeordnet ist.

Ist ein Status mindestens einem Projekt zugeordnet, ist eine LÃ¶schung nicht zulÃ¤ssig; in diesem Fall kann der Status ausschlieÃŸlich deaktiviert werden.

Bestimmte Status kÃ¶nnen als Default-Status definiert sein. Diese sind systemseitig geschÃ¼tzt und dÃ¼rfen nicht gelÃ¶scht werden, unabhÃ¤ngig vom Verwendungszustand.

## FT (15) **Regeln & Randbedingungen**

- Projektstatus sind zentrale Stammdaten und werden systemweit verwendet.
- Ein Projekt kann keinen, einen oder mehrere Projektstatus besitzen.
- Die Zuordnung von Projektstatus zu Projekten erfolgt Ã¼ber eine n:m-Beziehung.
- Projektstatus haben keine direkte technische Wirkung auf Termine oder Kalenderlogik.
- Jeder Projektstatus besitzt ein Aktiv-Flag (`is_active`).

### Sichtbarkeit

- **Nur aktive Projektstatus erscheinen in Auswahllisten fÃ¼r Disponenten.**
- Deaktivierte Projektstatus:
    - bleiben an bestehenden Projekten sichtbar,
    - werden in Projekt-Detailansichten weiterhin angezeigt,
    - erscheinen nicht mehr in Auswahlkomponenten zur Neu-Zuordnung,
    - sind nicht Bestandteil von Auswahllisten im Dispositionskontext.
- Disponenten haben keinen Zugriff auf die Stammdatenverwaltung.
- Admins sehen in der Stammdatenverwaltung sowohl aktive als auch deaktivierte Status.
- API-Trennregel:
    - Endpunkte zur Statusauswahl filtern nach `is_active = true`.
    - Endpunkte zur Projektanzeige liefern alle zugeordneten Status unabhÃ¤ngig vom Aktiv-Flag.

### LÃ¶schregeln

- Ein Projektstatus darf nur gelÃ¶scht werden, wenn:
    - er keinem Projekt zugeordnet ist,
    - und er kein geschÃ¼tzter Default-Status ist.
- Ist ein Projektstatus mindestens einem Projekt zugeordnet, wird eine LÃ¶schung strikt blockiert.
- Eine blockierte LÃ¶schung darf **nicht** automatisch in eine Deaktivierung umgewandelt werden.
- Default-Statuswerte sind systemgeschÃ¼tzt und nicht lÃ¶schbar.
- Die Pflege (Anlegen, Bearbeiten, Aktivieren, Deaktivieren, LÃ¶schen) ist ausschlieÃŸlich der Rolle **Admin** vorbehalten.
- Disponenten dÃ¼rfen Status ausschlieÃŸlich Projekten zuordnen oder von Projekten entfernen.

## FT (15) **Use Cases**

### **UC 15/01: Projektstatus anzeigen**

### Akteur

Disponent, Admin

### Ziel

Eine Ãœbersicht Ã¼ber verfÃ¼gbare Projektstatus anzeigen.

### Vorbedingungen

- Mindestens ein Projektstatus existiert.

### Ablauf

1. Der Akteur Ã¶ffnet ein Projekt oder eine Statusauswahl.
2. Das System ermittelt alle Projektstatus mit `is_active = true`.
3. Das System sortiert die Status gemÃ¤ÃŸ definierter Standardsortierung.
4. Das System zeigt die Statusliste an.

### Ergebnis

Die aktiven Projektstatus sind sichtbar und auswÃ¤hlbar.

### **UC 15/02: Projektstatus zu Projekt zuordnen**

### Akteur

Disponent

### Ziel

Einem Projekt einen oder mehrere aktive Projektstatus zuweisen.

### Vorbedingungen

- Projekt existiert.
- Mindestens ein aktiver Projektstatus existiert.

### Ablauf

1. Der Akteur Ã¶ffnet ein Projekt.
2. Der Akteur wÃ¤hlt einen oder mehrere Status aus der Liste.
3. Das System prÃ¼ft fÃ¼r jeden gewÃ¤hlten Status `is_active = true`.
4. Das System verhindert doppelte Zuordnungen.
5. Das System speichert die n:m-Beziehung.

### Ergebnis

Das Projekt besitzt die ausgewÃ¤hlten Status-Etiketten.

### **UC 15/03: Projektstatus entfernen**

### Akteur

Disponent

### Ziel

Einen bestehenden Projektstatus von einem Projekt entfernen.

### Vorbedingungen

- Projekt existiert.
- Dem Projekt ist mindestens ein Status zugeordnet.

### Ablauf

1. Der Akteur Ã¶ffnet das Projekt.
2. Der Akteur entfernt einen Status.
3. Das System entfernt die entsprechende n:m-VerknÃ¼pfung.
4. Das System speichert die Ã„nderung.

### Ergebnis

Der Status ist nicht mehr dem Projekt zugeordnet. Andere Status bleiben unverÃ¤ndert.

### **UC 15/04: Projektstatus verwalten**

### Akteur

Admin

### Ziel

Projektstatus administrativ anlegen, bearbeiten, aktivieren, deaktivieren oder lÃ¶schen.

### Vorbedingungen

- Der Akteur ist angemeldet.

### Ablauf

1. Der Akteur Ã¶ffnet die Projektstatusverwaltung.
2. Der Akteur legt neue Status an oder bearbeitet bestehende.
3. Der Akteur aktiviert oder deaktiviert Status.
4. Der Akteur versucht einen Status zu lÃ¶schen.
5. Das System prÃ¼ft Referenzen und Default-Schutz.
6. Das System fÃ¼hrt die zulÃ¤ssige Aktion aus oder blockiert sie mit Fehlermeldung.
7. Das System speichert die Ã„nderung.

### Ergebnis

Die Statusliste ist konsistent gepflegt. Kein verwendeter oder geschÃ¼tzter Status wurde gelÃ¶scht.

### UC 15/05: Nicht verwendeten Projektstatus lÃ¶schen

### Akteur

Admin

### Ziel

Einen nicht referenzierten und nicht geschÃ¼tzten Projektstatus dauerhaft lÃ¶schen.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.
- Keine Projektzuordnung existiert.
- Kein Default-Schutz besteht.

### Ablauf

1. Der Akteur Ã¶ffnet die Statusverwaltung.
2. Der Akteur wÃ¤hlt einen Status.
3. Der Akteur lÃ¶st die LÃ¶schung aus.
4. Das System prÃ¼ft Referenzen.
5. Das System prÃ¼ft Default-Schutz.
6. Das System lÃ¶scht den Status physisch.

### Ergebnis

Der Status ist vollstÃ¤ndig aus dem System entfernt.

### UC 15/06: Verwendeten Projektstatus lÃ¶schen (blockiert)

### Akteur

Admin

### Ziel

Verhindern, dass ein referenzierter Status gelÃ¶scht wird.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status ist mindestens einem Projekt zugeordnet.

### Ablauf

1. Der Akteur Ã¶ffnet die Statusverwaltung.
2. Der Akteur lÃ¶st die LÃ¶schung aus.
3. Das System erkennt bestehende Referenzen.
4. Das System blockiert die LÃ¶schung.
5. Das System gibt eine Fehlermeldung zurÃ¼ck.

### Ergebnis

Der Status bleibt unverÃ¤ndert bestehen.

### UC 15/07: GeschÃ¼tzten Default-Status lÃ¶schen (blockiert)

### Akteur

Admin

### Ziel

Verhindern, dass ein referenzierter Status gelÃ¶scht wird.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status ist mindestens einem Projekt zugeordnet.

### Ablauf

1. Der Akteur Ã¶ffnet die Statusverwaltung.
2. Der Akteur lÃ¶st die LÃ¶schung aus.
3. Das System erkennt bestehende Referenzen.
4. Das System blockiert die LÃ¶schung.
5. Das System gibt eine Fehlermeldung zurÃ¼ck.

### Ergebnis

Der Status bleibt unverÃ¤ndert bestehen.

### UC 15/08: Projektstatus deaktivieren

### Akteur

Admin

### Ziel

Einen Status fÃ¼r zukÃ¼nftige Auswahl deaktivieren.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.

### Ablauf

1. Der Akteur Ã¶ffnet die Statusverwaltung.
2. Der Akteur setzt `is_active = false`.
3. Das System speichert die Ã„nderung.
4. Das System stellt sicher, dass der Status nicht mehr in Auswahlendpunkten erscheint.

### Ergebnis

Der Status bleibt historisch erhalten, ist jedoch nicht mehr neu auswÃ¤hlbar.

### UC 15/09: Projektstatus bearbeiten

### Akteur

Admin

### Ziel

Den Namen oder die fachliche Bezeichnung eines bestehenden Projektstatus Ã¤ndern.

### Vorbedingungen

- Der Akteur ist angemeldet.
- Der Status existiert.

### Ablauf

1. Der Akteur Ã¶ffnet die Statusverwaltung.
2. Der Akteur wÃ¤hlt einen Status.
3. Der Akteur Ã¤ndert den Namen.
4. Das System validiert die Eingabe.
5. Das System speichert die Ã„nderung.

### Ergebnis

Der Status ist mit aktualisierter Bezeichnung gespeichert und in allen Projekten konsistent sichtbar.

# FT (16): Hilfetexte verwalten

## FT (16) Ziel / Zweck

Dieses Feature ermÃ¶glicht die zentrale Verwaltung von Hilfetexten in der Anwendung, die von Benutzern kontextbezogen Ã¼ber Hilfe-Symbole in der UI abgerufen werden kÃ¶nnen. Ziel ist, fachliche Bedienhinweise konsistent, wartbar und rollenbasiert bereitzustellen, ohne dass Hilfetexte in einzelnen UI-Views dupliziert oder fest im Frontend verdrahtet werden mÃ¼ssen.

## FT (16) Fachliche Beschreibung

Ein Hilfetext ist ein eigenstÃ¤ndiges, administrierbares Objekt mit eindeutiger Kennung (â€žhelp_keyâ€œ), Titel und formatierbarem Inhalt (Markdown). Hilfetexte werden in der UI kontextbezogen Ã¼ber ein Hilfe-Symbol (z. B. â€ž?â€œ oder â€žiâ€œ) angezeigt. Die UI Ã¼bergibt beim Abruf den help_key, das System liefert den passenden Hilfetext zurÃ¼ck.

Hilfetexte sind rein informativ. Sie verÃ¤ndern keine fachlichen Daten (Kunden, Projekte, Termine, Touren etc.) und sind unabhÃ¤ngig von Termin- und Planungslogik. Sie dienen der besseren Bedienbarkeit, der Einarbeitung und der Reduzierung von RÃ¼ckfragen.

Die Pflege der Hilfetexte erfolgt administrativ. Disponenten und Leser kÃ¶nnen Hilfetexte anzeigen, aber nicht verÃ¤ndern. Admins kÃ¶nnen Hilfetexte anlegen, bearbeiten, aktivieren/deaktivieren und verwalten.

## FT (16) Regeln & Randbedingungen

Ein Hilfetext besitzt einen eindeutigen help_key und darf pro help_key nur einmal existieren.

Hilfetexte sind global gÃ¼ltig; die Kontextbindung erfolgt ausschlieÃŸlich Ã¼ber den help_key, nicht Ã¼ber direkte FremdschlÃ¼ssel auf Domainobjekte.

Hilfetexte haben keine fachliche Wirkung und sind ausschlieÃŸlich Anzeige-/Dokumentationsinhalte.

Hilfetexte kÃ¶nnen aktiviert/deaktiviert werden; deaktivierte Hilfetexte sind in der UI nicht abrufbar, bleiben aber aus GrÃ¼nden der Nachvollziehbarkeit erhalten.

Die Verwaltung (CRUD) der Hilfetexte ist ausschlieÃŸlich der Rolle Admin vorbehalten.

Die Anzeige der Hilfetexte ist fÃ¼r alle Rollen erlaubt, sofern der Text aktiv ist.

Der Inhalt wird als Markdown gespeichert; externe Ressourcen- oder DateipfadabhÃ¤ngigkeiten aus dem Client sind nicht vorgesehen.

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
2. Die UI Ã¼bergibt den hinterlegten help_key an das System.
3. Das System prÃ¼ft, ob ein aktiver Hilfetext mit diesem help_key existiert.
4. Das System lÃ¤dt Titel und Markdown-Inhalt des Hilfetextes.
5. Die UI stellt den Hilfetext als Tooltip, Popover oder Modal dar.

### Alternativen

- Es existiert kein Hilfetext mit diesem help_key â†’ Das System liefert einen leeren Status zurÃ¼ck; die UI zeigt â€žKeine Hilfe verfÃ¼gbarâ€œ oder blendet das Symbol aus.
- Der Hilfetext ist deaktiviert â†’ Das System liefert keinen Inhalt zurÃ¼ck; die UI zeigt keine Hilfe an.
- Technischer Fehler â†’ Das System antwortet mit einem Fehlerstatus; die UI zeigt eine Fehlermeldung oder keine Hilfe an.

### Ergebnis

Der Akteur sieht den zum aktuellen UI-Kontext passenden Hilfetext. Es werden keine fachlichen Daten verÃ¤ndert.

### UC 16/02: Hilfetext anlegen

### kteur

Admin

### Ziel

Einen neuen Hilfetext erstellen, um einen UI-Kontext erklÃ¤rbar zu machen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der gewÃ¼nschte help_key ist noch nicht vergeben.

### Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt die Funktion â€žHilfetext anlegenâ€œ.
3. Der Akteur erfasst help_key, Titel und Markdown-Inhalt.
4. Der Akteur legt fest, ob der Hilfetext aktiv ist.
5. Der Akteur speichert den Datensatz.
6. Das System validiert Pflichtfelder und Datentypen.
7. Das System prÃ¼ft serverseitig die Eindeutigkeit des help_key.
8. Bei erfolgreicher Validierung speichert das System den Hilfetext persistent.

### Alternativen

- Pflichtfeld fehlt â†’ Das System lehnt die Speicherung mit Validierungsfehler ab.
- help_key existiert bereits â†’ Das System blockiert die Speicherung und fordert zur Korrektur auf.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Ein neuer Hilfetext ist persistent gespeichert und Ã¼ber seinen help_key referenzierbar. Der Hilfetext ist je nach gesetztem Status in der UI abrufbar oder nicht abrufbar.

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

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt einen bestehenden Hilfetext aus der Liste aus.
3. Das System lÃ¤dt die aktuellen Daten des Hilfetextes.
4. Der Akteur Ã¤ndert Titel und/oder Markdown-Inhalt.
5. Der Akteur speichert die Ã„nderungen.
6. Das System validiert die Eingaben.
7. Das System speichert die aktualisierten Daten persistent.

### Alternativen

- Der Akteur bricht den Vorgang ab â†’ Es erfolgt keine Ã„nderung.
- Der Hilfetext existiert nicht mehr â†’ Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Der Hilfetext ist aktualisiert. Bei zukÃ¼nftigen Abrufen Ã¼ber den help_key wird die neue Version angezeigt.

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

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt einen bestehenden Hilfetext aus.
3. Der Akteur Ã¤ndert den Status auf â€žaktivâ€œ oder â€žinaktivâ€œ.
4. Der Akteur speichert die Ã„nderung.
5. Das System persistiert den neuen Status.

### Alternativen

- Der Akteur bricht den Vorgang ab â†’ Der Status bleibt unverÃ¤ndert.
- Der Hilfetext existiert nicht mehr â†’ Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Der Hilfetext ist entsprechend dem gesetzten Status in der UI abrufbar oder nicht abrufbar. Bestehende fachliche Daten bleiben unverÃ¤ndert.

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

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Das System lÃ¤dt die Liste der Hilfetexte.
3. Der Akteur gibt ein Suchkriterium ein, beispielsweise help_key oder Titel.
4. Das System filtert die Hilfetexte serverseitig anhand des eingegebenen Suchkriteriums.
5. Das System zeigt die gefilterte Trefferliste an.
6. Der Akteur kann einen Hilfetext aus der Liste auswÃ¤hlen, um dessen Detailansicht zu Ã¶ffnen.

### Alternativen

- Keine Hilfetexte vorhanden â†’ Das System zeigt eine leere Liste an.
- Suchkriterium liefert keine Treffer â†’ Das System zeigt eine leere Trefferliste an.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System liefert einen Fehlerstatus zurÃ¼ck und zeigt keine oder eine unvollstÃ¤ndige Liste an.

### Ergebnis

Der Akteur erhÃ¤lt eine gefilterte und konsistente Ãœbersicht der Hilfetexte und kann einzelne DatensÃ¤tze zur weiteren Bearbeitung auswÃ¤hlen.

### UC 16/06: Hilfetext lÃ¶schen

### Akteur

Admin

### Ziel

Einen bestehenden Hilfetext dauerhaft aus dem System entfernen.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.

### Ablauf

1. Der Akteur Ã¶ffnet die Hilfetext-Verwaltung.
2. Der Akteur wÃ¤hlt einen bestehenden Hilfetext aus.
3. Der Akteur lÃ¶st die LÃ¶schaktion aus.
4. Das System prÃ¼ft die Berechtigung des Akteurs.
5. Das System lÃ¶scht den Hilfetext persistent.
6. Das System aktualisiert die Hilfetextliste.

### Alternativen

- Der Hilfetext existiert nicht â†’ Das System antwortet mit einem Fehlerstatus.
- Der Akteur besitzt keine Admin-Rechte â†’ Das System blockiert mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System lÃ¶scht nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Der Hilfetext ist nicht mehr im System vorhanden und kann Ã¼ber seinen help_key nicht mehr abgerufen werden.

### UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes

### Akteur

Admin

### Ziel

Sicherstellen, dass parallele Ã„nderungen an einem Hilfetext nicht zu stillen Ãœberschreibungen fÃ¼hren.

### Vorbedingungen

- Der Hilfetext existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Admin-Rechte.
- Der Hilfetext besitzt eine gÃ¼ltige Versionskennung.

### Ablauf

1. Der Akteur Ã¶ffnet einen bestehenden Hilfetext zur Bearbeitung.
2. Das System Ã¼bermittelt die aktuelle Versionskennung des Hilfetextes.
3. Ein zweiter Akteur speichert zwischenzeitlich eine Ã„nderung desselben Hilfetextes.
4. Das System erhÃ¶ht die Versionskennung nach erfolgreicher Speicherung.
5. Der erste Akteur speichert auf Basis der veralteten Versionskennung.
6. Das System erkennt die veraltete Versionskennung.
7. Das System blockiert die Speicherung mit einem Konfliktstatus.
8. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

### Alternativen

- Der Akteur lÃ¤dt den aktuellen Stand und speichert erneut â†’ Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab â†’ Der zuletzt erfolgreich gespeicherte Stand bleibt unverÃ¤ndert.

### Ergebnis

Es entstehen keine Lost Updates. Der Hilfetext bleibt konsistent und entspricht stets dem zuletzt erfolgreich gespeicherten Zustand.

### UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern

### Akteur

Disponent, Leser

### Ziel

Sicherstellen, dass nur Administratoren Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder lÃ¶schen dÃ¼rfen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt keine Admin-Rechte.

### Ablauf

1. Der Akteur versucht, die Hilfetext-Verwaltung aufzurufen oder eine Verwaltungsaktion auszufÃ¼hren.
2. Das System prÃ¼ft serverseitig die Rolle des Akteurs.
3. Das System verweigert den Zugriff auf Verwaltungsfunktionen.
4. Das System liefert einen Berechtigungsfehler zurÃ¼ck.

### Alternativen

- Der Akteur versucht, direkt Ã¼ber einen API-Endpunkt eine Verwaltungsaktion auszufÃ¼hren â†’ Das System prÃ¼ft die Rolle und blockiert ebenfalls mit einem Berechtigungsfehler.
- Technischer Fehler â†’ Das System liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Nicht berechtigte Rollen kÃ¶nnen keine Hilfetexte anlegen, bearbeiten, aktivieren, deaktivieren oder lÃ¶schen. Die IntegritÃ¤t der Hilfetexte bleibt gewahrt.

# FT (18): User Preferences

## FT (18) Ziel / Zweck

Dieses Feature stellt editierbare Einstellungen zu App-Funktionen direkt in der Anwendung bereit. Ziel ist, dass definierte Verhaltensweisen und Parameter ohne Code-Ã„nderungen konfigurierbar sind und die LÃ¶sung auch bei wachsender Anzahl und Vielfalt von Einstellungstypen stabil und wartbar bleibt.

## FT (18) Fachliche Beschreibung

Die Anwendung bietet eine zentrale OberflÃ¤che, in der berechtigte Nutzer Einstellungen anzeigen und Ã¤ndern kÃ¶nnen. Jede Einstellung ist durch einen eindeutigen SchlÃ¼ssel identifiziert und besitzt einen fest definierten Datentyp sowie einen Standardwert. Der wirksame Wert ergibt sich aus einem gespeicherten Wert; sofern kein Wert gespeichert ist, gilt der Standardwert.

Die Eingabe und Darstellung in der UI erfolgt generisch anhand des Einstellungstyps. Bool-Einstellungen werden als Schalter bedient, Zahlen als numerische Eingabe und Farben Ã¼ber eine Farbauswahl. Das System ist so gestaltet, dass weitere Typen und neue Einstellungen ergÃ¤nzt werden kÃ¶nnen, ohne dass dafÃ¼r fÃ¼r jede Einstellung eine eigene Persistenzlogik oder ein eigener Screen erforderlich wird.

## FT (18) Regeln & Randbedingungen

Eine Einstellung darf nur gespeichert werden, wenn der Wert zum definierten Typ passt und die fachlich vorgesehenen Constraints erfÃ¼llt. UngÃ¼ltige Eingaben werden abgelehnt und mit einer verstÃ¤ndlichen Fehlermeldung zurÃ¼ckgemeldet.

Jede Einstellung besitzt einen Standardwert. Wenn kein Wert gespeichert ist, wird ausschlieÃŸlich der Standardwert verwendet. Der aktuell wirksame Wert muss in der UI transparent angezeigt werden.

Berechtigungen mÃ¼ssen eindeutig greifen. Normale Nutzer dÃ¼rfen ausschlieÃŸlich ihre benutzerspezifischen Einstellungen bearbeiten. Administratoren dÃ¼rfen zusÃ¤tzlich Einstellungen bearbeiten, die in einem Ã¼bergeordneten Kontext gelten, sofern solche Kontexte im Produkt genutzt werden.

Zu Beginn mÃ¼ssen mindestens die Typen Zahl, Bool (AktivitÃ¤t) und Farbe unterstÃ¼tzt werden. Weitere Typen wie Text, Auswahlwerte (Enum) oder Wertebereiche (Min/Max/Step) sollen spÃ¤ter ohne Bruch ergÃ¤nzt werden kÃ¶nnen.

## FT (18) Use Cases

### UC 18/01: PersÃ¶nliche Einstellung Ã¤ndern

### Akteur

Disponent, Leser, Admin

### Ziel

Eine persÃ¶nliche Einstellung Ã¤ndern, sodass diese ausschlieÃŸlich fÃ¼r den jeweiligen Akteur wirksam ist.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Die persÃ¶nliche Einstellung ist im System definiert.
- FÃ¼r den Akteur existiert ein gÃ¼ltiger Benutzerkontext.

### Ablauf

1. Der Akteur Ã¶ffnet den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System lÃ¤dt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur Ã¤ndert eine oder mehrere Einstellungen.
4. Der Akteur speichert die Ã„nderungen.
5. Das System validiert Datentyp und Wertebereich der geÃ¤nderten Einstellungen.
6. Das System speichert die Einstellungen persistent und ordnet sie eindeutig dem Akteur zu.
7. Das System bestÃ¤tigt die erfolgreiche Speicherung.
8. Die geÃ¤nderte Einstellung wird bei zukÃ¼nftigen Aktionen des Akteurs angewendet.

### Alternativen

- UngÃ¼ltiger Wert â†’ Das System lehnt die Speicherung mit Validierungsfehler ab.
- Der Akteur bricht ab â†’ Es erfolgt keine Ã„nderung.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Die geÃ¤nderte Einstellung ist persistent gespeichert und wirkt ausschlieÃŸlich fÃ¼r den betreffenden Akteur. Andere Akteure sind nicht betroffen.

### UC 18/02: PersÃ¶nliche Einstellung auf Standardwert zurÃ¼cksetzen

### Akteur

Disponent, Leser, Admin

### Ziel

Eine persÃ¶nliche Einstellung auf den systemseitig definierten Standardwert zurÃ¼cksetzen.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r die betreffende Einstellung ist ein systemweiter Standardwert definiert.
- FÃ¼r den Akteur existiert eine gespeicherte individuelle Einstellung.

### Ablauf

1. Der Akteur Ã¶ffnet den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System lÃ¤dt die aktuell gespeicherten Einstellungen des Akteurs.
3. Der Akteur wÃ¤hlt fÃ¼r eine Einstellung die Funktion â€žAuf Standard zurÃ¼cksetzenâ€œ.
4. Der Akteur bestÃ¤tigt die Aktion.
5. Das System entfernt oder Ã¼berschreibt den individuellen Wert des Akteurs.
6. Das System speichert den Standardwert als wirksame Einstellung.
7. Das System bestÃ¤tigt die erfolgreiche ZurÃ¼cksetzung.
8. Bei zukÃ¼nftigen Aktionen wird der Standardwert angewendet.

### Alternativen

- Der Akteur bricht die ZurÃ¼cksetzung ab â†’ Der individuelle Wert bleibt unverÃ¤ndert.
- FÃ¼r die Einstellung existiert kein definierter Standardwert â†’ Das System blockiert die Aktion mit einem Fehlerstatus.
- Technischer Fehler â†’ Das System speichert nicht und liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Die persÃ¶nliche Einstellung entspricht dem systemweit definierten Standardwert und wirkt ausschlieÃŸlich fÃ¼r den betreffenden Akteur.

### UC 18/03: Unberechtigten Zugriff auf persÃ¶nliche Einstellungen verhindern

### Akteur

Disponent, Leser, Admin

### Ziel

Sicherstellen, dass ein Akteur ausschlieÃŸlich seine eigenen persÃ¶nlichen Einstellungen einsehen und Ã¤ndern kann.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r mindestens einen weiteren Akteur existieren gespeicherte persÃ¶nliche Einstellungen.

### Ablauf

1. Der Akteur ruft den Bereich fÃ¼r persÃ¶nliche Einstellungen auf.
2. Das System ermittelt anhand des Benutzerkontextes die IdentitÃ¤t des Akteurs.
3. Das System lÃ¤dt ausschlieÃŸlich die dem Akteur zugeordneten Einstellungen.
4. Der Akteur versucht, direkt oder indirekt Einstellungen eines anderen Akteurs abzurufen oder zu Ã¤ndern.
5. Das System prÃ¼ft serverseitig die Benutzerzuordnung.
6. Das System verweigert den Zugriff auf fremde Einstellungen und liefert einen Berechtigungsfehler zurÃ¼ck.

### Alternativen

- Der Akteur ruft ausschlieÃŸlich seine eigenen Einstellungen auf â†’ Das System erlaubt Zugriff.
- Technischer Fehler â†’ Das System liefert einen Fehlerstatus zurÃ¼ck.

### Ergebnis

Ein Akteur kann ausschlieÃŸlich seine eigenen persÃ¶nlichen Einstellungen einsehen und Ã¤ndern. Einstellungen anderer Akteure bleiben geschÃ¼tzt und unverÃ¤ndert.

### UC 18/04: Versionskonflikt bei paralleler Ã„nderung persÃ¶nlicher Einstellungen

### Akteur

Disponent, Leser, Admin

### Ziel

Sicherstellen, dass parallele Ã„nderungen persÃ¶nlicher Einstellungen desselben Akteurs nicht zu stillen Ãœberschreibungen fÃ¼hren.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- FÃ¼r den Akteur existieren gespeicherte persÃ¶nliche Einstellungen.
- Die Einstellungen besitzen eine gÃ¼ltige Versionskennung.

### Ablauf

1. Der Akteur Ã¶ffnet in Browser A den Bereich fÃ¼r persÃ¶nliche Einstellungen.
2. Das System Ã¼bermittelt die aktuelle Versionskennung der Einstellungen.
3. Der Akteur Ã¶ffnet in Browser B ebenfalls den Bereich fÃ¼r persÃ¶nliche Einstellungen.
4. Browser A speichert eine Ã„nderung der Einstellungen.
5. Das System erhÃ¶ht die Versionskennung nach erfolgreicher Speicherung.
6. Browser B speichert eine Ã„nderung auf Basis der veralteten Versionskennung.
7. Das System erkennt die veraltete Versionskennung.
8. Das System blockiert die Speicherung mit einem Konfliktstatus.
9. Das System fordert den Akteur auf, den aktuellen Stand neu zu laden.

### Alternativen

- Der Akteur lÃ¤dt den aktuellen Stand und speichert erneut â†’ Die Speicherung erfolgt erfolgreich auf Basis der aktuellen Versionskennung.
- Der Akteur bricht ab â†’ Der zuletzt erfolgreich gespeicherte Stand bleibt unverÃ¤ndert.

### Ergebnis

Es entstehen keine Lost Updates. Die persÃ¶nlichen Einstellungen entsprechen stets dem zuletzt erfolgreich gespeicherten Zustand des Akteurs.

# FT (19): Attachments

## FT (19) Ziel / Zweck

Dieses Feature stellt eine domÃ¤nenÃ¼bergreifende Infrastruktur zur VerfÃ¼gung, um Dateien strukturiert an fachliche Objekte zu binden. Ziel ist es, Upload, Speicherung, Anzeige und Download von Dokumenten einheitlich, sicher und wartbar umzusetzen, ohne die jeweilige FachdomÃ¤ne mit technischer Dateilogik zu belasten.

Attachments sind keine fachlichen Kerndaten, sondern ergÃ¤nzende Dokumente zur Dokumentation, Nachvollziehbarkeit und Kommunikation.

## FT (19) Fachliche Beschreibung

Ein Attachment ist eine Datei, die eindeutig einem Parent-Objekt zugeordnet ist. Ein Attachment kann nie ohne Parent existieren.

Das System unterstÃ¼tzt Attachments aktuell fÃ¼r folgende DomÃ¤nen:

- Projekt
- Kunde
- Mitarbeiter

Die technische Behandlung ist fÃ¼r alle DomÃ¤nen identisch. Unterschiede bestehen ausschlieÃŸlich in der Parent-Zuordnung.

Ein Attachment besitzt Metadaten wie:

- Originaldateiname
- Persistenter Speichername
- MIME-Typ
- DateigrÃ¶ÃŸe
- Erstellungszeitpunkt

Dateien werden serverseitig gespeichert und Ã¼ber einen gesicherten Download-Endpunkt ausgeliefert. Die UI zeigt Attachments als kompakte Liste mit Vorschau- bzw. Download-Funktion.

Das Ã–ffnen eines Attachments kann je nach Dateityp inline (z. B. PDF, Bild) oder als Download erfolgen. Eine explizite Download-Option ist zusÃ¤tzlich verfÃ¼gbar.

Eine physische LÃ¶schung von Attachments ist systemweit nicht vorgesehen.

## FT (19) Regeln & Randbedingungen

### Allgemeine Struktur

- Ein Attachment gehÃ¶rt immer genau einem Parent-Objekt.
- Ein Attachment kann nie ohne Parent-Zuordnung existieren.
- FÃ¼r jede unterstÃ¼tzte DomÃ¤ne existiert eine eigene Attachment-Tabelle.
- Die Tabellen sind strukturgleich aufgebaut.
- Zwischen Parent und Attachment besteht eine referenzielle IntegritÃ¤t (FK).

### Upload

- Upload erfolgt Ã¼ber Multipart-Request.
- Feldname fÃ¼r die Datei ist systemweit einheitlich.
- Es gilt eine definierte maximale DateigrÃ¶ÃŸe.
- Der Originaldateiname wird serverseitig sanitisiert.
- Der persistente Dateiname wird eindeutig generiert.
- Metadaten werden in der jeweiligen Attachment-Tabelle gespeichert.

UngÃ¼ltige Dateien oder Ãœberschreiten der GrÃ¶ÃŸenbegrenzung fÃ¼hren zu einem Fehler und werden nicht gespeichert.

### Speicherung

- Dateien werden serverseitig in einem definierten Upload-Verzeichnis gespeichert.
- Der physische Speicherort wird nicht vom Client bestimmt.
- Der Storage-Pfad wird als Metadatum gespeichert.
- Attachments werden nicht versioniert.

### Download

- Download erfolgt ausschlieÃŸlich Ã¼ber definierte API-Endpunkte.
- Der Endpunkt liefert:
    - korrekten MIME-Typ
    - passende Content-Disposition
- FÃ¼r bestimmte Dateitypen (z. B. PDF, Bilder) kann Inline-Anzeige erlaubt sein.
- Ãœber einen expliziten Parameter kann Download erzwungen werden.

Direkter Zugriff auf das Upload-Verzeichnis ist nicht vorgesehen.

### LÃ¶schung

- Eine LÃ¶schfunktion fÃ¼r Attachments ist systemweit deaktiviert.
- Es existiert kein fachlicher Use Case zur physischen Entfernung von Dateien.
- API-seitig sind Delete-Endpunkte entweder nicht vorhanden oder blockiert.
- Die Entscheidung zur Nicht-LÃ¶schung ist bewusst systemweit einheitlich.

### Sicherheit und Verantwortlichkeit

- Die Parent-Existenz wird vor Speicherung eines Attachments geprÃ¼ft.
- Attachments haben keine eigenstÃ¤ndigen Berechtigungen, sondern folgen den Berechtigungen ihres Parents.
- UI-seitige EinschrÃ¤nkungen ersetzen keine serverseitige PrÃ¼fung.
- Der Download erfolgt ausschlieÃŸlich nach erfolgreicher Identifikation des Attachments.

## FT (19) Use Cases

### UC 19/01: Attachment hochladen

**Akteur**

Disponent

**Ziel**

Eine Datei einem bestehenden Parent-Objekt (Projekt, Kunde oder Mitarbeiter) hinzufÃ¼gen.

**Vorbedingungen**

- Das Parent-Objekt existiert persistent.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Ã„nderungsrechte fÃ¼r das Parent-Objekt.
- Die Detailansicht des Parent-Objekts ist geÃ¶ffnet.
- Die maximal zulÃ¤ssige DateigrÃ¶ÃŸe ist systemseitig definiert.

**Ablauf**

1. Der Akteur wÃ¤hlt in der Detailansicht des Parent-Objekts die Funktion â€žAttachment hinzufÃ¼genâ€œ.
2. Das System Ã¶ffnet einen Dateiauswahldialog.
3. Der Akteur wÃ¤hlt eine lokale Datei aus.
4. Das System Ã¼bertrÃ¤gt die Datei per Multipart-Request an den Server.
5. Das System prÃ¼ft serverseitig:
    - Authentifizierung,
    - Berechtigung des Akteurs,
    - Existenz des Parent-Objekts,
    - DateigrÃ¶ÃŸe,
    - grundlegende Dateieigenschaften.
6. Das System generiert einen eindeutigen persistenten Speichername.
7. Das System speichert die Datei im definierten Upload-Verzeichnis.
8. Das System legt einen Attachment-Datensatz mit Parent-Referenz an.
9. Das System speichert Metadaten (Originaldateiname, persistenter Speichername, MIME-Typ, DateigrÃ¶ÃŸe, Erstellungszeitpunkt).
10. Das System aktualisiert die Attachmentliste in der UI.

**AlternativablÃ¤ufe**

- Der Akteur bricht den Upload vor BestÃ¤tigung ab â†’ Es wird kein Attachment gespeichert.
- Das Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Der Akteur besitzt keine Ã„nderungsrechte â†’ System blockiert mit 403.
- Die Datei Ã¼berschreitet das GrÃ¶ÃŸenlimit oder ist ungÃ¼ltig â†’ System antwortet mit 400, speichert nichts.
- Technischer Fehler bei Speicherung â†’ System antwortet mit 500, speichert nichts.

**Ergebnis**

- Die Datei ist persistent gespeichert.
- Ein Attachment-Datensatz mit korrekter Parent-Referenz existiert.
- Die Attachmentliste zeigt das neue Attachment konsistent an.

### UC 19/02: Attachmentliste anzeigen

**Akteur**

Disponent, Leser (rollenabhÃ¤ngig)

**Ziel**

Alle einem Parent-Objekt zugeordneten Attachments anzeigen.

**Vorbedingungen**

- Das Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

**Ablauf**

1. Der Akteur Ã¶ffnet die Detailansicht des Parent-Objekts.
2. Das System prÃ¼ft serverseitig die Leseberechtigung.
3. Das System lÃ¤dt alle dem Parent-Objekt zugeordneten Attachments.
4. Das System liefert fÃ¼r jedes Attachment mindestens:
    - Originaldateiname,
    - DateigrÃ¶ÃŸe,
    - MIME-Typ,
    - Erstellungszeitpunkt.
5. Das System zeigt die strukturierte Liste in der UI an.

**AlternativablÃ¤ufe**

- Keine Attachments vorhanden â†’ System zeigt eine leere Liste.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Alle vorhandenen Attachments sind vollstÃ¤ndig und konsistent sichtbar.
- Es werden keine Daten verÃ¤ndert.

### UC 19/03: Attachment Ã¶ffnen (Inline-Anzeige)

**Akteur**

Disponent, Leser (rollenabhÃ¤ngig)

**Ziel**

Ein Attachment direkt im Browser anzeigen, sofern der Dateityp Inline-Anzeige unterstÃ¼tzt.

**Vorbedingungen**

- Das Attachment existiert.
- Das zugehÃ¶rige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

**Ablauf**

1. Der Akteur wÃ¤hlt ein Attachment aus der Liste.
2. Das System prÃ¼ft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt auf.
4. Das System liefert die Datei mit:
    - korrektem MIME-Typ,
    - Content-Disposition â€žinlineâ€œ, sofern Dateityp Inline-Anzeige erlaubt.
5. Der Browser zeigt die Datei an.

**AlternativablÃ¤ufe**

- Dateityp nicht inlinefÃ¤hig â†’ System liefert Content-Disposition â€žattachmentâ€œ.
- Attachment existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Das Attachment wird inline angezeigt oder als Download behandelt.
- Es werden keine persistenten Daten verÃ¤ndert.

### UC 19/04: Attachment herunterladen

**Akteur**

Disponent, Leser (rollenabhÃ¤ngig)

**Ziel**

Ein Attachment lokal speichern.

**Vorbedingungen**

- Das Attachment existiert.
- Das zugehÃ¶rige Parent-Objekt existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Leserechte fÃ¼r das Parent-Objekt.

**Ablauf**

1. Der Akteur wÃ¤hlt die Download-Funktion fÃ¼r ein Attachment.
2. Das System prÃ¼ft serverseitig:
    - Existenz des Attachments,
    - Existenz des Parent-Objekts,
    - Leseberechtigung des Akteurs.
3. Das System ruft den Download-Endpunkt mit Download-Parameter auf.
4. Das System liefert:
    - korrekten MIME-Typ,
    - Content-Disposition â€žattachmentâ€œ,
    - den gespeicherten Dateistream.
5. Der Browser startet den Download.

**AlternativablÃ¤ufe**

- Attachment nicht auffindbar â†’ System antwortet mit 404.
- Akteur ohne Leserechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Die Datei wird lokal gespeichert.
- Es werden keine persistenten Daten verÃ¤ndert.

### UC 19/05: Attachment-Upload validieren (GrÃ¶ÃŸe / Typ)

**Akteur**

System

**Ziel**

Sicherstellen, dass ausschlieÃŸlich zulÃ¤ssige Dateien gespeichert werden.

**Vorbedingungen**

- Eine Datei wurde im Rahmen eines Upload-Vorgangs Ã¼bermittelt.

**Ablauf**

1. Das System liest die Ã¼bermittelte DateigrÃ¶ÃŸe.
2. Das System vergleicht die GrÃ¶ÃŸe mit dem definierten Maximalwert.
3. Das System ermittelt grundlegende Dateieigenschaften (z. B. MIME-Typ).
4. Das System prÃ¼ft, ob der Dateityp grundsÃ¤tzlich zulÃ¤ssig ist.
5. Bei gÃ¼ltiger Datei wird der Upload-Prozess fortgesetzt.
6. Bei ungÃ¼ltiger Datei wird der Upload-Prozess abgebrochen.

**AlternativablÃ¤ufe**

- Datei Ã¼berschreitet GrÃ¶ÃŸenlimit â†’ System antwortet mit 400 und speichert nichts.
- Datei besitzt unzulÃ¤ssigen Typ â†’ System antwortet mit 400 und speichert nichts.
- Technischer Fehler bei Validierung â†’ System antwortet mit 500 und speichert nichts.

**Ergebnis**

- Nur valide Dateien werden persistiert.
- UngÃ¼ltige Dateien werden vollstÃ¤ndig verworfen.
- Es entstehen keine unvollstÃ¤ndigen Attachment-DatensÃ¤tze.

### UC 19/06: Attachment physisch lÃ¶schen verhindern

**Akteur**

System

**Ziel**

Sicherstellen, dass Attachments systemweit nicht physisch gelÃ¶scht werden kÃ¶nnen.

**Vorbedingungen**

- Ein Attachment-Datensatz existiert.
- Ein LÃ¶schversuch wird initiiert (direkt oder indirekt, z. B. Ã¼ber API).

**Ablauf**

1. Das System prÃ¼ft, ob eine LÃ¶schoperation fÃ¼r ein Attachment angefordert wurde.
2. Das System erkennt, dass physische LÃ¶schung von Attachments nicht vorgesehen ist.
3. Das System blockiert die LÃ¶schoperation.
4. Das System liefert einen definierten Fehlerstatus zurÃ¼ck.

**AlternativablÃ¤ufe**

- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Der Attachment-Datensatz bleibt unverÃ¤ndert bestehen.
- Die physische Datei bleibt im Upload-Verzeichnis erhalten.
- Es entstehen keine verwaisten Referenzen.

### UC 19/07: Verhalten bei LÃ¶schung eines Parent-Objekts

**Akteur**

Administrator, Disponent

**Ziel**

Sicherstellen, dass bei LÃ¶schung eines Parent-Objekts keine verwaisten Attachment-Referenzen entstehen.

**Vorbedingungen**

- Ein Parent-Objekt (Projekt, Kunde oder Mitarbeiter) existiert.
- Dem Parent-Objekt sind ein oder mehrere Attachments zugeordnet.
- Der Akteur besitzt LÃ¶schrechte fÃ¼r das Parent-Objekt.

**Ablauf**

1. Der Akteur initiiert die LÃ¶schung des Parent-Objekts.
2. Das System prÃ¼ft die Berechtigung des Akteurs.
3. Das System prÃ¼ft referenzielle IntegritÃ¤t.
4. Das System entfernt den Parent-Datensatz gemÃ¤ÃŸ den Regeln des jeweiligen Features.
5. Das System stellt sicher, dass Attachment-DatensÃ¤tze nicht ohne Parent-Zuordnung bestehen bleiben.
6. Das System verhindert verwaiste FremdschlÃ¼sselzustÃ¤nde.

**AlternativablÃ¤ufe**

- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne LÃ¶schrechte â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Es existieren keine verwaisten Attachment-Referenzen.
- Die physische LÃ¶schung der Datei erfolgt weiterhin nicht.
- Die Datenbank bleibt konsistent.

### UC 19/08: Serverseitige BerechtigungsprÃ¼fung bei Attachment-Zugriff

**Akteur**

System

**Ziel**

Sicherstellen, dass jeder Zugriff auf ein Attachment ausschlieÃŸlich auf Basis der Parent-Berechtigungen erfolgt.

**Vorbedingungen**

- Ein Attachment existiert.
- Ein Zugriff (Anzeige oder Download) wird angefordert.

**Ablauf**

1. Das System identifiziert das angeforderte Attachment.
2. Das System ermittelt das zugehÃ¶rige Parent-Objekt.
3. Das System prÃ¼ft die Berechtigung des Akteurs fÃ¼r dieses Parent-Objekt.
4. Bei gÃ¼ltiger Berechtigung wird der Zugriff gewÃ¤hrt.
5. Bei fehlender Berechtigung wird der Zugriff verweigert.

**AlternativablÃ¤ufe**

- Attachment existiert nicht â†’ System antwortet mit 404.
- Parent-Objekt existiert nicht â†’ System antwortet mit 404.
- Akteur ohne Berechtigung â†’ System blockiert mit 403.
- Technischer Fehler â†’ System antwortet mit 500.

**Ergebnis**

- Attachment-Zugriffe sind vollstÃ¤ndig an Parent-Berechtigungen gebunden.
- Es existieren keine eigenstÃ¤ndigen Attachment-Berechtigungen.
- Direkter Zugriff auf das Upload-Verzeichnis ist nicht mÃ¶glich.

# FT (20): Rollenbasierte ZugriffsbeschrÃ¤nkungen und UI-Steuerung

## FT (20) Ziel / Zweck

Dieses Feature definiert die fachliche Bedeutung der Rollen **Admin**, **Disponent(in)** und **Monteur** innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfÃ¼gbar sind.

Ziel ist es, eine klare Verantwortungsstruktur im System zu etablieren, ohne die bestehende Daten- oder Terminlogik zu verÃ¤ndern. Die ZugriffsbeschrÃ¤nkungen betreffen ausschlieÃŸlich Sichtbarkeit, Bedienbarkeit und serverseitig durchgesetzte Autorisierung.

Die fachliche Sicherheit bleibt stets serverseitig abgesichert (vgl. FT (14)); FT (20) ergÃ¤nzt diese Grundlage um UI-seitige Steuerung und klare Nutzungsmodelle.

## FT (20) Fachliche Beschreibung

Jeder Benutzer besitzt genau eine Rolle. Diese Rolle definiert seinen funktionalen Handlungsspielraum im System.

Die Anwendung unterscheidet drei Rollen:

### 1. Admin

Der Admin besitzt systemweite Verantwortung.

Er darf:

- Benutzer verwalten und Rollen Ã¤ndern
- Systemnahe Stammdaten verwalten
- Gesperrte Termine bearbeiten
- Alle Funktionen der Disposition nutzen

Der Admin ist die hÃ¶chste Berechtigungsstufe. Es muss stets mindestens ein Admin im System existieren.

### 2. Disponent(in)

Der Disponent ist der operative Hauptnutzer der Anwendung.

Er darf:

- Projekte anlegen, bearbeiten und deaktivieren
- Termine anlegen, verschieben, bearbeiten und lÃ¶schen
- Mitarbeiter zuweisen
- Touren und Teams verwalten
- Notizen und AnhÃ¤nge verwalten
- Druckfunktionen nutzen

Der Disponent darf keine Benutzerrollen Ã¤ndern und keine systemweiten Administrationsfunktionen ausfÃ¼hren.

### 3. Monteur

Der Monteur ist ein rein lesender Nutzer.

Er darf:

- Kalenderansichten anzeigen
- Projekt- und Kundendetails einsehen
- Eigene und fremde Termine einsehen
- DispositionsÃ¼bersichten lesen

Der Monteur darf keine Daten verÃ¤ndern, anlegen oder lÃ¶schen.

Die OberflÃ¤che fÃ¼r Monteure ist funktional reduziert und enthÃ¤lt keine aktiven Bearbeitungselemente.

## Grundprinzipien

1. Sicherheit wird serverseitig durchgesetzt.
2. UI-Sichtbarkeit ist eine Komfortfunktion, keine SicherheitsmaÃŸnahme.
3. Die fachliche Datenstruktur bleibt unverÃ¤ndert.
4. Es wird keine Rechte-Matrix eingefÃ¼hrt.
5. Rollen wirken ausschlieÃŸlich auf FunktionsverfÃ¼gbarkeit, nicht auf Datenmodellierung.

## FT (20) Regeln & Randbedingungen

- Rollen Ã¤ndern keine Datenmodelle.
- Rollen beeinflussen keine Aggregationslogik.
- Rollen beeinflussen keine Query-Struktur.
- Rollen verÃ¤ndern keine Termin-Lane-Logik.
- Navigation wird nicht umstrukturiert, sondern nur ergÃ¤nzt oder konditional gerendert.
- Deep-Link-Aufrufe werden serverseitig validiert.
- Es darf keine clientseitige Autorisierungslogik ohne serverseitige GegenprÃ¼fung existieren.
- Ein Monteur sieht alle Termine, jedoch ausschlieÃŸlich im Lesemodus.
- Der letzte Admin darf nicht entfernt oder herabgestuft werden.

## FT (20) Use Cases

### UC 20/01: UnzulÃ¤ssige Aktion wird blockiert

### Akteur

Admin, Disponent, Monteur

### Ziel

Verhindern, dass ein Akteur eine fachliche Mutation ausfÃ¼hrt, fÃ¼r die seine Rolle keine Berechtigung besitzt.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Die angeforderte Aktion erfordert eine bestimmte Rolle.
- Der Akteur besitzt diese Rolle nicht.

### Ablauf

1. Akteur startet eine fachliche Mutation (z. B. Anlegen, Bearbeiten oder LÃ¶schen eines Objekts).
2. Das System prÃ¼ft serverseitig die Rolle des Akteurs.
3. Das System vergleicht die Rolle mit den fÃ¼r die Aktion definierten Berechtigungen.
4. Das System verweigert die AusfÃ¼hrung der Mutation.
5. Das System antwortet mit HTTP-Status 403.

### Alternativen

- Die Aktion wird ausschlieÃŸlich Ã¼ber die UI angeboten, aber serverseitig ebenfalls geprÃ¼ft.
- Der Akteur versucht einen Direktaufruf eines Endpunkts â†’ Das System blockiert mit 403.

### Ergebnis

Die Mutation wird nicht durchgefÃ¼hrt.

Es erfolgt keine DatenÃ¤nderung.

### UC 20/02: RollenabhÃ¤ngige Navigation anzeigen

### Akteur

Admin, Disponent, Monteur

### Ziel

Die Navigation zeigt ausschlieÃŸlich die fÃ¼r die Rolle des Akteurs vorgesehenen Bereiche.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Dem Akteur ist genau eine Rolle zugeordnet.

### Ablauf

1. Akteur Ã¶ffnet die Anwendung.
2. Das System ermittelt serverseitig die Rolle des Akteurs.
3. Das System rendert die Navigation gemÃ¤ÃŸ der Rollendefinition.
4. Nicht zulÃ¤ssige Navigationspunkte werden nicht angezeigt.
5. Bei Direktaufruf eines nicht zulÃ¤ssigen Bereichs prÃ¼ft das System serverseitig die Berechtigung.
6. Das System blockiert mit 403 bei fehlender Berechtigung.

### Alternativen

- Der Akteur besitzt die hÃ¶chste Rolle â†’ Alle vorgesehenen Bereiche werden angezeigt.
- Der Akteur besitzt ausschlieÃŸlich Leserechte â†’ Nur lesende Bereiche werden angezeigt.

### Ergebnis

Die Navigation entspricht der funktionalen Rolle.

UnzulÃ¤ssige Bereiche sind weder sichtbar noch serverseitig zugÃ¤nglich.

### UC 20/03: Admin verwaltet Benutzerrollen

### Akteur

Admin

### Ziel

Die Rolle eines bestehenden Benutzers Ã¤ndern.

### Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Der zu Ã¤ndernde Benutzer existiert.
- Mindestens ein Admin bleibt im System erhalten.

### Ablauf

1. Akteur Ã¶ffnet die Benutzerverwaltung.
2. Akteur wÃ¤hlt einen Benutzer aus.
3. Akteur wÃ¤hlt eine neue Rolle.
4. Das System prÃ¼ft, ob durch die Ã„nderung kein letzter Admin entfernt wird.
5. Das System speichert die neue Rolle.
6. Das System macht die neue Rolle unmittelbar wirksam.

### Alternativen

- Der zu Ã¤ndernde Benutzer existiert nicht â†’ System antwortet mit 404.
- Die Ã„nderung wÃ¼rde den letzten Admin entfernen â†’ System blockiert mit 409.
- Der Akteur besitzt keine Admin-Rolle â†’ System blockiert mit 403.

### Ergebnis

Die neue Rolle ist persistiert.

Die Berechtigungen des betroffenen Benutzers Ã¤ndern sich entsprechend.

# FT (21): KI-gestÃ¼tzte Dokumentenextraktion

## FT (21) Ziel / Zweck

FT (21) erweitert das System um eine kontextgebundene Dokumentenextraktion zur UnterstÃ¼tzung der Disposition.

Aus einem textbasierten Auftragsdokument (PDF) sollen automatisiert folgende Daten extrahiert werden:

- Kundendaten gemÃ¤ÃŸ bestehendem Kundenschema
- Saunamodell (als Projekttitel-Vorschlag)
- Artikelliste (Menge + Beschreibung, mehrzeilig mÃ¶glich, ohne Preise)

Die extrahierten Daten werden als editierbarer Vorschlag prÃ¤sentiert und kÃ¶nnen in das aktuelle Formular (Neues Projekt oder Neuer Termin) Ã¼bernommen werden.

Das Feature dient ausschlieÃŸlich der Arbeitserleichterung.

Es ersetzt keine bestehende Validierungs- oder Sicherheitslogik.

## FT (21) Fachliche Beschreibung

Die Extraktionsfunktion ist ausschlieÃŸlich in folgenden Kontexten verfÃ¼gbar:

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
7. Liefert ein validiertes Ergebnis zurÃ¼ck.

### KI-Zusatzfunktion: Kategorisierung

Die extrahierte Artikelliste wird semantisch gruppiert und sortiert.

Beispielhafte Kategorien:

- Saunatyp
- Dachvariante
- Farbe
- Ofen
- Fenster
- Inneneinrichtung
- ZubehÃ¶r
- SondermaÃŸe
- Einzelteile

Die Kategorisierung darf die ursprÃ¼nglichen Inhalte nicht verÃ¤ndern.

Bei Unsicherheit bleibt die ursprÃ¼ngliche Reihenfolge erhalten.

## PrÃ¤sentation

Nach erfolgreicher Extraktion erscheint ein schwebender Dialog.

### Bereich 1 â€“ Kundendaten

Nachbildung des Kunden-Edit-Formulars mit vorbefÃ¼llten Feldern.

Alle Felder sind editierbar.

### Bereich 2 â€“ Projektvorschlag

Titelfeld:

- VorgefÃ¼llt mit erkanntem Saunamodell.

Editorfeld (RTF/HTML-kompatibel):

- Extrahierte, sortierte Artikelliste.
- Darstellung als strukturierte HTML-Auflistung.
- VollstÃ¤ndig editierbar.

## FT (21) Regeln & Randbedingungen

- Die Verarbeitung erfolgt ausschlieÃŸlich serverseitig.
- Es werden keine Dokumente oder Texte an externe Dienste Ã¼bertragen.
- Das KI-Modell lÃ¤uft lokal.
- Dokumenttexte werden nicht persistiert.
- Prompts und Rohtexte werden nicht geloggt.
- Die KI-Ausgabe gilt als nicht vertrauenswÃ¼rdig und wird vollstÃ¤ndig validiert.
- UngÃ¼ltige oder unvollstÃ¤ndige Daten dÃ¼rfen nicht gespeichert werden.
- Die Speicherung erfolgt nur nach BenutzerbestÃ¤tigung.
- Rollen- und Berechtigungslogik wird serverseitig geprÃ¼ft.
- FT (21) verÃ¤ndert das Attachment-Modell aus FT (19) nicht.
- FT (21) verÃ¤ndert keine bestehenden DomÃ¤nenmodelle.
- Das Feature darf keine impliziten DatenÃ¤nderungen auslÃ¶sen.
- Bei strukturell ungeeigneten Dokumenten muss der Prozess sauber abbrechen.

## FT (21) **Use Cases**

### UC 21/01: Dokumentextraktion starten

### Akteur

Disponent, Administrator

### Ziel

Ein geeignetes Dokument mittels regelbasierter Parsing-Prozesse analysieren und daraus strukturierte, editierbare DatenvorschlÃ¤ge erzeugen.

### Vorbedingungen

- Ein Attachment existiert und ist einem fachlichen Objekt zugeordnet.
- Das Dokument ist technisch lesbar.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Berechtigung zur Dokumentextraktion.

### Ablauf

1. Der Akteur wÃ¤hlt ein vorhandenes Attachment aus.
2. Der Akteur startet die Funktion â€žDokument extrahierenâ€œ.
3. Das System extrahiert den Text aus dem Dokument.
4. Das System analysiert den Text mithilfe deterministischer Parsing-Regeln.
5. Das System identifiziert strukturierte Bereiche wie Kundendaten, Artikelliste und projektbezogene Informationen.
6. Das System validiert die extrahierten Daten gegen definierte Feld- und Formatregeln.
7. Das System zeigt die extrahierten Daten als editierbaren Vorschlag in einem Dialog an.

### Alternativen

- Dokument ist technisch nicht lesbar â†’ Das System bricht ab und zeigt eine Fehlermeldung an.
- Parsing-Regeln liefern keine verwertbaren Daten â†’ Das System zeigt einen Hinweis und erzeugt keinen Vorschlag.
- Validierung schlÃ¤gt fehl â†’ Das System zeigt einen strukturierten Fehlerstatus an; es werden keine Daten persistiert.

### Ergebnis

Ein strukturierter, validierter und editierbarer Datenvorschlag wird angezeigt. Es wurden keine fachlichen Stammdaten persistiert.

### UC 21/02: Extrahierte Daten bestÃ¤tigen

### Akteur

Disponent, Administrator

### Ziel

Einen durch Parsing erzeugten Extraktionsvorschlag prÃ¼fen, anpassen und in die entsprechenden DomÃ¤nenobjekte Ã¼bernehmen.

### Vorbedingungen

- Ein validierter Extraktionsvorschlag liegt vor.
- Der Akteur ist berechtigt, Kunden, Projekte oder Termine anzulegen oder zu verÃ¤ndern.

### Ablauf

1. Der Akteur prÃ¼ft die vorbefÃ¼llten Kundendaten.
2. Der Akteur passt bei Bedarf einzelne Felder an.
3. Der Akteur prÃ¼ft die extrahierte Artikelliste.
4. Der Akteur bestÃ¤tigt die Ãœbernahme.
5. Das System validiert die Daten gemÃ¤ÃŸ den jeweiligen DomÃ¤nenregeln.
6. Das System persistiert die Daten transaktional in den betroffenen DomÃ¤nenobjekten.
7. Das System aktualisiert betroffene Sichten und Auswahlkomponenten.

### Alternativen

- Der Akteur bricht den Vorgang ab â†’ Es erfolgt keine Speicherung; bestehende Daten bleiben unverÃ¤ndert.
- Bei der Persistierung tritt ein Validierungsfehler auf â†’ Das System zeigt eine Fehlermeldung an; es werden keine TeilzustÃ¤nde gespeichert.
- WÃ¤hrend der Persistierung tritt ein Versionskonflikt auf â†’ Das System bricht ab und informiert den Akteur; es erfolgt keine Speicherung.

### Ergebnis

Die bestÃ¤tigten Daten sind persistent gespeichert und fachlich korrekt den jeweiligen DomÃ¤nenobjekten zugeordnet.

### UC 21/03: Ungeeignetes Dokument behandeln

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass ungeeignete oder nicht strukturierbare Dokumente nicht zu inkonsistenten Daten fÃ¼hren.

### Vorbedingungen

- Das Dokument enthÃ¤lt keine ausreichend strukturierbaren Daten oder entspricht nicht dem erwarteten Format.
- Der Akteur startet die Dokumentextraktion.

### Ablauf

1. Der Akteur startet die Extraktion.
2. Das System extrahiert den Text.
3. Das System fÃ¼hrt die Parsing-Regeln aus.
4. Das System erkennt, dass keine hinreichend verwertbaren strukturierten Daten erzeugt werden kÃ¶nnen.
5. Das System bricht den Prozess mit einer klaren Fehlermeldung ab.

### Alternativen

- Das Dokument enthÃ¤lt teilweise verwertbare Daten â†’ Das System zeigt nur valide Teilbereiche als Vorschlag an und kennzeichnet unvollstÃ¤ndige Felder.

### Ergebnis

Es erfolgt keine Persistierung fachlicher Daten. Das System bleibt konsistent.

### UC 21/04: Kategorisierung schlÃ¤gt fehl

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass eine fehlgeschlagene regelbasierte Gruppierung von Positionen die Extraktion nicht blockiert.

### Vorbedingungen

- Eine Artikelliste wurde extrahiert.
- Die regelbasierte Gruppierung liefert kein eindeutiges Ergebnis.

### Ablauf

1. Das System versucht, die Artikelliste anhand definierter Regeln zu gruppieren.
2. Das System erkennt, dass keine eindeutige Gruppierung mÃ¶glich ist.
3. Das System stellt die Artikelliste in der ursprÃ¼nglichen Reihenfolge dar.
4. Der Akteur kann die Liste weiterhin bearbeiten und Ã¼bernehmen.

### Alternativen

- Teilweise Gruppierung mÃ¶glich â†’ Das System gruppiert nur eindeutig identifizierbare Bereiche; Ã¼brige Positionen bleiben in Originalreihenfolge.

### Ergebnis

Die Extraktion bleibt nutzbar. Es wird keine Blockade des Prozesses verursacht.

### UC 21/05: Dokumentextraktion im Formular â€žNeues Projektâ€œ starten

### Akteur

Disponent, Administrator

### Ziel

Innerhalb des Formulars â€žNeues Projektâ€œ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

### Vorbedingungen

- Das Formular â€žNeues Projektâ€œ ist geÃ¶ffnet.
- Der Akteur besitzt die Berechtigung zur Projektanlage.
- Ein PDF-Dokument ist verfÃ¼gbar.

### Ablauf

1. Der Akteur lÃ¤dt ein PDF in den definierten Extraktionsbereich des Formulars.
2. Das System startet die regelbasierte Dokumentextraktion gemÃ¤ÃŸ UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

### Alternativen

- Das Dokument ist nicht geeignet â†’ Das System zeigt eine Fehlermeldung; das Projektformular bleibt unverÃ¤ndert.

### Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars â€žNeues Projektâ€œ zur VerfÃ¼gung. Es wurden keine Projektdaten gespeichert.

### UC 21/06: Dokumentextraktion im Formular â€žNeuer Terminâ€œ starten

### Akteur

Disponent, Administrator

### Ziel

Innerhalb des Formulars â€žNeuer Terminâ€œ ein Dokument mittels Parsing analysieren und einen Vorschlag erzeugen.

### Vorbedingungen

- Das Formular â€žNeuer Terminâ€œ ist geÃ¶ffnet.
- Der Akteur besitzt die Berechtigung zur Terminanlage.
- Ein PDF-Dokument ist verfÃ¼gbar.

### Ablauf

1. Der Akteur lÃ¤dt ein PDF in den definierten Extraktionsbereich des Terminformulars.
2. Das System startet die regelbasierte Dokumentextraktion gemÃ¤ÃŸ UC 21/01.
3. Das System zeigt einen Ergebnisdialog mit editierbarem Vorschlag an.

### Alternativen

- Das Dokument ist nicht geeignet â†’ Das System zeigt eine Fehlermeldung; das Terminformular bleibt unverÃ¤ndert.

### Ergebnis

Ein editierbarer Extraktionsvorschlag steht im Kontext des Formulars â€žNeuer Terminâ€œ zur VerfÃ¼gung. Es wurden keine Termin- oder Projektdaten gespeichert.

### UC 21/07: Kundendaten Ã¼bernehmen â€“ Scope Neues Projekt

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Kundendaten im Kontext â€žNeues Projektâ€œ Ã¼bernehmen und einen Kunden korrekt anlegen oder ersetzen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Das Formular â€žNeues Projektâ€œ ist geÃ¶ffnet.

### Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Kundendaten.
2. Wenn kein Kunde ausgewÃ¤hlt ist:
    1. Das System fragt, ob ein neuer Kunde mit den erkannten Daten angelegt werden soll.
    2. Das System fÃ¼hrt eine DuplikatsprÃ¼fung gemÃ¤ÃŸ Kundenregeln durch.
    3. Das System legt bei BestÃ¤tigung einen neuen Kunden an.
    4. Das System verknÃ¼pft den neuen Kunden mit dem Projekt.
3. Wenn bereits ein Kunde ausgewÃ¤hlt ist:
    1. Das System warnt, dass der aktuell gewÃ¤hlte Kunde ersetzt wird.
    2. Bei BestÃ¤tigung fÃ¼hrt das System eine DuplikatsprÃ¼fung durch.
    3. Das System legt einen neuen Kunden an.
    4. Das System verknÃ¼pft den neuen Kunden mit dem Projekt.

### Alternativen

- Der Akteur bricht ab â†’ Es erfolgt keine Kundenanlage und keine Ã„nderung der Projektzuordnung.
- DuplikatsprÃ¼fung schlÃ¤gt fehl â†’ Das System blockiert die Anlage oder weist auf einen bestehenden Kunden hin.

### Ergebnis

Der Projektentwurf ist mit einem neu angelegten oder bestÃ¤tigten Kunden verknÃ¼pft. Es entstehen keine widersprÃ¼chlichen Kundenreferenzen.

### UC 21/08: Kundendaten Ã¼bernehmen â€“ Scope Neuer Termin

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Kundendaten im Kontext â€žNeuer Terminâ€œ Ã¼bernehmen und korrekt mit Termin und ggf. Projekt verknÃ¼pfen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Kundendaten liegt vor.
- Kein Projekt ist im Terminformular ausgewÃ¤hlt.

### Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Kundendaten.
2. Das System fragt, ob ein neuer Kunde angelegt werden soll.
3. Das System fÃ¼hrt eine DuplikatsprÃ¼fung gemÃ¤ÃŸ Kundenregeln durch.
4. Das System legt bei BestÃ¤tigung einen neuen Kunden an.
5. Das System setzt den neu angelegten Kunden im Terminformular.

### Alternativen

- Der Akteur bricht ab â†’ Keine Kundenanlage, keine FormularÃ¤nderung.
- DuplikatsprÃ¼fung schlÃ¤gt fehl â†’ Das System blockiert die Anlage oder bietet Auswahl eines bestehenden Kunden an.

### Ergebnis

Der Terminentwurf referenziert einen neu angelegten oder bestÃ¤tigten Kunden. Es existieren keine verwaisten Referenzen.

### UC 21/09: Projekt Ã¼bernehmen â€“ Scope Neues Projekt

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Projektinformationen im Kontext â€žNeues Projektâ€œ Ã¼bernehmen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Das Formular â€žNeues Projektâ€œ ist geÃ¶ffnet.

### Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Projektdaten.
2. Wenn Titel und Beschreibung leer sind:
    1. Das System setzt den Titel auf das erkannte Modell oder den erkannten Projektnamen.
    2. Das System fÃ¼gt die extrahierte Artikelliste als HTML in das Beschreibungsfeld ein.
3. Wenn Felder bereits befÃ¼llt sind:
    1. Das System zeigt einen Warnhinweis vor dem Ãœberschreiben.
    2. Bei BestÃ¤tigung ersetzt das System die bestehenden Inhalte.

### Alternativen

- Der Akteur lehnt das Ãœberschreiben ab â†’ Bestehende Inhalte bleiben unverÃ¤ndert.

### Ergebnis

Das Projektformular enthÃ¤lt die Ã¼bernommenen Projektdaten gemÃ¤ÃŸ BestÃ¤tigung des Akteurs.

### UC 21/10: Projekt Ã¼bernehmen â€“ Scope Neuer Termin

### Akteur

Disponent, Administrator

### Ziel

Extrahierte Projektinformationen im Kontext â€žNeuer Terminâ€œ Ã¼bernehmen und ein neues Projekt erzeugen.

### Vorbedingungen

- Ein Extraktionsvorschlag mit Projektdaten liegt vor.
- Kein Projekt ist im Terminformular ausgewÃ¤hlt.

### Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der Projektdaten.
2. Das System legt ein neues Projekt an.
3. Das System setzt den Projekttitel auf das erkannte Modell oder den erkannten Projektnamen.
4. Das System setzt die Projektbeschreibung auf die extrahierte HTML-Artikelliste.
5. Das System verknÃ¼pft das neue Projekt mit dem Termin.
6. Das System verknÃ¼pft den zugehÃ¶rigen Kunden mit dem Projekt.
7. Das System speichert alle Ã„nderungen transaktional.

### Alternativen

- Der Akteur bricht vor BestÃ¤tigung ab â†’ Kein Projekt wird angelegt; das Terminformular bleibt unverÃ¤ndert.
- WÃ¤hrend der Anlage tritt ein Validierungs- oder Versionskonflikt auf â†’ Das System bricht ab; es werden keine TeilzustÃ¤nde gespeichert.

### Ergebnis

Ein neues Projekt ist persistent angelegt und korrekt mit Termin und Kunde verknÃ¼pft. Alle Referenzen sind konsistent.

### UC 21/11: Extraktionsvorgang abbrechen

### Akteur

Disponent, Administrator

### Ziel

Einen gestarteten Extraktionsvorgang ohne Persistierung fachlicher Daten kontrolliert abbrechen.

### Vorbedingungen

- Ein Extraktionsdialog mit Vorschlagsdaten ist geÃ¶ffnet.
- Es wurden noch keine fachlichen Stammdaten gespeichert.

### Ablauf

1. Der Akteur wÃ¤hlt im Extraktionsdialog die Funktion â€žAbbrechenâ€œ.
2. Das System verwirft alle extrahierten, nicht bestÃ¤tigten Vorschlagsdaten.
3. Das System schlieÃŸt den Extraktionsdialog.
4. Das System stellt den ursprÃ¼nglichen Zustand des aufrufenden Formulars wieder her.

### Alternativen

- Der Akteur schlieÃŸt den Dialog Ã¼ber die Fenstersteuerung â†’ Das System behandelt dies identisch zum aktiven Abbruch.

### Ergebnis

Es wurden keine fachlichen Stammdaten angelegt oder verÃ¤ndert. Das System verbleibt im Zustand vor Beginn der Extraktion.

### UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass extrahierte Kundendaten im Kontext â€žNeuer Terminâ€œ nicht automatisch einen bestehenden, bereits gesetzten Kunden Ã¼berschreiben.

### Vorbedingungen

- Das Formular â€žNeuer Terminâ€œ ist geÃ¶ffnet.
- Ein Kunde ist bereits im Terminformular ausgewÃ¤hlt.
- Ein Extraktionsvorschlag mit Kundendaten liegt vor.

### Ablauf

1. Der Akteur wÃ¤hlt die Ãœbernahme der extrahierten Kundendaten.
2. Das System erkennt, dass bereits ein Kunde im Terminformular gesetzt ist.
3. Das System zeigt einen eindeutigen Warnhinweis Ã¼ber das Ersetzen der bestehenden Kundenreferenz.
4. Der Akteur bestÃ¤tigt oder verwirft die Ersetzung.
5. Bei BestÃ¤tigung fÃ¼hrt das System eine DuplikatsprÃ¼fung durch.
6. Das System legt gegebenenfalls einen neuen Kunden an.
7. Das System ersetzt die Kundenreferenz im Terminformular.

### Alternativen

- Der Akteur verwirft die Ersetzung â†’ Die bestehende Kundenreferenz bleibt unverÃ¤ndert.
- Die DuplikatsprÃ¼fung ergibt einen bestehenden Kunden â†’ Das System bietet die Auswahl des vorhandenen Kunden an.

### Ergebnis

Die Kundenreferenz im Terminformular ist eindeutig definiert und konsistent. Es existieren keine stillen Ãœberschreibungen.

### UC 21/13: Wiederholte Extraktion desselben Dokuments

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass die wiederholte Extraktion desselben Attachments keine inkonsistenten oder doppelten Stammdaten erzeugt.

### Vorbedingungen

- Ein Attachment wurde bereits extrahiert.
- Es wurden noch keine oder bereits bestÃ¤tigte Daten aus diesem Dokument Ã¼bernommen.

### Ablauf

1. Der Akteur startet erneut die Funktion â€žDokument extrahierenâ€œ fÃ¼r dasselbe Attachment.
2. Das System fÃ¼hrt die regelbasierte Parsing-Analyse erneut vollstÃ¤ndig aus.
3. Das System erzeugt einen neuen, unabhÃ¤ngigen Extraktionsvorschlag.
4. Der Akteur bestÃ¤tigt oder verwirft den neuen Vorschlag.
5. Bei BestÃ¤tigung fÃ¼hrt das System regulÃ¤re Duplikats- und ValidierungsprÃ¼fungen durch.

### Alternativen

- Der Akteur verwirft den neuen Vorschlag â†’ Keine Ã„nderung an bestehenden Daten.
- DuplikatsprÃ¼fung verhindert eine doppelte Kunden- oder Projektanlage â†’ Das System blockiert oder verweist auf bestehende DatensÃ¤tze.

### Ergebnis

Es entstehen keine automatischen Dubletten. Jede Persistierung erfolgt ausschlieÃŸlich nach expliziter BestÃ¤tigung des Akteurs und unter Anwendung der bestehenden DomÃ¤nenregeln.

### UC 21/14: Extraktion bei zwischenzeitlich gelÃ¶schtem Parent-Objekt

### Akteur

Disponent, Administrator

### Ziel

Sicherstellen, dass eine laufende Extraktion nicht zu inkonsistenten Referenzen fÃ¼hrt, wenn das aufrufende Objekt zwischenzeitlich gelÃ¶scht wurde.

### Vorbedingungen

- Ein Extraktionsdialog ist geÃ¶ffnet.
- Das zugrunde liegende Projekt- oder Terminformular wurde in einem anderen Browser oder durch einen anderen Akteur gelÃ¶scht oder geschlossen.

### Ablauf

1. Der Akteur bestÃ¤tigt im Extraktionsdialog die Ãœbernahme der Daten.
2. Das System prÃ¼ft vor Persistierung die Existenz des referenzierten Parent-Objekts.
3. Das System erkennt, dass das Parent-Objekt nicht mehr existiert.
4. Das System bricht den Vorgang ab.
5. Das System informiert den Akteur Ã¼ber den Konflikt.

### Alternativen

- Das Parent-Objekt existiert, aber wurde verÃ¤ndert â†’ Das System prÃ¼ft Versionsinformationen und behandelt einen Konflikt gemÃ¤ÃŸ den jeweiligen DomÃ¤nenregeln.

### Ergebnis

Es werden keine Daten mit ungÃ¼ltigen oder nicht existierenden Referenzen gespeichert. Die Systemkonsistenz bleibt gewahrt.

# FT (22): Termin- und Tourvisualisierung in Maps

## FT (22) Ziel / Zweck

Dieses Feature erweitert die bestehende Terminplanung um eine **rÃ¤umliche Visualisierungsebene**. Ziel ist es, Termine und Touren auf einer Kartenansicht darzustellen, um geografische ZusammenhÃ¤nge, rÃ¤umliche Ballungen und Tourverteilungen besser erkennen zu kÃ¶nnen.

Die Kartenansicht dient ausschlieÃŸlich der visuellen Orientierung und unterstÃ¼tzt die Disposition bei der rÃ¤umlichen EinschÃ¤tzung geplanter EinsÃ¤tze. Sie verÃ¤ndert keine fachlichen Daten und ersetzt keine bestehende Termin- oder Tourlogik.

FT (22) ist ein reines Darstellungs- und Analysefeature.

## FT (22) Fachliche Beschreibung

Die Kartenansicht stellt Termine als Marker auf einer OpenStreetMap-basierten Karte dar. Grundlage der Positionierung ist die Adresse des dem Termin zugeordneten Kunden.

Die Adresse wird serverseitig zur Laufzeit geokodiert. Die daraus resultierenden Koordinaten werden nicht persistent gespeichert, sondern ausschlieÃŸlich zur Darstellung verwendet.

Jeder Marker reprÃ¤sentiert einen Termin im gewÃ¤hlten Zeitraum.

Die Darstellung berÃ¼cksichtigt bestehende fachliche Beziehungen:

- Termin â†’ Projekt â†’ Kunde â†’ Adresse
- Termin â†’ Tour â†’ Tourfarbe
- Termin â†’ Mitarbeiter

Marker Ã¼bernehmen die Farbe der zugeordneten Tour. Termine ohne Tour werden in einer neutralen Standardfarbe dargestellt.

Mehrere Termine an derselben Adresse kÃ¶nnen entweder:

- als Ã¼berlagerte Marker erscheinen oder
- als visuell zusammengefasster Marker (Cluster) dargestellt werden.

Die Kartenansicht verwendet dieselben Filtermechanismen wie Kalender- und Terminlistenansicht. Es werden ausschlieÃŸlich die aktuell gefilterten Termine dargestellt.

## FT (22) Regeln & Randbedingungen

- Die Kartenansicht ist rein lesend.
- Ãœber die Kartenansicht kÃ¶nnen keine Termine erstellt, bearbeitet oder gelÃ¶scht werden.
- Es findet keine Routenberechnung statt.
- Es findet keine Entfernungsberechnung statt.
- Es findet keine Optimierung oder Bewertung von Touren statt.
- Geokodierung erfolgt ausschlieÃŸlich serverseitig.
- Dokumenttexte oder Kundendaten werden nicht persistent verÃ¤ndert.
- Fehlgeschlagene Geokodierung fÃ¼hrt nicht zu Datenverlust.
- Termine ohne erfolgreich ermittelbare Koordinaten werden nicht angezeigt oder klar als nicht lokalisierbar gekennzeichnet.

Die Kartenansicht verÃ¤ndert keine bestehenden Features:

- FT (01) Terminverwaltung bleibt unverÃ¤ndert.
- FT (02) Projekte bleiben unverÃ¤ndert.
- FT (04) Tourenplanung bleibt unverÃ¤ndert.
- FT (03) Kalenderansichten bleiben unverÃ¤ndert.

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

Termine im gewÃ¤hlten Zeitraum rÃ¤umlich visualisieren.

**Vorbedingungen:**

- Termine existieren.
- Kunden besitzen gÃ¼ltige Adressen.
- Benutzer besitzt Leserechte.

### Ablauf:

1. Benutzer Ã¶ffnet die Kartenansicht.
2. System ermittelt die aktuell gefilterten Termine.
3. System extrahiert die zugehÃ¶rigen Kundenadressen.
4. System fÃ¼hrt serverseitig eine Geokodierung durch.
5. System rendert Marker auf der Karte.
6. Benutzer kann Marker anklicken, um Details einzusehen.

### Alternativen:

- Adresse nicht geokodierbar â†’ Marker wird nicht angezeigt oder als â€žnicht lokalisierbarâ€œ markiert.
- Keine Termine vorhanden â†’ Karte wird ohne Marker angezeigt.

### Ergebnis:

Die ausgewÃ¤hlten Termine sind rÃ¤umlich visualisiert.

### UC 22/02: Kartenansicht nach Tour filtern

**Akteur:**

Disponent

### Ziel:

Nur Termine einer bestimmten Tour rÃ¤umlich anzeigen.

**Vorbedingungen:**

- Touren existieren.
- Termine sind Touren zugeordnet.

### Ablauf:

1. Benutzer wÃ¤hlt Tourfilter.
2. System filtert Termine.
3. System aktualisiert Marker-Darstellung.

### Ergebnis:

Nur Termine der gewÃ¤hlten Tour sind sichtbar.

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

Benutzer erhÃ¤lt vollstÃ¤ndige TerminÃ¼bersicht im Kartenkontext.

# FT (23): Stammdaten Import/Export

## FT 23 Ziel / Zweck

Dieses Feature ermÃ¶glicht den kontrollierten Import von Stammdaten in das System. Der Import dient zwei Zwecken, nÃ¤mlich erstens dem Einspielen vorbereiteter Stammdaten aus CSV-Dateien und zweitens dem Bulk-Import aus PDF-Dokumenten Ã¼ber die vorhandene Extraktionsfunktion mit anschlieÃŸender PrÃ¼fung in einer generierten Import-Tabelle. Das Feature ist ausschlieÃŸlich fÃ¼r Administratoren bestimmt und verfolgt das Ziel, neue DatensÃ¤tze sicher, nachvollziehbar und ohne unkontrollierte Ãœberschreibungen zu Ã¼bernehmen.

## FT 23 Fachliche Beschreibung

Der Import folgt zwei Szenarien:

### Szenario 1: CSV-Import (Stammdaten)

CSV-Dateien werden direkt eingelesen, als VorschlÃ¤ge in einer Importtabelle abgelegt, validiert, korrigiert und selektiv Ã¼bernommen. Siehe UC 23/01.

### Szenario 2: PDF-Bulk-Import (zweistufig)

### Stufe 1 â€“ Kundenextraktion mit Fehlerprotokollierung

- Administrator lÃ¤dt eine oder mehrere PDF-AuftrÃ¤ge hoch
- Das System verarbeitet jedes PDF Ã¼ber die Extraktionsfunktion (FT 21)
- Pro PDF extrahiert das System: **Kundennummer, Name (Vorname+Nachname oder Firmenname), Adresse, PLZ, Stadt, Telefon, Email**
- Das System schreibt die extrahierten Daten in eine Tabelle (eine Zeile pro PDF)
- Das System erzeugt eine **Fehlerspalte** pro Zeile und dokumentiert:
    - Fehlende Kundennummer
    - Fehlender Name
    - UnvollstÃ¤ndige Adress-Daten
    - UngÃ¼ltige Formate (z.B. Telefon)
    - Extraktionsfehler (PDF nicht lesbar, etc.)
- **Ergebnis:** CSV-Datei zum Download mit einer Zeile pro erfolgreich verarbeitetes PDF
- Administrator korrigiert die CSV lokal und importiert diese via **UC 23/01 (CSV-Import-Session)**

### Stufe 2 â€“ Dokumentextraktion mit Kundenzuordnung

**Vorbedingung:** Stufe 1 wurde durchgefÃ¼hrt, Kunden wurden via CSV-Import in das System Ã¼bernommen.

- Administrator startet Stufe 2 und wÃ¤hlt die PDFs aus (oder System nutzt persistierte PDF-Liste aus Stufe 1)
- Das System verarbeitet jedes PDF erneut Ã¼ber die Dokumentextraktionsfunktion (FT 21)
- Pro PDF extrahiert das System: **Kundennummer, Kundenname, Saunamodell, Artikelliste**
- **Matching:** Das System prÃ¼ft â€“ existiert die extrahierte Kundennummer in der Kundentabelle?
    - **Ja:** System ordnet den Kundendatensatz zu
    - **Nein:** System legt fÃ¼r dieses PDF **kein Projekt an** und protokolliert die Warnung
- FÃ¼r erfolgreich gematchte PDFs legt das System ein neues **Projekt** an:
    - **Titel:** Saunamodell (extrahiert)
    - **Beschreibung:** Artikelliste (als HTML-formatierte Auflistung)
    - **Kunde:** Der gematchte Kundendatensatz
- **Ergebnis:** Ãœbersichtsliste aller erzeugten Projekte mit korrekter Kundenzuordnung, unmittelbar dispositionierbar

## FT 23 Regeln & Randbedingungen

**Allgemeine Regeln:**

- Der Import ist nur fÃ¼r Administratoren verfÃ¼gbar
- Ein Import darf nur neue Kunden anlegen, wenn die Kundennummer im System noch nicht existiert
- Ein Import darf nur neue Mitarbeiter anlegen, wenn die Kombination aus Vorname und Nachname im System noch nicht existiert
- Wenn ein Datensatz als Duplikat erkannt wird, darf er nicht Ã¼bernommen werden

### CSV-Kundenimport â€“ Fehlertoleranz

**Pflichtfelder:** Kundennummer + Name (Vorname+Nachname oder Firmenname)

**Optionale Felder:** Adresse, PLZ, Stadt, Telefon, Email, weitere Kontaktangaben

**Verhalten bei unvollstÃ¤ndigen Daten:**

- Fehlende oder ungenaue Daten in **optionalen Feldern** blockieren **nicht** die Ãœbernahme
- Diese Zeilen werden mit einer **Warnung** gekennzeichnet (Status: "Ã¼bernehmbar mit Warnung")
- Der Administrator kann diese Zeilen vor Ãœbernahme korrigieren oder ausschlieÃŸen
- Fehlende **Pflichtfelder** fÃ¼hren zu Status "Konflikt", die Zeile kann nicht Ã¼bernommen werden

### PDF-Bulk Stufe 2 â€“ Dokumentenzuordnung

**Matching-Logik:**

- Extrahierte Kundennummer wird **exakt** gegen die Kundennummer aus Stufe 1 gematchet
- **Exaktes Matching nur** â€“ kein Fuzzy-Matching, kein Fallback auf Name oder Adresse
- Wenn keine Ãœbereinstimmung: Projekt wird nicht angelegt, Admin wird aufgefordert, Kundenanlage zu Ã¼berprÃ¼fen

### Allgemeine Validierungsregeln

- Das System muss vor der Ãœbernahme einen Konfliktstatus pro Zeile anzeigen, damit der Administrator die Ursache erkennt und die Zeile entweder korrigieren oder ausschlieÃŸen kann
- Das System muss eine Ãœbernahme nur dann erlauben, wenn alle zu Ã¼bernehmenden Zeilen **Pflichtfelder vollstÃ¤ndig** enthalten
- Das System muss jeden Importlauf mit Zeitstempel, Benutzer, Anzahl Ã¼bernommener Zeilen und Anzahl Konflikte protokollieren

## FT 23 Use Cases

### UC 23/01 â€“ Mitarbeiter aus CSV importieren

### **Akteur**

Administrator

### **Ziel**

Der Administrator lÃ¤dt eine CSV-Datei mit Mitarbeiterdaten hoch. Das System importiert die Mitarbeiter und weist auf Duplikate hin, die nicht Ã¼bernommen werden.

### **Vorbedingungen**

- Der Administrator ist angemeldet
- Eine CSV-Datei mit Mitarbeiterdaten liegt vor (Spalten: Vorname, Nachname)
- Der Administrator hat explizit entschieden: "Mitarbeiter-Import"

### **Ablauf**

1. Der Administrator Ã¶ffnet den Import-Bereich und wÃ¤hlt "Mitarbeiter-Import aus CSV"
2. Der Administrator lÃ¤dt die CSV-Datei hoch
3. Das System liest die Datei ein und prÃ¼ft das Format (Spalten: Vorname, Nachname vorhanden?)
4. Das System fÃ¼hrt pro Zeile eine Duplikat-PrÃ¼fung durch: Existiert die Kombination Vorname+Nachname bereits?
5. Das System unterteilt die Zeilen in zwei Gruppen: "Ã¼bernehmbar" und "Duplikat erkannt"
6. Das System importiert alle "Ã¼bernehmbar"-Zeilen in die Mitarbeitertabelle
7. Das System erzeugt einen Import-Report mit:
    - Summe: X Mitarbeiter importiert, Y Duplikate ausgelassen
    - Detail: Auflistung aller Zeilen mit Duplikat-Fehler (Vorname, Nachname, Grund: "Bereits vorhanden")
8. Das System zeigt den Report dem Administrator

### **Alternativen**

- Die CSV ist nicht lesbar oder verletzt das Format (Spalten fehlen) â†’ System bricht ab und zeigt Fehlermeldung, kein Import
- Alle Zeilen sind Duplikate â†’ System importiert nichts, Report zeigt: "0 importiert, X Duplikate"
- Administrator bricht den Upload ab â†’ Kein Import, kein Report

### **Ergebnis**

Neue Mitarbeiter sind in der Mitarbeitertabelle angelegt. Duplikate wurden nicht Ã¼bernommen. Ein Import-Report ist verfÃ¼gbar mit Summe und Fehlerdetails.
