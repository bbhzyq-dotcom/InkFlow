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
            manifest: this.loadManifest(),
            currentState: this.loadCurrentState(),
            hooks: this.loadHooks(),
            chapterSummaries: this.loadChapterSummaries(),
            particleLedger: this.loadParticleLedger(),
            subplotBoard: this.loadSubplotBoard(),
            emotionalArcs: this.loadEmotionalArcs(),
            characterMatrix: this.loadCharacterMatrix()
        };
    }

    loadManifest() {
        const path = join(this.stateDir, 'manifest.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return {
            schemaVersion: 2,
            language: 'zh',
            lastAppliedChapter: 0,
            projectionVersion: 1,
            migrationWarnings: []
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
            facts: []
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
        return { rows: [] };
    }

    loadParticleLedger() {
        const path = join(this.stateDir, 'particle_ledger.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { entries: [] };
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

    loadCharacterMatrix() {
        const path = join(this.stateDir, 'character_matrix.json');
        if (existsSync(path)) {
            try {
                return JSON.parse(readFileSync(path, 'utf-8'));
            } catch { }
        }
        return { encounters: [], relationships: [] };
    }

    saveManifest(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'manifest.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
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

    saveCharacterMatrix(data) {
        this.ensureStateDir();
        const path = join(this.stateDir, 'character_matrix.json');
        writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    }

    getTruthFilesSummary() {
        const truth = this.loadTruthFiles();
        return {
            currentChapter: truth.currentState.chapter,
            manifest: truth.manifest,
            activeHooks: truth.hooks.hooks.filter(h => h.status === 'open').length,
            totalHooks: truth.hooks.hooks.length,
            chaptersTracked: truth.chapterSummaries.rows.length,
            characters: [...new Set(truth.currentState.facts.map(f => f.subject))].length,
            subplots: truth.subplotBoard.subplots.length,
            emotionalArcs: truth.emotionalArcs.arcs.length,
            particleEntries: truth.particleLedger.entries.length
        };
    }

    async analyzeChapter(chapterNum, content, previousChapterContent = '') {
        const facts = this.extractFacts(content, chapterNum);
        const hooks = this.extractHooks(content, chapterNum);
        const characters = this.extractCharacters(content, chapterNum);
        const locations = this.extractLocations(content, chapterNum);
        const emotions = this.extractEmotions(content, chapterNum);
        const resources = this.extractResources(content, chapterNum);
        const timeline = this.extractTimeline(content, chapterNum);

        const relationships = this.extractRelationships(content, chapterNum);
        const subplotActivity = this.detectSubplotActivity(content, chapterNum);
        const stateChanges = this.detectStateChanges(content, previousChapterContent, chapterNum);

        return {
            facts,
            hooks,
            characters,
            locations,
            emotions,
            resources,
            timeline,
            relationships,
            subplotActivity,
            stateChanges,
            chapterType: this.classifyChapterType(content, hooks)
        };
    }

    extractFacts(content, chapterNum) {
        const facts = [];
        const patterns = [
            /([【《]?[^\s【】《》，。！？：；""''（）]+[】》]?)是(?:一个?|了)([^\s，。！？：；""''（）]{2,10})/,
            /([【《]?[^\s【】《》，。！？：；""''（）]+[】》]?)在([^\s，。！？：；""''（）]{2,15})/,
            /([【《]?[^\s【】《》，。！？：；""''（）]+[】》]?)拥有([^\s，。！？：；""''（）]{2,10})/,
            /([【《]?[^\s【】《》，。！？：；""''（）]+[】》]?)获得(?:了)?([^\s，。！？：；""''（）]{2,10})/,
        ];

        for (const pattern of patterns) {
            let match;
            const regex = new RegExp(pattern.source, 'g');
            while ((match = regex.exec(content)) !== null) {
                if (match[1] && match[1].length > 1 && match[1].length < 15) {
                    facts.push({
                        subject: match[1].trim(),
                        predicate: this.inferPredicate(pattern.source),
                        object: match[2] ? match[2].trim() : '',
                        validFromChapter: chapterNum,
                        validUntilChapter: null,
                        sourceChapter: chapterNum
                    });
                }
            }
        }

        return facts;
    }

    inferPredicate(patternSource) {
        if (patternSource.includes('是')) return 'is_a';
        if (patternSource.includes('在')) return 'located_at';
        if (patternSource.includes('拥有')) return 'owns';
        if (patternSource.includes('获得')) return 'acquired';
        return 'related_to';
    }

    extractHooks(content, chapterNum) {
        const hooks = [];
        const hookPatterns = [
            /(?:原来|竟然|殊不知|出乎意料|谁知)([^\n]{10,50})/,
            /(?:但是|然而|可是)([^\n]{10,50})/,
            /(?:就在这时|就在此时|忽然)([^\n]{10,50})/,
            /伏笔[：:]([^\n]{5,30})/,
            /悬念[：:]([^\n]{5,30})/,
            /疑问[：:]([^\n]{5,30})/,
            /(?:这个秘密|这个真相|这个疑问)([^\n]{5,30})/,
        ];

        for (const pattern of hookPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
                hooks.push({
                    hookId: `hook_${chapterNum}_${hooks.length}_${Date.now().toString(36)}`,
                    startChapter: chapterNum,
                    type: this.classifyHookType(match[1]),
                    status: 'open',
                    lastAdvancedChapter: chapterNum,
                    expectedPayoff: `第${chapterNum + 3}章左右`,
                    notes: match[1].trim()
                });
            }
        }

        return hooks;
    }

    classifyHookType(text) {
        if (text.includes('秘密') || text.includes('真相')) return 'mystery';
        if (text.includes('实力') || text.includes('突破')) return 'power_breakthrough';
        if (text.includes('身份')) return 'identity';
        if (text.includes('宝物') || text.includes('秘籍')) return 'treasure';
        return 'general';
    }

    extractCharacters(content, chapterNum) {
        const characters = [];
        const patterns = [
            /([【《]?[^\s【】《》，。！？：；""''（）]{2,8})(?:说道|问道|答道|说|道|自语|想|认为|觉得)/g,
            /([【《]?[^\s【】《》，。！？：；""''（）]{2,8})(?:的|是|在|和|与)(?:一个?|某种)/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1]?.trim();
                if (name && name.length > 1 && name.length < 10 && !this.isStopWord(name)) {
                    const existing = characters.find(c => c.name === name);
                    if (existing) {
                        existing.mentions = (existing.mentions || 1) + 1;
                    } else {
                        characters.push({ name, mentions: 1, firstAppearance: chapterNum });
                    }
                }
            }
        }

        return characters.slice(0, 15);
    }

    isStopWord(word) {
        const stopWords = ['一个', '某种', '这个', '那个', '怎么', '什么', '为什么', '如何', '哪里', '何时', '何人'];
        return stopWords.includes(word);
    }

    extractLocations(content, chapterNum) {
        const locations = [];
        const patterns = [
            /(?:在|来到|前往|走进|冲出|逃离)([^\s，。！？：；""''（）]{2,12})(?:之地|之处|之中|之上|之下|之内|之外|之境|山脉|森林|城池|村庄|小镇|山洞|宫殿|大殿|广场|街道|房间)/g,
            /(?:在|来到|前往)([^\s，。！？：；""''（）]{2,8})(?:修炼|闭关|疗伤|休息|等待)/g,
            /(?:来到|抵达|到了)([^\s，。！？：；""''（）]{2,8})/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const loc = match[1]?.trim();
                if (loc && loc.length > 1 && loc.length < 15) {
                    const existing = locations.find(l => l.name === loc);
                    if (existing) {
                        existing.mentions++;
                    } else {
                        locations.push({ name: loc, mentions: 1, firstAppearance: chapterNum });
                    }
                }
            }
        }

        return locations.slice(0, 10);
    }

    extractEmotions(content, chapterNum) {
        const emotions = [];
        const emotionMap = {
            '喜悦': 'joy', '兴奋': 'excitement', '欣慰': 'relief', '高兴': 'happiness',
            '开心': 'happiness', '激动': 'excitement', '期待': 'anticipation',
            '愤怒': 'anger', '悲伤': 'sadness', '恐惧': 'fear', '绝望': 'despair',
            '痛苦': 'pain', '焦虑': 'anxiety', '忧虑': 'worry',
            '平静': 'calm', '淡然': 'indifference', '冷静': 'composure', '沉思': 'contemplation'
        };

        for (const [word, emotion] of Object.entries(emotionMap)) {
            const count = (content.match(new RegExp(word, 'g')) || []).length;
            if (count > 0) {
                emotions.push({ character: 'protagonist', emotion, intensity: Math.min(count, 5), chapter: chapterNum });
            }
        }

        return emotions;
    }

    extractResources(content, chapterNum) {
        const resources = [];
        const patterns = [
            /(?:获得|得到|习得|领悟)(?:了)?([^\s，。！？：；""''（）]{2,10})(?:之力|之术|之法|之能|功法|秘籍|灵药|仙丹|神兵|法宝)/g,
            /(?:消耗|失去|用尽)(?:了)?([^\s，。！？：；""''（）]{2,10})/g,
        ];

        const changeTypes = ['acquired', 'consumed'];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const resource = match[1]?.trim();
                if (resource && resource.length > 1) {
                    resources.push({
                        name: resource,
                        change: changeTypes[i],
                        chapter: chapterNum,
                        context: match[0]
                    });
                }
            }
        }

        return resources;
    }

    extractTimeline(content, chapterNum) {
        const timeline = [];
        const patterns = [
            /(?:第?([一二三四五六七八九十百千万]+)(?:天|年|月|日|时辰?))/g,
            /(?:([早中晚][上中下]?|黎明|黄昏|深夜|午夜))/g,
            /(?:时间?流逝|转眼|片刻之后|不久)([^\n]{0,20})/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] || match[2]) {
                    timeline.push({
                        description: match[0],
                        raw: match[1] || match[2],
                        chapter: chapterNum
                    });
                }
            }
        }

        return timeline;
    }

    extractRelationships(content, chapterNum) {
        const relationships = [];
        const patterns = [
            /([^\s，。！？：；""''（）]{2,6})(?:与|和)([^\s，。！？：；""''（）]{2,6})(?:成为|结为|是)(?:好友|兄弟|姐妹|师徒|恋人|夫妻|敌人|对手)/g,
            /([^\s，。！？：；""''（）]{2,6})(?:对|向|跟)([^\s，。！？：；""''（）]{2,6})(?:说|道|表白)/g,
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && match[2]) {
                    relationships.push({
                        from: match[1].trim(),
                        to: match[2].trim(),
                        type: 'interaction',
                        chapter: chapterNum,
                        context: match[0]
                    });
                }
            }
        }

        return relationships;
    }

    detectSubplotActivity(content, chapterNum) {
        const activities = [];
        const subplotIndicators = [
            { pattern: /(?:支线|A线|B线|C线)([^\n]{5,20})/, type: 'subplot_mentioned' },
            { pattern: /(?:与此同时|另外|另一边)([^\n]{5,30})/, type: 'parallel_development' },
            { pattern: /(?:伏笔|悬念)(?:回收|揭示)([^\n]{5,20})/, type: 'subplot_progress' },
        ];

        for (const { pattern, type } of subplotIndicators) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                if (match) {
                    activities.push({
                        type,
                        description: match[1]?.trim() || match[0],
                        chapter: chapterNum
                    });
                }
            }
        }

        return activities;
    }

    detectStateChanges(content, previousContent, chapterNum) {
        const changes = [];

        if (!previousContent) {
            return changes;
        }

        const currentLocs = this.extractLocations(content, chapterNum).map(l => l.name);
        const prevLocs = previousContent ? this.extractLocations(previousContent, 0).map(l => l.name) : [];

        for (const loc of currentLocs) {
            if (!prevLocs.includes(loc)) {
                changes.push({ type: 'location_change', from: prevLocs[0] || 'unknown', to: loc, chapter: chapterNum });
            }
        }

        const currentChars = this.extractCharacters(content, chapterNum).map(c => c.name);
        const prevChars = previousContent ? this.extractCharacters(previousContent, 0).map(c => c.name) : [];

        for (const char of currentChars) {
            if (!prevChars.includes(char)) {
                changes.push({ type: 'new_character', character: char, chapter: chapterNum });
            }
        }

        return changes;
    }

    classifyChapterType(content, hooks) {
        const hasBattle = /(?:战斗|对决|交手|厮杀|比拼)/.test(content);
        const hasClimax = /(?:高潮|爆发|逆转|转折)/.test(content);
        const hasSetup = /(?:伏笔|铺垫|布局)/.test(content);
        const hasPayoff = /(?:揭晓|揭示|回收|真相大白)/.test(content);
        const hasDialogue = /[""''「」『』【】].{10,}/.test(content);

        if (hasBattle) return 'battle';
        if (hasClimax) return 'climax';
        if (hasPayoff) return 'payoff';
        if (hasSetup) return 'setup';
        if (hasDialogue && content.length < 2000) return 'dialogue';
        return 'development';
    }

    async cascadeUpdate(chapterNum, analysis, fromChapter = 1) {
        const updates = {
            currentState: { ...this.loadCurrentState() },
            hooks: { ...this.loadHooks() },
            chapterSummaries: { ...this.loadChapterSummaries() },
            particleLedger: { ...this.loadParticleLedger() },
            subplotBoard: { ...this.loadSubplotBoard() },
            emotionalArcs: { ...this.loadEmotionalArcs() },
            characterMatrix: { ...this.loadCharacterMatrix() }
        };

        updates.currentState.chapter = chapterNum;
        updates.currentState.facts = [
            ...updates.currentState.facts.filter(f => f.validUntilChapter === null || f.validUntilChapter >= fromChapter),
            ...analysis.facts.map(f => ({ ...f, sourceChapter: chapterNum }))
        ];

        if (analysis.locations.length > 0) {
            const lastLoc = analysis.locations[analysis.locations.length - 1];
            if (!updates.currentState.facts.some(f => f.subject === lastLoc.name && f.predicate === 'located_at')) {
                updates.currentState.facts.push({
                    subject: lastLoc.name,
                    predicate: 'located_at',
                    object: lastLoc.name,
                    validFromChapter: chapterNum,
                    validUntilChapter: null,
                    sourceChapter: chapterNum
                });
            }
        }

        for (const hook of analysis.hooks) {
            const existing = updates.hooks.hooks.find(h => h.notes === hook.notes);
            if (!existing) {
                updates.hooks.hooks.push(hook);
            } else {
                existing.lastAdvancedChapter = chapterNum;
            }
        }

        for (const h of updates.hooks.hooks) {
            if (h.status === 'open' && h.lastAdvancedChapter < chapterNum - 5) {
                h.status = 'stale';
            }
        }

        const existingSummaryIdx = updates.chapterSummaries.rows.findIndex(r => r.chapter === chapterNum);
        const newSummary = {
            chapter: chapterNum,
            title: `第${chapterNum}章`,
            characters: analysis.characters.map(c => c.name).join(', '),
            events: analysis.hooks.map(h => h.notes).slice(0, 3).join('; '),
            stateChanges: analysis.stateChanges.map(c => `${c.type}:${c.to || c.character}`).join(', '),
            hookActivity: analysis.hooks.map(h => h.notes).join('; '),
            mood: analysis.emotions.map(e => e.emotion).join(', ') || 'neutral',
            chapterType: analysis.chapterType
        };

        if (existingSummaryIdx >= 0) {
            updates.chapterSummaries.rows[existingSummaryIdx] = newSummary;
        } else {
            updates.chapterSummaries.rows.push(newSummary);
            updates.chapterSummaries.rows.sort((a, b) => a.chapter - b.chapter);
        }

        for (const resource of analysis.resources) {
            const existingEntry = updates.particleLedger.entries.find(e => e.name === resource.name);
            if (existingEntry) {
                if (resource.change === 'acquired') {
                    existingEntry.currentAmount = (existingEntry.currentAmount || 0) + 1;
                } else if (resource.change === 'consumed') {
                    existingEntry.currentAmount = Math.max(0, (existingEntry.currentAmount || 0) - 1);
                }
                existingEntry.lastChangeChapter = chapterNum;
                existingEntry.history.push({
                    chapter: chapterNum,
                    change: resource.change,
                    note: resource.context
                });
            } else {
                updates.particleLedger.entries.push({
                    name: resource.name,
                    initialAmount: 1,
                    currentAmount: resource.change === 'acquired' ? 1 : 0,
                    lastChangeChapter: chapterNum,
                    history: [{
                        chapter: chapterNum,
                        change: resource.change,
                        note: resource.context
                    }]
                });
            }
        }

        for (const activity of analysis.subplotActivity) {
            const existingSubplot = updates.subplotBoard.subplots.find(s => 
                s.description === activity.description || s.type === activity.type
            );
            if (existingSubplot) {
                existingSubplot.lastAdvancedChapter = chapterNum;
                existingSubplot.status = 'active';
            } else {
                updates.subplotBoard.subplots.push({
                    id: `subplot_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    description: activity.description,
                    type: activity.type,
                    startChapter: chapterNum,
                    lastAdvancedChapter: chapterNum,
                    status: 'active'
                });
            }
        }

        for (const h of updates.subplotBoard.subplots) {
            if (h.lastAdvancedChapter < chapterNum - 5) {
                h.status = 'stagnant';
            }
        }

        for (const emotion of analysis.emotions) {
            const existingArc = updates.emotionalArcs.arcs.find(a => a.character === emotion.character);
            if (existingArc) {
                existingArc.points.push({
                    chapter: chapterNum,
                    emotion: emotion.emotion,
                    intensity: emotion.intensity
                });
                if (existingArc.points.length > 10) {
                    existingArc.points = existingArc.points.slice(-10);
                }
            } else {
                updates.emotionalArcs.arcs.push({
                    character: emotion.character,
                    points: [{
                        chapter: chapterNum,
                        emotion: emotion.emotion,
                        intensity: emotion.intensity
                    }]
                });
            }
        }

        for (const rel of analysis.relationships) {
            const existing = updates.characterMatrix.relationships.find(r =>
                r.from === rel.from && r.to === rel.to
            );
            if (existing) {
                existing.lastInteraction = chapterNum;
                existing.interactionCount = (existing.interactionCount || 1) + 1;
            } else {
                updates.characterMatrix.relationships.push({
                    ...rel,
                    lastInteraction: chapterNum,
                    interactionCount: 1
                });
            }

            updates.characterMatrix.encounters.push({
                from: rel.from,
                to: rel.to,
                chapter: chapterNum,
                context: rel.context
            });
        }

        return updates;
    }

    async applyUpdates(updates) {
        this.saveCurrentState(updates.currentState);
        this.saveHooks(updates.hooks);
        this.saveChapterSummaries(updates.chapterSummaries);
        this.saveParticleLedger(updates.particleLedger);
        this.saveSubplotBoard(updates.subplotBoard);
        this.saveEmotionalArcs(updates.emotionalArcs);
        this.saveCharacterMatrix(updates.characterMatrix);

        const manifest = this.loadManifest();
        manifest.lastAppliedChapter = updates.currentState.chapter;
        this.saveManifest(manifest);
    }
}

export default TruthFiles;
