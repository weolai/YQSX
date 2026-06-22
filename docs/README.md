# 企业级知识库目录

本文档是项目完整的知识库索引，包含所有技术文档、规范和指南。

## 📚 核心文档

### 1. 项目概述
- [CLAUDE.md](../CLAUDE.md) - AI开发框架总纲
- [README.md](README.md) - 项目说明文档

### 2. 架构设计
- [architecture.md](architecture.md) - 系统架构设计文档
- [agent-workflow.md](agent-workflow.md) - AI Agent协作工作流

### 3. 开发规范
- [project-rules.md](project-rules.md) - 项目开发规则
- [backend-rules.md](backend-rules.md) - Spring Boot后端开发规范
- [frontend-rules.md](frontend-rules.md) - Vue3前端开发规范
- [database.md](database.md) - 数据库设计规范
- [api-standard.md](api-standard.md) - API开发标准

### 4. 安全与权限
- [rbac.md](rbac.md) - RBAC权限模型文档

### 5. 工具与效率
- [code-generator.md](code-generator.md) - 代码生成器使用指南

### 6. 项目状态与对接
- [project-status.md](project-status.md) - 项目状态报告
- [frontend-backend-integration.md](frontend-backend-integration.md) - 前后端对接文档
- [ai-integration.md](ai-integration.md) - 模型层与应用层对接文档

### 7. 前端开发指南 ⭐ 新增
- [frontend-design-plan.md](frontend-design-plan.md) - 前端界面设计方案（8个核心页面）
- [frontend-quickstart.md](frontend-quickstart.md) - 前端快速启动指南（完整代码示例）
- [implementation-guide.md](implementation-guide.md) - ⭐ **前端实施指南（推荐优先阅读）**
- [product-images-solution.md](product-images-solution.md) - 商品图片解决方案
- [quick-reference.md](quick-reference.md) - 快速参考手册（常用命令速查）

---

## 📂 完整知识库结构

```
docs/
│
├── 00-项目总览/
│   ├── README.md                          # 项目介绍
│   ├── project-overview.md                # 项目概述
│   ├── team-guide.md                      # 团队协作指南
│   └── changelog.md                       # 变更日志
│
├── 01-架构设计/
│   ├── architecture.md                    # ✅ 系统架构
│   ├── microservice-design.md             # 微服务设计
│   ├── deployment.md                      # 部署架构
│   ├── performance.md                     # 性能架构
│   └── disaster-recovery.md               # 容灾方案
│
├── 02-数据库设计/
│   ├── database.md                        # ✅ 数据库规范
│   ├── er-diagram.md                      # ER图设计
│   ├── migration-guide.md                 # 数据迁移指南
│   └── optimization.md                    # 数据库优化
│
├── 03-后端开发/
│   ├── backend-rules.md                   # ✅ 后端开发规范
│   ├── spring-boot-guide.md               # Spring Boot指南
│   ├── mybatis-plus-guide.md              # MyBatis Plus指南
│   ├── service-integration.md             # 服务集成指南
│   ├── microservice-communication.md      # 微服务通信
│   └── exception-handling.md              # 异常处理
│
├── 04-前端开发/
│   ├── frontend-rules.md                  # ✅ 前端开发规范
│   ├── vue3-guide.md                      # Vue3开发指南
│   ├── component-library.md               # 组件库文档
│   ├── state-management.md                # 状态管理
│   └── router-guide.md                    # 路由管理
│
├── 05-API开发/
│   ├── api-standard.md                    # ✅ API开发标准
│   ├── restful-design.md                  # RESTful设计
│   ├── api-versioning.md                  # API版本控制
│   ├── api-documentation.md               # API文档规范
│   └── api-testing.md                     # API测试指南
│
├── 06-安全与权限/
│   ├── rbac.md                            # ✅ RBAC权限模型
│   ├── authentication.md                  # 认证机制
│   ├── authorization.md                   # 授权机制
│   ├── security-best-practices.md         # 安全最佳实践
│   └── data-encryption.md                 # 数据加密
│
├── 07-中间件/
│   ├── redis-guide.md                     # Redis使用指南
│   ├── nacos-guide.md                     # Nacos配置中心
│   ├── sentinel-guide.md                  # Sentinel流量控制
│   ├── seata-guide.md                     # Seata分布式事务
│   └── rocketmq-guide.md                  # RocketMQ消息队列
│
├── 08-AI与机器学习/
│   ├── yolo-integration.md                # YOLO集成指南
│   ├── model-training.md                  # 模型训练流程
│   ├── model-deployment.md                # 模型部署
│   └── ai-service-design.md               # AI服务设计
│
├── 09-测试/
│   ├── testing-strategy.md                # 测试策略
│   ├── unit-testing.md                    # 单元测试
│   ├── integration-testing.md             # 集成测试
│   ├── performance-testing.md             # 性能测试
│   └── automation-testing.md              # 自动化测试
│
├── 10-运维部署/
│   ├── docker-guide.md                    # Docker使用指南
│   ├── kubernetes-guide.md                # Kubernetes部署
│   ├── ci-cd-pipeline.md                  # CI/CD流水线
│   ├── monitoring.md                      # 监控体系
│   └── log-management.md                  # 日志管理
│
├── 11-工具与效率/
│   ├── code-generator.md                  # ✅ 代码生成器
│   ├── development-tools.md               # 开发工具
│   ├── ide-configuration.md               # IDE配置
│   └── git-workflow.md                    # Git工作流
│
├── 12-业务模块/
│   ├── product-module.md                  # 商品模块
│   ├── order-module.md                    # 订单模块
│   ├── user-module.md                     # 用户模块
│   ├── payment-module.md                  # 支付模块
│   └── recognition-module.md              # 图像识别模块
│
├── 13-AI Agent/
│   ├── agent-workflow.md                  # ✅ Agent工作流
│   ├── product-agent.md                   # 产品Agent
│   ├── architect-agent.md                 # 架构Agent
│   ├── dba-agent.md                       # DBA Agent
│   ├── backend-agent.md                   # 后端Agent
│   ├── frontend-agent.md                  # 前端Agent
│   ├── test-agent.md                      # 测试Agent
│   └── review-agent.md                    # 审查Agent
│
├── 14-故障排查/
│   ├── troubleshooting.md                 # 故障排查指南
│   ├── common-issues.md                   # 常见问题
│   ├── performance-tuning.md              # 性能调优
│   └── debug-guide.md                     # 调试指南
│
└── 15-附录/
    ├── glossary.md                        # 术语表
    ├── references.md                      # 参考资料
    ├── faq.md                             # 常见问题
    └── templates/                         # 文档模板
        ├── design-doc-template.md
        ├── api-doc-template.md
        └── test-report-template.md
```

