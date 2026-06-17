# Setup script for bounce-collect project
# Installs all dependencies required to run the game

Write-Host "Checking prerequisites..." -ForegroundColor Cyan

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
        Write-Host "" 
        Write-Host "ERROR: Node.js is not installed or not available in PATH!" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/ or add it to your PATH." -ForegroundColor Yellow
        Write-Host "Then run this setup script again." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[OK] Node.js found: $(node --version)" -ForegroundColor Green

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host "Run 'npm start' or use run.ps1 to start the game." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Setup failed. Please check your npm installation." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
