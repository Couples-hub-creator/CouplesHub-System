@echo off
setlocal
cd /d "%~dp0"

if not exist Lavalink.jar (
  echo Lavalink.jar is missing. Downloading the latest v4 release...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/lavalink-devs/Lavalink/releases/latest/download/Lavalink.jar' -OutFile 'Lavalink.jar' -UseBasicParsing"
  if errorlevel 1 goto :failed
)

java -version >nul 2>&1
if errorlevel 1 (
  echo Java 17 or newer is required. Install Temurin or another JDK and try again.
  pause
  exit /b 1
)

echo Starting Lavalink on port 2333. Keep this window open while the bot runs.
java -jar Lavalink.jar
pause
exit /b 0

:failed
echo Download failed. Check the network connection or download Lavalink.jar manually.
pause
exit /b 1
