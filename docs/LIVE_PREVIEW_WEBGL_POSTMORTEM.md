# Live 变体与 WebGL 故障复盘

本文记录 Dragon Raja HUD 在 Impeccable Live 模式下持续显示静态信封 poster、而不是 Three.js 变体的完整故障链。目标不是保存一次性的排错过程，而是为继续采用 Parent Host + sandbox `srcdoc` Frame + Vue Theme + WebGL + Live DOM 注入架构的项目提供开发规范。

## 1. 结论摘要

最终确认的主故障不是 Three.js 场景、三个 profile、机器 GPU 能力或 poster 本身，而是 **Live 恢复会话时替换了 Vue 管理的 variants DOM，导致 renderer 继续向已经脱离文档的旧 canvas 绘制**。

因此页面同时满足以下条件：

- Live 控制条显示 `3/3`，切换和参数控制正常；
- WebGL 初始化没有抛错，组件状态仍是 `active`；
- 用户实际看到的 canvas 是 Live 新插入的空 canvas；
- Three.js 实际绘制的是 Vue 先前持有、但已被移出 DOM 的旧 canvas；
- 底层静态 poster 因此完整露出；
- 控制台没有 WebGL 错误，fallback 诊断也不会触发。

同时还发现并修复了缓存新鲜度、变体可见性判断、context 生命周期、Host/Frame 握手边界和错误可观测性问题。这些问题不是最终主因，但会造成相同或相近症状，必须一并处理。

## 2. 涉及的运行层

```text
127.0.0.1:5174  Parent Host / Mock MMD
        |
        | 创建 sandbox srcdoc iframe，写入 bootstrap
        v
srcdoc Frame document
        |
        | 加载带 bootstrap 查询参数的 Frame IIFE
        v
127.0.0.1:5273  dist/frame/mmd-hud-iframe-frame.js
        |
        | Vue Theme 挂载 Three.js canvas
        v
AdmissionsSealScene
        ^
        | Live 读取源码、替换 variants wrapper、写入可见性样式
        |
127.0.0.1:8400  Impeccable Live helper

127.0.0.1:5373  静态 poster，仅在 WebGL 不可用或 canvas 未覆盖时可见
```

本地推荐通过以下命令统一启动 Host、Frame 构建监听、Frame 静态服务和 poster 服务：

```bash
npm run dev:preview
```

端口被占用时脚本会在对应起始端口之后寻找空闲端口；应以终端实际输出为准。

## 3. 故障与修复清单

| 问题 | 性质 | 表现 | 修复 |
|---|---|---|---|
| Live 恢复时 `cloneNode(true)` 并替换 variants wrapper | 最终确认的主因 | `3/3` 正常、无 WebGL 错误、始终露出 poster | 监听 `childList`，从真实 DOM 重新扫描 canvas，以 DOM 节点身份重新挂载 renderer |
| 只依赖 Vue template ref | 架构兼容性缺口 | ref 指向 `isConnected === false` 的旧节点 | 每次同步先剔除 detached 节点，再查询当前 root 内的真实 canvas |
| 通过 inline `style.display` 判断变体 | Live 兼容性缺口 | Live 控制条切换了方案，但 renderer 没切换 | 使用 `getComputedStyle()` 判断最终可见性 |
| 只观察组件内部属性 | Live 兼容性缺口 | `#impeccable-variant-state` 更新后组件不知道 | 同时观察 `document.head` 中的样式节点变化 |
| Frame IIFE 使用固定 URL 且静态服务允许缓存 | 加载新鲜度缺口 | Frame 已重建，旧页面仍可能执行旧 bundle | 开发静态服务发送 `no-store`；每次 Frame 导航附加唯一 bootstrap 查询参数 |
| 通用 Frame 构建与运行中预览写入同一个 `dist/frame` | 构建隔离缺口 | 手动构建把预览 Build ID 覆盖为 `dev`，Host 因 Build ID 不匹配拒绝连接 | `dev:preview` 使用独立的 `tmp/dev-preview/frame`，与通用和发布产物物理隔离 |
| 把 Live/helper 或连接语义混入 Frame 脚本 URL / `srcdoc` | Host/Frame 握手边界缺口 | 显示“无法连接父页面 Host”，或刷新后报缺少 bootstrap、Build ID 不匹配、等待握手超时 | 真正 bootstrap 只通过 `iframe.name`；Frame 脚本 URL 的查询参数只作为开发态 cache-buster，Frame 不读取它；`srcdoc` 不注入 Live helper 地址或 bootstrap 内容 |
| 主动释放旧 context 时旧失败回调仍有效 | 生命周期竞争风险 | 切换方案后新方案被旧 context-loss 回调标记为 fallback | 失败回调使用 generation guard；主动释放前移除旧 context-loss listener |
| 普通方案切换也调用 `forceContextLoss()` | 最终确认的切换故障 | 某方案概率性进入 fallback，刷新前难以恢复 | 普通切换保留可复用 context；只有 DOM 永久移除或组件卸载才强制释放；监听 context restored |
| fallback 只有布尔状态 | 可观测性缺口 | 所有错误看起来都是同一张信封图 | 记录结构化失败码、浏览器 `statusMessage` 和开发态诊断信息 |

