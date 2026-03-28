# InkFlow - 智能小说创作平台

 InkFlow 是一个基于 InkOS 核心的智能小说创作平台，提供 Web 界面和 AI 辅助写作功能。

## 核心特性

### InkOS 核心
- **多 Agent 协作写作**：10+ Agent 协作完成从创意到审稿的全流程
- **长期记忆系统**：7 个真相文件维护世界状态、角色、伏笔等
- **33 维度审计**：连续性检查、伏笔回收、文风一致性等
- **字数治理**：智能字数控制，防止章节过长或过短
- **去 AI 味**：动态风格润色，让文字更自然

### Web 界面
- **工作台**：统计概览、快速操作、最近创作
- **小说管理**：创建、编辑、删除小说作品
- **章节编辑**：富文本编辑、AI 续写、大纲视图
- **写作设置**：自定义写作风格、目标字数等

### 支持类型
- 玄幻 (xuanhuan)
- 仙侠 (xianxia)
- 都市 (urban)
- 科幻 (sci-fi)
- 其他类型...

## 快速开始

### 环境要求
- Node.js >= 20.0.0
- Python >= 3.10
- pnpm >= 9.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/InkFlow.git
cd InkFlow

# 安装前端依赖
pnpm install

# 安装后端依赖
cd web && pip install -r requirements.txt
```

### 启动

```bash
# 启动 Web 服务
cd web/src
python app.py
```

访问 http://localhost:8000

## 项目结构

```
InkFlow/
├── packages/
│   ├── core/          # InkOS 核心包
│   └── cli/           # 命令行工具
├── web/               # Web 界面
│   ├── src/           # FastAPI 后端
│   │   └── app.py
│   ├── templates/      # HTML 模板
│   └── static/         # 静态资源
├── README.md
└── package.json
```

## 配置

在 `web/data/settings.json` 中配置：

```json
{
    "aiProvider": "openai",
    "apiKey": "your-api-key",
    "aiModel": "gpt-4o",
    "defaultGenre": "xuanhuan"
}
```

## 致谢

- [InkOS](https://github.com/Narcooo/inkos) - 多 Agent 小说写作引擎
- [AIWriteX](https://github.com/iniwap/AIWriteX) - 界面参考

## License

MIT
