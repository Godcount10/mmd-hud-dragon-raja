---
name: Dragon Raja Immersive HUD
description: 雨夜入学，日光归档的沉浸式学院叙事界面
colors:
  admissions-ink: "#05070b"
  admissions-ember-ink: "#070302"
  admissions-paper: "#e8e2d6"
  admissions-muted: "#93a3ad"
  admissions-bronze: "#b99761"
  admissions-gold-light: "#ffbd68"
  admissions-ember-red: "#d84624"
  admissions-ember-orange: "#ff9d32"
  admissions-display-ink: "#f3e5cd"
  admissions-signal: "#72bfc1"
  admissions-flame: "#d55731"
  admissions-wax-highlight: "#df6d55"
  admissions-wax: "#ad3029"
  admissions-wax-shadow: "#751c1a"
  admissions-wax-ink: "#430d0d"
  archive-sheet: "#fffdf8"
  archive-sheet-sunk: "#f5f1e8"
  archive-rule: "rgba(120, 108, 86, 0.2)"
  archive-ink: "#343a46"
  archive-muted: "#666e7a"
  archive-bronze: "#8a5f24"
  archive-signal: "#2f7376"
  action-crimson: "#9c3d34"
  action-crimson-hover: "#8a3229"
  stage-night: "#191719"
  stage-night-2: "#242022"
  stage-paper: "#efe5d2"
  stage-paper-2: "#f8f1e2"
  stage-paper-sunk: "#e4d8c5"
  stage-ink: "#211d1c"
  stage-muted: "#6b5c54"
  stage-rule: "rgba(33, 29, 28, 0.2)"
  stage-line: "rgba(239, 229, 210, 0.22)"
  stage-brass: "#d7952d"
  stage-brass-deep: "#9f641f"
  stage-ember: "#b13d36"
  stage-cobalt: "#286b7a"
  stage-sage: "#78968a"
  stage-violet: "#655b79"
typography:
  admissions-display:
    fontFamily: "DragonRaja Display, DragonRaja Serif, Noto Serif SC, SimSun, serif"
    fontSize: "76px"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: "normal"
  opening-display:
    fontFamily: "DragonRaja Brush, DragonRaja Serif, Noto Serif SC, SimSun, serif"
    fontSize: "82px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "normal"
  story-title:
    fontFamily: "DragonRaja Serif, Noto Serif SC, SimSun, serif"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.18
    letterSpacing: "0.04em"
  story-body:
    fontFamily: "DragonRaja Serif, Noto Serif SC, SimSun, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.98
    letterSpacing: "0.015em"
  interface-body:
    fontFamily: "DragonRaja Sans, Segoe UI, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.8
  interface-label:
    fontFamily: "DragonRaja Sans, Segoe UI, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.06em"
  telemetry:
    fontFamily: "DragonRaja Mono, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  story-cast:
    fontFamily: "DragonRaja Serif, Noto Serif SC, SimSun, serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
spacing:
  workspace-gutter: "clamp(14px, 2.4vw, 40px)"
  reading-gutter: "clamp(20px, 2.6vw, 40px)"
  tablet-gutter: "clamp(18px, 3.4vw, 32px)"
  mobile-gutter: "12px"
  story-shell-columns: "72px minmax(0, 1fr) minmax(300px, 23vw)"
  story-mobile-status: "min(292px, 36vh)"
