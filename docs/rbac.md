# RBAC权限模型文档

## 什么是RBAC

RBAC（Role-Based Access Control）基于角色的访问控制，是目前最常用的权限管理模型。

**核心思想**：通过角色关联用户和权限，实现权限的灵活分配和管理。

## 权限模型结构

```
用户(User) ──┐
             ├──> 角色(Role) ──┐
用户(User) ──┘                 ├──> 菜单(Menu) ──> 权限(Permission)
                               │
用户(User) ──┐                 │
             ├──> 角色(Role) ──┘
用户(User) ──┘
```

### 关系说明

- **用户 ↔ 角色**：多对多关系，一个用户可以拥有多个角色
- **角色 ↔ 菜单**：多对多关系，一个角色可以访问多个菜单
- **菜单 ↔ 权限**：一对多关系，一个菜单包含多个权限（增删改查等）

## 数据库设计

### 用户表 (t_user)

```sql
CREATE TABLE t_user (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT '密码（加密）',
    nickname VARCHAR(50) DEFAULT '' COMMENT '昵称',
    mobile VARCHAR(20) DEFAULT '' COMMENT '手机号',
    email VARCHAR(100) DEFAULT '' COMMENT '邮箱',
    avatar VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 角色表 (t_role)

```sql
CREATE TABLE t_role (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '角色ID',
    role_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    description VARCHAR(200) DEFAULT '' COMMENT '角色描述',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';
```

### 菜单表 (t_menu)

```sql
CREATE TABLE t_menu (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
    parent_id BIGINT NOT NULL DEFAULT 0 COMMENT '父菜单ID，0表示根节点',
    menu_name VARCHAR(50) NOT NULL COMMENT '菜单名称',
    menu_type TINYINT NOT NULL COMMENT '菜单类型：1-目录，2-菜单，3-按钮',
    path VARCHAR(200) DEFAULT '' COMMENT '路由地址',
    component VARCHAR(200) DEFAULT '' COMMENT '组件路径',
    permission VARCHAR(100) DEFAULT '' COMMENT '权限标识',
    icon VARCHAR(50) DEFAULT '' COMMENT '菜单图标',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    visible TINYINT NOT NULL DEFAULT 1 COMMENT '是否可见：1-是，2-否',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，2-禁用',
    is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单表';
```

### 用户角色关联表 (t_user_role)

```sql
CREATE TABLE t_user_role (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_role (user_id, role_id),
    KEY idx_user_id (user_id),
    KEY idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';
```

### 角色菜单关联表 (t_role_menu)

```sql
CREATE TABLE t_role_menu (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    menu_id BIGINT NOT NULL COMMENT '菜单ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_menu (role_id, menu_id),
    KEY idx_role_id (role_id),
    KEY idx_menu_id (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色菜单关联表';
```

## 权限编码规范

### 编码格式

```
{模块}:{功能}:{操作}
```

### 编码示例

| 权限标识 | 说明 |
|---------|------|
| system:user:list | 用户列表查询 |
| system:user:add | 用户添加 |
| system:user:update | 用户修改 |
| system:user:delete | 用户删除 |
| system:user:export | 用户导出 |
| system:user:import | 用户导入 |
| system:user:reset | 重置密码 |
| system:role:list | 角色列表查询 |
| system:role:add | 角色添加 |
| system:role:update | 角色修改 |
| system:role:delete | 角色删除 |
| product:product:list | 商品列表查询 |
| product:product:add | 商品添加 |
| product:product:update | 商品修改 |
| product:product:delete | 商品删除 |
| order:order:list | 订单列表查询 |
| order:order:detail | 订单详情查看 |
| order:order:cancel | 订单取消 |

## 菜单类型说明

### 1. 目录（menuType=1）

顶层菜单分类，不对应具体页面。

**示例**：
```json
{
  "id": 1,
  "parentId": 0,
  "menuName": "系统管理",
  "menuType": 1,
  "path": "/system",
  "icon": "setting",
  "sortOrder": 1
}
```

### 2. 菜单（menuType=2）

具体的页面菜单，对应前端路由和组件。

**示例**：
```json
{
  "id": 2,
  "parentId": 1,
  "menuName": "用户管理",
  "menuType": 2,
  "path": "/system/user",
  "component": "system/user/index",
  "permission": "system:user:list",
  "icon": "user",
  "sortOrder": 1
}
```

### 3. 按钮（menuType=3）

页面内的操作按钮权限。

**示例**：
```json
{
  "id": 3,
  "parentId": 2,
  "menuName": "新增用户",
  "menuType": 3,
  "permission": "system:user:add",
  "sortOrder": 1
}
```

## 权限校验

### Sa-Token注解

#### 1. 登录校验

```java
@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    
    /**
     * 需要登录才能访问
     */
    @GetMapping("/info")
    @SaCheckLogin
    public Result<UserVO> getUserInfo() {
        Long userId = StpUtil.getLoginIdAsLong();
        // ...
    }
}
```

#### 2. 权限校验

```java
@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    
    /**
     * 需要有指定权限
     */
    @PostMapping
    @SaCheckPermission("system:user:add")
    public Result<UserVO> add(@RequestBody @Valid UserDTO dto) {
        // ...
    }
    
    /**
     * 需要有多个权限之一（OR）
     */
    @PutMapping("/{id}")
    @SaCheckPermission(value = {"system:user:update", "system:user:edit"}, mode = SaMode.OR)
    public Result<UserVO> update(@PathVariable Long id, @RequestBody @Valid UserDTO dto) {
        // ...
    }
    
    /**
     * 需要同时拥有多个权限（AND）
     */
    @DeleteMapping("/{id}")
    @SaCheckPermission(value = {"system:user:delete", "system:user:remove"}, mode = SaMode.AND)
    public Result<?> delete(@PathVariable Long id) {
        // ...
    }
}
```

#### 3. 角色校验

```java
@RestController
@RequestMapping("/api/v1/user")
public class UserController {
    
    /**
     * 需要有指定角色
     */
    @DeleteMapping("/{id}")
    @SaCheckRole("admin")
    public Result<?> delete(@PathVariable Long id) {
        // ...
    }
    
    /**
     * 需要有多个角色之一（OR）
     */
    @GetMapping("/list")
    @SaCheckRole(value = {"admin", "manager"}, mode = SaMode.OR)
    public Result<List<UserVO>> list() {
        // ...
    }
}
```

### 编程式权限校验

```java
@Service
public class UserService {
    
    public void deleteUser(Long userId) {
        // 校验是否登录
        StpUtil.checkLogin();
        
        // 校验是否有权限
        StpUtil.checkPermission("system:user:delete");
        
        // 校验是否有角色
        StpUtil.checkRole("admin");
        
        // 校验是否有权限（OR）
        StpUtil.checkPermissionOr("system:user:delete", "system:user:remove");
        
        // 校验是否有角色（OR）
        StpUtil.checkRoleOr("admin", "manager");
        
        // 业务逻辑
        userMapper.deleteById(userId);
    }
}
```

### 前端权限指令

#### Vue3自定义指令

```typescript
// directives/permission.ts
import { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

export const permission: Directive = {
  mounted(el, binding) {
    const { value } = binding
    const userStore = useUserStore()
    
    if (value && value instanceof Array && value.length > 0) {
      const permissions = userStore.permissions
      const hasPermission = value.some(permission => {
        return permissions.includes(permission)
      })
      
      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el)
      }
    }
  }
}
```

#### 使用示例

```vue
<template>
  <!-- 单个权限 -->
  <el-button v-permission="['system:user:add']">新增</el-button>
  
  <!-- 多个权限之一 -->
  <el-button v-permission="['system:user:update', 'system:user:edit']">编辑</el-button>
  
  <!-- 角色权限 -->
  <el-button v-role="['admin']">删除</el-button>
</template>
```

## 权限数据初始化

### 初始化SQL

```sql
-- 插入角色
INSERT INTO t_role (id, role_name, role_code, description, sort_order, status) VALUES
(1, '超级管理员', 'admin', '拥有所有权限', 1, 1),
(2, '普通管理员', 'manager', '拥有部分管理权限', 2, 1),
(3, '普通用户', 'user', '基础用户权限', 3, 1);

-- 插入菜单（目录）
INSERT INTO t_menu (id, parent_id, menu_name, menu_type, path, icon, sort_order, visible, status) VALUES
(1, 0, '系统管理', 1, '/system', 'setting', 1, 1, 1),
(2, 0, '商品管理', 1, '/product', 'shopping', 2, 1, 1),
(3, 0, '订单管理', 1, '/order', 'order', 3, 1, 1);

-- 插入菜单（页面）
INSERT INTO t_menu (id, parent_id, menu_name, menu_type, path, component, permission, icon, sort_order, visible, status) VALUES
(11, 1, '用户管理', 2, '/system/user', 'system/user/index', 'system:user:list', 'user', 1, 1, 1),
(12, 1, '角色管理', 2, '/system/role', 'system/role/index', 'system:role:list', 'role', 2, 1, 1),
(13, 1, '菜单管理', 2, '/system/menu', 'system/menu/index', 'system:menu:list', 'menu', 3, 1, 1),
(21, 2, '商品列表', 2, '/product/list', 'product/list/index', 'product:product:list', 'list', 1, 1, 1),
(22, 2, '商品分类', 2, '/product/category', 'product/category/index', 'product:category:list', 'category', 2, 1, 1),
(31, 3, '订单列表', 2, '/order/list', 'order/list/index', 'order:order:list', 'list', 1, 1, 1);

-- 插入菜单（按钮）
INSERT INTO t_menu (id, parent_id, menu_name, menu_type, permission, sort_order, visible, status) VALUES
(111, 11, '新增用户', 3, 'system:user:add', 1, 1, 1),
(112, 11, '编辑用户', 3, 'system:user:update', 2, 1, 1),
(113, 11, '删除用户', 3, 'system:user:delete', 3, 1, 1),
(114, 11, '重置密码', 3, 'system:user:reset', 4, 1, 1),
(121, 12, '新增角色', 3, 'system:role:add', 1, 1, 1),
(122, 12, '编辑角色', 3, 'system:role:update', 2, 1, 1),
(123, 12, '删除角色', 3, 'system:role:delete', 3, 1, 1),
(211, 21, '新增商品', 3, 'product:product:add', 1, 1, 1),
(212, 21, '编辑商品', 3, 'product:product:update', 2, 1, 1),
(213, 21, '删除商品', 3, 'product:product:delete', 3, 1, 1),
(311, 31, '订单详情', 3, 'order:order:detail', 1, 1, 1),
(312, 31, '取消订单', 3, 'order:order:cancel', 2, 1, 1);

-- 超级管理员角色分配所有菜单权限
INSERT INTO t_role_menu (role_id, menu_id)
SELECT 1, id FROM t_menu WHERE is_deleted = 0;

-- 插入测试用户
INSERT INTO t_user (id, username, password, nickname, status) VALUES
(1, 'admin', '$2a$10$7JB720yubVSZvUI0rEqK/.VqGOZTH.ulu33dHOiBE/sLenLdJL.ka', '超级管理员', 1); -- 密码: admin123

-- 用户角色关联
INSERT INTO t_user_role (user_id, role_id) VALUES (1, 1);
```

## Sa-Token配置

### application.yml配置

```yaml
sa-token:
  # token名称（同时也是cookie名称）
  token-name: Authorization
  # token有效期（单位：秒）-1代表永不过期
  timeout: 7200
  # token临时有效期（指定时间内无操作就视为token过期）单位：秒
  activity-timeout: 1800
  # 是否允许同一账号并发登录（为true时允许一起登录，为false时新登录挤掉旧登录）
  is-concurrent: true
  # 在多人登录同一账号时，是否共用一个token（为true时所有登录共用一个token，为false时每次登录新建一个token）
  is-share: false
  # token风格（默认可取值：uuid、simple-uuid、random-32、random-64、random-128、tik）
  token-style: uuid
  # 是否输出操作日志
  is-log: true
```

### StpInterface实现

```java
@Component
public class StpInterfaceImpl implements StpInterface {
    
    @Autowired
    private UserService userService;
    
    /**
     * 返回用户的权限列表
     */
    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        Long userId = Long.valueOf(loginId.toString());
        return userService.getPermissionsByUserId(userId);
    }
    
    /**
     * 返回用户的角色列表
     */
    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        Long userId = Long.valueOf(loginId.toString());
        return userService.getRolesByUserId(userId);
    }
}
```

## 登录认证流程

### 1. 用户登录

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    
    @Autowired
    private UserService userService;
    
    @PostMapping("/login")
    public Result<LoginVO> login(@RequestBody @Valid LoginDTO dto) {
        // 1. 验证用户名密码
        User user = userService.login(dto.getUsername(), dto.getPassword());
        
        // 2. 登录成功，记录登录状态
        StpUtil.login(user.getId());
        
        // 3. 获取Token
        String token = StpUtil.getTokenValue();
        
        // 4. 获取用户信息
        UserVO userVO = userService.getUserInfo(user.getId());
        
        // 5. 获取用户权限
        List<String> permissions = userService.getPermissionsByUserId(user.getId());
        
        // 6. 获取用户菜单
        List<MenuVO> menus = userService.getMenusByUserId(user.getId());
        
        // 7. 返回登录信息
        LoginVO loginVO = new LoginVO();
        loginVO.setToken(token);
        loginVO.setUser(userVO);
        loginVO.setPermissions(permissions);
        loginVO.setMenus(menus);
        
        return Result.success(loginVO);
    }
}
```

