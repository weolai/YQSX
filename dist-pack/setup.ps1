﻿<#
.SYNOPSIS
    YQSX 项目一键环境检测与配置脚本（面向"什么都不会"的用户）
.DESCRIPTION
    1. 检测 JDK / Node.js / MySQL / Python / Conda / Maven 是否已安装
    2. 引导输入 MySQL 账号、密码、主机端口，测试连通性
    3. 自动创建 4 个数据库并导入 sql/init-all.sql
    4. 生成 config.env（供 start.ps1 读取）
    5. 自动修正 AI 识别服务的 .env 模型权重路径
    6. 自动 npm install 前端依赖
    7. 自动创建 conda 环境 AIDetection（可选，失败不影响主流程）
    8. 提示启动 Nacos（若未启动），并通过 Open API 导入 global-config.yaml
.NOTES
    使用方式：在 dist-pack 目录解压后，右键 setup.ps1 -> 使用 PowerShell 运行
    或在 PowerShell 中执行：  powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>

# 严格模式 + 出错继续（便于提示用户）
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 当前脚本所在目录（解压根目录）
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path }

# 推断项目根（dist-pack 上一级）
if (Split-Path $ROOT -Leaf -eq 'dist-pack') {
    $PROJECT_ROOT = Split-Path -Parent $ROOT
} else {
    $PROJECT_ROOT = $ROOT
}

$ConfigEnv    = Join-Path $ROOT 'config.env'
$TemplateEnv  = Join-Path $ROOT 'config.env.template'
$SqlInit      = Join-Path $ROOT 'sql\init-all.sql'
$NacosConfig  = Join-Path $ROOT 'nacos-config\global-config.yaml'
$FrontendDir  = Join-Path $PROJECT_ROOT 'shop-web-next'
$RecogDir     = Join-Path $PROJECT_ROOT 'XML\yolo_recognition_model\recognition-service'
$RecogEnv     = Join-Path $RecogDir '.env'
$JavaJars = @{
    'gateway'  = Join-Path $PROJECT_ROOT 'Test\shop-parent\shop-gateway-server\target\shop-gateway-server-1.0-SNAPSHOT.jar'
    'product'  = Join-Path $PROJECT_ROOT 'Test\shop-parent\shop-product-server\target\shop-product-server-1.0-SNAPSHOT.jar'
    'user'     = Join-Path $PROJECT_ROOT 'Test\shop-parent\shop-user-server\target\shop-user-server-1.0-SNAPSHOT.jar'
    'order'    = Join-Path $PROJECT_ROOT 'Test\shop-parent\shop-order-server\target\shop-order-server-1.0-SNAPSHOT.jar'
    'payment'  = Join-Path $PROJECT_ROOT 'Test\shop-parent\shop-payment-server\target\shop-payment-server-1.0-SNAPSHOT.jar'
}

# ---------- 工具函数 ----------
function Write-Title($t) { Write-Host ''; Write-Host ('=' * 60) -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host ('=' * 60) -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "[ERR]  $m" -ForegroundColor Red }
function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Gray }
function Read-Default($prompt, $default) {
    $v = Read-Host "$prompt (默认: $default)"
    if ([string]::IsNullOrWhiteSpace($v)) { return $default } else { return $v.Trim() }
}

function Test-Command($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source } else { return $null }
}

function Find-MysqlExe {
    <# 查找 mysql.exe：优先 PATH，其次常见安装路径 #>
    $cmd = Test-Command 'mysql'
    if ($cmd) { return $cmd }
    # 常见安装路径
    $candidates = @(
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.3\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe',
        'C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe',
        'C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe'
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    # 通配扫描 Program Files
    $found = Get-ChildItem 'C:\Program Files\MySQL\MySQL Server*\bin\mysql.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Test-Port($port, $destHost = '127.0.0.1', $timeoutMs = 500) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($destHost, $port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne($timeoutMs, $false)
        if ($ok -and $tcp.Connected) { $tcp.Close(); return $true }
        $tcp.Close(); return $false
    } catch { return $false }
}

