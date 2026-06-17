@echo off
REM Run script for bounce-collect project
REM Launches the Electron application

setlocal enabledelayedexpansion

echo Starting Bounce ^& Collect...

REM Try node on PATH first
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_DIR=%ProgramFiles%\nodejs"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_DIR=%ProgramFiles(x86)%\nodejs"
    )
    if defined NODE_DIR (
        set "PATH=%NODE_DIR%;%PATH%"
    )
)

npm start

if %errorlevel% neq 0 (
    echo.
    echo Failed to start the application.
    echo Make sure you've run setup.bat first.
    pause
)
endlocal
