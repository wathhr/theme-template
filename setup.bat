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
set /p themeName="Theme name: "
set /p authorName="Author name: "
set "files=(LICENSE manifest.json powercord_manifest.json package.json)"
for %%x in %files% do (
  for /f "tokens=*" %%a in (%%x) do (
    set str=%%a
    set str=!str:__themeName__=%themeName%!
    echo !str!>>%%x.tmp
  )
  del %%x
  move %%x.tmp %%x >nul
  for /f "tokens=*" %%a in (%%x) do (
    set str=%%a
    set str=!str:__authorName__=%authorName%!
    echo !str!>>%%x.tmp
  )
  del %%x
  move %%x.tmp %%x >nul
  endlocal
)
goto :eof

:end
echo Finished. Err: %errorlevel%
cd /D %initialDirectory%
title %initialTitle%
endlocal
start /b "" cmd /c del "%~f0"&exit /b
