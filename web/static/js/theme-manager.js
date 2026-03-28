const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggle();
        });
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'system' || !savedTheme) {
                this.setTheme('system');
            }
        });
    },
    
    setTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    },
    
    toggle() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'light' : 'dark');
        } else {
            this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        }
    },
    
    get() {
        return localStorage.getItem('theme') || 'light';
    }
};
