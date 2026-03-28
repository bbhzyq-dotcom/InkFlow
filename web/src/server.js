import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { createInterface } from 'readline';

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
const PROJECTS_DIR = join(DATA_DIR, 'projects');

if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
}

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

function createProjectStructure(novelId, title, genre) {
    const projectPath = join(PROJECTS_DIR, novelId);
    mkdirSync(projectPath, { recursive: true });
    mkdirSync(join(projectPath, 'chapters'), { recursive: true });
    mkdirSync(join(projectPath, 'story'), { recursive: true });

    const inkosConfig = {
        title,
        genre,
        author: 'InkFlow User',
        createdAt: new Date().toISOString()
    };

    writeFileSync(join(projectPath, 'inkos.json'), JSON.stringify(inkosConfig, null, 2), 'utf-8');
    writeFileSync(join(projectPath, 'story', 'author_intent.md'), `# ${title}\n\n作者意图...`, 'utf-8');
    writeFileSync(join(projectPath, 'story', 'current_focus.md'), '当前创作焦点...', 'utf-8');
    writeFileSync(join(projectPath, 'story_bible.md'), `# 世界观设定\n\n${title}的世界观...`, 'utf-8');
    writeFileSync(join(projectPath, 'book_rules.md'), '# 书籍规则\n\n主角设定...', 'utf-8');

    return projectPath;
}

async function execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            cwd: options.cwd || process.cwd(),
            shell: true,
            env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
            if (options.onProgress) {
                options.onProgress(data.toString());
            }
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `Command failed with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
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
    
    const projectPath = createProjectStructure(id, title, genre);

    const novel = {
        id,
        title,
        genre,
        description,
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
        const projectPath = novel.projectPath;
        const chapterNum = (novel.chapters?.length || 0) + 1;
        const chapterTitle = `第 ${chapterNum} 章`;

        let generatedContent = '';
        let progressLog = [];

        const cliPath = join(__dirname, '../../packages/cli/src/index.js');
        
        if (existsSync(cliPath)) {
            progressLog.push('正在调用 InkOS 核心写作引擎...');
            progressLog.push(`项目路径: ${projectPath}`);
            progressLog.push(`章节目标字数: ${targetWords}`);
            progressLog.push(`写作风格: ${style}`);

            try {
                const result = await execCommand('node', [
                    cliPath,
                    'write', 'next',
                    novel.title,
                    '--words', targetWords.toString(),
                    '--no-interactive'
                ], {
                    cwd: projectPath,
                    onProgress: (data) => {
                        progressLog.push(data.trim());
                    }
                });
                generatedContent = result;
                progressLog.push('InkOS 核心写作完成');
            } catch (inkosError) {
                progressLog.push(`InkOS 执行: ${inkosError.message}`);
                generatedContent = generateFallbackContent(novel, chapterTitle, lastContent, targetWords, style);
            }
        } else {
            progressLog.push('InkOS CLI 未安装，使用模拟生成');
            generatedContent = generateFallbackContent(novel, chapterTitle, lastContent, targetWords, style);
        }

        const chapter = {
            id: generateId(),
            title: chapterTitle,
            content: generatedContent,
            wordCount: generatedContent.length,
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
        res.status(500).json({ error: '写作失败: ' + error.message });
    }
});

function generateFallbackContent(novel, chapterTitle, lastContent, targetWords, style) {
    const genrePrompts = {
        xuanhuan: '修仙世界，主角觉醒特殊体质',
        xianxia: '仙侠江湖，剑气纵横',
        urban: '现代都市，豪门恩怨',
        'sci-fi': '星际科幻，探索宇宙奥秘',
        horror: '恐怖悬疑，惊悚连连',
        other: '精彩故事'
    };

    const genre = novel.genre || 'xuanhuan';
    const genrePrompt = genrePrompts[genre] || genrePrompts.other;

    return `${chapterTitle}

${lastContent ? `（续上文）\n\n` : ''}夜色笼罩着大地，万籁俱寂。

在这个广袤无垠的世界里，${genrePrompt}，无数英豪辈出，传颂千古。

主角站在山巅，俯瞰着脚下的万里河山，心中豪情万丈。回想起一路走来的艰辛与坎坷，从默默无闻的草根，一步步成长为震慑一方的强者。

"这一路走来，虽然艰辛，但我从未后悔。"主角喃喃自语，目光坚定地望着远方。

风起云涌，天地变色。一场惊天的变革即将来临，而这个世界的命运，也将因他的选择而改变。

${genrePrompt.includes('修仙') ? '只见他盘膝而坐，运转体内灵力，周身光芒大盛。' : ''}
${genrePrompt.includes('都市') ? '繁华的都市霓虹闪烁，车水马龙的街道上，每一个人都在为自己的梦想奔波。' : ''}

新的篇章，就此展开...

——本章节由 InkFlow AI 辅助生成
——目标字数: ${targetWords} | 风格: ${style} | 类型: ${genre}`;
}

app.get('/api/settings', (req, res) => {
    const settings = loadJSON(SETTINGS_FILE, {
        aiProvider: 'openai',
        apiKey: '',
        aiModel: 'gpt-4o',
        defaultGenre: 'xuanhuan',
        theme: 'light'
    });
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    saveJSON(SETTINGS_FILE, req.body);
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        inkosCore: existsSync(join(__dirname, '../../packages/cli/src/index.js')) ? 'installed' : 'not-installed',
        version: '1.0.0'
    });
});

app.listen(PORT, () => {
    console.log(`InkFlow 服务已启动: http://localhost:${PORT}`);
    console.log(`数据目录: ${DATA_DIR}`);
    console.log(`项目目录: ${PROJECTS_DIR}`);
});
