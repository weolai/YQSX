@echo off
echo ============================================
echo 执行商品图片更新脚本
echo ============================================
echo.
echo 请确保 MySQL 服务已启动
echo.
pause

REM 查找常见的 MySQL 安装路径
set MYSQL_PATH=

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
)
if exist "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe" (
    set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe
)
if exist "C:\MySQL\bin\mysql.exe" (
    set MYSQL_PATH=C:\MySQL\bin\mysql.exe
)

if "%MYSQL_PATH%"=="" (
    echo [错误] 未找到 MySQL 客户端
    echo.
    echo 请手动执行以下命令:
    echo mysql -u root -p shop-product ^< update_product_images.sql
    echo.
    pause
    exit /b 1
)

echo 找到 MySQL: %MYSQL_PATH%
echo.
echo 开始执行 SQL 脚本...
echo.

"%MYSQL_PATH%" -u root -p shop-product < update_product_images.sql

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo [成功] 商品图片更新完成！
    echo ============================================
    echo.
    echo 所有商品已更新为 Unsplash 占位图
    echo.
) else (
    echo.
    echo ============================================
    echo [失败] 脚本执行失败
    echo ============================================
    echo.
    echo 请检查:
    echo 1. MySQL 服务是否已启动
    echo 2. 用户名密码是否正确
    echo 3. shop-product 数据库是否存在
    echo.
)

pause
