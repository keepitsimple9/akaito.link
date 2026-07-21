// js/auth.js

const Auth = {
    // Registro de nuevo usuario
    async registrar(email, password, datosAdicionales) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: datosAdicionales // Aquí guardas edad, whatsapp, instagram, etc.
            }
        });
        return { data, error };
    },

    // Inicio de sesión
    async iniciarSesion(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // Cierre de sesión
    async cerrarSesion() {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html'; // Redirigir al home
    },

    // Verificar si hay sesión activa
    async obtenerSesion() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session;
    },

    async asegurarPerfilUsuario(user) {
        const email = user?.email;
        if (!email) {
            return { error: new Error('No se pudo identificar el correo del usuario.') };
        }

        const { data: usuarioExistente, error: errorUsuario } = await supabaseClient
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (errorUsuario) {
            return { error: errorUsuario };
        }

        if (usuarioExistente) {
            return { data: usuarioExistente };
        }

        const metadata = user.user_metadata || {};
        const { data: postulante } = await supabaseClient
            .from('postulantes')
            .select('nombre, edad, genero, whatsapp, instagram')
            .eq('email', email)
            .maybeSingle();

        const nuevoUsuario = {
            email,
            nombre_perfil: metadata.nombre || postulante?.nombre || email.split('@')[0],
            edad: metadata.edad || postulante?.edad || null,
            genero: metadata.genero || postulante?.genero || null,
            whatsapp: metadata.whatsapp || postulante?.whatsapp || null,
            instagram: metadata.instagram || postulante?.instagram || null
        };

        const { data, error } = await supabaseClient
            .from('usuarios')
            .upsert([nuevoUsuario], { onConflict: 'email' })
            .select('id')
            .single();

        return { data, error };
    }
};

// Manejador del formulario de registro
document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registroForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

            try {
                const nombre = document.getElementById('nombre').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const whatsapp = document.getElementById('whatsapp').value;
                const instagram = document.getElementById('instagram').value;
                const edad = document.getElementById('edad').value;
                const genero = document.getElementById('genero').value;

                // Guardar en tabla postulantes
                const { error: errorPostulante } = await supabaseClient
                    .from('postulantes')
                    .insert([{
                        nombre,
                        email,
                        whatsapp,
                        instagram,
                        edad: parseInt(edad),
                        genero
                    }]);

                if (errorPostulante) throw errorPostulante;

                // Registrar en Auth
                const { data, error } = await Auth.registrar(email, password, {
                    nombre,
                    edad: parseInt(edad),
                    whatsapp,
                    instagram,
                    genero
                });

                if (error) throw error;

                alert('¡Postulación enviada! Revisa tu correo para confirmar tu cuenta.');
                registroForm.reset();
                setTimeout(() => window.location.href = 'login.html', 2000);
            } catch (err) {
                alert('Error en la postulación: ' + (err.message || err));
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar mi Postulación'; }
            }
        });
    }

    // Manejador del formulario de login
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Verificando...'; }

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const { data, error } = await Auth.iniciarSesion(email, password);
            if (error) throw error;

            const { error: errorPerfil } = await Auth.asegurarPerfilUsuario(data.user);
            if (errorPerfil) throw errorPerfil;

            window.location.href = 'dashboard.html';
        } catch (err) {
            alert('No se pudo iniciar sesión: ' + (err.message || err));
        } finally {
            if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Iniciar Sesión'; }
        }
    });
});