@echo off
cd /d "%~dp0"
set "APP_LOG=%~dp0app-runtime.log"
echo ==== %date% %time% ====>> "%APP_LOG%"
"C:\Program Files\nodejs\node.exe" server.mjs >> "%APP_LOG%" 2>&1
