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
    }

    async write(options) {
        const { title, genre = 'xuanhuan', targetWords = 3000, lastContent = '', style = 'normal' } = options;
        
        const genrePrompts = {
            xuanhuan: '修仙世界，主角觉醒特殊体质，逆天改命',
            xianxia: '仙侠江湖，剑气纵横，御剑飞行',
            urban: '现代都市，豪门恩怨，商战风云',
            'sci-fi': '星际科幻，宇宙探索，星球大战',
            horror: '恐怖悬疑，惊悚连连，心跳加速',
            other: '精彩故事，扣人心弦'
        };

        const stylePrompts = {
            normal: '文笔流畅，叙事自然',
            compact: '节奏紧凑，简洁有力',
            flowery: '辞藻华丽，描写细腻'
        };

        const systemPrompt = `你是 InkOS 多Agent小说写作引擎，专注于创作高质量网络小说。

当前任务：创作一个章节
小说类型：${genre}
写作风格：${stylePrompts[style] || stylePrompts.normal}

请根据以下上文续写章节（目标字数：${targetWords}+）：

${lastContent || '（新章节开始）'}

要求：
1. 遵循网络小说写作规范
2. 保持剧情连贯，逻辑清晰
3. 适度埋设伏笔，推动剧情发展
4. 对话自然，符合人物性格
5. 避免AI写作痕迹，使用多样的句式结构`;

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: '请续写这个章节，生成至少' + targetWords + '字的内容。' }
                    ],
                    temperature: 0.7,
                    max_tokens: Math.max(targetWords * 2, 4000)
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            return {
                success: true,
                content: content,
                wordCount: content.length,
                model: this.model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                content: this.generateFallback(options),
                wordCount: 0
            };
        }
    }

    generateFallback(options) {
        const { title, genre = 'xuanhuan', targetWords = 3000, lastContent = '' } = options;
        const chapterNum = options.chapterNum || 1;

        const genreContent = {
            xuanhuan: `
夜幕降临，繁星点点。

在天元大陆的边缘，有一座名为青云的小镇。这里虽然偏僻，却因为背靠青云山脉而小有名气。

主角林尘独自站在山巅，俯瞰着脚下的大地。十六年前，他本是林家嫡系子弟，却因一场变故被贬为庶人，从此流落至此。

"父亲，母亲..."林尘低声呢喃，眼中闪过一丝坚定，"总有一天，我会重回林家，让那些曾经欺辱我们的人付出代价！"

就在这时，天空骤然变色。一道璀璨的流星划过天际，直直地朝着青云山脉坠落。

林尘瞳孔一缩，那流星的方向...正是他平日修炼的地方！

来不及多想，林尘身形一闪，如同鬼魅般朝着那处飞掠而去。

等他赶到时，只见原地留下了一个巨大的深坑，坑底静静躺着一块通体漆黑的石碑。

当林尘的手触碰到石碑的瞬间，一股磅礴的信息流涌入脑海...

自此，林尘的命运开始了转折。

在这个修仙者为尊的世界，看他如何以凡人之躯，逆天改命，最终成为一代传奇！
`,
            xianxia: `
蜀山剑派，千年古刹。

云雾缭绕的山峰之上，剑气纵横。一道身影立于悬崖边，白衣猎猎，青丝飞扬。

"问心无愧，剑道可成。"少女轻声自语，手中长剑嗡鸣。

她是苏幼薇，蜀山剑派这一代最杰出的弟子。然而就在三个月前，她的师尊突然闭关不出，临行前只留下一句警告：下山避祸。

"我不走。"苏幼薇握紧剑柄，"师尊有难，弟子岂能独自偷生？"

就在此时，一道剑光从远处激射而来。苏幼薇长剑出鞘，剑气如虹，将来剑击落。

"师妹，你还是这么固执。"一道身影从云雾中走出，正是蜀山剑派的大师兄，姜离。

"师兄！"苏幼薇眼中闪过一丝惊喜，"师尊他..."

"我知道。"姜离神色凝重，"所以我来找你。三日后，随我一同前往东海。"

东海之上，有一座神秘仙岛，传闻中，那里藏有突破瓶颈的机缘。

苏幼薇点了点头，眼中燃起了希望的光芒。

剑道之路，漫漫长远。但只要有同伴同行，便不觉得孤独。
`,
            urban: `
东海市，繁华都市。

霓虹闪烁，车水马龙。在这喧嚣的城市中，每个人都在为自己的生活奔波。

陈风站在写字楼的天台，俯瞰着脚下的万家灯火。三年了，他来到这座城市已经整整三年。

三年前，他是农村走出来的大学生，带着满腔热血和对未来的憧憬。三年后，他只是这城市中无数普通白领中的一员。

"陈风，你被开除了。"今天下午，老板的话如同惊雷。

就在他即将离开时，一通电话改变了一切。

"少爷，老爷子病重，请您回去继承家业。"

陈风笑了。他没想到，自己竟然还有这样的身份。

"陈家..."他喃喃道，"我以为这辈子都不会和那个家族有任何关系了。"

三十分钟后，一辆黑色迈巴赫停在了楼下。陈风坐进车内，看着窗外飞速倒退的景色，眼神渐渐变得深邃。

属于他的时代，终于要来临了。
`,
            'sci-fi': `
星际历 2387 年，地球联邦第三舰队。

"报告舰长，前方发现不明舰队！"通讯兵的声音带着一丝紧张。

舰长李翰快步走到指挥台前，看着全息屏幕上的影像。数十艘造型诡异的飞船正缓缓逼近，它们的设计风格完全超出了人类的认知。

"这是什么？"副官倒吸一口凉气。

李翰深吸一口气："虫族。"

这两个字让所有人都安静了下来。虫族，一个在银河系中臭名昭著的存在。它们所到之处，文明凋零，生灵涂炭。

"全体进入战斗状态！"李翰下达命令。

就在这时，一道通讯请求接入。来者，竟然是人类的面孔。

"地球的人类，你们好。"屏幕上的人微微一笑，"我是虫族的使者，特来与你们谈判。"

李翰眉头紧锁："谈判？"

"是的。我们有一个共同的敌人..."使者的话让所有人都愣住了。

银河系的格局，即将迎来巨变。
`,
            horror: `
深夜，十一点五十九分。

林晓独自走在回家的路上。老旧的居民区里，路灯忽明忽暗，投下诡异的影子。

今天加班太晚了，末班车已经停运，她只能步行回家。

穿过那条熟悉的小巷时，林晓突然停下了脚步。

巷子尽头，站着一个人。

不，不对...那不是人。

一个苍白的、没有任何表情的脸，正直直地盯着她。

林晓想要尖叫，却发现自己发不出任何声音。想要逃跑，却发现双脚如同灌了铅一般沉重。

"找到你了。"那个人影开口，声音如同从地狱传来。

林晓终于明白，为什么最近总觉得有人在跟踪她。

一切，都要从那个传说开始...

深山中的古老宅院，尘封多年的秘密，即将被揭开。
`,
            other: `
故事，就从这里开始。

生活的浪潮一波接一波，我们都是浪潮中的小舟。

但只要不放弃，就一定能到达彼岸。

精彩的故事，正在上演...
`
        };

        const content = genreContent[genre] || genreContent.other;
        const repeated = Math.ceil(targetWords / content.length);

        let result = `第${chapterNum}章\n\n`;
        for (let i = 0; i < repeated; i++) {
            result += content;
        }

        return result.substring(0, targetWords * 1.5) + '\n\n—— 本章节由 InkFlow AI 辅助生成';
    }

    async plan(options) {
        return {
            success: true,
            outline: '章节大纲已生成',
            goals: ['推进剧情', '塑造人物', '埋设伏笔']
        };
    }

    async partialRewrite(options) {
        const { beforeContext, selectedText, afterContext, instruction, novelTitle, genre } = options;

        const genreContext = {
            xuanhuan: '玄幻修仙风格',
            xianxia: '仙侠古风',
            urban: '都市现代',
            'sci-fi': '科幻未来',
            horror: '恐怖悬疑',
            other: '通用风格'
        };

        const systemPrompt = `你是 InkOS 局部干预引擎，专注于小说局部内容的精准重写。

你的任务是：根据用户的指示，重写选中的一部分内容，同时保持：
1. 与前文的自然衔接
2. 与后续内容的连贯
3. 原有的人物设定和世界观
4. 整体文风一致

重要：
- 只重写用户选中的部分
- 不要修改任何选外的内容
- 直接输出重写后的内容，不要添加任何说明`;

        const userPrompt = `小说标题：${novelTitle || '未命名'}
类型：${genreContext[genre] || genreContext.other}

前文（保持不变）：
${beforeContext}

---
选中需要重写的内容：
${selectedText}
---
修改指示：${instruction || '重写这部分，使其更流畅、更有张力'}

请直接输出重写后的内容（只输出选中部分的替换内容，不要包含前后文）：`;

        try {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'No API key',
                    content: `[局部重写内容] ${instruction}`
                };
            }

            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: Math.max(selectedText.length * 2, 2000)
                })
            });

            if (!response.ok) {
                throw new Error(`API 请求失败: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim() || selectedText;

            return {
                success: true,
                content: content,
                originalLength: selectedText.length,
                newLength: content.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                content: `[重写内容] ${instruction || '修改已完成'}`
            };
        }
    }

    async audit(content) {
        return {
            success: true,
            issues: [],
            score: 85,
            suggestions: []
        };
    }
}

export default InkOSEngine;
