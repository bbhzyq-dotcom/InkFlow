const App = {
    currentView: 'dashboard',
    currentNovel: null,
    currentChapter: null,
    novels: [],
    isWriting: false,
    
    init() {
        this.setupNavigation();
        this.loadData();
        ThemeManager.init();
        this.checkStatus();
    },
    
    setupNavigation() {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
    },
    
    switchView(viewName) {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.remove('active', 'show');
        });
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('show', 'active');
        }
        
        this.currentView = viewName;
        
        if (viewName === 'novel-manager') {
            this.renderNovels();
        } else if (viewName === 'dashboard') {
            this.renderDashboard();
        }
    },
    
    async checkStatus() {
        try {
            const status = await ApiClient.status();
            console.log('InkFlow 状态:', status);
        } catch (error) {
            console.log('状态检查失败');
        }
    },
    
    async loadData() {
        try {
            this.novels = await ApiClient.novels.list();
            this.renderDashboard();
        } catch (error) {
            console.log('加载数据失败:', error);
            this.novels = [];
        }
    },
    
    renderDashboard() {
        const stats = {
            novels: this.novels.length,
            chapters: this.novels.reduce((sum, n) => sum + (n.chapterCount || 0), 0),
            words: this.novels.reduce((sum, n) => sum + (n.wordCount || 0), 0),
            today: 0
        };
        
        document.getElementById('stat-novels').textContent = stats.novels;
        document.getElementById('stat-chapters').textContent = stats.chapters;
        document.getElementById('stat-words').textContent = this.formatNumber(stats.words);
        document.getElementById('stat-today').textContent = this.formatNumber(stats.today);
        
        this.renderRecentNovels();
    },
    
    renderRecentNovels() {
        const container = document.getElementById('recent-novels');
        
        if (this.novels.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-title">暂无创作记录</div>
                    <div class="empty-state-desc">开始您的第一个小说项目吧</div>
                    <button class="btn btn-primary" onclick="App.showCreateNovelModal()">创建小说</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.novels.slice(0, 5).map(novel => `
            <div class="novel-item" onclick="App.openNovel('${novel.id}')">
                <div class="novel-cover">📖</div>
                <div class="novel-info">
                    <div class="novel-title">${novel.title}</div>
                    <div class="novel-meta">
                        <span>${this.getGenreText(novel.genre)}</span>
                        <span>${novel.chapterCount || 0} 章</span>
                        <span>${this.formatNumber(novel.wordCount || 0)} 字</span>
                    </div>
                </div>
                <span class="novel-status ${novel.status || 'writing'}">${this.getStatusText(novel.status)}</span>
            </div>
        `).join('');
    },
    
    renderNovels() {
        const container = document.getElementById('novel-grid');
        
        if (this.novels.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-title">还没有小说</div>
                    <div class="empty-state-desc">创建您的第一本小说，开始创作之旅</div>
                    <button class="btn btn-primary" onclick="App.showCreateNovelModal()">创建小说</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.novels.map(novel => `
            <div class="novel-card" onclick="App.openNovel('${novel.id}')">
                <div class="novel-card-cover">${this.getGenreEmoji(novel.genre)}</div>
                <div class="novel-card-body">
                    <div class="novel-card-title">${novel.title}</div>
                    <div class="novel-card-genre">${this.getGenreText(novel.genre)}</div>
                    <div class="novel-card-stats">
                        <span>${novel.chapterCount || 0} 章</span>
                        <span>${this.formatNumber(novel.wordCount || 0)} 字</span>
                    </div>
                </div>
                <div class="novel-card-footer">
                    <button class="novel-card-btn primary" onclick="event.stopPropagation();App.openNovel('${novel.id}')">写作</button>
                    <button class="novel-card-btn secondary" onclick="event.stopPropagation();App.deleteNovel('${novel.id}')">删除</button>
                </div>
            </div>
        `).join('');
    },
    
    showCreateNovelModal() {
        const title = prompt('请输入小说标题：');
        if (!title) return;
        
        const genre = prompt('请输入小说类型（xuanhuan/xianxia/urban/sci-fi/horror/other，默认：xuanhuan）：') || 'xuanhuan';
        
        this.createNovel({ title, genre });
    },
    
    async createNovel(data) {
        try {
            const novel = await ApiClient.novels.create(data);
            this.novels.push(novel);
            this.renderDashboard();
            this.renderNovels();
            alert(`小说「${novel.title}」创建成功！`);
        } catch (error) {
            alert('创建失败：' + error.message);
        }
    },
    
    continueLastWriting() {
        if (this.novels.length === 0) {
            alert('暂无小说，请先创建一本小说');
            return;
        }
        const lastNovel = this.novels[this.novels.length - 1];
        this.openNovel(lastNovel.id);
    },
    
    showImportModal() {
        const content = prompt('请粘贴要导入的文本内容：');
        if (!content) return;
        
        const title = prompt('请输入小说标题：');
        if (!title) return;
        
        const genre = prompt('请输入小说类型（xuanhuan/xianxia/urban/sci-fi/horror/romance/litpg/other，默认：xuanhuan）：') || 'xuanhuan';
        
        this.createNovelWithImport({ title, genre, content });
    },
    
    async createNovelWithImport(data) {
        try {
            const novel = await ApiClient.novels.create({ title: data.title, genre: data.genre });
            
            const response = await fetch(`/api/novels/${novel.id}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: data.content })
            });
            
            const result = await response.json();
            
            this.novels.push(novel);
            this.renderDashboard();
            this.renderNovels();
            
            alert(`导入成功！\n小说「${novel.title}」\n导入章节：${result.imported || 0} 个`);
        } catch (error) {
            alert('导入失败：' + error.message);
        }
    },
    
    async openNovel(novelId) {
        try {
            this.currentNovel = await ApiClient.novels.get(novelId);
            const chapters = await ApiClient.novels.chapters(novelId);
            this.currentNovel.chapters = chapters;
            
            document.getElementById('editor-novel-title').textContent = this.currentNovel.title;
            this.renderChapterList();
            this.switchView('chapter-editor');
            
            if (chapters.length > 0) {
                this.openChapter(chapters[chapters.length - 1].id);
            }
        } catch (error) {
            alert('打开失败：' + error.message);
        }
    },
    
    renderChapterList() {
        const container = document.getElementById('chapter-list');
        const chapters = this.currentNovel?.chapters || [];
        
        if (chapters.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无章节，点击下方按钮创建</div>';
            return;
        }
        
        container.innerHTML = chapters.map((ch, idx) => `
            <div class="chapter-item ${ch.id === this.currentChapter?.id ? 'active' : ''}" onclick="App.openChapter('${ch.id}')">
                <div class="chapter-num">${ch.number || idx + 1}</div>
                <div class="chapter-info">
                    <div class="chapter-title">${ch.title || '第' + (ch.number || idx + 1) + '章'}</div>
                    <div class="chapter-words">${this.formatNumber(ch.wordCount || 0)} 字</div>
                </div>
            </div>
        `).join('');
    },
    
    async openChapter(chapterId) {
        const chapter = this.currentNovel?.chapters?.find(c => c.id === chapterId);
        if (chapter) {
            this.currentChapter = chapter;
            document.getElementById('chapter-content').value = chapter.content || '';
            document.getElementById('current-chapter-num').textContent = chapter.number || '-';
            document.getElementById('current-chapter-words').textContent = this.formatNumber(chapter.wordCount || 0);
            this.updateWordCount();
            this.renderChapterList();
            this.loadTruthFiles();
            
            document.getElementById('editor-novel-title').textContent = 
                `${this.currentNovel.title} - ${chapter.title || '第' + chapter.number + '章'}`;
        }
    },
    
    async saveChapter() {
        if (!this.currentNovel || !this.currentChapter) {
            alert('请先选择一本小说和一个章节');
            return;
        }
        
        const content = document.getElementById('chapter-content').value;
        
        try {
            await ApiClient.chapters.save(this.currentNovel.id, this.currentChapter.id, { content });
            this.currentChapter.content = content;
            this.currentChapter.wordCount = content.length;
            this.updateWordCount();
            this.renderChapterList();
            alert('保存成功');
        } catch (error) {
            alert('保存失败：' + error.message);
        }
    },
    
    updateWordCount() {
        const content = document.getElementById('chapter-content').value;
        const wordCount = content.length;
        document.getElementById('current-chapter-words').textContent = this.formatNumber(wordCount);
    },
    
    async aiWriteChapter() {
        if (!this.currentNovel) {
            alert('请先选择一本小说');
            return;
        }
        
        const targetWords = parseInt(document.getElementById('target-words')?.value || '3000');
        const style = document.getElementById('writing-style')?.value || 'normal';
        const lastContent = document.getElementById('chapter-content').value;
        
        if (this.isWriting) {
            alert('正在写作中，请稍候...');
            return;
        }
        
        if (!confirm(`开始 AI 写作？\n目标字数：${targetWords}\n写作风格：${style}\n\n注意：将调用 InkOS 多 Agent 核心引擎进行创作。`)) {
            return;
        }
        
        this.isWriting = true;
        this.showWritingProgress(true);
        
        try {
            const result = await ApiClient.novels.write(this.currentNovel.id, {
                targetWords,
                style,
                lastContent
            });
            
            if (result.progressLog && result.progressLog.length > 0) {
                this.showProgressLog(result.progressLog);
            }
            
            document.getElementById('chapter-content').value = result.content;
            this.currentChapter = result;
            
            const chapters = await ApiClient.novels.chapters(this.currentNovel.id);
            this.currentNovel.chapters = chapters;
            this.currentNovel.chapterCount = chapters.length;
            this.currentNovel.wordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
            
            this.renderChapterList();
            this.updateWordCount();
            
            alert(`AI 写作完成！\n章节：「${result.title}」\n字数：${this.formatNumber(result.wordCount)}`);
            
        } catch (error) {
            alert('AI 写作失败：' + error.message);
        } finally {
            this.isWriting = false;
            this.showWritingProgress(false);
        }
    },
    
    showWritingProgress(show) {
        const progressEl = document.getElementById('writing-progress');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('writing-progress-fill');
        
        if (show) {
            progressEl.style.display = 'block';
            progressText.textContent = '正在调用 InkOS 核心...';
            progressBar.style.width = '30%';
            this.animateProgress();
        } else {
            setTimeout(() => {
                progressEl.style.display = 'none';
            }, 1000);
        }
    },
    
    animateProgress() {
        if (!this.isWriting) return;
        
        const progressBar = document.getElementById('writing-progress-fill');
        const progressText = document.getElementById('progress-text');
        const currentWidth = parseFloat(progressBar.style.width) || 30;
        
        if (currentWidth < 90) {
            progressBar.style.width = (currentWidth + Math.random() * 10) + '%';
            progressText.textContent = 'AI 正在创作中... ' + Math.round(currentWidth) + '%';
            setTimeout(() => this.animateProgress(), 500);
        }
    },
    
    showProgressLog(logs) {
        const logContainer = document.getElementById('progress-log');
        if (logContainer) {
            logContainer.innerHTML = logs.map(log => `<div class="log-line">${log}</div>`).join('');
        }
    },
    
    addChapter() {
        if (!this.currentNovel) {
            alert('请先选择一本小说');
            return;
        }
        
        const title = prompt('请输入章节标题（留空自动生成）：');
        
        ApiClient.chapters.create(this.currentNovel.id, { title: title || '' })
            .then(chapter => {
                if (!this.currentNovel.chapters) this.currentNovel.chapters = [];
                this.currentNovel.chapters.push(chapter);
                this.currentNovel.chapterCount = this.currentNovel.chapters.length;
                this.renderChapterList();
                this.openChapter(chapter.id);
            })
            .catch(error => alert('创建失败：' + error.message));
    },
    
    async deleteNovel(novelId) {
        if (!confirm('确定要删除这本小说吗？此操作不可恢复！')) return;
        
        try {
            await ApiClient.novels.delete(novelId);
            this.novels = this.novels.filter(n => n.id !== novelId);
            this.renderDashboard();
            this.renderNovels();
            
            if (this.currentNovel?.id === novelId) {
                this.currentNovel = null;
                this.currentChapter = null;
                this.switchView('dashboard');
            }
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    },
    
    saveSettings() {
        const settings = {
            aiProvider: document.getElementById('ai-provider')?.value || 'openai',
            apiKey: document.getElementById('api-key')?.value || '',
            baseURL: document.getElementById('base-url')?.value || 'https://api.openai.com/v1',
            aiModel: document.getElementById('ai-model')?.value || 'gpt-4o',
            defaultGenre: document.getElementById('default-genre')?.value || 'xuanhuan',
            theme: document.getElementById('theme-select')?.value || 'light',
            modelRouting: {
                writer: {
                    model: document.getElementById('model-writer')?.value || null
                },
                auditor: {
                    model: document.getElementById('model-auditor')?.value || null
                },
                architect: {
                    model: document.getElementById('model-architect')?.value || null
                }
            }
        };
        
        localStorage.setItem('inkflow-settings', JSON.stringify(settings));
        
        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        }).then(res => res.json())
          .then(() => alert('设置已保存'))
          .catch(err => alert('保存失败: ' + err.message));
    },
    
    formatNumber(num) {
        if (!num) return '0';
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + 'w';
        }
        return num.toLocaleString();
    },
    
    getStatusText(status) {
        const map = {
            writing: '创作中',
            completed: '已完成',
            paused: '已暂停'
        };
        return map[status] || '创作中';
    },
    
    getGenreText(genre) {
        const map = {
            xuanhuan: '玄幻',
            xianxia: '仙侠',
            urban: '都市',
            'sci-fi': '科幻',
            horror: '恐怖',
            other: '其他'
        };
        return map[genre] || '其他';
    },
    
    getGenreEmoji(genre) {
        const map = {
            xuanhuan: '🔥',
            xianxia: '⚔️',
            urban: '🏙️',
            'sci-fi': '🚀',
            horror: '👻',
            other: '📖'
        };
        return map[genre] || '📖';
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());

document.getElementById('chapter-content')?.addEventListener('input', () => {
    if (App.currentChapter) {
        App.updateWordCount();
    }
});

document.getElementById('chapter-content')?.addEventListener('mouseup', () => {
    App.updateSelectionInfo();
});

document.getElementById('partial-instruction')?.addEventListener('change', (e) => {
    const customGroup = document.getElementById('custom-instruction-group');
    if (e.target.value === '') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
});

App.updateSelectionInfo = function() {
    const textarea = document.getElementById('chapter-content');
    const selectedInfo = document.getElementById('selected-info');
    const btnRewrite = document.getElementById('btn-partial-rewrite');
    
    if (!textarea || !selectedInfo) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    if (selectedText.length > 0) {
        const preview = selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText;
        selectedInfo.textContent = `已选中 ${selectedText.length} 字：「${preview}」`;
        selectedInfo.classList.add('has-selection');
        btnRewrite?.removeAttribute('disabled');
        
        App.selectedRange = { start, end, text: selectedText };
    } else {
        selectedInfo.textContent = '未选中任何内容';
        selectedInfo.classList.remove('has-selection');
        btnRewrite?.setAttribute('disabled', 'true');
        
        App.selectedRange = null;
    }
};

App.partialRewrite = async function() {
    if (!this.currentNovel || !this.currentChapter) {
        alert('请先选择一本小说和一个章节');
        return;
    }
    
    if (!this.selectedRange || this.selectedRange.text.length === 0) {
        alert('请先在编辑器中选中要重写的内容');
        return;
    }
    
    const instruction = document.getElementById('partial-instruction')?.value || 
                        document.getElementById('custom-instruction')?.value ||
                        '重写这段，使其更流畅';
    
    if (!confirm(`确认重写选中的 ${this.selectedRange.text.length} 字内容？\n\n指令：${instruction}`)) {
        return;
    }
    
    const textarea = document.getElementById('chapter-content');
    const originalContent = textarea.value;
    const beforePart = originalContent.substring(0, this.selectedRange.start);
    const afterPart = originalContent.substring(this.selectedRange.end);
    
    this.showWritingProgress(true);
    document.getElementById('progress-text').textContent = '正在重写选中内容...';
    
    try {
        const response = await fetch(`/api/novels/${this.currentNovel.id}/partial-rewrite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chapterId: this.currentChapter.id,
                startPos: this.selectedRange.start,
                endPos: this.selectedRange.end,
                instruction: instruction
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            textarea.value = result.content;
            this.currentChapter.content = result.content;
            this.currentChapter.wordCount = result.wordCount;
            this.updateWordCount();
            
            document.getElementById('progress-text').textContent = '重写完成！';
            document.getElementById('writing-progress-fill').style.width = '100%';
            
            this.showProgressLog(result.progressLog);
            
            setTimeout(() => {
                this.showWritingProgress(false);
            }, 1500);
        } else {
            throw new Error(result.error || '重写失败');
        }
    } catch (error) {
        alert('局部重写失败：' + error.message);
        this.showWritingProgress(false);
    }
};

App.cascadeUpdate = async function() {
    if (!this.currentNovel) {
        alert('请先选择一本小说');
        return;
    }
    
    const chapterNum = this.currentChapter?.number || 1;
    
    if (!confirm(`确定要从第 ${chapterNum} 章开始级联更新真相文件吗？\n\n这将分析后续章节的内容变化，并更新：\n- 世界状态\n- 伏笔追踪\n- 章节摘要\n- 角色矩阵`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/novels/${this.currentNovel.id}/cascade-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromChapter: chapterNum,
                analysisData: null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`级联更新完成！\n\n更新范围：第 ${result.updatedFromChapter} 章起\n新增伏笔：${result.updates.newHooks} 个\n更新摘要：${result.updates.updatedSummaries} 个`);
            this.loadTruthFiles();
        } else {
            throw new Error(result.error || '更新失败');
        }
    } catch (error) {
        alert('级联更新失败：' + error.message);
    }
};

App.loadTruthFiles = async function() {
    if (!this.currentNovel) return;
    
    try {
        const response = await fetch(`/api/novels/${this.currentNovel.id}/truth-files`);
        const data = await response.json();
        
        if (data.summary) {
            document.getElementById('truth-chapter').textContent = data.summary.currentChapter || '-';
            document.getElementById('truth-hooks').textContent = data.summary.activeHooks || '0';
            document.getElementById('truth-characters').textContent = data.summary.characters || '0';
            document.getElementById('truth-summaries').textContent = data.summary.chaptersTracked || '0';
        }
    } catch (error) {
        console.log('加载真相文件失败:', error);
    }
};

App.showWritingProgress = function(show) {
    const progressEl = document.getElementById('writing-progress');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('writing-progress-fill');
    
    if (show) {
        progressEl.style.display = 'flex';
        progressText.textContent = '正在调用 InkOS 核心...';
        progressBar.style.width = '30%';
        this.animateProgress();
    } else {
        setTimeout(() => {
            progressEl.style.display = 'none';
        }, 1000);
    }
};

App.animateProgress = function() {
    if (!this.isWriting) return;
    
    const progressBar = document.getElementById('writing-progress-fill');
    const progressText = document.getElementById('progress-text');
    const currentWidth = parseFloat(progressBar.style.width) || 30;
    
    if (currentWidth < 90) {
        progressBar.style.width = (currentWidth + Math.random() * 10) + '%';
        progressText.textContent = 'AI 正在创作中... ' + Math.round(currentWidth) + '%';
        setTimeout(() => this.animateProgress(), 500);
    }
};

App.showProgressLog = function(logs) {
    const logContainer = document.getElementById('progress-log');
    if (logContainer && logs) {
        logContainer.innerHTML = logs.map(log => `<div class="log-line">${log}</div>`).join('');
    }
};

App.loadSettings = async function() {
    try {
        const settings = await ApiClient.settings.get();
        
        document.getElementById('ai-provider').value = settings.aiProvider || 'openai';
        document.getElementById('api-key').value = settings.apiKey || '';
        document.getElementById('base-url').value = settings.baseURL || 'https://api.openai.com/v1';
        document.getElementById('ai-model').value = settings.aiModel || 'gpt-4o';
        document.getElementById('default-genre').value = settings.defaultGenre || 'xuanhuan';
        document.getElementById('theme-select').value = settings.theme || 'light';
        
        if (settings.modelRouting) {
            document.getElementById('model-writer').value = settings.modelRouting.writer?.model || '';
            document.getElementById('model-auditor').value = settings.modelRouting.auditor?.model || '';
            document.getElementById('model-architect').value = settings.modelRouting.architect?.model || '';
        }
    } catch (error) {
        console.log('加载设置失败:', error);
    }
};

App.saveModelRouting = function() {
    const settings = JSON.parse(localStorage.getItem('inkflow-settings') || '{}');
    
    settings.modelRouting = {
        writer: {
            model: document.getElementById('model-writer').value || null
        },
        auditor: {
            model: document.getElementById('model-auditor').value || null
        },
        architect: {
            model: document.getElementById('model-architect').value || null
        }
    };
    
    localStorage.setItem('inkflow-settings', JSON.stringify(settings));
    
    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    }).then(res => res.json())
      .then(() => alert('多模型路由配置已保存'))
      .catch(err => alert('保存失败: ' + err.message));
};

App.settingsVisible = function() {
    this.loadSettings();
};
