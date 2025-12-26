@echo off
REM Start ML Analyzer with virtual environment support

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

python app.py

