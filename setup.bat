@echo off
REM Setup script for bounce-collect project
REM Installs all dependencies required to run the game

setlocal enabledelayedexpansion

echo Checking prerequisites...

REM Try node on PATH first
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_DIR=%ProgramFiles%\nodejs"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_DIR=%ProgramFiles(x86)%\nodejs"
    )
    if defined NODE_DIR (
        echo [INFO] Found Node.js in %NODE_DIR%
        set "PATH=%NODE_DIR%;%PATH%"
    )
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not available in PATH!
    echo Please install Node.js from https://nodejs.org/ or add it to your PATH.
    echo Then run this setup script again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=* delims=" %%i in ('node --version') do set "NODE_VERSION=%%i"
echo [OK] Node.js found: !NODE_VERSION!

echo.
echo Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo.
    echo Setup completed successfully!
    echo Run "npm start" or use run.bat to start the game.
) else (
    echo.
    echo Setup failed. Please check your npm installation.
    pause
    exit /b 1
)
endlocal
