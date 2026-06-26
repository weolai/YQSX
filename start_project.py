#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目一键启动脚本
启动顺序：Zipkin -> Nacos -> Java 微服务 -> 识别服务(可选) -> DIN推荐(可选) -> Prometheus/Grafana(可选) -> 前端
"""

import os
import sys
import time
import socket
import subprocess
import threading
import webbrowser
import ctypes
import shutil
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# 项目根目录（脚本所在目录）
ROOT = Path(__file__).resolve().parent

# 基础服务
ZIPKIN_JAR = ROOT / "XML" / "zipkin-server-2.24.3-exec.jar"
NACOS_STARTUP = ROOT / "XML" / "nacos" / "bin" / "startup.cmd"

# DIN 推荐服务
DIN_SCRIPT = ROOT / "din_model.py"
DIN_PORT = 8000

# Prometheus / Grafana
PROMETHEUS_DIR = ROOT / "XML" / "prometheus" / "prometheus-2.45.0.windows-amd64"
PROMETHEUS_EXE = PROMETHEUS_DIR / "prometheus.exe"
PROMETHEUS_PORT = 9090

GRAFANA_DIR = ROOT / "XML" / "grafana" / "grafana-10.1.0"
GRAFANA_BIN_DIR = GRAFANA_DIR / "bin"
GRAFANA_EXE = GRAFANA_BIN_DIR / "grafana-server.exe"
GRAFANA_PORT = 3001

# Java 服务配置
JAVA_SERVICES: List[Dict] = [
    {"name": "gateway", "jar": ROOT / "Test" / "shop-parent" / "shop-gateway-server" / "target" / "shop-gateway-server-1.0-SNAPSHOT.jar", "port": 8080},
    {"name": "product", "jar": ROOT / "Test" / "shop-parent" / "shop-product-server" / "target" / "shop-product-server-1.0-SNAPSHOT.jar", "port": 8081},
    {"name": "user", "jar": ROOT / "Test" / "shop-parent" / "shop-user-server" / "target" / "shop-user-server-1.0-SNAPSHOT.jar", "port": 8083},
    {"name": "payment", "jar": ROOT / "Test" / "shop-parent" / "shop-payment-server" / "target" / "shop-payment-server-1.0-SNAPSHOT.jar", "port": 8084},
    {"name": "order", "jar": ROOT / "Test" / "shop-parent" / "shop-order-server" / "target" / "shop-order-server-1.0-SNAPSHOT.jar", "port": 8091},
]

# 识别服务
RECOGNITION_DIR = ROOT / "XML" / "yolo_recognition_model" / "recognition-service"
RECOGNITION_PORT = 8086

# 前端
FRONTEND_DIR = ROOT / "shop-web-next"
FRONTEND_PORT = 3000

# 进程池，用于退出时清理
PROCESSES: List[subprocess.Popen] = []

# 服务日志目录
LOGS_DIR = ROOT / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def show_message(title: str, msg: str, msg_type: int = 0x40) -> int:
    """Windows 弹窗提示
    msg_type: 0x10=错误, 0x30=警告, 0x40=信息
    """
    try:
        return ctypes.windll.user32.MessageBoxW(0, msg, title, msg_type | 0x1000)
    except Exception as e:
        log(f"弹窗提示失败: {e}")
        return 0


def show_error(title: str, msg: str):
    """显示错误弹窗"""
    show_message(title, msg, msg_type=0x10)


def show_info(title: str, msg: str):
    """显示信息弹窗"""
    show_message(title, msg, msg_type=0x40)


def log(msg: str):
    """打印带时间戳的日志（强制刷新，避免缓冲导致看不到输出）"""
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def format_bytes(size: int) -> str:
    """将字节数格式化为易读的单位"""
    if size < 0:
        return "N/A"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def log_service_memory(name: str, port: int):
    """根据服务端口查找进程并记录其内存占用"""
    try:
        # 通过端口获取监听进程的 PID
        pid_result = subprocess.run(
            [
                "powershell",
                "-Command",
                f"(Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        pid_str = pid_result.stdout.strip()
        if not pid_str or not pid_str.isdigit():
            log(f"[{name}] 无法通过端口 {port} 获取进程 PID")
            return

        pid = int(pid_str)

        # 获取该 PID 的工作集内存
        mem_result = subprocess.run(
            [
                "powershell",
                "-Command",
                f"$p = Get-Process -Id {pid} -ErrorAction SilentlyContinue; if ($p) {{ '{name}|' + $p.Id + '|' + ($p.WorkingSet64) }} else {{ '' }}",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        line = mem_result.stdout.strip()
        if line:
            _, _, working_set_str = line.split("|", 2)
            working_set = int(working_set_str)
            log(f"[{name}] 启动完成，PID={pid}，工作集内存={format_bytes(working_set)}")
        else:
            log(f"[{name}] 启动完成，PID={pid}，无法读取内存")
    except Exception as e:
        log(f"[{name}] 记录内存占用时出错: {e}")


def log_system_memory():
    """记录系统整体内存使用情况"""
    try:
        result = subprocess.run(
            [
                "powershell",
                "-Command",
                "$os = Get-CimInstance Win32_OperatingSystem; 'TOTAL=' + $os.TotalVisibleMemorySize + '|FREE=' + $os.FreePhysicalMemory",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        line = result.stdout.strip()
        if line:
            parts = dict(item.split("=", 1) for item in line.split("|"))
            total_kb = int(parts.get("TOTAL", 0))
            free_kb = int(parts.get("FREE", 0))
            used_kb = total_kb - free_kb
            log(
                f"[系统内存] 总计={format_bytes(total_kb * 1024)}，"
                f"已用={format_bytes(used_kb * 1024)}，"
                f"空闲={format_bytes(free_kb * 1024)}"
            )
    except Exception as e:
        log(f"[系统内存] 获取失败: {e}")


def get_system_memory_mb() -> Tuple[int, int]:
    """获取系统总内存和空闲内存（单位 MB）"""
    try:
        result = subprocess.run(
            [
                "powershell",
                "-Command",
                "$os = Get-CimInstance Win32_OperatingSystem; 'TOTAL=' + $os.TotalVisibleMemorySize + '|FREE=' + $os.FreePhysicalMemory",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        line = result.stdout.strip()
        if line:
            parts = dict(item.split("=", 1) for item in line.split("|"))
            total_mb = int(parts.get("TOTAL", 0)) // 1024
            free_mb = int(parts.get("FREE", 0)) // 1024
            return total_mb, free_mb
    except Exception as e:
        log(f"获取系统内存失败: {e}")
    return 0, 0


def calculate_jvm_heap_sizes(total_mb: int) -> Dict[str, str]:
    """
    根据系统总内存动态计算各 Java 服务的 -Xmx。
    预留部分内存给操作系统、Nacos、Python 识别服务、前端及 JVM 非堆内存。
    """
    if total_mb <= 8192:  # <= 8GB
        sizes = {
            "Zipkin": 256,
            "gateway": 384,
            "product": 384,
            "user": 256,
            "order": 256,
            "payment": 256,
        }
    elif total_mb <= 16384:  # <= 16GB
        sizes = {
            "Zipkin": 384,
            "gateway": 512,
            "product": 512,
            "user": 384,
            "order": 384,
            "payment": 384,
        }
    elif total_mb <= 32768:  # <= 32GB
        sizes = {
            "Zipkin": 512,
            "gateway": 768,
            "product": 768,
            "user": 512,
            "order": 512,
            "payment": 512,
        }
    else:  # > 32GB
        sizes = {
            "Zipkin": 768,
            "gateway": 1024,
            "product": 1024,
            "user": 768,
            "order": 768,
            "payment": 768,
        }

    return {name: f"-Xmx{size}m" for name, size in sizes.items()}


def build_jvm_args(xmx: str) -> List[str]:
    """
    根据最大堆大小构建完整的 JVM 启动参数。
    -Xms = -Xmx：避免堆动态扩展开销
    G1GC：适合微服务小堆场景，降低 GC 停顿
    HeapDumpOnOutOfMemoryError：OOM 时自动转储便于排查
    """
    xms = xmx.replace("-Xmx", "-Xms")
    return [
        xms,
        xmx,
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=200",
        "-XX:+HeapDumpOnOutOfMemoryError",
        "-XX:HeapDumpPath=" + str(LOGS_DIR),
    ]


def print_jvm_plan(heap_sizes: Dict[str, str]):
    """打印 JVM 内存分配方案"""
    log("根据系统内存自动调整 Java 服务 -Xmx:")
    for name in ["Zipkin", "gateway", "product", "user", "order", "payment"]:
        log(f"  {name:10s} -> {heap_sizes[name]}")


def is_port_open(port: int, host: str = "127.0.0.1", timeout: float = 1.0) -> bool:
    """检查端口是否开放"""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def wait_for_port(port: int, name: str, max_wait: int = 120, interval: float = 2.0) -> bool:
    """等待指定端口开放"""
    log(f"等待 {name} (port {port}) 就绪...")
    elapsed = 0.0
    while elapsed < max_wait:
        if is_port_open(port):
            log(f"{name} (port {port}) 已就绪")
            return True
        time.sleep(interval)
        elapsed += interval
    log(f"{name} (port {port}) 启动超时")
    return False


def start_process(cmd: List[str], cwd: Optional[Path] = None, name: str = "", env: Optional[dict] = None) -> subprocess.Popen:
    """启动一个后台进程，输出重定向到日志文件，避免 PIPE 缓冲区满导致阻塞"""
    log_name = name or cmd[0]
    log(f"启动: {log_name}")
    # Windows 上使用 CREATE_NEW_PROCESS_GROUP，避免子进程继承控制台信号
    log_file = LOGS_DIR / f"{log_name.replace(':', '_').replace(' ', '_')}.log"
    log_file_handle = open(log_file, "a", encoding="utf-8")
    kwargs = {
        "cwd": str(cwd) if cwd else None,
        "stdout": log_file_handle,
        "stderr": log_file_handle,
        "creationflags": subprocess.CREATE_NEW_PROCESS_GROUP,
    }
    if env is not None:
        kwargs["env"] = env
    proc = subprocess.Popen(cmd, **kwargs)
    # 将文件句柄关联到进程，便于退出时关闭
    proc._log_file_handle = log_file_handle
    PROCESSES.append(proc)
    return proc


def start_zipkin(xmx: str = "-Xmx512m") -> bool:
    """启动 Zipkin"""
    if is_port_open(9411):
        log("Zipkin 已经在运行 (9411)")
        return True
    if not ZIPKIN_JAR.exists():
        log(f"错误：找不到 Zipkin jar 文件 {ZIPKIN_JAR}")
        return False
    jvm_args = build_jvm_args(xmx)
    start_process(["java"] + jvm_args + ["-jar", str(ZIPKIN_JAR)], name="Zipkin")
    if wait_for_port(9411, "Zipkin"):
        log_service_memory("Zipkin", 9411)
        return True
    return False


def start_nacos() -> bool:
    """启动 Nacos (standalone 模式)"""
    if is_port_open(8848):
        log("Nacos 已经在运行 (8848)")
        return True
    if not NACOS_STARTUP.exists():
        log(f"错误：找不到 Nacos 启动脚本 {NACOS_STARTUP}")
        return False
    # Nacos 的 startup.cmd 需要独立运行
    start_process(["cmd", "/c", str(NACOS_STARTUP), "-m", "standalone"], name="Nacos")
    if wait_for_port(8848, "Nacos", max_wait=180):
        log_service_memory("Nacos", 8848)
        return True
    return False


def start_java_service(service: Dict, xmx: str = "-Xmx384m") -> bool:
    """启动单个 Java 服务"""
    name = service["name"]
    port = service["port"]
    jar = service["jar"]

    if is_port_open(port):
        log(f"{name} 已经在运行 ({port})")
        return True
    if not jar.exists():
        log(f"错误：找不到 {name} 的 jar 文件 {jar}，请先执行 mvn package")
        return False

    jvm_args = build_jvm_args(xmx)
    start_process(["java"] + jvm_args + ["-jar", str(jar)], name=f"Java:{name}")
    if wait_for_port(port, name):
        log_service_memory(name, port)
        return True
    return False


def start_java_services(heap_sizes: Dict[str, str]) -> bool:
    """并行启动所有 Java 服务"""
    log("并行启动 Java 微服务...")
    results = {}
    threads = []

    def wrapper(svc: Dict):
        name = svc["name"]
        xmx = heap_sizes.get(name, "-Xmx384m")
        results[name] = start_java_service(svc, xmx)

    for svc in JAVA_SERVICES:
        t = threading.Thread(target=wrapper, args=(svc,))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    failed = [name for name, ok in results.items() if not ok]
    if failed:
        log(f"Java 服务启动失败: {', '.join(failed)}")
        return False
    log("所有 Java 微服务已就绪")
    return True


def get_recognition_conda_env() -> str:
    """检测可用的识别服务 conda 环境"""
    preferred = "AIDetection-service"
    fallback = "AIDetection"
    try:
        result = subprocess.run(
            ["conda", "env", "list"],
            capture_output=True, text=True, timeout=10
        )
        envs_output = result.stdout
        if preferred in envs_output:
            return preferred
    except Exception as e:
        log(f"检测 conda 环境失败: {e}")
    return fallback


def start_recognition() -> bool:
    """启动 Python 识别服务（可选，失败不阻塞主流程）"""
    if is_port_open(RECOGNITION_PORT):
        log(f"识别服务已经在运行 ({RECOGNITION_PORT})")
        return True
    if not RECOGNITION_DIR.exists():
        log(f"警告：找不到识别服务目录 {RECOGNITION_DIR}，跳过")
        return False

    conda_env = get_recognition_conda_env()
    log(f"使用 conda 环境: {conda_env}")
    cmd = [
        "conda", "run", "-n", conda_env,
        "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(RECOGNITION_PORT)
    ]
    start_process(cmd, cwd=RECOGNITION_DIR, name="Recognition")
    if wait_for_port(RECOGNITION_PORT, "Recognition", max_wait=120):
        log_service_memory("Recognition", RECOGNITION_PORT)
        return True
    log("警告：识别服务启动失败，核心购物流程仍可继续")
    return False


def has_production_build(frontend_dir: Path) -> bool:
    """检测前端是否已有生产构建产物（.next/BUILD_ID 存在）"""
    next_build_dir = frontend_dir / ".next"
    return next_build_dir.exists() and (next_build_dir / "BUILD_ID").exists()


def start_frontend() -> bool:
    """启动前端服务（优先使用生产构建，降低内存占用和提升首屏速度）"""
    if is_port_open(FRONTEND_PORT):
        log(f"前端已经在运行 ({FRONTEND_PORT})")
        return True
    if not FRONTEND_DIR.exists():
        log(f"错误：找不到前端目录 {FRONTEND_DIR}")
        return False

    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm_cmd:
        log("错误：找不到 npm 命令，请确认 Node.js 已安装并加入 PATH")
        return False

    # Windows 下 npm 是 .cmd 脚本，直接作为可执行文件启动会报 Win32 错误，
    # 因此通过 cmd.exe /c 调用。
    # 检测是否已有生产构建产物，有则直接生产模式启动，无则回退开发模式
    if has_production_build(FRONTEND_DIR):
        log("检测到已有生产构建产物，使用生产模式启动（内存更低、首屏更快）")
        start_process(["cmd", "/c", npm_cmd, "run", "start"], cwd=FRONTEND_DIR, name="Frontend")
    else:
        log("未检测到生产构建产物，使用开发模式启动（如需生产模式请先执行 npm run build）")
        start_process(["cmd", "/c", npm_cmd, "run", "dev"], cwd=FRONTEND_DIR, name="Frontend")

    if wait_for_port(FRONTEND_PORT, "Frontend", max_wait=60):
        log_service_memory("Frontend", FRONTEND_PORT)
        return True
    return False


def start_din_service() -> bool:
    """启动 DIN 推荐服务（可选）"""
    if is_port_open(DIN_PORT):
        log(f"DIN 推荐服务已经在运行 ({DIN_PORT})")
        return True
    if not DIN_SCRIPT.exists():
        log(f"警告：找不到 DIN 推荐服务脚本 {DIN_SCRIPT}，跳过")
        return False

    # 尝试使用项目根目录的 .venv
    venv_python = ROOT / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        python_cmd = str(venv_python)
    else:
        python_cmd = "python"

    start_process([python_cmd, str(DIN_SCRIPT), "--mode", "serve"], cwd=ROOT, name="DIN-Recommend")
    if wait_for_port(DIN_PORT, "DIN-Recommend", max_wait=60):
        log_service_memory("DIN-Recommend", DIN_PORT)
        return True
    log("警告：DIN 推荐服务启动失败")
    return False


def start_prometheus() -> bool:
    """启动 Prometheus（可选）"""
    if is_port_open(PROMETHEUS_PORT):
        log(f"Prometheus 已经在运行 ({PROMETHEUS_PORT})")
        return True
    if not PROMETHEUS_EXE.exists():
        log(f"警告：找不到 Prometheus {PROMETHEUS_EXE}，跳过")
        return False

    start_process(
        [str(PROMETHEUS_EXE), "--config.file=prometheus.yml", "--web.enable-lifecycle"],
        cwd=PROMETHEUS_DIR,
        name="Prometheus"
    )
    if wait_for_port(PROMETHEUS_PORT, "Prometheus", max_wait=60):
        return True
    log("警告：Prometheus 启动失败")
    return False


def start_grafana() -> bool:
    """启动 Grafana（可选，端口固定为 3001 避免与前端冲突）"""
    if is_port_open(GRAFANA_PORT):
        log(f"Grafana 已经在运行 ({GRAFANA_PORT})")
        return True
    if not GRAFANA_EXE.exists():
        log(f"警告：找不到 Grafana {GRAFANA_EXE}，跳过")
        return False

    # 通过环境变量强制 Grafana 监听 3001，避免与前端 Next.js 默认 3000 冲突
    env = os.environ.copy()
    env["GF_SERVER_HTTP_PORT"] = str(GRAFANA_PORT)
    log(f"启动 Grafana，端口固定为 {GRAFANA_PORT}")
    start_process(
        [str(GRAFANA_EXE), "-homepath", str(GRAFANA_DIR)],
        cwd=GRAFANA_BIN_DIR,
        name="Grafana",
        env=env
    )
    if wait_for_port(GRAFANA_PORT, "Grafana", max_wait=60):
        return True
    log("警告：Grafana 启动失败")
    return False


def open_browser():
    """打开浏览器访问前端"""
    url = f"http://localhost:{FRONTEND_PORT}"
    log(f"正在打开浏览器: {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        log(f"打开浏览器失败: {e}")


def stop_all():
    """停止所有由本脚本启动的进程"""
    log("正在停止所有服务...")
    for proc in PROCESSES:
        try:
            proc.terminate()
        except Exception:
            pass
    # 等待 3 秒后强制结束
    time.sleep(3)
    for proc in PROCESSES:
        if proc.poll() is None:
            try:
                proc.kill()
            except Exception:
                pass
        # 关闭日志文件句柄
        if hasattr(proc, "_log_file_handle"):
            try:
                proc._log_file_handle.close()
            except Exception:
                pass
    log("所有服务已停止")


def main():
    try:
        log("=" * 50)
        log("开始启动项目")
        log("=" * 50)

        # 0. 检测系统内存并动态计算各 Java 服务的 -Xmx
        total_mb, free_mb = get_system_memory_mb()
        if total_mb > 0:
            log(
                f"检测到系统总内存: {format_bytes(total_mb * 1024 * 1024)}，"
                f"空闲内存: {format_bytes(free_mb * 1024 * 1024)}"
            )
            heap_sizes = calculate_jvm_heap_sizes(total_mb)
            print_jvm_plan(heap_sizes)
            if total_mb < 8192:
                log("警告：系统内存小于 8GB，启动全部服务可能仍然失败，建议关闭其他占用内存的程序")
        else:
            log("无法检测系统内存，使用默认 JVM 内存配置")
            heap_sizes = {
                "Zipkin": "-Xmx512m",
                "gateway": "-Xmx512m",
                "product": "-Xmx512m",
                "user": "-Xmx384m",
                "order": "-Xmx384m",
                "payment": "-Xmx384m",
            }

        # 1. Zipkin
        if not start_zipkin(heap_sizes["Zipkin"]):
            msg = "Zipkin 启动失败，请检查：\n1. Java 是否安装\n2. zipkin jar 文件是否存在\n3. 端口 9411 是否被占用"
            log(msg.replace("\n", " "))
            show_error("启动失败", msg)
            return 1

        # 2. Nacos
        if not start_nacos():
            msg = "Nacos 启动失败，请检查：\n1. Nacos 安装目录是否正确\n2. 端口 8848 是否被占用\n3. 是否已配置 standalone 模式"
            log(msg.replace("\n", " "))
            show_error("启动失败", msg)
            return 1

        # 3. Java 微服务（并行）
        if not start_java_services(heap_sizes):
            msg = "Java 微服务启动失败，请检查：\n1. 是否已执行 mvn package\n2. 各服务端口是否被占用\n3. Nacos 是否已正常启动"
            log(msg.replace("\n", " "))
            show_error("启动失败", msg)
            return 1

        # 4. 识别服务（可选，失败不阻塞）
        start_recognition()

        # 5. DIN 推荐服务（可选，失败不阻塞）
        start_din_service()

        # 6. Prometheus + Grafana（可选，失败不阻塞）
        start_prometheus()
        start_grafana()

        # 7. 前端
        if not start_frontend():
            msg = "前端启动失败，请检查：\n1. Node.js 是否安装\n2. 是否已执行 npm install\n3. 端口 3000 是否被占用"
            log(msg.replace("\n", " "))
            show_error("启动失败", msg)
            return 1

        # 8. 打开浏览器
        open_browser()

        log("=" * 50)
        log("项目启动完成，所有服务已就绪")
        log_system_memory()
        log("按 Ctrl+C 停止所有服务")
        log("=" * 50)
        show_info("启动成功", "项目所有服务已启动完成，浏览器已自动打开。\n按 Ctrl+C 可停止所有服务。")

        # 保持运行，等待用户中断
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        log("收到中断信号")
    finally:
        stop_all()

    return 0


if __name__ == "__main__":
    sys.exit(main())
