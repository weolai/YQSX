# YQSX 项目启动问题排查与运维指南

> 本文档汇总项目在实际启动过程中暴露的问题、根因与修复方案，供开发、测试与部署人员参考。
> 最后更新：2026-06-25

---

## 一、问题总览

在最近一次全量启动中，遇到以下问题：

| 序号 | 问题现象 | 影响 | 当前状态 |
|------|---------|------|---------|
| 1 | 文档中前端项目仍写为 `shop-web`（Vue/Vite），实际为 `shop-web-next`（Next.js） | 新人按文档执行会进错目录、用错端口 | 已识别，待文档统一修正 |
| 2 | 文档中 Grafana 端口写为 `3000`，与前端默认端口冲突 | 同时启动前端和 Grafana 时后者失败 | 已修复：Grafana 改用 `3001` |
| 3 | `start_project.py` 中识别服务使用 conda 环境名 `AIDetection`，但 `environment.yml` 定义的是 `AIDetection-service` | 环境名不一致，脚本提示与文档矛盾 | 已识别，脚本已修正为优先检测可用环境 |
| 4 | `start_project.py` 识别服务启动失败会导致整个脚本退出 | 识别服务非核心链路，不应阻塞主流程 | 已修复：识别服务改为可选，失败后仅告警 |
| 5 | `start_project.py` 未启动 Prometheus / Grafana / DIN 推荐服务 | 可观测性与推荐能力需要手动启动 | 已修复：脚本增加这三个服务的启动步骤 |
| 6 | YOLO 识别服务 `.env` 中 `MODEL_PATH` 指向不存在的 `yolo_training_outputs/.../best.pt` | 模型加载失败，识别接口返回 503 | 已修复：指向实际存在的 `models/trained/.../best.pt` |
| 7 | Windows 下 `Start-Process -FilePath npm` 报错“不是有效的 Win32 应用程序” | `npm` 是 `.cmd` 批处理，不能直接作为可执行文件启动 | 已识别，脚本改为通过 `cmd.exe /c` 调用 |
| 8 | 部分服务（Gateway、Payment）已在运行但不在 Trae 终端列表中 | 容易造成“服务到底谁启动的”困惑 | 已记录：建议使用端口检查确认状态 |
| 9 | IDE 终端数量有限（5 个），无法每个服务独占一个终端 | 需要后台进程或统一启动脚本 | 已提供 PowerShell 后台启动命令 |

---

## 二、根因分析

### 2.1 文档与代码不同步

项目早期使用 Vue 3 + Vite 方案，目录名为 `shop-web`，开发端口 `5173`。后续切换为 **Next.js 16 + React 19**，目录改为 `shop-web-next`，开发端口改为 `3000`。但以下文档未及时同步：

- `README.md` 项目结构图
- `README.md` 快速开始命令
- `docs/implementation-guide.md` 全部前端创建步骤
- `docs/quick-reference.md` 访问地址与命令
- `docs/README.md` 前端导航

### 2.2 可观测性端口规划缺失

Grafana 官方默认端口为 `3000`，项目前端 Next.js 开发服务器也使用 `3000`。两者在同一台机器同时启动时必然冲突。应在一开始就将 Grafana 固定到 `3001`（或类似端口）。

### 2.3 启动脚本覆盖不全

`start_project.py` 最初只覆盖：Zipkin → Nacos → 5 个 Java 服务 → 识别服务 → 前端。

缺少：

- **Prometheus**（指标采集）
- **Grafana**（可视化）
- **DIN 推荐服务**（`din_model.py --mode serve`，端口 8000）

导致推荐功能与监控面板需要手动启动，增加出错概率。

### 2.4 识别服务配置漂移

`XML/yolo_recognition_model/recognition-service/.env` 中的模型权重路径：

```env
MODEL_PATH=../yolo_training_outputs/brand_optimized/weights/best.pt
```

该目录实际不存在。真实训练权重位于：

```
XML/yolo_recognition_model/models/trained/runs/detect/runs/train/yolo11s_iranian_snacks_adamw_t4x2/weights/best.pt
```

### 2.5 Windows 进程启动细节

在 PowerShell 中：

- `Start-Process -FilePath npm` 会把 `npm` 当成 PE 可执行文件，失败。
- 正确做法：`Start-Process -FilePath cmd.exe -ArgumentList '/c','npm','run','dev'`。

### 2.6 识别服务不应阻塞主流程

AI 识别属于增强功能，不是登录/购物/支付的必经之路。`start_project.py` 原逻辑在识别服务失败时 `return 1`，导致整个项目启动失败，不符合“核心链路优先”原则。

