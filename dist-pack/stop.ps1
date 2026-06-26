<#
.SYNOPSIS
    YQSX 项目一键停止脚本
.DESCRIPTION
    按端口查找并停止所有 YQSX 相关进程：
      - 前端 (3000)、识别服务 (8086)、5 个 Java 微服务 (8080/8081/8083/8084/8091)
      - Sentinel (8858)、Nacos (8848)、Zipkin (9411)、Redis (6379)
    不会停止 MySQL（MySQL 由系统服务管理，请通过 services.msc 停止）
.NOTES
    使用方式：powershell -ExecutionPolicy Bypass -File .\stop.ps1
#>

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 服务端口列表（含名称与启动关键字，便于精确定位）
$targets = @(
    @{ Name = 'Frontend';     Port = 3000 }
    @{ Name = 'Recognition'; Port = 8086 }
    @{ Name = 'Gateway';     Port = 8080 }
    @{ Name = 'Product';     Port = 8081 }
    @{ Name = 'User';        Port = 8083 }
    @{ Name = 'Payment';      Port = 8084 }
    @{ Name = 'Order';       Port = 8091 }
    @{ Name = 'Sentinel';    Port = 8858 }
    @{ Name = 'Nacos';       Port = 8848 }
    @{ Name = 'Zipkin';      Port = 9411 }
    @{ Name = 'Redis';       Port = 6379 }
)

function Write-OK($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Gray }

function Stop-ByPort($port, $name) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Where-Object { $_.State -eq 'Listen' }
        if (-not $conns) { Write-Info "$name (port $port) 未运行"; return }
        foreach ($c in $conns) {
            $pid = $c.OwningProcess
            if ($pid -and $pid -ne 0) {
                try {
                    $proc = Get-Process -Id $pid -ErrorAction Stop
                    Write-Info "停止 $name (PID=$pid, $($proc.ProcessName))"
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                } catch {
                    Write-Warn "$name (PID=$pid) 进程不存在或无权限"
                }
            }
        }
    } catch {
        Write-Warn "停止 $name (port $port) 失败: $_"
    }
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  YQSX 项目停止全部服务' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '说明：MySQL 由系统服务管理，本脚本不会停止。' -ForegroundColor Gray
Write-Host '      如需停止 MySQL，请在 services.msc 中操作 MySQL80 服务。' -ForegroundColor Gray
Write-Host ''

foreach ($t in $targets) {
    Stop-ByPort -port $t.Port -name $t.Name
}

# 兜底：按进程名匹配 java / node / uvicorn / conda 中含 YQSX 相关 jar 路径的进程
Write-Host ''
Write-Info '兜底检查残留 java / node / uvicorn 进程...'
try {
    $javaProcs = Get-Process -Name java -ErrorAction SilentlyContinue
    foreach ($p in $javaProcs) {
        $cmdLine = try { (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction Stop).CommandLine } catch { '' }
        if ($cmdLine -match 'shop-(gateway|product|user|order|payment)-server|zipkin-server|sentinel-dashboard') {
            Write-Info "停止残留 java 进程 PID=$($p.Id): $($cmdLine.Substring(0, [Math]::Min(80, $cmdLine.Length)))"
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
} catch {}

# 等待 2 秒确认
Start-Sleep -Seconds 2
Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host '  全部服务已停止' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
