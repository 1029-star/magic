# Test script for bounce-collect project
# Validates project setup and file structure

Write-Host "Validating project structure..." -ForegroundColor Cyan
Write-Host ""

$errors = 0

function Add-NodeToPath {
    if (Test-Path "$env:ProgramFiles\nodejs\node.exe") {
        $nodeDir = "$env:ProgramFiles\nodejs"
    } elseif (Test-Path "$env:ProgramFiles(x86)\nodejs\node.exe") {
        $nodeDir = "$env:ProgramFiles(x86)\nodejs"
    }

    if ($nodeDir) {
        Write-Host "[INFO] Found Node.js in $nodeDir" -ForegroundColor Yellow
        $env:PATH = "$nodeDir;$env:PATH"
        return $true
    }

    return $false
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (-not (Add-NodeToPath)) {
        Write-Host "[ERROR] Node.js not found - Install from https://nodejs.org/ or add it to PATH" -ForegroundColor Red
        $errors++
    }
}

if ($errors -eq 0 -and (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[OK] Node.js found: $(node --version)" -ForegroundColor Green
}

# Check required files
if (Test-Path "package.json") {
    Write-Host "[OK] package.json found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] package.json missing" -ForegroundColor Red
    $errors++
}

if (Test-Path "main.js") {
    Write-Host "[OK] main.js found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] main.js missing" -ForegroundColor Red
    $errors++
}

if (Test-Path "index.html") {
    Write-Host "[OK] index.html found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] index.html missing" -ForegroundColor Red
    $errors++
}

if (Test-Path "game.js") {
    Write-Host "[OK] game.js found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] game.js missing" -ForegroundColor Red
    $errors++
}

if (Test-Path "node_modules") {
    Write-Host "[OK] node_modules directory found" -ForegroundColor Green
} else {
    Write-Host "[WARNING] node_modules not found - run setup.ps1 first" -ForegroundColor Yellow
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$errors test(s) failed." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