---

## 三、已应用的修复

### 3.1 识别服务 `.env` 修正

文件：`XML/yolo_recognition_model/recognition-service/.env`

```env
MODEL_PATH=D:/Programming/YQSX/XML/yolo_recognition_model/models/trained/runs/detect/runs/train/yolo11s_iranian_snacks_adamw_t4x2/weights/best.pt
```

修复后模型加载成功，Nacos 注册成功：

```
shop-recognition-service@127.0.0.1:8086
```

### 3.2 启动脚本增强

文件：`start_project.py`

- 识别服务启动失败改为**可选**，不阻塞主流程。
- 增加 Prometheus、Grafana、DIN 推荐服务启动。
- `npm` 启动改为 `cmd.exe /c` 方式。
- conda 环境名增加回退逻辑：先尝试 `AIDetection-service`，不存在则使用 `AIDetection`。

### 3.3 Grafana 端口调整

启动 Grafana 时通过环境变量固定端口：

```powershell
$env:GF_SERVER_HTTP_PORT = '3001'
```

访问地址相应改为：`http://localhost:3001`。

---

## 四、推荐启动方式

### 4.1 开发环境（IDE 内 / 手动后台启动）

由于 IDE 终端数量有限，建议使用后台进程启动非核心服务：

```powershell
# 1. 先启动基础服务（Nacos、MySQL、Redis 需预先启动）

# 2. 启动 Zipkin
Start-Process java -ArgumentList '-jar','XML/zipkin-server-2.24.3-exec.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden

# 3. 启动 5 个 Java 微服务（可并行）
Start-Process java -ArgumentList '-jar','Test/shop-parent/shop-gateway-server/target/shop-gateway-server-1.0-SNAPSHOT.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden
Start-Process java -ArgumentList '-jar','Test/shop-parent/shop-product-server/target/shop-product-server-1.0-SNAPSHOT.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden
Start-Process java -ArgumentList '-jar','Test/shop-parent/shop-user-server/target/shop-user-server-1.0-SNAPSHOT.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden
Start-Process java -ArgumentList '-jar','Test/shop-parent/shop-order-server/target/shop-order-server-1.0-SNAPSHOT.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden
Start-Process java -ArgumentList '-jar','Test/shop-parent/shop-payment-server/target/shop-payment-server-1.0-SNAPSHOT.jar' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden

# 4. 启动 DIN 推荐服务
Start-Process D:\Programming\YQSX\.venv\Scripts\python.exe -ArgumentList 'din_model.py','--mode','serve' -WorkingDirectory D:\Programming\YQSX -WindowStyle Hidden

# 5. 启动 AI 识别服务
D:\AIDetection\conda-envs\AIDetection\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8086
# 工作目录：XML/yolo_recognition_model/recognition-service

# 6. 启动前端（Next.js）
Start-Process cmd.exe -ArgumentList '/c','npm','run','dev' -WorkingDirectory D:\Programming\YQSX\shop-web-next -WindowStyle Hidden

# 7. 启动 Prometheus
Start-Process cmd.exe -ArgumentList '/c','prometheus.exe','--config.file=prometheus.yml' -WorkingDirectory D:\Programming\YQSX\XML\prometheus\prometheus-2.45.0.windows-amd64 -WindowStyle Hidden

# 8. 启动 Grafana（注意端口 3001）
$env:GF_SERVER_HTTP_PORT = '3001'
Start-Process cmd.exe -ArgumentList '/c','grafana-server.exe','-homepath','D:\Programming\YQSX\XML\grafana\grafana-10.1.0' -WorkingDirectory D:\Programming\YQSX\XML\grafana\grafana-10.1.0\bin -WindowStyle Hidden
```

### 4.2 分发包方式（推荐交付用户）

```powershell
cd dist-pack
powershell -ExecutionPolicy Bypass -File .\setup.ps1    # 首次配置
powershell -ExecutionPolicy Bypass -File .\start.ps1    # 启动全部
```

注意：

- `setup.ps1` 会生成 `config.env`，其中 `ENABLE_RECOGNITION` 默认应为 `true`。
- 如需跳过识别服务，编辑 `config.env`：`ENABLE_RECOGNITION=false`。
- Prometheus / Grafana 尚未纳入 `dist-pack/start.ps1`，如需监控请按 4.1 手动启动。

### 4.3 一键脚本方式

```bash
python start_project.py
```

适用场景：开发快速验证。该脚本已修复识别服务可选、Prometheus/Grafana/DIN 启动、npm 路径等问题。

---

## 五、端口速查表（已修正）

