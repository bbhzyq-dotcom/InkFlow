const App = {
    currentView: 'dashboard',
    currentNovel: null,
    currentChapter: null,
    novels: [],
    
    init() {
        this.setupNavigation();
        this.loadData();
        ThemeManager.init();
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
    
    async loadData() {
        try {
            this.novels = await ApiClient.novels.list();
            this.renderDashboard();
        } catch (error) {
            console.log('No existing data or server not ready');
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
            return;
        }
        
        container.innerHTML = this.novels.slice(0, 5).map(novel => `
            <div class="novel-item" onclick="App.openNovel('${novel.id}')">
                <div class="novel-cover">📖</div>
                <div class="novel-info">
                    <div class="novel-title">${novel.title}</div>
                    <div class="novel-meta">
                        <span>${novel.genre || '未知类型'}</span>
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
            return;
        }
        
        container.innerHTML = this.novels.map(novel => `
            <div class="novel-card" onclick="App.openNovel('${novel.id}')">
                <div class="novel-card-cover">📖</div>
                <div class="novel-card-body">
                    <div class="novel-card-title">${novel.title}</div>
                    <div class="novel-card-genre">${novel.genre || '未知类型'}</div>
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
        
        const genre = prompt('请输入小说类型（默认：玄幻）：') || 'xuanhuan';
        
        this.createNovel({ title, genre });
    },
    
    async createNovel(data) {
        try {
            const novel = await ApiClient.novels.create(data);
            this.novels.push(novel);
            this.renderDashboard();
            this.renderNovels();
            this.openNovel(novel.id);
        } catch (error) {
            alert('创建失败：' + error.message);
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
        } catch (error) {
            alert('打开失败：' + error.message);
        }
    },
    
    renderChapterList() {
        const container = document.getElementById('chapter-list');
        const chapters = this.currentNovel?.chapters || [];
        
        if (chapters.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">暂无章节</div>';
            return;
        }
        
        container.innerHTML = chapters.map((ch, idx) => `
            <div class="chapter-item ${ch.id === this.currentChapter?.id ? 'active' : ''}" onclick="App.openChapter('${ch.id}')">
                <div class="chapter-num">${idx + 1}</div>
                <div class="chapter-info">
                    <div class="chapter-title">${ch.title || '第' + (idx + 1) + '章'}</div>
                    <div class="chapter-words">${this.formatNumber(ch.wordCount || 0)} 字</div>
                </div>
            </div>
        `).join('');
    },
    
    openChapter(chapterId) {
        const chapter = this.currentNovel?.chapters?.find(c => c.id === chapterId);
        if (chapter) {
            this.currentChapter = chapter;
            document.getElementById('chapter-content').value = chapter.content || '';
            document.getElementById('current-chapter-num').textContent = chapter.number || '-';
            document.getElementById('current-chapter-words').textContent = this.formatNumber(chapter.wordCount || 0);
            this.renderChapterList();
        }
    },
    
    async saveChapter() {
        if (!this.currentNovel || !this.currentChapter) return;
        
        const content = document.getElementById('chapter-content').value;
        
        try {
            await ApiClient.chapters.save(this.currentNovel.id, this.currentChapter.id, { content });
            alert('保存成功');
        } catch (error) {
            alert('保存失败：' + error.message);
        }
    },
    
    async aiWriteChapter() {
        if (!this.currentNovel) {
            alert('请先选择一本小说');
            return;
        }
        
        const targetWords = parseInt(document.getElementById('target-words')?.value || '3000');
        const style = document.getElementById('writing-style')?.value || 'normal';
        
        if (!confirm(`开始 AI 写作？目标字数：${targetWords}`)) return;
        
        try {
            const result = await ApiClient.novels.write(this.currentNovel.id, {
                targetWords,
                style,
                lastContent: document.getElementById('chapter-content').value
            });
            
            document.getElementById('chapter-content').value = result.content;
            alert('AI 写作完成！');
        } catch (error) {
            alert('AI 写作失败：' + error.message);
        }
    },
    
    addChapter() {
        if (!this.currentNovel) return;
        
        const title = prompt('请输入章节标题：');
        if (!title) return;
        
        ApiClient.chapters.create(this.currentNovel.id, { title })
            .then(chapter => {
                if (!this.currentNovel.chapters) this.currentNovel.chapters = [];
                this.currentNovel.chapters.push(chapter);
                this.renderChapterList();
            })
            .catch(error => alert('创建失败：' + error.message));
    },
    
    async deleteNovel(novelId) {
        if (!confirm('确定要删除这本小说吗？')) return;
        
        try {
            await ApiClient.novels.delete(novelId);
            this.novels = this.novels.filter(n => n.id !== novelId);
            this.renderDashboard();
            this.renderNovels();
        } catch (error) {
            alert('删除失败：' + error.message);
        }
    },
    
    saveSettings() {
        const settings = {
            aiProvider: document.getElementById('ai-provider').value,
            apiKey: document.getElementById('api-key').value,
            aiModel: document.getElementById('ai-model').value,
            defaultGenre: document.getElementById('default-genre').value,
            theme: document.getElementById('theme-select').value
        };
        
        localStorage.setItem('inkflow-settings', JSON.stringify(settings));
        alert('设置已保存');
    },
    
    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + 'w';
        }
        return num?.toLocaleString() || '0';
    },
    
    getStatusText(status) {
        const map = {
            writing: '创作中',
            completed: '已完成',
            paused: '已暂停'
        };
        return map[status] || '创作中';
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
