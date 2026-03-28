const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
        
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggle();
        });
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'system') {
                this.applyTheme('system');
            }
        });
    },
    
    applyTheme(theme) {
        let actualTheme = theme;
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            actualTheme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', actualTheme);
        
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            if (theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                toggle.textContent = prefersDark ? '☀️' : '🌙';
            } else {
                toggle.textContent = actualTheme === 'dark' ? '☀️' : '🌙';
            }
        }
    },
    
    setTheme(theme) {
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
    },
    
    toggle() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        let currentActual = savedTheme;
        
        if (savedTheme === 'system') {
            currentActual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        const newTheme = currentActual === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },
    
    get() {
        return localStorage.getItem('theme') || 'light';
    }
};
