@echo off
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% (
    set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist %CHROME% (
    echo Google Chrome was not found at standard installation paths.
    echo Please load the unpacked extension manually via chrome://extensions.
    pause
    exit /b 1
)

set EXT_DIR=%~dp0
if exist "%~dp0manifest.json" (
    set EXT_DIR=%~dp0
) else if exist "%~dp0glance-main\manifest.json" (
    set EXT_DIR=%~dp0glance-main
)

echo ========================================================
echo Starting Google Chrome with Glance Extension...
echo ========================================================
echo Extension Directory: %EXT_DIR%
echo.

start "" %CHROME% --load-extension="%EXT_DIR%" --user-data-dir="%TEMP%\glance-chrome-dev-profile" "chrome://extensions" "https://en.wikipedia.org/wiki/Main_Page"

echo Launched Chrome in isolated dev profile with Glance preloaded.
