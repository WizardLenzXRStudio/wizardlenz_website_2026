@echo off
title Wizardlenz website
cd /d "%~dp0site"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Installing the LTS version with winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo Node.js installed. Close this window and double-click start-site.bat again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing dependencies, this takes a minute...
  call npm install
)
start "" http://localhost:4321/
call npm run dev
pause
