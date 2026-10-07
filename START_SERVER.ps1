# SmartCityAI — One-Click Start Script
# Right-click this file and select "Run with PowerShell"
# Or just double-click it

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  SmartCityAI — Starting Server..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend folder
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "backend"
Set-Location $backendPath

# Check Python
try {
    $pyVersion = python --version 2>&1
    Write-Host "Python found: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found! Install Python from python.org" -ForegroundColor Red
    pause
    exit 1
}

# Check Flask
$flaskCheck = python -c "import flask" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Flask not found. Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "Starting server at http://localhost:8765" -ForegroundColor Green
Write-Host ""
Write-Host "  Landing Page: http://localhost:8765" -ForegroundColor White
Write-Host "  Login:        http://localhost:8765/login.html" -ForegroundColor White
Write-Host "  Register:     http://localhost:8765/register.html" -ForegroundColor White
Write-Host "  Dashboard:    http://localhost:8765/app/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Open browser after 3 seconds
Start-Process -FilePath "cmd" -ArgumentList "/c timeout /t 3 /nobreak >nul && start http://localhost:8765" -WindowStyle Minimized

# Start the server
python app.py
pause
