# 截图来源

本目录的图片用于 README 中的功能说明，来源可追溯且不包含凭据。

| 文件 | 来源资产 | 用途与验证边界 |
| --- | --- | --- |
| `right-sidebar-browser.png` | 开发环境 DSH Web 会话中的右侧栏浏览器面板，页面为本地 fixture | 右侧栏串流画面、聚焦描边、元素标签、键入回显与指针光标的验收截图 |
| `right-sidebar-browser-tabs.png` | 同一开发环境会话，页面为本地验收 fixture，工具菜单处于展开状态 | 标签栏、后退与前进状态、地址栏、工具菜单中的缩放与排版选项、悬停标签与点击来源标记的验收截图 |

文件 SHA-256：

```text
aaa196c52c8955be28a5e4484ee108a5a25a6597146bca9676d5590a2015b921  right-sidebar-browser.png
fbc1ac5b7d67efe82ad3a0c1adf69e0d7cd4ef2a2078c13cde1c6a2e627a523b  right-sidebar-browser-tabs.png
```

截图取自本机临时 fixture 页面（`127.0.0.1` 本地端口）与合成数据，不连接真实账户或外部站点，并对整屏图像做了右侧面板裁剪；自动化引擎与串流行为由插件测试覆盖。
