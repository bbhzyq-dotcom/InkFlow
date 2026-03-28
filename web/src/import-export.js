import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ImportExport {
    constructor(novelId, projectPath = null) {
        this.novelId = novelId;
        this.projectPath = projectPath || join(process.cwd(), 'web', 'data', 'projects', novelId);
        this.chaptersDir = join(this.projectPath, 'chapters');
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!existsSync(this.chaptersDir)) {
            mkdirSync(this.chaptersDir, { recursive: true });
        }
    }

    importChapters(content, options = {}) {
        const splitPattern = options.splitPattern || /(?:第[一二三四五六七八九十百千\d]+章|Chapter\s+\d+)/i;
        const resumeFrom = options.resumeFrom || 0;

        const parts = content.split(splitPattern).filter(p => p.trim().length > 0);
        const chapters = [];

        for (let i = 0; i < parts.length; i++) {
            const chapterNum = i + 1;
            if (chapterNum <= resumeFrom) continue;

            const chapterContent = parts[i].trim();
            const titleMatch = chapterContent.match(/^[\s\S]{1,50}/);
            const title = titleMatch ? titleMatch[0].substring(0, 30).trim() : '第' + chapterNum + '章';

            const cleanedContent = this.cleanChapterContent(chapterContent);

            chapters.push({
                id: Date.now().toString(36) + '_' + i,
                number: chapterNum,
                title: title,
                content: cleanedContent,
                wordCount: cleanedContent.length,
                status: 'imported',
                importedAt: new Date().toISOString()
            });
        }

        return {
            imported: chapters.length,
            chapters: chapters,
            firstChapter: chapters[0] || null
        };
    }

    cleanChapterContent(content) {
        let cleaned = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').replace(/^\s+$/gm, '').trim();
        return cleaned;
    }

    analyzeImportedContent(content) {
        const analysis = {
            totalCharacters: content.length,
            chaptersEstimate: this.estimateChapterCount(content),
            genres: this.detectGenre(content),
            tone: this.analyzeTone(content),
            sampleSize: Math.min(5000, content.length)
        };
        return analysis;
    }

    estimateChapterCount(content) {
        const markers = content.match(/(?:第[一二三四五六七八九十百千\d]+章|Chapter\s+\d+)/gi) || [];
        if (markers.length > 0) {
            return markers.length;
        }
        return Math.ceil(content.length / 3000);
    }

    detectGenre(content) {
        const sample = content.substring(0, 5000);
        const genreIndicators = {
            xuanhuan: ['修炼', '灵力', '筑基', '金丹', '元婴', '飞升', '丹田', '经脉', '功法', '秘籍', '魔帝', '神体', '血脉'],
            xianxia: ['剑道', '御剑', '剑气', '剑意', '仙门', '修仙', '渡劫', '天劫', '凡人流', '蜀山', '昆仑', '蓬莱'],
            urban: ['总裁', '豪门', '都市', '董事长', 'CEO', '创业', '商战', '房价', '职场', '白领'],
            'sci-fi': ['飞船', '星际', '宇宙', 'AI', '机器人', '星际飞船', '外星人', '维度', '量子', '星系', '赛博', '黑客'],
            horror: ['恐怖', '惊悚', '鬼', '幽灵', '诡异', '惊魂', '灵异', '死亡', '凶杀', '悬疑'],
            romance: ['爱', '情', '甜蜜', '恋爱', '追求', '表白', '约会', '心动的', '暧昧', '怦然']
        };

        const scores = {};
        for (const [genre, keywords] of Object.entries(genreIndicators)) {
            let score = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'g');
                const matches = sample.match(regex);
                if (matches) score += matches.length;
            }
            scores[genre] = score;
        }

        const sortedGenres = Object.entries(scores).sort(function(a, b) { return b[1] - a[1]; });
        const top = sortedGenres[0];
        return {
            primary: top ? top[0] : 'other',
            scores: scores,
            confidence: top && top[1] > 0 ? top[1] / content.length * 1000 : 0
        };
    }

    analyzeTone(content) {
        const sample = content.substring(0, 5000);
        const tones = {
            serious: ['严肃', '沉重', '深刻', '认真', '庄严', '肃穆'],
            light: ['轻松', '愉快', '欢快', '搞笑', '幽默', '诙谐'],
            tense: ['紧张', '悬疑', '惊险', '危机', '紧迫', '危急'],
            romantic: ['甜蜜', '温馨', '柔情', '浪漫', '浓情', '爱意'],
            dark: ['黑暗', '阴森', '恐怖', '压抑', '绝望', '残酷']
        };

        const scores = {};
        for (const [tone, keywords] of Object.entries(tones)) {
            let score = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'g');
                const matches = sample.match(regex);
                if (matches) score += matches.length;
            }
            scores[tone] = score;
        }

        const sorted = Object.entries(scores).sort(function(a, b) { return b[1] - a[1]; });
        const dominant = sorted[0];
        return {
            tone: dominant ? dominant[0] : 'neutral',
            scores: scores
        };
    }

    exportToTxt(chapters) {
        let content = '';
        for (const chapter of chapters) {
            if (chapter.status === 'approved' || chapter.status === 'imported') {
                content += chapter.title + '\n\n';
                content += chapter.content;
                content += '\n\n\n';
            }
        }
        return content;
    }

    exportToMd(chapters, novelInfo) {
        let content = '# ' + novelInfo.title + '\n\n';
        content += '> ' + (novelInfo.genre || '原创小说') + '\n\n';
        content += '---\n\n';

        for (const chapter of chapters) {
            if (chapter.status === 'approved' || chapter.status === 'imported') {
                content += '## ' + chapter.title + '\n\n';
                content += chapter.content;
                content += '\n\n---\n\n';
            }
        }

        content += '\n---\n\n*本书由 InkFlow AI 辅助创作*';
        return content;
    }

    exportToEpub(chapters, novelInfo) {
        const chaptersContent = chapters
            .filter(function(ch) { return ch.status === 'approved' || ch.status === 'imported'; })
            .map(function(ch, idx) {
                return {
                    title: ch.title,
                    content: this.convertToXhtml(ch.content),
                    level: idx + 1
                };
            }.bind(this));

        const toc = chaptersContent.map(function(ch, idx) {
            return '    <navPoint id="navpoint-' + (idx + 1) + '" playOrder="' + (idx + 1) + '">\n      <navLabel><text>' + this.escapeXml(ch.title) + '</text></navLabel>\n      <content src="chapter_' + (idx + 1) + '.xhtml"/>\n    </navPoint>';
        }.bind(this)).join('\n');

        const chaptersXhtml = chaptersContent.map(function(ch, idx) {
            return '  <chapter id="chapter' + (idx + 1) + '" href="chapter_' + (idx + 1) + '.xhtml" media-type="application/xhtml+xml">\n    <section id="chapter_' + (idx + 1) + '" toc="navpoint-' + (idx + 1) + '">\n      <title>' + this.escapeXml(ch.title) + '</title>\n' + ch.content + '\n    </section>\n  </chapter>';
        }.bind(this)).join('\n');

        const htmlContent = chapters.map(function(ch) {
            return '<p>' + ch.content.replace(/\n/g, '</p><p>') + '</p>';
        }.bind(this)).join('');

        return '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>\n\n<?xml version="1.0" encoding="UTF-8"?>\n<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:title>' + this.escapeXml(novelInfo.title) + '</dc:title>\n    <dc:language>zh-CN</dc:language>\n    <dc:creator>InkFlow</dc:creator>\n    <dc:publisher>InkFlow</dc:publisher>\n    <dc:identifier id="BookId">urn:uuid:' + Date.now() + '</dc:identifier>\n  </metadata>\n  <manifest>\n    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n    <item id="html" href="content.xhtml" media-type="application/xhtml+xml"/>\n' + chaptersXhtml + '\n  </manifest>\n  <spine toc="ncx">\n    <itemref idref="html"/>\n  </spine>\n</package>\n\n<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">\n  <head>\n    <meta name="dtb:uid" content="urn:uuid:' + Date.now() + '"/>\n  </head>\n  <docTitle><text>' + this.escapeXml(novelInfo.title) + '</text></docTitle>\n  <navMap>\n' + toc + '\n  </navMap>\n</ncx>\n\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>' + this.escapeXml(novelInfo.title) + '</title></head>\n<body>\n<h1>' + this.escapeXml(novelInfo.title) + '</h1>\n' + htmlContent + '\n</body>\n</html>';
    }

    convertToXhtml(content) {
        const paragraphs = content.split(/\n\n+/);
        const xhtml = paragraphs.map(function(p) {
            return '<p>' + this.escapeXml(p) + '</p>';
        }.bind(this)).join('\n      ');
        return '    ' + xhtml;
    }

    escapeXml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    generateSnapshot(chapters, chapterNum) {
        const chapter = chapters.find(function(c) { return c.number === chapterNum; });
        if (!chapter) return null;

        const snapshot = {
            version: Date.now(),
            chapterNumber: chapterNum,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
            status: chapter.status,
            truthFiles: this.loadCurrentTruthSnapshot(),
            timestamp: new Date().toISOString()
        };

        const snapshotDir = join(this.projectPath, 'snapshots');
        if (!existsSync(snapshotDir)) {
            mkdirSync(snapshotDir, { recursive: true });
        }

        const snapshotPath = join(snapshotDir, 'chapter_' + chapterNum + '_' + Date.now() + '.json');
        writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

        return {
            path: snapshotPath,
            snapshot: snapshot
        };
    }

    loadCurrentTruthSnapshot() {
        const stateDir = join(this.projectPath, 'story', 'state');
        const snapshot = {};

        var files = ['current_state.json', 'hooks.json', 'chapter_summaries.json', 'particle_ledger.json', 'subplot_board.json', 'emotional_arcs.json', 'character_matrix.json'];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var path = join(stateDir, file);
            if (existsSync(path)) {
                try {
                    snapshot[file.replace('.json', '')] = JSON.parse(readFileSync(path, 'utf-8'));
                } catch (e) {
                    // ignore
                }
            }
        }

        return snapshot;
    }

    rollbackToSnapshot(chapters, snapshotData) {
        var chapterIndex = -1;
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].number === snapshotData.chapterNumber) {
                chapterIndex = i;
                break;
            }
        }

        if (chapterIndex === -1) {
            return { success: false, error: '章节不存在' };
        }

        chapters[chapterIndex].content = snapshotData.content;
        chapters[chapterIndex].wordCount = snapshotData.content.length;
        chapters[chapterIndex].status = 'draft';
        chapters[chapterIndex].restoredFrom = snapshotData.timestamp;

        return {
            success: true,
            chapter: chapters[chapterIndex],
            restoredTruthFiles: snapshotData.truthFiles
        };
    }

    listSnapshots() {
        const snapshotDir = join(this.projectPath, 'snapshots');
        if (!existsSync(snapshotDir)) {
            return [];
        }

        var files = readdirSync(snapshotDir).filter(function(f) { return f.endsWith('.json'); });

        return files.map(function(f) {
            var data = JSON.parse(readFileSync(join(snapshotDir, f), 'utf-8'));
            return {
                file: f,
                chapterNumber: data.chapterNumber,
                title: data.title,
                wordCount: data.wordCount,
                timestamp: data.timestamp
            };
        }).sort(function(a, b) { return b.timestamp - a.timestamp; });
    }
}

export default ImportExport;
