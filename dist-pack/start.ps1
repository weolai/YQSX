<#
.SYNOPSIS
    YQSX 项目一键启动脚本
.DESCRIPTION
    读取 config.env 后按顺序启动：
      Zipkin -> Nacos -> Redis(若未运行) -> 5 个 Java 微服务(并行) -> AI 识别服务 -> 前端
    通过环境变量覆盖：
      DB_USER / DB_PASSWORD            -> 直接读取（application.yml 已用 ${DB_USER:root}）
      SPRING_CLOUD_NACOS_CONFIG_SERVER_ADDR / SPRING_CLOUD_NACOS_DISCOVERY_SERVER_ADDR -> 覆盖 bootstrap.yml 硬编码
      SPRING_REDIS_HOST / SPRING_REDIS_PORT -> 覆盖 order/payment 的 localhost
      DIN_RECOMMEND_URL                -> 覆盖 product 的 din.recommend.url
.NOTES
    使用方式：powershell -ExecutionPolicy Bypass -File .\start.ps1
    按 Ctrl+C 停止全部服务
#>

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path }
if ((Split-Path $ROOT -Leaf) -eq 'dist-pack') {
    $PROJECT_ROOT = Split-Path -Parent $ROOT
} else {
    $PROJECT_ROOT = $ROOT
}

$ConfigEnv     = Join-Path $ROOT 'config.env'
$NacosConfig   = Join-Path $ROOT 'nacos-config\global-config.yaml'
$LogsDir       = Join-Path $PROJECT_ROOT 'logs'
$ZipkinJar     = Join-Path $PROJECT_ROOT 'XML\zipkin-server-2.24.3-exec.jar'
$NacosStartup  = Join-Path $PROJECT_ROOT 'XML\nacos\bin\startup.cmd'
$SentinelJar   = Join-Path $PROJECT_ROOT 'XML\sentinel-dashboard-1.8.9.jar'
$RedisServer   = Join-Path $PROJECT_ROOT 'XML\redis\redis-server.exe'
$FrontendDir   = Join-Path $PROJECT_ROOT 'shop-web-next'
$RecogDir      = Join-Path $PROJECT_ROOT 'XML\yolo_recognition_model\recognition-service'

New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null

# ---------- 工具函数 ----------
function Write-Title($t) { Write-Host ''; Write-Host ('=' * 60) -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host ('=' * 60) -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "[ERR]  $m" -ForegroundColor Red }
function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Gray }
function Write-Step($n, $m) { Write-Host ''; Write-Host "[$n] $m" -ForegroundColor Cyan }

function Test-Port($port, $destHost = '127.0.0.1', $timeoutMs = 500) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($destHost, $port, $null, $null)
        $ok = $iar.AsyncWaitHandle.WaitOne($timeoutMs, $false)
        if ($ok -and $tcp.Connected) { $tcp.Close(); return $true }
        $tcp.Close(); return $false
    } catch { return $false }
}

function Wait-Port($port, $name, $maxWait = 120, $interval = 2) {
    Write-Info "等待 $name (port $port) 就绪..."
    $elapsed = 0
    while ($elapsed -lt $maxWait) {
        if (Test-Port -port $port) { Write-OK "$name (port $port) 已就绪"; return $true }
        Start-Sleep -Seconds $interval
        $elapsed += $interval
    }
    Write-Err "$name (port $port) 启动超时"
    return $false
}

# 启动一个后台进程，输出重定向到日志文件
$script:Processes = @()
function Start-BgProcess($cmd, $args, $cwd, $name) {
    $logFile = Join-Path $LogsDir "$name.log"
    Write-Info "启动 $name -> 日志: $logFile"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $cmd
    if ($args) { foreach ($a in $args) { $psi.ArgumentList.Add($a) } }
    $psi.WorkingDirectory = if ($cwd) { $cwd } else { (Get-Location).Path }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    # 环境变量继承
    $psi.EnvironmentVariables.Clear()
    foreach ($key in [System.Environment]::GetEnvironmentVariables().Keys) {
        $psi.EnvironmentVariables[$key] = [System.Environment]::GetEnvironmentVariable($key)
    }
    $p = [System.Diagnostics.Process]::Start($psi)
    # 异步读取输出到日志（防止缓冲区满）
    $outTask = $p.StandardOutput.BaseStream.AsyncRead()
    $errTask = $p.StandardError.BaseStream.AsyncRead()
    $script:Processes += [PSCustomObject]@{ Name = $name; Process = $p; LogFile = $logFile; OutTask = $outTask; ErrTask = $errTask }
    return $p
}
# 注：上面 AsyncRead 不是内建方法，下面用更简单的重定向方式

