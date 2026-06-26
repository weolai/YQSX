# YQSX 智能零食商城 - 快速部署指南

> 本指南面向"什么都不会"的接收方。按步骤执行即可零配置运行项目。

---

## 一、目标电脑需先安装的软件（5 个）

请逐个下载安装，**全部默认下一步**即可。安装完成后**重启电脑**一次。

| 软件 | 下载地址 | 版本要求 | 说明 |
|---|---|---|---|
| ① JDK | https://adoptium.net/ | 11 或 17 | 选 "LTS" 版本，安装时勾选 "Set JAVA_HOME" |
| ② Node.js | https://nodejs.org/ | 18 或更高 | 选 "LTS" 版本 |
| ③ MySQL | https://dev.mysql.com/downloads/installer/ | 8.0+ | 选 "Server only"，**安装时务必记住 root 密码** |
| ④ Python | https://www.python.org/downloads/ | 3.10+ | 安装时**勾选 "Add Python to PATH"** |
| ⑤ Miniconda | https://docs.conda.io/projects/miniconda/ | 最新 | 安装时勾选 "Add to PATH" |

**验证安装是否成功**：按 `Win+R`，输入 `cmd` 回车，依次执行下面命令，每个都能出版本号才算装好：

```
java -version
node --version
npm --version
mysql --version
python --version
conda --version
```

---

## 二、接收分发包并解压

1. 收到 `YQSX-dist.zip` 文件
2. 右键 → "解压到 YQSX-dist\"（用 7-Zip 或系统自带解压）
3. 解压路径**不要含中文或空格**，例如：
   - ✅ 推荐：`D:\YQSX` 或 `C:\projects\YQSX`
   - ❌ 不要：`D:\我的文档\YQSX 项目` 或 `C:\Users\张三\Desktop\YQSX`

解压后目录结构应如下：

```
YQSX-dist\
├── dist-pack\                  ← 配置和启动脚本（重点）
│   ├── setup.ps1              ← 步骤 3 执行
│   ├── start.ps1              ← 步骤 4 执行
│   ├── stop.ps1               ← 停止服务时执行
│   ├── package.ps1            ← 你不需要执行这个
│   ├── config.env.template    ← 配置模板
│   ├── sql\init-all.sql       ← 数据库初始化脚本
│   └── nacos-config\global-config.yaml
├── Test\shop-parent\           ← 后端源码 + jar
├── shop-web-next\              ← 前端源码
├── XML\                        ← Nacos / Redis / Zipkin / 识别服务
└── docs\                       ← 文档
```

---

## 三、运行配置脚本（自动检测 + 交互输入）

> 此脚本会自动检测环境、引导你输入 MySQL 账号密码、初始化数据库、安装前端依赖、创建 Python 环境。

1. 打开解压后的 `dist-pack` 目录
2. 找到 `setup.ps1`，**右键** → "使用 PowerShell 运行"
   - 若提示"无法加载，因为在此系统上禁止运行脚本"，请用管理员身份打开 PowerShell，执行：
     ```
     Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
     输入 `Y` 确认，然后重新右键运行 `setup.ps1`
   - 或者在 `dist-pack` 目录打开 PowerShell，执行：
     ```
     powershell -ExecutionPolicy Bypass -File .\setup.ps1
     ```

3. 脚本会按下面 7 步顺序执行（按提示输入即可）：

   - **步骤 1**：检测 JDK / Node / MySQL / Python / Conda 是否安装
     - 若有缺失，按提示去对应官网下载安装，安装后重新运行本脚本
   - **步骤 2**：输入 MySQL 连接信息
     - 主机地址：直接回车（默认 localhost）
     - 端口：直接回车（默认 3306）
     - 用户名：直接回车（默认 root）
     - 密码：**输入你安装 MySQL 时设置的 root 密码**（输入时不可见）
     - 脚本会测试连接，失败可重试 3 次
   - **步骤 3**：自动创建 4 个数据库并导入数据
     - 自动执行 `sql\init-all.sql`
     - 验证 `shop-product.t_product` 应有 19 条记录
   - **步骤 4**：生成 `config.env` 运行时配置
     - Redis 主机端口：默认 localhost:6379（回车即可）
     - Nacos 主机端口：默认 localhost:8848（回车即可）
     - 是否生成新的 JWT 密钥：输入 `y` 回车
   - **步骤 5**：自动修正 AI 识别服务配置（包括模型权重路径）
   - **步骤 6**：自动 `npm install` 安装前端依赖（**首次 3-10 分钟，耐心等待**）
   - **步骤 7**：自动启动 Nacos 并导入 `global-config.yaml` 到配置中心

4. 看到 `配置完成` 提示即可关闭窗口

---

## 四、启动项目

1. 双击 `dist-pack\start.ps1`（右键 → 使用 PowerShell 运行）
2. 脚本会按顺序启动：
   - Zipkin (端口 9411)
   - Nacos (端口 8848)
   - 5 个 Java 微服务（端口 8080/8081/8083/8084/8091）
   - AI 识别服务（端口 8086）
   - 前端（端口 3000）
3. 启动完成后**自动打开浏览器**访问 `http://localhost:3000`
4. **登录账号**：用户名 `admin`，密码 `123456`

