<#
.SYNOPSIS
    持续产生 Sentinel 流量，用于 Dashboard 实时观察
#>
param(
    [int]$Concurrency = 10,
    [int]$IntervalMs = 500
)

$ErrorActionPreference = "SilentlyContinue"

$endpoints = @(
    @{ url = "http://localhost:8081/products/1"; method = "GET" },
    @{ url = "http://localhost:8083/user/login"; method = "POST"; body = '{"username":"admin","password":"123456"}' },
    @{ url = "http://localhost:8091/orders/save?pid=1&uid=99999"; method = "POST" },
    @{ url = "http://localhost:8091/orders/1"; method = "GET" },
    @{ url = "http://localhost:8084/payment/pay?orderId=1"; method = "POST" }
)

while ($true) {
    $jobs = @()
    for ($i = 0; $i -lt $Concurrency; $i++) {
        $ep = $endpoints[$i % $endpoints.Length]
        $url = $ep.url
        $method = $ep.method
        $body = $ep.body
        $jobs += Start-Job -ScriptBlock {
            param($u, $m, $b)
            try {
                if ($b) {
                    Invoke-WebRequest -Uri $u -Method $m -Body $b -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 | Out-Null
                } else {
                    Invoke-WebRequest -Uri $u -Method $m -UseBasicParsing -TimeoutSec 5 | Out-Null
                }
            }
            catch {}
        } -ArgumentList $url, $method, $body
    }
    $jobs | Wait-Job | Receive-Job | Out-Null
    Remove-Job -Job $jobs
    Start-Sleep -Milliseconds $IntervalMs
}
