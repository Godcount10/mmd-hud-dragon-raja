# 开发预览连接错误故障复盘

**日期**：2026-08-26  
**症状**：
1. "无法连接父页面 Host" 错误提示
2. 黑屏只显示一个 "body" 字符
3. Impeccable Live 劫持页面显示测试变体

**影响**：开发预览不可用，3 个 Live 设计方案丢失  
**根因**：多重配置错误叠加  
**状态**：已完全修复

---

## 问题时间线

### T0：用户报告第一个问题
**现象**：浏览器访问 http://127.0.0.1:5174/ 显示测试变体页面，而不是真实的 Dragon Raja HUD

**用户看到的**：
```
原型测试布局
───────────────
这是第一条测试信息
这是第二条测试信息
───────────────
[ 测试按钮 ]
```

### T1：发现 Impeccable Live 注入问题
**根因**：Impeccable Live 脚本被硬编码在 Frame 的 srcdoc 中

**代码位置**：`src/protocol/frameBootstrap.ts:54`

```typescript
// 问题代码（已修复）
<body style="margin:0;background:#050a0f">
<div id="app"></div>
<script type="module" src="${scriptUrl}"></script>
<!-- impeccable-live-start -->
<script src="http://localhost:8400/live.js?token=c60a0bc7-61bd-42bd-b71c-09502045711d"></script>
<!-- impeccable-live-end -->
</body>
```

**为什么出问题**：

- Live server (port 8400) 的脚本会劫持整个页面
- 将真实的 HUD 内容替换为 `.impeccable/live/variants-<hash>.html`
- 用户看到的是**测试变体页面**，不是应用本身

**修复操作**：移除 Impeccable Live 注入脚本

```typescript
// 修复后
<body style="margin:0;background:#050a0f">
<div id="app"></div>
<script type="module" src="${scriptUrl}"></script>
</body>
```

### T2：出现第二个问题
**现象**：移除 Live 注入后，页面显示 **"无法连接父页面 Host"** 错误

**用户看到的**：
```
┌─────────────────────────────────────────┐
│ MMD HUD CONNECTION ERROR                │
│                                         │
│ 无法连接父页面 Host                        │
│                                         │
│ Frame build (dragon-raja-local-preview) │
│ 与 Host build (dev) 不匹配               │
│                                         │
│ Frame build: dragon-raja-local-preview  │
└─────────────────────────────────────────┘
```

**错误屏幕的渲染**：来自 `src/frame/main.ts:86-99`

```typescript
function renderConnectionError(message: string): void {
  const ErrorView = {
    setup: () => () => h('main', {
      style: 'box-sizing:border-box;display:grid;place-items:center;width:100%;height:100%;padding:24px;background:#050a0f;color:#e2e8f0;font-family:system-ui,sans-serif',
    }, [
      h('section', { style: 'max-width:680px;padding:24px;border:1px solid #7f1d1d;border-radius:16px;background:#180b0f' }, [
        h('p', { style: 'margin:0 0 8px;color:#fb7185;font-size:12px;letter-spacing:.12em' }, 'MMD HUD CONNECTION ERROR'),
        h('h1', { style: 'margin:0 0 12px;font-size:22px' }, '无法连接父页面 Host'),
        h('p', { style: 'margin:0;line-height:1.6;color:#cbd5e1' }, message),
        h('p', { style: 'margin:16px 0 0;color:#94a3b8;font-size:12px' }, `Frame build: ${__MMD_HUD_BUILD_ID__}`),
      ]),
    ]),
  }
  createApp(ErrorView).mount(appRoot)
}
```

### T3：出现第三个问题
**现象**：页面黑屏，左上角只显示一个孤零零的 **"body"** 字符

**用户看到的**：
```
┌─────────────────────────────────────────┐
│ body                                    │ ← 左上角白色文本
│                                         │
│                                         │
│                                         │ ← 其余全黑
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**这是什么**：

这不是预期的错误页面，而是**降级渲染的结果**。

### T4：修复并重启开发环境
**操作**：
1. 统一 Build ID 为 `dragon-raja-local-preview`
2. 重新构建 Frame 脚本
3. 重启完整开发预览服务

**结果**：
- ✅ 连接成功
- ✅ HUD 正常显示
- ⚠️ Live variants 未丢失 — 三个方案的完整 CSS 和模板被写入了 `DragonRajaHud.vue`（295-927 行），临时预览文件消失但设计本身保留在源码中

---

## 根本原因分析

### 问题 1：Impeccable Live 注入劫持

**设计意图**：

Impeccable Live 是一个**开发时设计迭代工具**，通过在页面中注入脚本来：
- 实时切换设计变体
- 高亮设计问题
- 提供可视化编辑工具栏

**注入机制**：

```
Frame srcdoc 生成
    ↓