function Start-BgProcessSimple($cmd, $argArray, $cwd, $name, $envHash = @{}) {
    $logFile = Join-Path $LogsDir "$name.log"
    Write-Info "启动 $name -> 日志: $logFile"
    $logStream = [System.IO.StreamWriter]::new($logFile, $true, [System.Text.Encoding]::UTF8)

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $cmd
    if ($argArray) { foreach ($a in $argArray) { [void]$psi.ArgumentList.Add($a) } }
    if ($cwd) { $psi.WorkingDirectory = $cwd }
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    # 注入额外环境变量
    foreach ($k in $envHash.Keys) { $psi.EnvironmentVariables[$k] = $envHash[$k] }

    $p = [System.Diagnostics.Process]::new()
    $p.StartInfo = $psi
    $scriptBlock = {
        param($proc, $writer)
        try {
            while (-not $proc.StandardOutput.EndOfStream) {
                $line = $proc.StandardOutput.ReadLine()
                if ($null -ne $line) { $writer.WriteLine($line); $writer.Flush() }
            }
        } catch {}
    }
    $null = Register-ObjectEvent -InputObject $p -EventName 'OutputDataReceived' -Action {
        if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} }
    } -MessageData $logStream
    $null = Register-ObjectEvent -InputObject $p -EventName 'ErrorDataReceived' -Action {
        if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} }
    } -MessageData $logStream

    [void]$p.Start()
    $p.BeginOutputReadLine()
    $p.BeginErrorReadLine()
    $script:Processes += [PSCustomObject]@{ Name = $name; Process = $p; LogFile = $logFile; LogStream = $logStream }
    return $p
}

# ---------- 读取 config.env ----------
if (-not (Test-Path $ConfigEnv)) {
    Write-Err "找不到 config.env，请先执行 setup.ps1 进行配置"
    Read-Host '按回车退出'
    exit 1
}
$cfg = @{}
Get-Content $ConfigEnv -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -gt 0) {
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim()
        $cfg[$k] = $v
    }
}

Write-Title 'YQSX 项目一键启动'
Write-Host "项目根: $PROJECT_ROOT"
Write-Host "配置  : $ConfigEnv"
Write-Host "日志  : $LogsDir"
Write-Host ''
Write-Host '配置摘要：' -ForegroundColor Gray
Write-Host ("  MySQL     : {0}:{1} (user={2})" -f $cfg.DB_HOST, $cfg.DB_PORT, $cfg.DB_USER) -ForegroundColor Gray
Write-Host ("  Redis     : {0}:{1}" -f $cfg.REDIS_HOST, $cfg.REDIS_PORT) -ForegroundColor Gray
Write-Host ("  Nacos     : {0}:{1}" -f $cfg.NACOS_HOST, $cfg.NACOS_PORT) -ForegroundColor Gray
Write-Host ("  识别服务  : {0}" -f $(if ($cfg.ENABLE_RECOGNITION -eq 'true') { '启用' } else { '关闭' })) -ForegroundColor Gray
Write-Host ("  前端      : {0}" -f $(if ($cfg.ENABLE_FRONTEND -eq 'true') { '启用' } else { '关闭' })) -ForegroundColor Gray

# 前置检查：MySQL 必须可达
Write-Step '0/7' '前置检查 MySQL / Redis'
if (-not (Test-Port -port $cfg.DB_PORT -destHost $(if ($cfg.DB_HOST -eq 'localhost') { '127.0.0.1' } else { $cfg.DB_HOST }))) {
    Write-Err "MySQL 端口 $($cfg.DB_PORT) 未开放，请先启动 MySQL 服务"
    Read-Host '按回车退出'
    exit 1
}
Write-OK 'MySQL 已就绪'

# Redis 自动启动（XML/redis/redis-server.exe）
if ($cfg.REDIS_HOST -eq 'localhost' -or $cfg.REDIS_HOST -eq '127.0.0.1') {
    if (-not (Test-Port -port $cfg.REDIS_PORT)) {
        if (Test-Path $RedisServer) {
            Write-Info "Redis 未运行，启动: $RedisServer"
            Start-BgProcessSimple -cmd $RedisServer -argArray @() -cwd (Split-Path $RedisServer) -name 'Redis' | Out-Null
            if (-not (Wait-Port -port $cfg.REDIS_PORT -name 'Redis' -maxWait 15)) {
                Write-Warn 'Redis 启动失败，order/payment 服务将无法启动'
            }
        } else {
            Write-Warn "Redis 未运行且找不到 $RedisServer，请手动启动 Redis"
        }
    } else { Write-OK 'Redis 已就绪' }
} else {
    if (-not (Test-Port -port $cfg.REDIS_PORT -destHost $cfg.REDIS_HOST)) {
        Write-Warn "远程 Redis $($cfg.REDIS_HOST):$($cfg.REDIS_PORT) 端口不可达"
    } else { Write-OK 'Redis 已就绪' }
}

