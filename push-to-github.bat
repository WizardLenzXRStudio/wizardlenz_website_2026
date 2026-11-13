@echo off
title Push Wizardlenz website to GitHub
cd /d "%~dp0"
echo.
echo STEP 1 - Create the empty repository (private, no README, no .gitignore) named: wizardlenz_website_2026
echo Opening GitHub in your browser...
start "" "https://github.com/new?name=wizardlenz_website_2026&visibility=private"
echo.
echo When the repository is created, come back here.
pause
set /p GHUSER=Type your GitHub username and press Enter: 
git remote remove origin >nul 2>nul
git remote add origin https://github.com/%GHUSER%/wizardlenz_website_2026.git
git branch -M main
git push -u origin main
echo.
echo Done. If you saw no errors, your project is on GitHub.
pause
