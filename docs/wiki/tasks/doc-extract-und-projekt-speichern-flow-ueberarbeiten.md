# Doc Extract und Projekt-Speichern-Flow überarbeiten

Der Doc-Extract-Workflow und der Projekt-Speichern-Flow sollen fachlich neu geschnitten werden. Ziel ist ein schlanker Importdialog, der erkannte Daten transparent zeigt und Draft-Entscheidungen sammelt, während offene Folgeentscheidungen gebündelt im Projekt-Speichern-Review behandelt werden.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Dialoge | Planung | 13.05.26 |

---

## Ziel

Die Aufgabe beschreibt das Zielbild für Doc Extract, Projektformular, Terminformular und Project Save Review. Der Ablauf soll über die relevanten PDF-Importpfade hinweg einheitlich werden, ohne Dialogketten oder doppelte Abfragen zu erzeugen.

Doc Extract soll Daten erkennen, erklären und als Draft in das jeweilige Formular übernehmen. Das Projektformular beziehungsweise Terminformular hält diesen Draft-Zustand. Der Project Save Review entscheidet anschließend gesammelt über die noch offenen projektbezogenen Speicherpunkte. Erst danach wird gespeichert.

## Ausgangslage

Im Zusammenhang mit Doc Extract und Projekt-Speichern gibt es mehrere Pfade, bei denen Darstellung, Folgeentscheidungen und Verarbeitung der Nutzerentscheidung sauber getrennt werden müssen.

Im Neues-Projekt-Pfad sind diese Varianten relevant:

- Neues Projekt ohne Doc Extract.
- Neues Projekt mit Doc Extract im `project_form`-Scope.
- Neues Projekt mit Doc Extract, danach werden Projektdaten, Artikelliste oder Anmerkungen manuell geändert.
- Neues Projekt mit Doc Extract, bei dem das extrahierte PDF als Draft-Anhang erhalten bleibt und beim Speichern eine PDF-Duplikatentscheidung nötig werden kann.
- Neues Projekt mit aktivierter Reklamation, wodurch beim Speichern eine Reklamationsnotiz vorbereitet werden kann.
- Neues Projekt mit ausgewähltem Sauna-Modell in der Artikelliste, bei dem beim Speichern angeboten wird, den Projekttitel auf das Sauna-Modell zu setzen.

Im Bestandsprojekt-Pfad gibt es keinen Doc-Extract-Startpunkt. Dort können bestehende Projektinformationen, Anmerkungen, Artikelliste, Anhänge, Tags und Notizen bearbeitet werden. Der Reklamationsflow kann im Edit-Modus direkt ausgelöst werden; dabei wird die Reklamation per Mutation gesetzt oder aufgehoben und anschließend die passende Notizfrage geöffnet.

Beim Speichern eines Projekts bündelt der `ProjectSaveReviewDialog` mehrere mögliche Entscheidungen:

- Hinweis auf offene Artikellisten-Auswahlen.
- Entscheidung, ob der Projektname aus dem Sauna-Modell übernommen werden soll.
- Reklamationsnotiz im Create-Speichern-Flow, falls sie nicht bereits im Doc-Extract-Dialog abgeschlossen wurde.
- PDF-Duplikatentscheidung für ein per Doc Extract eingebrachtes Draft-PDF.

## Leitprinzipien

Doc Extract erkennt und befüllt. Das Formular hält den Draft. Der Save Review entscheidet gebündelt. Die Save-Mutation persistiert erst nach Abschluss aller relevanten Entscheidungen.

Daraus folgt:

