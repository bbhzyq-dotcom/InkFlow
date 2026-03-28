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
        const models = this.models || [];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = '';
            
            if (selectId === 'ai-model') {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = models.length > 0 ? '请选择模型' : '请先添加模型';
                select.appendChild(option);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '使用默认';
                select.appendChild(option);
            }
            
            if (models.length > 0) {
                const group = document.createElement('optgroup');
                group.label = '自定义模型';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.provider}-${model.id}`;
                    option.dataset.baseURL = model.baseURL;
                    option.dataset.apiKey = model.apiKey;
                    option.dataset.provider = model.provider;
                    option.dataset.name = model.name;
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
        
        const models = this.models || [];
        
        if (models.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">暂无自定义模型，请在下方添加</p>';
            return;
        }
        
        container.innerHTML = models.map(model => `
            <div class="model-item" data-model-id="${model.id}">
                <div class="model-info">
                    <div class="model-name">${model.provider}-${model.id}</div>
                    <div class="model-platform">${model.baseURL}</div>
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
    
    getSelectedModelConfig(selectId) {
        const select = document.getElementById(selectId);
        if (!select || !select.value) return null;
        
        const option = select.options[select.selectedIndex];
        if (!option) return null;
        
        return {
            id: select.value,
            baseURL: option.dataset.baseURL || '',
            apiKey: option.dataset.apiKey || '',
            provider: option.dataset.provider || '',
            name: option.dataset.name || ''
        };
    },
    
    async saveSettings() {
        const selectedModel = this.getSelectedModelConfig('ai-model');
        const theme = document.getElementById('theme-select').value;
        
        const settings = {
            aiModel: selectedModel ? selectedModel.id : '',
            defaultGenre: document.getElementById('default-genre').value,
            defaultChapterWords: parseInt(document.getElementById('default-chapter-words').value),
            defaultStyle: document.getElementById('default-style').value,
            theme: theme,
            notifyEnabled: document.getElementById('notify-enabled').checked,
            notifyMethod: document.getElementById('notify-method').value,
            notifyToken: document.getElementById('notify-token').value,
            customModels: this.models || [],
            modelRouting: {
                writer: document.getElementById('model-writer').value,
                auditor: document.getElementById('model-auditor').value,
                architect: document.getElementById('model-architect').value
            }
        };
        
        if (selectedModel) {
            settings.selectedModelConfig = selectedModel;
        }
        
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error('保存失败');
            }
            
            ThemeManager.setTheme(theme);
            alert('设置已保存');
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存失败: ' + error.message);
        }
    },
    
    async saveModelRouting() {
        const writerModel = this.getSelectedModelConfig('model-writer');
        const auditorModel = this.getSelectedModelConfig('model-auditor');
        const architectModel = this.getSelectedModelConfig('model-architect');
        
        const routing = {
            writer: document.getElementById('model-writer').value,
            auditor: document.getElementById('model-auditor').value,
            architect: document.getElementById('model-architect').value
        };
        
        const routingConfigs = {};
        if (writerModel) {
            routingConfigs.writer = writerModel;
        }
        if (auditorModel) {
            routingConfigs.auditor = auditorModel;
        }
        if (architectModel) {
            routingConfigs.architect = architectModel;
        }
        
        const settings = {
            ...this.settings,
            modelRouting: routing,
            modelRoutingConfigs: routingConfigs
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
