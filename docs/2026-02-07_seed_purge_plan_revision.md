# Plan-Revision: Dokumentbasis und Konventionen (bereinigt)

## Kurzüberblick
Der Seed/Purge-Plan wird auf die realen Leitdokumente unter `.ai/` ausgerichtet. Alle abweichenden oder hypothetischen Pfadverweise werden vermieden. Die Umsetzung startet verbindlich mit einer Konventionsableitung aus den nachfolgenden Quellen.

## Verbindliche Dokumentbasis (Phase 0)
1. `.ai/templates/generic task.md` als Orchestrator-Auftragsrahmen.
2. `.ai/architecture.md` für Schichtenmodell, Routing- und Datenflussprinzipien.
3. `.ai/implementation.md` für Engineering-Konventionen und konkrete Arbeitsmuster.
4. `.ai/mugplan_features.md` für fachliche Invarianten (Termin/Projekt/Mitarbeiter).

## Abgeleitete Konventionen für die Umsetzung
1. Backend-Schichten strikt: Route -> Controller -> Service -> Repository.
2. Contract-first strikt: Endpunkte zuerst in `shared/routes.ts`, danach Route-Registrierung in `server/routes/*Routes.ts`.
3. Controller-Regel: JSON über Contract-Parse, Multipart als definierter Sonderfall mit Parser/Limits.
4. Attachment/Storage-Regel: bestehende Upload-/Download-Pfade wiederverwenden (`server/lib/attachmentFiles.ts`, `server/lib/attachmentDownload.ts`, bestehende Attachment-Controller/Services).
5. Frontend-Regel: React Query als Server-State-Quelle, Mutationen mit gezielter Invalidation.
6. Namensgebung: bestehende Modulstruktur und Benennungen beibehalten (`*Routes.ts`, `*Controller.ts`, `*Service.ts`, `*Repository.ts`, `*Page.tsx`, `*Panel.tsx`).

## Referenzbereinigung im Seed/Purge-Kontext
1. Leitdokument-Verweise außerhalb `.ai/` werden nicht verwendet.
2. Hypothetische Leitdokument-Pfade wie `/mnt/data/*` werden nicht verwendet.
3. Für Plan- und Umsetzungsentscheidungen gelten ausschließlich die vier genannten `.ai/`-Dokumente.

## Konsequenz für die weitere Implementierung
1. Jeder Implementierungsschritt im Seed/Purge-Feature referenziert nur die vier oben genannten `.ai/`-Leitdokumente.
2. Strukturentscheidungen werden ausschließlich an den dort beschriebenen Mustern ausgerichtet.
3. Es werden keine freien Architekturentscheidungen außerhalb dieser Fundstellen getroffen.

## Annahmen und Defaults
1. Orchestrator-Quelle im Repo ist `.ai/templates/generic task.md`.
2. Architektur-/Implementation-Quelle sind `.ai/architecture.md` und `.ai/implementation.md`.
3. Fachregeln stammen aus `.ai/mugplan_features.md`.
