# DSH 浏览器插件

`dsh-plugin-browser` 为网页版 DeepSeek Harness 提供按 Session 隔离的 Chromium 浏览器，并在右侧栏显示同一个浏览器页面：

- `browser` 工具使用按 Session 隔离的 Playwright Chromium，适合自动化操作、可访问性快照和截图。
- Web 右侧栏的 `浏览器` 页面通过官方 Sidebar 扩展 API 实时串流同一个页面，并把鼠标、键盘、导航和滚动输入转发回去。
- 画面带操作提示：Agent 的动作会留下鼠标光标和说明标签，指针悬停会勾出元素并显示角色与名称，聚焦的输入框有描边和光标，键入内容会短暂回显。
- 页面随侧栏尺寸排版。可在画面中点击、拖动、滚动、双击选词、粘贴文本、使用中文输入法和 Tab、方向键、翻页键等。

工具和右侧栏共享 Cookie、Storage、登录状态与页面历史；Host 自动化仍默认无头运行，右侧栏提供可见操作面板。密码和 MFA 由用户在右侧栏手动输入，工具不会导出凭据。

## 功能截图

![右侧栏浏览器页面](docs/screenshots/right-sidebar-browser.png)

图：在 DSH Web 右侧栏中浏览本地 fixture 页面的验收截图，含聚焦描边、元素标签、键入回显与指针光标；来源和验证边界见 [`docs/screenshots/SOURCES.md`](docs/screenshots/SOURCES.md)。

## 安装

需要 Node.js 22.19 或更高版本，以及 Chromium 运行时依赖。安装和启动 Harness 时必须使用同一个 `DSH_HOME`。

```sh
git clone https://github.com/hzxwonder-dsh-plugins/dsh-plugin-browser.git
cd dsh-plugin-browser
npm ci
npm run browser:install
dsh plugin --profile migration add "file:$PWD"
```

保留 `file:` 前缀可让 pnpm 安装插件声明的依赖；裸路径会被当作 `link:`，只链接
插件目录。

修改插件配置后请重启 Harness。Host 自动化使用无头 Chromium，右侧栏显示同一页面。可配置已有 Chrome：

```yaml
- id: dsh-plugin-browser
  config:
    executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
    headless: true
```

保持 `headless: true`，在右侧栏 `浏览器` 中查看页面或手动输入密码/MFA。每个 Session 使用独立的临时 BrowserContext，同时最多保留 8 个；调用 `close` 或退出 Harness 后登录状态清除。

插件升级后，Playwright 所需的 Chromium 版本可能变化。请运行 `npm run browser:install` 安装匹配版本，或通过 `executablePath` 指定已有 Chrome，并重启 Harness。缺少运行时时，右侧栏会保留安装提示，直到下一次操作。

## 右侧栏浏览器

安装 Web 客户端扩展后，右侧栏会注册 `浏览器` 页面：

1. 打开 Harness Web 的右侧栏并选择 `浏览器`。工具导航时该页面会自动出现。
2. 地址栏输入目标 HTTP(S) 地址并按 Enter；工具导航也会驱动同一页面。
3. 使用后退、前进、刷新和关闭按钮；直接点击画面即可操作网页，点中的位置会出现波纹和指针，聚焦的输入框会显示描边与光标。
4. 键盘输入发送给当前聚焦的元素，粘贴、拖动和滚动同样生效。Agent 操作时画面会显示它点击或输入的位置和标签。

页面只接受不带用户名和密码的 HTTP(S) 地址。右侧栏通过已认证的 Host 接口串流 Chromium 画面，无 iframe 嵌入限制。画面按 CDP 事件推送，静止页面不产生流量，动作时即时更新；串流不可用时自动回退为按次截图并在工具栏标注 `兼容模式`，随后自动重试实时画面。用户输入会使旧的工具 observation 失效；工具需重新 snapshot 后继续操作。不提供音视频流、剪贴板读取或文件下载。

## `browser` 工具

工具动作包括 `navigate`、`snapshot`、`screenshot`、`click`、`fill`、`press`、`scroll`、`console`、`evaluate` 和 `close`。

先导航或获取快照，再把最新的 `observation`、精确的可访问性 `role` 和 `name` 传给输入动作。页面发生变化后必须重新获取快照。没有可访问性名称的纯视觉目标，可以按快照中的坐标点击：

```json
{"action":"click","x":420,"y":180,"observation":5}
```

`press` 只转发固定按键集合（Enter、Tab、Shift+Tab、Esc、Backspace、Delete、Insert、方向键、Home、End、PageUp、PageDown、F5 以及 Ctrl/Cmd 组合），可打印文本请使用 `fill`。`evaluate` 只接受固定检查项：`title`、`visible_text`、`links` 和 `layout`，不会执行任意 JavaScript。

示例：

```json
{"action":"navigate","url":"http://127.0.0.1:3000"}
```

```json
{"action":"snapshot"}
```

```json
{"action":"fill","role":"textbox","name":"项目名称","text":"demo","observation":3}
```

`screenshot` 返回 Harness attachment，密码和一次性验证码字段会被遮罩。输出会进行有限度的 Token、Cookie、Authorization 等字段脱敏；这不是完整的数据防泄漏系统。

## 权限与数据边界

- 仅允许 HTTP(S) 导航，包括 localhost；拒绝 `file:`、`data:`、`javascript:` 和带凭据的 URL。
- `read-only` 沙箱允许读取和观察，拒绝 `click`、`fill`、`press`；悬停提示仍可用。
- 密码和 MFA 必须由用户在可见浏览器中手动输入；插件不提供凭据导出能力。
- 页面文本、URL、控制台输出和截图可能包含私密内容，会进入 Session 记录或模型上下文；页面内容始终按不可信任务数据处理。
- 下载、Service Worker、弹窗、任意脚本执行和跨 Session 复用均未开放。

浏览器进程继承宿主网络权限。带登录状态的点击可能修改外部系统，使用前应确认目标和授权范围。

## 验证

```sh
npm test
# 可选：使用已有 Chrome
BROWSER_TEST_EXECUTABLE=/path/to/chrome npm test
```

测试会启动本地 HTTP fixture，覆盖导航、表单输入、过期 observation 拒绝、控制台、截图、固定检查项、Session 隔离，以及右侧栏串流帧、指针与聚焦事件、拖动和坐标点击。Harness Web 右侧栏激活和原生 attachment 显示属于独立集成检查，完整场景见 [`docs/e2e.md`](docs/e2e.md)。

## 开发文档

- [`docs/spec.md`](docs/spec.md)：工具和右侧栏页面契约。
- [`docs/e2e.md`](docs/e2e.md)：浏览器引擎及 Web 集成验证场景。
- [`README.en.md`](README.en.md)：English documentation。

## 许可证与来源

LGPL-3.0-only。实现遵循 DeepSeek Harness 官方客户端扩展接口，并参考 PI-Desktop 的浏览器交互契约；完整归属信息见 [`NOTICE`](NOTICE)，依赖项保留各自许可证。
