const Settings = {
    models: [],
    settings: {},
    
    async load() {
        try {
            const [settingsRes, modelsRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/models')
            ]);
            
            this.settings = await settingsRes.json();
            this.models = await modelsRes.json();
            
            this.populateModelSelects();
            this.loadSettingsToForm();
            this.renderCustomModels();
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    },
    
    populateModelSelects() {
        const selects = ['ai-model', 'model-writer', 'model-auditor', 'model-architect'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '';
            
            if (selectId === 'ai-model') {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '请选择模型';
                select.appendChild(option);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '使用默认';
                select.appendChild(option);
            }
            
            const builtinModels = this.models.filter(m => !m.isCustom);
            const customModels = this.models.filter(m => m.isCustom);
            
            if (builtinModels.length > 0) {
                const group = document.createElement('optgroup');
                group.label = '内置模型';
                builtinModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} (${model.provider})`;
                    if (model.provider === 'OpenAI') {
                        option.style.color = '#10a130';
                    } else if (model.provider === 'Anthropic') {
                        option.style.color = '#d97706';
                    } else if (model.provider === 'DeepSeek') {
                        option.style.color = '#6366f1';
                    }
                    group.appendChild(option);
                });
                select.appendChild(group);
            }
            
            if (customModels.length > 0) {
                const group = document.createElement('optgroup');
                group.label = '自定义模型';
                customModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} (${model.provider})`;
                    option.style.color = '#8b5cf6';
                    option.dataset.baseURL = model.baseURL;
                    option.dataset.apiKey = model.apiKey;
                    group.appendChild(option);
                });
                select.appendChild(group);
            }
            
            select.value = currentValue;
        });
    },
    
    loadSettingsToForm() {
        const s = this.settings;
        
        document.getElementById('ai-model').value = s.aiModel || '';
        document.getElementById('api-key').value = s.apiKey || '';
        document.getElementById('default-genre').value = s.defaultGenre || 'xuanhuan';
        document.getElementById('default-chapter-words').value = s.defaultChapterWords || 3000;
        document.getElementById('default-style').value = s.defaultStyle || 'normal';
        document.getElementById('theme-select').value = s.theme || 'light';
        
        const routing = s.modelRouting || {};
        document.getElementById('model-writer').value = routing.writer || '';
        document.getElementById('model-auditor').value = routing.auditor || '';
        document.getElementById('model-architect').value = routing.architect || '';
        
        document.getElementById('notify-enabled').checked = s.notifyEnabled || false;
        document.getElementById('notify-method').value = s.notifyMethod || 'none';
        document.getElementById('notify-token').value = s.notifyToken || '';
        
        this.updateNotifyConfig();
    },
    
    renderCustomModels() {
        const container = document.getElementById('custom-model-list');
        if (!container) return;
        
        const customModels = this.models.filter(m => m.isCustom);
        
        if (customModels.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">暂无自定义模型，添加后可在此管理</p>';
            return;
        }
        
        container.innerHTML = customModels.map(model => `
            <div class="model-item" data-model-id="${model.id}">
                <div class="model-info">
                    <div class="model-name">${model.name}</div>
                    <div class="model-platform">${model.baseURL} / ${model.id}</div>
                </div>
                <div class="model-actions">
                    <button class="btn-delete" onclick="Settings.deleteModel('${model.id}')">删除</button>
                </div>
            </div>
        `).join('');
    },
    
    async addCustomModel() {
        const name = document.getElementById('model-name').value.trim();
        const modelId = document.getElementById('model-id').value.trim();
        const baseURL = document.getElementById('model-baseurl').value.trim();
        const apiKey = document.getElementById('model-apikey').value.trim();
        
        if (!name || !modelId || !baseURL || !apiKey) {
            alert('请填写所有字段');
            return;
        }
        
        try {
            const response = await fetch('/api/models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    provider: name,
                    baseURL,
                    apiKey,
                    modelId
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '添加失败');
            }
            
            document.getElementById('model-name').value = '';
            document.getElementById('model-id').value = '';
            document.getElementById('model-baseurl').value = '';
            document.getElementById('model-apikey').value = '';
            
            await this.load();
            alert('模型添加成功');
        } catch (error) {
            console.error('添加模型失败:', error);
            alert('添加失败: ' + error.message);
        }
    },
    
    async deleteModel(modelId) {
        if (!confirm('确定要删除这个模型吗？')) return;
        
        try {
            const response = await fetch(`/api/models/${encodeURIComponent(modelId)}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('删除失败');
            }
            
            await this.load();
            alert('模型已删除');
        } catch (error) {
            console.error('删除模型失败:', error);
            alert('删除失败: ' + error.message);
        }
    },
    
    updateNotifyConfig() {
        const method = document.getElementById('notify-method').value;
        const configDiv = document.getElementById('notify-config');
        if (configDiv) {
            configDiv.style.display = method === 'none' ? 'none' : 'block';
        }
    },
    
    async saveSettings() {
        const settings = {
            aiModel: document.getElementById('ai-model').value,
            apiKey: document.getElementById('api-key').value,
            defaultGenre: document.getElementById('default-genre').value,
            defaultChapterWords: parseInt(document.getElementById('default-chapter-words').value),
            defaultStyle: document.getElementById('default-style').value,
            theme: document.getElementById('theme-select').value,
            notifyEnabled: document.getElementById('notify-enabled').checked,
            notifyMethod: document.getElementById('notify-method').value,
            notifyToken: document.getElementById('notify-token').value,
            customModels: this.settings.customModels || [],
            modelRouting: {
                writer: document.getElementById('model-writer').value,
                auditor: document.getElementById('model-auditor').value,
                architect: document.getElementById('model-architect').value
            }
        };
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error('保存失败');
            }
            
            alert('设置已保存');
            location.reload();
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存失败: ' + error.message);
        }
    },
    
    async saveModelRouting() {
        const routing = {
            writer: document.getElementById('model-writer').value,
            auditor: document.getElementById('model-auditor').value,
            architect: document.getElementById('model-architect').value
        };
        
        const settings = {
            ...this.settings,
            modelRouting: routing
        };
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error('保存失败');
            }
            
            alert('路由配置已保存');
        } catch (error) {
            console.error('保存路由配置失败:', error);
            alert('保存失败: ' + error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Settings.load();
    
    document.getElementById('notify-method')?.addEventListener('change', () => {
        Settings.updateNotifyConfig();
    });
});
