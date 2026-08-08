# 开发、测试与发布

本文面向需要安装依赖、运行 Mock、验证构建或发布产物的开发者和维护者。

系统原理见 [整体架构与实现](ARCHITECTURE.md)，实例规则见 [Theme 实例开发指南](THEME_DEVELOPMENT.md)。

---

## 1. 环境与安装

需要 Node.js 和 npm。

```bash
npm ci
```

项目包含 package-lock.json，推荐使用 npm ci，而不是依赖已有 node_modules。

---

## 2. 本地开发入口

### 2.1 完整 Mock 联调

Host Mock 加载 5273 上已经构建的 Frame IIFE，因此需要三个终端。

#### 终端 A：构建 Frame

```bash
npm run build:frame
```

开发 Build ID 默认是 dev，与 Host Dev 一致。

#### 终端 B：提供 Frame JS

```bash
node scripts/serve-cors.mjs dist/frame 5273
```

地址：

```text
http://127.0.0.1:5273/mmd-hud-iframe-frame.js
```

#### 终端 C：启动 Mock MMD + Host

```bash
npm run dev:host
```

打开：

```text
http://127.0.0.1:5174/
```

Host 页面在 5174，Frame 脚本来自 5273，Frame document 本身是 opaque sandbox srcdoc。这比两个普通跨 origin 页面更接近生产架构。当前私有测试分支固定加载 `dragon-raja` Theme。

### 2.2 Frame 连接错误页

直接打开 `frame/index.html` 没有：

- iframe.name bootstrap；
- 父页面 Host；
- MessagePort；
- 首 Snapshot。

因此它会显示连接错误页，而不是独立 HUD playground。

---

## 3. Mock 能验证什么

可以验证：

- bootstrap、handshake 和 MessagePort；
- Snapshot 与 capability；
- 消息发送和模拟流式输出；
- 多数模型、会话、编辑、人设和补充设定流程；
- hide/show/reload/destroy；
- Theme 响应式状态；
- 部分异步 panel rows 和 toggle 行为。

不能替代：

- 真实 MMD DOM 和中文文案；
- 真实动画与事件时序；
- AI provider；
- 生产 CSP；
- MMD 路由和 BFCache；
- 真实移动端软键盘、safe-area 和权限策略。

---

## 4. 浏览器联调清单

### 连接与协议

- [ ] Console 无异常；
- [ ] Frame JS 200，CORS 正常；
- [ ] 首 Snapshot 前 Theme 不挂载；
- [ ] Host/Frame Build ID 一致；
- [ ] reload 后创建新 channel，旧请求不回流；
- [ ] malformed/旧 Frame 消息不会改变当前 Theme。

### 原生动作

- [ ] 发送成功后才清空草稿；
- [ ] 流式输出来自 Snapshot；
- [ ] capability 不可用时显示 reason；
- [ ] open/close 重复调用保持幂等；
- [ ] 本地关闭不遗留原生 panel；
- [ ] stale target 安全失败；
- [ ] destructive flow 执行两阶段确认。

### 生命周期

- [ ] hide 后父页面显示“打开 HUD”；
- [ ] show 后 Theme 和特效恢复；
- [ ] destroy 后 iframe、恢复按钮、observer、timer 和 port 清理；
- [ ] 浏览器 visibilitychange；
- [ ] Frame reload；
- [ ] 页面导航、pagehide 和 BFCache（真实环境）。

### 视觉与设备

- [ ] 390×844；
- [ ] 横屏；
- [ ] 桌面宽屏；
- [ ] safe-area；
- [ ] 软键盘；
- [ ] prefers-reduced-motion；
- [ ] WebGL/Canvas 失败降级；
- [ ] GPU/RAF 资源卸载和恢复；
- [ ] storage 被拒绝时仍能运行。

---

## 5. 测试与构建命令

```bash
npm run typecheck
npm test
npm run test:watch
npm run check
MMD_HUD_BUILD_ID=<version-or-commit-sha> npm run build:inline
```

`npm run check` 执行类型检查和完整测试。`npm run build:inline` 执行：

```text
typecheck + tests → build:host → build:frame → build:inline:rules → verify:release
```

测试覆盖持续以测试目录和 Vitest 输出为准，不在文档中固定易过时的测试数量。

主要覆盖方向：

- handshake action 集合；
- malformed control/payload fail closed；
- capability 完整性；
- bootstrap round-trip 和 URL 限制；
- 首 Snapshot ready 门禁；
- invoke request/result/action 关联；
- stale channel；
- duplicate request ID；
- Wire 净化；
- stable reference 和两阶段删除；
- Frame CSS 注入；
- Dragon Raja sanitizer、AI 派生状态和组件事务。

明显待补见 [架构优化路线图](ROADMAP.md)。

---

## 6. Build ID

Host 与 Frame 必须使用同一 Build ID。

PowerShell：

```powershell
$env:MMD_HUD_BUILD_ID="<version-or-commit-sha>"
npm run build:inline
```

Git Bash：

```bash
MMD_HUD_BUILD_ID=<version-or-commit-sha> npm run build:inline
```

开发缺省值为 dev；正式内嵌构建脚本会拒绝 `dev` Build ID，并在完成后验证规则链和 Dragon Raja-only Frame 产物。

---

## 7. Frame 单文件 CSS 构建

最终产物：

```text
dist/host/mmd-hud-iframe-host.js
dist/frame/mmd-hud-iframe-frame.js
```

