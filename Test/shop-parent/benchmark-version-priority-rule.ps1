# VersionPriorityRule performance benchmark script.
# Measures end-to-end latency of order-server -> shop-product-service calls.
# Supports comparison between VersionPriorityRule and RandomRule.
#
# Example:
#   .\benchmark-version-priority-rule.ps1
#   .\benchmark-version-priority-rule.ps1 -Compare -Requests 500

[CmdletBinding()]
param(
    [int]$Requests = 1000,
    [int]$Warmup = 100,
    [string]$OrderUrl = 'http://localhost:8091/orders/test-product/1',
    [string]$ApplicationYml = 'd:\Programming\YQSX\Test\shop-parent\shop-order-server\src\main\resources\application.yml',
    [switch]$Compare
)

$ErrorActionPreference = 'Stop'

function Write-Stats($times, $label) {
    $sorted = $times | Sort-Object
    $avg = ($times | Measure-Object -Average).Average
    $min = $sorted[0]
    $max = $sorted[-1]
    $p50 = $sorted[[int](($sorted.Count - 1) * 0.50)]
    $p90 = $sorted[[int](($sorted.Count - 1) * 0.90)]
    $p99 = $sorted[[int](($sorted.Count - 1) * 0.99)]

    Write-Host ""
    Write-Host "[$label] samples: $($times.Count)" -ForegroundColor Cyan
    Write-Host "  Avg: $([math]::Round($avg, 3)) ms"
    Write-Host "  Min: $([math]::Round($min, 3)) ms"
    Write-Host "  Max: $([math]::Round($max, 3)) ms"
    Write-Host "  P50: $([math]::Round($p50, 3)) ms"
    Write-Host "  P90: $([math]::Round($p90, 3)) ms"
    Write-Host "  P99: $([math]::Round($p99, 3)) ms"
}

function Invoke-Benchmark($count, $warmup) {
    Write-Host ""
    Write-Host "[Warmup] sending $warmup requests..." -ForegroundColor DarkGray
    for ($i = 0; $i -lt $warmup; $i++) {
        try {
            $null = Invoke-WebRequest -Uri $OrderUrl -TimeoutSec 10 -ErrorAction Stop
        } catch {
            Write-Host "  warmup $i failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    Write-Host "[Benchmark] sending $count requests..." -ForegroundColor Green
    $times = New-Object System.Collections.Generic.List[Double]
    for ($i = 0; $i -lt $count; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $null = Invoke-WebRequest -Uri $OrderUrl -TimeoutSec 10 -ErrorAction Stop
        } catch {
            Write-Host "  request $i failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        $sw.Stop()
        $times.Add($sw.Elapsed.TotalMilliseconds)

        if (($i + 1) % 100 -eq 0) {
            Write-Host "  completed $($i + 1)/$count"
        }
    }
    return $times.ToArray()
}

function Set-Rule($ruleClass) {
    Write-Host ""
    Write-Host "[Config] switching load balancer rule to $ruleClass ..." -ForegroundColor Magenta
    $content = Get-Content $ApplicationYml -Raw
    $newContent = $content -replace 'NFLoadBalancerRuleClassName: .+', "NFLoadBalancerRuleClassName: $ruleClass"
    Set-Content -Path $ApplicationYml -Value $newContent -NoNewline
}

function Restart-OrderServer {
    Write-Host "[Restart] stopping order-server ..." -ForegroundColor Magenta
    $conn = Get-NetTCPConnection -LocalPort 8091 -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }

    Write-Host "[Restart] rebuilding order-server ..." -ForegroundColor Magenta
    $base = 'd:\Programming\YQSX\Test\shop-parent'
    & mvn clean package -pl shop-order-server -am -DskipTests -q
    if ($LASTEXITCODE -ne 0) {
        throw "Maven build failed"
    }

    Write-Host "[Restart] starting order-server ..." -ForegroundColor Magenta
    Start-Process -FilePath 'java' `
        -ArgumentList @('-jar', "$base\shop-order-server\target\shop-order-server-1.0-SNAPSHOT.jar", '--spring.profiles.active=dev') `
        -WorkingDirectory "$base\shop-order-server\target" `
        -WindowStyle Hidden

    $maxWait = 60
    $started = $false
    for ($i = 0; $i -lt $maxWait; $i++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-WebRequest -Uri 'http://localhost:8091/actuator/health' -TimeoutSec 2 -ErrorAction Stop
            $started = $true
            break
        } catch {
            # waiting
        }
    }
    if (-not $started) {
        throw "order-server startup timeout"
    }
    Write-Host "[Restart] order-server ready" -ForegroundColor Green
    Start-Sleep -Seconds 5
}

$backupFile = "$ApplicationYml.bak"
Copy-Item -Path $ApplicationYml -Destination $backupFile -Force

trap {
    Write-Host ""
    Write-Host "[Trap] exception occurred, restoring original config..." -ForegroundColor Red
    Copy-Item -Path $backupFile -Destination $ApplicationYml -Force
    Remove-Item -Path $backupFile -Force -ErrorAction SilentlyContinue
    break
}

try {
    $results = @{}

    $results['VersionPriorityRule'] = Invoke-Benchmark -count $Requests -warmup $Warmup
    Write-Stats -times $results['VersionPriorityRule'] -label 'VersionPriorityRule'

    if ($Compare) {
        Set-Rule -ruleClass 'com.netflix.loadbalancer.RandomRule'
        Restart-OrderServer
        $results['RandomRule'] = Invoke-Benchmark -count $Requests -warmup $Warmup
        Write-Stats -times $results['RandomRule'] -label 'RandomRule'

        Set-Rule -ruleClass 'com.gec.shop.order.ribbon.VersionPriorityRule'
        Restart-OrderServer

        $diffAvg = ($results['VersionPriorityRule'] | Measure-Object -Average).Average - ($results['RandomRule'] | Measure-Object -Average).Average
        Write-Host ""
        Write-Host "[Compare] VersionPriorityRule Avg - RandomRule Avg = $([math]::Round($diffAvg, 3)) ms" -ForegroundColor Cyan
        if ($diffAvg -gt 0) {
            Write-Host "  VersionPriorityRule is slower by $([math]::Round($diffAvg, 3)) ms on average" -ForegroundColor Yellow
        } else {
            Write-Host "  VersionPriorityRule is faster by $([math]::Round([math]::Abs($diffAvg), 3)) ms on average" -ForegroundColor Green
        }
    }
} finally {
    if (Test-Path $backupFile) {
        Write-Host ""
        Write-Host "[Cleanup] restoring original config..." -ForegroundColor DarkGray
        Copy-Item -Path $backupFile -Destination $ApplicationYml -Force
        Remove-Item -Path $backupFile -Force -ErrorAction SilentlyContinue
    }
}
