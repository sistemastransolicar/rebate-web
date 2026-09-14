@echo off
REM Atajo: consulta.cmd sql\consultas\01_verificacion.sql
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0consulta.ps1" -Sql "%~1" %2 %3 %4 %5 %6