## 4. 最终根因的精确时序

Live 会话恢复时，Live 脚本从源码读取 variants wrapper，然后执行与下列逻辑等价的操作：

```js
const wrapper = sourceWrapper.cloneNode(true)
existingWrapper.parentElement.replaceChild(wrapper, existingWrapper)
```

这对静态 HTML 是合理的，但它绕过了 Vue 的虚拟 DOM 和 ref 生命周期：

1. Vue 首次挂载四个 canvas，并通过 ref 把节点记录到 `canvasCandidates`。
2. Three.js 在其中一个 canvas 上创建 renderer。
3. Live 恢复会话，完整替换 variants wrapper。
4. 浏览器中的新 wrapper 和新 canvas 可见，但 Vue 没有创建这些节点，也不会为它们调用 ref 回调。
5. 原 canvas 与 renderer 仍存在于 JavaScript 内存中，但原 canvas 已不在文档中。
6. Three.js 动画循环继续正常运行，因此不会自动触发失败。
7. 新 canvas 没有 renderer，保持透明；其下方的 poster 成为用户看到的画面。

关键诊断信号是：

```text
Live: 3/3 variants
Console: Injected 3 variants from source file
WebGL failure: none
Visible result: poster
```

这组信号应优先指向“renderer 与可见 canvas 身份不一致”，而不是 GPU 故障。

## 5. 可复用的 canvas 绑定模式

### 5.1 永远以当前 DOM 为准

框架 ref 可以作为首次发现入口，但在 HMR、Live 注入、微前端重挂载或第三方 DOM 替换环境中，不能作为永久真相。

```ts
function syncCanvasCandidates(): void {
  for (const canvas of canvasCandidates) {
    if (!canvas.isConnected || !root.contains(canvas)) {
      canvasCandidates.delete(canvas)
    }
  }

  root.querySelectorAll<HTMLCanvasElement>('canvas.scene')
    .forEach(canvas => canvasCandidates.add(canvas))
}
```

### 5.2 用最终计算样式判断当前方案

Live 通过 `#impeccable-variant-state` 写入带 `!important` 的样式，不保证修改元素 inline style。

```ts
function isSelectedCanvas(canvas: HTMLCanvasElement): boolean {
  const variant = canvas.closest<HTMLElement>('[data-impeccable-variant]')
  if (!variant) return canvas.getClientRects().length > 0

  const style = getComputedStyle(variant)
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.visibility !== 'collapse'
}
```

不要使用：

```ts
variant.style.display !== 'none'
```

它只读取 inline style，无法反映 Live 样式表的最终结果。

### 5.3 同时观察节点替换和 head 样式变化

```ts
observer.observe(root, {
  attributes: true,
  attributeFilter: ['class', 'style'],
  childList: true,
  subtree: true,
})

observer.observe(document.head, {
  childList: true,
  characterData: true,
  subtree: true,
})
```

observer 回调中应立即同步一次，并在下一帧再同步一次。前者缩短空窗，后者覆盖同一任务中稍晚落地的样式计算。