启动过程中各服务日志在 `<解压目录>\logs\` 下：
- `Java-gateway.log` / `Java-product.log` / `Java-user.log` / `Java-order.log` / `Java-payment.log`
- `Recognition.log` / `Frontend.log` / `Zipkin.log` / `Nacos.log` / `Redis.log`

> 全部启动约需 2-3 分钟，请耐心等待所有端口就绪。

---

## 五、停止项目

- 在 `start.ps1` 运行的窗口按 `Ctrl+C`
- 或双击 `dist-pack\stop.ps1`

> MySQL 由系统服务管理，不会被 stop.ps1 停止。若需停 MySQL，请到"服务"（services.msc）中停止 MySQL80。

---

## 六、常见问题

### Q1：双击 .ps1 没反应或一闪而过
- 在 `dist-pack` 目录按住 Shift 右键 → "在此处打开 PowerShell 窗口"
- 执行：`powershell -ExecutionPolicy Bypass -File .\setup.ps1`

### Q2：setup.ps1 报"禁止运行脚本"
- 用管理员 PowerShell 执行一次：`Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`，输入 `Y`

### Q3：MySQL 连接失败
- 确认 MySQL 服务正在运行：`Win+R` → `services.msc` → 找 `MySQL80` → 状态应为"正在运行"
- 确认密码正确（**安装时设的 root 密码**）
- 若忘记密码：MySQL 官方文档 https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html

### Q4：Nacos 启动失败（端口 8848 被占用）
- 双击 `stop.ps1` 停止全部，再重新 `start.ps1`

### Q5：前端打开白屏
- 检查 `logs\Frontend.log`，常见原因：`node_modules` 没装好
- 修复：在 `shop-web-next` 目录手动执行 `npm install` 后重新 `start.ps1`

### Q6：AI 识别功能不可用
- 检查 `logs\Recognition.log`
- 常见原因：conda 环境 `AIDetection` 未创建。手动执行：
  ```
  conda env create -f XML\yolo_recognition_model\recognition-service\environment.yml
  ```
- 识别服务非必需，关闭后不影响登录/购物/支付主流程
- 在 `config.env` 中将 `ENABLE_RECOGNITION=false` 即可跳过

### Q7：端口被占用
- 找出占用进程：`netstat -ano | findstr :8080`（最后一段是 PID）
- 结束进程：`taskkill /PID <PID> /F`
- 或直接执行 `stop.ps1` 清理全部

### Q8：Java 服务启动后立即退出
- 查看对应 `logs\Java-*.log`
- 最常见原因：数据库未初始化（重新运行 setup.ps1 步骤 3）
- 或 MySQL 密码错误（重新运行 setup.ps1）

---

## 七、修改配置

如需修改任何配置（如 MySQL 密码、Nacos 地址等），有两种方式：

**方式 A（推荐）**：重新运行 `setup.ps1`，按提示重新输入

**方式 B**：直接编辑 `dist-pack\config.env`，修改后重新 `start.ps1`

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的新密码
...
```

---

## 八、目录与端口速查表

### 端口

| 服务 | 端口 | 访问地址 |
|---|---|---|
| 前端 | 3000 | http://localhost:3000 |
| Gateway | 8080 | http://localhost:8080 |
| 商品服务 | 8081 | - |
| 用户服务 | 8083 | - |
| 支付服务 | 8084 | - |
| 订单服务 | 8091 | - |
| AI 识别服务 | 8086 | - |
| Nacos 控制台 | 8848 | http://localhost:8848/nacos (nacos/nacos) |
| Zipkin | 9411 | http://localhost:9411 |
| Redis | 6379 | - |
| MySQL | 3306 | - |

### 测试账号

- 用户名：`admin`
- 密码：`123456`

### API 示例

```bash
# 登录
curl -X POST "http://localhost:8080/api/user/login?username=admin&password=123456"

# 查询商品（需登录后拿 Token）
curl "http://localhost:8080/api/products/1" -H "Authorization: Bearer <TOKEN>"
```

---

## 九、技术架构

详见 `docs\architecture.md`。简要：

```
前端 (Next.js :3000)
    ↓
Gateway (Spring Cloud Gateway :8080) — JWT 认证 / Sentinel 限流
    ↓
5 个微服务 (Spring Boot) — 商品 / 订单 / 用户 / 支付 + AI 识别
    ↓
基础设施 — MySQL / Redis / Nacos / Zipkin / Prometheus
```

---

如遇本文未覆盖的问题，请查看 `<解压目录>\logs\` 下对应服务的日志文件，错误信息通常在最后 50 行。
