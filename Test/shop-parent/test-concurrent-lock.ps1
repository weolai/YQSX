<#
.SYNOPSIS
    Concurrent test script to verify Redis distributed lock for duplicate order/payment protection.

.DESCRIPTION
    - order mode: concurrently call order-server /orders/save with same uid+pid.
      Expect: only 1 order created in DB, others return existing order or blocked.
    - payment mode: create 1 WAIT_PAY order, then concurrently call payment-server /payment/pay.
      Expect: only 1 payment success, others return locked or already-paid.

.PARAMETER TestType
    order or payment, default order.

.PARAMETER Concurrency
    concurrent request count, default 20.

.PARAMETER OrderServerUrl
    default http://localhost:8091.

.PARAMETER PaymentServerUrl
    default http://localhost:8084.
#>
param(
    [ValidateSet("order", "payment")]
    [string]$TestType = "order",
    [int]$Concurrency = 20,
    [string]$OrderServerUrl = "http://localhost:8091",
    [string]$PaymentServerUrl = "http://localhost:8084"
)

$ErrorActionPreference = "SilentlyContinue"

function Send-Request($Url, $Method = "POST") {
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 10
        return @{ statusCode = $resp.StatusCode; body = $resp.Content }
    }
    catch {
        return @{ statusCode = $_.Exception.Response.StatusCode.Value__; body = $_.Exception.Message }
    }
}

function Invoke-Concurrent($Url) {
    $jobs = @()
    for ($i = 0; $i -lt $Concurrency; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($u)
            try {
                $resp = Invoke-WebRequest -Uri $u -Method POST -UseBasicParsing -TimeoutSec 10
                return @{ statusCode = $resp.StatusCode; body = $resp.Content }
            }
            catch {
                return @{ statusCode = $_.Exception.Response.StatusCode.Value__; body = $_.Exception.Message }
            }
        } -ArgumentList $Url
    }
    $results = $jobs | Wait-Job | Receive-Job
    Remove-Job -Job $jobs
    return $results
}

function Test-OrderLock {
    Write-Host "`n[Order duplicate creation test]"
    Write-Host "Concurrency=$Concurrency, uid=77777, pid=1"

    $url = '{0}/orders/save?pid=1&uid=77777' -f $OrderServerUrl
    $results = Invoke-Concurrent -Url $url

    $returned = 0
    $blocked = 0
    $errorCount = 0
    $orderIds = @()

    foreach ($r in $results) {
        $body = $r.body
        if ($body -match '"id":\s*(\d+)') {
            $id = [long]$Matches[1]
            $orderIds += $id
            if ($id -gt 0) { $returned++ }
        }
        elseif ($body -match 'BLOCKED') {
            $blocked++
        }
        else {
            $errorCount++
        }
    }

    $distinctIds = $orderIds | Sort-Object -Unique

    Write-Host "`nResult summary:"
    Write-Host "  Returned order (id>0): $returned"
    Write-Host "  Sentinel BLOCKED: $blocked"
    Write-Host "  Error/exception: $errorCount"
    Write-Host "  Order IDs returned: $($orderIds -join ', ')"
    Write-Host "  Distinct order IDs: $($distinctIds.Count)"

    if ($distinctIds.Count -eq 1) {
        Write-Host "`n[PASSED] Redis lock works: only 1 order created under concurrency." -ForegroundColor Green
    }
    else {
        Write-Host "`n[FAILED] Redis lock failed: duplicate orders created." -ForegroundColor Red
    }
}

function Test-PaymentLock {
    Write-Host "`n[Payment duplicate test]"

    $createUrl = '{0}/orders/save?pid=1&uid=88888' -f $OrderServerUrl
    Write-Host "1. Create WAIT_PAY order: $createUrl"
    $createResp = Send-Request -Url $createUrl
    if ($createResp.statusCode -ne 200 -or $createResp.body -notmatch '"id":\s*(\d+)') {
        Write-Host "Create order failed: $($createResp.body)" -ForegroundColor Red
        return
    }
    $orderId = [long]$Matches[1]
    Write-Host "   Created orderId=$orderId"

    $payUrl = '{0}/payment/pay?orderId={1}' -f $PaymentServerUrl, $orderId
    Write-Host "2. Concurrent pay $Concurrency requests: $payUrl"
    $results = Invoke-Concurrent -Url $payUrl

    $paySuccess = 0
    $paying = 0
    $paid = 0
    $blocked = 0
    $errorCount = 0

    foreach ($r in $results) {
        $body = $r.body
        if ($body -match 'payment success') {
            $paySuccess++
        }
        elseif ($body -match 'is paying') {
            $paying++
        }
        elseif ($body -match 'already paid') {
            $paid++
        }
        elseif ($body -match 'BLOCKED') {
            $blocked++
        }
        else {
            $errorCount++
        }
    }

    Write-Host "`nResult summary:"
    Write-Host "  Payment success: $paySuccess"
    Write-Host "  Locked (is paying): $paying"
    Write-Host "  Already paid: $paid"
    Write-Host "  Sentinel BLOCKED: $blocked"
    Write-Host "  Error/exception: $errorCount"

    Start-Sleep -Milliseconds 500
    $queryUrl = '{0}/orders/{1}' -f $OrderServerUrl, $orderId
    $queryResp = Send-Request -Url $queryUrl -Method "GET"
    Write-Host "`nFinal order status: $($queryResp.body)"

    if ($paySuccess -eq 1) {
        Write-Host "`n[PASSED] Redis lock works: only 1 payment success under concurrency." -ForegroundColor Green
    }
    else {
        Write-Host "`n[FAILED] Redis lock failed: duplicate payment or payment exception." -ForegroundColor Red
    }
}

Write-Host "============================================"
Write-Host "Redis distributed lock concurrent test"
Write-Host "TestType=$TestType, Concurrency=$Concurrency"
Write-Host "============================================"

if ($TestType -eq "order") {
    Test-OrderLock
}
else {
    Test-PaymentLock
}