- Der Doc-Extract-Dialog im neuen Projekt bleibt bewusst schmal.
- Im Doc-Extract-Dialog werden erkannte Daten, Hinweise, Warnungen und die Reklamationsentscheidung gezeigt.
- Reklamation wird im Doc-Extract-Flow als eigene Entscheidung gesammelt, nicht als separate Pop-up-Kette gestartet.
- Wenn der Nutzer im Doc-Extract-Dialog entscheidet, dass das Projekt eine Reklamation ist, wird im nächsten Dialogschritt direkt die Notizfrage gestellt. Bei positiver Antwort wird der Notizeditor mit der Vorlage "Reklamation" direkt im Doc-Extract-Dialog eingeblendet. Dadurch ist dieser Schritt vollständig abgearbeitet und erscheint beim Speichern nicht erneut.
- Manuelle Änderungen nach Doc Extract können betroffene Draft-Entscheidungen wieder öffnen. Beispiel: Wenn Artikelliste oder Projektname nachträglich geändert werden, darf der normale Speichern-Review wieder prüfen.

## Doc-Extract-Pfade

Es gibt drei Hauptpfade, über die ein PDF-Dokument importiert werden kann:

- Aufrufpfad Neuer Kunde: nur Kundendatenextraktion.
- Aufrufpfad Neues Projekt: Kundendatenextraktion plus Projektdatenextraktion.
- Aufrufpfad Neuer Termin: fachlich gleicher Ablauf wie Neues Projekt bis zur Projektanlage; nach dem Projektspeichern wird das Projekt dem Terminformular zugeordnet.

Der Haupt-Workflow soll über alle drei Pfade möglichst gleich ablaufen, gleiche Fehlermeldungen verwenden und gleiche Wahlmöglichkeiten anbieten. Der Unterschied liegt im Zielkontext nach Abschluss.

## Kundendaten-Flow

Das System extrahiert zuerst die Kundendaten. Es sammelt erkannte Felder und stellt diese übersichtlich dar. Nicht erkannte Felder werden als Info hervorgehoben. Auffällige oder fehlerhafte Werte, zum Beispiel eine falsche Postleitzahl, werden als Warnung hervorgehoben. Solche Warnungen dürfen die weitere Verarbeitung nicht abbrechen.

Sinnvolle Dialogaufteilung:

1. Erkennen: erkannte Kundendaten, fehlende Felder und Warnungen zeigen.
2. Auflösen: anzeigen, ob ein neuer Kunde angelegt wird oder ein Bestandskunde anhand der Kundennummer geladen wird.
3. Prüfen: anbieten, das importierte PDF in einem Browser-Tab zu öffnen.

Wenn Kundendaten noch nicht vorhanden sind, informiert das System den Nutzer, dass ein neuer Kunde mit der erkannten Kundennummer angelegt wird.

Wenn Kundendaten vorhanden sind, erkennt das System die vorhandene Kundennummer und informiert den Nutzer, dass dieser Bestandskunde verwendet wird. Bestehende Stammdaten dürfen nicht still überschrieben werden. Wenn der extrahierte Datensatz Werte enthält, die im Bestandskunden noch leer sind, bietet der Dialog per Checkbox an, diese leeren Stammdaten zu ergänzen.

Diese Checkbox ist standardmäßig aktiv. Der Dialog muss deutlich lesbar erklären: Nur bisher leere Felder im bestehenden Kundensatz werden ergänzt; vorhandene Kundendaten bleiben unverändert.

Für Kundendaten ist kein eigener späterer Kunden-Save-Review vorgesehen. Die fachliche Prüfung und Entscheidung findet vollständig im Doc-Extract-Kundenschritt statt. Beim Speichern greifen danach nur noch normale Formularvalidierung, serverseitige Rollenprüfung und serverseitige Datenvalidierung.

## Aufrufpfad Neuer Kunde

Im Kundenformular wird nur die Extraktion von Kundendaten ausgeführt. Der mehrteilige Kundendialog wird vollständig durchlaufen.

Das Resultat ist entweder:

- ein Kundenformular mit den Daten eines neuen Kunden, oder
- ein Kundenformular mit den hinzugeladenen Daten eines Bestandskunden.

## Projektdaten-Flow

