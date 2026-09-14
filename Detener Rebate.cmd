@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Detener Rebate
set PUERTO=3050
set ENCONTRADO=0

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PUERTO% .*LISTENING"') do (
  echo  Deteniendo proceso %%p en el puerto %PUERTO%...
  taskkill /PID %%p /F >nul 2>&1
  set ENCONTRADO=1
)

if "!ENCONTRADO!"=="0" (
  echo  No hay nada corriendo en el puerto %PUERTO%.
) else (
  echo  Plataforma detenida.
)
timeout /t 3 >nul
