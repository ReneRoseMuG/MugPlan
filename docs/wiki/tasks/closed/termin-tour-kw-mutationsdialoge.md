# Termin- und Tour-KW-Mutationsdialoge vereinheitlichen

Alle Termin- und Tour-KW-bezogenen Mutationspfade, die Konflikte auslösen können oder eine Entscheidung des Benutzers erfordern, sollen systematisch erfasst und auf eine einheitliche Dialogstruktur ausgerichtet werden. Das Ergebnis soll ein konsistenter Dialogansatz sein, der vor einer Aktion verständlich über Konflikte, Konsequenzen und verfügbare Optionen informiert. Terminänderungen können über unterschiedliche Pfade ausgelöst werden, etwa durch Verschieben in Kalenderansichten, Tourwechsel, Cut & Insert, Mark &.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `abgeschlossen` | Hoch | Dialoge | Analyse | 07.05.26 |

---

## Ziel

Alle Termin- und Tour-KW-bezogenen Mutationspfade, die Konflikte auslösen können oder eine Entscheidung des Benutzers erfordern, sollen systematisch erfasst und auf eine einheitliche Dialogstruktur ausgerichtet werden. Das Ergebnis soll ein konsistenter Dialogansatz sein, der vor einer Aktion verständlich über Konflikte, Konsequenzen und verfügbare Optionen informiert.

## Ausgangslage

Terminänderungen können über unterschiedliche Pfade ausgelöst werden, etwa durch Verschieben in Kalenderansichten, Tourwechsel, Cut & Insert, Mark & Insert, Änderungen auf Tour-KW-Ebene oder Formularaktionen. Diese Pfade können fachlich dieselben Konflikte auslösen, aber heute unterschiedlich sichtbar machen oder bestätigen lassen. Zusätzlich können an Terminen Notizen hängen. Diese Notizen können datumbezogene Informationen enthalten und müssen deshalb bei Terminmutationen als eigener fachlicher Prüfpunkt betrachtet werden.

## Umfang

- Zur Aufgabe gehören:
- alle Terminmutationen identifizieren, die Datum, Uhrzeit, Tour, Tour-KW, Mitarbeiterzuweisungen oder Kalenderzuordnung verändern
- alle Tour-KW-Mutationen identifizieren, die Termine mittelbar verändern oder Mitarbeiterzuweisungen an Terminen beeinflussen
- je Pfad prüfen, welche Konflikte auftreten können
- je Pfad prüfen, welche Benutzerentscheidung erforderlich ist
- vorhandene Konfliktprüfungen, Meldungen und Optionen erfassen
- Lücken zwischen Vorschau, Dialog, finalem Save und serverseitigem Re-Check benennen
- Notizen am Termin als eigenen Prüfpunkt aufnehmen, insbesondere bei datumbezogenen Inhalten
- eine einheitliche Dialogstruktur für Information, Konfliktanzeige, auswählbare Optionen, Bestätigung, Abbruch und Fehlerfall vorbereiten
- Nicht Teil der Aufgabe ist die sofortige Umsetzung aller gefundenen Dialoge. Diese Aufgabe darf nach der Analyse in kleinere Implementierungsaufgaben aufgeteilt werden.

## Umsetzungshinweise

- FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente und FT-04 mehrstufiger Tour-KW-Dialog bilden die thematische Grundlage für die Dialogstruktur.
- Die abgeschlossenen Vorarbeiten zu Drag & Drop und Mark & Insert müssen als relevante Mutationspfade berücksichtigt werden.
- Zu prüfen sind insbesondere Kalender-Move, Cut & Insert, Mark & Insert, Tourwechsel, Terminformular-Save, Projekt-/Terminpfade mit Workflow-Folgen, Tour-KW-Mitarbeiterzuweisung und Tour-KW-Änderungen mit Auswirkung auf Termine.
- Konflikte müssen sowohl aus Sicht des Zieltermins als auch aus Sicht der betroffenen Ressourcen betrachtet werden.
- Dialoge dürfen keine serverseitigen Rollen-, Sperr-, Lock- oder Konfliktregeln ersetzen.
- Betroffene Rollen sind mindestens `ADMIN`, `DISPONENT` und `READER`.
- Erlaubte Aktionen:
- `ADMIN` und `DISPONENT` dürfen Termin- und Tour-KW-Mutationen nur im Rahmen der bestehenden serverseitigen Regeln ausführen.
- `READER` darf keine schreibenden Mutationen ausführen.
- Die Analyse muss ausdrücklich prüfen, ob direkte API-Aufrufe, bereits geöffnete Ansichten, Deep Links, parallele Bearbeitung und historische Sperren weiterhin serverseitig abgesichert sind.

## Blocker und offene Fragen

- Ohne vollständige Pfadanalyse darf keine einheitliche Dialogregel als abgeschlossen betrachtet werden.
- Unklar ist fachlich zu klären, welche Arten von Terminnotizen bei Datumsmutationen aktiv erwähnt, bestätigt oder gesondert behandelt werden müssen.
- Falls bestehende Konfliktprüfungen fachlich unterschiedlich ausgelegt sind, darf Codex diese Unterschiede nicht ohne Rücksprache vereinheitlichen.

---

## Abschluss 11.05.26

Die Analyse ist abgeschlossen und in die Ressourcenplanungsumsetzung eingeflossen. Die geprüften Pfade umfassen Tour-KW-Mitarbeiter hinzufügen und entfernen, Tour-KW-Multiselect, Termin-Tourwechsel, Termin-KW-Wechsel, reine Terminzeit- und Datumsverschiebungen, Kalender-Drag-&-Drop, Markieren und Einfügen, direkte Termin-Mitarbeiteraktionen, Tour-KW-Sperren und Abwesenheitskonflikte.

Die Pfade nutzen nun soweit fachlich passend denselben Ressourcenplanungsdialog. Bekannte Fachgrenzen bleiben erhalten: Projekt- oder Kundenzuordnung für Termine, blockierende Mitarbeiterüberschneidungen, historische Sperren, Tour-KW-Schreibregeln und serverseitige Rollenprüfung.

### Verifikation

- `npm run check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`
- gezielte Browser-E2E für Terminformular, Kalenderbewegungen, Wochenkalender, Tour-KW und Abwesenheiten
- `git diff --check`

## Beziehungen

- Features: FT-01 Kalendertermine · FT-03 Kalenderansichten · FT-04 Tourenplanung
- Use Cases: UC 01/03 - Termin verschieben · UC 01/05 - Tour einem Termin zuweisen · UC 01/15 - Optimistic Locking bei paralleler Bearbeitung · UC 04/13 - Mitarbeiter einer Tour-KW zuordnen
- Entscheidungen: —
- Journal: [P01 Ressourcenplanung-Dialoge abgeschlossen](../../journal/11-05-26-p01-ressourcenplanung-dialoge-abgeschlossen.md)
- Weitere Bezüge: [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [FT-04 Multiselect für KW-Planung im Wochenkalender](ft04-multiselect-kw-planung-wochenkalender.md) · [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](mitarbeiter-auswahl-dialogstruktur.md) · FT-03/FT-04 Tourwechsel per Drag & Drop im Wochenkalender · FT-03 Termin markieren und per Einfügen verschieben
