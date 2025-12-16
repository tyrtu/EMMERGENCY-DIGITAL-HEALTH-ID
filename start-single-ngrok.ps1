<#
Simple single-tunnel ngrok launcher

Starts backend and frontend (minimized) and opens a single ngrok tunnel for the
frontend (port 5173). Vite's proxy forwards `/api` and `/uploads` to the
backend (localhost:5000) so one ngrok tunnel is sufficient for free ngrok
accounts.

Usage: .\start-single-ngrok.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "Starting single-tunnel ngrok launcher..." -ForegroundColor Cyan

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) { $scriptRoot = Get-Location }

# Check for ngrok
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "ngrok is not installed or not on PATH. Install from https://ngrok.com/download" -ForegroundColor Red
    exit 1
}

# Ensure dependencies
if (-not (Test-Path "$scriptRoot\backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location "$scriptRoot\backend"
    npm install
    Pop-Location
}
if (-not (Test-Path "$scriptRoot\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "$scriptRoot\frontend"
    npm install
    Pop-Location
}

Write-Host "Starting backend (port 5000)..." -ForegroundColor Green
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\backend'; Write-Host 'Backend (dev)'; npm run dev" -WindowStyle Minimized -PassThru

Start-Sleep -Seconds 4

Write-Host "Starting frontend (port 5173)..." -ForegroundColor Green
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptRoot\frontend'; Write-Host 'Frontend (dev)'; npm run dev" -WindowStyle Minimized -PassThru

Start-Sleep -Seconds 6

Write-Host ""; Write-Host "Backend and frontend started." -ForegroundColor Green
Write-Host "Opening single ngrok tunnel for frontend (port 5173). Copy the HTTPS URL to open on external devices." -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window to stop ngrok and the started servers." -ForegroundColor Yellow

# Cleanup
$cleanup = {
    Write-Host "Stopping processes..." -ForegroundColor Yellow
    if ($backendProcess -and -not $backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendProcess -and -not $frontendProcess.HasExited) { Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue }
    Write-Host "Stopped." -ForegroundColor Green
}

Register-EngineEvent PowerShell.Exiting -Action $cleanup | Out-Null

try {
    ngrok http 5173
} finally {
    & $cleanup
}