| 服务 | 端口 | 访问地址 | 说明 |
|------|------|---------|------|
| 前端（Next.js） | 3000 | http://localhost:3000 | 开发模式 |
| Gateway | 8080 | http://localhost:8080 | 统一入口 `/api/**` |
| Product | 8081 | - | Java 微服务 |
| User | 8083 | - | Java 微服务 |
| Payment | 8084 | - | Java 微服务 |
| Order | 8091 | - | Java 微服务 |
| AI 识别 | 8086 | http://localhost:8086/health | Python FastAPI |
| DIN 推荐 | 8000 | http://localhost:8000 | Python 推荐服务 |
| Nacos | 8848 | http://localhost:8848/nacos | nacos/nacos |
| Zipkin | 9411 | http://localhost:9411 | 链路追踪 |
| Redis | 6379 | - | 缓存/分布式锁 |
| MySQL | 3306 | - | 数据库 |
| Prometheus | 9090 | http://localhost:9090 | 指标采集 |
| Grafana | **3001** | http://localhost:3001 | 监控面板（避免与前端冲突） |

---

## 六、常见问题（FAQ）

### Q1：按文档执行 `cd shop-web` 找不到目录？

**原因**：前端已迁移到 `shop-web-next`（Next.js）。

**解决**：

```bash
cd D:\Programming\YQSX\shop-web-next
npm run dev
```

### Q2：Grafana 启动报错 `bind: address already in use`？

**原因**：Grafana 默认端口 3000 被前端 Next.js 占用。

**解决**：启动 Grafana 前设置环境变量：

```powershell
$env:GF_SERVER_HTTP_PORT = '3001'
```

### Q3：AI 识别服务返回 503，日志提示“模型未加载”？

**原因**：`.env` 中 `MODEL_PATH` 指向不存在路径。

**解决**：检查并修正 `XML/yolo_recognition_model/recognition-service/.env`：

```env
MODEL_PATH=D:/Programming/YQSX/XML/yolo_recognition_model/models/trained/runs/detect/runs/train/yolo11s_iranian_snacks_adamw_t4x2/weights/best.pt
```

### Q4：执行 `start_project.py` 时识别服务报错导致整个脚本退出？

**原因**：旧版脚本硬失败。

**解决**：使用最新版 `start_project.py`，识别服务失败仅会告警，不会退出。

### Q5：PowerShell 中 `Start-Process npm` 报错？

**原因**：Windows 下 `npm` 是 `.cmd` 脚本，不是 PE 可执行文件。

**解决**：

```powershell
Start-Process cmd.exe -ArgumentList '/c','npm','run','dev' -WorkingDirectory D:\Programming\YQSX\shop-web-next
```

### Q6：DIN 推荐功能不生效？

**原因**：`din_model.py --mode serve` 未启动，或 Product 服务未读取到 `DIN_RECOMMEND_URL`。

**解决**：

1. 启动 DIN 服务：`python din_model.py --mode serve`（端口 8000）。
2. 确认 Product 服务 `application.yml` 中 `din.recommend.url=http://127.0.0.1:8000`。

### Q7：Prometheus / Grafana 如何导入配置？

**Prometheus**：

- 配置文件：`XML/prometheus/prometheus-2.45.0.windows-amd64/prometheus.yml`
- 已配置 5 个 Java 服务 target。

**Grafana**：

- 数据源：手动添加 Prometheus，URL `http://localhost:9090`。
- 仪表盘：导入 `XML/grafana/dashboard.json`。
- 数据源配置：导入 `XML/grafana/datasource.json`。

---

## 七、待完善事项

| 事项 | 优先级 | 建议处理人 |
|------|--------|-----------|
| 将 Prometheus / Grafana 纳入 `dist-pack/start.ps1` | 高 | DevOps |
| 将 DIN 推荐服务纳入 `dist-pack/start.ps1` | 高 | 后端 |
| 统一文档中所有 `shop-web` / `5173` 引用 | 高 | 文档维护 |
| 为 Grafana 提供固定配置文件（port = 3001） | 中 | DevOps |
| 增加 `check-ports.ps1` 到 `dist-pack`，作为启动后健康检查 | 中 | DevOps |
| 编写 Docker Compose 一键启动方案 | 低 | DevOps |

---

## 八、参考链接

- [项目状态报告](./project-status.md)
- [快速参考手册](./quick-reference.md)
- [模型层对接文档](./ai-integration.md)
- [前后端对接文档](./frontend-backend-integration.md)
- [dist-pack 快速部署指南](../dist-pack/README-快速部署.md)

---

**文档版本**: v1.0  
**最后更新**: 2026-06-25  
**维护者**: AI Assistant
