import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { InkOSEngine } from './inkos-engine.js';
import { TruthFiles } from './truth-files.js';
import { ImportExport, StyleAnalyzer, AIGCDetector, DaemonMode, NotificationDispatcher } from './modules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/static', express.static(join(__dirname, '../static')));

const DATA_DIR = join(__dirname, '../data');
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

const NOVELS_FILE = join(DATA_DIR, 'novels.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const PROJECTS_DIR = join(DATA_DIR, 'projects');
const DAEMON_STATE_FILE = join(DATA_DIR, 'daemon.json');

if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
}

function loadJSON(file, defaultValue = []) {
    if (existsSync(file)) {
        try {
            return JSON.parse(readFileSync(file, 'utf-8'));
        } catch { }
    }
    return defaultValue;
}

function saveJSON(file, data) {
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function readFileSafe(file, defaultValue = '') {
    if (existsSync(file)) {
        try {
            return readFileSync(file, 'utf-8');
        } catch { }
    }
    return defaultValue;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

let inkosEngine = null;

function getInkOSEngine() {
    if (!inkosEngine) {
        const settings = loadJSON(SETTINGS_FILE, {});
        const customModels = settings.customModels || [];
        const modelRegistry = {};
        
        customModels.forEach(m => {
            modelRegistry[m.id] = {
                apiKey: m.apiKey,
                baseURL: m.baseURL,
                model: m.id
            };
        });
        
        const selectedConfig = settings.selectedModelConfig || null;
        const routingConfigs = settings.modelRoutingConfigs || {};
        
        const defaultConfig = {
            apiKey: selectedConfig?.apiKey || '',
            model: selectedConfig?.id || settings.aiModel || '',
            baseURL: selectedConfig?.baseURL || ''
        };
        
        const modelRouting = {};
        ['writer', 'auditor', 'architect', 'radar', 'planner', 'composer', 'observer', 'reflector', 'normalizer', 'reviser'].forEach(agent => {
            const routingModelId = settings.modelRouting?.[agent];
            if (routingModelId && modelRegistry[routingModelId]) {
                modelRouting[agent] = modelRegistry[routingModelId];
            } else if (routingConfigs[agent]) {
                modelRouting[agent] = routingConfigs[agent];
            }
        });
        
        inkosEngine = new InkOSEngine({
            apiKey: defaultConfig.apiKey,
            model: defaultConfig.model,
            baseURL: defaultConfig.baseURL,
            modelRouting: modelRouting,
            modelRegistry: modelRegistry
        });
    }
    return inkosEngine;
}

function recreateInkOSEngine() {
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    const modelRegistry = {};
    
    customModels.forEach(m => {
        modelRegistry[m.id] = {
            apiKey: m.apiKey,
            baseURL: m.baseURL,
            model: m.id
        };
    });
    
    const selectedConfig = settings.selectedModelConfig || null;
    const routingConfigs = settings.modelRoutingConfigs || {};
    
    const defaultConfig = {
        apiKey: selectedConfig?.apiKey || '',
        model: selectedConfig?.id || settings.aiModel || '',
        baseURL: selectedConfig?.baseURL || ''
    };
    
    const modelRouting = {};
    ['writer', 'auditor', 'architect', 'radar', 'planner', 'composer', 'observer', 'reflector', 'normalizer', 'reviser'].forEach(agent => {
        const routingModelId = settings.modelRouting?.[agent];
        if (routingModelId && modelRegistry[routingModelId]) {
            modelRouting[agent] = modelRegistry[routingModelId];
        } else if (routingConfigs[agent]) {
            modelRouting[agent] = routingConfigs[agent];
        }
    });
    
    inkosEngine = new InkOSEngine({
        apiKey: defaultConfig.apiKey,
        model: defaultConfig.model,
        baseURL: defaultConfig.baseURL,
        modelRouting: modelRouting,
        modelRegistry: modelRegistry
    });
    return inkosEngine;
}

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../static/index.html'));
});

app.get('/api/novels', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    res.json(novels);
});

app.get('/api/novels/:id', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }
    res.json(novel);
});