### 2. 用户注销

```java
@PostMapping("/logout")
@SaCheckLogin
public Result<?> logout() {
    StpUtil.logout();
    return Result.success("注销成功");
}
```

### 3. Token续期

```java
@GetMapping("/refresh")
@SaCheckLogin
public Result<String> refreshToken() {
    // 续期token
    StpUtil.renewTimeout(7200);
    String token = StpUtil.getTokenValue();
    return Result.success(token);
}
```

## 权限管理接口

### 1. 获取角色权限

```java
@GetMapping("/role/{roleId}/permissions")
@SaCheckPermission("system:role:query")
public Result<List<Long>> getRolePermissions(@PathVariable Long roleId) {
    List<Long> menuIds = roleMenuService.getMenuIdsByRoleId(roleId);
    return Result.success(menuIds);
}
```

### 2. 分配角色权限

```java
@PostMapping("/role/{roleId}/permissions")
@SaCheckPermission("system:role:update")
public Result<?> assignRolePermissions(
    @PathVariable Long roleId,
    @RequestBody List<Long> menuIds
) {
    roleMenuService.assignRolePermissions(roleId, menuIds);
    return Result.success("分配成功");
}
```

### 3. 获取用户角色

```java
@GetMapping("/user/{userId}/roles")
@SaCheckPermission("system:user:query")
public Result<List<Long>> getUserRoles(@PathVariable Long userId) {
    List<Long> roleIds = userRoleService.getRoleIdsByUserId(userId);
    return Result.success(roleIds);
}
```

