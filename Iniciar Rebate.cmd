@echo off
chcp 65001 >nul
title Rebate - Transolicar
cd /d "%~dp0"

echo.
echo  ===========================================
echo    TRANSOLICAR - Plataforma Rebate
echo  ===========================================
echo.

REM --- Node instalado? ---
where node >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo          Descargalo de https://nodejs.org  ^(version LTS^)
  echo.
  pause
  exit /b 1
)

REM --- Dependencias? ---
if not exist "node_modules\express\package.json" (
  echo  Faltan dependencias. Instalando ^(puede tardar varios minutos^)...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
  )
)

REM --- Configuracion? ---
if not exist ".env" (
  echo  [ERROR] Falta el archivo .env con las credenciales.
  echo          Copia .env.example como .env y completalo.
  echo.
  pause
  exit /b 1
)

REM --- Puerto ocupado? ---
set PUERTO=3050
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PUERTO% .*LISTENING"') do (
  echo  [AVISO] El puerto %PUERTO% ya esta en uso ^(PID %%p^).
  echo          Puede que la plataforma ya este corriendo.
  echo          Abriendo el navegador...
  start "" http://localhost:%PUERTO%/rebate
  timeout /t 3 >nul
  exit /b 0
)

echo  Iniciando servidor...
echo  El navegador se abrira solo en unos segundos.
echo.
echo  Para detener: cierra esta ventana o presiona Ctrl+C
echo  ===========================================
echo.

REM abre el navegador en paralelo, tras dar tiempo a que levante
start "" /min cmd /c "timeout /t 5 >nul & start "" http://localhost:%PUERTO%/rebate"

node src\app.js

echo.
echo  El servidor se detuvo.
pause