### 5.4 用节点身份决定是否重挂载

```ts
syncCanvasCandidates()
const nextCanvas = candidates.find(isSelectedCanvas) ?? null

if (nextCanvas !== activeCanvas) {
  disposeCurrentRenderer()
  activeCanvas = nextCanvas
  if (nextCanvas) mountRenderer(nextCanvas)
}
```

不要仅比较 variant 编号或 class。Live 可能用完全相同的 markup 替换节点；属性相同不代表 DOM identity 相同。

## 6. WebGL 生命周期规则

每个视觉区域只保留一个活动 renderer。切换或卸载时至少清理：

- `setAnimationLoop(null)` 或 RAF；
- pointer、resize、visibility 和 motion preference listener；
- `ResizeObserver`；
- Three.js timer；
- geometry、material、texture 和场景资源；
- render lists；
- renderer；
- WebGL context。

普通方案切换时，如果后续仍可能回到同一个 canvas，只释放场景和 renderer 资源，不调用 `forceContextLoss()`。浏览器对同一 canvas 会复用既有 WebGL context；主动丢失后立刻在该 canvas 上重建，会拿到仍处于 lost 或等待恢复状态的 context。

只有以下场景才强制释放 context：

- canvas 已经被 Live DOM 替换并永久脱离文档；
- 组件 unmount 或 HUD destroy；
- 可以确定该 canvas 不会再次使用。

主动调用 `forceContextLoss()` 前应先移除 `webglcontextlost` 和 `webglcontextrestored` listener，否则正常清理可能被新 controller 误解为运行时崩溃。实际 context loss 还应监听 `webglcontextrestored`，清除 fallback 状态并恢复 resize、静态帧和动画循环。

异步失败回调必须绑定 generation：

```ts
const generation = ++mountGeneration

mountRenderer(canvas, {
  onFailure(failure) {
    if (generation !== mountGeneration) return
    if (activeCanvas !== canvas) return
    currentFailure = failure
  },
})
```

这能阻止已被替换 renderer 的迟到回调污染当前方案。

## 7. Frame 加载新鲜度规则

开发环境中的 Frame IIFE 与普通 Vite 页面不同：Frame watch 会重写磁盘文件，但已加载的 `srcdoc` 不会自动获得 HMR。

因此需要两层保证：

1. 静态服务明确禁止缓存：

```http
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Expires: 0
```

2. 每次 iframe 导航使用不同 URL：

```text
/mmd-hud-iframe-frame.js?mmd-hud-bootstrap=<unique-bootstrap-id>
```

注意：这两项保证“下一次导航加载最新文件”，但不会让已经运行的 iframe 自动换 bundle。Frame 源码重建后仍需 reload Frame 或刷新 Host。

查询参数只应在开发模式添加。生产内嵌构建和安全边界不应依赖该机制。

### 7.1 运行中预览必须使用独立输出目录

Host 和 Frame 会校验同一个 Build ID。若运行中的 `dev:preview` 与手动执行的 `npm run build:frame` 共用 `dist/frame`，后者会用默认 `dev` Build ID 覆盖预览 bundle，而 Host 仍持有 `dragon-raja-local-preview`。下一次刷新时 Frame 会正确拒绝握手，并显示：

```text
Frame build (dev) 与 Host build (dragon-raja-local-preview) 不匹配
```

因此预览、通用构建和发布构建必须物理隔离：

```text
dev:preview       -> tmp/dev-preview/frame
build:frame       -> dist/frame
release pipeline -> dist/frame（非 dev Build ID）
```

不要让两个具有不同 Build ID 的构建进程写入同一个正在被静态服务读取的目录。缓存控制无法解决产物本身被另一构建覆盖的问题。

### 7.2 Host 握手与开发调试参数必须隔离

“无法连接父页面 Host”不属于 WebGL 或 Three.js 问题，它发生在 Frame 还没有拿到 MessagePort、甚至还没挂载 Vue Theme 之前。这里的核心规则是：**连接身份只能走 bootstrap，调试能力只能走开发态配置，二者不能混用**。