app.post('/api/novels', (req, res) => {
    const { 
        title, 
        genre = 'xuanhuan', 
        description = '',
        worldSetting = '',
        characters = '',
        plot = ''
    } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: '标题不能为空' });
    }

    const novels = loadJSON(NOVELS_FILE, []);
    const id = generateId();
    const projectPath = join(PROJECTS_DIR, id);

    mkdirSync(projectPath, { recursive: true });
    mkdirSync(join(projectPath, 'chapters'), { recursive: true });
    mkdirSync(join(projectPath, 'story', 'state'), { recursive: true });

    const truthFiles = new TruthFiles(id, projectPath);
    truthFiles.saveManifest({ 
        schemaVersion: 2, 
        language: 'zh', 
        lastAppliedChapter: 0, 
        projectionVersion: 1, 
        migrationWarnings: [] 
    });
    
    truthFiles.saveCurrentState({ 
        chapter: 0, 
        facts: [],
        worldSetting: worldSetting,
        plotOutline: plot
    });
    
    truthFiles.saveHooks({ hooks: [] });
    truthFiles.saveChapterSummaries({ 
        rows: [],
        plotOutline: plot
    });
    truthFiles.saveParticleLedger({ entries: [] });
    truthFiles.saveSubplotBoard({ subplots: [] });
    truthFiles.saveEmotionalArcs({ arcs: [] });
    
    const characterList = parseCharacters(characters);
    truthFiles.saveCharacterMatrix({ 
        encounters: [], 
        relationships: [],
        characterList: characterList
    });

    const genreNames = {
        xuanhuan: '玄幻',
        xianxia: '仙侠',
        urban: '都市',
        'sci-fi': '科幻',
        horror: '恐怖',
        romance: '言情',
        litpg: '游戏',
        other: '其他'
    };

    const genreName = genreNames[genre] || '其他';

    const authorIntentContent = `# Author Intent 作者意图

## 书籍信息
- 书名：${title}
- 类型：${genreName}
- 简介：${description || '暂无'}

## 创作目标
${plot || '推进剧情，埋设伏笔，让读者欲罢不能'}

## 长期方向
- 保持主线清晰
- 伏笔要有回收
- 节奏把控得当
`;

    const storyBibleContent = `# Story Bible 世界观设定

## 01_世界观
${worldSetting || '一个充满机遇与挑战的世界'}

## 02_主角
${characterList.length > 0 ? characterList.map(c => `- ${c.name}：${c.description || c.traits || '待填充'}`).join('\n') : '- 主角设定待填充'}

## 03_势力与人物
${characters || '主要人物设定待填充'}

## 04_地理与环境
${worldSetting || '故事发生的世界地理环境待填充'}

## 05_书名与简介
书名：${title}
简介：${description || '暂无'}
`;

    const bookRulesContent = `---
numericalSystem: ${['xuanhuan', 'xianxia', 'litpg'].includes(genre) ? 'true' : 'false'}
powerScaling: ${['xuanhuan', 'xianxia', 'litpg'].includes(genre) ? 'true' : 'false'}
---
# Book Rules 创作规则

## 类型定位
${genreName}题材

## 数值体系
${['xuanhuan', 'xianxia', 'litpg'].includes(genre) ? '有明确的战力/等级体系，需要追踪' : '无数值体系，无资源追踪'}

## 创作禁区
- 战力崩坏
- 节奏拖沓
- 逻辑漏洞
- 人设崩塌

## 写作要求
- 保持类型特色（${genreName}）
- 伏笔要有推进和回收
- 对话要自然，符合人物性格
- 减少AI写作痕迹
`;

    const currentFocusContent = `# Current Focus 当前焦点

## 当前阶段
书籍创建初期，专注于奠定世界观和开篇节奏。

## 本阶段重点
1. 介绍世界观和主要人物
2. 建立故事的基本设定
3. 埋下前期伏笔
4. 吸引读者继续阅读

## 待完成
- 完善世界观细节
- 深化角色性格
- 规划主线剧情
`;

    writeFileSync(join(projectPath, 'inkos.json'), JSON.stringify({ 
        title, 
        genre, 
        description, 
        worldSetting,
        characters,
        plot,
        createdAt: new Date().toISOString() 
    }), 'utf-8');

    writeFileSync(join(projectPath, 'story', 'author_intent.md'), authorIntentContent, 'utf-8');
    writeFileSync(join(projectPath, 'story', 'story_bible.md'), storyBibleContent, 'utf-8');
    writeFileSync(join(projectPath, 'story', 'book_rules.md'), bookRulesContent, 'utf-8');
    writeFileSync(join(projectPath, 'story', 'current_focus.md'), currentFocusContent, 'utf-8');

    const novel = {
        id,
        title,
        genre,
        description,
        worldSetting,
        characters,
        plot,
        status: 'writing',
        chapterCount: 0,
        wordCount: 0,
        projectPath,
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    novels.push(novel);
    saveJSON(NOVELS_FILE, novels);
    
    res.json(novel);
});

