# Run script for bounce-collect project
# Launches the Electron application

Write-Host "Starting Bounce & Collect..." -ForegroundColor Cyan
npm start

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Failed to start the application." -ForegroundColor Red
    Write-Host "Make sure you've run setup.ps1 first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
