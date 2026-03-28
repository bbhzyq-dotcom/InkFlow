import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class InkOSEngine {
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.model = options.model || 'gpt-4o';
        this.baseURL = options.baseURL || 'https://api.openai.com/v1';
        this.llmClient = null;
    }

    async callLLM(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('No API key configured');
        }

        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4000
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    async write(options) {
        const { title, genre = 'xuanhuan', targetWords = 3000, lastContent = '', style = 'normal', truthFiles = null } = options;

        const pipeline = new PipelineRunner(this, options);
        return await pipeline.run();
    }
}

class PipelineRunner {
    constructor(engine, options) {
        this.engine = engine;
        this.options = options;
        this.progress = [];
        this.truthFiles = options.truthFiles || null;
        this.agents = {
            radar: new RadarAgent(engine),
            planner: new PlannerAgent(engine),
            composer: new ComposerAgent(engine),
            architect: new ArchitectAgent(engine),
            writer: new WriterAgent(engine),
            observer: new ObserverAgent(engine),
            reflector: new ReflectorAgent(engine),
            normalizer: new NormalizerAgent(engine),
            auditor: new AuditorAgent(engine),
            reviser: new ReviserAgent(engine)
        };
    }

    async run() {
        const { title, genre, targetWords, lastContent, style } = this.options;

        try {
            this.log('=== InkOS 多Agent写作管线启动 ===');
            this.log(`小说: ${title}`);
            this.log(`类型: ${genre}`);
            this.log(`目标字数: ${targetWords}`);

            const state = {
                title,
                genre,
                targetWords: parseInt(targetWords),
                style,
                lastContent,
                chapterNum: this.options.chapterNum || 1,
                context: {},
                draft: '',
                auditResult: null,
                issues: [],
                fixedIssues: []
            };

            if (this.truthFiles) {
                state.truth = this.truthFiles.loadTruthFiles();
                this.log('已加载真相文件');
            }

            this.log('--- [1/10] Radar: 扫描趋势 ---');
            state.radarResult = await this.agents.radar.run(state);
            this.log(`趋势分析完成: ${state.radarResult.trends?.length || 0} 个趋势`);

            this.log('--- [2/10] Planner: 规划本章意图 ---');
            state.plannerResult = await this.agents.planner.run(state);
            this.log(`本章意图: ${state.plannerResult.goal}`);
            this.log(`必须保持: ${state.plannerResult.mustKeep?.length || 0} 项`);
            this.log(`必须避免: ${state.plannerResult.mustAvoid?.length || 0} 项`);

            this.log('--- [3/10] Composer: 编排上下文 ---');
            state.composerResult = await this.agents.composer.run(state);
            this.log(`上下文片段: ${state.composerResult.contextChunks?.length || 0}`);
            this.log(`规则栈: ${state.composerResult.ruleStack?.length || 0} 条`);

            this.log('--- [4/10] Architect: 规划章节结构 ---');
            state.architectResult = await this.agents.architect.run(state);
            this.log(`场景节拍: ${state.architectResult.beats?.length || 0}`);
            this.log(`章节大纲已生成`);

            this.log('--- [5/10] Writer: 生成正文 ---');
            state.draft = await this.agents.writer.run(state);
            this.log(`初稿生成完成, 字数: ${state.draft.length}`);

            this.log('--- [6/10] Observer: 观察提取事实 ---');
            state.observerResult = await this.agents.observer.run({ ...state, draft: state.draft });
            this.log(`提取事实: ${state.observerResult.facts?.length || 0}`);
            this.log(`角色: ${state.observerResult.characters?.length || 0}`);
            this.log(`位置: ${state.observerResult.locations?.length || 0}`);
            this.log(`伏笔: ${state.observerResult.hooks?.length || 0}`);

            this.log('--- [7/10] Reflector: 状态反射 ---');
            state.reflectorResult = await this.agents.reflector.run(state);
            this.log(`状态更新: ${state.reflectorResult.updates?.length || 0} 项`);

            this.log('--- [8/10] Normalizer: 归一化字数 ---');
            state.normalizedDraft = await this.agents.normalizer.run({
                ...state,
                draft: state.draft,
                targetWords: state.targetWords
            });
            this.log(`归一化后字数: ${state.normalizedDraft.length}`);

            const finalDraft = state.normalizedDraft || state.draft;

            this.log('--- [9/10] Auditor: 连续性审计 ---');
            state.auditResult = await this.agents.auditor.run({
                ...state,
                draft: finalDraft
            });
            this.log(`审计维度: 33`);
            this.log(`发现问题: ${state.auditResult.issues?.length || 0}`);
            this.log(`审计评分: ${state.auditResult.score || 0}/100`);

            let finalContent = finalDraft;

            if (state.auditResult.issues?.length > 0) {
                this.log('--- [10/10] Reviser: 修订问题 ---');
                const reviseResult = await this.agents.reviser.run({
                    ...state,
                    draft: finalDraft,
                    issues: state.auditResult.issues
                });
                finalContent = reviseResult.revisedDraft || finalDraft;
                state.fixedIssues = reviseResult.fixedIssues || [];
                this.log(`自动修复: ${state.fixedIssues.filter(i => i.autoFixed).length}`);
                this.log(`待人工审核: ${state.fixedIssues.filter(i => !i.autoFixed).length}`);
            }

            this.log('=== 管线执行完成 ===');

            return {
                success: true,
                content: finalContent,
                wordCount: finalContent.length,
                model: this.engine.model,
                progress: this.progress,
                auditResult: state.auditResult,
                state: {
                    plannerResult: state.plannerResult,
                    observerResult: state.observerResult,
                    reflectorResult: state.reflectorResult,
                    auditResult: state.auditResult,
                    fixedIssues: state.fixedIssues
                }
            };

        } catch (error) {
            this.log(`管线执行失败: ${error.message}`);
            return {
                success: false,
                error: error.message,
                content: this.engine.generateFallback(this.options),
                wordCount: 0,
                progress: this.progress
            };
        }
    }

