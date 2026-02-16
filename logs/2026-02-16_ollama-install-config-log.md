# Ollama Installation und Konfiguration – 2026-02-16

## Ziel
Lokale KI fuer Document Extract betriebsbereit machen und Konfiguration im Projekt setzen.

## Durchgefuehrte Schritte
1. Pruefung der Umgebung:
- `ollama --version` war initial nicht verfuegbar (`CommandNotFound` in aktueller Shell).
- Ollama API war erreichbar unter `http://127.0.0.1:11434`, aber ohne Modelle (`models: 0`).

2. Modellbereitstellung ueber Ollama API:
- Pull ausgefuehrt: `llama3.1:8b` via `POST /api/pull` (streaming).
- Pull erfolgreich abgeschlossen (`success`).

3. Verifikation Runtime:
- `GET /api/tags` zeigt Modell `llama3.1:8b`.
- `npm run check:ollama` ist gruen:
  - `Ollama ready at http://127.0.0.1:11434 with model llama3.1:8b`

4. Projekt-Konfiguration gesetzt:
- `.env` erweitert um:
  - `DOC_EXTRACT_PROVIDER=ollama`
  - `DOC_EXTRACT_OLLAMA_BASE_URL=http://127.0.0.1:11434`
  - `DOC_EXTRACT_OLLAMA_MODEL=llama3.1:8b`
- `.env.test` analog erweitert.

## Aktueller Status
- App-seitige Voraussetzung (Ollama + Modell) ist jetzt vorhanden.
- Preflight ist gruen.

## Teststatus
- `npm run test:extraction:live` wurde gestartet.
- Ergebnis: 4 rote Tests, jedoch **nicht** wegen fehlender KI mehr, sondern wegen `Test timed out in 5000ms`.
- Schlussfolgerung: Runtime-Problem geloest, verbleibend ist ein Test-Timeout-Thema in den Live-Tests.

## Hinweise
- In der aktuellen Shell ist `ollama` nicht ueber PATH aufrufbar, der Dienst/API laeuft aber.
- Der produktive Document-Extract-Pfad nutzt die API-URL und ist damit funktionsfaehig, solange der Ollama-Dienst laeuft.
