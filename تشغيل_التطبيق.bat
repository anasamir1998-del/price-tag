@echo off
chcp 65001 > nul
title مصمم بطاقات واستيكرات الأسعار والباركود
echo.
echo ====================================================================
echo      🚀 جاري تشغيل تطبيق مصمم بطاقات واستيكرات الأسعار الذكي...
echo ====================================================================
echo.
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [خطأ] لم يتم العثور على Node.js مثبت على جهازك!
    echo يرجى تحميل وتثبيت Node.js من: https://nodejs.org/
    echo.
    pause
    exit /b
)

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo [1/2] جاري تثبيت الحزم والمكتبات لأول مرة...
    call npm install
    if %errorlevel% neq 0 (
        echo [خطأ] حدث خطأ أثناء تثبيت المكتبات.
        pause
        exit /b
    )
)

echo [2/2] جاري تشغيل الخادم وفتح المتصفح تلقائياً...
echo.
echo ====================================================================
echo   🌐 رابط التطبيق: http://localhost:3000/
echo   📌 اترك هذه النافذة مفتوحة أثناء استخدام التطبيق
echo ====================================================================
echo.

call npm run dev
pause