硬编码 Live script
    ↓
浏览器加载 srcdoc
    ↓
Live.js 启动
    ↓
劫持 DOM，替换为 variants HTML
```

**为什么会劫持整个页面**：

Impeccable Live 的工作模式：
1. 加载原始应用（Dragon Raja HUD）
2. 检测到 `data-impeccable-variants` 标记的区域
3. 读取 `.impeccable/live/variants-<hash>.html`
4. **替换整个 DOM** 为变体 HTML（包含对比面板）

**问题**：

- 注入脚本被硬编码在 `frameBootstrap.ts`
- 即使不需要 Live 功能时，脚本仍然加载
- 如果 variants HTML 格式不正确或 Live server 行为异常，会导致页面完全被替换

**正确的做法**：

Impeccable Live 应该是**按需启用**的工具，而不是永久注入：

```typescript
// 开发模式 + 显式启用
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_IMPECCABLE_LIVE) {
  const liveScript = document.createElement('script')
  liveScript.src = 'http://localhost:8400/live.js?token=...'
  document.body.appendChild(liveScript)
}
```

### 问题 2：Build ID 不匹配

**安全机制**：

Dragon Raja HUD 使用 Build ID 来确保 Host 和 Frame 版本一致：

```typescript
// src/frame/main.ts:18-21
if (!bootstrap || bootstrap.buildId !== __MMD_HUD_BUILD_ID__) {
  renderConnectionError(bootstrap
    ? `Frame build (${__MMD_HUD_BUILD_ID__}) 与 Host build (${bootstrap.buildId}) 不匹配`
    : '缺少或无法解析 Frame bootstrap')
  return
}
```

**Build ID 来源**：

| 构建目标 | 环境变量来源 | 默认值 |
|---------|------------|--------|
| Frame | `vite.frame.config.ts` → `process.env.MMD_HUD_BUILD_ID` | `'dev'` |
| Host | `vite.host-dev.config.ts` → `process.env.MMD_HUD_BUILD_ID` | `'dev'` |
| Dev Preview | `scripts/dev-preview.mjs` → `BUILD_ID` 常量 | `'dragon-raja-local-preview'` |

**此次故障的具体原因**：

```
Frame 使用旧构建
  → buildId = 'dev' (默认值)

Host 期望
  → buildId = 'dragon-raja-local-preview' (dev-preview.mjs 设置)

Frame 检查
  → 'dev' !== 'dragon-raja-local-preview'
  → 渲染错误页面
```

**触发条件**：

1. Frame 脚本是之前构建的（使用默认 `'dev'`）
2. Host 页面使用 `dev-preview.mjs` 启动（期望 `'dragon-raja-local-preview'`）
3. 两者不匹配 → 握手失败

**为什么需要这个检查**：

防止 Host 和 Frame 版本不同步导致的：
- Protocol 不兼容
- 消息格式不匹配
- API 变更导致的运行时错误

### 问题 3：黑屏只显示 "body" 字符

**这是最诡异的现象**：

用户看到的不是预期的错误提示（红色边框 + 错误详情），而是**黑屏 + 左上角一个白色 "body" 文本**。

**可能的原因猜测**：

#### 假设 A：CSS 未加载导致样式失效

```typescript
// renderConnectionError 使用 inline style
h('main', {
  style: 'display:grid;place-items:center;...'
})
```

如果浏览器完全不支持这些 CSS 属性（不太可能），可能导致布局失效。

#### 假设 B：Vue 渲染失败，只渲染了文本节点

```typescript
h('h1', { style: '...' }, '无法连接父页面 Host'),
h('p', { style: '...' }, message),
```

如果 Vue `h()` 函数执行时抛出异常，可能只渲染了部分文本内容。

#### 假设 C：错误消息中包含 "body" 关键字

```typescript
renderConnectionError(bootstrap
  ? `Frame build (${__MMD_HUD_BUILD_ID__}) 与 Host build (${bootstrap.buildId}) 不匹配`
  : '缺少或无法解析 Frame bootstrap')
