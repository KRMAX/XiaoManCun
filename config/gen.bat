@echo off
REM 生成《小满村》客户端配置代码与数据（Windows）。
REM 依赖：.NET 8 + Luban。设置环境变量 LUBAN_DLL 指向 Luban.dll。

setlocal
cd /d %~dp0

if "%LUBAN_DLL%"=="" set LUBAN_DLL=.\Luban\Luban.dll

set CODE_OUT=..\client\assets\scripts\config\generated
set DATA_OUT=..\client\assets\resources\config

if not exist "%LUBAN_DLL%" (
    echo 找不到 Luban.dll: %LUBAN_DLL%
    echo 请设置环境变量 LUBAN_DLL 指向 Luban.dll
    exit /b 1
)

if not exist "%CODE_OUT%" mkdir "%CODE_OUT%"
if not exist "%DATA_OUT%" mkdir "%DATA_OUT%"

dotnet "%LUBAN_DLL%" ^
    -t client ^
    -c typescript-json ^
    -d json ^
    --conf luban.conf ^
    -x outputCodeDir=%CODE_OUT% ^
    -x outputDataDir=%DATA_OUT%

echo 配置生成完成。
endlocal
