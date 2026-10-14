@echo off
rem Starts the local preview server (port 8123) and the ngrok tunnel to it.
rem Public address (the account's permanent ngrok domain): https://bullring-lucrative-elated.ngrok-free.dev
cd /d "%~dp0.."
start "Bespoke server" python tools\serve.py
start "Bespoke ngrok" "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe" http 8123
echo Local:  http://localhost:8123/
echo Public: https://bullring-lucrative-elated.ngrok-free.dev