# ---------- 1. Zipkin ----------
Write-Step '1/7' '启动 Zipkin 链路追踪 (port 9411)'
if (Test-Port -port 9411) { Write-OK 'Zipkin 已在运行' }
elseif (-not (Test-Path $ZipkinJar)) { Write-Warn "找不到 $ZipkinJar，跳过 Zipkin" }
else {
    Start-BgProcessSimple -cmd 'java' -argArray @('-Xmx384m', '-Xms384m', '-jar', $ZipkinJar) -cwd $PROJECT_ROOT -name 'Zipkin' | Out-Null
    Wait-Port -port 9411 -name 'Zipkin' -maxWait 60 | Out-Null
}

# ---------- 2. Nacos ----------
Write-Step '2/7' '启动 Nacos (port 8848)'
if (Test-Port -port $cfg.NACOS_PORT) { Write-OK 'Nacos 已在运行' }
elseif (-not (Test-Path $NacosStartup)) { Write-Warn "找不到 $NacosStartup，跳过 Nacos"; Write-Err 'Nacos 必需，无法继续'; exit 1 }
else {
    Start-BgProcessSimple -cmd 'cmd.exe' -argArray @('/c', $NacosStartup, '-m', 'standalone') -cwd (Split-Path $NacosStartup) -name 'Nacos' | Out-Null
    if (-not (Wait-Port -port $cfg.NACOS_PORT -name 'Nacos' -maxWait 180)) { Write-Err 'Nacos 启动失败'; exit 1 }
    Start-Sleep -Seconds 5
}

# 导入 global-config.yaml 到 Nacos
Write-Info '尝试导入 global-config.yaml 到 Nacos 配置中心...'
if (Test-Path $NacosConfig) {
    $cfgContent = Get-Content $NacosConfig -Raw -Encoding UTF8
    if ($cfg.ContainsKey('JWT_SECRET')) {
        $cfgContent = $cfgContent -replace 'secret:\s*.*', "secret: $($cfg.JWT_SECRET)"
    }
    $url = "http://$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)/nacos/v1/cs/configs"
    try {
        # 先删除避免旧值
        try { Invoke-RestMethod -Uri $url -Method Delete -Body @{ dataId='global-config.yaml'; group='DEFAULT_GROUP' } -TimeoutSec 5 | Out-Null } catch {}
        $body = @{ dataId='global-config.yaml'; group='DEFAULT_GROUP'; type='yaml'; content=$cfgContent }
        $resp = Invoke-RestMethod -Uri $url -Method Post -Body $body -TimeoutSec 10
        if ($resp -eq $true) { Write-OK 'global-config.yaml 已导入 Nacos' }
        else { Write-Warn "Nacos 导入返回: $resp" }
    } catch {
        Write-Warn "Nacos 导入失败: $_"
        Write-Warn '请手动登录 Nacos 控制台新建配置 data-id=global-config.yaml'
    }
} else {
    Write-Warn "找不到 $NacosConfig"
}

# ---------- 3. Java 微服务（并行启动）----------
Write-Step '3/7' '启动 Java 微服务（gateway / product / user / order / payment）'

# 准备 Java 服务通用环境变量（Spring Boot 通过环境变量覆盖 yml）
$javaEnv = @{
    'DB_USER'   = $cfg.DB_USER
    'DB_PASSWORD' = $cfg.DB_PASSWORD
    # Nacos server-addr 覆盖（针对 bootstrap.yml 中的 localhost:8848）
    'SPRING_CLOUD_NACOS_CONFIG_SERVER_ADDR' = "$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)"
    'SPRING_CLOUD_NACOS_DISCOVERY_SERVER_ADDR' = "$($cfg.NACOS_HOST):$($cfg.NACOS_PORT)"
    # Redis 覆盖（针对 order/payment 中的 localhost:6379）
    'SPRING_REDIS_HOST' = $cfg.REDIS_HOST
    'SPRING_REDIS_PORT' = $cfg.REDIS_PORT
    # DIN 推荐服务地址（product 服务）
    'DIN_RECOMMEND_URL' = if ($cfg.ContainsKey('DIN_RECOMMEND_URL')) { $cfg.DIN_RECOMMEND_URL } else { 'http://127.0.0.1:8000' }
}