---

## 🎯 快速导航

### 新手入门
1. [项目概述](../CLAUDE.md)
2. [开发规范](project-rules.md)
3. [环境搭建](#环境搭建)
4. [第一个功能开发](#第一个功能开发)

### 后端开发者
1. [后端开发规范](backend-rules.md)
2. [API开发标准](api-standard.md)
3. [数据库设计规范](database.md)
4. [代码生成器](code-generator.md)

### 前端开发者
1. [前端开发规范](frontend-rules.md)
2. [Vue3组件开发](#)
3. [状态管理](#)
4. [API对接指南](#)

### 架构师
1. [系统架构](architecture.md)
2. [微服务设计](#)
3. [性能优化](#)
4. [容灾方案](#)

### DBA
1. [数据库设计规范](database.md)
2. [SQL优化指南](#)
3. [数据迁移](#)
4. [备份恢复](#)

### 测试工程师
1. [测试策略](#)
2. [自动化测试](#)
3. [性能测试](#)
4. [API测试](#)

### DevOps
1. [部署架构](#)
2. [CI/CD流水线](#)
3. [监控体系](#)
4. [日志管理](#)

---

## 📋 文档状态

| 文档 | 状态 | 最后更新 | 负责人 |
|-----|------|---------|--------|
| architecture.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| database.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| api-standard.md | ✅ 已更新 | 2026-06-20 | AI Assistant |
| rbac.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| code-generator.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| frontend-rules.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| backend-rules.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| project-rules.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| agent-workflow.md | ✅ 已完成 | 2026-06-18 | AI Assistant |
| project-status.md | ✅ 已更新 | 2026-06-20 | AI Assistant |
| frontend-backend-integration.md | ✅ 已新增 | 2026-06-20 | AI Assistant |
| ai-integration.md | ✅ 已新增 | 2026-06-20 | AI Assistant |
| **frontend-design-plan.md** | ✅ **已新增** | **2026-06-22** | AI Assistant |
| **frontend-quickstart.md** | ✅ **已新增** | **2026-06-22** | AI Assistant |
| **implementation-guide.md** | ✅ **已新增** | **2026-06-22** | AI Assistant |
| **product-images-solution.md** | ✅ **已新增** | **2026-06-22** | AI Assistant |
| **quick-reference.md** | ✅ **已新增** | **2026-06-22** | AI Assistant |
| project-status.md | ✅ 已更新(v1.2.0) | 2026-06-20 | AI Assistant |

---

## 📖 文档编写规范

### 文档结构
```markdown
# 文档标题

## 概述
简要说明文档内容和目标读者

## 目录
- [章节1](#章节1)
- [章节2](#章节2)

## 正文内容
详细的技术说明、示例代码等

## 最佳实践
总结最佳实践和注意事项

## 参考资料
相关文档链接
```

### 命名规范
- 使用小写字母
- 单词间用短横线分隔
- 见名知意

示例：
- ✅ `backend-rules.md`
- ✅ `api-standard.md`
- ❌ `BackendRules.md`
- ❌ `api_standard.md`

### 更新规范
1. 文档修改后更新"最后更新"时间
2. 重大变更记录到changelog.md
3. 通知相关团队成员

---

## 🔍 搜索与查找

### 按技术栈查找
- **Spring Boot**: backend-rules.md, microservice-design.md
- **Vue3**: frontend-rules.md, component-library.md
- **MySQL**: database.md, optimization.md
- **Redis**: redis-guide.md
- **YOLO**: yolo-integration.md, model-training.md

### 按角色查找
- **开发**: backend-rules.md, frontend-rules.md, api-standard.md
- **测试**: testing-strategy.md, automation-testing.md
- **运维**: deployment.md, monitoring.md, ci-cd-pipeline.md
- **架构**: architecture.md, microservice-design.md

### 按场景查找
- **新功能开发**: code-generator.md, api-standard.md
- **性能优化**: performance.md, optimization.md
- **故障排查**: troubleshooting.md, common-issues.md
- **安全加固**: security-best-practices.md, data-encryption.md
- **前端项目启动**: implementation-guide.md ⭐, frontend-quickstart.md, quick-reference.md

---

## 📝 贡献指南

### 如何贡献文档
1. Fork本项目
2. 创建文档分支: `git checkout -b docs/your-feature`
3. 编写或更新文档
4. 提交变更: `git commit -m "docs: add xxx documentation"`
5. 推送到分支: `git push origin docs/your-feature`
6. 提交Pull Request

### 文档审查流程
1. 提交PR
2. 团队评审
3. 修改反馈
4. 合并主分支
5. 更新知识库索引

---

## 🆘 获取帮助

### 文档问题
- 提交Issue: [GitHub Issues](#)
- 邮件联系: dev@example.com
- 技术讨论群: [加入群组](#)

### 技术支持
- 内部Wiki: [访问Wiki](#)
- 技术分享会: 每周五下午2点
- 一对一辅导: 联系技术负责人

---

## 📅 维护计划

### 定期审查
- **每月审查**: 检查文档准确性
- **每季度更新**: 更新技术栈版本
- **年度整理**: 归档过期文档

### 反馈渠道
- 文档反馈表单: [提交反馈](#)
- 技术建议箱: suggestions@example.com
- 团队会议: 每周一上午10点

---

## 📌 重要提示

1. **文档优先**: 重大功能开发前先写设计文档
2. **及时更新**: 代码变更及时同步文档
3. **充分沟通**: 不确定的地方及时沟通
4. **持续改进**: 发现问题及时反馈

---

## 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|-----|------|---------|------|
| 1.0.0 | 2026-06-18 | 初始版本，完成核心文档 | AI Assistant |
| 1.1.0 | 2026-06-20 | 更新项目状态、API 接口清单、新增前后端对接与 AI 集成文档 | AI Assistant |
| 1.2.0 | 2026-06-20 | 更新前端完成状态、订单列表接口、识别中文映射、DTO 补全、订单状态默认值修复 | AI Assistant |
| 1.3.0 | 2026-06-22 | **新增前端完整开发文档**：设计方案、快速启动、实施指南、图片方案、快速参考 | AI Assistant |

---

**最后更新**: 2026-06-22  
**维护者**: AI Assistant  
**联系方式**: dev@example.com