components:
  admission-seal:
    backgroundColor: "{colors.admissions-wax}"
    textColor: "{colors.admissions-wax-ink}"
    typography: "{typography.interface-label}"
    rounded: "50%"
    width: "clamp(78px, 7.4vw, 118px)"
  admission-cta:
    backgroundColor: "rgba(11, 17, 24, 0.58)"
    textColor: "{colors.admissions-paper}"
    typography: "{typography.interface-body}"
    rounded: "0"
    padding: "15px 18px 15px 24px"
    width: "230px"
  opening-choice:
    backgroundColor: "rgba(9, 15, 21, 0.68)"
    textColor: "{colors.admissions-paper}"
    typography: "{typography.interface-body}"
    rounded: "0"
    padding: "0 22px"
    height: "80px"
  story-action:
    backgroundColor: "{colors.action-crimson}"
    textColor: "#ffffff"
    typography: "{typography.interface-label}"
    rounded: "0"
    padding: "0 20px"
    height: "62px"
  story-action-hover:
    backgroundColor: "{colors.action-crimson-hover}"
    textColor: "#ffffff"
  composer-field:
    backgroundColor: "{colors.archive-sheet}"
    textColor: "{colors.archive-ink}"
    typography: "{typography.interface-body}"
    rounded: "0"
    padding: "12px 14px"
    height: "62px"
  story-navigation:
    backgroundColor: "{colors.archive-sheet}"
    textColor: "{colors.archive-muted}"
    typography: "{typography.interface-label}"
    rounded: "0"
    padding: "18px 12px 16px"
  native-filter:
    backgroundColor: "rgba(17, 27, 37, 0.45)"
    textColor: "{colors.admissions-muted}"
    typography: "{typography.interface-label}"
    rounded: "0"
    padding: "8px 12px"
    height: "34px"
  status-rail:
    backgroundColor: "{colors.archive-sheet}"
    textColor: "{colors.archive-ink}"
    typography: "{typography.interface-label}"
    rounded: "0"
    padding: "18px 12px 16px"
    width: "228px"
  reader-turn:
    backgroundColor: "{colors.archive-sheet-sunk}"
    textColor: "{colors.archive-ink}"
    typography: "{typography.interface-body}"
    rounded: "0"
    padding: "13px 17px"
  dossier-dialogue:
    backgroundColor: "{colors.archive-sheet}"
    textColor: "{colors.archive-ink}"
    typography: "{typography.interface-label}"
    rounded: "0"
    padding: "8px 10px"
  cast-row:
    backgroundColor: "transparent"
    textColor: "{colors.stage-paper}"
    typography: "{typography.story-cast}"
    rounded: "0"
    padding: "8px 0"
    height: "57px"
  cast-row-active:
    backgroundColor: "rgba(215, 149, 45, 0.08)"
    textColor: "{colors.stage-paper-2}"
    rounded: "0"
    padding: "8px 0 8px 9px"
---

# Design System: Dragon Raja Immersive HUD

## Overview

**Creative North Star: "雨夜入学，日光归档"**

“雨夜入学，日光归档”把界面组织成一次门槛明确的转场：用户在雨幕、坐标、学院印章和低照度终端中完成入学仪式；进入故事后，世界切换为晨光里的学院卷宗。暖白纸页悬在柔焦环境图前，炼金铜建立秩序，同步青只标记活态，龙焰红只召唤关键行动。

整体气质神秘、克制、具有学院感，同时以长篇叙事的可阅读性为最高约束。界面不模仿通用聊天产品：助手文本是一条阅读列，用户行动是较窄的纸面内缩；导航、状态和原生镜像像档案器械一样精准，不使用霓虹玻璃、圆角气泡或卡片堆叠制造“未来感”。

Story 的实现进一步收束为“场次脊线”：桌面是窄工具轨、暖纸阅读面和深色演员谱，移动端先呈现角色状态再进入正文。演员谱从 assistant 标记动态生成，最多显示五名角色；选中行只改变当前 dossier，不改变 Snapshot 或 Bridge 的所有权。没有真实立绘 URL 时不渲染占位图，避免用装饰性纹理冒充内容。

**Key Characteristics:**

- 暗色入学仪式与明亮档案工作台形成明确双相。
- 叙事正文优先于工具，工具退居纸页边缘和低频覆盖层。
- 直角纸面、发丝边框、炼金几何与有限的语义色构成组件语言。
- 背景负责氛围和景深，任何长文本都落在不透明、高对比的阅读表面。
- 动效遵循进入、揭页、归档和关闭的方向语义，并完整尊重减少动态效果偏好。

## Colors

色彩在两个世界中保持同一角色关系：雨夜阶段提高明度以穿透暗场，日光阶段压低色度以服务阅读；颜色负责语义，不负责制造持续噪声。