Das System sucht Auftragsinhalt, Auftragsnummer, Auftragssumme und weitere Projektdaten. Im Project-Scope wertet Doc Extract die Artikelliste blockweise aus. Der erste relevante Produkt- oder Auftragsblock kann zur Ableitung des Projekttitels verwendet werden. Bei Saunaaufträgen ist das typischerweise das erkannte Sauna-Modell. Bei Reklamationen kann der erste Block entsprechend einen Reklamationsbezug liefern.

Der extrahierte Titel wird als Projektname in den Projekt-Draft übernommen. Wichtig ist, dass in jedem Fall ein erkennbarer Text für den Projekttitel genutzt wird.

Die Artikelliste wird nicht automatisch in strukturierte Produktselektionen überführt. Deshalb soll die bloße Information, ob eine Artikelliste erkannt wurde, im Projektdaten-Dialog nicht als zentrale Nutzerentscheidung transportiert werden. Relevant bleiben echte Projektdaten, erkannte Felder, Lücken und grobe Fehler.

Die erfassten Daten aus dem Hauptbereich werden in einer Vorschau präsentiert, damit der Nutzer bei Bedarf Daten prüfen oder kopieren kann. Das System nennt erkannte Felder, meldet Lücken als Hinweis und grobe Fehler als Fehler, bricht aber nicht ab.

Wenn Projektdaten noch nicht vorhanden sind, informiert das System über das neu anzulegende Projekt und die vorhandenen Daten. Zusätzlich fragt der Dialog deutlich hervorgehoben, ob das Projekt eine Reklamation ist. Wenn die Reklamation aktiviert wird, folgt im nächsten Dialogschritt die Frage, ob eine Reklamationsnotiz vorbereitet werden soll. Bei positiver Antwort wird der Notizeditor direkt im Doc-Extract-Dialog mit der Vorlage "Reklamation" eingeblendet. Außerdem fragt der Dialog, ob der Inhalt des Auftrags in den Bereich Anmerkungen übernommen werden soll.

Wenn Projektdaten bereits vorhanden sind, lädt das System die vorhandenen Daten in das Formular. Bestehende Duplikat- und Konfliktpfade bleiben erhalten.

## Aufrufpfad Neues Projekt

Im neuen Projekt wird zuerst die Extraktion der Kundendaten ausgeführt. Danach wird derselbe Dialogpfad um den Projekt-Extract-Flow erweitert.

Die Möglichkeit, das PDF in einem Browser-Tab zu öffnen, wandert in den letzten Schritt dieses Formularpfades.

Wurde im Extract-Flow die Entscheidung zu Reklamation positiv getroffen, wird die Reklamation im Projektformular als Draft geführt. Die optionale Reklamationsnotiz ist dann ebenfalls bereits entschieden und bei positiver Antwort als Notiz-Draft vorbereitet. Die Funktion "Reklamation melden" darf danach nicht mehr als aktive zweite Auslösung erscheinen, weil die Entscheidung bereits im Draft enthalten ist.

## Aufrufpfad Neuer Termin

Im Terminformular läuft der Doc-Extract-Pfad bis zur Projektanlage fachlich gleich wie im neuen Projekt. Kundendaten, Projektdaten, Reklamationsentscheidung, Anmerkungsübernahme und PDF-Draft werden nach denselben Regeln behandelt.

Der Unterschied liegt erst im Abschluss:

- Nach dem Speichern des Projekts wird das Projekt dem Terminformular zugeordnet.
- Der Nutzer landet danach wieder im Terminformular.
- Projektbezogene Entscheidungen sind zu diesem Zeitpunkt erledigt; terminbezogene Entscheidungen bleiben im Terminformular beziehungsweise im Termin-Save-Review.
- Wenn der Nutzer die Reklamationsentscheidung im Doc-Extract-Flow positiv getroffen hat, darf der Reklamationsbutton im Terminformular nicht stumm deaktiviert wirken. Das Formular muss klar zeigen, dass das zugeordnete Projekt bereits als Reklamation gekennzeichnet ist, und bei Klick eine verständliche Reaktion anbieten.

## Terminformular-Entscheidungen

