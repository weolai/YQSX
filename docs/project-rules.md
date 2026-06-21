# 技术栈

Backend

- SpringBoot 3
- MyBatis Plus
- Sa-Token
- Redis
- MySQL

Frontend

- Vue3
- TypeScript
- Pinia
- Element Plus

---

# 后端规范

Controller：

仅负责：

- 参数接收
- 参数校验
- 返回结果

禁止：

- SQL
- 业务逻辑

---

Service：

负责：

- 业务逻辑
- 事务管理

---

Mapper：

负责：

- 数据访问

禁止：

- 业务逻辑

---

DTO

请求对象

VO

返回对象

Entity

数据库对象

---

统一返回格式

{
  "code": 200,
  "message": "success",
  "data": {}
}

---

异常处理

统一：

GlobalExceptionHandler

---

日志规范

必须：

- 请求日志
- 异常日志
- 业务日志

---

数据库规范

表名：

t_user
t_role
t_menu

字段：

create_time
update_time

主键：

id

必须：

- 索引设计
- 字段注释
- 表注释

---

前端规范

必须：

Vue3

Composition API

TypeScript Strict

Pinia

禁止：

Options API

any

---

页面必须包含：

Loading

Empty

Error

---

接口调用

统一：

api目录

禁止：

页面直接axios

---

权限模型

RBAC

用户

↓

角色

↓

菜单

↓

权限

权限编码：

system:user:list

system:user:add

system:user:update

system:user:delete