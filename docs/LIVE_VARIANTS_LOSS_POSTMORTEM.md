# Impeccable Live Variants 丢失故障复盘

**日期**：2026-08-26  
**影响**：开发中的 3 个 Live 设计方案丢失  
**根因**：Live variants 临时文件机制 + 开发服务器重启  
**状态**：已修复开发环境，文档化预防措施

---

## 问题描述

用户在使用 Impeccable Live 迭代 Dragon Raja HUD 设计时，创建了 3 个设计方案（variants）。后续发现端口显示"无法连接父页面 Host"错误（左上角显示 body 字样），修复开发环境后，**之前的 3 个 Live 方案完全消失**。

### 用户视角的问题链

1. 最初创建了 3 个 Impeccable Live 设计方案
2. 开发预览出现连接错误（"无法连接父页面 Host"）
3. 修复后重新启动开发服务器
4. **所有 Live 方案消失**，`.impeccable/live/variants-*.html` 文件不存在

---

## 根本原因分析

### 1. Impeccable Live Variants 是临时的、会话级的文件

**设计行为**（非 bug）：

```
.impeccable/live/variants-<hash>.html
```

- 这些文件在 **Live session 期间存在**
- 当满足以下任一条件时**自动清理**：
  - Live server 进程停止
  - 浏览器 Live session 超时/关闭
  - 新的 Live session 启动（可能清理旧 variants）
  - 显式调用清理命令

**持久化机制**：

- Variants 本身**不是源代码**，只是临时预览
- 只有在 Live 界面点击 **"Accept"** 后，变更才会写入源文件
- 未 Accept 的方案在 session 结束后**永久丢失**

### 2. 开发服务器重启触发了清理

**时间线重建**：

```
T0: 用户创建 3 个 Live variants
    .impeccable/live/variants-<hash>.html 存在
    Live server PID 41888 运行在 :8400

T1: 用户报告连接错误（"无法连接父页面 Host"）
    原因：Frame buildId 不匹配 或 Host 服务未启动

T2: 修复开发环境
    - 重新启动 Host (5175)
    - 重新启动 Frame watch (5275)
    - 重新启动 Media server (5374)
    - 旧的 Live server (PID 41888) 被终止

T3: Variants 文件消失
    Live server 进程终止 → 临时文件清理
    .impeccable/live/server.json 仍记录旧 PID，但进程不存在
```

### 3. Build ID 不匹配导致连接失败

**直接原因**：

```typescript
// frameBootstrap.ts 构建时
const buildId = import.meta.env.VITE_BUILD_ID || 'development'

// Host 页面读取
const frameBuildId = frameElement.dataset.dragonRajaBuildId
if (frameBuildId !== expectedBuildId) {
  // 渲染错误页面："无法连接父页面 Host"
}
```

**触发条件**：

- Frame 使用旧的 build artifact（不同的 buildId）
- Host 使用新的 buildId
- 两者不匹配导致连接握手失败

**用户看到的**：

```
左上角显示 "body" 字样
→ 这是 Frame 的错误降级渲染
→ 整个 HUD 主题未加载，只显示基础 DOM
```

---

## 多重故障的级联效应

```
初始状态：Live session 活跃，3 个 variants 存在
    ↓
触发：开发预览连接失败（buildId 不匹配）
    ↓
修复尝试：重启开发服务器
    ↓
副作用：Live server 进程终止
    ↓
结果：Variants 文件被自动清理
```

**关键教训**：

开发环境的多服务依赖（Host + Frame + Media + Live）增加了故障的级联风险。一个服务的问题可能导致重启所有服务，从而丢失临时状态。

---

## 预防措施

### 1. 及时 Accept Live 方案

**规则**：

每创建一个满意的 variant 后，**立即在 Live 界面点击 "Accept"**，将变更持久化到源文件。

**不要**：

- ❌ 创建多个 variants，打算稍后一起 Accept
- ❌ 关闭浏览器/重启服务器前忘记 Accept
- ❌ 依赖 variants 文件作为"草稿存储"

**应该**：

- ✅ 每个方案验证后立即 Accept
- ✅ Accept 后可以继续创建新的 variants
- ✅ 把 variants 当作"临时预览"，不是"工作文件"

### 2. 统一的开发环境管理

**当前状态**（需要手动协调）：

```bash
# 终端 1
npm run dev:host

# 终端 2
cd mmd-hud-dragon-raja && npm run build:frame -- --watch

# 终端 3
node mmd-hud-dragon-raja/scripts/serve-cors.mjs mmd-hud-dragon-raja/dist/frame 5275

# 终端 4
node mmd-hud-dragon-raja/scripts/serve-cors.mjs mmd-hud-dragon-raja/output/imagegen 5374

# 终端 5 (可选)
/impeccable live
```

**推荐改进**：

创建统一的开发环境启动脚本：

```json
// package.json
{
  "scripts": {
    "dev:all": "concurrently \"npm:dev:host\" \"npm:dev:frame-watch\" \"npm:dev:media\" \"npm:dev:live\"",
    "dev:frame-watch": "cd mmd-hud-dragon-raja && npm run build:frame -- --watch",
    "dev:media": "node mmd-hud-dragon-raja/scripts/serve-cors.mjs mmd-hud-dragon-raja/output/imagegen 5374",
    "dev:live": "echo 'Run /impeccable live in Claude Code'"
  }
}
```

或使用进程管理工具：

```bash
# pm2, foreman,或自定义 shell 脚本
```

### 3. Build ID 同步检查

**在开发脚本中添加验证**：

