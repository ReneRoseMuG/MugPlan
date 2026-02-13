# 2026-FT21-doc-extract

## Chronologie

1. Vorbedingungen geprueft:
   - `.ai/architecture.md` gelesen
   - `.ai/rules.md` gelesen
2. Git-Schritt 1:
   - `git tag bevor_ft21_doc_extract`
   - `git push origin bevor_ft21_doc_extract`
3. Git-Schritt 2:
   - `git checkout -b refactor/doc_extract`
   - `git push -u origin refactor/doc_extract`
4. Contract-First Erweiterung fuer FT21-Endpunkte in `shared/routes.ts`.
5. Neue FT21-Backendschicht erstellt:
   - Route
   - Controller
   - Processing Service
   - PDF-Text-Extractor
   - AI-Service mit Provider-Interface (Ollama)
   - Extraktionsvalidator
6. Kundennummer-Resolver im Customer-Repositorium/Service ergaenzt.
7. UI-Erweiterung erstellt:
   - FT21 Dropzone-Komponente
   - FT21 Extraktionsdialog
   - Integration in `ProjectForm`
   - Integration in `AppointmentForm`
8. Validierungslauf:
   - `npm run typecheck`
   - `npm run check`
   - `npm run build`
9. Pflichtdokumentation aktualisiert:
   - `.ai/architecture.md`
   - `.ai/implementation.md`

## Architekturentscheidungen

1. FT21 bleibt voll additiv und aendert keine bestehenden Domänenmodelle.
2. KI-Anbindung ueber Provider-Interface, konkreter Provider lokal via Ollama HTTP.
3. Kundennummer ist fuehrender Resolver (`none|single|multiple`), bei `multiple` harter Abbruch.
4. Artikellisten-HTML wird serverseitig semantisch erzeugt und auf `ul/li/strong` begrenzt.
5. Keine Persistierung von Dokumentrohtext, keine Prompt-/Rohtext-Logs.

## Probleme und Loesungen

1. Problem:
   - TypeScript-Target unterstuetzt `matchAll` und Regex-Flag `s` im PDF-Extractor nicht.
2. Loesung:
   - Umstellung auf `RegExp.exec`-basierte Iteration mit kompatiblen Mustern (`[\\s\\S]`).

## Leitplanken-Check

1. Keine Aenderung am Attachment-Modell FT19.
2. Keine Aenderung an Rollenlogik.
3. Keine Aenderung an bestehenden Domänenstrukturen.
4. Keine globalen Layout- oder CSS-Umbauten.
5. Dropbereiche nur in linker breiter Formularspalte integriert.