Nicht jede Entscheidung aus dem Termin-Kontext gehört in den Doc-Extract-Dialog oder in den Project Save Review. Terminbezogene Entscheidungen werden nach Zeitpunkt und fachlicher Wirkung verteilt.

Sofort im Terminformular werden Aktionen behandelt, bei denen der Nutzer direkt eine Reaktion erwartet:

- Reklamation melden.
- Termin stornieren.
- Tourwechsel, wenn daraus unmittelbar eine Wochenplan- oder Ressourcen-Vorschau entsteht.

In den Termin-Save-Review gehören Entscheidungen, die erst beim Speichern relevant werden:

- Ohne Mitarbeiter speichern.
- Mitarbeiter- oder Ressourcenkonflikte durch Tour, Datum, Kalenderwoche, Uhrzeit oder manuelle Mitarbeiteränderung.
- Hinweise, dass geplante Wochenplan-Mitarbeiter wegen Konflikten nicht übernommen werden können.
- Finale Bestätigung von Termin-Draft-Zuständen, soweit sie nicht bereits durch eine Sofortaktion vollständig entschieden wurden.

Damit ersetzt der Termin-Save-Review den bisherigen Einzel-Dialog "Ohne Mitarbeiter speichern?". Diese Frage soll als eigener Step im Speichern-Review erscheinen und nicht mehr als separater Alert-Dialog.

Ressourcen- und Mitarbeiterkonflikte bleiben zusätzlich serverseitig abgesichert. Auch wenn ein Mitarbeiter im Dialog zunächst konfliktfrei wirkt, kann ein anderer Admin oder Disponent denselben Mitarbeiter während der Bearbeitung anderweitig verplanen. In diesem Fall blockiert die serverseitige Terminmutation weiterhin mit einem Konflikt und nennt die betroffenen Mitarbeiter.

## Reklamation im Terminformular

Der Reklamationsbutton im Terminformular ist eine explizite Nutzeraktion und muss sofort reagieren. Diese Entscheidung darf nicht erst still in einen späteren Save-Review verschoben werden.

Empfohlener Ablauf:

1. Der Nutzer klickt "Reklamation melden" im Terminformular.
2. Das Formular öffnet sofort einen Reklamationsschritt oder einen Inline-Bereich.
3. Das System fragt, ob eine Reklamationsnotiz vorbereitet werden soll.
4. Bei positiver Antwort wird der Notizeditor direkt mit der Vorlage "Reklamation" geöffnet.
5. Bei einem neuen Termin wird das Ergebnis als Termin-Draft gehalten. Bei einem bestehenden Termin wird die Reklamation direkt per Mutation gesetzt.
6. Beim späteren Speichern wird diese Reklamationsentscheidung nicht erneut abgefragt.

Wenn das zugeordnete Projekt bereits als Reklamation markiert ist, der Termin aber noch nicht, soll der Button nicht einfach deaktiviert werden. Stattdessen braucht es eine klare Rückmeldung, zum Beispiel: "Das Projekt ist bereits als Reklamation markiert. Soll auch der Termin als Reklamation markiert werden?" Der Nutzer kann dann bewusst entscheiden, ob die Reklamation zusätzlich am Termin geführt werden soll.

Wenn der Termin selbst bereits als Reklamation markiert ist, wird die Funktion als Status beziehungsweise als vorhandene Reklamation dargestellt. Eine erneute Auslösung ist dann nicht nötig; eine mögliche Entfernung folgt dem bestehenden Reklamations-Entfernungsflow.

## Project Save Review

Der `ProjectSaveReviewDialog` wird der zentrale Mehrschritt-Dialog für offene Speicherentscheidungen.

Er sammelt je nach Zustand diese Schritte:

