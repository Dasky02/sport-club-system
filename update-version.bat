@echo off
cd /d "%~dp0"
python scripts\bump_version.py %1
exit /b %errorlevel%
