# InkFlow - 智能小说创作平台

InkFlow 是一个基于 InkOS 核心的智能小说创作平台，提供 Web 界面和完整的 AI 辅助写作功能。

## 功能特性

### 核心引擎
- **10 Agent 写作管线**：Radar → Planner → Composer → Architect → Writer → Observer → Reflector → Normalizer → Auditor → Reviser
- **7 个真相文件**：世界状态、伏笔追踪、章节摘要、粒子账本、支线板、情感弧线、角色矩阵
- **37 维度连续性审计**：OOC检测、时间线一致性、 Lore 冲突、力量体系、伏笔追踪、节奏把控等
- **局部干预 + 级联更新**：选中章节部分内容精准重写，自动更新后续章节的真相文件

### 自定义模型支持
- 添加任意平台的 AI 模型（硅基流动、OpenAI API 兼容平台等）
- 每个模型包含：平台名称、API 地址、API Key、模型 ID
- 多模型路由：为不同 Agent 分配不同模型，平衡质量与成本

### 导入导出
- 支持导入：txt、md、epub 格式
- 支持导出：txt、md、epub 格式

### 其他功能
- **文风分析 + AIGC 检测**：分析写作风格，检测是否为 AI 生成
- **快照回滚**：保存历史版本，随时回滚到之前的状态
- **守护进程模式**：后台自动写作，节省时间
- **多类型支持**：玄幻、仙侠、都市、科幻、恐怖、言情、游戏、其他

## 快速开始

### 环境要求
- Node.js >= 18.0.0

### 安装与启动

```bash
# 克隆项目
git clone https://github.com/bbhzyq-dotcom/InkFlow.git
cd InkFlow/web

# 安装依赖
npm install

# 启动服务
node src/server.js
```

访问 http://localhost:8000

### 桌面应用

下载 Release 中的 `inkflow.deb` 安装包在 Linux 系统上安装。

## 使用指南

### 1. 添加 AI 模型

首次使用需要添加 AI 模型：

1. 点击左侧菜单「设置」
2. 在「自定义模型」区域填写：
   - 平台名称（如：硅基流动）
   - 模型 ID（如：Qwen/Qwen2.5-7B-Instruct）
   - API 地址（如：https://api.siliconflow.cn/v1）
   - API Key
3. 点击「添加模型」
4. 在「默认模型」下拉框中选择刚添加的模型
5. 点击「保存配置」

### 2. 创建小说

1. 点击工作台或左侧「小说管理」
2. 点击「新建小说」
3. 输入小说标题
4. 选择小说类型（玄幻/仙侠/都市/科幻/恐怖/言情/游戏/其他）
5. 点击「创建」

### 3. AI 写作

1. 进入小说后，点击「+」新建章节
2. 在章节编辑页面设置：
   - 目标字数（默认 3000）
   - 写作风格（正常/紧凑/华丽）
3. 点击「开始 AI 续写」
4. 等待写作完成，内容自动保存

### 4. 局部干预（重写半章）

当您对某个章节的特定部分不满意时：

1. 在编辑器中**选中**需要重写的文字
2. 在右侧面板的「局部干预」区域查看选中的内容
3. 选择或输入**修改指令**
4. 点击「重写选中内容」
5. 等待 AI 重写完成

### 5. 级联更新真相文件

修改章节内容后，需要更新真相文件以保持一致性：

1. 修改章节内容后
2. 在右侧面板的「真相文件」区域查看当前状态
3. 点击「级联更新真相文件」
4. 系统自动分析并更新：
   - 当前状态（章节、位置）
   - 伏笔追踪（新增/更新的伏笔）
   - 章节摘要
   - 粒子账本
   - 支线板
   - 情感弧线
   - 角色矩阵

### 6. 多模型路由

为不同 Agent 分配不同模型：

1. 在「设置」页面找到「多模型路由」
2. 为 Writer（写作）、Auditor（审计）、Architect（规划）Agent 选择模型
3. 点击「保存路由配置」

### 7. 快照与回滚

保存和恢复历史版本：

1. 在章节编辑页面，点击右上角「快照」按钮
2. 输入快照描述
3. 点击「保存快照」
4. 如需回滚，在快照列表中选择要恢复的版本