### 4. 分配用户角色

```java
@PostMapping("/user/{userId}/roles")
@SaCheckPermission("system:user:update")
public Result<?> assignUserRoles(
    @PathVariable Long userId,
    @RequestBody List<Long> roleIds
) {
    userRoleService.assignUserRoles(userId, roleIds);
    
    // 清除用户权限缓存
    StpUtil.kickout(userId);
    
    return Result.success("分配成功");
}
```

## 前端权限处理

### 1. 权限Store

```typescript
// stores/permission.ts
import { defineStore } from 'pinia'
import { login } from '@/api/auth'
import type { LoginForm, LoginResponse } from '@/api/auth/types'

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    permissions: [] as string[],
    roles: [] as string[],
    menus: [] as any[]
  }),
  
  getters: {
    hasPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission)
    },
    
    hasRole: (state) => (role: string) => {
      return state.roles.includes(role)
    }
  },
  
  actions: {
    async login(loginForm: LoginForm) {
      const res = await login(loginForm)
      const { token, user, permissions, menus } = res.data
      
      // 保存token
      localStorage.setItem('token', token)
      
      // 保存权限
      this.permissions = permissions
      this.menus = menus
      
      return res
    },
    
    clearPermission() {
      this.permissions = []
      this.roles = []
      this.menus = []
      localStorage.removeItem('token')
    }
  }
})
```

