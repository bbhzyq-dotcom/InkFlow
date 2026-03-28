import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { InkOSEngine } from './inkos-engine.js';
import { TruthFiles } from './truth-files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../static')));

const DATA_DIR = join(__dirname, '../data');
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

const NOVELS_FILE = join(DATA_DIR, 'novels.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

function loadJSON(file, defaultValue = []) {
    if (existsSync(file)) {
        try {
            return JSON.parse(readFileSync(file, 'utf-8'));
        } catch {
            return defaultValue;
        }
    }
    return defaultValue;
}

function saveJSON(file, data) {
    writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

let inkosEngine = null;

function getInkOSEngine() {
    if (!inkosEngine) {
        const settings = loadJSON(SETTINGS_FILE, {});
        inkosEngine = new InkOSEngine({
            apiKey: settings.apiKey || process.env.OPENAI_API_KEY || '',
            model: settings.aiModel || 'gpt-4o',
            baseURL: settings.baseURL || 'https://api.openai.com/v1'
        });
    }
    return inkosEngine;
}

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, '../templates/index.html'));
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
    const { title, genre = 'xuanhuan', description = '' } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: '标题不能为空' });
    }

    const novels = loadJSON(NOVELS_FILE, []);
    const id = generateId();

    const novel = {
        id,
        title,
        genre,
        description,
        status: 'writing',
        chapterCount: 0,
        wordCount: 0,
        chapters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    novels.push(novel);
    saveJSON(NOVELS_FILE, novels);
    
    res.json(novel);
});

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
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novels[novelIdx].chapters || [];
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

    novels[novelIdx].chapters = chapters;
    novels[novelIdx].wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    novels[novelIdx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json(chapters[chapterIdx]);
});

app.delete('/api/novels/:id/chapters/:chapterId', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = novels[novelIdx].chapters || [];
    const chapterIdx = chapters.findIndex(c => c.id === req.params.chapterId);
    
    if (chapterIdx === -1) {
        return res.status(404).json({ error: '章节不存在' });
    }

    chapters.splice(chapterIdx, 1);
    chapters.forEach((ch, i) => ch.number = i + 1);

    novels[novelIdx].chapters = chapters;
    novels[novelIdx].chapterCount = chapters.length;
    novels[novelIdx].wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    novels[novelIdx].updatedAt = new Date().toISOString();

    saveJSON(NOVELS_FILE, novels);
    res.json({ success: true });
});

app.post('/api/novels/:id/write', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[novelIdx];
    const { targetWords = 3000, style = 'normal', lastContent = '' } = req.body;

    try {
        const chapterNum = (novel.chapters?.length || 0) + 1;
        const chapterTitle = `第 ${chapterNum} 章`;

        const progressLog = [
            '正在初始化 InkOS 写作引擎...',
            `小说类型: ${novel.genre || 'xuanhuan'}`,
            `目标字数: ${targetWords}`,
            `写作风格: ${style}`,
            '正在调用 AI 模型...'
        ];

        const engine = getInkOSEngine();
        const result = await engine.write({
            title: novel.title,
            genre: novel.genre || 'xuanhuan',
            targetWords: parseInt(targetWords),
            style,
            lastContent: lastContent || getLastChapterSummary(novel),
            chapterNum
        });

        if (result.success) {
            progressLog.push('AI 写作完成！');
            progressLog.push(`生成字数: ${result.wordCount}`);
            progressLog.push(`使用模型: ${result.model}`);
        } else {
            progressLog.push('使用备用生成模式');
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

        saveJSON(NOVELS_FILE, novels);

        res.json({
            ...chapter,
            progressLog
        });

    } catch (error) {
        console.error('写作失败:', error);
        res.status(500).json({ error: '写作失败: ' + error.message });
    }
});

function getLastChapterSummary(novel) {
    if (!novel.chapters || novel.chapters.length === 0) {
        return '';
    }
    const lastChapter = novel.chapters[novel.chapters.length - 1];
    return lastChapter.content ? lastChapter.content.slice(-500) : '';
}

