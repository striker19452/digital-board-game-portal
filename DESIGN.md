---
name: 数字桌游馆
description: 在公网与本地之间可靠切换的私人数字桌游入口
colors:
  midnight-ink: "#111311"
  raised-ink: "#1a1c19"
  high-ink: "#242620"
  museum-bone: "#f1eadc"
  quiet-bone: "#b7afa0"
  archive-line: "#3b3c34"
  muted-cinnabar: "#b85842"
  lit-cinnabar: "#d77960"
  available-green: "#78a884"
  warning-ochre: "#d4aa5a"
typography:
  display:
    fontFamily: "Noto Serif SC, Songti SC, STSong, Georgia, serif"
    fontSize: "clamp(2.75rem, 8vw, 6.5rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Noto Serif SC, Songti SC, STSong, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Inter, Segoe UI, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, Segoe UI, PingFang SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "72px"
components:
  button-primary:
    backgroundColor: "{colors.muted-cinnabar}"
    textColor: "{colors.museum-bone}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.lit-cinnabar}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
  button-ghost:
    backgroundColor: "{colors.raised-ink}"
    textColor: "{colors.museum-bone}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
  filter-chip:
    backgroundColor: "{colors.high-ink}"
    textColor: "{colors.quiet-bone}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
---

# Design System: 数字桌游馆

## Overview

**Creative North Star: "夜间典藏室"**

界面像一间在暖灯下整理好的私人典藏室：深色外壳退到背景，封面成为进入不同世界的门。它是可信赖的产品入口，不是营销落地页；层级清楚、状态诚实、动作直接。

拒绝霓虹电玩大厅、手游运营中心、通用 SaaS 仪表盘、装饰性玻璃拟态、无意义的大数字指标和完全相同的卡片网格。响应式布局通过结构重排完成，不依赖夸张的流体字号。

**Key Characteristics:**

- 暖黑中性色构成稳定外壳。
- 朱红只用于主要动作、选择和焦点。
- 一张精选大图与紧凑目录形成节奏。
- 动效只说明交互状态，持续 150–250ms。

## Colors

色彩像深夜木柜、旧纸标签和一枚克制的朱红馆藏印记。

### Primary

- **Muted Cinnabar**：只用于主操作、当前选择和焦点，不作大面积装饰。
- **Lit Cinnabar**：用于朱红元素的悬停与键盘焦点反馈。

### Neutral

- **Midnight Ink**：页面背景。
- **Raised Ink**：导航、目录与表单的第一层表面。
- **High Ink**：选中态和更高层交互表面。
- **Museum Bone**：主要文字。
- **Quiet Bone**：说明、元数据和未激活标签。
- **Archive Line**：边框与分隔线。

### Named Rules

**The One Seal Rule.** 朱红在单屏中的面积不得超过 10%，稀缺性就是它的辨识度。

## Typography

**Display Font:** Noto Serif SC（Songti SC、STSong、Georgia 后备）
**Body Font:** Inter（Segoe UI、苹方、微软雅黑、system-ui 后备）

**Character:** 标题像藏书目录的题签，正文像可靠的系统界面。衬线体只用于品牌、游戏标题和主要章节，不进入按钮与密集标签。

### Hierarchy

- **Display**（600，clamp 2.75rem–6.5rem，0.96）：门户品牌和精选标题。
- **Headline**（600，2rem，1.15）：章节与游戏标题。
- **Body**（400，1rem，1.65）：说明文字，段落控制在 65–75ch。
- **Label**（700，0.75rem，0.08em）：状态、模式与版本。

### Named Rules

**The Two Voices Rule.** 衬线负责世界与标题，无衬线负责动作与事实，永不互换。

## Elevation

系统以色调分层和边框为主，静止状态不依赖阴影。只有精选封面和悬停中的目录项获得低扩散环境阴影，表示它们可以进入。

### Shadow Vocabulary

- **Ambient Low**（`0 18px 60px rgb(0 0 0 / 0.22)`）：精选封面和浮起的可点击目录。

### Named Rules

**The Flat-By-Default Rule.** 表面静止时保持平坦，阴影只能回应层级或交互。

## Components

### Buttons

- **Shape:** 克制的小圆角（6px）。
- **Primary:** 朱红底、骨白字，最小高度 44px。
- **Hover / Focus:** 150–200ms 指数缓出；焦点使用 2px 亮朱红轮廓和 3px 间距。
- **Secondary / Ghost:** 墨色表面配完整 1px 边框，不使用彩色侧边条。

### Chips

- **Style:** 胶囊形、暗墨底、安静骨白文字。
- **State:** 选中态使用较高墨色表面与朱红文字，不用高饱和整块填充。

### Cards / Containers

- **Corner Style:** 目录项 12px，精选区域 18px。
- **Background:** Raised Ink 与 High Ink。
- **Shadow Strategy:** 遵循 Flat-By-Default。
- **Border:** 完整 1px Archive Line。
- **Internal Padding:** 16–24px，并随信息层级变化。

### Inputs / Fields

- **Style:** Raised Ink、完整边框、6px 圆角，最小高度 44px。
- **Focus:** 亮朱红轮廓；错误同时显示文字，不只改变颜色。
- **Error / Disabled:** 降低对比度但保持可读，禁用动作不可伪装成链接。

### Navigation

顶部导航保持单层，品牌、运行模式和本地主机设置按优先级排列；窄屏改为纵向重排。模式切换使用标准按钮组和 `aria-pressed`。

### Featured Game

精选入口使用一张横向封面、底部实色信息带和直接启动动作。遮罩只服务文字对比，不使用玻璃或渐变文字。

## Do's and Don'ts

### Do:

- **Do** 让公网、本地、测试中、维护中和未部署状态一眼可辨。
- **Do** 使用完整边框、色调分层和可见焦点表达交互。
- **Do** 保持按钮和输入控件至少 44px 高。
- **Do** 让封面承担世界观，门户外壳保持安静。

### Don't:

- **Don't** 做成霓虹电玩大厅、手游运营中心或通用 SaaS 仪表盘。
- **Don't** 使用装饰性玻璃拟态、渐变文字或彩色粗侧边条。
- **Don't** 使用无意义的大数字指标和完全相同的卡片网格。
- **Don't** 用重动画、复杂弹窗或世界观装饰妨碍启动游戏。
- **Don't** 让任何关键状态只依赖颜色或悬停表达。