### 2. 路由守卫

```typescript
// router/permission.ts
import router from './index'
import { usePermissionStore } from '@/stores/permission'

router.beforeEach(async (to, from, next) => {
  const permissionStore = usePermissionStore()
  const token = localStorage.getItem('token')
  
  if (token) {
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      // 检查权限
      if (to.meta.permission) {
        const hasPermission = permissionStore.hasPermission(to.meta.permission as string)
        if (hasPermission) {
          next()
        } else {
          next({ path: '/403' })
        }
      } else {
        next()
      }
    }
  } else {
    if (to.path === '/login') {
      next()
    } else {
      next({ path: '/login' })
    }
  }
})
```

## 最佳实践

### 1. 权限粒度

- **粗粒度**：模块级别（如：系统管理、商品管理）
- **细粒度**：功能级别（如：新增、编辑、删除、查看）
- **推荐**：功能级别，便于灵活控制

### 2. 超级管理员

- 拥有所有权限，不受权限控制
- 代码中特殊判断

```java
public boolean hasPermission(Long userId, String permission) {
    // 超级管理员
    if (isSuperAdmin(userId)) {
        return true;
    }
    
    // 普通用户
    List<String> permissions = getPermissionsByUserId(userId);
    return permissions.contains(permission);
}
```

### 3. 数据权限

