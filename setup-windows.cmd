@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/ and run this file again.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 goto failed
call npm run setup:browser
if errorlevel 1 goto failed
call npm test
if errorlevel 1 goto failed
echo Setup complete. Double-click start-windows.cmd to start the app.
pause
exit /b 0
:failed
echo Setup failed. Copy the error shown above and share it with Codex.
pause
exit /b 1