Frame 样式来源：

1. Theme 主 CSS 通过 `?inline` 导入，由 frame/main.ts 创建 style；
2. Vue SFC style 由 Vite 汇总，再由 `build/frameCssInjection.ts` 注入入口 IIFE。

构建注入器：

- 收集并排序 CSS asset；
- 要求恰好一个 Frame entry chunk；
- 安装带 `data-mmd-hud-frame-styles` 标记的 style；
- 避免同 document 重复注入；
- 安全序列化 CSS，包括 U+2028/U+2029；
- 删除最终 bundle 中独立 CSS asset。

构建后应确认：

```text
dist/frame/ 仅包含 mmd-hud-iframe-frame.js
```

不需要 frameCssUrl 或第三个发布资产。

---

## 8. 发布产物

正式内嵌发布使用：

```text
dist/inline/mmd-hud-iframe-inline.json
```

辅助检查文件：

```text
dist/inline/mmd-hud-iframe-inline-manifest.json
dist/inline/mmd-hud-iframe-inline.txt
```

Host 与 Frame 必须来自同一次源码状态、同一次构建和同一个 Build ID。正式 Release 建议只上传导入 JSON、公开 README 与校验和，不要上传整个工作目录或 `测试结果/`。

---

## 9. 发布前流程

1. 确认当前位于干净的目标发布分支或独立发布 Worktree；
2. 选择唯一非 dev Build ID（版本或源码 commit）；
3. 如需要，更新 package version/lockfile；
4. 执行 `npm ci`；
5. 执行 `npm run check`；
6. 用同一 Build ID 执行 `npm run build:inline`；
7. 确认 `verify:release` 通过；
8. 确认 Frame 产物仅包含本发布版本的 `dragon-raja` Theme；
9. 确认第三方库和资产已打入 bundle；
10. 检查 release diff；
11. 在真实 MMD 执行 Dragon Raja 基础冒烟；
12. 审核后提交发布分支；是否推送远程仓库或创建 GitHub Release，应作为独立人工步骤明确执行。

指定远程仓库推送（维护者专用）：

```bash
npm run push:release -- --repo https://github.com/<user>/<repository>.git --dry-run
npm run push:release -- --repo https://github.com/<user>/<repository>.git
```

脚本要求当前分支为项目配置的发布分支且工作树干净，默认推送同名远程分支。它不会自动 commit，也不会修改 `git remote` 配置；`--dry-run` 会调用 Git 的远程 dry-run，不写入远程仓库。

---

## 10. MMD 外链注入（可选）

内嵌 JSON 是当前主要发布方式。如需使用外链 Host/Frame：

```html
<script>
window.__MMD_HUD_IFRAME_CONFIG__ = {
  frameScriptUrl: 'https://cdn.jsdelivr.net/gh/<user>/<release-repo>@<immutable-commit-sha>/frame/mmd-hud-iframe-frame.js',
  theme: 'dragon-raja'
}
</script>
<script src="https://cdn.jsdelivr.net/gh/<user>/<release-repo>@<immutable-commit-sha>/host/mmd-hud-iframe-host.js"></script>
```

规则：

- 不使用 @main 或浮动 tag；
- Host/Frame 不跨 commit；
- Frame URL 生产只允许 HTTPS；本地仅 loopback HTTP；
- frameScriptUrl 当前无 hostname allowlist，配置必须来自可信注入；
- 父页面 CSP 必须允许 Frame script；
- Frame sandbox 使用 allow-scripts、allow-downloads，allow 属性包含 clipboard-write；
- Frame CSS 已进入 Frame JS。

---

## 11. 重复注入与更新

注入成功后全局 API：

```js
__MMD_HUD_IFRAME__.getSnapshot()
__MMD_HUD_IFRAME__.getThemeId()
__MMD_HUD_IFRAME__.getFrameScriptUrl()
__MMD_HUD_IFRAME__.refresh()
__MMD_HUD_IFRAME__.hide()
__MMD_HUD_IFRAME__.show()
__MMD_HUD_IFRAME__.reloadFrame()
__MMD_HUD_IFRAME__.destroy()
```

重复注入不会创建第二实例，只会 refresh。加载新 bundle 或新 Theme：

```text
完整刷新页面
或 destroy() 后重新注入
```

仅 reloadFrame 不会下载新的 Host bundle；是否获取新 Frame 还受 URL 和缓存策略影响，因此正式更新应使用新的不可变 commit URL。

---

## 12. 私有数据安全

聊天正文、用户人设、设定补充和分享链接不得写入公开 manifest、README 或测试产物。公开仓库只发布编译后的 Host/Frame、校验信息和注入说明。

---

## 13. 发布验收清单

- [ ] typecheck 通过；
- [ ] tests 通过；
- [ ] Host build 通过；
- [ ] Frame build 通过；
- [ ] Build ID 非 dev；
- [ ] Host/Frame Build ID 一致；
- [ ] Frame 目录只有单 JS；
- [ ] manifest 与产物一致；
- [ ] release 工作树只包含预期文件；
- [ ] 发布分支是否需要推送远程仓库已明确；
- [ ] 如需推送，远程分支和目标仓库已确认；
- [ ] 注入 URL 使用完整不可变 SHA；
- [ ] Dragon Raja 基础冒烟通过；
- [ ] 目标 Theme 实际依赖动作在真实 MMD 通过。
