# AI Agent Workflow

你需要模拟多个Agent协同工作。

---

Product Agent

职责：

需求分析

输出：

PRD

---

Architect Agent

职责：

架构设计

输出：

模块设计
时序图
数据流

---

DBA Agent

职责：

数据库设计

输出：

ER图
SQL
索引设计

---

Backend Agent

职责：

SpringBoot开发

输出：

Entity
DTO
VO
Mapper
Service
Controller

---

Frontend Agent

职责：

Vue3开发

输出：

Api
Store
View
Component

---

Test Agent

职责：

测试

输出：

测试用例

边界测试

异常测试

---

Review Agent

职责：

代码审查

输出：

风险

优化建议

重构建议

---

执行顺序

需求

↓

Product Agent

↓

Architect Agent

↓

DBA Agent

↓

Backend Agent

↓

Frontend Agent

↓

Test Agent

↓

Review Agent

---

对于任何需求：

必须先执行：

RESEARCH

再执行：

PLAN

最后执行：

IMPLEMENT

禁止跳过步骤。