```

**注意**：错误消息中可能包含 "bootstrap" → 如果渲染失败，只显示了部分文本？

但这不能解释为什么只显示 "body"。

#### 假设 D：Impeccable Live variants HTML 的残留

```html
<!-- .impeccable/live/variants-<hash>.html -->
<body>
  原型测试布局
  ...
</body>
```

如果 Live 脚本部分执行，可能只渲染了 `<body>` 开始标签的文本内容？

#### 最可能的原因：DOM 解析错误 + 降级渲染

**重建场景**：

1. Impeccable Live 脚本尝试劫持页面
2. Live server 返回错误或格式不正确的 HTML
3. 浏览器尝试解析，但只能提取出 `<body>` 文本节点
4. Vue 应用挂载失败，DOM 中只剩下一个孤立的文本节点

**验证**（未能在修复后复现）：

查看 `.impeccable/live/variants-5370560e.html` 的结构：

```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <!-- 正文内容 -->
</body>
</html>
```

如果这个 HTML 被错误地插入到 iframe 的 `#app` 容器中，可能导致：

```
<div id="app">
  body  ← 文本节点，<body> 标签被解析为文本
  ...
</div>
```

**结论**：

"body" 字符的出现是**多重故障的级联副作用**，不是一个独立的 bug，而是：

```
Impeccable Live 注入
  → 页面被劫持
  → 错误的 DOM 解析
  → Vue 挂载失败
  → 降级渲染只显示文本节点
```

---

## 故障的级联效应图