除了功能权限，还需要控制数据范围：

- **全部数据**：查看所有数据
- **部门数据**：只能查看本部门数据
- **个人数据**：只能查看自己的数据

### 4. 权限缓存

权限信息缓存到Redis，减少数据库查询：

```java
public List<String> getPermissionsByUserId(Long userId) {
    String cacheKey = "user:permissions:" + userId;
    
    // 从缓存获取
    List<String> permissions = redisTemplate.opsForValue().get(cacheKey);
    if (permissions != null) {
        return permissions;
    }
    
    // 从数据库查询
    permissions = permissionMapper.selectByUserId(userId);
    
    // 写入缓存
    redisTemplate.opsForValue().set(cacheKey, permissions, 30, TimeUnit.MINUTES);
    
    return permissions;
}
```

### 5. 权限变更

当用户权限变更时，需要：

1. 清除权限缓存
2. 强制用户重新登录（或自动刷新权限）

```java
public void updateUserRoles(Long userId, List<Long> roleIds) {
    // 更新用户角色
    userRoleService.updateUserRoles(userId, roleIds);
    
    // 清除权限缓存
    String cacheKey = "user:permissions:" + userId;
    redisTemplate.delete(cacheKey);
    
    // 踢出用户（强制重新登录）
    StpUtil.kickout(userId);
}
```

## 注意事项

1. **权限编码唯一性**：确保每个权限编码全局唯一
2. **权限命名规范**：遵循统一的命名规范
3. **最小权限原则**：用户只分配必要的权限
4. **权限测试**：充分测试权限控制逻辑
5. **敏感操作日志**：记录权限变更、角色分配等操作日志
6. **防止越权**：接口层和服务层都要进行权限校验

## 参考资料

- [Sa-Token官方文档](https://sa-token.cc/)
- [RBAC权限模型详解](https://zh.wikipedia.org/wiki/%E4%BB%A5%E8%A7%92%E8%89%B2%E7%82%BA%E5%9F%BA%E7%A4%8E%E7%9A%84%E5%AD%98%E5%8F%96%E6%8E%A7%E5%88%B6)
