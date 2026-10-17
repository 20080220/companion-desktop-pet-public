@echo off
chcp 936 >nul
echo.
echo   正在关闭「陪伴桌宠」…
taskkill /IM electron.exe /F >nul 2>&1
echo   完成。
pause
