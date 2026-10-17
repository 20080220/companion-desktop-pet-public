@echo off
chcp 936 >nul
cd /d "%~dp0"
echo.
echo   正在启动「陪伴桌宠」…
echo.
if not exist "node_modules\electron\dist\electron.exe" (
  echo   找不到 Electron！请先双击运行【安装依赖.bat】
  echo.
  pause
  exit /b 1
)
"node_modules\electron\dist\electron.exe" . >> "启动日志.txt" 2>&1
echo. >> "启动日志.txt"
echo   退出码: %errorlevel% >> "启动日志.txt"
echo.
echo   桌宠已退出。如果没启动成功，请把【启动日志.txt】发给开发者。
pause
