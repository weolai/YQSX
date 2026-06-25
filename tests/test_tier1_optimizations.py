#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
第一梯队优化单元测试
覆盖：JVM 参数构建、堆大小计算、前端构建检测、懒加载配置验证

运行方式：
    cd d:\Programming\YQSX
    python -m pytest tests/test_tier1_optimizations.py -v
    或
    python -m unittest tests.test_tier1_optimizations -v
"""

import os
import sys
import time
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# 将项目根目录加入 sys.path 以便导入 start_project
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import start_project


class TestBuildJvmArgs(unittest.TestCase):
    """测试 build_jvm_args 函数：JVM 参数构建逻辑"""

    def test_xms_equals_xmx(self):
        """-Xms 必须等于 -Xmx，避免堆动态扩展"""
        for xmx in ["-Xmx256m", "-Xmx384m", "-Xmx512m", "-Xmx1024m"]:
            with self.subTest(xmx=xmx):
                args = start_project.build_jvm_args(xmx)
                xms = [a for a in args if a.startswith("-Xms")][0]
                self.assertEqual(xms, xmx.replace("-Xmx", "-Xms"),
                                 f"-Xms({xms}) 应等于 -Xmx({xmx})")

    def test_g1gc_enabled(self):
        """必须显式指定 G1GC"""
        args = start_project.build_jvm_args("-Xmx512m")
        self.assertIn("-XX:+UseG1GC", args, "必须包含 -XX:+UseG1GC")

    def test_max_gc_pause_configured(self):
        """必须配置 GC 停顿目标"""
        args = start_project.build_jvm_args("-Xmx512m")
        pause_args = [a for a in args if a.startswith("-XX:MaxGCPauseMillis")]
        self.assertEqual(len(pause_args), 1, "必须有且仅有一个 MaxGCPauseMillis 参数")
        self.assertEqual(pause_args[0], "-XX:MaxGCPauseMillis=200")

    def test_heap_dump_on_oom(self):
        """必须配置 OOM 时自动转储"""
        args = start_project.build_jvm_args("-Xmx512m")
        self.assertIn("-XX:+HeapDumpOnOutOfMemoryError", args,
                      "必须包含 -XX:+HeapDumpOnOutOfMemoryError")

    def test_heap_dump_path_set(self):
        """转储路径必须指向 logs 目录"""
        args = start_project.build_jvm_args("-Xmx512m")
        path_args = [a for a in args if a.startswith("-XX:HeapDumpPath")]
        self.assertEqual(len(path_args), 1, "必须有且仅有一个 HeapDumpPath 参数")
        self.assertIn("logs", path_args[0], "转储路径必须包含 logs 目录")

    def test_args_count(self):
        """参数数量必须为 6（Xms, Xmx, G1GC, MaxGCPause, HeapDump, HeapDumpPath）"""
        args = start_project.build_jvm_args("-Xmx512m")
        self.assertEqual(len(args), 6, f"期望 6 个参数，实际 {len(args)}: {args}")

    def test_xmx_preserved(self):
        """原始 -Xmx 值必须保留在参数列表中"""
        args = start_project.build_jvm_args("-Xmx384m")
        self.assertIn("-Xmx384m", args, "-Xmx384m 必须在参数列表中")

    def test_performance(self):
        """build_jvm_args 执行时间应 <1ms（高频调用场景）"""
        start = time.perf_counter()
        for _ in range(1000):
            start_project.build_jvm_args("-Xmx512m")
        elapsed = time.perf_counter() - start
        per_call_ms = (elapsed / 1000) * 1000
        self.assertLess(per_call_ms, 1.0,
                        f"单次调用 {per_call_ms:.3f}ms 超过 1ms 阈值")


class TestCalculateJvmHeapSizes(unittest.TestCase):
    """测试 calculate_jvm_heap_sizes 函数：内存分档计算"""

    def test_8gb_tier(self):
        """≤8GB 系统：各服务堆大小正确"""
        sizes = start_project.calculate_jvm_heap_sizes(8192)
        self.assertEqual(sizes["Zipkin"], "-Xmx256m")
        self.assertEqual(sizes["gateway"], "-Xmx384m")
        self.assertEqual(sizes["product"], "-Xmx384m")
        self.assertEqual(sizes["user"], "-Xmx256m")
        self.assertEqual(sizes["order"], "-Xmx256m")
        self.assertEqual(sizes["payment"], "-Xmx256m")

    def test_4gb_tier(self):
        """4GB 系统也走 ≤8GB 档"""
        sizes = start_project.calculate_jvm_heap_sizes(4096)
        self.assertEqual(sizes["gateway"], "-Xmx384m")

    def test_16gb_tier(self):
        """≤16GB 系统：各服务堆大小正确"""
        sizes = start_project.calculate_jvm_heap_sizes(16384)
        self.assertEqual(sizes["Zipkin"], "-Xmx384m")
        self.assertEqual(sizes["gateway"], "-Xmx512m")
        self.assertEqual(sizes["product"], "-Xmx512m")
        self.assertEqual(sizes["user"], "-Xmx384m")

    def test_32gb_tier(self):
        """≤32GB 系统：各服务堆大小正确"""
        sizes = start_project.calculate_jvm_heap_sizes(32768)
        self.assertEqual(sizes["Zipkin"], "-Xmx512m")
        self.assertEqual(sizes["gateway"], "-Xmx768m")
        self.assertEqual(sizes["user"], "-Xmx512m")

    def test_64gb_tier(self):
        """>32GB 系统：各服务堆大小正确"""
        sizes = start_project.calculate_jvm_heap_sizes(65536)
        self.assertEqual(sizes["Zipkin"], "-Xmx768m")
        self.assertEqual(sizes["gateway"], "-Xmx1024m")
        self.assertEqual(sizes["product"], "-Xmx1024m")
        self.assertEqual(sizes["user"], "-Xmx768m")

    def test_all_services_present(self):
        """返回的字典必须包含全部 6 个服务"""
        sizes = start_project.calculate_jvm_heap_sizes(16384)
        expected_keys = {"Zipkin", "gateway", "product", "user", "order", "payment"}
        self.assertEqual(set(sizes.keys()), expected_keys,
                         f"缺少服务: {expected_keys - set(sizes.keys())}")

    def test_total_heap_within_budget(self):
        """所有服务堆总和不超过系统内存的 25%（预留 OS/前端/Python）"""
        for total_mb in [8192, 16384, 32768, 65536]:
            with self.subTest(total_mb=total_mb):
                sizes = start_project.calculate_jvm_heap_sizes(total_mb)
                total_heap = sum(int(s.replace("-Xmx", "").replace("m", "")) for s in sizes.values())
                ratio = total_heap / total_mb
                self.assertLess(ratio, 0.25,
                                f"{total_mb}MB 系统堆占比 {ratio:.1%} 超过 25%")


class TestHasProductionBuild(unittest.TestCase):
    """测试 has_production_build 函数：前端构建产物检测"""

    def test_no_build_dir(self):
        """.next 目录不存在时返回 False"""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = start_project.has_production_build(Path(tmpdir))
            self.assertFalse(result, "无 .next 目录时应返回 False")

    def test_build_dir_without_build_id(self):
        """.next 目录存在但无 BUILD_ID 时返回 False"""
        with tempfile.TemporaryDirectory() as tmpdir:
            next_dir = Path(tmpdir) / ".next"
            next_dir.mkdir()
            result = start_project.has_production_build(Path(tmpdir))
            self.assertFalse(result, "无 BUILD_ID 时应返回 False")

    def test_build_dir_with_build_id(self):
        """.next/BUILD_ID 都存在时返回 True"""
        with tempfile.TemporaryDirectory() as tmpdir:
            next_dir = Path(tmpdir) / ".next"
            next_dir.mkdir()
            (next_dir / "BUILD_ID").write_text("test_build_123")
            result = start_project.has_production_build(Path(tmpdir))
            self.assertTrue(result, "有 BUILD_ID 时应返回 True")

    def test_empty_build_id(self):
        """BUILD_ID 为空文件时仍返回 True（文件存在即视为已构建）"""
        with tempfile.TemporaryDirectory() as tmpdir:
            next_dir = Path(tmpdir) / ".next"
            next_dir.mkdir()
            (next_dir / "BUILD_ID").write_text("")
            result = start_project.has_production_build(Path(tmpdir))
            self.assertTrue(result, "BUILD_ID 存在（即使为空）应返回 True")


class TestLazyInitializationConfig(unittest.TestCase):
    """验证 5 个服务的 application.yml 均配置了懒加载"""

    SERVICES = [
        ("gateway", "shop-gateway-server"),
        ("user", "shop-user-server"),
        ("product", "shop-product-server"),
        ("order", "shop-order-server"),
        ("payment", "shop-payment-server"),
    ]

    def _read_yml(self, service_dir: str) -> str:
        """读取服务的 application.yml"""
        yml_path = (PROJECT_ROOT / "Test" / "shop-parent" / service_dir
                     / "src" / "main" / "resources" / "application.yml")
        if not yml_path.exists():
            self.skipTest(f"{service_dir} 的 application.yml 不存在")
        return yml_path.read_text(encoding="utf-8")

    def test_all_services_have_lazy_init(self):
        """所有 5 个服务必须配置 spring.main.lazy-initialization: true"""
        for service_name, service_dir in self.SERVICES:
            with self.subTest(service=service_name):
                yml_content = self._read_yml(service_dir)
                self.assertIn("lazy-initialization: true", yml_content,
                              f"{service_name} 未配置懒加载")

    def test_lazy_init_under_spring_main(self):
        """懒加载配置必须在 spring.main 下"""
        for service_name, service_dir in self.SERVICES:
            with self.subTest(service=service_name):
                yml_content = self._read_yml(service_dir)
                lines = yml_content.split("\n")
                found_spring = False
                found_main = False
                found_lazy = False
                for line in lines:
                    stripped = line.rstrip()
                    if stripped == "spring:":
                        found_spring = True
                    elif found_spring and stripped == "  main:":
                        found_main = True
                    elif found_main and "lazy-initialization: true" in stripped:
                        found_lazy = True
                        break
                self.assertTrue(found_lazy,
                                f"{service_name} 的 lazy-init 不在 spring.main 下")


class TestJvmArgsIntegration(unittest.TestCase):
    """集成测试：验证 JVM 参数与堆大小计算的组合"""

    def test_zipkin_uses_jvm_args(self):
        """Zipkin 启动应使用 build_jvm_args 返回的完整参数"""
        with patch.object(start_project, "start_process") as mock_start, \
             patch.object(start_project, "is_port_open", return_value=False), \
             patch.object(start_project, "wait_for_port", return_value=True), \
             patch.object(start_project, "log_service_memory"), \
             patch.object(start_project, "ZIPKIN_JAR") as mock_jar:
            mock_jar.exists.return_value = True
            start_project.start_zipkin("-Xmx256m")
            call_args = mock_start.call_args[0][0]
            self.assertIn("-Xms256m", call_args, "Zipkin 启动参数缺少 -Xms256m")
            self.assertIn("-Xmx256m", call_args, "Zipkin 启动参数缺少 -Xmx256m")
            self.assertIn("-XX:+UseG1GC", call_args, "Zipkin 启动参数缺少 G1GC")

    def test_java_service_uses_jvm_args(self):
        """Java 服务启动应使用 build_jvm_args 返回的完整参数"""
        service = {"name": "test-svc", "jar": MagicMock(), "port": 9999}
        service["jar"].exists.return_value = True
        with patch.object(start_project, "start_process") as mock_start, \
             patch.object(start_project, "is_port_open", return_value=False), \
             patch.object(start_project, "wait_for_port", return_value=True), \
             patch.object(start_project, "log_service_memory"):
            start_project.start_java_service(service, "-Xmx384m")
            call_args = mock_start.call_args[0][0]
            self.assertIn("-Xms384m", call_args, "Java 服务启动参数缺少 -Xms384m")
            self.assertIn("-Xmx384m", call_args, "Java 服务启动参数缺少 -Xmx384m")
            self.assertIn("-XX:+UseG1GC", call_args, "Java 服务启动参数缺少 G1GC")
            self.assertIn("-XX:MaxGCPauseMillis=200", call_args,
                          "Java 服务启动参数缺少 MaxGCPauseMillis")


class TestStartupPerformanceBaseline(unittest.TestCase):
    """启动性能基线测试：验证关键函数的执行时间"""

    def test_heap_calculation_under_10ms(self):
        """calculate_jvm_heap_sizes 单次执行 <10ms"""
        start = time.perf_counter()
        start_project.calculate_jvm_heap_sizes(16384)
        elapsed_ms = (time.perf_counter() - start) * 1000
        self.assertLess(elapsed_ms, 10,
                        f"堆大小计算 {elapsed_ms:.2f}ms 超过 10ms 阈值")

    def test_jvm_args_build_under_1ms(self):
        """build_jvm_args 单次执行 <1ms"""
        start = time.perf_counter()
        start_project.build_jvm_args("-Xmx512m")
        elapsed_ms = (time.perf_counter() - start) * 1000
        self.assertLess(elapsed_ms, 1,
                        f"JVM 参数构建 {elapsed_ms:.3f}ms 超过 1ms 阈值")

    def test_build_detection_under_5ms(self):
        """has_production_build 单次执行 <5ms（含文件系统访问）"""
        with tempfile.TemporaryDirectory() as tmpdir:
            start = time.perf_counter()
            start_project.has_production_build(Path(tmpdir))
            elapsed_ms = (time.perf_counter() - start) * 1000
            self.assertLess(elapsed_ms, 5,
                            f"构建检测 {elapsed_ms:.3f}ms 超过 5ms 阈值")


if __name__ == "__main__":
    unittest.main(verbosity=2)
