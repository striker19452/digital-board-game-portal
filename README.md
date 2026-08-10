# 数字桌游馆

四个电子桌游的统一入口，支持公网、本机和局域网两套启动环境。游戏保持独立部署，门户不读取游戏存档或房间数据。

## 开发门户

```powershell
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:4173/`。

## 一键启动全部本地游戏

需要 Windows 11、PowerShell 7.6、Node.js、pnpm，以及 `D:\miniconda3\envs\agent`。

```powershell
pnpm local:start
pnpm local:status
pnpm local:stop
```

服务端口：

| 服务 | 地址 |
|---|---|
| 门户 | `http://127.0.0.1:4173/` |
| 乌托邦引擎：怪兽猎人 | `http://127.0.0.1:4184/` |
| 镇夜录 | `http://127.0.0.1:4175/ghost-stories-digital/` |
| 魔戒对决 | `http://127.0.0.1:4176/` |
| 罗布西茨会战 | `http://127.0.0.1:4177/` |

启动记录和日志保存在 `.runtime/`。停止脚本只会处理启动器记录且创建时间匹配的进程。

局域网设备访问时，在 Windows 防火墙中允许对应程序，然后使用运行启动器的电脑 IPv4 地址，例如 `http://192.168.1.20:4173/`。门户会自动让游戏入口使用同一个主机地址，也可在“本地主机”设置中手动修改。

## 新增游戏

### 第 1 步：增加游戏清单

在门户项目的 `src/games/` 目录中增加一份 JSON 文件，例如：

```text
D:\MyProjects\网站门户\src\games\my-new-game.json
```

这个文件就是门户与游戏之间的接入配置。门户界面和本地启动器都会读取它，不需要修改 `src/main.ts`。

示例：

```json
{
  "id": "my-new-game",
  "title": "我的新游戏",
  "summary": "显示在门户目录中的游戏简介。",
  "cover": "covers/my-new-game.webp",
  "versionSource": {
    "url": "https://raw.githubusercontent.com/example/my-new-game/main/package.json",
    "format": "package-json"
  },
  "status": "available",
  "modes": ["solo"],
  "players": { "min": 1, "max": 1 },
  "tags": ["策略", "单人"],
  "launch": {
    "public": "https://example.com/my-new-game/",
    "local": {
      "runtime": "vite",
      "directory": "../我的新游戏",
      "port": 4177,
      "path": "/"
    }
  }
}
```

主要字段的意义：

| 字段 | 意义 |
|---|---|
| `id` | 游戏的唯一英文标识，不能与已有游戏重复。 |
| `title` | 门户中显示的中文名称。 |
| `originalTitle` | 可选的原文名称。 |
| `summary` | 门户中显示的简介。 |
| `cover` | 相对于门户 `public/` 目录的封面路径。 |
| `versionSource` | 游戏版本的只读来源。门户会在浏览器中获取并缓存，不再手工填写版本号。 |
| `status` | `available` 可游玩、`beta` 测试中、`coming-soon` 即将推出、`maintenance` 维护中。 |
| `modes` | 游玩方式：`solo`、`local-multiplayer`、`ai` 或 `online`。 |
| `players` | 支持的最少和最多玩家数。 |
| `tags` | 用于门户搜索和内容识别的标签。 |
| `featured` | 可选。设为 `true` 时作为首页精选游戏；整个清单只能有一款精选游戏。 |
| `launch.public` | 公网模式下打开的 HTTPS 地址；尚未部署时可以暂不填写。 |
| `launch.local` | 本地模式下的启动与访问配置。 |
| `notice.public/local` | 可选。分别在公网或本地模式中显示的提示。 |

`versionSource.format` 支持以下两种格式：

| 格式 | 用途 |
|---|---|
| `package-json` | 从 JSON 顶层的 `version` 字段读取版本，适用于以 `package.json` 管理版本的游戏。 |
| `game-version-script` | 从 `GAME_VERSION = Object.freeze({ number: "…" })` 读取版本，适用于当前怪兽猎人的发布信息脚本。 |