本架构里，Frame 是 `srcdoc` document，真实 bootstrap 经 `iframe.name` 传入：

```text
iframe.name = JSON.stringify({
  protocol,
  buildId,
  bootstrapId,
  parentOrigin,
  theme,
})
```

Frame 启动时只解码 `window.name`。这条链承担连接语义，包括 Build ID、bootstrap ID、父页面 origin 和 Theme 校验。

Frame 脚本 URL 上的查询参数只允许承担一个职责：让浏览器把下一次 iframe 导航视为新资源请求。

```text
/mmd-hud-iframe-frame.js?mmd-hud-bootstrap=<unique-bootstrap-id>
```

这个参数虽然复用了 bootstrap ID 作为唯一值，但它不是 bootstrap 本身。Frame 不应该读取脚本 URL 查询参数来建立连接，因为 `srcdoc` 文档的 `location` 不是这个脚本 URL；把连接身份塞进脚本 URL 会让 Frame 在某些刷新/切换路径里读不到 bootstrap，从而落入“无法连接父页面 Host”错误页。

Live 调试需要的 sandbox 权限也必须只存在于本地 Host dev 构建：

```text
vite.host-dev.config.ts -> __MMD_HUD_DEV_ALLOW_SAME_ORIGIN__ = true
vite.host.config.ts     -> __MMD_HUD_DEV_ALLOW_SAME_ORIGIN__ = false
```

开发态可以给 iframe 增加 `allow-same-origin`，方便 Live helper 检查和注入 DOM；生产 Host 不启用该权限。这个开关只改变调试可见性，不改变 bootstrap、handshake、Build ID 或 MessagePort 协议。

因此本次修复后的硬约束是：

- `createFrameSrcdoc()` 只生成最小 `srcdoc`：`#app` 加 Frame 脚本，不嵌入 bootstrap、Live helper URL 或 `localhost:8400`；
- `decodeFrameBootstrap()` 只接受 `window.name` 里的结构化 bootstrap；
- Host 每次导航仍创建新的 `bootstrapId` 和 `channelId`；
- 开发态 cache-buster 可以追加到脚本 URL，但 Frame 逻辑必须忽略它；
- 测试需要断言 `srcdoc` 不含 bootstrap 内容、不含 `impeccable`、不含 `localhost:8400`，避免调试注入污染连接协议。

## 8. fallback 必须可诊断

静态 poster 是合理的用户降级，但不能成为开发阶段的错误黑洞。至少区分：

```text
webgl-api-unavailable
webgl2-context-creation-failed
renderer-initialization-failed
initialization-failed
webgl-context-lost
```

同时保留 `webglcontextcreationerror.statusMessage` 和 `webglcontextlost.statusMessage`。开发构建可以显示简短诊断框；生产构建只保留静态 poster 和必要日志，避免把底层实现暴露给最终用户。

还应区分两种看起来相同的 poster：

- `status=fallback`：WebGL 确实失败；
- `status=active` 但 poster 可见：canvas 未绘制、被覆盖、尺寸错误或 renderer 绑定了 detached canvas。

仅检查一个 `active` 布尔值不足以证明画面有效。

## 9. 推荐排查顺序

### A. 先确认页面层级

1. 打开的必须是 Host URL，不是 Frame JS 或独立 Frame 页面。
2. Host、Frame、poster、Live helper 端口必须都在监听。
3. “无法连接父页面 Host”属于 bootstrap/handshake 问题，不属于 WebGL 问题。
4. 本地 Live 为调试需要启用 `allow-same-origin` 时，浏览器的 sandbox 警告是预期警告；生产构建不得照搬该权限。
5. 若错误正文是“缺少或无法解析 Frame bootstrap”，优先检查 `iframe.name` 是否被设置、是否被第三方脚本覆盖，以及 Frame 是否误从 URL 查询参数读取连接身份。
6. 若错误正文是 Build ID 不匹配，优先检查 Host 与 Frame 是否来自同一次构建，以及运行中预览是否被通用 `build:frame` 覆盖产物。

### B. 再确认加载的新鲜度

