@echo off
cd /d "%~dp0"
if exist "release\v1.4.0\win-unpacked\Citograph.exe" (
  start "" "release\v1.4.0\win-unpacked\Citograph.exe"
) else if exist "release\win-unpacked\Citograph.exe" (
  start "" "release\win-unpacked\Citograph.exe"
) else (
  call npm.cmd run build
  if errorlevel 1 exit /b 1
  call npm.cmd run desktop
)