### Primary

- **炼金铜** (雨夜 `#b99761`；日光 `#8a5f24`): 学院印记、选中边框、导航图标、结构刻线和键盘焦点的常规强调色。

### Secondary

- **同步青** (雨夜 `#72bfc1`；日光 `#2f7376`): 仅用于连接、流式生成、同步完成和其他实时状态。

### Tertiary

- **龙焰红** (仪式 `#d55731`；主行动 `#9c3d34`): 用于危险、断线和唯一主提交动作；常规导航与装饰不得借用它。

### Neutral

- **雨夜墨** (`#05070b`): 欢迎、开局和暗色原生镜像的基底。
- **入学信纸** (`#e8e2d6`): 暗场主要文字与高价值标题。
- **雨幕灰** (`#93a3ad`): 暗场说明、坐标和次要状态。
- **卷宗纸** (`#fffdf8`): 故事阅读页、导航纸页和状态档案的主要不透明表面。
- **下沉纸面** (`#f5f1e8`): 用户行动、悬停和嵌入式控件的退后层。
- **档案墨** (`#343a46`): 日光界面的正文和控件主文字。
- **批注灰** (`#666e7a`): 日光界面的辅助说明、静态状态与次要标签。
- **档案发丝线** (`rgba(120, 108, 86, 0.2)`): 纸页边界、分区与控件接缝。

### Named Rules

**The One Accent Rule.** 炼金铜是常规强调色；同步青只表示活态，龙焰红只表示关键行动或异常。

**The Opaque Reading Rule.** 背景图可以营造景深，但正文、输入和状态文字必须位于不透明卷宗纸上。

## Typography

**Display Font:** DragonRaja Brush / Ma Shan Zheng 400（欢迎与开局主标题专用；中文回退 DragonRaja Serif）  
**Body Font:** DragonRaja Sans (with Segoe UI, Microsoft YaHei, system-ui, sans-serif)  
**Label/Mono Font:** DragonRaja Mono (with Consolas, monospace)

**Character:** 衬线体承载世界观、角色声音与长篇阅读；无衬线体保持控件清晰；等宽体只负责坐标、版本、连接和机器元数据。三者并置形成“叙事卷宗 + 学院器械”的双重语气。

### Hierarchy

- **Admissions Display** (900, desktop 76px / mobile 44px / compact-height 38px, 0.94): 只用于欢迎页的 Dragon Raja 名称，以大写装饰衬线形成龙族式压迫感；精确值以 frontmatter 和响应式实现为准。
- **Opening Display** (400, desktop 90px / tablet 52-58px / mobile 42px, 1.02): 使用自托管 DragonRaja Brush 承载开局档案问题，形成比通用衬线更强的龙族手写气质，同时保持低于欢迎标题的层级；中等桌面会收紧字号和选项行高以保证完整呈现。
- **Story Title** (500, 23px, 1.18): 用于当前角色或频道标题，避免与正文争夺阅读宽度。
- **Story Body** (400, 15px, 1.98): 用于 assistant 叙事正文；阅读列限制在约 68ch。
- **Interface Body** (400, 12px, 1.8): 用于用户行动、输入和解释性控件文案。
- **Label** (600, 11px, 0.06em): 用于导航、说话者、面板小标题和状态行；11px 是日光工作台的可读下限。
- **Telemetry** (500, 11px, 1.5): 用于连接、版本和坐标；保持短句，不承担正文。

### Named Rules

**The Three Voices Rule.** 衬线讲故事，无衬线完成操作，等宽体报告系统；不要让任何一种字体同时承担三种职责。

## Layout

欢迎页是全屏居中的单焦点仪式，顶部金橙光束、红橙灰烬和外围坐标只为中央入学信封与标题建立场域。开局页在桌面使用“步骤 / 问题与选项 / 已选档案”三栏，顶端学院终端横跨全宽；超宽屏档案主体上限为 2160px，右侧登记纸稳定在 420-620px，其余空间优先分配给问题和选项。它是一次建档流程，不是普通表单卡片。

