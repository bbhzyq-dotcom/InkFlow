export class StyleAnalyzer {
    analyze(content) {
        const sentences = this.extractSentences(content);
        const words = this.extractWords(content);
        const paragraphs = this.extractParagraphs(content);

        return {
            sentenceStats: this.analyzeSentences(sentences),
            wordStats: this.analyzeWords(words),
            paragraphStats: this.analyzeParagraphs(paragraphs),
            dialogueRatio: this.calculateDialogueRatio(content),
            styleMarkers: this.detectStyleMarkers(content),
            fatigueWords: this.detectFatigueWords(content),
            fingerprint: this.generateFingerprint(sentences, words, paragraphs)
        };
    }

    extractSentences(content) {
        return content.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    }

    extractWords(content) {
        const chineseWords = content.match(/[\u4e00-\u9fff]+/g) || [];
        return chineseWords;
    }

    extractParagraphs(content) {
        return content.split(/\n\n+/).filter(p => p.trim().length > 0);
    }

    analyzeSentences(sentences) {
        const lengths = sentences.map(s => s.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length || 0;

        const shortSentences = sentences.filter(s => s.length < 20).length;
        const longSentences = sentences.filter(s => s.length > 100).length;

        const variance = this.calculateVariance(lengths);

        return {
            count: sentences.length,
            avgLength: Math.round(avgLength),
            shortRatio: Math.round((shortSentences / sentences.length) * 100) || 0,
            longRatio: Math.round((longSentences / sentences.length) * 100) || 0,
            variance: Math.round(variance),
            minLength: Math.min(...lengths) || 0,
            maxLength: Math.max(...lengths) || 0
        };
    }

    analyzeWords(words) {
        const frequency = {};
        for (const word of words) {
            frequency[word] = (frequency[word] || 0) + 1;
        }

        const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
        const topWords = sorted.slice(0, 20).map(([word, count]) => ({ word, count }));

        const uniqueRatio = new Set(words).size / words.length || 0;

        return {
            total: words.length,
            unique: new Set(words).size,
            uniqueRatio: Math.round(uniqueRatio * 100),
            topWords
        };
    }

    analyzeParagraphs(paragraphs) {
        const lengths = paragraphs.map(p => p.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length || 0;

        return {
            count: paragraphs.length,
            avgLength: Math.round(avgLength)
        };
    }

    calculateDialogueRatio(content) {
        const dialogueMatches = content.match(/[""''「」『』【】].{2,}/g) || [];
        const dialogueChars = dialogueMatches.join('').length;
        return Math.round((dialogueChars / content.length) * 100) || 0;
    }

    detectStyleMarkers(content) {
        const markers = {
            descriptive: ['只见', '映入眼帘', '放眼望去', '远远望去', '俯瞰', '仰望'],
            action: ['猛地', '骤然', '霎时', '顿时', '蓦然', '忽地'],
            emotional: ['心中暗想', '暗自思忖', '心想', '不觉', '只觉得'],
            transition: ['却说', '话说', '且说', '不提', '却说'],
            poetic: ['但见', '只见得', '恰似', '宛然', '仿佛']
        };

        const detected = {};
        for (const [type, words] of Object.entries(markers)) {
            let count = 0;
            for (const word of words) {
                const match = content.match(new RegExp(word, 'g'));
                count += match ? match.length : 0;
            }
            detected[type] = { count, words };
        }

        return detected;
    }

    detectFatigueWords(content) {
        const fatiguePatterns = {
            transitionWords: ['然而', '但是', '因此', '所以', '不过', '然而', '紧接着', '随后'],
            aiTells: ['仿佛', '不禁', '宛如', '竟然', '忽然', '猛地', '不料', '未曾'],
            vagueWords: ['似乎', '好像', '大致', '差不多', '应该说', '可以说'],
            repetitive: ['这个', '那个', '如此', '这般', '那里', '这里']
        };

        const detected = {};
        for (const [type, words] of Object.entries(fatiguePatterns)) {
            let total = 0;
            const found = [];
            for (const word of words) {
                const match = content.match(new RegExp(word, 'g'));
                const count = match ? match.length : 0;
                if (count > 0) {
                    total += count;
                    found.push({ word, count });
                }
            }
            detected[type] = { total, words: found };
        }

        return detected;
    }

    generateFingerprint(sentences, words, paragraphs) {
        const sentenceStats = this.analyzeSentences(sentences);
        const wordStats = this.analyzeWords(words);

        return {
            avgSentenceLength: sentenceStats.avgLength,
            avgParagraphLength: Math.round(paragraphs.reduce((a, b) => a + b.length, 0) / paragraphs.length || 0),
            dialogueRatio: this.calculateDialogueRatio(sentences.join('')),
            uniqueWordRatio: wordStats.uniqueRatio,
            shortSentenceRatio: sentenceStats.shortRatio,
            description: this.describeStyle(sentenceStats, wordStats)
        };
    }

    describeStyle(sentenceStats, wordStats) {
        const descriptions = [];

        if (sentenceStats.avgLength > 50) {
            descriptions.push('句子较长，偏书面化');
        } else if (sentenceStats.avgLength < 20) {
            descriptions.push('句子较短，快节奏');
        } else {
            descriptions.push('句长适中');
        }

        if (sentenceStats.shortRatio > 40) {
            descriptions.push('短句较多，节奏紧凑');
        }

        if (wordStats.uniqueRatio > 70) {
            descriptions.push('词汇丰富');
        } else if (wordStats.uniqueRatio < 40) {
            descriptions.push('词汇重复较多');
        }

        return descriptions.join('；') || '文风平衡';
    }

    calculateVariance(numbers) {
        if (numbers.length === 0) return 0;
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    }

    createStyleBrief(existingStyle, targetStyle) {
        const briefs = {
            xuanhuan: {
                keywords: ['修炼', '突破', '机缘', '战斗', '逆袭', '成长'],
                forbidden: ['过于日常', '现代用语', '科技词汇'],
                pacing: '快节奏，主角成长迅速',
                focus: ['主角修炼', '境界突破', '战斗场面']
            },
            xianxia: {
                keywords: ['剑道', '仙门', '飞剑', '心境', '渡劫'],
                forbidden: ['都市生活', '现代词汇'],
                pacing: '中慢节奏，注重意境',
                focus: ['剑意领悟', '心境修炼', '江湖恩怨']
            },
            urban: {
                keywords: ['职场', '都市', '感情', '商战', '逆袭'],
                forbidden: ['修仙术语', '异世界设定'],
                pacing: '快节奏，情节密集',
                focus: ['主角逆袭', '感情线', '商业版图']
            },
            'sci-fi': {
                keywords: ['科技', '宇宙', '探索', '飞船', 'AI'],
                forbidden: ['古代背景', '修仙体系'],
                pacing: '中等节奏，世界观宏大',
                focus: ['科技突破', '宇宙探索', '星际战争']
            },
            horror: {
                keywords: ['恐怖', '悬疑', '惊悚', '诡异'],
                forbidden: ['轻松日常', '大量喜剧元素'],
                pacing: '慢节奏，氛围营造重要',
                focus: ['恐怖氛围', '悬念铺设', '心理描写']
            }
        };

        return briefs[targetStyle] || briefs.xuanhuan;
    }
}

export class AIGCDetector {
    detect(content) {
        const patterns = this.getDetectionPatterns();
        const issues = [];
        let totalScore = 0;

        for (const pattern of patterns) {
            const matches = content.match(pattern.regex) || [];
            const count = matches.length;
            const density = count / (content.length / 1000);

            if (density > pattern.threshold) {
                totalScore += pattern.score * Math.min(density / pattern.threshold, 3);
                issues.push({
                    type: pattern.type,
                    count,
                    density: Math.round(density * 100) / 100,
                    threshold: pattern.threshold,
                    severity: density > pattern.threshold * 2 ? 'high' : 'medium'
                });
            }
        }

        const score = Math.min(100, Math.round(totalScore));
        const risk = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';

        return {
            score,
            risk,
            issues,
            summary: this.generateSummary(score, risk, issues)
        };
    }

    getDetectionPatterns() {
        return [
            { type: 'transition_words', regex: /然而[，,]|因此[，,]|所以[，,]|但是[，,]|不过[，,]/g, threshold: 0.5, score: 15 },
            { type: 'ai_tells', regex: /仿佛|不禁|宛如|竟然|忽然|猛地/g, threshold: 0.3, score: 20 },
            { type: 'vague_descriptors', regex: /似乎|好像|大致|差不多|应该说/g, threshold: 0.4, score: 12 },
            { type: 'repeated_structures', regex: /(?:他|她|它)说[，,]/g, threshold: 0.3, score: 10 },
            { type: 'emotional_exaggeration', regex: /不禁|忍不住|不由得|只觉得/g, threshold: 0.3, score: 15 },
            { type: 'passive_voice', regex: /被[^\s，。！？]+[了所得]/g, threshold: 0.2, score: 8 },
            { type: 'nominalization', regex: /进行了|完成了|实现了|获得了/g, threshold: 0.2, score: 10 },
            { type: 'sentence_start_uniformity', regex: /(?:[他她它][^\s，。！？]+[，,])|(?:[这那][^\s，。！？]+[，，])/g, threshold: 0.5, score: 12 },
            { type: 'absolute_descriptors', regex: /极其|非常|特别|十分|相当/g, threshold: 0.3, score: 8 },
            { type: 'filler_phrases', regex: /众所周知|一般来说|首先[，,]|其次[，,]/g, threshold: 0.2, score: 10 }
        ];
    }

    generateSummary(score, risk, issues) {
        if (risk === 'low') {
            return '文本 AI 生成可能性较低，文风自然';
        }

        const topIssues = issues.sort((a, b) => b.density - a.density).slice(0, 3);
        const issueTypes = topIssues.map(i => i.type).join('、');

        return `检测到 ${topIssues.length} 个 AI 写作特征：${issueTypes}。建议使用 "去 AI 味" 功能进行改写。`;
    }
}

export class DaemonMode {
    constructor(options = {}) {
        this.novelId = options.novelId;
        this.novel = options.novel;
        this.interval = options.interval || 300000;
        this.onWrite = options.onWrite || (() => {});
        this.onNotify = options.onNotify || (() => {});
        this.running = false;
        this.timer = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.scheduleNext();
    }

    stop() {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    scheduleNext() {
        if (!this.running) return;
        this.timer = setTimeout(async () => {
            await this.executeCycle();
            this.scheduleNext();
        }, this.interval);
    }

    async executeCycle() {
        try {
            this.onNotify('info', '开始写作周期...');
            const result = await this.onWrite();
            this.onNotify('success', `完成第 ${result.chapterNumber} 章写作`);
        } catch (error) {
            this.onNotify('error', `写作失败: ${error.message}`);
        }
    }

    setInterval(ms) {
        this.interval = ms;
        if (this.running) {
            this.stop();
            this.start();
        }
    }
}

export class NotificationDispatcher {
    constructor(config = {}) {
        this.channels = config.channels || [];
    }

    async send(level, message) {
        for (const channel of this.channels) {
            try {
                await this.sendToChannel(channel, level, message);
            } catch (error) {
                console.error(`通知发送失败 (${channel.type}):`, error);
            }
        }
    }

    async sendToChannel(channel, level, message) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        switch (channel.type) {
            case 'telegram':
                await this.sendTelegram(channel, formatted);
                break;
            case 'webhook':
                await this.sendWebhook(channel, { level, message, timestamp });
                break;
            case 'console':
                console.log(formatted);
                break;
        }
    }

    async sendTelegram(channel, message) {
        const url = `https://api.telegram.org/bot${channel.token}/sendMessage`;
        const chatId = channel.chatId;

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    }

    async sendWebhook(channel, data) {
        const secret = channel.secret;

        const body = JSON.stringify(data);
        const headers = {
            'Content-Type': 'application/json'
        };

        if (secret) {
            const crypto = require('crypto');
            const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
            headers['X-Signature'] = signature;
        }

        await fetch(channel.url, {
            method: 'POST',
            headers,
            body
        });
    }
}

export default { StyleAnalyzer, AIGCDetector, DaemonMode, NotificationDispatcher };