1. 检查 Frame 请求是否带唯一 bootstrap 查询参数。
2. 检查 5273 响应是否带 `no-store`。
3. Frame 重建后执行 iframe reload 或刷新 Host。
4. 不要用“源码已保存”推断“iframe 已执行新 bundle”。

### C. 再区分真实 fallback 与 active-but-blank

1. 读取 `data-webgl-status` 和失败码。
2. 检查可见 canvas 是否 `isConnected`。
3. 检查 renderer 的 canvas 是否就是 `elementsFromPoint()` 返回的顶层 canvas。
4. 检查 canvas CSS 尺寸和绘制缓冲尺寸是否非零。
5. 检查 `context.isContextLost()`。

### D. 最后检查 Live DOM 身份

1. 控制台是否出现 `Injected ... variants from source file`。
2. variants wrapper 是否刚被替换。
3. 框架 ref 是否仍指向 `root.contains(ref) === true` 的节点。
4. 切换方案时 renderer 是否随可见 canvas 一起切换。

## 10. 验证矩阵

只验证干净浏览器首次加载是不够的。至少覆盖：

| 场景 | 必查结果 |
|---|---|
| Host 首次加载 | handshake 完成，默认场景绘制 |
| 方案 1、2、3 逐个切换 | 可见 canvas 与 renderer canvas 为同一节点 |
| 调节每个方案参数 | 不重建无关 renderer，不退回 poster |
| 刷新 Host 并恢复 Live 会话 | source reinjection 后仍重新绑定新 canvas |
| Frame watch 重建后 reload | 请求 URL 改变，执行最新 bundle |
| Host dev 开启 Live 调试 | iframe sandbox 可含 `allow-same-origin`，但 bootstrap 仍来自 `window.name` |
| 生产 Host 构建 | iframe sandbox 不含 `allow-same-origin`，`srcdoc` 不含 Live helper 或本地调试地址 |
| variants wrapper 被整段替换 | 旧 canvas 被释放，新 canvas 接管绘制 |
| 主动切换 renderer | 旧 context-loss 不污染新 generation |
| 模拟 WebGL2 创建失败 | 显示 poster 和精确失败码 |
| 模拟运行中 context lost | 停止动画并稳定降级 |
| unmount / destroy | observer、listener、RAF、GPU 资源全部释放 |

WebGL 可见性验证不能只检查 DOM 和 context。截图或 canvas 像素检查至少执行一次，以防 renderer 存在但输出透明、被遮挡或绘制到 detached canvas。

## 11. 本项目对应实现

- `src/host/FrameController.ts`：开发态 Frame URL cache busting、iframe 生命周期。
- `src/protocol/frameBootstrap.ts`：`window.name` bootstrap 解码、最小 `srcdoc` 生成和 Frame 脚本 URL 安全边界。
- `scripts/serve-cors.mjs`：跨源静态资源与开发态 no-store headers。
- `scripts/dev-preview.mjs`：Host、Frame、watch、poster 的统一启动与退出。
- `src/hud/themes/dragon-raja/components/AdmissionsSealScene.vue`：Live DOM 重绑定、可见 canvas 选择、失败状态。
- `src/hud/themes/dragon-raja/components/admissionsSealScene.ts`：Three.js 场景、WebGL failure 分类和完整资源释放。

## 12. 可迁移原则

这次故障可以归纳为五条适用于其他项目的规则：

1. **框架 ref 只对框架拥有的当前 DOM 有效。** 外部工具能替换 DOM 时，必须重新验证 `isConnected` 和节点身份。
2. **开发构建完成不等于运行时已更新。** 跨源 `srcdoc` Frame 需要明确的缓存策略和导航版本。
3. **连接 bootstrap 与开发调试参数必须分层。** `window.name` / MessagePort 负责可信身份，脚本 URL 查询参数只负责资源新鲜度，Live helper 不进入连接协议。
4. **fallback 与 active-but-blank 必须是两个诊断状态。** 静态降级不能掩盖 renderer 绑定错误。
5. **验证必须覆盖恢复路径。** 首次加载、刷新恢复、源码重注入和变体切换属于不同生命周期，不能互相替代。
