@echo off
REM Test script for bounce-collect project
REM Validates project setup and file structure

setlocal enabledelayedexpansion

echo Validating project structure...
echo.

set errors=0

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
if %errorlevel% equ 0 (
    for /f "tokens=* delims=" %%i in ('node --version') do set "NODE_VERSION=%%i"
    echo [OK] Node.js found: !NODE_VERSION!
) else (
    echo [ERROR] Node.js not found - Install from https://nodejs.org/ or add it to PATH
    set /a errors+=1
)

REM Check required files
if exist package.json (
    echo [OK] package.json found
) else (
    echo [ERROR] package.json missing
    set /a errors+=1
)

if exist main.js (
    echo [OK] main.js found
) else (
    echo [ERROR] main.js missing
    set /a errors+=1
)

if exist index.html (
    echo [OK] index.html found
) else (
    echo [ERROR] index.html missing
    set /a errors+=1
)

if exist game.js (
    echo [OK] game.js found
) else (
    echo [ERROR] game.js missing
    set /a errors+=1
)

if exist node_modules (
    echo [OK] node_modules directory found
) else (
    echo [WARNING] node_modules not found - run setup.bat first
)

echo.
if %errors% equ 0 (
    echo All tests passed!
    exit /b 0
) else (
    echo %errors% test(s) failed.
    pause
    exit /b 1
)
endlocal