开局选项不假设只有四项：六项以内使用大号单列，七至二十项转为双列并让选项区独立滚动；移动端始终回到单列并由主审查区滚动。组数据可声明单选或多选，多选必须展示当前数量、最少/最多限制和明确的本组确认动作。

故事主界面在固定顶栏下采用“窄图标导航 / 叙事阅读页 / 连续状态档案栏”的三栏拓扑；当前 Story shell 的桌面列为 `72px minmax(0, 1fr) minmax(300px, 23vw)`。工作区外边距使用响应式 `clamp(14px, 2.4vw, 40px)`，阅读区内边距使用 `clamp(22px, 3vw, 40px)`。助手正文左对齐且不超过 72ch，用户行动缩至 60ch 并靠右，消息之间以留白和 cue rail 而非气泡区分。

在 980px 及以下压缩导航并保留右侧状态栏；在 700px 及以下，导航变为 56px 顶部工具条，状态栏位于正文前并限制为 `min(292px, 36vh)`，演员行水平滚动，正文采用 13px 边距，交互触点至少 44px，并保留安全区。低频菜单从右侧分层滑入；原生镜像在桌面是居中三段式面板，在手机上占满可用视口。

**The Dual Threshold Rule.** 欢迎与开局属于雨夜仪式，故事与日常操作属于日光档案；不要在同一主表面中混合两套底色。

## Elevation & Depth

系统采用结构化纸张分层。Story shell 的阅读面、侧轨和状态栏在静止时使用不透明色阶与 1px 规则线，不额外投影阴影；弹出菜单、抽屉、模态框沿用现有暖棕阴影层级。暗场的光晕只属于印章、雷达和活态信号，不得扩散成霓虹装饰。

### Shadow Vocabulary

- **Low Chrome** (`0 8px 22px rgba(74,60,38,.12)`): 固定顶栏和最低层浮动工具。
- **Standard Sheet** (`0 10px 26px rgba(74,60,38,.15)`): 导航纸页和状态档案栏。
- **Reading Sheet** (`0 14px 34px rgba(74,60,38,.16)`): 主叙事阅读页。
- **Popover** (`0 8px 22px rgba(74,60,38,.2)`): 消息动作菜单等局部覆盖层。
- **Side Panel** (`-18px 12px 48px rgba(84,69,45,.18)`): 右侧抽屉。
- **Modal** (`0 26px 70px rgba(84,69,45,.22)`): 原生镜像和最高层对话框。

### Named Rules

**The Structural Shadow Rule.** 阴影只说明表面的真实层级，不作为按钮、文字或背景的装饰性发光。

## Shapes

形状语言是直角、薄边、斜切底板和炼金几何。常规按钮、输入、chip、卡片与纸页保持 0 圆角；1px 发丝线承担大部分分组。圆形只用于学院印章、步骤编号、头像、雷达和状态点，菱形只用于校徽与炼金信号。消息省略号触发器的 3px 小圆角是局部触控例外，不构成通用圆角尺度。

**The Square Instrument Rule.** 默认组件必须像档案器械一样直角且精准；只有对象本身具有印章、人物或信号语义时才使用圆形。

## Components

组件应呈现“档案器械般精准，克制但有触感”的手感：静止时安静，悬停、选中和按压时给出明确但短促的位移、边框或底色反馈。

### Buttons

- **Shape:** 直角（0）；以 1px 边框、整块底色或纸面层差表达层级。
- **Admission CTA:** 半透明雨夜底、炼金铜边框和较宽的文字/箭头间距；悬停上移 3px 并加深铜色底。
- **Opening Choice:** 常规单列为 80px 高的横向档案选项；密集双列为 64-68px。选中时出现整块铜色状态、底部判定线和确认图标；多选使用方形勾选标记，并在达到上限时只禁用尚未选择的项。
- **Primary Story Action:** 62px 高的实心龙焰红按钮，是故事工作台唯一持续可见的高色度动作。
- **Hover / Focus:** 常规过渡为 150-240ms；键盘焦点统一使用 2px 炼金铜描边和 3px offset。
- **Disabled:** 保持文字可读，以去饱和底色替代低透明度消失。