function parseCharacters(text) {
    if (!text) return [];
    const characters = [];
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
        const match = line.match(/^([^（(]+)[（(](.+?)[)）]?[,，]?\s*(.*)$/);
        if (match) {
            characters.push({
                name: match[1].trim(),
                description: match[2].trim(),
                traits: match[3]?.trim() || ''
            });
        } else if (line.trim()) {
            characters.push({
                name: line.trim(),
                description: '',
                traits: ''
            });
        }
    }
    return characters;
}

app.put('/api/novels/:id', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { title, genre, status, description } = req.body;
    
    if (title) novels[idx].title = title;
    if (genre) novels[idx].genre = genre;
    if (status) novels[idx].status = status;
    if (description !== undefined) novels[idx].description = description;
    novels[idx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json(novels[idx]);
});

app.delete('/api/novels/:id', (req, res) => {
    let novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    novels = novels.filter(n => n.id !== req.params.id);
    saveJSON(NOVELS_FILE, novels);
    
    res.json({ success: true });
});

app.get('/api/novels/:id/chapters', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }
    
    res.json(novel.chapters || []);
});

app.post('/api/novels/:id/chapters', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { title = '', content = '' } = req.body;
    const chapters = novels[idx].chapters || [];
    
    const chapter = {
        id: generateId(),
        title: title || `第 ${chapters.length + 1} 章`,
        content,
        wordCount: content.length,
        status: 'draft',
        number: chapters.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    chapters.push(chapter);
    novels[idx].chapters = chapters;
    novels[idx].chapterCount = chapters.length;
    novels[idx].wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    novels[idx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json(chapter);
});

app.get('/api/novels/:id/chapters/:chapterId', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapter = (novel.chapters || []).find(c => c.id === req.params.chapterId);
    if (!chapter) {
        return res.status(404).json({ error: '章节不存在' });
    }

    res.json(chapter);
});

app.put('/api/novels/:id/chapters/:chapterId', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novels[idx].chapters || [];
    const chapterIdx = chapters.findIndex(c => c.id === req.params.chapterId);
    
    if (chapterIdx === -1) {
        return res.status(404).json({ error: '章节不存在' });
    }

    const { title, content, status } = req.body;
    
    if (title !== undefined) chapters[chapterIdx].title = title;
    if (content !== undefined) {
        chapters[chapterIdx].content = content;
        chapters[chapterIdx].wordCount = content.length;
    }
    if (status !== undefined) chapters[chapterIdx].status = status;
    chapters[chapterIdx].updatedAt = new Date().toISOString();

    novels[idx].wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    novels[idx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json(chapters[chapterIdx]);
});

app.delete('/api/novels/:id/chapters/:chapterId', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novels[idx].chapters || [];
    const chapterIdx = chapters.findIndex(c => c.id === req.params.chapterId);
    
    if (chapterIdx === -1) {
        return res.status(404).json({ error: '章节不存在' });
    }

    chapters.splice(chapterIdx, 1);
    chapters.forEach((ch, i) => ch.number = i + 1);

    novels[idx].chapters = chapters;
    novels[idx].chapterCount = chapters.length;
    novels[idx].wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    novels[idx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json({ success: true });
});

