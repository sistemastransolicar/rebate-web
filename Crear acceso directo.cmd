@echo off
chcp 65001 >nul
echo Creando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Rebate Transolicar.lnk');" ^
  "$s.TargetPath='%~dp0Iniciar Rebate.cmd';" ^
  "$s.WorkingDirectory='%~dp0';" ^
  "$s.IconLocation='%SystemRoot%\System32\SHELL32.dll,13';" ^
  "$s.Description='Plataforma Rebate - Transolicar';" ^
  "$s.Save()"
echo Listo. Busca "Rebate Transolicar" en el Escritorio.
timeout /t 4 >nul
