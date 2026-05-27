@echo off
setlocal EnableExtensions

set "REPO_DIR=%~dp0"
pushd "%REPO_DIR%" >nul
if errorlevel 1 (
  echo Fehler: Das Repository-Verzeichnis konnte nicht betreten werden.
  pause
  exit /b 1
)

echo Starte MuGPlan Dev-Server...
echo Repository: %CD%
echo Adresse: http://127.0.0.1:5000
echo.

if not exist ".env.dev" (
  echo Fehler: .env.dev wurde nicht gefunden.
  echo Bitte das Script aus dem Repository verwenden, in dem .env.dev liegt.
  popd >nul
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Fehler: npm wurde nicht gefunden. Bitte Node.js installieren oder PATH kontrollieren.
  popd >nul
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Fehler: node_modules wurde nicht gefunden.
  echo Bitte einmal "npm install" im Repository starten.
  popd >nul
  pause
  exit /b 1
)

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Dev-Server wurde mit Fehlercode %EXIT_CODE% beendet.
) else (
  echo Dev-Server wurde beendet.
)

popd >nul
pause
exit /b %EXIT_CODE%