```typescript
// scripts/dev-check.ts
const hostBuildId = process.env.VITE_BUILD_ID || 'dragon-raja-local-preview'
const frameBuildId = fs.readFileSync('dist/frame/dragonRajaFrame.js', 'utf-8')
  .match(/buildId:\s*"([^"]+)"/)?.[1]

if (hostBuildId !== frameBuildId) {
  console.error(`❌ Build ID 不匹配:`)
  console.error(`   Host: ${hostBuildId}`)
  console.error(`   Frame: ${frameBuildId}`)
  console.error(`   请运行: npm run build:frame`)
  process.exit(1)
}
```

### 4. Live Server 健康检查

**在重启服务前检查**：

```bash
# 检查 Live server 是否运行
curl http://localhost:8400/__impeccable/health 2>/dev/null

# 如果有活跃 variants，警告用户
if [ -f .impeccable/live/variants-*.html ]; then
  echo "⚠️  检测到未保存的 Live variants"
  echo "   请在 Live 界面 Accept 后再重启服务"
  read -p "继续重启? (y/N) " -n 1 -r
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi
```

### 5. Variants 快照备份（可选）

**自动备份机制**（如果未来需要）：

```typescript
// .impeccable/live/backup/
// 每次创建 variant 时自动复制一份带时间戳的备份
variants-<hash>.html
  → backup/variants-<hash>-2026-08-26T14-30-00.html
```

**权衡**：

- 增加磁盘占用
- 可能给用户误导（认为 backup 可以恢复，但实际上 Live server 不读取 backup）
- 暂不实施，优先教育用户及时 Accept

---

## 此次修复操作

### 已完成

1. ✅ 统一 Build ID 为 `dragon-raja-local-preview`
2. ✅ 重新启动完整开发环境：
   - Host: http://127.0.0.1:5175/
   - Frame: 5275 端口（949 KB，watch 模式）
   - Media: 5374 端口
3. ✅ 验证连接正常（移除"左上角 body 字样"错误）

### 未恢复

- ❌ 之前的 3 个 Live variants **无法恢复**
  - 临时文件已被清理
  - 未 Accept 的方案永久丢失
  - 需要重新创建

---

## 对用户的建议

### 立即行动

1. **记录之前的设计意图**：
   - 3 个 variants 的设计方向是什么？
   - 哪些视觉调整？哪些交互改进？
   - 可以口头描述，Claude 可以重新实现

2. **重新开始 Live 迭代**：
   ```bash
   /impeccable live
   ```
   - 基于当前源代码状态
   - 参考 DESIGN.md 的设计原则
   - **每个方案验证后立即 Accept**

### 长期习惯

- **Live variants 不是草稿系统**，是临时预览
- **Accept 是唯一的持久化途径**
- **服务器重启前检查是否有未保存的 variants**
- **使用 Git 管理源代码变更**（Accept 后的文件修改）

---

## 相关文档

- [LIVE_PREVIEW_WEBGL_POSTMORTEM.md](./LIVE_PREVIEW_WEBGL_POSTMORTEM.md) — 之前的 WebGL + Live 故障复盘
- [DEVELOPMENT_AND_RELEASE.md](./DEVELOPMENT_AND_RELEASE.md) — 开发环境设置
- [DESIGN.md](../DESIGN.md) — Dragon Raja HUD 设计系统

---

## 附录：技术细节

### Impeccable Live 文件结构

```
.impeccable/
├─ live/
│  ├─ config.json              # Live 配置（注入点、端口）
│  ├─ server.json              # Live server 状态（PID、端口、时间戳）
│  ├─ variants-<hash>.html     # 临时方案文件（session 级）
│  └─ variants-<hash>.json     # 方案元数据（可选）
├─ design.json                 # 设计系统 sidecar（从 DESIGN.md 生成）
└─ hooks/
   └─ config.json              # Hook 配置（忽略规则、值白名单）
```

### Live Server 生命周期

```
启动: /impeccable live
  → 生成 server.json (PID, port, timestamp)
  → 启动 HTTP server (:8400)
  → 注入 Live helper script 到开发页面

创建 variant:
  → variants-<hash>.html 写入磁盘
  → 浏览器预览 http://localhost:8400/live/<hash>

Accept variant:
  → 读取 variant 的 diff
  → 应用到源文件（通过 Claude）
  → variant 文件保留（但可被清理）

停止: Ctrl+C / 进程终止 / session 超时
  → 清理 variants-*.html
  → server.json 保留（记录最后状态）
  → 下次启动会覆盖 server.json
```

### Frame Bootstrap Build ID 检查

```typescript
// src/frame/frameBootstrap.ts
const EXPECTED_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'development'

// 构建时写入 dataset
frameElement.dataset.dragonRajaBuildId = EXPECTED_BUILD_ID

// Host 读取并验证
if (frameElement.dataset.dragonRajaBuildId !== hostExpectedBuildId) {
  renderErrorPage('Build ID 不匹配，请刷新页面')
}
```

**常见不匹配场景**：

| Host Build ID | Frame Build ID | 结果 |
|---------------|----------------|------|
| `dragon-raja-local-preview` | `dragon-raja-local-preview` | ✅ 连接成功 |
| `dragon-raja-local-preview` | `development` | ❌ 错误页面 |
| `production-v1.2.3` | `dragon-raja-local-preview` | ❌ 错误页面 |
| `undefined` | `development` | ⚠️ 可能成功（取决于代码） |

**修复方法**：

1. 统一环境变量：
   ```bash
   export VITE_BUILD_ID=dragon-raja-local-preview
   ```

2. 或在 `.env.development` 中设置：
   ```
   VITE_BUILD_ID=dragon-raja-local-preview
   ```

3. 重新构建 Frame：
   ```bash
   npm run build:frame
   ```

---

**总结**：此次故障是 Live session 机制 + 开发环境重启的级联效应。核心教训是**及时 Accept Live 方案**，并建立统一的开发环境管理流程。