版本来源必须使用 HTTPS，并允许浏览器跨域读取。门户首次读取时显示“版本读取中…”，成功后缓存结果；网络暂时不可用时会沿用上次成功读取的版本，没有缓存时显示“版本未知”。

`launch.local` 中各字段的意义：

| 字段 | 意义 |
|---|---|
| `runtime` | 告诉 PowerShell 启动器采用哪一种受控启动方式。 |
| `directory` | 游戏项目目录，相对于 `D:\MyProjects\网站门户` 解析。例如 `../我的新游戏` 代表 `D:\MyProjects\我的新游戏`。 |
| `port` | 游戏本地服务监听的端口，必须与门户和其他游戏不同。 |
| `path` | 服务启动后浏览器需要打开的路径，必须以 `/` 开头。 |

### 第 2 步：增加封面

把一张 16:9 WebP 封面放入：

```text
D:\MyProjects\网站门户\public\covers\
```

例如清单填写 `"cover": "covers/my-new-game.webp"`，对应的实际文件应为：

```text
D:\MyProjects\网站门户\public\covers\my-new-game.webp
```

### 第 3 步：配置本地运行方式

在刚创建的游戏清单文件中修改 `launch.local`，从以下运行时中选择一种：

| `runtime` | 适用项目 | 本地启动器实际执行的方式 |
|---|---|---|
| `static` | 可直接打开的纯 HTML、CSS、JavaScript 项目 | 使用 `D:\miniconda3` 的 `agent` 环境运行 Python 静态 HTTP 服务。 |
| `vite` | 使用 Vite 的前端项目，包括常见的原生、React、Vue 或其他 Vite 应用 | 在游戏目录中运行 `pnpm exec vite`。 |
| `node` | 由 Node.js 提供网页、API、房间或联机服务的项目 | 在游戏目录中运行 `npm start`，并传入清单中的 `PORT` 和 `HOST=0.0.0.0`。 |

如果项目既有前端又有后端，应选择能够同时提供网页和 API 的 `node` 启动入口。

端口的意义是区分同一台电脑上的不同本地服务。当前分配如下：

| 服务 | 端口 |
|---|---|
| 门户 | `4173` |
| 镇夜录 | `4175` |
| 魔戒对决 | `4176` |
| 罗布西茨会战 | `4177` |
| 乌托邦引擎：怪兽猎人 | `4184` |

新增游戏可以继续使用 `4178`、`4179` 等未分配端口。清单校验会检查游戏之间是否重复；实际启动时还会检查端口是否已被其他程序占用。

### 第 4 步：验证接入配置

修改完成后，在门户目录执行：

```powershell
cd D:\MyProjects\网站门户
pnpm validate
pnpm test
```

两个命令的意义：

| 命令 | 作用 |
|---|---|
| `pnpm validate` | 读取 `src/games/*.json`，检查 JSON 清单字段、重复游戏 ID、重复端口、状态和运行时是否合法、公网地址是否为 HTTPS，以及 `public/covers/` 中的封面是否存在。它不会启动游戏。 |
| `pnpm test` | 运行门户的自动测试，验证搜索、模式筛选、公网/本地环境判断、主机地址校验和本地启动 URL 生成等逻辑。它不会运行三个游戏各自的规则测试。 |

如果还要确认门户能够正常生成生产文件，再执行：

```powershell
pnpm build
```

`pnpm build` 会先再次运行清单校验，再执行 TypeScript 类型检查，最后把可部署文件生成到门户的 `dist/` 目录。

清单不会执行任意 Shell 命令。本地启动器只允许三个已实现的运行时适配器。

## 验证与构建

```powershell
pnpm validate
pnpm test
pnpm build
pnpm preview
```

GitHub Pages 工作流会依次安装依赖、运行测试、验证清单并构建 `dist/`。

## 公网地址

- 怪兽猎人、镇夜录和罗布西茨会战已在清单中配置 GitHub Pages 地址。
- 魔戒对决已在清单中配置 Render 公网地址：`https://lotrc.onrender.com/`。