### 8. 导入导出

- **导入**：在小说管理页面，点击「导入」按钮，选择 txt/md/epub 文件
- **导出**：在小说管理页面，点击小说卡片上的「导出」按钮，选择格式

## 项目结构

```
InkFlow/
├── web/
│   ├── src/
│   │   ├── server.js          # Express 后端服务器
│   │   ├── inkos-engine.js    # InkOS 写作引擎（10 Agent）
│   │   ├── truth-files.js     # 7 个真相文件管理
│   │   ├── import-export.js   # 导入导出功能
│   │   ├── style-detector.js  # 文风分析与 AIGC 检测
│   │   └── modules.js         # 模块导出
│   ├── templates/
│   │   ├── index.html         # 主页面模板
│   │   └── components/        # HTML 组件
│   ├── static/
│   │   ├── css/              # 样式文件
│   │   └── js/               # 前端脚本
│   ├── scripts/
│   │   └── build-templates.py # Jinja2 模板构建
│   └── data/                 # 数据存储（自动创建）
│       ├── novels.json       # 小说数据
│       └── settings.json     # 设置
├── DESKTOP_BUILD.md         # 桌面应用构建指南
└── README.md
```

## API 接口

### 模型管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/models | 获取所有模型 |
| POST | /api/models | 添加自定义模型 |
| DELETE | /api/models/:id | 删除模型 |

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
| POST | /api/novels/:id/write | AI 续写 |
| POST | /api/novels/:id/rewrite | 局部重写 |
| POST | /api/novels/:id/cascade-update | 级联更新 |

### 真相文件
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/novels/:id/truth-files | 获取所有真相文件 |
| GET | /api/novels/:id/truth-files/:type | 获取指定真相文件 |
| PUT | /api/novels/:id/truth-files/:type | 更新真相文件 |

### 快照
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/novels/:id/snapshots | 获取所有快照 |
| POST | /api/novels/:id/snapshots | 创建快照 |
| POST | /api/novels/:id/snapshots/:sid/restore | 恢复快照 |

### 设置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取设置 |
| POST | /api/settings | 保存设置 |
| GET | /api/status | 获取状态 |

## 数据存储

数据保存在 `web/data/` 目录：
- `novels.json` - 所有小说和章节数据
- `settings.json` - 用户设置（包括自定义模型）

**重要**：请定期备份 `web/data` 目录。

## 7 个真相文件说明

| 文件 | 说明 |
|------|------|
| current_state.json | 当前世界状态（章节、位置、主角状态） |
| hooks.json | 伏笔追踪（未解悬念和待回收的伏笔） |
| chapter_summaries.json | 章节摘要（每个章节的事件和地点） |
| particle_ledger.json | 粒子账本（重要物品和线索） |
| subplot_board.json | 支线板（次要情节追踪） |
| emotional_arcs.json | 情感弧线（角色情感变化） |
| character_matrix.json | 角色矩阵（角色关系和成长弧线） |

## 37 维度审计

InkOS 引擎会从以下维度检查内容一致性：
- OOC（人物性格偏离）
- 时间线一致性
- Lore 冲突检测
- 力量体系平衡
- 伏笔追踪
- 节奏把控
- 对话自然度
- 描写详细度
- 视角一致性
- 等等...

## 常见问题

### Q: 报 "API 请求失败" 错误？
A: 请检查：
1. 模型配置是否正确（平台地址、API Key、模型 ID）
2. 网络连接是否正常
3. API Key 是否有效

### Q: 没有 API Key 能使用吗？
A: 可以，系统会使用内置的备用生成模式生成内容，但质量较低。

### Q: 如何导出小说？
A: 在小说管理页面，点击小说卡片上的「导出」按钮，选择 txt/md/epub 格式。

### Q: 数据存储在哪里？
A: 保存在 `web/data/novels.json`，请定期备份。

## 致谢

- [InkOS](https://github.com/Narcooo/inkos) - 多 Agent 小说写作引擎架构参考
- [AIWriteX](https://github.com/iniwap/AIWriteX) - Web 界面设计参考

## License

MIT
