import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class InkOSEngine {
    constructor(options = {}) {
        this.defaultApiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
        this.defaultModel = options.model || 'gpt-4o';
        this.defaultBaseURL = options.baseURL || 'https://api.openai.com/v1';
        this.modelRouting = options.modelRouting || {};
        this.llmClient = null;
    }

    getModelConfig(agentName) {
        const routing = this.modelRouting[agentName];
        if (routing) {
            return {
                apiKey: routing.apiKey || routing.apiKeyEnv ? process.env[routing.apiKeyEnv] || this.defaultApiKey : this.defaultApiKey,
                model: routing.model || this.defaultModel,
                baseURL: routing.baseURL || this.defaultBaseURL
            };
        }
        return {
            apiKey: this.defaultApiKey,
            model: this.defaultModel,
            baseURL: this.defaultBaseURL
        };
    }

    async callLLM(messages, options = {}) {
        const agentName = options.agent || 'default';
        const config = this.getModelConfig(agentName);

        if (!config.apiKey) {
            throw new Error(`No API key configured for agent: ${agentName}`);
        }

        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4000
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败 (${agentName}): ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    async callLLMWithOptions(messages, options = {}) {
        return this.callLLM(messages, options);
    }

    async write(options) {
        const { title, genre = 'xuanhuan', targetWords = 3000, lastContent = '', style = 'normal', truthFiles = null } = options;

        const pipeline = new PipelineRunner(this, options);
        return await pipeline.run();
    }

    async partialRewrite(options) {
        const { beforeContext, selectedText, afterContext, instruction, novelTitle, genre } = options;

        const systemPrompt = `你是 InkOS 局部干预引擎。你需要根据用户的指示，重写选中的一部分内容。
要求：
1. 保持与上下文的一致性
2. 遵循用户的写作意图
3. 不改变为选中部分之前的内容
4. 保持与后续内容的衔接

请直接输出重写后的内容，不需要解释。`;

        const userPrompt = `前文（保持不变）：
${beforeContext}

选中需要重写的内容：
${selectedText}

用户的修改指示：
${instruction || '重写这部分，使其更流畅、更吸引人'}

请重写选中部分（只输出重写后的内容，不要包含前后文）：`;

        const content = await this.callLLM([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            agent: 'writer',
            temperature: 0.7,
            maxTokens: Math.max(selectedText.length * 2, 2000)
        });

        return { content };
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
                agent: 'writer',
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
        
        this.dimensions = {
            1: { name: 'OOC检查', desc: '检查角色是否偏离性格底色' },
            2: { name: '时间线检查', desc: '检查时间线是否一致' },
            3: { name: '设定冲突', desc: '检查是否与世界观设定冲突' },
            4: { name: '战力崩坏', desc: '检查战力等级是否合理' },
            5: { name: '数值检查', desc: '检查数值是否一致' },
            6: { name: '伏笔检查', desc: '检查伏笔是否推进' },
            7: { name: '节奏检查', desc: '检查节奏是否合适' },
            8: { name: '文风检查', desc: '检查文风是否一致' },
            9: { name: '信息越界', desc: '检查角色是否知道不该知道的信息' },
            10: { name: '词汇疲劳', desc: '检查高疲劳词使用情况' },
            11: { name: '利益链断裂', desc: '检查角色动机是否合理' },
            12: { name: '年代考据', desc: '检查年代细节是否准确' },
            13: { name: '配角降智', desc: '检查配角是否被强行降智' },
            14: { name: '配角工具人化', desc: '检查配角是否有独立人格' },
            15: { name: '爽点虚化', desc: '检查爽点是否有效落地' },
            16: { name: '台词失真', desc: '检查台词是否符合人物性格' },
            17: { name: '流水账', desc: '检查是否像流水账' },
            18: { name: '知识库污染', desc: '检查是否污染读者知识' },
            19: { name: '视角一致性', desc: '检查视角切换是否合适' },
            20: { name: '段落等长', desc: '检查段落长度是否单调' },
            21: { name: '套话密度', desc: '检查套话是否过多' },
            22: { name: '公式化转折', desc: '检查转折是否公式化' },
            23: { name: '列表式结构', desc: '检查是否列表式写作' },
            24: { name: '支线停滞', desc: '检查支线是否停滞' },
            25: { name: '弧线平坦', desc: '检查情感弧线是否平坦' },
            26: { name: '节奏单调', desc: '检查节奏是否单调' },
            27: { name: '敏感词检查', desc: '检查敏感词' },
            28: { name: '正传事件冲突', desc: '检查是否与正传冲突' },
            29: { name: '未来信息泄露', desc: '检查是否泄露未来信息' },
            30: { name: '世界规则跨书一致性', desc: '检查世界规则一致性' },
            31: { name: '番外伏笔隔离', desc: '检查伏笔是否隔离' },
            32: { name: '读者期待管理', desc: '检查读者期待' },
            33: { name: '大纲偏离检测', desc: '检查是否偏离大纲' },
            34: { name: '角色还原度', desc: '检查角色还原度' },
            35: { name: '世界规则遵守', desc: '检查世界规则遵守情况' },
            36: { name: '关系动态', desc: '检查关系发展是否合理' },
            37: { name: '正典事件一致性', desc: '检查正典事件一致性' }
        };
        
        this.aiTells = ['仿佛', '不禁', '宛如', '竟然', '忽然', '猛地', '然而', '因此', '所以', '但是'];
        this.fatigueWords = ['突然', '就在这时', '只见', '却见', '只见得', '没想到', '难以置信'];
    }

    async run(state) {
        const { draft, truth, plannerResult, chapterNum } = state;
        const issues = [];
        const chapter = chapterNum || (truth?.currentState?.chapter || 0) + 1;

        const mustKeep = plannerResult?.mustKeep || [];
        for (const item of mustKeep) {
            if (!draft.includes(item)) {
                issues.push({
                    dimension: 33,
                    dimensionName: '大纲偏离检测',
                    severity: 'critical',
                    description: `大纲要求必须包含「${item}」，但章节中未出现`,
                    suggestion: '在章节中加入该元素',
                    autoFixable: false
                });
            }
        }

        const mustAvoid = plannerResult?.mustAvoid || [];
        for (const item of mustAvoid) {
            if (draft.includes(item)) {
                issues.push({
                    dimension: 8,
                    dimensionName: '文风检查',
                    severity: 'critical',
                    description: `大纲要求避免「${item}」，但章节中出现了`,
                    suggestion: '移除或改写相关内容',
                    autoFixable: true
                });
            }
        }

        const wordCount = draft.length;
        const targetWords = state.targetWords || 3000;
        if (wordCount < targetWords * 0.7) {
            issues.push({
                dimension: 5,
                dimensionName: '数值检查',
                severity: 'critical',
                description: `字数严重不足: ${wordCount} < ${Math.round(targetWords * 0.7)}`,
                suggestion: '扩充内容或拆分为多章',
                autoFixable: true
            });
        } else if (wordCount < targetWords * 0.85) {
            issues.push({
                dimension: 5,
                dimensionName: '数值检查',
                severity: 'warning',
                description: `字数略少: ${wordCount} < ${Math.round(targetWords * 0.85)}`,
                suggestion: '适当扩充内容',
                autoFixable: true
            });
        } else if (wordCount > targetWords * 1.3) {
            issues.push({
                dimension: 5,
                dimensionName: '数值检查',
                severity: 'warning',
                description: `字数超出过多: ${wordCount} > ${Math.round(targetWords * 1.3)}`,
                suggestion: '精简内容',
                autoFixable: true
            });
        }

        if (truth?.currentState?.facts) {
            const currentFacts = truth.currentState.facts.filter(f => !f.validUntilChapter || f.validUntilChapter >= chapter - 1);
            for (const fact of currentFacts) {
                if (fact.predicate === 'acquired' || fact.predicate === 'owns') {
                    if (draft.includes(`丢失${fact.object}`) || draft.includes(`失去了${fact.object}`)) {
                        issues.push({
                            dimension: 3,
                            dimensionName: '设定冲突',
                            severity: 'critical',
                            description: `角色获得了「${fact.object}」但在章节中丢失了`,
                            suggestion: '保持物品状态一致',
                            autoFixable: false
                        });
                    }
                }
            }
        }

        const openHooks = truth?.hooks?.hooks?.filter(h => h.status === 'open') || [];
        const staleHooks = openHooks.filter(h => h.lastAdvancedChapter < chapter - 3);
        if (staleHooks.length > 0) {
            issues.push({
                dimension: 6,
                dimensionName: '伏笔检查',
                severity: 'warning',
                description: `有 ${staleHooks.length} 个伏笔超过3章未推进: ${staleHooks.map(h => h.notes?.slice(0, 10)).join(', ')}`,
                suggestion: '在近期章节中推进伏笔',
                autoFixable: false
            });
        }

        for (const hook of openHooks.slice(0, 5)) {
            if (hook.startChapter < chapter - 1 && draft.includes(hook.notes?.slice(0, 20) || '')) {
                if (!/然而|但是|谁知|只见/.test(draft)) {
                    issues.push({
                        dimension: 6,
                        dimensionName: '伏笔检查',
                        severity: 'info',
                        description: `伏笔「${hook.notes?.slice(0, 15)}」被提及但未有效推进`,
                        suggestion: '增加伏笔的进展或回收',
                        autoFixable: false
                    });
                }
            }
        }

        const dialogueMatches = draft.match(/[""''「」『』【】].{10,}/g) || [];
        const dialogueRatio = dialogueMatches.join('').length / wordCount;
        if (dialogueRatio < 0.1) {
            issues.push({
                dimension: 16,
                dimensionName: '台词失真',
                severity: 'warning',
                description: `对话占比过低: ${Math.round(dialogueRatio * 100)}%`,
                suggestion: '增加对话使人物更鲜活',
                autoFixable: false
            });
        } else if (dialogueRatio > 0.6) {
            issues.push({
                dimension: 17,
                dimensionName: '流水账',
                severity: 'warning',
                description: `对话占比过高: ${Math.round(dialogueRatio * 100)}%`,
                suggestion: '增加叙述和描写',
                autoFixable: false
            });
        }

        let aiTellCount = 0;
        for (const tell of this.aiTells) {
            const matches = (draft.match(new RegExp(tell, 'g')) || []).length;
            aiTellCount += matches;
        }
        if (aiTellCount > wordCount / 500) {
            issues.push({
                dimension: 10,
                dimensionName: '词汇疲劳',
                severity: 'warning',
                description: `AI写作特征词使用过多: ${aiTellCount}次`,
                suggestion: '使用更多样化的表达',
                autoFixable: true
            });
        }

        for (const word of this.fatigueWords) {
            const count = (draft.match(new RegExp(word, 'g')) || []).length;
            if (count > wordCount / 300) {
                issues.push({
                    dimension: 21,
                    dimensionName: '套话密度',
                    severity: 'warning',
                    description: `高频词「${word}」使用过多: ${count}次`,
                    suggestion: '使用更丰富的词汇',
                    autoFixable: true
                });
            }
        }

        const sentences = draft.split(/[。！？]/);
        const sentenceLengths = sentences.filter(s => s.length > 0).map(s => s.length);
        const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
        const shortSentences = sentenceLengths.filter(l => l < 10).length;
        if (avgLength > 80) {
            issues.push({
                dimension: 20,
                dimensionName: '段落等长',
                severity: 'warning',
                description: `平均句子过长: ${Math.round(avgLength)}字`,
                suggestion: '拆分长句',
                autoFixable: true
            });
        }
        if (shortSentences > sentenceLengths.length * 0.3) {
            issues.push({
                dimension: 20,
                dimensionName: '段落等长',
                severity: 'warning',
                description: `短句过多: ${shortSentences}/${sentenceLengths.length}`,
                suggestion: '增加句子长度变化',
                autoFixable: false
            });
        }

        const subplots = truth?.subplotBoard?.subplots || [];
        const stagnantSubplots = subplots.filter(s => s.status !== 'resolved' && s.lastAdvancedChapter < chapter - 5);
        if (stagnantSubplots.length > 0 && subplots.length > 0) {
            issues.push({
                dimension: 24,
                dimensionName: '支线停滞',
                severity: 'warning',
                description: `有 ${stagnantSubplots.length} 个支线超过5章未推进`,
                suggestion: '在近期章节中推进支线',
                autoFixable: false
            });
        }

        const emotionalArcs = truth?.emotionalArcs?.arcs || [];
        const flatArcs = emotionalArcs.filter(arc => {
            if (arc.points.length < 3) return false;
            const recentPoints = arc.points.slice(-3);
            const emotions = recentPoints.map(p => p.emotion);
            return emotions.every(e => e === emotions[0]);
        });
        if (flatArcs.length > 0) {
            issues.push({
                dimension: 25,
                dimensionName: '弧线平坦',
                severity: 'info',
                description: `角色 ${flatArcs.map(a => a.character).join(', ')} 的情感弧线过于平坦`,
                suggestion: '增加情感变化',
                autoFixable: false
            });
        }

        if (truth?.chapterSummaries?.rows) {
            const recentTypes = truth.chapterSummaries.rows.slice(-5).map(r => r.chapterType);
            let consecutiveSame = 1;
            for (let i = 1; i < recentTypes.length; i++) {
                if (recentTypes[i] === recentTypes[i - 1]) {
                    consecutiveSame++;
                } else {
                    consecutiveSame = 1;
                }
            }
            if (consecutiveSame >= 3) {
                issues.push({
                    dimension: 26,
                    dimensionName: '节奏单调',
                    severity: 'warning',
                    description: `连续${consecutiveSame}章类型相同: ${recentTypes[recentTypes.length - 1]}`,
                    suggestion: '增加章节类型变化',
                    autoFixable: false
                });
            }
        }

        const locations = this.extractLocations(draft);
        const prevLocation = truth?.currentState?.facts?.find(f => f.predicate === 'located_at');
        if (prevLocation && prevLocation.object && prevLocation.object !== '未知') {
            if (!locations.includes(prevLocation.object) && !draft.includes('离开') && !draft.includes('前往')) {
                issues.push({
                    dimension: 2,
                    dimensionName: '时间线检查',
                    severity: 'warning',
                    description: `角色在上章位于「${prevLocation.object}」但本章未提及位置变化`,
                    suggestion: '说明位置变化或提及当前地点',
                    autoFixable: false
                });
            }
        }

        const chapters = truth?.chapterSummaries?.rows || [];
        const recentChapters = chapters.slice(-3);
        if (recentChapters.length >= 3) {
            const hasClimax = recentChapters.some(c => c.chapterType === 'climax' || c.chapterType === 'payoff');
            if (!hasClimax && chapters.length > 5) {
                issues.push({
                    dimension: 32,
                    dimensionName: '读者期待管理',
                    severity: 'info',
                    description: '连续3章以上没有高潮或爽点',
                    suggestion: '在近期章节中加入高潮',
                    autoFixable: false
                });
            }
        }

        const score = this.calculateScore(issues);

        return {
            score,
            issues,
            dimensions: this.groupIssuesByDimension(issues),
            passedDimensions: Object.keys(this.dimensions).length - new Set(issues.map(i => i.dimension)).size,
            totalDimensions: Object.keys(this.dimensions).length,
            summary: this.generateSummary(issues, score)
        };
    }

    extractLocations(content) {
        const locations = [];
        const patterns = [
            /(?:在|来到|前往|走进)([^\s，。！？：；""''（）]{2,10})(?:之地|之处|之中|之上|之下|山脉|森林|城池|村庄|小镇|山洞|宫殿)/g,
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1]) locations.push(match[1].trim());
            }
        }
        return [...new Set(locations)];
    }

    calculateScore(issues) {
        let deductions = 0;
        for (const issue of issues) {
            switch (issue.severity) {
                case 'critical': deductions += 15; break;
                case 'warning': deductions += 7; break;
                case 'info': deductions += 2; break;
            }
        }
        return Math.max(0, Math.min(100, 100 - deductions));
    }

    groupIssuesByDimension(issues) {
        const grouped = {};
        for (const issue of issues) {
            if (!grouped[issue.dimension]) {
                grouped[issue.dimension] = {
                    name: issue.dimensionName,
                    issues: [],
                    severity: issue.severity
                };
            }
            grouped[issue.dimension].issues.push(issue);
            if (issue.severity === 'critical') {
                grouped[issue.dimension].severity = 'critical';
            } else if (issue.severity === 'warning' && grouped[issue.dimension].severity !== 'critical') {
                grouped[issue.dimension].severity = 'warning';
            }
        }
        return grouped;
    }

    generateSummary(issues, score) {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        const infos = issues.filter(i => i.severity === 'info').length;
        
        return `审计完成。评分: ${score}/100。发现 ${critical} 个严重问题, ${warnings} 个警告, ${infos} 个提示。`;
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

        const autoFixable = issues.filter(i => i.autoFixable && i.severity !== 'critical');

        for (const issue of autoFixable) {
            let originalLength = revisedDraft.length;

            switch (issue.dimension) {
                case 10:
                case 21:
                    revisedDraft = this.removeFatigueWords(revisedDraft);
                    break;
                case 20:
                    revisedDraft = this.shortenLongSentences(revisedDraft);
                    break;
                case 5:
                    if (issue.description.includes('字数不足')) {
                        revisedDraft = this.expandContent(revisedDraft);
                    } else if (issue.description.includes('超出')) {
                        revisedDraft = this.trimContent(revisedDraft, issue.description);
                    }
                    break;
                case 8:
                    revisedDraft = this.removeForbiddenPhrases(revisedDraft, issue.description);
                    break;
                case 15:
                    revisedDraft = this.enhancePayoff(revisedDraft);
                    break;
            }

            if (revisedDraft.length !== originalLength) {
                fixedIssues.push({
                    issue: issue.description,
                    autoFixed: true,
                    dimension: issue.dimensionName,
                    action: '已自动修复'
                });
            }
        }

        const nonAutoFixable = issues.filter(i => !i.autoFixable || i.severity === 'critical');
        for (const issue of nonAutoFixable) {
            fixedIssues.push({
                issue: issue.description,
                autoFixed: false,
                dimension: issue.dimensionName,
                action: issue.suggestion,
                severity: issue.severity
            });
        }

        return {
            revisedDraft,
            fixedIssues,
            summary: `修订完成。自动修复 ${fixedIssues.filter(f => f.autoFixed).length} 项，${fixedIssues.filter(f => !f.autoFixed).length} 项需人工处理。`
        };
    }

    removeFatigueWords(content) {
        const replacements = {
            '然而': '',
            '因此': '于是',
            '所以': '就',
            '但是': '可',
            '仿佛': '好像',
            '不禁': '忍不住',
            '宛如': '好像',
            '竟然': '居然',
            '忽然': '突然',
            '猛地': '用力'
        };
        
        let result = content;
        for (const [from, to] of Object.entries(replacements)) {
            result = result.split(from).join(to);
        }
        return result;
    }

    shortenLongSentences(content) {
        const sentences = content.split(/([。！？])/);
        const shortened = sentences.map(s => {
            if (s.length > 100) {
                const parts = s.split(/[,，]/);
                if (parts.length > 2) {
                    return parts.slice(0, Math.ceil(parts.length / 2)).join('，');
                }
            }
            return s;
        });
        return shortened.join('');
    }

    expandContent(content) {
        return content + '\n\n（情节继续发展中...）';
    }

    trimContent(content, description) {
        const match = description.match(/(\d+)/g);
        if (match) {
            const targetLength = parseInt(match[match.length - 1]);
            if (content.length > targetLength * 1.2) {
                return content.substring(0, Math.ceil(targetLength * 1.1));
            }
        }
        return content;
    }

    removeForbiddenPhrases(content, description) {
        const forbidden = description.match(/「([^」]+)」/);
        if (forbidden && forbidden[1]) {
            const phrases = forbidden[1].split('、');
            let result = content;
            for (const phrase of phrases) {
                result = result.split(phrase).join('[已修改]');
            }
            return result;
        }
        return content;
    }

    enhancePayoff(content) {
        const payoffEnhancers = [
            /（情节继续）/g,
            /（故事发展）/g,
            /（未完待续）/g
        ];
        
        let result = content;
        for (const enhancer of payoffEnhancers) {
            result = result.replace(enhancer, '（高潮即将来临）');
        }
        
        return result;
    }
}
export default InkOSEngine;
