<#
.SYNOPSIS
    DIN 推荐接口功能与 Sentinel 限流压测脚本

.DESCRIPTION
    1. 对 /api/products/din/topk 进行单点功能测试
    2. 并发压测验证 Sentinel QPS 限流是否生效
    3. 输出 Success/Blocked/Fallback/Error 四类统计

.PARAMETER GatewayUrl
    Gateway 统一入口地址

.PARAMETER UserId
    测试用户 ID

.PARAMETER K
    推荐数量（最大 40）

.PARAMETER Concurrency
    并发线程数

.PARAMETER DurationSeconds
    压测持续时间
#>
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [int]$UserId = 1,
    [int]$K = 8,
    [int]$Concurrency = 20,
    [int]$DurationSeconds = 15
)

$ErrorActionPreference = "SilentlyContinue"

$recommendUrl = "$GatewayUrl/api/products/din/topk?userId=$UserId&k=$K"

function Test-SingleRequest {
    Write-Host "`n[1/3] 单点功能测试: $recommendUrl" -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri $recommendUrl -Method GET -UseBasicParsing -TimeoutSec 10
        $json = $resp.Content | ConvertFrom-Json
        Write-Host "状态码: $($resp.StatusCode)" -ForegroundColor Green
        Write-Host "响应体摘要:" -ForegroundColor Green
        Write-Host "  userId     : $($json.userId)"
        Write-Host "  products   : $(($json.products | Measure-Object).Count)"
        Write-Host "  hitCache   : $($json.hitCache)"
        Write-Host "  latencyMs  : $($json.latencyMs)"
        Write-Host "  fallback   : $($json.fallback)"
        Write-Host "  status     : $($json.status)"
        Write-Host "  reason     : $($json.reason)"
        Write-Host "  modelVer   : $($json.modelVersion)"
    }
    catch {
        Write-Host "单点请求失败: $_" -ForegroundColor Red
    }
}

function Test-Stress {
    Write-Host "`n[2/3] 并发压测: Concurrency=$Concurrency, Duration=${DurationSeconds}s" -ForegroundColor Cyan

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $success = 0
    $blocked = 0
    $fallback = 0
    $error = 0
    $count = 0

    while ($sw.Elapsed.TotalSeconds -lt $DurationSeconds) {
        $jobs = @()
        for ($i = 0; $i -lt $Concurrency; $i++) {
            $jobs += Start-Job -ScriptBlock {
                param($u)
                try {
                    $resp = Invoke-WebRequest -Uri $u -Method GET -UseBasicParsing -TimeoutSec 5
                    return @{ status = $resp.StatusCode; body = $resp.Content }
                }
                catch {
                    $status = 0
                    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                        $status = $_.Exception.Response.StatusCode.Value__
                    }
                    return @{ status = $status; body = $_.Exception.Message }
                }
            } -ArgumentList $recommendUrl
        }
        $results = $jobs | Wait-Job | Receive-Job
        Remove-Job -Job $jobs

        foreach ($r in $results) {
            $count++
            if ($r.status -eq 200) {
                # 根据 status 字段区分正常/降级/限流
                if ($r.body -match '"status"\s*:\s*"blocked"') {
                    $blocked++
                }
                elseif ($r.body -match '"status"\s*:\s*"fallback"') {
                    $fallback++
                }
                else {
                    $success++
                }
            }
            elseif ($r.status -eq 429) {
                $blocked++
            }
            else {
                $error++
            }
        }
    }
    $sw.Stop()

    Write-Host "`n压测结果统计:" -ForegroundColor Green
    [PSCustomObject]@{
        Resource      = "product.dinTopK"
        Url           = $recommendUrl
        Duration      = "$DurationSeconds s"
        Total         = $count
        Success       = $success
        Blocked       = $blocked
        Fallback      = $fallback
        Error         = $error
        QPS           = [math]::Round($count / $DurationSeconds, 2)
        SuccessRate   = [math]::Round($success / [math]::Max($count, 1) * 100, 2).ToString() + "%"
    } | Format-Table -AutoSize
}

function Test-DirectPythonService {
    param([string]$PythonUrl = "http://127.0.0.1:8000/api/recommend/topk?userId=$UserId&k=$K")
    Write-Host "`n[3/3] 直连 Python 推荐服务健康检查: $PythonUrl" -ForegroundColor Cyan
    try {
        $resp = Invoke-WebRequest -Uri $PythonUrl -Method GET -UseBasicParsing -TimeoutSec 5
        Write-Host "Python 服务响应状态码: $($resp.StatusCode)" -ForegroundColor Green
    }
    catch {
        Write-Host "Python 服务不可达: $_" -ForegroundColor Yellow
        Write-Host "（若 Python 服务未启动，SpringBoot 会降级返回热销商品，属于预期行为）" -ForegroundColor Gray
    }
}

Write-Host "============================================"
Write-Host "DIN 推荐接口测试脚本"
Write-Host "============================================"

Test-SingleRequest
Test-Stress
Test-DirectPythonService

Write-Host "`n============================================"
Write-Host "测试完成。建议同步观察 Sentinel Dashboard"
Write-Host "============================================"