function Invoke-Mysql($mysqlExe, $dbHost, $dbPort, $dbUser, $dbPass, $sql, $charSet = 'utf8mb4') {
    <# 调用 mysql 客户端执行 SQL，返回 [stdout, stderr, exitCode] #>
    $errFile = Join-Path $env:TEMP "yqsx_mysql_$([Guid]::NewGuid().ToString('N')).err"
    $outFile = Join-Path $env:TEMP "yqsx_mysql_$([Guid]::NewGuid().ToString('N')).out"
    $argList = @('-h', $dbHost, '-P', $dbPort, '-u', $dbUser, "-p$dbPass", "--default-character-set=$charSet", '-N', '-B', '-e', $sql)
    $p = Start-Process -FilePath $mysqlExe -ArgumentList $argList -NoNewWindow -Wait -PassThru -RedirectStandardError $errFile -RedirectStandardOutput $outFile
    $out = if (Test-Path $outFile) { Get-Content $outFile -Raw } else { '' }
    $err = if (Test-Path $errFile) { Get-Content $errFile -Raw } else { '' }
    Remove-Item $errFile, $outFile -ErrorAction SilentlyContinue
    return @{ Stdout = $out; Stderr = $err; ExitCode = $p.ExitCode }
}

function Test-MySqlConnection($dbHost, $dbPort, $dbUser, $dbPass) {
    # 优先用 mysql client；若没有则用 TCP 端口探测
    $mysql = Find-MysqlExe
    if ($mysql) {
        $r = Invoke-Mysql -mysqlExe $mysql -dbHost $dbHost -dbPort $dbPort -dbUser $dbUser -dbPass $dbPass -sql 'SELECT 1'
        if ($r.ExitCode -eq 0) { return $true }
        Write-Err "MySQL 连接失败: $($r.Stderr)"
        return $false
    } else {
        # 没有 mysql client 时仅测端口
        $ok = Test-Port -port $dbPort -destHost $dbHost -timeoutMs 1500
        if (-not $ok) { Write-Err "MySQL 端口 $dbPort 未开放，请确认 MySQL 服务已启动" }
        return $ok
    }
}

# ---------- 主流程 ----------
Write-Title 'YQSX 项目环境检测与配置向导'
Write-Host "项目根目录: $PROJECT_ROOT"
Write-Host "脚本目录  : $ROOT"
Write-Host ''

# ===== 步骤 1：环境检测 =====
Write-Title '步骤 1/7：检测已安装的运行环境'

$envs = @(
    @{ Name = 'JDK 11+';        Cmd = 'java';   MinVersion = '11'; Hint = 'https://adoptium.net/' }
    @{ Name = 'Node.js 18+';    Cmd = 'node';   MinVersion = '18'; Hint = 'https://nodejs.org/' }
    @{ Name = 'npm';            Cmd = 'npm';    MinVersion = '';   Hint = '随 Node.js 一起安装' }
    @{ Name = 'Python 3.10+';   Cmd = 'python'; MinVersion = '3.10'; Hint = 'https://www.python.org/downloads/' }
    @{ Name = 'Conda';          Cmd = 'conda';  MinVersion = '';   Hint = 'https://docs.conda.io/projects/miniconda/' }
    @{ Name = 'Maven 3.8+';     Cmd = 'mvn';    MinVersion = '3.8'; Hint = 'https://maven.apache.org/' }
)

$missing = @()
foreach ($e in $envs) {
    $path = Test-Command $e.Cmd
    if ($path) {
        $ver = ''
        try { $ver = (& $e.Cmd --version 2>&1 | Select-Object -First 1).ToString().Trim() } catch {}
        Write-OK ("{0,-16} 已安装  {1}" -f $e.Name, $ver)
    } else {
        Write-Warn ("{0,-16} 未安装  下载: {1}" -f $e.Name, $e.Hint)
        $missing += $e
    }
}

Write-Host ''
if ($missing.Count -gt 0) {
    Write-Err '检测到缺失以下运行环境，请先安装后再运行本脚本：'
    foreach ($m in $missing) { Write-Host ("    - {0,-16} {1}" -f $m.Name, $m.Hint) -ForegroundColor Yellow }
    Write-Host ''
    Write-Host 'MySQL 数据库请单独下载安装：https://dev.mysql.com/downloads/installer/'
    Read-Host '安装完成后按回车退出'
    exit 1
}

