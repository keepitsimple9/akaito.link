// js/auth.js

function getSupabaseClient() {
    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    const fallbackUrl = 'https://jlqfrsnyzgfnmzfrzxrk.supabase.co';
    const fallbackAnonKey = 'sb_publishable_T9HkJDmciCjA0FOh44riEw_ldRz22B0';

    if (typeof supabase === 'undefined') {
        throw new Error('No se pudo cargar la libreria de Supabase.');
    }

    window.supabaseClient = supabase.createClient(fallbackUrl, fallbackAnonKey);
    return window.supabaseClient;
}

const Auth = {
    // Registro de nuevo usuario
    async registrar(email, password, datosAdicionales) {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.signUp({
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
        const client = getSupabaseClient();
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async recuperarContrasena(email) {
        const client = getSupabaseClient();
        const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}nueva-contrasena.html`;
        const canUseRedirect = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        const options = canUseRedirect ? { redirectTo } : undefined;
        const { data, error } = await client.auth.resetPasswordForEmail(email, options);
        return { data, error };
    },

    async actualizarContrasena(nuevaContrasena) {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.updateUser({ password: nuevaContrasena });
        return { data, error };
    },

    // Cierre de sesión
    async cerrarSesion() {
        const client = getSupabaseClient();
        await client.auth.signOut();
        window.location.href = 'index.html'; // Redirigir al home
    },

    // Verificar si hay sesión activa
    async obtenerSesion() {
        const client = getSupabaseClient();
        const { data: { session } } = await client.auth.getSession();
        return session;
    },

    async asegurarPerfilUsuario(user) {
        const email = user?.email;
        if (!email) {
            return { error: new Error('No se pudo identificar el correo del usuario.') };
        }

        const client = getSupabaseClient();

        const { data: usuarioExistente, error: errorUsuario } = await client
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

        // Flujo actual: el alta en usuarios se hace de forma manual (aprobación/admin).
        return { error: new Error('Tu cuenta aun no fue aprobada por administracion.') };
    }
};

window.Auth = Auth;

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
                const genero = document.getElementById('genero').value;
                const apellidoPaterno = document.getElementById('apellidoPaterno')?.value || '';
                const apellidoMaterno = document.getElementById('apellidoMaterno')?.value || '';
                const apodo = document.getElementById('apodo')?.value || '';
                const pais = document.getElementById('pais')?.value || '';
                const fechaNacimiento = document.getElementById('fechaNacimiento')?.value || '';
                const edad = window.calcularEdadDesdeFechaNacimiento && fechaNacimiento ? window.calcularEdadDesdeFechaNacimiento(fechaNacimiento) : null;
                const client = getSupabaseClient();

                // Guardar en tabla postulantes
                const datosPostulante = {
                    nombre,
                    email,
                    whatsapp,
                    instagram,
                    edad: edad !== null ? edad : null,
                    genero
                };

                // Agregar campos opcionales si están disponibles
                if (apellidoPaterno) datosPostulante.apellido_paterno = apellidoPaterno;
                if (apellidoMaterno) datosPostulante.apellido_materno = apellidoMaterno;
                if (apodo) datosPostulante.apodo = apodo;
                if (pais) datosPostulante.pais = pais;
                if (fechaNacimiento) datosPostulante.fecha_nacimiento = fechaNacimiento;

                const { error: errorPostulante } = await client
                    .from('postulantes')
                    .insert([datosPostulante]);

                let avisoPostulante = '';
                if (errorPostulante) {
                    // No bloqueamos el registro en Auth si falla la tabla de pre-registro.
                    console.warn('No se pudo insertar en postulantes:', errorPostulante);
                    avisoPostulante = '\nNota: no se guardó la postulación preliminar, pero tu cuenta sí se puede crear.';
                }

                // Registrar en Auth
                const datosAuth = {
                    nombre,
                    edad: edad !== null ? edad : null,
                    whatsapp,
                    instagram,
                    genero
                };

                // Agregar campos opcionales si están disponibles
                if (apellidoPaterno) datosAuth.apellido_paterno = apellidoPaterno;
                if (apellidoMaterno) datosAuth.apellido_materno = apellidoMaterno;
                if (apodo) datosAuth.apodo = apodo;
                if (pais) datosAuth.pais = pais;
                if (fechaNacimiento) datosAuth.fecha_nacimiento = fechaNacimiento;

                const { data, error } = await Auth.registrar(email, password, datosAuth);

                if (error) throw error;

                alert('¡Postulación enviada! Revisa tu correo para confirmar tu cuenta.' + avisoPostulante);
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
    if (loginForm) {
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
                if (errorPerfil) {
                    const client = getSupabaseClient();
                    await client.auth.signOut();
                    throw errorPerfil;
                }

                window.location.href = 'dashboard.html';
            } catch (err) {
                alert('No se pudo iniciar sesión: ' + (err.message || err));
            } finally {
                if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Iniciar Sesión'; }
            }
        });
    }

    // Manejador del formulario de recuperación
    const recoverForm = document.getElementById('recoverForm');
    if (recoverForm) {
        recoverForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recoverBtn = recoverForm.querySelector('button[type="submit"]');
            if (recoverBtn) { recoverBtn.disabled = true; recoverBtn.textContent = 'Enviando...'; }

            const email = document.getElementById('recoverEmail')?.value?.trim();

            try {
                if (!email) {
                    throw new Error('Ingresa un correo válido.');
                }

                const { error } = await Auth.recuperarContrasena(email);
                if (error) throw error;

                alert('Si el correo existe, te enviaremos un enlace de recuperación.');
                recoverForm.reset();
            } catch (err) {
                alert('No se pudo procesar la recuperación: ' + (err.message || err));
            } finally {
                if (recoverBtn) { recoverBtn.disabled = false; recoverBtn.textContent = 'Enviar enlace de recuperación'; }
            }
        });
    }

    // Manejador del formulario de nueva contraseña
    const newPasswordForm = document.getElementById('newPasswordForm');
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = newPasswordForm.querySelector('button[type="submit"]');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

            const newPassword = document.getElementById('newPassword')?.value || '';
            const repeatPassword = document.getElementById('repeatPassword')?.value || '';
            const errorPassword = document.getElementById('errorPassword');

            try {
                if (newPassword.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres.');
                }

                if (newPassword !== repeatPassword) {
                    if (errorPassword) {
                        errorPassword.style.display = 'block';
                        errorPassword.textContent = 'Las contraseñas no coinciden.';
                    }
                    throw new Error('Las contraseñas no coinciden.');
                }

                if (errorPassword) {
                    errorPassword.style.display = 'none';
                }

                const client = getSupabaseClient();
                const { data: { session } } = await client.auth.getSession();
                if (!session) {
                    throw new Error('El enlace de recuperación es inválido o expiró. Solicita uno nuevo.');
                }

                const { error } = await Auth.actualizarContrasena(newPassword);
                if (error) throw error;

                alert('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
                newPasswordForm.reset();
                window.location.href = 'login.html';
            } catch (err) {
                if (errorPassword && newPassword !== repeatPassword) {
                    errorPassword.style.display = 'block';
                }
                alert('No se pudo actualizar la contraseña: ' + (err.message || err));
            } finally {
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar nueva contraseña'; }
            }
        });
    }

    // Manejador del formulario de login de administrador
    const loginAdminForm = document.getElementById('loginAdminForm');
    if (loginAdminForm) {
        loginAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginAdminBtn = loginAdminForm.querySelector('button[type="submit"]');
            if (loginAdminBtn) { loginAdminBtn.disabled = true; loginAdminBtn.textContent = 'Verificando...'; }

            const email = document.getElementById('loginAdminEmail').value;
            const password = document.getElementById('loginAdminPassword').value;

            try {
                const { data, error } = await Auth.iniciarSesion(email, password);
                if (error) throw error;

                // Verificar si el usuario es administrador
                const client = getSupabaseClient();
                const { data: usuario, error: errUsuario } = await client
                    .from('usuarios')
                    .select('es_admin')
                    .eq('email', email)
                    .single();

                if (errUsuario || !usuario || !usuario.es_admin) {
                    throw new Error('Este usuario no tiene permisos de administrador.');
                }

                window.location.href = 'admin-dashboard.html';
            } catch (err) {
                alert('No se pudo iniciar sesión como administrador: ' + (err.message || err));
                // Desconectar si hay error
                const client = getSupabaseClient();
                await client.auth.signOut();
            } finally {
                if (loginAdminBtn) { loginAdminBtn.disabled = false; loginAdminBtn.textContent = 'Acceder como Administrador'; }
            }
        });
    }
});