# InkFlow - 智能小说创作平台

InkFlow 是一个基于 InkOS 核心的智能小说创作平台，提供 Web 界面和完整的 AI 辅助写作功能。

## 核心特性

### InkOS 核心
- **多 Agent 协作写作**：10+ Agent 协作完成从创意到审稿的全流程
  - Radar（趋势分析）→ Planner（规划）→ Composer（编排）→ Architect（架构）
  - Writer（写作）→ Observer（观察）→ Reflector（反思）→ Normalizer（归一化）
  - Auditor（审计）→ Reviser（修订）
- **长期记忆系统**：7 个真相文件维护世界状态、角色、伏笔等
- **33 维度审计**：连续性检查、伏笔回收、文风一致性等
- **字数治理**：智能字数控制，防止章节过长或过短
- **去 AI 味**：动态风格润色，让文字更自然

### Web 界面（参考 AIWriteX）
- **工作台**：统计概览、快速操作、最近创作
- **小说管理**：创建、编辑、删除小说作品
- **章节编辑**：富文本编辑、AI 续写、大纲视图
- **写作设置**：自定义写作风格、目标字数等
- **实时进度**：AI 写作进度可视化

### AI 写作功能
- 调用 InkOS 核心引擎进行多 Agent 协作写作
- 支持续写、多种写作风格
- 写作进度实时反馈

### 支持类型
- 玄幻 (xuanhuan)
- 仙侠 (xianxia)
- 都市 (urban)
- 科幻 (sci-fi)
- 恐怖 (horror)
- 其他类型...

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 安装

```bash
# 安装依赖
pnpm install

# 安装 InkOS 核心和 CLI
cd packages/core && pnpm install && cd ..
cd packages/cli && pnpm install && cd ..
```

### 启动

```bash
# 启动 Web 服务
pnpm dev
# 或直接
node web/src/server.js
```

访问 http://localhost:8000

## 项目结构

```
InkFlow/
├── packages/
│   ├── core/          # InkOS 核心包 - 多Agent写作引擎
│   │   └── src/
│   │       ├── agents/       # 10+ Agent 实现
│   │       ├── pipeline/     # 管线执行器
│   │       ├── state/        # 状态管理
│   │       └── llm/          # LLM 提供商
│   └── cli/           # 命令行工具
├── web/               # Web 界面
│   ├── src/
│   │   └── server.js  # Express 后端（集成 InkOS）
│   ├── templates/     # HTML 模板
│   └── static/         # CSS/JS 静态资源
├── README.md
└── package.json
```

## 功能说明

### 创建小说
1. 点击「新建小说」
2. 输入标题和选择类型
3. 系统自动创建 InkOS 项目结构

### AI 写作
1. 选择目标字数（1000-10000）
2. 选择写作风格（正常/紧凑/华丽）
3. 点击「开始 AI 续写」
4. 系统调用 InkOS 多 Agent 引擎
5. 实时显示写作进度
6. 完成后自动保存章节

### 核心管线
```
用户请求 → InkOS Core → Radar → Planner → Composer → Architect
                                                        ↓
                                                    Writer
                                                        ↓
                                                   Observer → Reflector
                                                        ↓
                                                   Normalizer
                                                        ↓
                                                    Auditor → Reviser
                                                        ↓
                                                   保存章节
```

## 配置

环境变量（可选）：
```bash
OPENAI_API_KEY=your-api-key
ANTHROPIC_API_KEY=your-api-key
```

## 致谢

- [InkOS](https://github.com/Narcooo/inkos) - 多 Agent 小说写作引擎
- [AIWriteX](https://github.com/iniwap/AIWriteX) - 界面参考

## License

MIT