# MySQL 客户端检测（独立，因为可能装了 server 没装 client）
$mysql = Find-MysqlExe
if ($mysql) { Write-OK "MySQL 客户端已找到: $mysql" }
else {
    Write-Warn '未检测到 mysql 命令行客户端，将仅通过端口探测 MySQL 服务'
    Write-Warn '若 MySQL 服务未启动，本脚本将无法初始化数据库，请先启动 MySQL 服务'
    Write-Warn '建议：将 MySQL 安装目录的 bin 子目录添加到系统 PATH（如 C:\Program Files\MySQL\MySQL Server 8.0\bin）'
}

# ===== 步骤 2：MySQL 配置 =====
Write-Title '步骤 2/7：配置 MySQL 数据库连接'

Write-Host '请输入 MySQL 连接信息（不知道的直接回车使用默认值）：' -ForegroundColor Yellow
$cfg = @{}
$cfg.DB_HOST     = Read-Default 'MySQL 主机地址' 'localhost'
$cfg.DB_PORT     = Read-Default 'MySQL 端口' '3306'
$cfg.DB_USER     = Read-Default 'MySQL 用户名' 'root'
$cfg.DB_PASSWORD = Read-Host 'MySQL 密码（输入不可见）' -AsSecureString
$cfg.DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($cfg.DB_PASSWORD))

Write-Host ''
Write-Info "正在测试 MySQL 连接 $($cfg.DB_HOST):$($cfg.DB_PORT) ..."
$retry = 0
$maxRetry = 3
$ok = $false
while ($retry -lt $maxRetry) {
    $ok = Test-MySqlConnection -dbHost $cfg.DB_HOST -dbPort $cfg.DB_PORT -dbUser $cfg.DB_USER -dbPass $cfg.DB_PASSWORD
    if ($ok) { break }
    $retry++
    if ($retry -lt $maxRetry) {
        Write-Warn "连接失败，请检查 MySQL 是否启动、账号密码是否正确（剩余尝试: $($maxRetry - $retry)）"
        $cfg.DB_PASSWORD = Read-Host "重新输入 MySQL 密码"
    }
}
if (-not $ok) {
    Write-Err 'MySQL 连接失败超过 3 次，请确认 MySQL 已启动且账号密码正确后重新运行本脚本'
    Write-Host '提示：' -ForegroundColor Yellow
    Write-Host '  1. Windows 服务中确认 MySQL80 / MySQL 服务状态为"正在运行"'
    Write-Host '  2. 默认 root 密码在安装时设置，若忘记可重置'
    Read-Host '按回车退出'
    exit 1
}
Write-OK 'MySQL 连接成功'

# ===== 步骤 3：初始化数据库 =====
Write-Title '步骤 3/7：初始化数据库（shop-product / shop-order / shop_payment / shop_user）'

if (-not (Test-Path $SqlInit)) {
    Write-Err "找不到 SQL 初始化脚本: $SqlInit"
    Read-Host '按回车退出'
    exit 1
}

if ($mysql) {
    Write-Info "执行: $SqlInit"
    # 通过 cmd 重定向 < 文件的方式执行（兼容多语句 + 注释）
    $errFile = Join-Path $env:TEMP "yqsx_sql_init.err"
    $sqlPath = $SqlInit -replace '/', '\'
    $cmd = "`"$mysql`" -h $($cfg.DB_HOST) -P $($cfg.DB_PORT) -u $($cfg.DB_USER) -p$($cfg.DB_PASSWORD) --default-character-set=utf8mb4 < `"$sqlPath`""
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $cmd) -NoNewWindow -Wait -PassThru -RedirectStandardError $errFile
    if ($p.ExitCode -ne 0) {
        $err = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
        Write-Err "SQL 执行出错: $err"
        Write-Warn '若错误为"已存在"或字段重复，可忽略（init-all.sql 使用了 IF NOT EXISTS / INSERT IGNORE）'
    } else {
        Write-OK '数据库初始化完成'
    }
    # 验证
    $r = Invoke-Mysql -mysqlExe $mysql -dbHost $cfg.DB_HOST -dbPort $cfg.DB_PORT -dbUser $cfg.DB_USER -dbPass $cfg.DB_PASSWORD -sql 'SELECT COUNT(*) FROM `shop-product`.t_product'
    Write-Info "验证：shop-product.t_product 行数 = $($r.Stdout.Trim())  (期望 19)"
    Remove-Item $errFile -ErrorAction SilentlyContinue
} else {
    Write-Warn '没有 mysql 客户端，无法自动初始化数据库'
    Write-Warn "请手动执行: mysql -u $($cfg.DB_USER) -p < $SqlInit"
    Write-Host '按回车继续（数据库未初始化时启动 Java 服务会报错）' -ForegroundColor Yellow
    Read-Host
}

