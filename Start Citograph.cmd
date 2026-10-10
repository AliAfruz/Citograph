@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-citograph.ps1"
if errorlevel 2 (
  call npm.cmd run build
  if errorlevel 1 exit /b 1
  call npm.cmd run desktop
)
