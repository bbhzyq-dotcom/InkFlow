# Pake 配置文件
# 将 InkFlow Web 打包为桌面应用

## 使用方式

### 1. 在线打包（推荐新手）
直接访问 Pake 在线打包平台：
https://pake.tw93.fun/

或者使用 GitHub Actions 打包

### 2. 命令行打包（需安装 Pake CLI）
```bash
# 安装
npm install -g pake-cli

# 打包
cd /workspace/inkflow/web
pake http://localhost:8000 --name InkFlow --width 1200 --height 800
```

### 3. 本地开发
```bash
# 克隆 Pake
git clone https://github.com/tw93/Pake.git
cd Pake

# 安装依赖
pnpm install

# 开发模式
pnpm run dev
```

### 4. GitHub Actions 打包（推荐）
Fork Pake 后修改配置文件，push 到你的仓库即可自动构建

## 重要提示

Pake 打包的是本地服务，需要先启动 InkFlow 后端：
```bash
cd InkFlow/web
node src/server.js
```

## 配置文件参数说明

- `url`: 本地服务地址
- `name`: 应用名称
- `width/height`: 窗口大小
- `icon`: 应用图标
- `title`: 窗口标题
