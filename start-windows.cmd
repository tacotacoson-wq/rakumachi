@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please run setup-windows.cmd first.
  pause
  exit /b 1
)
if not exist node_modules\express (
  echo Please run setup-windows.cmd first.
  pause
  exit /b 1
)
set "HOST=127.0.0.1"
set "PORT=3000"
echo Starting app. Keep this window open. Press Ctrl+C to stop.
start "" powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { $r=Invoke-RestMethod 'http://127.0.0.1:3000/api/health'; if ($r.ok) { Start-Process 'http://127.0.0.1:3000'; exit } } catch {} Start-Sleep -Seconds 1 }; Write-Host 'App did not start. Check the server window.'"
call npm start
pause