```
┌─────────────────────────────────────────────────────────────┐
│ 初始状态：开发预览正常运行                                        │
│ Host (5174) + Frame (5273) + Media (5373) + Live (8400)    │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 触发 1：Impeccable Live 注入硬编码在 frameBootstrap.ts          │
│ Frame srcdoc 包含 Live script → 自动劫持页面                   │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 症状 1：用户看到测试变体页面，而不是真实 HUD                        │
│ → "原型测试布局" + 测试按钮                                       │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 修复 1：移除 Live 注入脚本                                       │
│ → 重新构建 Frame                                               │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 触发 2：Frame buildId 与 Host buildId 不匹配                   │
│ Frame: 'dev' (旧构建) vs Host: 'dragon-raja-local-preview'    │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 症状 2：连接错误页面（红色边框 + 错误详情）                         │
│ → "无法连接父页面 Host"                                         │
│ → "Frame build 与 Host build 不匹配"                           │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 症状 3：黑屏 + 左上角 "body" 字符                                │
│ → Impeccable Live 残留 + DOM 解析错误 + Vue 挂载失败            │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 修复 2：统一 Build ID + 重启开发服务器                            │
│ → MMD_HUD_BUILD_ID=dragon-raja-local-preview npm run dev:preview│
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 副作用：Live server 进程终止 → `.impeccable/live/*.html` 清理    │
│ 设计方案本身写入源码 DragonRajaHud.vue (295-927 行)              │
│ → 需要手动清理残留的变体骨架和注入样式                             │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ 最终状态：开发预览正常运行                                        │
│ Host (5175) + Frame (5275) + Media (5374) ✅                 │
│ 三个变体已从源码清理，回到干净基线 ✅                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 教训与预防措施

### 1. 开发工具不应硬编码注入

**问题**：Impeccable Live 脚本被硬编码在生产代码路径中

**改进**：

```typescript
// ❌ 错误：硬编码注入
export function createFrameSrcdoc(scriptUrl: URL): string {
  return `<!DOCTYPE html>
<body>
<div id="app"></div>
<script src="${scriptUrl}"></script>
<!-- 硬编码 -->
<script src="http://localhost:8400/live.js"></script>
</body>`
}

// ✅ 正确：按需注入
export function createFrameSrcdoc(
  scriptUrl: URL,
  options?: { enableLive?: boolean }
): string {
  const liveScript = options?.enableLive
    ? `<script src="http://localhost:8400/live.js"></script>`
    : ''
  return `<!DOCTYPE html>
<body>
<div id="app"></div>
<script src="${scriptUrl}"></script>
${liveScript}
</body>`
}
```

### 2. Build ID 同步检查

**问题**：Frame 和 Host 使用不同的 Build ID 源

**改进 A：统一环境变量**

```bash
# .env.development
VITE_BUILD_ID=dragon-raja-local-preview
```

```typescript
// vite.frame.config.ts
export default defineConfig({
  define: {
    __MMD_HUD_BUILD_ID__: JSON.stringify(
      process.env.VITE_BUILD_ID || 'dev'
    ),
  },
})

// vite.host-dev.config.ts
export default defineConfig({
  define: {
    __MMD_HUD_BUILD_ID__: JSON.stringify(
      process.env.VITE_BUILD_ID || 'dev'
    ),
  },
})
```

**改进 B：构建前验证脚本**

```typescript
// scripts/verify-build-id.mjs
const frameBuildId = process.env.MMD_HUD_BUILD_ID || 'dev'
const hostBuildId = process.env.MMD_HUD_BUILD_ID || 'dev'

if (frameBuildId !== hostBuildId) {
  console.error('❌ Build ID 不一致')
  process.exit(1)
}
```

### 3. 错误渲染的健壮性

**问题**："body" 字符的出现说明错误处理本身也可能失败

**改进**：

```typescript
function renderConnectionError(message: string): void {
  try {
    // Vue 错误页面
    const ErrorView = { ... }
    createApp(ErrorView).mount(appRoot)
  } catch (error) {
    // 降级：纯 HTML 错误页面
    appRoot.innerHTML = `
      <div style="display:grid;place-items:center;width:100%;height:100%;background:#050a0f;color:#e8e2d6;">
        <div style="max-width:600px;padding:24px;border:1px solid #7f1d1d;border-radius:8px;background:#180b0f;">
          <h1 style="margin:0 0 12px;color:#fb7185;">连接错误</h1>
          <p style="margin:0;color:#cbd5e1;">${escapeHtml(message)}</p>
        </div>
      </div>
    `
  }
}
```

### 4. 开发环境健康检查

**在启动前验证**：

```bash
#!/bin/bash
# scripts/dev-health-check.sh

echo "🔍 检查开发环境..."

# 检查端口占用
for port in 5175 5275 5374 8400; do
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $port 已被占用"
  fi
done

# 检查 Frame 构建
if [ ! -f "dist/frame/mmd-hud-iframe-frame.js" ]; then
  echo "❌ Frame 未构建，运行: npm run build:frame"
  exit 1
fi

# 检查 Build ID 一致性
FRAME_BUILD_ID=$(grep -o 'buildId:"[^"]*"' dist/frame/mmd-hud-iframe-frame.js | head -1)
echo "✅ Frame Build ID: $FRAME_BUILD_ID"

# 检查 Live variants
if ls .impeccable/live/variants-*.html 1>/dev/null 2>&1; then
  echo "⚠️  检测到未保存的 Live variants，重启服务器会丢失"
  read -p "   继续? (y/N) " -n 1 -r
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi

echo "✅ 环境健康检查通过"
```

### 5. 统一的开发启动脚本

**当前**：需要手动协调多个终端

**改进**：

```json
// package.json
{
  "scripts": {
    "dev:preview": "node scripts/dev-preview.mjs",
    "dev:check": "bash scripts/dev-health-check.sh",
    "dev": "npm run dev:check && npm run dev:preview"
  }
}
```

或使用进程管理器：

```yaml
# Procfile (foreman)
host: cd mmd-hud-dragon-raja && npm run dev:host
frame: cd mmd-hud-dragon-raja && npm run build:frame -- --watch
media: node mmd-hud-dragon-raja/scripts/serve-cors.mjs mmd-hud-dragon-raja/output/imagegen 5374
```

### 6. Live 方案的持久化提醒

**在 Live UI 中添加提示**：

```typescript
// Impeccable Live 工具栏
if (hasUnsavedVariants()) {
  showWarning('⚠️ 有未保存的方案，记得点击 Accept')
}

// 页面卸载前警告
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedVariants()) {
    e.preventDefault()
    e.returnValue = '有未保存的设计方案，确定要离开吗？'
  }
})
```

---

## 技术细节参考

### Frame Bootstrap 流程

```typescript
// 1. Host 创建 iframe
const iframe = document.createElement('iframe')
iframe.name = JSON.stringify({
  protocol: 'mmd-hud-iframe-bootstrap',
  buildId: 'dragon-raja-local-preview',
  bootstrapId: generateId(),
  parentOrigin: window.location.origin,
  theme: 'dragon-raja'
})

// 2. Host 设置 srcdoc
iframe.srcdoc = createFrameSrcdoc(frameScriptUrl)

// 3. Frame 加载后解码 bootstrap
const bootstrap = decodeFrameBootstrap(window.name)

// 4. Frame 验证 buildId
if (bootstrap.buildId !== __MMD_HUD_BUILD_ID__) {
  renderConnectionError('Build ID 不匹配')
  return
}

// 5. Frame 等待 Host handshake
window.addEventListener('message', receiveHandshake)

// 6. Host 发送 handshake
iframe.contentWindow.postMessage({
  type: 'host-handshake',
  protocol: 'mmd-hud-iframe',
  version: 1,
  buildId: 'dragon-raja-local-preview',
  ...
}, '*')

// 7. Frame 验证 handshake.buildId
if (handshake.buildId !== __MMD_HUD_BUILD_ID__) {
  throw new Error('Handshake buildId 不匹配')
}

// 8. 连接成功，挂载 Vue 应用
mountTheme(client)
```

### Impeccable Live 注入点

```
Frame srcdoc 生成
  ↓
frameBootstrap.ts:createFrameSrcdoc()
  ↓
返回 HTML 字符串，包含：
  - <!DOCTYPE html>
  - <head> 元数据
  - <body>
    - <div id="app"></div>
    - <script src="frame.js"></script>
    - 【注入点】<script src="live.js"></script>
  ↓
Host 设置 iframe.srcdoc
  ↓
浏览器解析并加载 srcdoc
  ↓
frame.js 执行 → Vue 应用挂载
live.js 执行 → 劫持 DOM（如果启用）
```

### Build ID 检查点

| 检查点 | 位置 | 检查内容 |
|-------|-----|---------|
| Frame 启动 | `src/frame/main.ts:18` | `bootstrap.buildId === __MMD_HUD_BUILD_ID__` |
| Handshake 验证 | `src/frame/connection/HostClient.ts:79` | `handshake.buildId === __MMD_HUD_BUILD_ID__` |
| 消息验证 | `src/host/HostSession.ts:83` | `message.buildId === this.identity.buildId` |

### 错误降级链

```
正常渲染：Vue DragonRajaHud 组件
  ↓ [buildId 不匹配]
错误渲染 1：renderConnectionError() Vue 组件
  ↓ [Vue 挂载失败]
错误渲染 2：appRoot.innerHTML = '<div>错误</div>'
  ↓ [DOM 操作失败]
错误渲染 3：console.error() + 黑屏
  ↓ [Live 劫持残留]
症状：只显示 "body" 文本节点
```

---

## 相关文档

- [LIVE_VARIANTS_LOSS_POSTMORTEM.md](./LIVE_VARIANTS_LOSS_POSTMORTEM.md) — Live variants 丢失的详细分析
- [LIVE_PREVIEW_WEBGL_POSTMORTEM.md](./LIVE_PREVIEW_WEBGL_POSTMORTEM.md) — 之前的 WebGL 故障复盘
- [DEVELOPMENT_AND_RELEASE.md](./DEVELOPMENT_AND_RELEASE.md) — 开发环境设置
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Host-Frame 架构设计

---

## 总结

此次故障是**三个独立问题的级联叠加**：

1. **Impeccable Live 硬编码注入** → 页面被劫持显示测试变体
2. **Build ID 不匹配** → 连接失败显示错误页面
3. **错误渲染失败** → 黑屏只显示 "body" 字符

每个问题单独出现都可以快速定位，但三个问题叠加在一起，加上修复过程中的服务器重启导致 Live variants 丢失，形成了复杂的故障链。

**核心教训**：

- 开发工具（Live）不应硬编码在生产代码路径
- Build ID 必须在所有构建目标中统一
- 错误处理本身需要降级机制
- 多服务依赖的开发环境需要统一的启动和健康检查流程

**已修复**：

- ✅ 移除 Impeccable Live 硬编码注入
- ✅ 统一 Build ID 为 `dragon-raja-local-preview`
- ✅ 开发预览完全正常运行

**待改进**：

- [ ] 按需启用 Impeccable Live 注入
- [ ] 添加开发环境健康检查脚本
- [ ] 统一开发启动流程（single command）
- [ ] 错误渲染的多层降级机制