# ===== 步骤 4：生成 config.env =====
Write-Title '步骤 4/7：生成运行时配置 config.env'

# 其他配置项
$cfg.REDIS_HOST = Read-Default 'Redis 主机（默认与本机相同）' 'localhost'
$cfg.REDIS_PORT = Read-Default 'Redis 端口' '6379'
$cfg.NACOS_HOST = Read-Default 'Nacos 主机（默认本机，XML/nacos 自带）' 'localhost'
$cfg.NACOS_PORT = Read-Default 'Nacos 端口' '8848'
$cfg.NACOS_USERNAME = Read-Default 'Nacos 用户名' 'nacos'
$cfg.NACOS_PASSWORD = Read-Default 'Nacos 密码' 'nacos'
$cfg.DIN_RECOMMEND_URL = Read-Default 'DIN 推荐服务 URL（无则回车跳过）' 'http://127.0.0.1:8000'
$cfg.FRONTEND_PORT = Read-Default '前端端口' '3000'

# 服务开关
Write-Host ''
Write-Host '服务开关（不知道就全部保持默认 true）：' -ForegroundColor Yellow
$cfg.ENABLE_RECOGNITION = Read-Default '启用 AI 识别服务（需 Conda 环境）[true/false]' 'true'
$cfg.ENABLE_DIN = Read-Default '启用 DIN 推荐服务（一般 false）[true/false]' 'false'
$cfg.ENABLE_FRONTEND = Read-Default '启用前端 [true/false]' 'true'

# JWT 密钥
Write-Host ''
Write-Host 'JWT 密钥：用于签发登录 Token，建议生成新的随机密钥。' -ForegroundColor Yellow
$genNew = Read-Default '是否自动生成新的 JWT 密钥？[y/n]' 'y'
if ($genNew -eq 'y' -or $genNew -eq 'Y') {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $sb = New-Object System.Text.StringBuilder
    $rnd = New-Object System.Random
    for ($i = 0; $i -lt 48; $i++) { [void]$sb.Append($chars[$rnd.Next($chars.Length)]) }
    $cfg.JWT_SECRET = $sb.ToString()
    Write-OK "已生成新 JWT 密钥: $($cfg.JWT_SECRET.Substring(0,8))...（已隐藏剩余部分）"
} else {
    $cfg.JWT_SECRET = Read-Default 'JWT 密钥（>=32 字节）' 'dev-only-jwt-secret-key-please-change-in-prod-32bytes'
}

# 写入 config.env
$lines = @(
    "# YQSX 运行时配置（由 setup.ps1 生成于 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')）",
    "",
    "DB_HOST=$($cfg.DB_HOST)",
    "DB_PORT=$($cfg.DB_PORT)",
    "DB_USER=$($cfg.DB_USER)",
    "DB_PASSWORD=$($cfg.DB_PASSWORD)",
    "",
    "REDIS_HOST=$($cfg.REDIS_HOST)",
    "REDIS_PORT=$($cfg.REDIS_PORT)",
    "",
    "NACOS_HOST=$($cfg.NACOS_HOST)",
    "NACOS_PORT=$($cfg.NACOS_PORT)",
    "NACOS_USERNAME=$($cfg.NACOS_USERNAME)",
    "NACOS_PASSWORD=$($cfg.NACOS_PASSWORD)",
    "",
    "DIN_RECOMMEND_URL=$($cfg.DIN_RECOMMEND_URL)",
    "",
    "FRONTEND_PORT=$($cfg.FRONTEND_PORT)",
    "",
    "ENABLE_RECOGNITION=$($cfg.ENABLE_RECOGNITION)",
    "ENABLE_DIN=$($cfg.ENABLE_DIN)",
    "ENABLE_FRONTEND=$($cfg.ENABLE_FRONTEND)",
    "",
    "JWT_SECRET=$($cfg.JWT_SECRET)"
)
Set-Content -Path $ConfigEnv -Value $lines -Encoding UTF8
Write-OK "已生成: $ConfigEnv"

# ===== 步骤 5：修正 AI 识别服务 .env =====
Write-Title '步骤 5/7：修正 AI 识别服务配置'

