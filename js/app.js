// js/app.js

let fotosSeleccionadas = {
    foto1: null,
    foto2: null
};

let usuariosCargados = [];
let emailActual = '';
// Cache del estado de pareja para usarlo en la sección de usuarios
let estadoParejaCache = { tienePareja: false, tieneEnviada: false, idsConSolicitudEnviada: new Set(), miGenero: '' };
let usuarioActualId = null;
let interlocutorActual = null;
let citasAgendadas = [];
let relacionesUsuarios = {
    setupRequired: false,
    amigos: new Set(),
    solicitudesEnviadas: new Set(),
    solicitudesRecibidasPorId: new Set(),
    solicitudesRecibidas: [],
    amigosDetalle: []
};
let usuariosDataLoaded = false;
let usuariosDataLoading = false;
let perfilPropioCache = null;

document.addEventListener('DOMContentLoaded', async () => {
    function setupMenuFallbackNavigation() {
        const menuItemsFallback = document.querySelectorAll('.menu-item');
        const sectionsFallback = document.querySelectorAll('.content-section');

        menuItemsFallback.forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                menuItemsFallback.forEach((i) => i.classList.remove('active'));
                item.classList.add('active');

                sectionsFallback.forEach((sec) => sec.classList.remove('active'));
                const target = document.getElementById(`sec-${item.getAttribute('data-section')}`);
                if (target) target.classList.add('active');
            });
        });
    }

    // Navegacion base: permite cambiar de seccion aunque falle una carga asincrona.
    setupMenuFallbackNavigation();

    const supabaseClient = window.supabaseClient || (typeof supabase !== 'undefined'
        ? supabase.createClient('https://jlqfrsnyzgfnmzfrzxrk.supabase.co', 'sb_publishable_T9HkJDmciCjA0FOh44riEw_ldRz22B0')
        : null);

    if (!supabaseClient) {
        console.error('No se pudo inicializar Supabase en dashboard.');
        return;
    }

    window.supabaseClient = supabaseClient;

    const dashboardContainer = document.querySelector('.dashboard-container');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const SIDEBAR_KEY = 'akaito-sidebar-hidden';

    const applySidebarState = (isHidden) => {
        if (!dashboardContainer || !btnToggleSidebar) return;
        dashboardContainer.classList.toggle('sidebar-hidden', isHidden);
        btnToggleSidebar.textContent = isHidden ? '☰ Mostrar menú' : '☰ Ocultar menú';
        btnToggleSidebar.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
    };

    if (dashboardContainer && btnToggleSidebar) {
        const savedSidebarState = localStorage.getItem(SIDEBAR_KEY);
        const sidebarWasHidden = savedSidebarState === null ? true : savedSidebarState === 'true';
        applySidebarState(sidebarWasHidden);

        btnToggleSidebar.addEventListener('click', () => {
            const isHidden = !dashboardContainer.classList.contains('sidebar-hidden');
            applySidebarState(isHidden);
            localStorage.setItem(SIDEBAR_KEY, isHidden ? 'true' : 'false');
        });
    }

    const citasTabButtons = document.querySelectorAll('.citas-tab-btn');
    const citasTabPanels = document.querySelectorAll('.citas-tab-panel');
    const usuariosTabButtons = document.querySelectorAll('.usuarios-tab-btn');
    const usuariosTabPanels = document.querySelectorAll('.usuarios-tab-panel');

    function crearMapaUsuarios() {
        return new Map(usuariosCargados.map((usuario) => [String(usuario.id), usuario]));
    }

    function formatearFecha(valor) {
        if (!valor) return 'fecha no disponible';
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return 'fecha no disponible';
        return fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    }

    function renderizarEstadoConfiguracionAmistades() {
        UI.crearEstadoConfiguracion(document.getElementById('listaUsuarios'), 'Configura las tablas de amistades en Supabase para habilitar esta sección.');
        UI.crearEstadoConfiguracion(document.getElementById('listaAmigos'), 'Configura las tablas de amistades en Supabase para ver tu lista de amigos.');
        UI.crearEstadoConfiguracion(document.getElementById('listaSolicitudes'), 'Configura las tablas de amistades en Supabase para gestionar solicitudes.');
    }

    function renderizarEstadoErrorAmistades(mensaje) {
        const texto = mensaje || 'No se pudieron cargar amigos y solicitudes en este momento.';
        UI.crearEstadoConfiguracion(document.getElementById('listaAmigos'), texto);
        UI.crearEstadoConfiguracion(document.getElementById('listaSolicitudes'), texto);
    }

    function withTimeout(promise, ms, label) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Tiempo de espera agotado (${label})`)), ms);
            })
        ]);
    }

    function actualizarEstadoConexion(texto, tipo = 'info') {
        const estado = document.getElementById('estadoConexionSupabase');
        if (!estado) return;
        const color = tipo === 'ok' ? '#2e7d32' : (tipo === 'error' ? '#c62828' : 'var(--text-muted)');
        estado.style.color = color;
        estado.textContent = texto;
    }

    function construirPerfilFallbackDesdeSesion(user) {
        const meta = user?.user_metadata || {};
        return {
            email: user?.email || '',
            nombre: meta.nombre || meta.nombre_perfil || '',
            nombre_perfil: meta.nombre_perfil || meta.nombre || '',
            apellido_paterno: meta.apellido_paterno || '',
            apellido_materno: meta.apellido_materno || '',
            apodo: meta.apodo || '',
            pais: meta.pais || '',
            fecha_nacimiento: meta.fecha_nacimiento || '',
            genero: meta.genero || '',
            whatsapp: meta.whatsapp || '',
            instagram: meta.instagram || '',
            bio: meta.bio || '',
            intereses: meta.intereses || '',
            busca: meta.busca || 'pareja'
        };
    }

    async function cargarPerfilPropioDesdeBD(session) {
        if (!session?.user?.email) return null;

        try {
            const { data: perfil, error } = await withTimeout(
                supabaseClient
                    .from('usuarios')
                    .select('*')
                    .ilike('email', session.user.email)
                    .maybeSingle(),
                10000,
                'perfil-propio'
            );

            if (error) {
                actualizarEstadoConexion('Auth conectada. Error al leer tabla usuarios: ' + (error.message || 'desconocido'), 'error');
                return null;
            }

            if (!perfil) {
                actualizarEstadoConexion('Auth conectada. No se encontro tu perfil en tabla usuarios.', 'error');
                window.perfilPropioCache = perfil;
                return null;
            }

            perfilPropioCache = perfil;
            actualizarEstadoConexion('Auth y perfil conectados correctamente.', 'ok');
            return perfil;
        } catch (error) {
            actualizarEstadoConexion('Auth conectada. Timeout al leer tabla usuarios.', 'error');
            return null;
        }
    }

    async function refrescarRelaciones() {
        if (!usuarioActualId) return;

        try {
            const timeoutMs = 10000;
            const [amigosSettled, recibidasSettled, enviadasSettled] = await Promise.allSettled([
                withTimeout(API.obtenerAmigos(usuarioActualId), timeoutMs, 'amigos'),
                withTimeout(API.obtenerSolicitudesRecibidas(usuarioActualId), timeoutMs, 'solicitudes recibidas'),
                withTimeout(API.obtenerSolicitudesEnviadas(usuarioActualId), timeoutMs, 'solicitudes enviadas')
            ]);

            const amigosResult = amigosSettled.status === 'fulfilled' ? amigosSettled.value : { data: [], error: amigosSettled.reason, setupRequired: false };
            const recibidasResult = recibidasSettled.status === 'fulfilled' ? recibidasSettled.value : { data: [], error: recibidasSettled.reason, setupRequired: false };
            const enviadasResult = enviadasSettled.status === 'fulfilled' ? enviadasSettled.value : { data: [], error: enviadasSettled.reason, setupRequired: false };

            if (amigosSettled.status === 'rejected' || recibidasSettled.status === 'rejected' || enviadasSettled.status === 'rejected') {
                console.error('Error o timeout en carga de relaciones:', {
                    amigos: amigosSettled.status === 'rejected' ? amigosSettled.reason : null,
                    recibidas: recibidasSettled.status === 'rejected' ? recibidasSettled.reason : null,
                    enviadas: enviadasSettled.status === 'rejected' ? enviadasSettled.reason : null
                });
            }

            if (amigosResult.error || recibidasResult.error || enviadasResult.error) {
                const mensaje = amigosResult.error?.message || recibidasResult.error?.message || enviadasResult.error?.message || 'No se pudieron cargar las relaciones';
                console.warn('No se pudieron cargar las relaciones:', mensaje);
                UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
                renderizarEstadoErrorAmistades(mensaje);
                return;
            }

            const setupRequired = amigosResult.setupRequired || recibidasResult.setupRequired || enviadasResult.setupRequired;
            relacionesUsuarios = {
                setupRequired,
                amigos: new Set((amigosResult.data || []).map((fila) => String(fila.user_id) === String(usuarioActualId) ? String(fila.friend_id) : String(fila.user_id))),
                solicitudesEnviadas: new Set((enviadasResult.data || []).map((fila) => String(fila.receptor_id))),
                solicitudesRecibidasPorId: new Set((recibidasResult.data || []).map((fila) => String(fila.solicitante_id))),
                solicitudesRecibidas: recibidasResult.data || [],
                amigosDetalle: (amigosResult.data || []).map((fila) => ({
                    usuarioId: String(fila.user_id) === String(usuarioActualId) ? String(fila.friend_id) : String(fila.user_id),
                    fechaAmistad: formatearFecha(fila.created_at)
                }))
            };
            // Exponer globalmente para que ui.js pueda consultarlo al mostrar perfil
            window.relacionesUsuariosGlobal = relacionesUsuarios;

            if (setupRequired) {
                renderizarEstadoConfiguracionAmistades();
                return;
            }

            UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
            UI.renderizarAmigos(relacionesUsuarios.amigosDetalle, crearMapaUsuarios(), estadoParejaCache);
            UI.renderizarSolicitudes(relacionesUsuarios.solicitudesRecibidas, crearMapaUsuarios());
        } catch (error) {
            console.error('Error inesperado cargando relaciones:', error);
            const mensaje = error?.message || 'No se pudieron cargar las relaciones';
            UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
            renderizarEstadoErrorAmistades(mensaje);
        }
    }

    async function cargarDatosUsuarios(sessionEmail) {
        usuariosDataLoading = true;
        emailActual = sessionEmail;
        try {
            const { data: usuarios, error } = await withTimeout(
                supabaseClient.from('usuarios').select('*'),
                10000,
                'usuarios'
            );
            if (error) {
                console.warn('No se pudieron cargar los usuarios:', error.message);
                UI.crearEstadoConfiguracion(document.getElementById('listaUsuarios'), 'No se pudieron cargar los usuarios en este momento.');
                renderizarEstadoErrorAmistades('No se pudieron cargar amigos y solicitudes en este momento.');
                return;
            }

            usuariosCargados = usuarios || [];
            const emailActualNormalizado = (sessionEmail || '').trim().toLowerCase();
            const usuarioActual = usuariosCargados.find((usuario) => ((usuario.email || '').trim().toLowerCase() === emailActualNormalizado));
            usuarioActualId = usuarioActual?.id || perfilPropioCache?.id || null;

            const miembrosDistintos = usuariosCargados.filter((usuario) => ((usuario.email || '').trim().toLowerCase() !== emailActualNormalizado));
            if (usuariosCargados.length > 0 && miembrosDistintos.length === 0) {
                actualizarEstadoConexion('Solo se ve tu propio perfil. Revisa políticas RLS de SELECT en tabla usuarios para miembros autenticados.', 'error');
            } else if (miembrosDistintos.length > 0) {
                actualizarEstadoConexion(`Perfiles cargados: ${usuariosCargados.length}. Miembros visibles: ${miembrosDistintos.length}.`, 'ok');
            } else if (usuariosCargados.length === 0) {
                actualizarEstadoConexion('La consulta de usuarios devolvió 0 filas.', 'error');
            }

            renderizarOpcionesUsuarios();

            if (!usuarioActualId) {
                UI.mostrarAlerta('No se pudo identificar el ID del usuario actual.');
                UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
                return;
            }

            await refrescarRelaciones();
            usuariosDataLoaded = true;
        } catch (error) {
            console.error('Error cargando datos de usuarios:', error);
            const mensaje = error?.message || 'No se pudieron cargar los usuarios en este momento.';
            UI.crearEstadoConfiguracion(document.getElementById('listaUsuarios'), mensaje);
            renderizarEstadoErrorAmistades(mensaje);
        } finally {
            usuariosDataLoading = false;
        }
    }

    async function asegurarCargaUsuarios() {
        if (usuariosDataLoaded || usuariosDataLoading) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        await cargarDatosUsuarios(session.user.email);
    }

    async function enviarSolicitudDeAmistad(userIdDestino) {
        const { error } = await API.enviarSolicitudAmistad(usuarioActualId, userIdDestino);
        if (error) {
            UI.mostrarAlerta(error.message || 'No se pudo enviar la solicitud de amistad.');
            return;
        }

        await refrescarRelaciones();
    }

    async function responderSolicitud(solicitudId, aceptar) {
        const { error } = await API.responderSolicitudAmistad(solicitudId, aceptar);
        if (error) {
            UI.mostrarAlerta(error.message || 'No se pudo responder la solicitud.');
            return;
        }

        await refrescarRelaciones();
    }

    function showUsuariosTab(tabKey) {
        if (!tabKey) return;

        usuariosTabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === tabKey);
        });

        usuariosTabPanels.forEach((panel) => {
            panel.classList.toggle('active', panel.id === `usuarios-tab-${tabKey}`);
        });
    }

    usuariosTabButtons.forEach((button) => {
        button.addEventListener('click', async function () {
            showUsuariosTab(this.dataset.tab);
            if (this.dataset.tab === 'buscar') {
                UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
            }
            if (this.dataset.tab === 'solicitudes') {
                UI.renderizarSolicitudes(relacionesUsuarios.solicitudesRecibidas || [], crearMapaUsuarios());
            }
            if (this.dataset.tab === 'solicitudes-pareja') {
                cargarSolicitudesPareja();
            }
            if (this.dataset.tab === 'amigos') {
                UI.renderizarAmigos(relacionesUsuarios.amigosDetalle || [], crearMapaUsuarios(), estadoParejaCache);
                // Re-renderizar con el estado de pareja actualizado
                actualizarEstadoParejaCache().then(() => {
                    UI.renderizarAmigos(relacionesUsuarios.amigosDetalle, crearMapaUsuarios(), estadoParejaCache);
                }).catch((error) => {
                    console.error('Error actualizando estado de pareja al abrir amigos:', error);
                });
            }

            await asegurarCargaUsuarios();
        });
    });

    // Evita que el texto "Cargando..." quede permanente antes de la primera carga.
    UI.renderizarUsuarios([], emailActual, relacionesUsuarios, estadoParejaCache);
    UI.renderizarAmigos([], crearMapaUsuarios(), estadoParejaCache);
    UI.renderizarSolicitudes([], crearMapaUsuarios());

    function showCitasTab(tabKey) {
        if (!tabKey) return;
        citasTabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.tab === tabKey);
        });
        citasTabPanels.forEach((panel) => {
            panel.classList.toggle('active', panel.id === `citas-tab-${tabKey}`);
        });
    }

    citasTabButtons.forEach((button) => {
        button.addEventListener('click', function () {
            // Ignorar botones de eventos que comparten la clase
            if (this.dataset.eventosTab) return;
            showCitasTab(this.dataset.tab);
            if (this.dataset.tab === 'recibidas' || this.dataset.tab === 'enviadas') {
                cargarCitas();
            }
        });
    });

    // Pestañas de eventos
    document.querySelectorAll('[data-eventos-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-eventos-tab]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#sec-eventos .citas-tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`eventos-tab-${this.dataset.eventosTab}`);
            if (panel) panel.classList.add('active');
        });
    });

    const citaTipoSelect = document.getElementById('citaTipo');
    const citaPersonaSelect = document.getElementById('citaPersona');
    const citaFiltroPaisSelect = document.getElementById('citaFiltroPais');
    const citaForm = document.getElementById('citaForm');
    const citaFeedback = document.getElementById('citaFeedback');
    const citaRecibidasList = document.getElementById('citaRecibidasList');
    const citaEnviadasList = document.getElementById('citaEnviadasList');

    function obtenerPaisUsuario(usuario) {
        return (usuario?.pais || usuario?.país || '').trim();
    }

    function obtenerOpcionesPaisDesdePerfil() {
        const perfilPaisSelect = document.getElementById('profPais');
        if (!perfilPaisSelect) return [];

        return Array.from(perfilPaisSelect.options)
            .filter((opt) => opt.value)
            .map((opt) => ({ value: opt.value, label: opt.textContent.trim() }));
    }

    function normalizarTexto(valor) {
        return (valor || '').toString().trim().toLowerCase();
    }

    function usuarioCoincideConPais(usuario, paisValor, paisLabel) {
        if (!paisValor) return true;
        const paisUsuario = obtenerPaisUsuario(usuario);
        const paisNorm = normalizarTexto(paisUsuario);
        return paisNorm === normalizarTexto(paisValor) || paisNorm === normalizarTexto(paisLabel);
    }

    function formatearFechaCita(fecha, hora) {
        if (!fecha) return 'Fecha pendiente';
        const fechaDate = new Date(`${fecha}T${hora || '00:00'}`);
        if (Number.isNaN(fechaDate.getTime())) return fecha;
        return fechaDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function formatearHoraCita(hora) {
        if (!hora) return '';
        const [horas, minutos] = hora.split(':');
        const d = new Date();
        d.setHours(Number(horas || 0), Number(minutos || 0), 0, 0);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    const estadoColores = { pendiente: '#ff9800', aceptada: '#4caf50', rechazada: '#f44336' };

    function renderizarTarjetaCita(cita, modo) {
        const estadoColor = estadoColores[cita.estado] || '#888';
        const otra = modo === 'recibida' ? cita.remitente_email : cita.destinatario_email;

        let participantesHTML = '';
        if (cita.tipo === 'gokon' && Array.isArray(cita.participantes) && cita.participantes.length) {
            const nombres = cita.participantes.map(id => {
                const u = usuariosCargados.find(u => u.id == id);
                return u ? (u.nombre || u.email) : `#${id}`;
            });
            participantesHTML = `<p style="margin-bottom:6px;"><strong>Participantes (${cita.participantes.length}):</strong> ${nombres.join(', ')}</p>`;
        }

        return `
            <div class="card" style="background-color: white;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                    <h3 style="margin:0;">${cita.tipo === 'gokon' ? '🎉 Gokon (Grupo)' : '📅 Cita'} · ${cita.lugar || 'Lugar por definir'}</h3>
                    <span style="background:${estadoColor}; color:white; padding:4px 10px; border-radius:4px; font-size:0.8rem; text-transform:capitalize; white-space:nowrap;">${cita.estado || 'pendiente'}</span>
                </div>
                <p style="margin-bottom:6px; color:var(--text-muted);">${formatearFechaCita(cita.fecha, cita.hora)} ${cita.hora ? '· ' + formatearHoraCita(cita.hora) : ''}</p>
                ${cita.tipo !== 'gokon' ? `<p style="margin-bottom:${modo === 'recibida' && cita.estado === 'pendiente' ? '14px' : '0'};"><strong>${modo === 'recibida' ? 'De:' : 'Para:'}</strong> ${otra}</p>` : participantesHTML}
                ${modo === 'recibida' && cita.estado === 'pendiente' && cita.tipo !== 'gokon' ? `
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary js-cita-accept-btn" data-id="${cita.id}" style="padding:8px 16px;">✓ Aceptar</button>
                    <button class="js-cita-reject-btn" data-id="${cita.id}" style="padding:8px 16px; border:1px solid #dee2e6; background:white; border-radius:8px; cursor:pointer;">✗ Rechazar</button>
                </div>` : ''}
            </div>
        `;
    }

    async function cargarCitas() {
        const session = (await supabaseClient.auth.getSession()).data.session;
        if (!session) return;

        const { data, error } = await supabaseClient.from('citas').select('*');
        if (error) {
            console.error('Error cargando citas:', error);
            return;
        }

        const recibidas = (data || []).filter(c => c.destinatario_email === session.user.email);
        const enviadas = (data || []).filter(c => c.remitente_email === session.user.email);

        if (citaRecibidasList) {
            citaRecibidasList.innerHTML = recibidas.length === 0
                ? '<div class="card" style="background-color:white;"><p style="margin:0;color:var(--text-muted);">No tienes invitaciones recibidas.</p></div>'
                : recibidas.map(c => renderizarTarjetaCita(c, 'recibida')).join('');
        }

        if (citaEnviadasList) {
            citaEnviadasList.innerHTML = enviadas.length === 0
                ? '<div class="card" style="background-color:white;"><p style="margin:0;color:var(--text-muted);">No has enviado invitaciones.</p></div>'
                : enviadas.map(c => renderizarTarjetaCita(c, 'enviada')).join('');
        }
    }

    function renderizarOpcionesUsuarios() {
        if (!citaPersonaSelect) return;
        const candidatos = usuariosCargados
            .filter((u) => u.email !== emailActual);

        if (citaFiltroPaisSelect) {
            const paisSeleccionado = citaFiltroPaisSelect.value || '';
            const opcionesPerfil = obtenerOpcionesPaisDesdePerfil();
            citaFiltroPaisSelect.innerHTML = '<option value="">Todos los países</option>' +
                opcionesPerfil.map((opcion) => `<option value="${opcion.value}">${opcion.label}</option>`).join('');

            citaFiltroPaisSelect.value = opcionesPerfil.some((opcion) => opcion.value === paisSeleccionado) ? paisSeleccionado : '';
        }

        const paisActivo = citaFiltroPaisSelect?.value || '';
        const paisActivoLabel = citaFiltroPaisSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
        const opciones = candidatos
            .filter((u) => usuarioCoincideConPais(u, paisActivo, paisActivoLabel))
            .map((u) => {
                const nombre = u.nombre || u.nombre_perfil || u.email?.split('@')[0] || 'Usuario';
                return `<option value="${u.email}">${nombre}</option>`;
            })
            .join('');
        citaPersonaSelect.innerHTML = `<option value="">Selecciona un usuario</option>${opciones}`;
    }

    if (citaFiltroPaisSelect) {
        citaFiltroPaisSelect.addEventListener('change', renderizarOpcionesUsuarios);
    }

    function renderizarListasGokon() {
        const listaChicos = document.getElementById('listaChicosGokon');
        const listaChicas = document.getElementById('listaChicasGokon');
        if (!listaChicos || !listaChicas) return;

        const miPerfil = usuariosCargados.find(u => u.email === emailActual);
        const miId = miPerfil?.id;

        // Incluir al propio usuario siempre; los demás solo si son amigos
        const chicos = usuariosCargados.filter(u => u.genero === 'masculino' && (u.id === miId || relacionesUsuarios.amigos?.has(String(u.id))));
        const chicas = usuariosCargados.filter(u => u.genero === 'femenino' && (u.id === miId || relacionesUsuarios.amigos?.has(String(u.id))));

        const construirCheckbox = (u) => {
            const nombre = u.nombre || u.email?.split('@')[0] || 'Usuario';
            const esSelf = u.id === miId;
            return `<label style="display:flex; align-items:center; gap:8px; cursor:${esSelf ? 'default' : 'pointer'}; padding:4px 0; ${esSelf ? 'opacity:0.7;' : ''}">
                <input type="checkbox" class="gokon-check" value="${u.id}" ${esSelf ? 'checked disabled' : ''} style="width:16px; height:16px; cursor:${esSelf ? 'default' : 'pointer'};"> ${nombre}${esSelf ? ' <em style="font-size:0.8rem;">(tú)</em>' : ''}
            </label>`;
        };

        listaChicos.innerHTML = chicos.length ? chicos.map(construirCheckbox).join('') : '<p style="color:var(--text-muted); font-size:0.9rem;">Sin chicos disponibles</p>';
        listaChicas.innerHTML = chicas.length ? chicas.map(construirCheckbox).join('') : '<p style="color:var(--text-muted); font-size:0.9rem;">Sin chicas disponibles</p>';

        // Contadores iniciales (incluye al creador si está en ese género)
        const contarYActualizar = (contenedor, contadorId) => {
            const actualizar = () => {
                const checks = contenedor.querySelectorAll('.gokon-check');
                const seleccionados = Array.from(checks).filter(c => c.checked && !c.disabled).length;
                const selfCheck = contenedor.querySelector('.gokon-check[disabled]');
                const total = seleccionados + (selfCheck ? 1 : 0);
                document.getElementById(contadorId).textContent = total;
                checks.forEach(c => {
                    if (!c.disabled) c.disabled = total >= 5 && !c.checked;
                });
            };
            contenedor.addEventListener('change', actualizar);
            actualizar();
        };
        contarYActualizar(listaChicos, 'contadorChicos');
        contarYActualizar(listaChicas, 'contadorChicas');
    }

    // Mostrar/ocultar campos según tipo de cita
    if (citaTipoSelect) {
        citaTipoSelect.addEventListener('change', () => {
            const esGokon = citaTipoSelect.value === 'gokon';
            document.getElementById('citaNormalGroup').style.display = esGokon ? 'none' : 'block';
            document.getElementById('citaGokonGroup').style.display = esGokon ? 'block' : 'none';
            if (esGokon) renderizarListasGokon();
        });
    }


    if (citaForm) {
        citaForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const tipo = citaTipoSelect?.value || 'normal';
            const fecha = document.getElementById('citaFecha')?.value;
            const hora = document.getElementById('citaHora')?.value;
            const lugar = document.getElementById('citaLugar')?.value.trim();

            if (!fecha || !hora || !lugar) {
                if (citaFeedback) citaFeedback.textContent = 'Completa fecha, hora y lugar.';
                return;
            }

            const session = (await supabaseClient.auth.getSession()).data.session;
            if (!session) return;

            if (tipo === 'gokon') {
                const chicosIds = Array.from(document.querySelectorAll('#listaChicosGokon .gokon-check:checked')).map(c => parseInt(c.value));
                const chicasIds = Array.from(document.querySelectorAll('#listaChicasGokon .gokon-check:checked')).map(c => parseInt(c.value));

                // Incluir al creador según su género si no está ya seleccionado
                const miPerfil = usuariosCargados.find(u => u.email === session.user.email);
                if (miPerfil) {
                    if (miPerfil.genero === 'masculino' && !chicosIds.includes(miPerfil.id)) chicosIds.unshift(miPerfil.id);
                    if (miPerfil.genero === 'femenino' && !chicasIds.includes(miPerfil.id)) chicasIds.unshift(miPerfil.id);
                }

                if (chicosIds.length < 2 || chicasIds.length < 2) {
                    if (citaFeedback) citaFeedback.textContent = 'El gokon requiere mínimo 2 chicos y 2 chicas (incluyéndote a ti).';
                    return;
                }

                const participantes = [...chicosIds, ...chicasIds];
                const { error } = await supabaseClient.from('citas').insert([{
                    remitente_email: session.user.email,
                    destinatario_email: session.user.email, // organizador
                    tipo: 'gokon',
                    fecha,
                    hora,
                    lugar,
                    estado: 'pendiente',
                    participantes
                }]);

                if (error) {
                    if (citaFeedback) citaFeedback.textContent = 'Error: ' + error.message;
                    return;
                }
            } else {
                const destinatario = citaPersonaSelect?.value?.trim() || '';
                if (!destinatario) {
                    if (citaFeedback) citaFeedback.textContent = 'Selecciona con quién quieres agendar la cita.';
                    return;
                }

                const { error } = await supabaseClient.from('citas').insert([{
                    remitente_email: session.user.email,
                    destinatario_email: destinatario,
                    tipo,
                    fecha,
                    hora,
                    lugar,
                    estado: 'pendiente',
                    participantes: []
                }]);

                if (error) {
                    if (citaFeedback) citaFeedback.textContent = 'Error: ' + error.message;
                    return;
                }
            }

            citaForm.reset();
            document.getElementById('citaNormalGroup').style.display = 'block';
            document.getElementById('citaGokonGroup').style.display = 'none';
            document.getElementById('contadorChicos').textContent = '0';
            document.getElementById('contadorChicas').textContent = '0';
            if (citaFeedback) citaFeedback.textContent = '¡Invitación enviada!';
            showCitasTab('enviadas');
            await cargarCitas();
        });
    }
    
    // --- NAVEGACIÓN ---
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    const btnConfig = null; // eliminado: ahora configuracion es una seccion del menu
    
    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            try {
                e.preventDefault();
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                sections.forEach(sec => sec.classList.remove('active'));
                const target = document.getElementById(`sec-${item.getAttribute('data-section')}`);
                if (target) target.classList.add('active');
                
                // Cargar usuarios si se hace clic en la sección Usuarios
                if (item.getAttribute('data-section') === 'emparejador') {
                    await asegurarCargaUsuarios();
                    await actualizarEstadoParejaCache();
                    UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
                }

                // Cargar citas al entrar a la sección
                if (item.getAttribute('data-section') === 'citas') {
                    await cargarCitas();
                }

                // Cargar estado de pareja al entrar a beneficios
                if (item.getAttribute('data-section') === 'beneficios') {
                    await cargarEstadoPareja();
                }

                // Cargar perfil si se hace clic en perfil
                if (item.getAttribute('data-section') === 'perfil') {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        try {
                            const usuario = await cargarPerfilPropioDesdeBD(session);
                            if (usuario) {
                                UI.cargarPerfil(usuario);
                                // Cargar previsualizaciones de fotos si existen
                                if (usuario.foto1) {
                                    document.getElementById('preview1').src = usuario.foto1;
                                    document.getElementById('preview1').style.display = 'block';
                                    document.getElementById('fotoBox1').style.display = 'none';
                                }
                                if (usuario.foto2) {
                                    document.getElementById('preview2').src = usuario.foto2;
                                    document.getElementById('preview2').style.display = 'block';
                                    document.getElementById('fotoBox2').style.display = 'none';
                                }
                            } else {
                                UI.cargarPerfil(construirPerfilFallbackDesdeSesion(session.user));
                            }
                        } catch (error) {
                            console.warn('No se pudo cargar el perfil desde usuarios:', error?.message || error);
                            UI.cargarPerfil(construirPerfilFallbackDesdeSesion(session.user));
                        }
                    }
                }
            } catch (error) {
                console.error('Error al cambiar de seccion:', error);
            }
        });
    });

    // --- CARGA INICIAL DE DATOS ---
    if (window.location.pathname.includes('dashboard.html')) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            actualizarEstadoConexion('Auth conectada. Verificando perfil...', 'info');
            const nombreSesion = (
                session.user?.user_metadata?.nombre ||
                session.user?.user_metadata?.nombre_perfil ||
                (session.user.email || 'paisano').split('@')[0]
            );

            // Mostrar nombre inmediatamente sin depender de la tabla usuarios.
            UI.actualizarNombreUsuario(nombreSesion);

            // Mostrar correo actual en el campo de perfil desde el inicio
            const emailDisplay = document.getElementById('profEmailDisplay');
            if (emailDisplay) emailDisplay.textContent = session.user.email;

            // Intentar refinar con la tabla usuarios sin romper la inicialización si falla.
            try {
                const usuario = await cargarPerfilPropioDesdeBD(session);
                if (usuario) {
                    UI.actualizarNombreUsuario(usuario.nombre || usuario.nombre_perfil || nombreSesion);
                    UI.cargarPerfil(usuario);
                } else {
                    UI.cargarPerfil(construirPerfilFallbackDesdeSesion(session.user));
                }
            } catch (error) {
                console.warn('No se pudo cargar el perfil inicial:', error?.message || error);
                UI.cargarPerfil(construirPerfilFallbackDesdeSesion(session.user));
            }

            // Cargar usuarios/chat en segundo plano para no bloquear todo el dashboard.
            (async () => {
                try {
                    await cargarDatosUsuarios(session.user.email);
                    const listaContactos = document.getElementById('listaContactos');
                    if (listaContactos && usuarioActualId) {
                        await Chat.cargarLista(listaContactos, usuarioActualId);
                    }
                } catch (error) {
                    console.error('Error en inicialización de usuarios/chat:', error);
                }
            })();
        }
    }

    // --- MANEJO DE FOTOS ---
    const fotoBox1 = document.getElementById('fotoBox1');
    const fotoBox2 = document.getElementById('fotoBox2');
    const inputFoto1 = document.getElementById('inputFoto1');
    const inputFoto2 = document.getElementById('inputFoto2');
    const preview1 = document.getElementById('preview1');
    const preview2 = document.getElementById('preview2');

    const setupFotoHandler = (box, input, preview, numeroFoto) => {
        box.addEventListener('click', () => input.click());
        
        input.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                // Guardar referencia del archivo
                fotosSeleccionadas[`foto${numeroFoto}`] = archivo;
                
                // Mostrar previsualización
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    box.style.display = 'none';
                };
                reader.readAsDataURL(archivo);
            }
        });
        
        // Permitir hacer clic en la previsualización para cambiar foto
        preview.addEventListener('click', () => input.click());
    };

    if (fotoBox1 && inputFoto1) setupFotoHandler(fotoBox1, inputFoto1, preview1, 1);
    if (fotoBox2 && inputFoto2) setupFotoHandler(fotoBox2, inputFoto2, preview2, 2);

    const profFechaNacimiento = document.getElementById('profFechaNacimiento');
    if (profFechaNacimiento) {
        profFechaNacimiento.addEventListener('change', () => UI.actualizarEdadDesdeNacimiento());
        profFechaNacimiento.addEventListener('input', () => UI.actualizarEdadDesdeNacimiento());
    }

    // --- EVENTO GUARDAR PERFIL ---
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            
            if (!session) {
                alert('Debes estar autenticado');
                return;
            }

            // Cambiar email en Auth si se ingresó uno nuevo distinto al actual
            const nuevoEmail = document.getElementById('profEmail')?.value?.trim();
            if (nuevoEmail && nuevoEmail !== session.user.email) {
                // Verificar que el correo no esté ya en uso
                const { data: existente } = await supabaseClient
                    .from('usuarios')
                    .select('id')
                    .eq('email', nuevoEmail)
                    .maybeSingle();

                if (existente) {
                    alert('Ese correo ya está registrado por otro usuario.');
                    return;
                }

                const { error: errEmail } = await supabaseClient.auth.updateUser({ email: nuevoEmail });
                if (errEmail) {
                    alert('Error al cambiar correo: ' + errEmail.message);
                    return;
                }
                alert('Se envió un enlace de confirmación a ' + nuevoEmail + '. Confirma el nuevo correo para completar el cambio.');
                document.getElementById('profEmail').value = '';
            }

            const fechaNacimiento = document.getElementById('profFechaNacimiento').value;
            const edadCalculada = window.calcularEdadDesdeFechaNacimiento ? window.calcularEdadDesdeFechaNacimiento(fechaNacimiento) : null;

            const datosPerfil = {
                nombre: (document.getElementById('profNombre').value || '').trim(),
                genero: (document.getElementById('profGenero').value || '').trim() || null,
                whatsapp: (document.getElementById('profWhatsapp').value || '').trim() || null,
                instagram: (document.getElementById('profInstagram').value || '').trim() || null,
                mostrar_whatsapp: document.getElementById('profMostrarWhatsapp')?.value || 'nadie',
                mostrar_instagram: document.getElementById('profMostrarInstagram')?.value || 'nadie',
                mostrar_email: document.getElementById('profMostrarEmail')?.value || 'nadie',
                bio: (document.getElementById('profBio').value || '').trim() || null,
                intereses: (document.getElementById('profIntereses').value || '').trim() || null,
                busca: (document.getElementById('profBusca').value || 'pareja').trim() || 'pareja'
            };

            // Permitir guardar también valores vacíos (como null) en campos opcionales.
            datosPerfil.apellido_paterno = (document.getElementById('profApellidoPaterno').value || '').trim() || null;
            datosPerfil.apellido_materno = (document.getElementById('profApellidoMaterno').value || '').trim() || null;
            datosPerfil.apodo = (document.getElementById('profApodo').value || '').trim() || null;
            datosPerfil.pais = (document.getElementById('profPais').value || '').trim() || null;
            datosPerfil.fecha_nacimiento = fechaNacimiento || null;

            if (edadCalculada !== null) {
                datosPerfil.edad = edadCalculada;
            }

            // Subir fotos si fueron seleccionadas
            if (fotosSeleccionadas.foto1) {
                console.log('📸 Procesando foto 1...');
                const resultado1 = await API.subirFoto(session.user.email, fotosSeleccionadas.foto1, 1);
                if (resultado1.error) {
                    console.error('❌ Error foto 1:', resultado1.error);
                    alert('Error al subir foto 1: ' + resultado1.error);
                } else if (resultado1.data && resultado1.data.url) {
                    console.log('✅ Foto 1 guardada:', resultado1.data.url);
                    datosPerfil.foto1 = resultado1.data.url;
                    fotosSeleccionadas.foto1 = null;
                }
            }

            if (fotosSeleccionadas.foto2) {
                console.log('📸 Procesando foto 2...');
                const resultado2 = await API.subirFoto(session.user.email, fotosSeleccionadas.foto2, 2);
                if (resultado2.error) {
                    console.error('❌ Error foto 2:', resultado2.error);
                    alert('Error al subir foto 2: ' + resultado2.error);
                } else if (resultado2.data && resultado2.data.url) {
                    console.log('✅ Foto 2 guardada:', resultado2.data.url);
                    datosPerfil.foto2 = resultado2.data.url;
                    fotosSeleccionadas.foto2 = null;
                }
            }

            console.log('💾 Guardando datos en base de datos:', datosPerfil);

            let perfilId = perfilPropioCache?.id || null;
            if (!perfilId) {
                const perfil = await cargarPerfilPropioDesdeBD(session);
                perfilId = perfil?.id || null;
            }

            if (!perfilId) {
                alert('No se encontró tu registro en la tabla usuarios. Contacta al administrador para aprobar/migrar tu cuenta.');
                return;
            }

            const { data: actualizado, error } = await supabaseClient
                .from('usuarios')
                .update(datosPerfil)
                .eq('id', perfilId)
                .select('*')
                .maybeSingle();

            if (error) {
                alert('Error al guardar perfil: ' + error.message);
            } else {
                alert('¡Perfil guardado exitosamente!');
                UI.actualizarNombreUsuario(datosPerfil.nombre);
                if (actualizado) {
                    perfilPropioCache = actualizado;
                    window.perfilPropioCache = actualizado;
                    UI.cargarPerfil(actualizado);
                }
                actualizarEstadoConexion('Perfil guardado en Supabase correctamente.', 'ok');
            }
        });
    }

    // --- EVENTO ENVIAR MENSAJE ---
    const btnEnviar = document.getElementById('btnEnviar');
    const inputMensaje = document.getElementById('inputMensaje');
    
    const enviarMensaje = async () => {
        const contenido = (inputMensaje?.value || '').trim();
        
        if (!interlocutorActual) { alert('Selecciona un contacto'); return; }
        if (!contenido) { alert('Escribe un mensaje antes de enviarlo.'); return; }

        let remitenteId = usuarioActualId || perfilPropioCache?.id || null;
        if (!remitenteId && typeof Chat?.obtenerMiPerfilSeguro === 'function') {
            const miPerfil = await Chat.obtenerMiPerfilSeguro();
            remitenteId = miPerfil?.id || null;
            if (miPerfil && !perfilPropioCache) {
                perfilPropioCache = miPerfil;
                window.perfilPropioCache = miPerfil;
            }
        }

        if (!remitenteId) { alert('No se pudo identificar tu usuario actual.'); return; }

        try {
            const { error, data } = await API.enviarMensaje(remitenteId, interlocutorActual, contenido);
            if (error) {
                throw error;
            }

            inputMensaje.value = '';

            if (!data) {
                console.warn('Mensaje enviado, pero la insercion no devolvio data.');
            }

            // Refrescar mensajes tras enviar
            await Chat.abrirChat(interlocutorActual);
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            alert('No se pudo enviar el mensaje: ' + (error?.message || error || 'desconocido'));
        }
    };
    
    if (btnEnviar) {
        btnEnviar.addEventListener('click', enviarMensaje);
    }
    
    if (inputMensaje) {
        inputMensaje.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await enviarMensaje();
            }
        });
    }

    // --- EVENTO BUSCADOR USUARIOS ---
    function aplicarFiltrosUsuarios() {
        const texto = (document.getElementById('buscadorEmparejador')?.value || '').toLowerCase();
        const genero = document.getElementById('filtroGenero')?.value || '';
        const edadRango = document.getElementById('filtroEdad')?.value || '';
        const pais = document.getElementById('filtroPais')?.value || '';

        const usuariosFiltrados = usuariosCargados.filter(usuario => {
            // Filtro texto
            if (texto) {
                const nombre = (usuario.nombre || usuario.email || '').toLowerCase();
                const bio = (usuario.bio || '').toLowerCase();
                const intereses = (usuario.intereses || '').toLowerCase();
                if (!nombre.includes(texto) && !bio.includes(texto) && !intereses.includes(texto)) return false;
            }

            // Filtro género
            if (genero && usuario.genero !== genero) return false;

            // Filtro país
            if (pais && usuario.pais !== pais) return false;

            // Filtro rango de edad
            if (edadRango) {
                const edad = usuario.edad ?? (usuario.fecha_nacimiento ? UI.calcularEdad(usuario.fecha_nacimiento) : null);
                if (edad === null) return false;
                if (edadRango === '18-25' && !(edad >= 18 && edad <= 25)) return false;
                if (edadRango === '26-35' && !(edad >= 26 && edad <= 35)) return false;
                if (edadRango === '36-50' && !(edad >= 36 && edad <= 50)) return false;
                if (edadRango === '51+' && edad < 51) return false;
            }

            return true;
        });

        UI.renderizarUsuarios(usuariosFiltrados, emailActual, relacionesUsuarios, estadoParejaCache);
    }

    const buscadorEmparejador = document.getElementById('buscadorEmparejador');
    if (buscadorEmparejador) {
        buscadorEmparejador.addEventListener('input', aplicarFiltrosUsuarios);
    }

    ['filtroGenero', 'filtroEdad', 'filtroPais'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', aplicarFiltrosUsuarios);
    });

    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
        document.getElementById('buscadorEmparejador').value = '';
        document.getElementById('filtroGenero').value = '';
        document.getElementById('filtroEdad').value = '';
        document.getElementById('filtroPais').value = '';
        UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios, estadoParejaCache);
    });

    const citasSection = document.getElementById('sec-citas');
    if (citasSection) {
        citasSection.addEventListener('click', async (event) => {
            const acceptBtn = event.target.closest('.js-cita-accept-btn');
            if (acceptBtn) {
                const citaId = acceptBtn.dataset.id;
                const { error } = await supabaseClient.from('citas').update({ estado: 'aceptada' }).eq('id', citaId);
                if (!error) await cargarCitas();
                return;
            }

            const rejectBtn = event.target.closest('.js-cita-reject-btn');
            if (rejectBtn) {
                const citaId = rejectBtn.dataset.id;
                const { error } = await supabaseClient.from('citas').update({ estado: 'rechazada' }).eq('id', citaId);
                if (!error) await cargarCitas();
            }
        });
    }

    // --- LÓGICA DE PAREJA ---
    const beneficiosSection = document.getElementById('sec-beneficios');

    async function actualizarEstadoParejaCache() {
        if (!usuarioActualId) return;
        const miPerfil = usuariosCargados.find(u => u.id === usuarioActualId);
        estadoParejaCache.miGenero = miPerfil?.genero || '';

        const { data: parejas } = await supabaseClient
            .from('parejas')
            .select('*')
            .or(`solicitante_id.eq.${usuarioActualId},destinatario_id.eq.${usuarioActualId}`)
            .in('estado', ['activa', 'pendiente']);

        const activa = (parejas || []).find(p => p.estado === 'activa');
        const enviadas = (parejas || []).filter(p => p.estado === 'pendiente' && p.solicitante_id == usuarioActualId);

        estadoParejaCache.tienePareja = !!activa;
        estadoParejaCache.tieneEnviada = enviadas.length > 0;
        estadoParejaCache.idsConSolicitudEnviada = new Set(enviadas.map(p => String(p.destinatario_id)));

        // Exponer globalmente para que ui.js pueda consultarlo al mostrar perfil
        window.estadoParejaCache = estadoParejaCache;

        // Exponer globalmente para que ui.js pueda consultarlo al mostrar perfil
        if (activa) {
            const otroId = activa.solicitante_id == usuarioActualId ? activa.destinatario_id : activa.solicitante_id;
            window.estadoParejaGlobal = { parejaActivaId: otroId, parejaId: activa.id };
        } else {
            window.estadoParejaGlobal = { parejaActivaId: null, parejaId: null };
        }
    }

    async function cargarSolicitudesPareja() {
        const lista = document.getElementById('listaSolicitudesPareja');
        if (!lista || !usuarioActualId) return;

        const { data: solicitudes } = await supabaseClient
            .from('parejas')
            .select('*')
            .eq('destinatario_id', usuarioActualId)
            .eq('estado', 'pendiente');

        if (!solicitudes || solicitudes.length === 0) {
            lista.innerHTML = '<div class="card" style="background:white;"><p style="margin:0; color:var(--text-muted);">No tienes solicitudes de pareja pendientes.</p></div>';
            return;
        }

        lista.innerHTML = solicitudes.map(s => {
            const solicitante = usuariosCargados.find(u => u.id == s.solicitante_id);
            const nombre = solicitante?.nombre || `Usuario #${s.solicitante_id}`;
            return `
                <div class="card" style="background:white;">
                    <p style="font-size:1.5rem; margin-bottom:6px;">💌</p>
                    <h4 style="margin-bottom:6px;"><strong>${nombre}</strong> quiere ser tu pareja</h4>
                    <div style="display:flex; gap:10px; margin-top:14px;">
                        <button class="btn-primary js-aceptar-sol-pareja-btn" data-id="${s.id}" style="padding:8px 16px;">💑 Aceptar</button>
                        <button class="js-rechazar-sol-pareja-btn" data-id="${s.id}" style="padding:8px 16px; background:white; border:1px solid #dee2e6; border-radius:8px; cursor:pointer;">Rechazar</button>
                    </div>
                </div>`;
        }).join('');
    }

    async function cargarEstadoPareja() {
        const estadoDiv = document.getElementById('pareja-estado');
        if (!estadoDiv) return;

        // Asegurar que tenemos el ID del usuario actual
        if (!usuarioActualId) {
            estadoDiv.innerHTML = `<p style="text-align:center; color:var(--text-muted);">No se pudo identificar tu usuario. Recarga la página.</p>`;
            return;
        }

        const miId = usuarioActualId;
        const miPerfil = usuariosCargados.find(u => u.id === miId);
        const miGenero = miPerfil?.genero || '';
        const miNombre = miPerfil?.nombre || miPerfil?.email || 'tú';

        // Buscar pareja activa o pendiente
        const { data: parejas } = await supabaseClient
            .from('parejas')
            .select('*')
            .or(`solicitante_id.eq.${miId},destinatario_id.eq.${miId}`)
            .in('estado', ['activa', 'pendiente']);

        const parejaActiva = (parejas || []).find(p => p.estado === 'activa');
        const solicitudEnviada = (parejas || []).find(p => p.estado === 'pendiente' && p.solicitante_id == miId);
        const solicitudRecibida = (parejas || []).find(p => p.estado === 'pendiente' && p.destinatario_id == miId);

        if (parejaActiva) {
            const otroId = parejaActiva.solicitante_id == miId ? parejaActiva.destinatario_id : parejaActiva.solicitante_id;
            const otroPerfil = usuariosCargados.find(u => u.id == otroId);
            const otroNombre = otroPerfil?.nombre || `Usuario #${otroId}`;
            estadoDiv.innerHTML = `
                <div style="text-align:center;">
                    <p style="font-size:2rem; margin-bottom:8px;">💑</p>
                    <h3 style="margin-bottom:6px;">¡Estás en pareja con <strong>${otroNombre}</strong>!</h3>
                    <p style="color:var(--text-muted); margin-bottom:18px;">Tu relación está activa dentro de la comunidad.</p>
                    <button class="js-terminar-pareja-btn" data-id="${parejaActiva.id}" style="padding:8px 18px; background:white; border:1px solid #f44336; color:#f44336; border-radius:8px; cursor:pointer;">
                        Terminar relación
                    </button>
                </div>`;
            return;
        }

        if (solicitudEnviada) {
            const otroPerfil = usuariosCargados.find(u => u.id == solicitudEnviada.destinatario_id);
            const otroNombre = otroPerfil?.nombre || `Usuario #${solicitudEnviada.destinatario_id}`;
            estadoDiv.innerHTML = `
                <div style="text-align:center;">
                    <p style="font-size:2rem; margin-bottom:8px;">⏳</p>
                    <h3 style="margin-bottom:6px;">Solicitud enviada a <strong>${otroNombre}</strong></h3>
                    <p style="color:var(--text-muted); margin-bottom:18px;">Esperando que acepte tu solicitud.</p>
                    <button class="js-cancelar-pareja-btn" data-id="${solicitudEnviada.id}" style="padding:8px 18px; background:white; border:1px solid #888; color:#888; border-radius:8px; cursor:pointer;">
                        Cancelar solicitud
                    </button>
                </div>`;
            return;
        }

        if (solicitudRecibida) {
            const otroPerfil = usuariosCargados.find(u => u.id == solicitudRecibida.solicitante_id);
            const otroNombre = otroPerfil?.nombre || `Usuario #${solicitudRecibida.solicitante_id}`;
            estadoDiv.innerHTML = `
                <div style="text-align:center;">
                    <p style="font-size:2rem; margin-bottom:8px;">💌</p>
                    <h3 style="margin-bottom:6px;"><strong>${otroNombre}</strong> quiere ser tu pareja</h3>
                    <p style="color:var(--text-muted); margin-bottom:18px;">¿Aceptas comenzar esta relación dentro de la comunidad?</p>
                    <div style="display:flex; gap:12px; justify-content:center;">
                        <button class="btn-primary js-aceptar-pareja-btn" data-id="${solicitudRecibida.id}" style="padding:8px 20px;">💑 Aceptar</button>
                        <button class="js-rechazar-pareja-btn" data-id="${solicitudRecibida.id}" style="padding:8px 20px; background:white; border:1px solid #dee2e6; border-radius:8px; cursor:pointer;">Rechazar</button>
                    </div>
                </div>`;
            return;
        }

        // Sin pareja: mostrar formulario para invitar al género opuesto
        const generoOpuesto = miGenero === 'masculino' ? 'femenino' : (miGenero === 'femenino' ? 'masculino' : null);

        if (!generoOpuesto) {
            estadoDiv.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Completa tu género en el perfil para poder solicitar pareja.</p>`;
            return;
        }

        const candidatos = usuariosCargados.filter(u => u.genero === generoOpuesto && u.id !== miId);
        const opciones = candidatos
            .map(u => `<option value="${u.id}">${u.nombre || u.email}</option>`)
            .join('');

        estadoDiv.innerHTML = `
            <div>
                <h3 style="margin-bottom:6px;">Sin pareja activa</h3>
                <p style="color:var(--text-muted); margin-bottom:18px;">Puedes enviar una solicitud de pareja a otro miembro.</p>
                <form id="parejaForm" style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
                    <div class="form-group" style="flex:1; min-width:200px; margin-bottom:0;">
                        <label for="parejaDestinatario">Invitar a:</label>
                        <select id="parejaDestinatario" required>
                            <option value="">Selecciona un usuario</option>
                            ${opciones}
                        </select>
                    </div>
                    <button type="submit" class="btn-primary" style="padding:10px 20px; white-space:nowrap;">💌 Enviar solicitud</button>
                </form>
                <p id="parejaFeedback" style="margin-top:10px; font-size:0.9rem;"></p>
            </div>`;

        document.getElementById('parejaForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const destinatarioId = document.getElementById('parejaDestinatario').value;
            if (!destinatarioId) return;

            const { error } = await supabaseClient.from('parejas').insert([{
                solicitante_id: miId,
                destinatario_id: parseInt(destinatarioId),
                estado: 'pendiente'
            }]);

            const feedback = document.getElementById('parejaFeedback');
            if (error) {
                if (feedback) feedback.textContent = 'Error: ' + error.message;
            } else {
                await cargarEstadoPareja();
            }
        });
    }

    if (beneficiosSection) {
        beneficiosSection.addEventListener('click', async (event) => {
            const aceptarBtn = event.target.closest('.js-aceptar-pareja-btn');
            if (aceptarBtn) {
                const { error } = await supabaseClient.from('parejas').update({ estado: 'activa' }).eq('id', aceptarBtn.dataset.id);
                if (!error) await cargarEstadoPareja();
                return;
            }

            const rechazarBtn = event.target.closest('.js-rechazar-pareja-btn');
            if (rechazarBtn) {
                const { error } = await supabaseClient.from('parejas').update({ estado: 'rechazada' }).eq('id', rechazarBtn.dataset.id);
                if (!error) await cargarEstadoPareja();
                return;
            }

            const cancelarBtn = event.target.closest('.js-cancelar-pareja-btn');
            if (cancelarBtn) {
                const { error } = await supabaseClient.from('parejas').update({ estado: 'cancelada' }).eq('id', cancelarBtn.dataset.id);
                if (!error) await cargarEstadoPareja();
                return;
            }

            const terminarBtn = event.target.closest('.js-terminar-pareja-btn');
            if (terminarBtn) {
                if (!confirm('¿Estás seguro de que deseas terminar esta relación?')) return;
                const { error } = await supabaseClient.from('parejas').update({ estado: 'finalizada' }).eq('id', terminarBtn.dataset.id);
                if (!error) await cargarEstadoPareja();
            }
        });
    }


    const usuariosSection = document.getElementById('sec-emparejador');
    if (usuariosSection) {
        usuariosSection.addEventListener('click', async (event) => {
            const addFriendBtn = event.target.closest('.js-add-friend-btn');
            if (addFriendBtn) {
                await enviarSolicitudDeAmistad(addFriendBtn.dataset.userId);
                return;
            }

            const openRequestsBtn = event.target.closest('.js-open-requests-btn');
            if (openRequestsBtn) {
                showUsuariosTab('solicitudes');
                return;
            }

            const chatBtn = event.target.closest('.js-user-chat-btn');
            if (chatBtn) {
                if (!usuarioActualId) {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        await cargarDatosUsuarios(session.user.email);
                    }
                }
                await UI.irAlChat(chatBtn.dataset.userId);
                return;
            }

            const acceptBtn = event.target.closest('.js-accept-request-btn');
            if (acceptBtn) {
                await responderSolicitud(acceptBtn.dataset.id, true);
                return;
            }

            const rejectBtn = event.target.closest('.js-reject-request-btn');
            if (rejectBtn) {
                await responderSolicitud(rejectBtn.dataset.id, false);
                return;
            }

            // Aceptar/rechazar solicitud de pareja desde la pestaña
            const aceptarSolBtn = event.target.closest('.js-aceptar-sol-pareja-btn');
            if (aceptarSolBtn) {
                const { error } = await supabaseClient.from('parejas').update({ estado: 'activa' }).eq('id', aceptarSolBtn.dataset.id);
                if (!error) { await actualizarEstadoParejaCache(); await cargarSolicitudesPareja(); }
                return;
            }

            const rechazarSolBtn = event.target.closest('.js-rechazar-sol-pareja-btn');
            if (rechazarSolBtn) {
                const { error } = await supabaseClient.from('parejas').update({ estado: 'rechazada' }).eq('id', rechazarSolBtn.dataset.id);
                if (!error) await cargarSolicitudesPareja();
                return;
            }

            // Botón solicitar pareja desde tarjeta de usuario
            const parejaBtn = event.target.closest('.js-solicitar-pareja-btn');
            if (parejaBtn) {
                const destinatarioId = parseInt(parejaBtn.dataset.userId);
                const { error } = await supabaseClient.from('parejas').insert([{
                    solicitante_id: usuarioActualId,
                    destinatario_id: destinatarioId,
                    estado: 'pendiente'
                }]);
                if (error) {
                    alert('Error al enviar solicitud: ' + error.message);
                } else {
                    parejaBtn.disabled = true;
                    parejaBtn.textContent = '⏳ Solicitud enviada';
                    await actualizarEstadoParejaCache();
                }
            }
        });
    }

    // --- EVENTO CERRAR SESIÓN ---
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async () => {
            await Auth.cerrarSesion();
        });
    }

    const btnCerrarSesionConfig = document.getElementById('btnCerrarSesionConfig');
    if (btnCerrarSesionConfig) {
        btnCerrarSesionConfig.addEventListener('click', async () => {
            await Auth.cerrarSesion();
        });
    }

    // --- EVENTO VOLVER A USUARIOS ---
    const btnVolverEmparejador = document.getElementById('btnVolverEmparejador');
    if (btnVolverEmparejador) {
        btnVolverEmparejador.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Activar sección Usuarios
            const emparejadorMenu = document.querySelector('[data-section="emparejador"]');
            if (emparejadorMenu) emparejadorMenu.classList.add('active');
            const emparejadorSection = document.getElementById('sec-emparejador');
            if (emparejadorSection) emparejadorSection.classList.add('active');
        });
    }

    // --- EVENTO ENVIAR MENSAJE DESDE PERFIL ---
    const btnEnviarMensajeOtro = document.getElementById('btnEnviarMensajeOtro');
    if (btnEnviarMensajeOtro) {
        btnEnviarMensajeOtro.addEventListener('click', async () => {
            if (window.usuarioPerfilActualId) {
                await UI.irAlChat(window.usuarioPerfilActualId);
            }
        });
    }

    const btnSolicitarParejaPerfil = document.getElementById('btnSolicitarParejaPerfil');
    if (btnSolicitarParejaPerfil) {
        btnSolicitarParejaPerfil.addEventListener('click', async () => {
            const destinatarioId = window.usuarioPerfilActualId;
            if (!destinatarioId) return;
            const { error } = await supabaseClient.from('parejas').insert([{
                solicitante_id: usuarioActualId,
                destinatario_id: parseInt(destinatarioId),
                estado: 'pendiente'
            }]);
            if (error) { alert('Error: ' + error.message); return; }
            await actualizarEstadoParejaCache();
            // Actualizar botones en el perfil sin salir
            btnSolicitarParejaPerfil.style.display = 'none';
            document.getElementById('btnSolicitudParejaEnviada').style.display = 'block';
        });
    }

    const btnDejarAmigo = document.getElementById('btnDejarAmigo');
    if (btnDejarAmigo) {
        btnDejarAmigo.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas dejar de ser amigos?')) return;
            const otroId = window.usuarioPerfilActualId;
            const { error } = await supabaseClient
                .from('amistades')
                .delete()
                .or(`and(user_id.eq.${usuarioActualId},friend_id.eq.${otroId}),and(user_id.eq.${otroId},friend_id.eq.${usuarioActualId})`);
            if (error) { alert('Error: ' + error.message); return; }
            btnDejarAmigo.style.display = 'none';
            await cargarDatosUsuarios(emailActual);
        });
    }

    const btnTerminarParejaPerfil = document.getElementById('btnTerminarParejaPerfil');
    if (btnTerminarParejaPerfil) {
        btnTerminarParejaPerfil.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de que deseas terminar esta relación de pareja?')) return;
            const parejaId = window.estadoParejaGlobal?.parejaId;
            if (!parejaId) return;
            const { error } = await supabaseClient.from('parejas').update({ estado: 'finalizada' }).eq('id', parejaId);
            if (error) { alert('Error: ' + error.message); return; }
            btnTerminarParejaPerfil.style.display = 'none';
            await actualizarEstadoParejaCache();
        });
    }
});