app.post('/api/novels/:id/write', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[idx];
    const { targetWords = 3000, style = 'normal', lastContent = '', chapterFocus = '' } = req.body;

    try {
        const chapterNum = (novel.chapters?.length || 0) + 1;
        const chapterTitle = `第 ${chapterNum} 章`;

        const progressLog = ['=== InkOS 多Agent写作管线启动 ==='];
        progressLog.push(`小说: ${novel.title}`);
        progressLog.push(`类型: ${novel.genre}`);
        progressLog.push(`目标字数: ${targetWords}`);
        if (chapterFocus) {
            progressLog.push(`本章重点: ${chapterFocus}`);
        }

        const truthFiles = new TruthFiles(novel.id, novel.projectPath);
        const engine = getInkOSEngine();
        
        if (chapterFocus) {
            const currentFocusContent = readFileSafe(join(novel.projectPath, 'story', 'current_focus.md'), '');
            const newFocus = `# Current Focus 当前焦点\n\n## 章节 ${chapterNum} 创作重点\n\n${chapterFocus}\n\n---\n\n${currentFocusContent}`;
            writeFileSync(join(novel.projectPath, 'story', 'current_focus.md'), newFocus, 'utf-8');
        }
        
        const authorIntent = readFileSafe(join(novel.projectPath, 'story', 'author_intent.md'), '');
        const storyBible = readFileSafe(join(novel.projectPath, 'story', 'story_bible.md'), '');
        const bookRules = readFileSafe(join(novel.projectPath, 'story', 'book_rules.md'), '');
        
        const result = await engine.write({
            title: novel.title,
            genre: novel.genre || 'xuanhuan',
            targetWords: parseInt(targetWords),
            style,
            lastContent: lastContent || getLastChapterContent(novel),
            chapterNum,
            chapterFocus,
            truthFiles,
            authorIntent,
            storyBible,
            bookRules,
            onProgress: (msg) => progressLog.push(msg)
        });

        if (result.success) {
            progressLog.push(...(result.progress || []));
            progressLog.push(`生成字数: ${result.wordCount}`);
            progressLog.push(`审计评分: ${result.auditResult?.score || 0}/100`);
        } else {
            progressLog.push(...(result.progress || ['生成失败，使用备用模式']));
        }

        const chapter = {
            id: generateId(),
            title: chapterTitle,
            content: result.content,
            wordCount: result.content.length,
            status: 'draft',
            number: chapterNum,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progressLog
        };

        if (!novel.chapters) novel.chapters = [];
        novel.chapters.push(chapter);
        novel.chapterCount = novel.chapters.length;
        novel.wordCount = novel.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        novel.updatedAt = new Date().toISOString();

        if (result.auditResult) {
            chapter.auditResult = result.auditResult;
        }

        saveJSON(NOVELS_FILE, novels);

        if (truthFiles && result.success) {
            try {
                const analysis = await truthFiles.analyzeChapter(chapterNum, result.content, lastContent);
                const updates = await truthFiles.cascadeUpdate(chapterNum, analysis, 1);
                await truthFiles.applyUpdates(updates);
                progressLog.push('真相文件已更新');
            } catch (e) {
                console.error('更新真相文件失败:', e);
            }
        }

        res.json({
            ...chapter,
            progressLog,
            auditResult: result.auditResult
        });

    } catch (error) {
        console.error('写作失败:', error);
        res.status(500).json({ error: '写作失败: ' + error.message });
    }
});

app.post('/api/novels/:id/partial-rewrite', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[idx];
    const { chapterId, startPos, endPos, instruction } = req.body;

    const chapterIdx = (novel.chapters || []).findIndex(c => c.id === chapterId);
    if (chapterIdx === -1) {
        return res.status(404).json({ error: '章节不存在' });
    }

    const chapter = novel.chapters[chapterIdx];
    const beforePart = chapter.content.substring(0, startPos);
    const afterPart = chapter.content.substring(endPos);
    const selectedText = chapter.content.substring(startPos, endPos);

    const progressLog = [
        '=== 局部干预开始 ===',
        `选中内容: ${selectedText.length} 字`,
        `指令: ${instruction || '重写此部分'}`
    ];

    try {
        const engine = getInkOSEngine();
        const settings = loadJSON(SETTINGS_FILE, {});
        const customModels = settings.customModels || [];
        const hasModel = customModels.length > 0 || settings.selectedModelConfig;

        let newContent;
        if (hasModel) {
            progressLog.push('调用 AI 重写...');
            const result = await engine.partialRewrite({
                beforeContext: beforePart,
                selectedText: selectedText,
                afterContext: afterPart,
                instruction: instruction,
                novelTitle: novel.title,
                genre: novel.genre
            });
            newContent = result.content;
        } else {
            progressLog.push('使用基础重写模式');
            newContent = `[重写内容] ${instruction || '已修改'}`;
        }

        const updatedContent = beforePart + newContent + afterPart;

        novel.chapters[chapterIdx].content = updatedContent;
        novel.chapters[chapterIdx].wordCount = updatedContent.length;
        novel.chapters[chapterIdx].updatedAt = new Date().toISOString();
        novel.chapters[chapterIdx].lastPartialEdit = {
            editedAt: new Date().toISOString(),
            editedRange: { start: startPos, end: endPos },
            instruction: instruction
        };

        novel.wordCount = novel.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        saveJSON(NOVELS_FILE, novels);

        const truthFiles = new TruthFiles(novel.id, novel.projectPath);
        try {
            const analysis = await truthFiles.analyzeChapter(novel.chapters[chapterIdx].number, updatedContent, beforePart);
            const updates = await truthFiles.cascadeUpdate(novel.chapters[chapterIdx].number, analysis, 1);
            await truthFiles.applyUpdates(updates);
            progressLog.push('真相文件已级联更新');
        } catch (e) {
            progressLog.push('真相文件更新失败: ' + e.message);
        }

        res.json({
            success: true,
            chapterId,
            content: updatedContent,
            wordCount: updatedContent.length,
            progressLog
        });

    } catch (error) {
        console.error('局部重写失败:', error);
        res.status(500).json({ error: '局部重写失败: ' + error.message });
    }
});

