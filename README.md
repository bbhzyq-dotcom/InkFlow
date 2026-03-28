# InkFlow - 智能小说创作平台

InkFlow 是一个基于 InkOS 核心的智能小说创作平台，提供 Web 界面和完整的 AI 辅助写作功能。

## 功能特性

### 核心功能
- **多类型小说创作**：支持玄幻、仙侠、都市、科幻、恐怖等多种类型
- **AI 智能写作**：调用 OpenAI API 生成高质量小说内容
- **章节管理**：创建、编辑、删除小说章节
- **写作风格选择**：支持正常、紧凑、华丽三种风格
- **进度可视化**：实时显示 AI 写作进度

### InkOS 引擎
- 内置 InkOS 写作引擎（JavaScript 实现）
- 支持续写功能，基于上文智能生成下文
- 备用生成模式：即使没有 API Key 也能生成内容

## 快速开始

### 环境要求
- Node.js >= 18.0.0

### 安装

```bash
# 进入项目目录
cd InkFlow

# 安装依赖（只需这一步）
cd web && npm install
```

### 启动

```bash
# 方式一：直接运行
cd web
node src/server.js

# 方式二：使用环境变量配置 API Key
OPENAI_API_KEY=your-api-key node src/server.js

# 方式三：使用 npm script（需在项目根目录）
npm install
npm run dev
```

访问 http://localhost:8000

## 使用指南

### 1. 配置 AI

首次使用需要配置 AI API：

1. 点击左侧菜单「设置」
2. 选择 AI 提供商（默认 OpenAI）
3. 输入 API Key
4. 选择模型（默认 gpt-4o）
5. 点击「保存配置」

**注意**：如果不配置 API Key，系统会使用内置的备用生成模式。

### 2. 创建小说

1. 点击工作台或小说管理页面的「新建小说」
2. 输入小说标题
3. 选择小说类型（玄幻/仙侠/都市/科幻/恐怖/其他）
4. 点击「创建」

### 3. AI 写作

1. 进入章节编辑页面
2. 设置目标字数（默认 3000）
3. 选择写作风格
4. 点击「开始 AI 续写」
5. 等待写作完成
6. 内容自动保存

### 4. 手动编辑

1. 在左侧章节列表选择章节
2. 在编辑区直接修改内容
3. 点击「保存」按钮保存

### 5. 小说管理

- **查看小说**：点击小说卡片进入编辑
- **删除小说**：点击卡片右下角「删除」按钮
- **创建章节**：点击「+ 新建章节」按钮

## 项目结构

```
InkFlow/
├── web/
│   ├── src/
│   │   ├── server.js        # Express 后端服务器
│   │   └── inkos-engine.js  # InkOS 写作引擎
│   ├── templates/
│   │   ├── index.html       # 主页面
│   │   └── components/      # HTML 组件
│   ├── static/
│   │   ├── css/             # 样式文件
│   │   └── js/              # 前端脚本
│   └── data/                # 数据存储（自动创建）
│       ├── novels.json      # 小说数据
│       └── settings.json    # 设置
├── packages/                # 保留 InkOS 核心（TypeScript）
└── README.md
```

## API 接口

### 小说管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/novels | 获取所有小说 |
| GET | /api/novels/:id | 获取单个小说 |
| POST | /api/novels | 创建小说 |
| PUT | /api/novels/:id | 更新小说 |
| DELETE | /api/novels/:id | 删除小说 |

### 章节管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/novels/:id/chapters | 获取所有章节 |
| POST | /api/novels/:id/chapters | 创建章节 |
| GET | /api/novels/:id/chapters/:cid | 获取章节 |
| PUT | /api/novels/:id/chapters/:cid | 更新章节 |
| DELETE | /api/novels/:id/chapters/:cid | 删除章节 |

### AI 写作
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/novels/:id/write | AI 写作 |

### 设置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取设置 |
| POST | /api/settings | 保存设置 |
| GET | /api/status | 获取状态 |

## 数据存储

数据保存在 `web/data/` 目录：
- `novels.json` - 所有小说和章节数据
- `settings.json` - 用户设置

**重要**：请定期备份 `web/data` 目录。

## 配置说明

### 环境变量

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-xxxxx

# 端口（默认 8000）
PORT=8000
```

### 设置页面配置

- **AI 提供商**：OpenAI / Anthropic / 自定义
- **API Key**：您的 API 密钥
- **模型**：gpt-4o / gpt-4o-mini / gpt-3.5-turbo
- **默认小说类型**：玄幻/仙侠/都市/科幻/恐怖/其他
- **主题**：浅色/深色

## 常见问题

### Q: 报 "API 请求失败" 错误？
A: 请检查 API Key 是否正确，或确认网络连接正常。

### Q: 没有 API Key 能使用吗？
A: 可以，系统会使用备用生成模式生成内容，但质量较低。

### Q: 如何导出小说？
A: 目前需要手动复制内容，未来版本会增加导出功能。

### Q: 数据存储在哪里？
A: 保存在 `web/data/novels.json`，请定期备份。

## 更新日志

### v1.0.0
- 初始版本
- 支持多类型小说创建
- AI 写作功能
- 章节管理
- 浅色/深色主题

## 致谢

- [InkOS](https://github.com/Narcooo/inkos) - 多 Agent 小说写作引擎架构参考
- [AIWriteX](https://github.com/iniwap/AIWriteX) - Web 界面设计参考

## License

MIT
