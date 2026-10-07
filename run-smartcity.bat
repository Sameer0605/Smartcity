@echo off
setlocal
cd /d "%~dp0backend"

echo ========================================
echo   SmartCityAI - Starting Server...
echo ========================================

REM Check if Flask is installed (2>nul = correct cmd.exe redirect; 2>/dev/null
REM always fails in cmd and used to trigger a pip install on every start)
python -c "import flask" 2>nul
if errorlevel 1 (
    echo.
    echo Flask not found. Installing dependencies...
    pip install -r requirements.txt
    echo.
)

echo Starting SmartCityAI at http://localhost:8765
echo.
echo   Landing Page: http://localhost:8765
echo   Login:        http://localhost:8765/login.html
echo   Register:     http://localhost:8765/register.html
echo   Dashboard:    http://localhost:8765/app/
echo.
echo   Press Ctrl+C to stop the server.
echo ========================================
echo.

REM Auto-open browser after 2 seconds
start "" /min cmd /c "timeout /t 2 >nul && start http://localhost:8765"

python app.py
pause