app.post('/api/novels/:id/cascade-update', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[idx];
    const { fromChapter } = req.body;

    try {
        const truthFiles = new TruthFiles(novel.id, novel.projectPath);
        
        const analysisData = {
            characters: [],
            locations: [],
            events: [],
            hooks: [],
            resources: [],
            emotional: 'neutral'
        };

        const updates = await truthFiles.cascadeUpdate(fromChapter, analysisData, 1);
        await truthFiles.applyUpdates(updates);

        res.json({
            success: true,
            updatedFromChapter: fromChapter,
            summary: truthFiles.getTruthFilesSummary()
        });
    } catch (error) {
        res.status(500).json({ error: '级联更新失败: ' + error.message });
    }
});

app.get('/api/novels/:id/truth-files', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const truthFiles = new TruthFiles(novel.id, novel.projectPath);

    res.json({
        summary: truthFiles.getTruthFilesSummary(),
        files: truthFiles.loadTruthFiles()
    });
});

app.get('/api/novels/:id/control-docs', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const storyDir = join(novel.projectPath, 'story');
    
    const docs = {
        authorIntent: readFileSafe(join(storyDir, 'author_intent.md'), ''),
        storyBible: readFileSafe(join(storyDir, 'story_bible.md'), ''),
        bookRules: readFileSafe(join(storyDir, 'book_rules.md'), ''),
        currentFocus: readFileSafe(join(storyDir, 'current_focus.md'), '')
    };

    res.json(docs);
});

app.put('/api/novels/:id/control-docs', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { authorIntent, storyBible, bookRules, currentFocus } = req.body;
    const storyDir = join(novel.projectPath, 'story');

    if (authorIntent !== undefined) {
        writeFileSync(join(storyDir, 'author_intent.md'), authorIntent, 'utf-8');
    }
    if (storyBible !== undefined) {
        writeFileSync(join(storyDir, 'story_bible.md'), storyBible, 'utf-8');
    }
    if (bookRules !== undefined) {
        writeFileSync(join(storyDir, 'book_rules.md'), bookRules, 'utf-8');
    }
    if (currentFocus !== undefined) {
        writeFileSync(join(storyDir, 'current_focus.md'), currentFocus, 'utf-8');
    }

    res.json({ success: true });
});

app.get('/api/novels/:id/snapshots', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const importer = new ImportExport(novel.id, novel.projectPath);
    const snapshots = importer.listSnapshots();

    res.json(snapshots);
});

app.post('/api/novels/:id/snapshots', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { chapterNumber } = req.body;
    const novel = novels[idx];
    const importer = new ImportExport(novel.id, novel.projectPath);
    const result = importer.generateSnapshot(novel.chapters, chapterNumber);

    if (!result) {
        return res.status(404).json({ error: '章节不存在' });
    }

    res.json(result);
});

app.post('/api/novels/:id/rollback', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { snapshotData } = req.body;
    const novel = novels[idx];
    const importer = new ImportExport(novel.id, novel.projectPath);
    
    const result = importer.rollbackToSnapshot(novel.chapters, snapshotData);

    if (result.success) {
        novels[idx].chapters = novel.chapters;
        novels[idx].wordCount = novel.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        saveJSON(NOVELS_FILE, novels);
    }

    res.json(result);
});

