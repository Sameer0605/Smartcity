@echo off
cd /d "%~dp0backend"
echo.
echo ========================================
echo   SmartCityAI - Starting Server...
echo ========================================
echo.
REM 2>nul is the correct cmd.exe redirect (2>/dev/null always errors here,
REM which used to force a full pip install on every start).
python -c "import flask" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)
echo.
echo Open http://localhost:8765 in your browser!
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8765"
python app.py
pause