1. Artikelliste: Gibt es offene oder nachträglich geänderte Artikellisten-Auswahlen?
2. Projektname: Weicht der aus Artikelliste oder erstem Block erkannte Projekttitel vom aktuellen Projektnamen ab?
3. Reklamation: Ist Reklamation außerhalb des Doc-Extract-Dialogs als Draft aktiv und soll eine Notiz aus der Vorlage vorbereitet werden?
4. PDF-Duplikat: Existiert das per Doc Extract eingebrachte PDF bereits als Datei?
5. Speichern: Erst nach den Entscheidungen wird die Mutation ausgeführt.

Die Titelanpassung auf ein Sauna-Modell oder einen erkannten ersten Block darf nicht während Doc Extract stattfinden. Beim Speichern prüft das System, ob der erkannte Projekttitel vom aktuellen Projektnamen abweicht. Wenn ja, wird dies im Speichern-Review als eigener Schritt angezeigt und kann bestätigt oder abgelehnt werden.

Ein Kunden-Save-Review ist nicht geplant. Kundendaten werden im Doc-Extract-Dialog geprüft, aufgelöst und entschieden. Der Project Save Review bleibt für projektbezogene Speicherentscheidungen zuständig.

Der Project Save Review übernimmt keine terminbezogenen Mitarbeiter- oder Ressourcenentscheidungen. Diese gehören in den Termin-Save-Review.

## Abgrenzungen

- Bestandsprojekte erhalten keinen neuen Doc-Extract-Startpunkt.
- Die Artikelliste wird durch Doc Extract weiterhin nicht automatisch in Produktselektionen überführt.
- Eine fehlende oder nicht transportierte Artikelliste ist kein Abbruchgrund.
- Bestehende Kunden werden nicht still überschrieben.
- Bestehende Duplikatpfade für Auftragsnummern bleiben erhalten.
- Terminbezogene Mitarbeiter- und Ressourcenentscheidungen werden nicht in den Project Save Review verschoben.
- Keine DB-Migration ist Teil dieser Planungsaufgabe.

## Rollen und Sicherheitsgrenzen

Die Aufgabe selbst ändert keine Rollenlogik. Die spätere Umsetzung muss die bestehenden Grenzen ausdrücklich einhalten:

- ADMIN und DISPONENT dürfen Kunden, Projekte und Termine anlegen.
- LESER dürfen diese Mutationen weder über die UI noch über direkte API-Aufrufe ausführen.
- UI-Deaktivierung oder Ausblendung reicht nicht als Berechtigungsdurchsetzung.
- Serverguards für Kundenanlage, Projektanlage, Terminzuordnung, Projektänderung, Notizen und Anhänge bleiben maßgeblich.

## Erwartete Umsetzungshinweise

Relevante Einstiegspunkte:

- `client/src/components/DocumentExtractionDialog.tsx`
- `client/src/components/ProjectDocumentExtractionWorkflowDialog.tsx`
- `client/src/components/ProjectSaveReviewDialog.tsx`
- `client/src/components/ProjectForm.tsx`
- `client/src/components/AppointmentForm.tsx`
- `client/src/components/TourEmployeeCascadeDialog.tsx`
- `client/src/components/CustomerData.tsx`
- `server/services/documentProcessingService.ts`
- `server/services/documentHeaderDeterministicParser.ts`
- `server/services/extractionValidator.ts`
- `server/controllers/customersController.ts`
- `server/controllers/projectsController.ts`
- `server/controllers/appointmentsController.ts`

Die Umsetzung soll möglichst gemeinsame Unterkomponenten für Kundendaten, Mängelhinweise, Projektdatenvorschau und PDF-Öffnen verwenden. Projekt- und Terminpfad sollen fachlich denselben Doc-Extract-Workflow nutzen; nur der Zielkontext nach dem Speichern unterscheidet sich.

## Erwartete Tests

