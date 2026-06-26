<#
.SYNOPSIS
    YQSX 项目打包脚本（在开发机执行，生成可分发的 YQSX-dist.zip）
.DESCRIPTION
    收集以下内容到一个分发包：
      - dist-pack/         配置/启动/停止脚本 + SQL + Nacos 配置模板
      - Test/shop-parent/  后端源码 + 已构建的 jar（target/*.jar）
      - shop-web-next/     前端源码（不含 node_modules / .next）
      - XML/nacos/         Nacos 服务端（已解压版）
      - XML/redis/          Redis 服务端
      - XML/zipkin-server-2.24.3-exec.jar
      - XML/sentinel-dashboard-1.8.9.jar
      - XML/yolo_recognition_model/recognition-service/  Python 识别服务源码
      - XML/yolo_recognition_model/models/pretrained/   预训练模型（含 best.pt 拷贝）
      - docs/              项目文档（精简版）
    排除：node_modules / .next / target 中间产物 / .git / 大数据集 / JMeter / archive.rar
.NOTES
    使用方式：powershell -ExecutionPolicy Bypass -File .\package.ps1
    输出：dist-pack\YQSX-dist.zip
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path }
if ((Split-Path $ROOT -Leaf) -eq 'dist-pack') {
    $PROJECT_ROOT = Split-Path -Parent $ROOT
} else {
    $PROJECT_ROOT = $ROOT
}

$StageDir = Join-Path $ROOT 'stage'
$ZipPath  = Join-Path $ROOT 'YQSX-dist.zip'

function Write-Title($t) { Write-Host ''; Write-Host ('=' * 60) -ForegroundColor Cyan; Write-Host "  $t" -ForegroundColor Cyan; Write-Host ('=' * 60) -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Gray }
function Write-Err($m)  { Write-Host "[ERR]  $m" -ForegroundColor Red }

function Get-DirSizeMB($path) {
    if (-not (Test-Path $path)) { return 0 }
    try {
        $sum = (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        return [Math]::Round(($sum / 1MB), 1)
    } catch { return 0 }
}

Write-Title 'YQSX 项目打包脚本'
Write-Host "项目根目录: $PROJECT_ROOT"
Write-Host "暂存目录  : $StageDir"
Write-Host "输出文件  : $ZipPath"
Write-Host ''

# ===== 步骤 0：清理旧的暂存目录与 zip =====
Write-Title '步骤 0/7：清理旧产物'
if (Test-Path $StageDir) {
    Write-Info "删除旧暂存目录: $StageDir"
    Remove-Item $StageDir -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $ZipPath) {
    Write-Info "删除旧 zip: $ZipPath"
    Remove-Item $ZipPath -Force
}
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null
Write-OK '已清理'

# ===== 步骤 1：检查 jar 是否已构建 =====
Write-Title '步骤 1/7：检查后端 jar 是否已构建'
$services = @(
    'shop-gateway-server', 'shop-product-server', 'shop-user-server',
    'shop-payment-server', 'shop-order-server'
)
$missingJars = @()
foreach ($s in $services) {
    $jar = Join-Path $PROJECT_ROOT "Test\shop-parent\$s\target\$s-1.0-SNAPSHOT.jar"
    if (Test-Path $jar) {
        $size = [Math]::Round((Get-Item $jar).Length / 1MB, 1)
        Write-OK "$s : $size MB"
    } else {
        Write-Warn "$s : 缺失"
        $missingJars += $s
    }
}
if ($missingJars.Count -gt 0) {
    Write-Err "以下 jar 未构建: $($missingJars -join ', ')"
    Write-Host '请先在 Test/shop-parent 目录执行: mvn clean package -DskipTests' -ForegroundColor Yellow
    Read-Host '按回车退出'
    exit 1
}

# ===== 步骤 2：复制 dist-pack =====
Write-Title '步骤 2/7：复制打包脚本目录'
$dstDistPack = Join-Path $StageDir 'dist-pack'
robocopy $ROOT $dstDistPack /E /XD stage /XF YQSX-dist.zip /NJH /NJS /NFL /NDL /NP | Out-Null
Write-OK "已复制 dist-pack -> $dstDistPack"

# ===== 步骤 3：复制后端源码 + jar =====
Write-Title '步骤 3/7：复制后端项目（源码 + jar，排除中间产物）'
$srcShopParent = Join-Path $PROJECT_ROOT 'Test\shop-parent'
$dstShopParent = Join-Path $StageDir 'Test\shop-parent'
# robocopy 排除：target 中的除 *.jar 外的内容
# 思路：先排除 target，再单独拷贝 jar
robocopy $srcShopParent $dstShopParent /E /XD target .idea /XF *.iml *.log /NJH /NJS /NFL /NDL /NP | Out-Null
# 单独拷贝 target 中的 jar 文件
foreach ($s in $services) {
    $srcJarDir = Join-Path $srcShopParent "$s\target"
    $dstJarDir = Join-Path $dstShopParent "$s\target"
    New-Item -ItemType Directory -Path $dstJarDir -Force | Out-Null
    Get-ChildItem $srcJarDir -Filter '*.jar' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination $dstJarDir -Force
    }
}
Write-OK "后端项目已复制（jar 已包含，classes/test-classes 已排除）"

# ===== 步骤 4：复制前端 =====
Write-Title '步骤 4/7：复制前端项目（排除 node_modules / .next）'
$srcFrontend = Join-Path $PROJECT_ROOT 'shop-web-next'
$dstFrontend = Join-Path $StageDir 'shop-web-next'
if (Test-Path $srcFrontend) {
    robocopy $srcFrontend $dstFrontend /E /XD node_modules .next .git /NJH /NJS /NFL /NDL /NP | Out-Null
    Write-OK "前端已复制 -> $dstFrontend"
} else {
    Write-Warn "前端目录不存在: $srcFrontend"
}

# ===== 步骤 5：复制基础设施（Nacos / Redis / Zipkin / Sentinel / Maven）=====
Write-Title '步骤 5/7：复制基础设施（Nacos / Redis / Zipkin / Sentinel）'

# Nacos
$srcNacos = Join-Path $PROJECT_ROOT 'XML\nacos'
$dstNacos = Join-Path $StageDir 'XML\nacos'
if (Test-Path $srcNacos) {
    Write-Info "复制 Nacos（约 $(Get-DirSizeMB $srcNacos) MB）..."
    # 排除 logs / bin/logs / data / derby-db（运行时数据）
    robocopy $srcNacos $dstNacos /E /XD logs bin\logs data derby-db /NJH /NJS /NFL /NDL /NP | Out-Null
    Write-OK "Nacos 已复制"
} else { Write-Warn "Nacos 目录不存在: $srcNacos" }

# Redis
$srcRedis = Join-Path $PROJECT_ROOT 'XML\redis'
$dstRedis = Join-Path $StageDir 'XML\redis'
if (Test-Path $srcRedis) {
    Write-Info "复制 Redis（约 $(Get-DirSizeMB $srcRedis) MB）..."
    robocopy $srcRedis $dstRedis /E /NJH /NJS /NFL /NDL /NP | Out-Null
    Write-OK "Redis 已复制"
} else { Write-Warn "Redis 目录不存在: $srcRedis" }

# Zipkin jar
$srcZipkin = Join-Path $PROJECT_ROOT 'XML\zipkin-server-2.24.3-exec.jar'
if (Test-Path $srcZipkin) {
    $dstXml = Join-Path $StageDir 'XML'
    New-Item -ItemType Directory -Path $dstXml -Force | Out-Null
    Copy-Item $srcZipkin -Destination $dstXml -Force
    Write-OK "Zipkin jar 已复制"
} else { Write-Warn "Zipkin jar 不存在: $srcZipkin" }

# Sentinel jar
$srcSentinel = Join-Path $PROJECT_ROOT 'XML\sentinel-dashboard-1.8.9.jar'
if (Test-Path $srcSentinel) {
    $dstXml = Join-Path $StageDir 'XML'
    Copy-Item $srcSentinel -Destination $dstXml -Force
    Write-OK "Sentinel jar 已复制"
} else { Write-Warn "Sentinel jar 不存在: $srcSentinel" }

# ===== 步骤 6：复制 AI 识别服务 + 模型权重 =====
Write-Title '步骤 6/7：复制 AI 识别服务 + 模型权重'

# 识别服务源码
$srcRecog = Join-Path $PROJECT_ROOT 'XML\yolo_recognition_model\recognition-service'
$dstRecog = Join-Path $StageDir 'XML\yolo_recognition_model\recognition-service'
if (Test-Path $srcRecog) {
    Write-Info "复制识别服务源码..."
    robocopy $srcRecog $dstRecog /E /XD __pycache__ logs .venv venv /NJH /NJS /NFL /NDL /NP | Out-Null
    Write-OK "识别服务源码已复制"
} else { Write-Warn "识别服务目录不存在: $srcRecog" }

# 找到 best.pt 并复制到 pretrained 目录
$bestPt = Get-ChildItem -Path (Join-Path $PROJECT_ROOT 'XML\yolo_recognition_model') -Recurse -Filter 'best.pt' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($bestPt) {
    $dstPretrained = Join-Path $StageDir 'XML\yolo_recognition_model\recognition-service\models\pretrained'
    New-Item -ItemType Directory -Path $dstPretrained -Force | Out-Null
    $dstBestPt = Join-Path $dstPretrained 'best.pt'
    Copy-Item $bestPt.FullName -Destination $dstBestPt -Force
    Write-OK "best.pt 已复制 ($(Get-DirSizeMB $dstBestPt) MB) -> $($dstBestPt)"

    # 同时修正识别服务的 .env：将 MODEL_PATH 指向打包后的相对路径
    $envFile = Join-Path $dstRecog '.env'
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw -Encoding UTF8
        $envContent = $envContent -replace 'MODEL_PATH=.*', "MODEL_PATH=./models/pretrained/best.pt"
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        Write-OK "识别服务 .env 已修正 MODEL_PATH=./models/pretrained/best.pt"
    }
} else {
    Write-Warn "未找到 best.pt，识别服务将使用 yolov8n.pt 兜底（识别准确率会下降）"
}

# ===== 步骤 7：复制文档与启动器 =====
Write-Title '步骤 7/7：复制文档与根目录文件'

# docs 目录（精简版，排除 *.docx 等大文件）
$srcDocs = Join-Path $PROJECT_ROOT 'docs'
$dstDocs = Join-Path $StageDir 'docs'
if (Test-Path $srcDocs) {
    robocopy $srcDocs $dstDocs /E /XF *.docx /XD 前端参考 /NJH /NJS /NFL /NDL /NP | Out-Null
    Write-OK "docs 已复制（排除 *.docx）"
}

# 根目录文件
$rootFiles = @('README.md', 'CLAUDE.md', '.gitignore', 'PROJECT_FINAL_REPORT.md')
foreach ($f in $rootFiles) {
    $src = Join-Path $PROJECT_ROOT $f
    if (Test-Path $src) {
        Copy-Item $src -Destination $StageDir -Force
        Write-OK "已复制 $f"
    }
}

# ===== 统计大小 =====
$totalSize = Get-DirSizeMB $StageDir
Write-Host ''
Write-Info "暂存目录总大小: $totalSize MB"

# ===== 压缩 =====
Write-Title '压缩为 zip'
Write-Info "正在压缩到 $ZipPath（可能需要几分钟）..."
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
# 使用 .NET ZipFile.CreateFromDirectory（比 Compress-Archive 快且兼容性好）
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageDir, $ZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
$zipSize = [Math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-OK "压缩完成: $ZipPath ($zipSize MB)"

# 清理暂存目录
Write-Info '清理暂存目录...'
Remove-Item $StageDir -Recurse -Force -ErrorAction SilentlyContinue

# ===== 完成 =====
Write-Title '打包完成'
Write-Host '分发方式：' -ForegroundColor Cyan
Write-Host "  1. 将 $ZipPath 拷贝到目标电脑"
Write-Host '  2. 解压到任意目录（路径不要含中文/空格）'
Write-Host '  3. 双击 dist-pack\setup.ps1 配置环境'
Write-Host '  4. 双击 dist-pack\start.ps1 启动项目'
Write-Host ''
Write-Host '前置要求（目标电脑需安装）：' -ForegroundColor Yellow
Write-Host '  - JDK 11+        https://adoptium.net/'
Write-Host '  - Node.js 18+    https://nodejs.org/'
Write-Host '  - MySQL 8.0+     https://dev.mysql.com/downloads/installer/'
Write-Host '  - Python 3.10+    https://www.python.org/downloads/'
Write-Host '  - Miniconda       https://docs.conda.io/projects/miniconda/'
Write-Host ''
