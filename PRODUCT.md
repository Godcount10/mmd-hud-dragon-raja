# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要且唯一计划中的用户是产品所有者本人，用于在 MMD 中进行 Dragon Raja 沉浸式角色扮演。当前不需要面向其他 MMD 用户设计通用引导、分发流程、多用户支持或兼容性方案。

## Product Purpose

产品将 MMD 聊天会话转化为一套完整连贯的 Dragon Raja 沉浸式 HUD 体验。用户可以通过主题界面进入故事、对话与行动、查看故事派生信息，并访问相关 MMD 控制；产品不重写 MMD 的登录、会话、生成、持久化、模型或设置系统。

成功意味着用户可以通过 HUD 完成个人 Dragon Raja 角色扮演流程，同时体验始终与底层 MMD 会话保持同步。

## Positioning

这是一个 Dragon Raja 沉浸式 HUD 成品，而不是通用主题平台。其核心机制是在 sandbox iframe 中组合三个明确隔离的层次：通过 Snapshot、Capability 和 NativeAction 投影的 MMD 原生状态与操作；从 assistant 消息标记中派生的临时状态；以及地图、图鉴等 Dragon Raja 本地功能。

## Operating Context

- HUD 注入并覆盖于 MMD 聊天页面之上，以 Vue 应用形式运行在 sandbox iframe 内。
- Host、Bridge 和 MessagePort 协议负责连接 iframe 与父级 MMD 页面。
- 主要体验包括开局档案、故事对话、消息操作、原生模型与会话控制、人设与设定控制、地图、图鉴，以及从 assistant 文本派生的故事状态。
- MMD 始终是执行引擎和原生聊天事实的唯一来源；HUD 是用户使用的沉浸式控制与呈现层。

## Capabilities and Constraints

- 发布产品的范围是 `dragon-raja` Theme，明确暂不支持其他主题。
- MMD 是消息、生成、会话、模型、人设、设置和原生面板状态的唯一事实来源。
- iframe Theme 只消费可序列化 Snapshot 并调用类型化 NativeAction，不直接读取或操作父页面文档。
- 原生事实、assistant 文本派生状态和 Theme 本地状态必须保持隔离，不得相互覆盖。
- Cookie、Authorization 信息、登录 token 和 MMD 内部 storage 不得跨越 iframe 边界。
- 现有 Host / Bridge / Protocol 整体架构应尽量保持稳定。除非 Dragon Raja 实例确有必要，产品工作只优化实例本身。
- 当前实现栈为 Vue 3、TypeScript、Vite、GSAP、MessagePort protocol v2，以及分别构建的 Host 与 Frame IIFE。
- 当前界面文案以简体中文为主。

## Brand Commitments

- 产品及其体验名称为 Dragon Raja。
- Dragon Raja 的角色、地点、术语、开局档案、故事框架、地图和图鉴是有意保留的产品内容，不是通用主题占位符。
- 后续工作应深化和优化这一套沉浸式体验，不应将产品重构为可复用的多主题展示平台。

## Evidence on Hand

- `README.md` 定义了产品边界、运行模型、当前功能类别和发布状态。
- `docs/ARCHITECTURE.md`、`docs/ARCHITECTURE_RATIONALE.md` 和 `docs/THEME_DEVELOPMENT.md` 记录了既有的安全边界与状态所有权架构。
- `src/hud/themes/dragon-raja/` 包含已实现的开局、故事、设置、原生镜像、地图、图鉴、世界数据、角色立绘、媒体清单、动效与反馈行为。
- `tests/hud/` 和 `tests/themes/` 为当前 Dragon Raja 交互与派生状态行为提供了可执行证据。
- 当前没有用户证言、公开采用证据、商业声明、授权声明或多用户研究；后续工作不得虚构这些内容。

## Product Principles

1. 为一个人的 Dragon Raja 沉浸式角色扮演体验优化，不为假设中的广泛市场需求设计。
2. 让故事体验处于前台，同时让 MMD 稳定承担原生引擎和事实来源的职责。
3. 优先在既有架构内改进 Dragon Raja 实例，再考虑基础设施变更。
4. 始终明确隔离原生事实、AI 派生叙事状态和 HUD 本地功能。
5. 优先完成完整、连贯的世界内流程，而不是扩张可复用主题平台的广度。