- Unit-Tests für Draft-Entscheidungslogik: Doc Extract befüllt, Save Review entscheidet, Save persistiert.
- Unit-Tests für Kundendatenauflösung: neuer Kunde, bestehender Kunde, standardmäßig aktive Stammdaten-Ergänzung per Checkbox, deutlicher Infotext, keine stille Überschreibung.
- Unit-Tests für Project Save Review: Artikelliste, Projekttitel, Reklamation außerhalb des abgeschlossenen Doc-Extract-Pfads, PDF-Duplikat und Kombinationen ohne doppelte Dialoge.
- Unit-Tests für Termin-Save-Review: Ohne-Mitarbeiter-Step, Ressourcen-Konflikt-Step, Kombination mit Termin-Draft-Zuständen ohne separaten Alert-Dialog.
- Render-Tests für Doc-Extract-Dialoge in Kunden-, Projekt- und Terminpfad.
- Render-Tests für den Termin-Reklamationspfad: Projekt bereits Reklamation, Termin noch nicht Reklamation, Termin bereits Reklamation.
- Browser-E2E Neuer Kunde: PDF importieren, Kundendaten prüfen, neuen oder bestehenden Kunden ins Formular übernehmen.
- Browser-E2E Neues Projekt: PDF importieren, Kunde auflösen, Projektdaten übernehmen, Reklamation entscheiden, Notizfrage im Doc-Extract-Dialog beantworten, Notizeditor im Doc-Extract-Dialog verwenden, Save Review öffnen und speichern.
- Browser-E2E Neuer Termin: gleicher Doc-Extract-Flow wie neues Projekt, Projekt speichern, Projekt dem Termin zuordnen, Reklamationsstatus im Terminformular verständlich anzeigen.
- Browser-E2E Termin-Save-Review: Ohne Mitarbeiter speichern als Step im Save-Review, kein separater Alert-Dialog.
- Browser-E2E Termin-Save-Review: Ressourcen- oder Mitarbeiterkonflikt wird vor dem Speichern im Review sichtbar; parallele Änderungen werden serverseitig weiterhin blockiert.
- Browser-E2E manuelle Änderung nach Doc Extract: geänderte Projektdaten oder Artikelliste öffnen die passenden Save-Review-Fragen wieder.
- Browser-E2E Leser: keine Erstellpfade und direkte API-Versuche bleiben serverseitig verboten.

## Festgelegte Entscheidungen

- Die Checkbox zur Ergänzung leerer Bestandskunden-Stammdaten ist standardmäßig aktiv und erhält einen deutlichen Infotext, dass nur leere Felder ergänzt und vorhandene Werte nicht überschrieben werden.
- Wenn Reklamation im Doc-Extract-Dialog positiv entschieden wird, wird die Notizfrage im nächsten Dialogschritt gestellt. Bei positiver Antwort wird der vorbefüllte Notizeditor direkt im Doc-Extract-Dialog eingeblendet.
- Für Kundendaten gibt es keinen separaten Kunden-Save-Review; der Kundenteil wird im Doc-Extract-Dialog vollständig entschieden.
- "Ohne Mitarbeiter speichern?" ist eine Termin-Save-Review-Entscheidung und kein separater Alert-Dialog.
- Reklamation im Terminformular bleibt eine Sofortaktion mit direkter Reaktion. Ein bereits als Reklamation markiertes Projekt führt nicht zu einem stummen deaktivierten Button, sondern zu klarer Status- oder Entscheidungsanzeige.

## Blocker und offene Fragen

- Keine bekannt.

---

## Beziehungen

- Projekt: [Dialog-Rollout](../projects/dialog-rollout.md)
- Features: [FT-02 - Projekte](../features/ft-02-projekte/ft-02-projekte.md) · [FT-21 - Dokumentenextraktion](../features/ft-21-dokumentenextraktion/ft-21-dokumentenextraktion.md)
- Use Cases: UC 21/05 · UC 21/07 · UC 21/09 · UC 21/10 · UC 21/17
- Weitere Bezüge: [Projekte- und Dokumentextraktion-Dialoge](projekte-und-dokumentextraktion-dialoge.md) · [Projekt-Speichern-Dialog für Artikellistenprüfung und Saunatitel](projekt-speichern-dialog-artikelliste-saunatitel.md) · [Dialog-Rollout-Masterplan](dialog-rollout-masterplan.md)
