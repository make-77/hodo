# Hodo Desktop

Hodo Desktop 是基于单文件网页 `hodo.html` 封装的离线桌面应用工程。工程会把网页依赖的 wangEditor、Prism 等前端资源本地化，并打包为 Windows 安装器和 Linux Debian/Ubuntu 安装包。

## 功能概览

- 保留 `hodo.html` 作为原始网页入口和业务来源。
- 构建时自动生成离线应用目录 `app/`，替换 CDN 地址为本地 `app/vendor/` 资源。
- 使用 Electron 封装桌面应用，支持离线运行。
- Windows 输出 NSIS 安装器，安装后启动速度优于 portable 单文件。
- Linux 输出 `.deb` 安装包，包含桌面入口、应用图标和任务栏图标匹配配置。
- 自动生成应用图标，并写入 Windows exe 资源、Linux hicolor 图标目录和 Electron 运行时资源目录。

## 原始 HTML

`hodo.html` 是当前网页的原始文件。它可以直接作为网页打开，也作为桌面应用构建的源文件。

构建过程不会直接修改 `hodo.html`。离线化由脚本完成：

- 读取 `hodo.html`
- 复制 npm 依赖中的前端资源
- 生成 `app/index.html`
- 将 CDN 引用替换为本地路径

相关脚本：

- `scripts/prepare-app.mjs`

## 工程结构

```text
.
├── hodo.html                  # 原始网页
├── electron/
│   └── main.js                # Electron 主进程
├── scripts/
│   ├── prepare-app.mjs        # 生成离线 app/
│   ├── generate-icons.ps1     # 生成 icon.ico / icon.png
│   ├── after-pack.cjs         # Windows 打包后写入 exe 图标资源
│   └── build-deb.mjs          # 组装 Linux deb 包
├── build/
│   ├── icon.svg               # 图标源文件
│   ├── icon.ico               # Windows 图标
│   └── icon.png               # Linux/Electron 图标
├── package.json               # npm 脚本和 electron-builder 配置
└── README.md
```

生成目录：

- `app/`：构建时生成的离线网页资源目录
- `dist/`：打包产物目录
- `node_modules/`：npm 依赖目录

这些目录不建议提交到 Git。

## 环境要求

- Node.js 20 或更高版本
- npm
- Windows PowerShell，用于执行 `scripts/generate-icons.ps1`

首次构建需要联网安装 npm 依赖，并下载 Electron 运行时。构建完成后的安装包可离线分发和运行。

## 安装依赖

```powershell
npm install
```

## 构建

生成图标、离线网页资源、Windows 安装器和 Linux deb：

```powershell
npm run build:all
```

单独构建 Windows：

```powershell
npm run build:win
```

单独构建 Linux deb：

```powershell
npm run build:deb
```

只生成离线网页目录：

```powershell
npm run prepare:app
```

只生成应用图标：

```powershell
npm run prepare:icons
```

## 交付物

构建完成后，主要交付物位于 `dist/`：

```text
dist/
├── Hodo-1.0.0-win-x64.exe       # Windows x64 安装器
├── Hodo-1.0.0-linux-amd64.deb   # Debian/Ubuntu x64 安装包
├── win-unpacked/                # Windows 已展开应用目录，可直接运行 Hodo.exe
└── linux-unpacked/              # Linux 已展开应用目录，用于组装 deb
```

### Windows

推荐分发：

```text
dist/Hodo-1.0.0-win-x64.exe
```

这是 NSIS 安装器，不是 portable 单文件。安装后会创建桌面快捷方式和开始菜单快捷方式，启动速度比 portable 版本更快。

如果只是本机测试，也可以直接运行：

```text
dist/win-unpacked/Hodo.exe
```

### Linux

推荐分发：

```text
dist/Hodo-1.0.0-linux-amd64.deb
```

安装：

```bash
sudo apt install ./Hodo-1.0.0-linux-amd64.deb
```

或：

```bash
sudo dpkg -i Hodo-1.0.0-linux-amd64.deb
sudo apt -f install
```

安装后可从系统应用菜单启动，也可以运行：

```bash
hodo
```

## 图标说明

图标由 `scripts/generate-icons.ps1` 生成：

- `build/icon.ico`：Windows 安装器和 exe 使用
- `build/icon.png`：Electron 窗口和 Linux 桌面环境使用
- `build/icon.svg`：图标源文件

Windows 构建会通过 `scripts/after-pack.cjs` 使用本地 `rcedit.exe` 将图标写入 `dist/win-unpacked/Hodo.exe`。这样任务栏图标会使用应用图标，而不是默认 Electron 图标。

Linux deb 包含：

- `/opt/Hodo/resources/icon.png`
- `/usr/share/icons/hicolor/256x256/apps/hodo.png`
- `/usr/share/applications/hodo.desktop`

`hodo.desktop` 中设置了：

```ini
Icon=hodo
StartupWMClass=Hodo
StartupNotify=true
```

这些配置用于让 Linux 桌面环境正确显示应用菜单和任务栏图标。

## 离线依赖说明

`hodo.html` 原始文件中使用的外部资源会在构建时被替换为本地资源：

- `@wangeditor/editor`
- `prismjs`
- Prism autoloader components

构建后的 `app/index.html` 不依赖 CDN。安装包内包含 Electron 运行时和所需前端资源，安装后可离线运行。

## 常见问题

### Windows 任务栏仍显示旧图标

如果旧版本已经固定到任务栏，Windows 可能会使用旧图标缓存。处理方式：

1. 取消固定旧图标。
2. 卸载旧版本。
3. 安装新版本。
4. 从开始菜单重新启动并重新固定。

### Linux 任务栏仍显示旧图标

先卸载旧包并重新安装新 deb：

```bash
sudo apt remove hodo
sudo apt install ./Hodo-1.0.0-linux-amd64.deb
```

如果桌面环境仍缓存旧图标，注销并重新登录一次。

### 为什么不直接提交 `dist/`

`dist/` 是二进制构建产物，体积较大，适合通过 GitHub Releases 发布，不适合直接进入源码仓库。

## 发布建议

GitHub 仓库建议提交源码和构建脚本：

- `hodo.html`
- `electron/`
- `scripts/`
- `build/icon.svg`
- `build/icon.ico`
- `build/icon.png`
- `package.json`
- `package-lock.json`
- `README.md`

安装包建议放到 GitHub Releases：

- `Hodo-1.0.0-win-x64.exe`
- `Hodo-1.0.0-linux-amd64.deb`

## 许可证

请根据项目实际情况补充许可证文件，例如 `LICENSE`。
