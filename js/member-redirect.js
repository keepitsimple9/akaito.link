(async function () {
    const publicPages = new Set([
        'index.html',
        'login.html',
        'registro.html',
        'recuperar-contrasena.html'
    ]);

    const currentPage = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isPublicPage = publicPages.has(currentPage);

    if (!isPublicPage) {
        return;
    }

    function getSupabaseClient() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        if (typeof supabase === 'undefined') {
            return null;
        }

        window.supabaseClient = supabase.createClient(
            'https://jlqfrsnyzgfnmzfrzxrk.supabase.co',
            'sb_publishable_T9HkJDmciCjA0FOh44riEw_ldRz22B0'
        );

        return window.supabaseClient;
    }

    async function resolveClient() {
        let attempts = 0;
        let client = getSupabaseClient();

        while (!client && attempts < 10) {
            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 80));
            client = getSupabaseClient();
        }

        return client;
    }

    const client = await resolveClient();
    if (!client) {
        return;
    }

    try {
        const { data: { session } } = await client.auth.getSession();

        if (isPublicPage && session) {
            if (currentPage !== 'index-miembro.html') {
                const recentRedirect = sessionStorage.getItem('akaito-recent-member-redirect');
                if (recentRedirect === '1') {
                    return;
                }

                sessionStorage.setItem('akaito-recent-member-redirect', '1');
                setTimeout(() => sessionStorage.removeItem('akaito-recent-member-redirect'), 1200);
                window.location.replace('index-miembro.html');
            }
        }
    } catch (error) {
        // Ignore session read errors to avoid navigation loops.
    }
})();