if (Test-Path $RecogDir) {
    Write-Info "识别服务目录: $RecogDir"

    # 修正 DATABASE_URL / NACOS_SERVER_ADDR
    if (Test-Path $RecogEnv) {
        $content = Get-Content $RecogEnv -Raw -Encoding UTF8
        $newDbUrl = "mysql+pymysql://$($cfg.DB_USER):$($cfg.DB_PASSWORD)@$($cfg.DB_HOST):$($cfg.DB_PORT)/shop-product?charset=utf8mb4"
        $content = $content -replace 'DATABASE_URL=.*', "DATABASE_URL=$newDbUrl"
        $content = $content -replace 'NACOS_SERVER_ADDR=.*', "NACOS_SERVER_ADDR=http://$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)"
        # 修正模型权重路径
        $bestPt = Get-ChildItem -Path (Join-Path $PROJECT_ROOT 'XML\yolo_recognition_model') -Recurse -Filter 'best.pt' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($bestPt) {
            $rel = Resolve-Path -Relative $bestPt.FullName
            # 转换为 .env 期望格式（../yolo_training_outputs/.../best.pt）
            $content = $content -replace 'MODEL_PATH=.*', "MODEL_PATH=$($bestPt.FullName)"
            Write-OK "已修正 MODEL_PATH -> $($bestPt.FullName)"
        } else {
            Write-Warn '未找到 best.pt 模型权重，识别服务启动后将使用 yolov8n.pt 作为兜底'
        }
        Set-Content -Path $RecogEnv -Value $content -Encoding UTF8
        Write-OK "已更新识别服务 .env (DATABASE_URL / NACOS_SERVER_ADDR / MODEL_PATH)"
    } else {
        Write-Warn "识别服务 .env 不存在: $RecogEnv"
    }

    # conda 环境
    $conda = Test-Command 'conda'
    if ($cfg.ENABLE_RECOGNITION -eq 'true' -and $conda) {
        Write-Info '检测 conda 环境 AIDetection ...'
        $envList = conda env list 2>$null | Out-String
        if ($envList -match 'AIDetection') {
            Write-OK 'conda 环境 AIDetection 已存在'
        } else {
            $envYml = Join-Path $RecogDir 'environment.yml'
            if (Test-Path $envYml) {
                Write-Info '创建 conda 环境 AIDetection（首次较慢，请耐心等待）...'
                & conda env create -f $envYml 2>&1 | Out-Host
                if ($LASTEXITCODE -eq 0) { Write-OK 'conda 环境创建成功' }
                else { Write-Warn 'conda 环境创建失败，识别服务可能无法启动（可稍后手动执行）' }
            } else {
                Write-Warn "找不到 $envYml，请手动创建 conda 环境"
            }
        }
    }
} else {
    Write-Warn "识别服务目录不存在: $RecogDir（已跳过）"
}

# ===== 步骤 6：前端依赖安装 =====
Write-Title '步骤 6/7：安装前端依赖（npm install）'

if ($cfg.ENABLE_FRONTEND -eq 'true') {
    if (Test-Path $FrontendDir) {
        $npm = Test-Command 'npm.cmd'
        if (-not $npm) { $npm = Test-Command 'npm' }
        if ($npm) {
            if (Test-Path (Join-Path $FrontendDir 'node_modules')) {
                Write-OK 'node_modules 已存在，跳过安装'
            } else {
                Write-Info '正在安装前端依赖（首次较慢，可能需要 3-10 分钟）...'
                & $npm install --prefix $FrontendDir 2>&1 | Out-Host
                if ($LASTEXITCODE -eq 0) { Write-OK '前端依赖安装完成' }
                else { Write-Warn '前端依赖安装失败，可手动执行：cd shop-web-next && npm install' }
            }
        } else {
            Write-Warn '未找到 npm，请手动安装 Node.js 后执行 npm install'
        }
    } else {
        Write-Warn "前端目录不存在: $FrontendDir"
    }
} else {
    Write-Info '前端未启用，跳过依赖安装'
}

# ===== 步骤 7：Nacos 配置导入 =====
Write-Title '步骤 7/7：导入 Nacos 全局配置（global-config.yaml）'

