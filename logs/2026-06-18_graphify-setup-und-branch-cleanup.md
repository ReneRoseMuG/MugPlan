# Log 18.06.26 — graphify-Wissensgraph, Auto-Rebuild-Hook, work-Merge & Branch-Cleanup

## Zweck
graphify-Wissensgraph für das Repository gebaut, automatischen Rebuild nach jeder Code-Änderung aktiviert, den Arbeitsbranch in `work` integriert und die lokalen Branches aufgeräumt. Zusätzlich vorab die offene Browser-E2E-Änderung gesichert.

## Scope
- Commit + Push der Browser-E2E testId-Anpassung (`employee-remove-cascade`); bewusster Ausschluss einer secret-haltigen gitleaks-Report-Datei aus dem Commit.
- graphify-Build für das Repo (Umfang bewusst eingegrenzt: Produktionscode + Tests, **ohne** `docs/` und `logs/`).
- Aktivierung des bereits vorhandenen graphify-Auto-Rebuild-Hooks.
- Fast-Forward-Merge `tkt-90-kw-berechnungen` → `work` + Push.
- Löschung aller lokalen Branches außer `work` und `main`.

## Technische Entscheidungen
- **Korpus-Eingrenzung:** Build auf Code-Ordner (client, server, shared, tests, migrations, script, scripts + Kern-Root-Configs). `docs/` ist zu ~99 % generiertes Wiki-HTML + Wiki-Quellen, `logs/` sind Session-Logs — beides für einen Code-Graphen Ballast und teuer (semantische LLM-Extraktion). Ergebnis: reiner AST-Build, **0 LLM-Token**.
- **`shared/` bewusst aufgenommen** (DB-Schema `schema.ts`, `routes.ts`, geteilte Contracts) — sonst fehlte das Datenmodell im Graphen.
- **Windows-Fix Multiprocessing:** `graphify.extract` nutzt `spawn`; Ausführung über stdin (`python -`) scheiterte (`<stdin>` nicht re-importierbar). Lösung: Schritte als `.py`-Datei mit `if __name__ == "__main__"`-Guard ausführen.
- **`graphify-out/.graphify_python` auf Forward-Slash ohne BOM normalisiert**, weil die Interpreter-Allowlist des Hooks Backslash/BOM-Pfade ablehnt (sonst stiller No-Op).
- **Auto-Rebuild via `git config core.hooksPath .githooks`** (lokal, reversibel) statt frischer Hook-Installation — der Projekt-Hook `.githooks/post-commit` existierte bereits, war aber dormant (core.hooksPath ungesetzt).
- **Korruptes `.git/ORIG_HEAD`** (41 NUL-Bytes, 17.06.) entfernt; blockierte den Merge. HEAD/Branches unberührt.
- **Merge als `--ff-only`** (work war 0/9 zu tkt-90 → sauberer Fast-Forward, kein Merge-Commit).
- **Branch-Löschung:** `-d` für in `work` gemergte Branches; `-D` (forciert) nur nach ausdrücklicher Nutzer-Freigabe für die zwei ungesicherten `fix-*`-Branches.

## Betroffene Dateien / Artefakte
- `graphify-out/` (gitignored): `graph.json` (8.822 Knoten, 21.423 Kanten), `graph.html` (aggregiert: 351 Communities), `GRAPH_REPORT.md`, `manifest.json`, `.graphify_python`.
- `.git/config`: `core.hooksPath=.githooks` (lokal gesetzt).
- Commit `2e76b05b` (`tests/e2e-browser/tour-week-planning.employee-remove-cascade.browser.e2e.spec.ts`) — gepusht, jetzt in `work`/`origin/work`.
- Gelöschte Branches: `tkt-90-kw-berechnungen`, `uc-258-kw-sammelverschiebung`, `fix-ft04-cascade-add-concurrency` (`e1e4245d`), `fix-month-sheet-navigation-e2e` (`3d7e7709`).

## Hinweise zum Testen
- Nächster `git commit` löst einen **Hintergrund-Rebuild** aus (Log: `~/.cache/graphify-rebuild.log`); einmalig überspringbar mit `GRAPHIFY_SKIP_HOOK=1`, Branch-Wechsel triggert ebenfalls Rebuild (verifiziert beim Checkout auf `work`).
- Codebase-Fragen ab jetzt über `graphify query/explain/path` statt Datei-Grep.
- Kein `npm`-Audit/-Testlauf durchgeführt (nicht beauftragt; reine Setup-/Git-Arbeit).

## Bekannte Einschränkungen
- Die forciert gelöschten Commits (`e1e4245d` FT04-Deadlock-Fix, `3d7e7709` Monatskalender-Test) sind nur noch via `git fsck --lost-found` bis zur nächsten `git gc` (~2 Wochen) wiederherstellbar.
- Ein voller `/graphify`-Lauf überschreibt `.graphify_python` wieder mit Backslash + BOM → Hook bricht bis zur Re-Normalisierung. Commit-getriebene Rebuilds tun das nicht.
- Der Graph deckt nur Code + Tests ab; `docs/` und `logs/` sind nicht enthalten.
- Gefundener Import-Zyklus `TourPostalPlanView → calendar/TourPostalPlanWeekPreview → calendar/CalendarWeekView → pages/Home → TourPostalPlanView` wurde nur dokumentiert, nicht behoben (kein Auftrag).
