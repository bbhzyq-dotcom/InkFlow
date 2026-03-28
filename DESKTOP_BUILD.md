# InkFlow 桌面应用打包指南

## 方案一：Pake CLI（推荐）

### 1. 安装 Pake CLI
```bash
npm install -g pake-cli
```

### 2. 启动 InkFlow 服务
```bash
cd /workspace/inkflow/web
node src/server.js
```

服务运行在 http://localhost:8000

### 3. 打包为桌面应用
```bash
# macOS
pake http://localhost:8000 --name InkFlow --width 1200 --height 800 --height 800 --transparent true

# Windows
pake http://localhost:8000 --name InkFlow --width 1200 --height 800 --transparent true

# Linux
pake http://localhost:8000 --name InkFlow --width 1200 --height 800 --transparent true
```

### 打包参数说明
| 参数 | 说明 |
|------|------|
| `--name` | 应用名称 |
| `--width/height` | 窗口大小 |
| `--transparent` | 窗口透明（macOS） |
| `--title` | 窗口标题 |
| `--icon` | 应用图标（.icns/.png） |

## 方案二：在线打包平台

访问 https://pake.tw93.fun/ 或 https://github.com/tw93/Pake/releases

下载已有的应用作为参考

## 方案三：GitHub Actions 自动构建

Fork [Pake](https://github.com/tw93/Pake) 项目，修改配置后推送到你的仓库，自动构建各平台安装包。

## 方案四：Tauri 原生打包（需要更多配置）

如果需要完整的桌面应用支持（文件系统访问、原生菜单等），建议使用 Tauri 框架重写打包配置。

## 快速开始

```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 安装 Pake CLI
npm install -g pake-cli

# 3. 启动 InkFlow
cd /workspace/inkflow/web
node src/server.js

# 4. 新终端窗口打包（服务必须在运行）
pake http://localhost:8000 --name InkFlow --width 1200 --height 800
```

## 生成的安装包

| 平台 | 格式 |
|------|------|
| macOS | `.dmg` |
| Windows | `.exe` / `.msi` |
| Linux | `.deb` / `.AppImage` |
