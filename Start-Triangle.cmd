@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing Triangle Terminal dependencies...
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    echo Installation failed. Check disk space and internet access.
    pause
    exit /b 1
  )
)
set ELECTRON_RUN_AS_NODE=
start "Triangle Terminal" "node_modules\electron\dist\electron.exe" "." %*