### Chips

- **Style:** 原生筛选 chip 是直角暗色薄片，使用雨幕灰文字和 1px 低对比边框。
- **State:** 选中时使用同步青边框与轻微青色底；不可用项降低不透明度但保留标签。

### Cards / Containers

- **Corner Style:** 直角（0）；状态栏内部不再嵌套独立卡片。
- **Background:** 主要为卷宗纸，嵌入内容使用下沉纸面；暗场选择项使用近黑半透明表面。
- **Shadow Strategy:** 依照 Elevation 层级；内部内容分区只用发丝线与留白。
- **Internal Padding:** 工作区采用 14-40px 响应式外边距，阅读纸页采用 20-40px 响应式内边距。

### Inputs / Fields

- **Style:** 故事输入框与模型选择、发送动作拼成一个连续 62px 控制条；输入区使用卷宗纸、档案墨和 12px 正文。
- **Focus:** 不添加霓虹辉光；使用统一炼金铜外描边或明确的底边变化。
- **Error / Disabled:** 错误以龙焰红文字和低色度红底说明，禁用状态仍维持足够对比。

### Navigation

桌面导航是窄直角暗色轨上的垂直六项图标栏，活动项以 1px 龙焰红刻线、下沉纸面和炼金铜图标标记。手机端同一导航转为 56px 顶部工具条；图标和标签保持同一顺序与语义。Story 演员谱使用 1px 分隔线和角色色条，活动行以 1px 炼金铜边和整行低色度底色标记。

### Dossier Status Rail

右侧档案栏是一张连续深色台面，演员谱、原生状态、dossier、论坛与行动通过留白和发丝线组织，不再拆成多个浮动卡片。同步青标记角色或系统活态，炼金铜标记用户侧信息，长内容必须截断或进入专门资料页；真实立绘存在时才显示图像区域。

### Cast Ledger

演员谱是 Story 状态栏的签名组件。它从 `dossier.characters` 生成最多五行，每行包含角色色条、姓名、身份和关系；桌面垂直排列，移动端水平滚动。点击行只切换当前 dossier 索引，保留原有上一位/下一位操作作为辅助入口。

### Motion

进入结构通常使用 0.38-0.52s 的 `expo.out`，内部内容使用 0.3-0.42s 的 `power2.out` 分层出现；退出更短，使用 0.18-0.28s 的 `power2.in` 和反向 stagger。欢迎阶段由顶部金橙光束照向入学信封，红橙灰烬以不规则速度和横向扰动上升；开局步骤横向切换，新消息按角色方向揭页，抽屉从右侧分层进入，模态框向上浮起。减少动态效果时，光束与灰烬停在静态构图，其余过渡缩短为近零，环境图使用静态 poster。

**The One Primary Action Rule.** 每个工作表面只能有一个持续可见的龙焰红主动作，其余操作使用纸面、炼金铜或中性色层级。

## Do's and Don'ts

### Do:

- **Do** 让欢迎和开局保持雨夜暗场，让故事与工作界面落在暖白卷宗纸上。
- **Do** 把助手文本当成长篇阅读内容，用 68ch 阅读列、充足行高和留白组织节奏。
- **Do** 使用炼金铜建立常规层级，只让同步青表达活态、龙焰红表达主行动或异常。
- **Do** 让阴影、动效和几何都解释真实结构、方向或状态。
- **Do** 为键盘焦点、减少动态效果和移动端安全区保留明确处理。

### Don't:

- **Don't** 引入霓虹玻璃、发光描边、渐变光球或无语义的赛博朋克装饰。
- **Don't** 把消息改成通用左右圆角气泡，或把连续档案栏拆成卡片堆叠。
- **Don't** 给按钮、输入、chip 和纸页自动添加通用圆角；圆形只服务印章、头像和状态语义。
- **Don't** 把文字直接压在环境图、雨纹或纸张纹理上而不提供不透明阅读表面。
- **Don't** 用装饰性斜纹或低透明度伪造缺失的角色立绘；无真实资源时保持空白并保留字段可读性。