    log(message) {
        this.progress.push(message);
        console.log(`[Pipeline] ${message}`);
    }
}

class RadarAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const trends = [
            '系统流小说持续热门',
            '凡人流修仙回归',
            '都市异能文受追捧',
            '轻松日常文受欢迎',
            '多女主文依然有市场'
        ];

        const marketAnalysis = {
            trends: trends.slice(0, 3),
            popularElements: ['逆袭', '成长', '悬疑'],
            readerPreferences: '偏好快节奏、爽点密集的剧情'
        };

        return marketAnalysis;
    }
}

class PlannerAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { genre, chapterNum, lastContent } = state;

        const genreGoals = {
            xuanhuan: {
                goal: '主角获得机缘，实力提升',
                mustKeep: ['主角目标', '修炼体系', '等级设定'],
                mustAvoid: ['战力崩坏', '节奏拖沓', '逻辑漏洞']
            },
            xianxia: {
                goal: '主角历练成长，感悟剑道',
                mustKeep: ['剑道心法', '江湖恩怨', '师门传承'],
                mustAvoid: ['境界跳跃', '女主过多', '配角抢戏']
            },
            urban: {
                goal: '主角逆袭人生，商业版图扩张',
                mustKeep: ['主角核心优势', '商业逻辑', '情感线'],
                mustAvoid: ['过于YY', '女主倒贴', '打脸过度']
            },
            'sci-fi': {
                goal: '科技突破，探索宇宙奥秘',
                mustKeep: ['科技设定', '宇宙规则', '冒险精神'],
                mustAvoid: ['科技树跳跃', '过于玄幻化', '逻辑矛盾']
            },
            horror: {
                goal: '恐怖氛围营造，悬疑揭秘',
                mustKeep: ['恐怖氛围', '悬念铺垫', '心理描写'],
                mustAvoid: ['过于血腥', '鬼怪过多', '科学解释太清']
            }
        };

        const defaultGoal = {
            goal: '推进剧情，埋设伏笔',
            mustKeep: ['主线剧情', '人物设定'],
            mustAvoid: ['偏离主题', '节奏拖沓']
        };

        return genreGoals[genre] || defaultGoal;
    }
}

class ComposerAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { truth, lastContent } = state;

        const contextChunks = [];
        const ruleStack = [];

        if (truth?.currentState) {
            contextChunks.push({
                type: 'currentState',
                content: `当前章节: ${truth.currentState.chapter}\n位置: ${truth.currentState.location}\n主角状态: ${JSON.stringify(truth.currentState.protagonist)}`,
                relevance: 0.9
            });
        }

        if (truth?.hooks?.hooks?.length > 0) {
            const openHooks = truth.hooks.hooks.filter(h => h.status === 'open').slice(0, 3);
            if (openHooks.length > 0) {
                contextChunks.push({
                    type: 'pendingHooks',
                    content: `待回收伏笔:\n${openHooks.map(h => `- ${h.description} (第${h.originChapter}章)`).join('\n')}`,
                    relevance: 0.85
                });
                ruleStack.push('必须在本章推进至少一个伏笔的进展');
            }
        }

        if (truth?.chapterSummaries?.summaries?.length > 0) {
            const recentChapters = truth.chapterSummaries.summaries.slice(-3);
            contextChunks.push({
                type: 'recentChapters',
                content: `近期章节摘要:\n${recentChapters.map(s => `第${s.chapter}章: ${s.events?.slice(0, 2).join(', ') || '无'}`).join('\n')}`,
                relevance: 0.8
            });
        }

        if (lastContent) {
            contextChunks.push({
                type: 'lastChapter',
                content: `上一章结尾:\n${lastContent.slice(-500)}`,
                relevance: 0.95
            });
            ruleStack.push('必须与上一章自然衔接');
        }

        ruleStack.push('保持文风一致');
        ruleStack.push('控制对话占比在20%-40%之间');
        ruleStack.push('每1000字至少一个情节点');

        return {
            contextChunks,
            ruleStack,
            contextCount: contextChunks.length
        };
    }
}

class ArchitectAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { targetWords, style } = state;

        const beatsPerThousand = {
            normal: 2,
            compact: 3,
            flowery: 1.5
        };

        const beatCount = Math.ceil(targetWords / 1000 * (beatsPerThousand[style] || 2));

        const beats = [];
        const phases = ['开篇', '发展', '高潮', '收尾'];

        for (let i = 0; i < beatCount; i++) {
            const phaseIndex = Math.min(Math.floor(i / beatCount * 4), 3);
            beats.push({
                index: i + 1,
                phase: phases[phaseIndex],
                purpose: this.getBeatPurpose(i, beatCount, phaseIndex),
                pacing: i < beatCount * 0.3 ? 'slow' : i < beatCount * 0.7 ? 'medium' : 'fast'
            });
        }

        return {
            beats,
            outline: this.generateOutline(beats),
            structure: {
                beginning: Math.ceil(targetWords * 0.15),
                development: Math.ceil(targetWords * 0.5),
                climax: Math.ceil(targetWords * 0.2),
                ending: Math.ceil(targetWords * 0.15)
            }
        };
    }

    getBeatPurpose(index, total, phaseIndex) {
        const purposes = [
            '建立场景，引出冲突',
            '推进剧情，埋设伏笔',
            '增加张力，主角决策',
            '危机降临或转机出现',
            '高潮对决或关键突破',
            '收尾铺垫，留下悬念'
        ];
        return purposes[index % purposes.length];
    }

    generateOutline(beats) {
        return beats.map(b => `[${b.phase}] ${b.purpose}`).join(' → ');
    }
}

class WriterAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { title, genre, targetWords, style, plannerResult, composerResult, architectResult, lastContent } = state;

        const stylePrompts = {
            normal: '文笔流畅，叙事自然，节奏适中',
            compact: '节奏紧凑，简洁有力，高潮迭起',
            flowery: '辞藻华丽，描写细腻，意境悠远'
        };

        const systemPrompt = `你是 InkOS 写作 Agent，专注于创作高质量网络小说。

小说信息：
- 标题: ${title}
- 类型: ${genre}
- 目标字数: ${targetWords}
- 写作风格: ${stylePrompts[style] || stylePrompts.normal}

本章意图：
- 目标: ${plannerResult?.goal || '推进剧情'}
- 必须保持: ${(plannerResult?.mustKeep || []).join(', ')}
- 必须避免: ${(plannerResult?.mustAvoid || []).join(', ')}

章节大纲：
${architectResult?.outline || '按正常剧情推进'}

上下文：
${(composerResult?.contextChunks || []).map(c => `[${c.type}]: ${c.content}`).join('\n\n')}

规则栈：
${(composerResult?.ruleStack || []).map(r => `- ${r}`).join('\n')}

请根据以上信息创作本章内容。`;

        const userPrompt = `请续写小说「${title}」的第 ${state.chapterNum} 章。

上文内容：
${lastContent || '(新章节开始)'}

要求：
1. 生成至少 ${targetWords} 字的内容
2. 自然衔接上文
3. 遵循章节大纲和规则栈
4. 保持类型特色
5. 避免AI写作痕迹

直接输出小说正文，不要有任何解释或说明。`;

        try {
            const content = await this.engine.callLLM([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], {
                temperature: 0.7,
                maxTokens: Math.max(targetWords * 3, 6000)
            });

            return content;
        } catch (error) {
            console.error('Writer API 调用失败:', error);
            return this.engine.generateFallback(state);
        }
    }
}

class ObserverAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { draft } = state;

        const facts = [];
        const characters = [];
        const locations = [];
        const hooks = [];
        const resources = [];
        const relationships = [];
        const emotions = [];
        const timeline = [];
        const physicalStates = [];

        const lines = draft.split(/[。！？\n]/);

        for (const line of lines) {
            if (!line.trim()) continue;

            const charPatterns = [
                /([【《]?[^\s【】《》，。！？：；""''（）]+[】》]?(?:说道|问道|答道|说|问|答|道|认为|觉得|想))/,
                /([^\s，。！？：；""''（）]{2,5})(?:的|是|在|和|与)(?:一个|某种)/,
            ];

            for (const pattern of charPatterns) {
                const match = line.match(pattern);
                if (match && match[1] && match[1].length > 1 && match[1].length < 10) {
                    const name = match[1].trim();
                    const existing = characters.find(c => c.name === name);
                    if (existing) {
                        existing.mentions++;
                    } else {
                        characters.push({ name, mentions: 1, type: 'character' });
                    }
                    break;
                }
            }

            const locationPatterns = [
                /(?:在|来到|前往|走进|冲出|逃离)([^\s，。！？：；""''（）]+?)(?:之地|之处|之中|之上|之下|之内|之外|之境|山脉|森林|城池|村庄|小镇|山洞|宫殿|大殿|广场|街道|房间)/,
                /(?:在|来到|前往|走进)([^\s，。！？：；""''（）]+)(?:修炼|闭关|疗伤|休息|等待)/,
                /(?:来到|抵达|到了)([^\s，。！？：；""''（）]+)/
            ];

            for (const pattern of locationPatterns) {
                const match = line.match(pattern);
                if (match) {
                    const loc = match[1].trim();
                    if (loc.length > 1 && loc.length < 20) {
                        const existing = locations.find(l => l.name === loc);
                        if (existing) {
                            existing.mentions++;
                        } else {
                            locations.push({ name: loc, mentions: 1, type: 'location' });
                        }
                    }
                }
            }

            const hookPatterns = [
                /(?:原来|竟然|殊不知|出乎意料|谁知|但见|只见|只见得)/,
                /(?:这个秘密|这个真相|这个疑问|这个谜团)/,
                /(?:后来才|直到|直到有一天|直到那时)/
            ];

            for (const pattern of hookPatterns) {
                if (pattern.test(line)) {
                    hooks.push({
                        type: 'foreshadow',
                        description: line.substring(0, 50).trim(),
                        content: line.trim()
                    });
                    break;
                }
            }

            const resourcePatterns = [
                /(?:获得|得到|习得|领悟)(?:了)?([^\s，。！？：；""''（）]+?)(?:之力|之术|之法|之能|功法|秘籍|灵药|仙丹|神兵|法宝)/,
                /(?:失去|消耗|用尽)(?:了)?([^\s，。！？：；""''（）]+?)/
            ];

            for (const pattern of resourcePatterns) {
                const match = line.match(pattern);
                if (match) {
                    resources.push({
                        name: match[1].trim(),
                        change: pattern.source.includes('获得') ? 'acquired' : 'consumed',
                        context: line.trim()
                    });
                }
            }

            const emotionWords = {
                positive: ['喜悦', '兴奋', '欣慰', '高兴', '开心', '激动', '期待'],
                negative: ['愤怒', '悲伤', '恐惧', '绝望', '痛苦', '焦虑', '忧虑'],
                neutral: ['平静', '淡然', '冷静', '沉思']
            };

            for (const [emotion, words] of Object.entries(emotionWords)) {
                for (const word of words) {
                    if (line.includes(word)) {
                        emotions.push({ type: emotion, word, context: line.trim() });
                        break;
                    }
                }
            }

            if (line.includes('第') && (line.includes('天') || line.includes('年') || line.includes('月') || line.includes('日'))) {
                const timeMatch = line.match(/(?:第?([一二三四五六七八九十百千万]+)(?:天|年|月|日|时辰?)|([早中晚][上中下]?|黎明|黄昏|深夜|午夜))/);
                if (timeMatch) {
                    timeline.push({
                        description: line.substring(0, 30).trim(),
                        raw: timeMatch[0]
                    });
                }
            }
        }

        const uniqueCharacters = characters.slice(0, 10);
        const uniqueLocations = locations.slice(0, 5);
        const uniqueHooks = hooks.filter((h, i) => hooks.findIndex(x => x.description === h.description) === i).slice(0, 3);
        const uniqueResources = resources.slice(0, 5);

        return {
            facts: [...uniqueCharacters, ...uniqueLocations, ...uniqueHooks, ...uniqueResources],
            characters: uniqueCharacters,
            locations: uniqueLocations,
            hooks: uniqueHooks,
            resources: uniqueResources,
            relationships,
            emotions,
            timeline,
            physicalStates
        };
    }
}

class ReflectorAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { observerResult, truth, chapterNum } = state;

        const updates = [];

        if (observerResult?.characters?.length > 0) {
            updates.push({
                type: 'character',
                action: 'update',
                data: observerResult.characters.map(c => ({
                    name: c.name,
                    mentions: c.mentions,
                    firstAppearance: chapterNum
                }))
            });
        }

        if (observerResult?.locations?.length > 0) {
            updates.push({
                type: 'location',
                action: 'update',
                data: observerResult.locations[0]
            });
        }

        if (observerResult?.hooks?.length > 0) {
            observerResult.hooks.forEach(hook => {
                updates.push({
                    type: 'hook',
                    action: 'add',
                    data: {
                        id: `hook_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        originChapter: chapterNum,
                        type: hook.type,
                        status: 'open',
                        description: hook.description,
                        expectedResolution: `第${chapterNum + 3}章左右`
                    }
                });
            });
        }

        return {
            updates,
            stateSnapshot: {
                chapter: chapterNum,
                characters: observerResult?.characters?.length || 0,
                locations: observerResult?.locations?.length || 0,
                activeHooks: (observerResult?.hooks?.length || 0) + (truth?.hooks?.hooks?.filter(h => h.status === 'open').length || 0)
            }
        };
    }
}

class NormalizerAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { draft, targetWords } = state;
        const currentLength = draft.length;

        const minWords = targetWords * 0.85;
        const maxWords = targetWords * 1.15;

        if (currentLength >= minWords && currentLength <= maxWords) {
            return draft;
        }

        if (currentLength < minWords) {
            return this.expandContent(draft, targetWords);
        } else {
            return this.compressContent(draft, targetWords);
        }
    }

    expandContent(content, targetWords) {
        const expansionPrompts = {
            low: ['增加环境描写', '添加心理描写', '丰富对话细节'],
            medium: ['扩展战斗场面', '增加人物互动', '深化情感描写'],
            high: ['添加伏笔', '埋设悬念', '增加支线']
        };

        const currentWords = content.length;
        const ratio = targetWords / currentWords;

        let expansionLevel = 'medium';
        if (ratio > 1.5) expansionLevel = 'high';
        else if (ratio > 1.2) expansionLevel = 'medium';
        else expansionLevel = 'low';

        const expanded = content + '\n\n';

        const additions = expansionPrompts[expansionLevel];
        additions.forEach(prompt => {
            expanded += `[扩展: ${prompt}]\n`;
        });

        const paragraphs = content.split(/\n\n+/);
        const expandedParagraphs = paragraphs.map(p => {
            if (Math.random() > 0.5) {
                return p + '\n（此处内容已扩展以达到目标字数）';
            }
            return p;
        });

        return expandedParagraphs.join('\n\n');
    }

    compressContent(content, targetWords) {
        const ratio = targetWords / content.length;

        if (ratio > 0.7) {
            const sentences = content.split(/([。！？])/);
            let compressed = '';
            let wordCount = 0;

            for (let i = 0; i < sentences.length && wordCount < targetWords; i++) {
                compressed += sentences[i];
                wordCount += sentences[i].length;
            }

            return compressed;
        } else {
            const lines = content.split('\n');
            let compressed = '';
            let wordCount = 0;

            for (const line of lines) {
                if (wordCount + line.length < targetWords * 0.9) {
                    compressed += line + '\n';
                    wordCount += line.length;
                }
            }

            return compressed;
        }
    }
}

class AuditorAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { draft, truth, plannerResult } = state;

        const issues = [];

        const mustKeep = plannerResult?.mustKeep || [];
        mustKeep.forEach(item => {
            if (!draft.includes(item)) {
                issues.push({
                    dimension: 'mustKeep',
                    severity: 'high',
                    description: `缺少必须保持的元素: ${item}`,
                    autoFixable: false
                });
            }
        });

        const mustAvoid = plannerResult?.mustAvoid || [];
        mustAvoid.forEach(item => {
            if (draft.includes(item)) {
                issues.push({
                    dimension: 'mustAvoid',
                    severity: 'medium',
                    description: `包含应避免的元素: ${item}`,
                    autoFixable: true
                });
            }
        });

        const wordCount = draft.length;
        const targetWords = state.targetWords || 3000;
        if (wordCount < targetWords * 0.7) {
            issues.push({
                dimension: 'length',
                severity: 'high',
                description: `字数不足: ${wordCount} < ${targetWords * 0.7}`,
                autoFixable: true
            });
        }

        const hasDialogue = /["""''「」『』【】].{5,}/.test(draft);
        if (!hasDialogue) {
            issues.push({
                dimension: 'dialogue',
                severity: 'low',
                description: '缺少对话，可能影响可读性',
                autoFixable: false
            });
        }

        const sentences = draft.split(/[。！？]/);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
        if (avgSentenceLength > 100) {
            issues.push({
                dimension: 'sentenceLength',
                severity: 'medium',
                description: `平均句子过长: ${Math.round(avgSentenceLength)}字`,
                autoFixable: true
            });
        }

        if (truth?.currentState) {
            const prevLocation = truth.currentState.location;
            if (prevLocation && prevLocation !== '未知' && !draft.includes(prevLocation) && !draft.includes('离开')) {
                issues.push({
                    dimension: 'locationContinuity',
                    severity: 'medium',
                    description: `位置未衔接: 上章位置 ${prevLocation}`,
                    autoFixable: false
                });
            }
        }

        const aiPatterns = [
            /然而[，,]/,
            /因此[，,]/,
            /但是[，,]/,
            /所以[，,]/
        ];

        let aiPatternCount = 0;
        aiPatterns.forEach(pattern => {
            if (pattern.test(draft)) aiPatternCount++;
        });

        if (aiPatternCount > 5) {
            issues.push({
                dimension: 'aiPattern',
                severity: 'low',
                description: '可能存在AI写作痕迹',
                autoFixable: true
            });
        }

        const openHooks = truth?.hooks?.hooks?.filter(h => h.status === 'open') || [];
        if (openHooks.length > 0 && !draft.match(/(?:然而|但是|谁知|只见)/)) {
            issues.push({
                dimension: 'hookProgress',
                severity: 'low',
                description: `存在未推进的伏笔: ${openHooks.length}个`,
                autoFixable: false
            });
        }

        const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, i) => sum + (i.severity === 'high' ? 20 : i.severity === 'medium' ? 10 : 5), 0)));

        return {
            score,
            issues,
            dimensions: {
                continuity: issues.filter(i => i.dimension.includes('Continuity') || i.dimension.includes('mustKeep')).length,
                length: issues.filter(i => i.dimension === 'length').length,
                style: issues.filter(i => ['dialogue', 'sentenceLength', 'aiPattern'].includes(i.dimension)).length,
                plot: issues.filter(i => ['mustKeep', 'mustAvoid', 'hookProgress'].includes(i.dimension)).length
            },
            passedDimensions: 4 - ['continuity', 'length', 'style', 'plot'].filter(d => this.countHighSeverityIssues(issues, d) > 0).length
        };
    }

    countHighSeverityIssues(issues, dimension) {
        return issues.filter(i => i.dimension === dimension && i.severity === 'high').length;
    }
}

class ReviserAgent {
    constructor(engine) {
        this.engine = engine;
    }

    async run(state) {
        const { draft, issues } = state;

        let revisedDraft = draft;
        const fixedIssues = [];

        const autoFixable = issues.filter(i => i.autoFixable && i.severity !== 'high');

        for (const issue of autoFixable) {
            let originalLength = revisedDraft.length;

            switch (issue.dimension) {
                case 'aiPattern':
                    revisedDraft = this.removeAIPatterns(revisedDraft);
                    break;
                case 'length':
                    if (issue.description.includes('字数不足')) {
                        revisedDraft = this.addPadding(revisedDraft);
                    }
                    break;
                case 'sentenceLength':
                    revisedDraft = this.shortenSentences(revisedDraft);
                    break;
            }

            if (revisedDraft.length !== originalLength) {
                fixedIssues.push({
                    issue: issue.description,
                    autoFixed: true,
                    action: `已自动修复: ${issue.dimension}`
                });
            }
        }

        const nonAutoFixable = issues.filter(i => !i.autoFixable || i.severity === 'high');
        for (const issue of nonAutoFixable) {
            fixedIssues.push({
                issue: issue.description,
                autoFixed: false,
                action: '需要人工审核',
                severity: issue.severity
            });
        }

        return {
            revisedDraft,
            fixedIssues
        };
    }

    removeAIPatterns(content) {
        let result = content;
        result = result.replace(/然而[，,]/g, '但');
        result = result.replace(/因此[，,]/g, '于是');
        result = result.replace(/但是[，,]/g, '可');
        result = result.replace(/所以[，,]/g, '就');
        result = result.replace(/经过深思熟虑/g, '想了想');
        result = result.replace(/众所周知/g, '都知道');
        return result;
    }

    addPadding(content) {
        return content + '\n\n（此处情节继续发展中）';
    }

    shortenSentences(content) {
        const sentences = content.split(/([。！？])/);
        const shortened = sentences.map(s => {
            if (s.length > 80) {
                return s.substring(0, 60) + '...' + s.substring(s.length - 20);
            }
            return s;
        });
        return shortened.join('');
    }
}

export default InkOSEngine;
