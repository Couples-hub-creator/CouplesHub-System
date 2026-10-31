@echo off
REM Run any Python script with the correct Python version
REM Usage: run_python_gui.bat script.py

if "%~1"=="" (
    echo Usage: run_python_gui.bat script.py
    pause
    exit /b
)

"C:\Users\moeme\AppData\Local\Programs\Python\Python311\python.exe" "%~1"