$javaServices = @(
    @{ Name='gateway'; Port=8080; Jar="Test\shop-parent\shop-gateway-server\target\shop-gateway-server-1.0-SNAPSHOT.jar"; Xmx='512m' }
    @{ Name='product'; Port=8081; Jar="Test\shop-parent\shop-product-server\target\shop-product-server-1.0-SNAPSHOT.jar"; Xmx='512m' }
    @{ Name='user';    Port=8083; Jar="Test\shop-parent\shop-user-server\target\shop-user-server-1.0-SNAPSHOT.jar";    Xmx='384m' }
    @{ Name='order';   Port=8091; Jar="Test\shop-parent\shop-order-server\target\shop-order-server-1.0-SNAPSHOT.jar";   Xmx='384m' }
    @{ Name='payment'; Port=8084; Jar="Test\shop-parent\shop-payment-server\target\shop-payment-server-1.0-SNAPSHOT.jar"; Xmx='384m' }
)

# 顺序启动 5 个 Java 服务（每个启动后立即写日志，端口由后续统一等待）
foreach ($svc in $javaServices) {
    $jarPath = Join-Path $PROJECT_ROOT $svc.Jar
    if (Test-Port -port $svc.Port) { Write-OK "$($svc.Name) 已在运行 (port $($svc.Port))"; continue }
    if (-not (Test-Path $jarPath)) { Write-Err "找不到 $($svc.Name) jar: $jarPath"; continue }
    $logFile = Join-Path $LogsDir "Java-$($svc.Name).log"
    Write-Info "启动 $($svc.Name) -> 日志: $logFile"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'java'
    $jvmArgs = @("-Xmx$($svc.Xmx)", "-Xms$($svc.Xmx)", '-XX:+UseG1GC', '-XX:MaxGCPauseMillis=200', '-jar', $jarPath)
    foreach ($a in $jvmArgs) { [void]$psi.ArgumentList.Add($a) }
    $psi.WorkingDirectory = $PROJECT_ROOT
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    foreach ($k in $javaEnv.Keys) { $psi.EnvironmentVariables[$k] = $javaEnv[$k] }
    $p = [System.Diagnostics.Process]::new()
    $p.StartInfo = $psi
    $logStream = [System.IO.StreamWriter]::new($logFile, $true, [System.Text.Encoding]::UTF8)
    $null = Register-ObjectEvent -InputObject $p -EventName 'OutputDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
    $null = Register-ObjectEvent -InputObject $p -EventName 'ErrorDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
    [void]$p.Start()
    $p.BeginOutputReadLine()
    $p.BeginErrorReadLine()
    $script:Processes += [PSCustomObject]@{ Name = "Java-$($svc.Name)"; Process = $p; LogFile = $logFile; LogStream = $logStream }
}

# 等所有 Java 服务端口就绪
Write-Info '等待 Java 微服务全部就绪...'
$javaOk = $true
foreach ($svc in $javaServices) {
    $ready = Wait-Port -port $svc.Port -name $svc.Name -maxWait 90
    if (-not $ready) {
        $javaOk = $false
        Write-Err "$($svc.Name) 启动失败，请查看日志: $(Join-Path $LogsDir "Java-$($svc.Name).log")"
    }
}
if ($javaOk) { Write-OK '所有 Java 微服务已就绪' }

