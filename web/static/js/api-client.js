const ApiClient = {
    baseUrl: '/api',
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };
        
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', body: data });
    },
    
    put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', body: data });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    novels: {
        list() {
            return ApiClient.get('/novels');
        },
        
        get(id) {
            return ApiClient.get(`/novels/${id}`);
        },
        
        create(data) {
            return ApiClient.post('/novels', data);
        },
        
        update(id, data) {
            return ApiClient.put(`/novels/${id}`, data);
        },
        
        delete(id) {
            return ApiClient.delete(`/novels/${id}`);
        },
        
        chapters(novelId) {
            return ApiClient.get(`/novels/${novelId}/chapters`);
        },
        
        write(novelId, data) {
            return ApiClient.post(`/novels/${novelId}/write`, data);
        }
    },
    
    chapters: {
        get(novelId, chapterId) {
            return ApiClient.get(`/novels/${novelId}/chapters/${chapterId}`);
        },
        
        save(novelId, chapterId, data) {
            return ApiClient.put(`/novels/${novelId}/chapters/${chapterId}`, data);
        },
        
        create(novelId, data) {
            return ApiClient.post(`/novels/${novelId}/chapters`, data);
        },
        
        delete(novelId, chapterId) {
            return ApiClient.delete(`/novels/${novelId}/chapters/${chapterId}`);
        }
    },
    
    settings: {
        get() {
            return ApiClient.get('/settings');
        },
        
        save(data) {
            return ApiClient.post('/settings', data);
        }
    },
    
    status() {
        return ApiClient.get('/status');
    }
};
