# Ungereimtheiten-Bericht

Quelle: Abgleich ausschließlich zwischen `.ai/architecture.md` und `.ai/implementation.md` (ohne Codebezug).

## 1. Identitäts- und Kontextauflösung

1. Typ: `Unklare Formulierung`  
Betroffene Passage: `.ai/architecture.md:441`, `.ai/architecture.md:731`, `.ai/implementation.md:289`, `.ai/implementation.md:291`  
Warum ungereimt: Architekturteil C spricht allgemein von `x-user-role`-Headern in mehreren Workflows; FT(18)-Teile in beiden Dokumenten definieren Rollenauflösung explizit DB-basiert und nicht aus Client-Headern.  
Konsequenz fürs Verständnis: Leser können fälschlich annehmen, das Settings-Feature nutze ebenfalls Header-Rollen.  
Einordnung: `Präzisierung`

2. Typ: `Lücke`  
Betroffene Passage: `.ai/architecture.md:75`, `.ai/architecture.md:269`, `.ai/implementation.md:1-119`  
Warum ungereimt: Architektur behauptet explizit serverseitige blockierende Überschneidungsprüfung bei Mitarbeiterzuweisung; das Implementierungsdokument nennt diesen Punkt nicht konkret als implementierten Mechanismus.  
Konsequenz fürs Verständnis: Unklar, ob das als aktuell verifiziertes Ist-Verhalten oder nur als Leitlinie zu lesen ist.  
Einordnung: `Offene Entscheidung`

## 2. Settings-Konzept

3. Typ: `Lücke`  
Betroffene Passage: `.ai/architecture.md:705-710`, `.ai/implementation.md:231-240`  
Warum ungereimt: Architektur nennt explizit Definition/Metadatenfelder (`key`, `label`, `description`, `type`, `constraints`, `allowedScopes`), Implementierungsdokument listet als "mindestens" nur Wert-/Scope-Felder plus Rollenfelder.  
Konsequenz fürs Verständnis: API-Verbraucher könnten Metadaten als optional missverstehen.  
Einordnung: `Präzisierung`

## 3. Attachments

4. Typ: `Veraltete Aussage`  
Betroffene Passage: `.ai/architecture.md:356`, `.ai/architecture.md:813`, `.ai/implementation.md:445`, `.ai/implementation.md:449-450`  
Warum ungereimt: In `architecture.md` wird `DELETE /api/project-attachments/:id` im Endpunktkatalog neutral geführt, später aber als deaktiviert (`405`) beschrieben; `implementation.md` beschreibt konsistent "Delete blockiert".  
Konsequenz fürs Verständnis: Endpunktliste in `architecture.md` kann als löschfähig fehlinterpretiert werden.  
Einordnung: `Redaktionelle Korrektur`

## 4. UI-Komposition und Datenverträge

5. Typ: `Unklare Formulierung`  
Betroffene Passage: `.ai/architecture.md:547`, `.ai/implementation.md:529-537`  
Warum ungereimt: Architekturteil C5 behauptet fehlende extrahierbare zentrale Query-Key-Sicht außerhalb Kalender; Implementierungsdokument FT(19) nennt konkrete stabile Query-Keys für Attachments.  
Konsequenz fürs Verständnis: Unklar, ob C5 als historischer Stand oder aktueller Stand zu lesen ist.  
Einordnung: `Redaktionelle Korrektur`

## 5. Schichtentrennung und Technikstand

6. Typ: `Veraltete Aussage`  
Betroffene Passage: `.ai/architecture.md:541`, `.ai/implementation.md:25`  
Warum ungereimt: Architekturtext spricht von inkonsistenter DB-Technologie in Quellen; Implementierungsdokument legt MySQL + Drizzle/mysql2 als Ist-Stand fest.  
Konsequenz fürs Verständnis: Architekturtext erzeugt unnötige Unsicherheit über den Persistenzstack.  
Einordnung: `Redaktionelle Korrektur`
