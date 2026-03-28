import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TruthFiles {
    constructor(novelId, projectPath = null) {
        this.novelId = novelId;
        this.projectPath = projectPath || join(process.cwd(), 'web', 'data', 'projects', novelId);
        this.stateDir = join(this.projectPath, 'story', 'state');
    }

    async ensureStateDir() {
        if (!existsSync(this.stateDir)) {
            mkdirSync(this.stateDir, { recursive: true });
        }
    }

    loadTruthFiles() {
        return {
            currentState: this.loadCurrentState(),
            hooks: this.loadHooks(),
            chapterSummaries: this.loadChapterSummaries(),
            characterMatrix: this.loadCharacterMatrix(),
            particleLedger: this.loadParticleLedger(),
            subplotBoard: this.loadSubplotBoard(),
            emotionalArcs: this.loadEmotionalArcs()
        };
    }

    loadCurrentState() {
        const path = join(this.stateDir, 'current_state.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return {
            chapter: 0,
            location: '未知',
            protagonist: {
                name: '主角',
                status: '初始',
                currentGoal: '待定',
                constraints: '无'
            },
            enemies: [],
            knownTruths: [],
            currentConflict: '待定',
            anchor: ''
        };
    }

    loadHooks() {
        const path = join(this.stateDir, 'hooks.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { hooks: [] };
    }

    loadChapterSummaries() {
        const path = join(this.stateDir, 'chapter_summaries.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { summaries: [] };
    }

    loadCharacterMatrix() {
        const path = join(this.stateDir, 'character_matrix.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { characters: [] };
    }

    loadParticleLedger() {
        const path = join(this.stateDir, 'particle_ledger.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { hardCap: 10000, currentTotal: 0, entries: [] };
    }

    loadSubplotBoard() {
        const path = join(this.stateDir, 'subplot_board.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { subplots: [] };
    }

    loadEmotionalArcs() {
        const path = join(this.stateDir, 'emotional_arcs.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { arcs: [] };
    }

    saveCurrentState(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'current_state.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveHooks(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'hooks.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveChapterSummaries(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'chapter_summaries.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveCharacterMatrix(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'character_matrix.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveParticleLedger(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'particle_ledger.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveSubplotBoard(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'subplot_board.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    saveEmotionalArcs(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'emotional_arcs.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    async analyzePartialRewrite(params) {
        const { chapterContent, startPos, endPos, chapterNum, newContent } = params;
        
        const beforePart = chapterContent.substring(0, startPos);
        const afterPart = chapterContent.substring(endPos);
        
        const analysis = await this.analyzeContent(newContent);
        
        return {
            beforePart,
            afterPart,
            analysis,
            chapterNum
        };
    }

    async analyzeContent(content) {
        const analysis = {
            characters: [],
            locations: [],
            events: [],
            hooks: [],
            resources: [],
            emotional: 'neutral'
        };

        const patterns = {
            characterName: /[【《]?([^\s【】《》，。！？：；""''（）\[\]【】]+)[】》]?(?:说道|问道|答道|说|问|答|道|认为|觉得|想|知道|明白)/g,
            location: /(?:在|来到|前往|走进|冲出|逃离)([^\s，。！？：；""''（）]+)(?:之地|之处|之中|之上|之下|之内|之外|之境|山脉|森林|城池|村庄|山洞|宫殿|大殿|广场|街道|房间|室内|室外)/g,
            newEvent: /(?:突然|忽然|霎时|顿时|顷刻|转眼)(.+?)(?:发生|出现|降临|爆发|来临)/g,
            hook: /(?:原来|竟然|殊不知|出乎意料|谁知|只见|但见|只见得)/g,
            resource: /(?:获得|得到|失去|消耗|拥有|持有|掌握)(?:了)?([^\s，。！？：；""''（）]+)(?:之力|之术|之法|之能|秘籍|功法|法宝|灵药|仙丹|神兵)/g
        };

        let match;
        while ((match = patterns.characterName.exec(content)) !== null) {
            const name = match[1].trim();
            if (name.length > 1 && name.length < 10) {
                analysis.characters.push({ name, mentioned: true });
            }
        }

        while ((match = patterns.location.exec(content)) !== null) {
            const loc = match[1].trim();
            if (loc.length > 1) {
                analysis.locations.push({ name: loc, type: 'scene' });
            }
        }

        while ((match = patterns.newEvent.exec(content)) !== null) {
            const event = match[1].trim();
            if (event.length > 5) {
                analysis.events.push({ description: event, impact: 'high' });
            }
        }

        if (patterns.hook.test(content)) {
            analysis.hooks.push({ type: 'foreshadow', description: '发现伏笔' });
        }

        while ((match = patterns.resource.exec(content)) !== null) {
            const resource = match[1].trim();
            if (resource.length > 1) {
                analysis.resources.push({ name: resource, change: 'acquired' });
            }
        }

        if (content.includes('愤怒') || content.includes('悲伤') || content.includes('恐惧')) {
            analysis.emotional = 'negative';
        } else if (content.includes('喜悦') || content.includes('兴奋') || content.includes('欣慰')) {
            analysis.emotional = 'positive';
        }

        return analysis;
    }

    async cascadeUpdate(params) {
        const { chapterNum, analysis, existingTruth, cascadeFromChapter } = params;
        
        const updates = {
            currentState: { ...existingTruth.currentState },
            hooks: { hooks: [...existingTruth.hooks.hooks] },
            chapterSummaries: { summaries: [...existingTruth.chapterSummaries.summaries] },
            characterMatrix: { characters: [...existingTruth.characterMatrix.characters] },
            particleLedger: { ...existingTruth.particleLedger },
            subplotBoard: { subplots: [...existingTruth.subplotBoard.subplots] },
            emotionalArcs: { arcs: [...existingTruth.emotionalArcs.arcs] }
        };

        updates.currentState.chapter = chapterNum;
        updates.currentState.protagonist.currentGoal = analysis.events.length > 0 
            ? analysis.events[0].description 
            : updates.currentState.protagonist.currentGoal;

        if (analysis.locations.length > 0) {
            updates.currentState.location = analysis.locations[0].name;
        }

        if (analysis.hooks.length > 0) {
            analysis.hooks.forEach(hook => {
                const existingHook = updates.hooks.hooks.find(h => 
                    h.originChapter === chapterNum && h.description === hook.description
                );
                if (!existingHook) {
                    updates.hooks.hooks.push({
                        id: `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        originChapter: chapterNum,
                        type: hook.type,
                        status: 'open',
                        description: hook.description,
                        expectedResolution: '待定'
                    });
                }
            });
        }

        const existingSummary = updates.chapterSummaries.summaries.find(s => s.chapter === chapterNum);
        if (existingSummary) {
            existingSummary.events = analysis.events.map(e => e.description);
            existingSummary.locations = analysis.locations.map(l => l.name);
        } else {
            updates.chapterSummaries.summaries.push({
                chapter: chapterNum,
                title: `第 ${chapterNum} 章`,
                events: analysis.events.map(e => e.description),
                locations: analysis.locations.map(l => l.name),
                wordCount: 0
            });
        }

        for (let i = cascadeFromChapter; i < chapterNum; i++) {
            const summary = updates.chapterSummaries.summaries.find(s => s.chapter === i);
            if (summary) {
                summary.status = 'affected';
            }
        }

        return updates;
    }

    async applyUpdates(updates) {
        this.saveCurrentState(updates.currentState);
        this.saveHooks(updates.hooks);
        this.saveChapterSummaries(updates.chapterSummaries);
        this.saveCharacterMatrix(updates.characterMatrix);
        this.saveParticleLedger(updates.particleLedger);
        this.saveSubplotBoard(updates.subplotBoard);
        this.saveEmotionalArcs(updates.emotionalArcs);
    }

    getTruthFilesSummary() {
        const truth = this.loadTruthFiles();
        return {
            currentChapter: truth.currentState.chapter,
            location: truth.currentState.location,
            protagonist: truth.currentState.protagonist,
            activeHooks: truth.hooks.hooks.filter(h => h.status === 'open').length,
            totalHooks: truth.hooks.hooks.length,
            chaptersTracked: truth.chapterSummaries.summaries.length,
            characters: truth.characterMatrix.characters.length,
            subplots: truth.subplotBoard.subplots.length
        };
    }
}

export default TruthFiles;