app.get('/api/novels/:id/review', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novel.chapters || [];
    const reviewList = chapters.map(ch => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        wordCount: ch.wordCount,
        status: ch.status || 'draft',
        auditScore: ch.auditResult?.score || null,
        issueCount: ch.auditResult?.issues?.length || 0,
        approved: ch.status === 'approved'
    }));

    res.json({
        novel: { id: novel.id, title: novel.title },
        chapters: reviewList,
        stats: {
            total: reviewList.length,
            draft: reviewList.filter(c => c.status === 'draft').length,
            approved: reviewList.filter(c => c.approved).length,
            needsReview: reviewList.filter(c => c.issueCount > 0 && !c.approved).length
        }
    });
});

app.post('/api/novels/:id/approve-all', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novels[idx].chapters || [];
    chapters.forEach(ch => {
        ch.status = 'approved';
    });
    
    saveJSON(NOVELS_FILE, novels);
    res.json({ success: true, approved: chapters.length });
});

app.post('/api/novels/:id/approve/:chapterId', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapterIdx = novels[novelIdx].chapters.findIndex(c => c.id === req.params.chapterId);
    if (chapterIdx === -1) {
        return res.status(404).json({ error: '章节不存在' });
    }

    novels[novelIdx].chapters[chapterIdx].status = 'approved';
    saveJSON(NOVELS_FILE, novels);
    res.json({ success: true });
});

app.post('/api/novels/:id/import', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const idx = novels.findIndex(n => n.id === req.params.id);
    
    if (idx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { content, splitPattern, resumeFrom = 0 } = req.body;

    if (!content) {
        return res.status(400).json({ error: '内容不能为空' });
    }

    try {
        const importer = new ImportExport(req.params.id, novels[idx].projectPath);
        const result = importer.importChapters(content, { splitPattern, resumeFrom });

        novels[idx].chapters = result.chapters;
        novels[idx].chapterCount = result.chapters.length;
        novels[idx].wordCount = result.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        novels[idx].updatedAt = new Date().toISOString();
        saveJSON(NOVELS_FILE, novels);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: '导入失败: ' + error.message });
    }
});

app.get('/api/novels/:id/export', (req, res) => {
    const { format = 'txt' } = req.query;
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    try {
        const importer = new ImportExport(novel.id, novel.projectPath);
        let content;

        switch (format) {
            case 'md':
                content = importer.exportToMd(novel.chapters, novel);
                res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${novel.title}.md`);
                break;
            case 'epub':
                content = importer.exportToEpub(novel.chapters, novel);
                res.setHeader('Content-Type', 'application/epub+zip');
                res.setHeader('Content-Disposition', `attachment; filename="${novel.title}.epub`);
                break;
            default:
                content = importer.exportToTxt(novel.chapters);
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename="${novel.title}.txt`);
        }

        res.send(content);
    } catch (error) {
        res.status(500).json({ error: '导出失败: ' + error.message });
    }
});

app.post('/api/novels/:id/analyze-style', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { chapterId } = req.body;
    const chapter = novel.chapters.find(c => c.id === chapterId);

    if (!chapter) {
        return res.status(404).json({ error: '章节不存在' });
    }

    const analyzer = new StyleAnalyzer();
    const result = analyzer.analyze(chapter.content);

    res.json(result);
});

app.post('/api/novels/:id/detect-aigc', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const { chapterId } = req.body;
    const chapter = novel.chapters.find(c => c.id === chapterId);

    if (!chapter) {
        return res.status(404).json({ error: '章节不存在' });
    }

    const detector = new AIGCDetector();
    const result = detector.detect(chapter.content);

    res.json(result);
});

app.get('/api/models', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    res.json(customModels);
});

app.post('/api/models', (req, res) => {
    const { name, provider, baseURL, apiKey, modelId } = req.body;
    
    if (!name || !provider || !baseURL || !apiKey || !modelId) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    
    const newModel = {
        id: modelId,
        name: name,
        provider: provider,
        baseURL: baseURL,
        apiKey: apiKey,
        isCustom: true
    };
    
    const existingIdx = customModels.findIndex(m => m.id === modelId);
    if (existingIdx >= 0) {
        customModels[existingIdx] = newModel;
    } else {
        customModels.push(newModel);
    }
    
    settings.customModels = customModels;
    saveJSON(SETTINGS_FILE, settings);
    
    res.json(newModel);
});

