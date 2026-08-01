(function () {
    const btnThemeGlobal = document.getElementById('btnThemeGlobal');
    const THEME_KEY = 'akaito-theme';

    function readThemeFromCookie() {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)akaito-theme=(dark|light)(?:;|$)/);
        return cookieMatch ? cookieMatch[1] : null;
    }

    function readThemePreference() {
        try {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === 'dark' || stored === 'light') {
                return stored;
            }
        } catch (error) {
            // Ignore storage errors and use window.name fallback.
        }

        const cookieTheme = readThemeFromCookie();
        if (cookieTheme === 'dark' || cookieTheme === 'light') {
            return cookieTheme;
        }

        const fallbackMatch = (window.name || '').match(/(?:^|;)akaito-theme=(dark|light)(?:;|$)/);
        return fallbackMatch ? fallbackMatch[1] : null;
    }

    function writeThemePreference(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            // Ignore storage errors and keep window.name fallback.
        }

        // Cookie fallback to preserve theme when localStorage is unavailable.
        document.cookie = `akaito-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;

        const baseWindowName = (window.name || '')
            .replace(/(?:^|;)akaito-theme=(dark|light)(?=;|$)/, '')
            .replace(/^;+|;+$/g, '');

        window.name = (baseWindowName ? baseWindowName + ';' : '') + 'akaito-theme=' + theme + ';';
    }

    function updateThemeButton() {
        if (!btnThemeGlobal) {
            return;
        }

        const isDark = document.body.classList.contains('theme-dark');
        btnThemeGlobal.textContent = isDark ? '☀ Diurno' : '🌙 Nocturno';
    }

    const savedTheme = readThemePreference();
    if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
    } else {
        document.body.classList.remove('theme-dark');
    }

    if (!savedTheme) {
        writeThemePreference(document.body.classList.contains('theme-dark') ? 'dark' : 'light');
    }

    updateThemeButton();

    if (btnThemeGlobal) {
        btnThemeGlobal.addEventListener('click', function () {
            const isDark = document.body.classList.toggle('theme-dark');
            writeThemePreference(isDark ? 'dark' : 'light');
            updateThemeButton();
        });
    }
})();