if (Test-Path $NacosConfig) {
    # 先写入 JWT_SECRET
    $cfgContent = Get-Content $NacosConfig -Raw -Encoding UTF8
    $cfgContent = $cfgContent -replace 'secret:\s*.*', "secret: $($cfg.JWT_SECRET)"
    $tmpCfg = Join-Path $env:TEMP 'yqsx_global-config.yaml'
    Set-Content -Path $tmpCfg -Value $cfgContent -Encoding UTF8

    Write-Info "请确保 Nacos 已启动（执行 start.ps1 时会自动启动）"
    Write-Host '是否现在尝试导入配置到 Nacos？' -ForegroundColor Yellow
    Write-Host '  - 选 y：脚本会尝试连接 Nacos，若未启动则自动启动 XML/nacos/bin/startup.cmd'
    Write-Host '  - 选 n：跳过，稍后 start.ps1 启动 Nacos 后会自动导入'
    $import = Read-Default '现在导入 Nacos 配置？[y/n]' 'y'

    if ($import -eq 'y' -or $import -eq 'Y') {
        if (-not (Test-Port -port $cfg.NACOS_PORT -destHost $cfg.NACOS_HOST)) {
            Write-Info 'Nacos 未运行，尝试启动...'
            $nacosStartup = Join-Path $PROJECT_ROOT 'XML\nacos\bin\startup.cmd'
            if (Test-Path $nacosStartup) {
                Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$nacosStartup`" -m standalone" -WindowStyle Minimized
                $waited = 0
                while (-not (Test-Port -port $cfg.NACOS_PORT -destHost $cfg.NACOS_HOST) -and $waited -lt 120) {
                    Start-Sleep -Seconds 3
                    $waited += 3
                    Write-Host "." -NoNewline
                }
                Write-Host ''
                if (Test-Port -port $cfg.NACOS_PORT -destHost $cfg.NACOS_HOST) {
                    Write-OK 'Nacos 已启动'
                } else {
                    Write-Warn 'Nacos 启动超时（120s），请稍后手动启动后再次运行 setup.ps1 或手动导入'
                }
            } else {
                Write-Warn "找不到 Nacos 启动脚本: $nacosStartup"
            }
        }

        if (Test-Port -port $cfg.NACOS_PORT -destHost $cfg.NACOS_HOST) {
            Start-Sleep -Seconds 5  # 等 Nacos 完全就绪
            $url = "http://$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)/nacos/v1/cs/configs"
            try {
                # 先尝试删除（避免旧值）
                $delBody = @{ dataId = 'global-config.yaml'; group = 'DEFAULT_GROUP' }
                try { Invoke-RestMethod -Uri $url -Method Delete -Body $delBody -TimeoutSec 5 | Out-Null } catch {}

                $content = Get-Content $tmpCfg -Raw -Encoding UTF8
                $body = @{ dataId = 'global-config.yaml'; group = 'DEFAULT_GROUP'; type = 'yaml'; content = $content }
                $resp = Invoke-RestMethod -Uri $url -Method Post -Body $body -TimeoutSec 10
                if ($resp -eq $true) { Write-OK '已导入 Nacos 配置: global-config.yaml' }
                else { Write-Warn "Nacos 返回: $resp" }
            } catch {
                Write-Warn "通过 Open API 导入失败: $_"
                Write-Warn "请手动登录 Nacos 控制台 http://$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)/nacos"
                Write-Warn "  新建配置 -> data-id=global-config.yaml -> group=DEFAULT_GROUP -> 类型=yaml"
                Write-Warn "  内容来自: $NacosConfig"
            }
        }
    } else {
        Write-Info '已跳过 Nacos 配置导入（start.ps1 启动时会自动尝试）'
    }
} else {
    Write-Warn "Nacos 配置模板不存在: $NacosConfig"
}

# ===== 完成 =====
Write-Title '配置完成'
Write-Host '已生成配置文件: ' -NoNewline
Write-Host $ConfigEnv -ForegroundColor Green
Write-Host ''
Write-Host '下一步：' -ForegroundColor Cyan
Write-Host '  1. 确认 MySQL / Redis 已启动'
Write-Host '  2. 执行 ' -NoNewline
Write-Host '.\start.ps1' -ForegroundColor Yellow -NoNewline
Write-Host '  一键启动全部服务'
Write-Host ''
Write-Host '如需修改配置，可重新运行 setup.ps1 或直接编辑 config.env' -ForegroundColor Gray
Write-Host ''
Read-Host '按回车退出'
