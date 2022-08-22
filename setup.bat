@echo off
setlocal enableDelayedExpansion
if "%selfWrapped%"=="" (
  REM this is necessary so that we can use "exit" to terminate the batch file,
  REM and all subroutines, but not the original cmd.exe
  set selfWrapped=true
  %ComSpec% /s /c ""%~0" %*"
  if /i not "%cmdcmdline:"=%" == "%ComSpec%" pause
  goto :eof
)

for /f "tokens=* usebackq" %%f in (`powershell -noprofile -c "[Console]::Title.Replace(' - %0','') -replace '(.+) - .+'"`) do set "initialTitle=%%f"
set "title=Setup - %initialTitle%"
title %title%

set initialDirectory=%cd%
cd %~dp0

call :start & echo.
if not "%errorlevel%"=="0" goto :end
goto :end

:start
if not exist node_modules call npm i
node .\scripts\setup\index.js
goto :eof

:end
echo Finished. Err: %errorlevel%
cd /D %initialDirectory%
title %initialTitle%
endlocal
exit /b %errorlevel%
