<#
.SYNOPSIS
    Sentinel 资源命名标准化压测脚本

.DESCRIPTION
    对标准化后的核心 Sentinel 资源并发施压，验证 Dashboard 中资源 QPS 与限流可见性。
#>
param(
    [int]$Concurrency = 20,
    [int]$DurationSeconds = 30
)

$ErrorActionPreference = "SilentlyContinue"

$endpoints = @(
    @{ name = "product.getById";  url = "http://localhost:8081/products/1"; method = "GET" },
    @{ name = "user.login";       url = "http://localhost:8083/user/login"; method = "POST"; body = '{"username":"admin","password":"123456"}' },
    @{ name = "order.create";     url = "http://localhost:8091/orders/save?pid=1&uid=99999"; method = "POST" },
    @{ name = "order.getById";    url = "http://localhost:8091/orders/1"; method = "GET" },
    @{ name = "order.updateStatus"; url = "http://localhost:8091/orders/updateStatus?id=1&status=PAID"; method = "POST" },
    @{ name = "payment.pay";      url = "http://localhost:8084/payment/pay?orderId=1"; method = "POST" }
)

function Invoke-Stress($ep) {
    $url = $ep.url
    $method = $ep.method
    $body = $ep.body
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $success = 0
    $blocked = 0
    $error = 0
    $count = 0

    while ($sw.Elapsed.TotalSeconds -lt $DurationSeconds) {
        $jobs = @()
        for ($i = 0; $i -lt $Concurrency; $i++) {
            $jobs += Start-Job -ScriptBlock {
                param($u, $m, $b)
                try {
                    $invokeParams = @{
                        Uri = $u
                        Method = $m
                        UseBasicParsing = $true
                        TimeoutSec = 10
                    }
                    if ($b) {
                        $invokeParams['Body'] = $b
                        $invokeParams['ContentType'] = 'application/json'
                    }
                    $resp = Invoke-WebRequest @invokeParams
                    return @{ status = $resp.StatusCode; body = $resp.Content }
                }
                catch {
                    $status = 0
                    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                        $status = $_.Exception.Response.StatusCode.Value__
                    }
                    return @{ status = $status; body = $_.Exception.Message }
                }
            } -ArgumentList $url, $method, $body
        }
        $results = $jobs | Wait-Job | Receive-Job
        Remove-Job -Job $jobs

        foreach ($r in $results) {
            $count++
            if ($r.status -eq 200) { $success++ }
            elseif ($r.body -match 'BLOCKED') { $blocked++ }
            else { $error++ }
        }
    }
    $sw.Stop()

    return [PSCustomObject]@{
        Resource = $ep.name
        Url = $url
        Duration = $DurationSeconds
        Total = $count
        Success = $success
        Blocked = $blocked
        Error = $error
        QPS = [math]::Round($count / $DurationSeconds, 2)
    }
}

Write-Host "============================================"
Write-Host "Sentinel standardized resource stress test"
Write-Host "Concurrency=$Concurrency, Duration=${DurationSeconds}s"
Write-Host "============================================"

$summary = @()
foreach ($ep in $endpoints) {
    Write-Host "`nStressing $($ep.name) ..."
    $result = Invoke-Stress -ep $ep
    $summary += $result
    Write-Host ($result | Format-Table -AutoSize | Out-String)
}

Write-Host "============================================"
Write-Host "Stress test summary"
Write-Host "============================================"
$summary | Format-Table -AutoSize