# ---------- 4. AI 识别服务 ----------
if ($cfg.ENABLE_RECOGNITION -eq 'true') {
    Write-Step '4/7' '启动 AI 识别服务 (port 8086)'
    if (Test-Port -port 8086) { Write-OK '识别服务已在运行' }
    elseif (-not (Test-Path $RecogDir)) { Write-Warn "识别服务目录不存在: $RecogDir，已跳过" }
    else {
        $conda = (Get-Command conda -ErrorAction SilentlyContinue).Source
        if (-not $conda) { Write-Warn '未找到 conda，跳过识别服务' }
        else {
            $logFile = Join-Path $LogsDir 'Recognition.log'
            $argList = @('run', '-n', 'AIDetection', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8086')
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $conda
            foreach ($a in $argList) { [void]$psi.ArgumentList.Add($a) }
            $psi.WorkingDirectory = $RecogDir
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.CreateNoWindow = $true
            $p = [System.Diagnostics.Process]::new()
            $p.StartInfo = $psi
            $logStream = [System.IO.StreamWriter]::new($logFile, $true, [System.Text.Encoding]::UTF8)
            $null = Register-ObjectEvent -InputObject $p -EventName 'OutputDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
            $null = Register-ObjectEvent -InputObject $p -EventName 'ErrorDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
            [void]$p.Start()
            $p.BeginOutputReadLine()
            $p.BeginErrorReadLine()
            $script:Processes += [PSCustomObject]@{ Name = 'Recognition'; Process = $p; LogFile = $logFile; LogStream = $logStream }
            Wait-Port -port 8086 -name 'Recognition' -maxWait 120 | Out-Null
        }
    }
} else {
    Write-Step '4/7' 'AI 识别服务未启用，跳过'
}

# ---------- 5. 前端 ----------
if ($cfg.ENABLE_FRONTEND -eq 'true') {
    Write-Step '5/7' '启动前端 (port $($cfg.FRONTEND_PORT))'
    if (Test-Port -port $cfg.FRONTEND_PORT) { Write-OK '前端已在运行' }
    elseif (-not (Test-Path $FrontendDir)) { Write-Warn "前端目录不存在: $FrontendDir" }
    else {
        $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
        if (-not $npm) { $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source }
        if (-not $npm) { Write-Warn '未找到 npm，跳过前端' }
        else {
            $logFile = Join-Path $LogsDir 'Frontend.log'
            # 检测是否已 build，决定 dev / start
            $hasBuild = Test-Path (Join-Path $FrontendDir '.next\BUILD_ID')
            $script = if ($hasBuild) { 'start' } else { 'dev' }
            Write-Info "使用 $script 模式启动前端"
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $npm
            [void]$psi.ArgumentList.Add('run')
            [void]$psi.ArgumentList.Add($script)
            $psi.WorkingDirectory = $FrontendDir
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.CreateNoWindow = $true
            $p = [System.Diagnostics.Process]::new()
            $p.StartInfo = $psi
            $logStream = [System.IO.StreamWriter]::new($logFile, $true, [System.Text.Encoding]::UTF8)
            $null = Register-ObjectEvent -InputObject $p -EventName 'OutputDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
            $null = Register-ObjectEvent -InputObject $p -EventName 'ErrorDataReceived' -Action { if ($EventArgs.Data) { try { $Event.MessageData.WriteLine($EventArgs.Data); $Event.MessageData.Flush() } catch {} } } -MessageData $logStream
            [void]$p.Start()
            $p.BeginOutputReadLine()
            $p.BeginErrorReadLine()
            $script:Processes += [PSCustomObject]@{ Name = 'Frontend'; Process = $p; LogFile = $logFile; LogStream = $logStream }
            Wait-Port -port $cfg.FRONTEND_PORT -name 'Frontend' -maxWait 60 | Out-Null
        }
    }
} else {
    Write-Step '5/7' '前端未启用，跳过'
}

# ---------- 完成 ----------
Write-Title '启动完成'
Write-Host '服务列表：'
Write-Host '  Gateway    : http://localhost:8080' -ForegroundColor Green
Write-Host '  前端       : http://localhost:' -NoNewline -ForegroundColor Green
Write-Host $cfg.FRONTEND_PORT -ForegroundColor Green
Write-Host '  Nacos 控制台: http://localhost:8848/nacos (nacos/nacos)' -ForegroundColor Gray
Write-Host '  Zipkin     : http://localhost:9411' -ForegroundColor Gray
Write-Host ''
Write-Host '测试账号：admin / 123456' -ForegroundColor Yellow
Write-Host ''
Write-Host '按 Ctrl+C 停止全部服务' -ForegroundColor Yellow
Write-Host '或执行 .\stop.ps1 停止' -ForegroundColor Gray
Write-Host ''

# 自动打开浏览器
try {
    Start-Process "http://localhost:$($cfg.FRONTEND_PORT)"
} catch {}

# 保持运行，等待中断
try {
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Write-Host ''
    Write-Host '正在停止全部服务...' -ForegroundColor Cyan
    foreach ($p in $script:Processes) {
        try {
            if ($p.Process -and -not $p.Process.HasExited) {
                $p.Process.Kill()
            }
        } catch {}
        if ($p.LogStream) { try { $p.LogStream.Close() } catch {} }
    }
    Write-Host '已停止' -ForegroundColor Green
}
