# Standardauftrag: Redaktions-Synchronisation von architecture.md und implementation.md

## 1. Ziel dieses Auftrags

Dieser Auftrag dient ausschließlich der redaktionellen Synchronisation der Dateien:

- `.ai/architecture.md`
- `.ai/implementation.md`

mit dem aktuellen Stand der Codebasis.

Wichtige Grundregel: Diese beiden Dateien sind reine Dokumentationen der bestehenden Implementierung. Sie folgen dem Code – nicht umgekehrt. Der Code ist die maßgebliche Realität. Die Dokumentation darf den Code beschreiben, erklären und strukturieren, aber niemals implizit Anforderungen an den Code erzeugen oder Änderungen am Code auslösen.

Es handelt sich um einen **rein dokumentarischen Auftrag**. Es dürfen keinerlei Änderungen an Produktivcode, Tests, Konfiguration, Datenbank, Build-Skripten oder Projektstruktur vorgenommen werden.

---

## 2. Verbindliche Vorbedingung

Zu Beginn der Ausführung sind zwingend vollständig zu lesen:

- `.ai/architecture.md`
- `.ai/rules.md`
- `.ai/implementation.md`

Das Lesen ist im Ausführungsprotokoll explizit zu bestätigen (z. B. „architecture.md und rules.md gelesen und verstanden“).

---

## 3. Erlaubter Änderungsumfang

Codex darf ausschließlich:

- Dokumentationslücken schließen
- veraltete Beschreibungen korrigieren
- neue Endpunkte, Services oder Module dokumentieren
- Inkonsistenzen zwischen Architektur und Code klarstellen
- fehlende Kapitel ergänzen
- Abschnittsüberschriften präzisieren
- textliche Unklarheiten sprachlich verbessern

Codex darf ausdrücklich **nicht**:

- Fachlogik ändern
- Refactorings durchführen
- APIs anpassen
- Dateien verschieben
- Datenbankschema verändern
- Tests erzeugen oder anpassen
- "Verbesserungen" am Code vornehmen
- Architekturentscheidungen eigenständig treffen
- bestehende Strukturprinzipien verändern

Wenn Codex feststellt, dass Architektur und Code auseinanderlaufen, darf dies ausschließlich dokumentiert werden. Eine technische Korrektur ist nicht zulässig.

---

## 4. Prüfstruktur

Die Synchronisation erfolgt systematisch in folgenden Schritten:

### 4.1 Architekturabgleich

Abgleich von `architecture.md` mit der realen Codebasis hinsichtlich:

- Modulstruktur
- Schichtenmodell (Route → Controller → Service → Repository)
- Rollen- und Berechtigungsmodell
- Server-State-Handling
- Persistenzmodell
- Scheduler oder Hintergrundprozessen
- Filter- und Sichtbarkeitsregeln

### 4.2 Implementationsabgleich

Abgleich von `implementation.md` mit der tatsächlichen Implementierung:

- existierende Endpunkte
- implementierte Services
- Middleware und Guards
- serverseitige Filter
- Resolver-Logiken
- Besonderheiten im Error-Handling

### 4.3 Abweichungsbehandlung

- Ist der Code neuer als die Dokumentation → Dokumentation aktualisieren.
- Ist die Dokumentation neuer als der Code → als „noch nicht implementiert“ kennzeichnen.

Es dürfen keine stillen technischen Anpassungen erfolgen.

---

## 5. Änderungsprotokoll

Am Ende der Bearbeitung ist ein kurzes, sachliches Änderungsprotokoll zu ergänzen mit:

- Welche Abschnitte wurden angepasst
- Welche strukturellen Ergänzungen vorgenommen wurden
- Welche dokumentierten Abweichungen festgestellt wurden

Keine inhaltliche Selbstbewertung, nur sachliche Dokumentation.

---

# Verbindlicher Abschlussabschnitt in implementation.md

Der folgende Abschnitt muss dauerhaft am Ende der Datei `implementation.md` stehen.

Er darf nicht entfernt, verschoben oder strukturell verändert werden. Er darf ausschließlich fachlich ergänzt werden, wenn neue Entitäten oder Rollenregeln hinzukommen.

---

## Sichtbarkeit von Daten (Rollenabhängige Filter)

Dieser Abschnitt beschreibt ausschließlich, welche Rollen welche Daten serverseitig erhalten.

Sichtbarkeitsregeln werden serverseitig durchgesetzt. UI-Filter ersetzen keine Backend-Prüfung.

### Disponent

- erhält nur `is_active = true` bei:
  - Mitarbeiter
  - Kunden
  - Projektstatus
- sieht deaktivierte Einträge nur, wenn sie historisch referenziert sind
- erhält keine inaktiven Stammdateneinträge in Auswahlendpunkten

### Admin

- erhält aktive und inaktive Einträge
- kann Aktiv-Status ändern
- kann archivierte Einträge einsehen

### Leser

- erhält ausschließlich lesenden Zugriff
- keine schreibenden Endpunkte verfügbar

---

## Schutzregel

Dieser Abschnitt ist ein dauerhaft verbindlicher Bestandteil der Implementation-Dokumentation und muss stets am Ende der Datei stehen.

Er darf nicht entfernt, in andere Kapitel verschoben oder in seiner grundsätzlichen Struktur aufgelöst werden.

Er muss jedoch inhaltlich aktuell gehalten werden. Wenn sich serverseitige Sichtbarkeitsregeln, Rollenlogik oder Filtermechanismen ändern, sind diese Änderungen hier präzise und vollständig zu dokumentieren.

Zulässig sind:
- fachliche Ergänzungen bei neuen Entitäten
- Anpassungen bestehender Rollenregeln
- Präzisierungen bei geänderter Filterlogik

Nicht zulässig sind:
- strukturelle Auflösung des Abschnitts
- Integration in andere Kapitel
- Entfernung des Abschnitts

Der Abschnitt dient als autoritative Referenz für serverseitige Sichtbarkeitsregeln im Multi-User-System.

