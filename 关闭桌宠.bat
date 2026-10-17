@echo off
chcp 936 >nul
echo.
echo   正在关闭「陪伴桌宠」…
echo.
taskkill /IM electron.exe /F >nul 2>&1
if errorlevel 1 (
  echo   没有找到正在运行的桌宠（可能本来就没开）。
) else (
  echo   已经关掉了。
)
echo.
echo   现在可以重新双击【启动桌宠.vbs】打开新版了。
echo.
pause