app.post('/api/novels/:id/partial-rewrite', async (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[novelIdx];
    const { chapterId, startPos, endPos, instruction } = req.body;

    const chapter = novel.chapters.find(c => c.id === chapterId);
    if (!chapter) {
        return res.status(404).json({ error: '章节不存在' });
    }

    const beforePart = chapter.content.substring(0, startPos);
    const afterPart = chapter.content.substring(endPos);
    const selectedText = chapter.content.substring(startPos, endPos);

    const progressLog = [
        '开始局部干预...',
        `选中内容长度: ${selectedText.length} 字`,
        `指令: ${instruction || '重写此部分'}`
    ];

    try {
        const engine = getInkOSEngine();
        const settings = loadJSON(SETTINGS_FILE, {});

        const systemPrompt = `你是 InkOS 局部干预引擎。你需要根据用户的指示，重写选中的一部分内容。
要求：
1. 保持与上下文的一致性
2. 遵循用户的写作意图
3. 不改变为选中部分之前的内容
4. 保持与后续内容的衔接

请直接输出重写后的内容，不需要解释。`;

        const userPrompt = `前文（保持不变）：
${beforePart}

选中需要重写的内容：
${selectedText}

用户的修改指示：
${instruction || '重写这部分，使其更流畅、更吸引人'}

请重写选中部分（只输出重写后的内容，不要包含前后文）：`;

        let newContent;
        if (settings.apiKey || process.env.OPENAI_API_KEY) {
            progressLog.push('正在调用 AI 重写...');
            const result = await engine.partialRewrite({
                beforeContext: beforePart,
                selectedText: selectedText,
                afterContext: afterPart,
                instruction: instruction,
                novelTitle: novel.title,
                genre: novel.genre
            });
            newContent = result.content;
            progressLog.push('AI 重写完成');
        } else {
            progressLog.push('使用基础重写模式');
            newContent = `[重写内容] ${instruction || '此处已被修改'} `;
        }

        const updatedContent = beforePart + newContent + afterPart;

        chapter.content = updatedContent;
        chapter.wordCount = updatedContent.length;
        chapter.updatedAt = new Date().toISOString();
        chapter.lastPartialEdit = {
            editedAt: new Date().toISOString(),
            editedRange: { start: startPos, end: endPos },
            instruction: instruction
        };

        novels[novelIdx].wordCount = novel.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
        saveJSON(NOVELS_FILE, novels);

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
    const novelIdx = novels.findIndex(n => n.id === req.params.id);
    
    if (novelIdx === -1) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const novel = novels[novelIdx];
    const { fromChapter, analysisData } = req.body;

    const truthFiles = new TruthFiles(novel.id, novel.projectPath);
    const existingTruth = truthFiles.loadTruthFiles();

    const updates = await truthFiles.cascadeUpdate({
        chapterNum: fromChapter,
        analysis: analysisData || {
            characters: [],
            locations: [],
            events: [],
            hooks: [],
            resources: [],
            emotional: 'neutral'
        },
        existingTruth: existingTruth,
        cascadeFromChapter: fromChapter
    });

    await truthFiles.applyUpdates(updates);

    res.json({
        success: true,
        updatedFromChapter: fromChapter,
        updates: {
            currentState: updates.currentState,
            newHooks: updates.hooks.hooks.filter(h => h.originChapter >= fromChapter).length,
            updatedSummaries: updates.chapterSummaries.summaries.filter(s => s.chapter >= fromChapter).length
        }
    });
});

app.get('/api/novels/:id/truth-files', (req, res) => {
    const novels = loadJSON(NOVELS_FILE, []);
    const novel = novels.find(n => n.id === req.params.id);
    
    if (!novel) {
        return res.status(404).json({ error: '小说不存在' });
    }

    const truthFiles = new TruthFiles(novel.id, novel.projectPath);
    const summary = truthFiles.getTruthFilesSummary();
    const fullTruth = truthFiles.loadTruthFiles();

    res.json({
        summary,
        files: fullTruth
    });
});

app.get('/api/settings', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {
        aiProvider: 'openai',
        apiKey: '',
        aiModel: 'gpt-4o',
        baseURL: 'https://api.openai.com/v1',
        defaultGenre: 'xuanhuan',
        theme: 'light'
    });
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    saveJSON(SETTINGS_FILE, req.body);
    inkosEngine = null;
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {});
    res.json({
        status: 'running',
        version: '1.0.0',
        aiConfigured: !!(settings.apiKey || process.env.OPENAI_API_KEY),
        model: settings.aiModel || 'gpt-4o'
    });
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   InkFlow 智能小说创作平台                           ║
║   http://localhost:${PORT}                              ║
║                                                      ║
║   启动成功！                                         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
    console.log(`数据目录: ${DATA_DIR}`);
});