app.delete('/api/models/:id', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    const modelId = decodeURIComponent(req.params.id);
    
    const filtered = customModels.filter(m => m.id !== modelId);
    
    if (filtered.length === customModels.length) {
        return res.status(404).json({ error: '模型不存在' });
    }
    
    settings.customModels = filtered;
    saveJSON(SETTINGS_FILE, settings);
    
    res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {
        aiModel: '',
        baseURL: '',
        apiKey: '',
        defaultGenre: 'xuanhuan',
        theme: 'light',
        customModels: [],
        modelRouting: {}
    });
    settings.availableModels = settings.customModels || [];
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    const currentSettings = loadJSON(SETTINGS_FILE, {});
    const newSettings = req.body;
    if (currentSettings.customModels) {
        newSettings.customModels = currentSettings.customModels;
    }
    saveJSON(SETTINGS_FILE, newSettings);
    recreateInkOSEngine();
    res.json({ success: true });
});

app.get('/api/model-config/:id', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    const modelId = decodeURIComponent(req.params.id);
    
    const model = customModels.find(m => m.id === modelId);
    if (!model) {
        return res.status(404).json({ error: '模型不存在' });
    }
    
    res.json({
        id: model.id,
        name: model.name,
        provider: model.provider,
        baseURL: model.baseURL,
        apiKey: model.apiKey
    });
});

app.get('/api/status', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {});
    const customModels = settings.customModels || [];
    res.json({
        status: 'running',
        version: '1.0.0',
        aiConfigured: customModels.length > 0 || !!(settings.selectedModelConfig),
        model: settings.aiModel || '',
        features: {
            multiModel: true,
            daemon: true,
            importExport: true,
            styleAnalysis: true,
            aigcDetection: true,
            truthFiles: true
        }
    });
});

app.get('/api/daemon/status', (req, res) => {
    const daemonState = loadJSON(DAEMON_STATE_FILE, { running: false });
    res.json(daemonState);
});

app.post('/api/daemon/start', (req, res) => {
    const { novelId, interval = 300000 } = req.body;
    const daemonState = { running: true, novelId, interval, startedAt: new Date().toISOString() };
    saveJSON(DAEMON_STATE_FILE, daemonState);
    res.json({ success: true, state: daemonState });
});

app.post('/api/daemon/stop', (req, res) => {
    saveJSON(DAEMON_STATE_FILE, { running: false });
    res.json({ success: true });
});

app.get('/api/genres', (req, res) => {
    const genres = [
        { id: 'xuanhuan', name: '玄幻', desc: '东方玄幻、修炼突破' },
        { id: 'xianxia', name: '仙侠', desc: '古风仙侠、剑道修仙' },
        { id: 'urban', name: '都市', desc: '现代都市、商战职场' },
        { id: 'sci-fi', name: '科幻', desc: '星际科幻、赛博朋克' },
        { id: 'horror', name: '恐怖', desc: '惊悚悬疑、灵异志怪' },
        { id: 'romance', name: '言情', desc: '甜蜜恋爱、感情纠葛' },
        { id: 'litpg', name: '游戏', desc: '游戏异界、虚拟现实' },
        { id: 'other', name: '其他', desc: '其他类型' }
    ];
    res.json(genres);
});

function getLastChapterContent(novel) {
    if (!novel.chapters || novel.chapters.length === 0) {
        return '';
    }
    const lastChapter = novel.chapters[novel.chapters.length - 1];
    return lastChapter.content ? lastChapter.content.slice(-500) : '';
}

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   InkFlow 智能小说创作平台                           ║
║   http://localhost:${PORT}                              ║
║                                                      ║
║   核心功能：                                         ║
║   - 多Agent写作管线                                  ║
║   - 7个真相文件维护                                  ║
║   - 37维度连续性审计                                ║
║   - 局部干预 + 级联更新                             ║
║   - 导入/导出 (txt/md/epub)                         ║
║   - 文风分析 + AIGC检测                             ║
║   - 快照回滚                                        ║
║   - 守护进程模式                                     ║
╚══════════════════════════════════════════════════════╝
    `);
    console.log(`数据目录: ${DATA_DIR}`);
});
