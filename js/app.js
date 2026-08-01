// js/app.js

// Variable para guardar referencias de fotos seleccionadas
let fotosSeleccionadas = {
    foto1: null,
    foto2: null
};

let usuariosCargados = [];
let emailActual = '';
let usuarioActualId = null;
let interlocutorActual = null;
let citasAgendadas = [];
let relacionesUsuarios = {
    setupRequired: false,
    amigos: new Set(),
    solicitudesEnviadas: new Set(),
    solicitudesRecibidasPorId: new Set(),
    solicitudesRecibidas: []
};

document.addEventListener('DOMContentLoaded', async () => {
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

    async function refrescarRelaciones() {
        if (!usuarioActualId) return;

        const [amigosResult, recibidasResult, enviadasResult] = await Promise.all([
            API.obtenerAmigos(usuarioActualId),
            API.obtenerSolicitudesRecibidas(usuarioActualId),
            API.obtenerSolicitudesEnviadas(usuarioActualId)
        ]);

        if (amigosResult.error || recibidasResult.error || enviadasResult.error) {
            const mensaje = amigosResult.error?.message || recibidasResult.error?.message || enviadasResult.error?.message || 'No se pudieron cargar las relaciones';
            UI.mostrarAlerta(mensaje);
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

        if (setupRequired) {
            renderizarEstadoConfiguracionAmistades();
            return;
        }

        UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios);
        UI.renderizarAmigos(relacionesUsuarios.amigosDetalle, crearMapaUsuarios());
        UI.renderizarSolicitudes(relacionesUsuarios.solicitudesRecibidas, crearMapaUsuarios());
    }

    async function cargarDatosUsuarios(sessionEmail) {
        emailActual = sessionEmail;
        const { data: usuarios, error } = await API.obtenerUsuarios();
        if (error) {
            UI.mostrarAlerta('No se pudieron cargar los usuarios: ' + error.message);
            return;
        }

        usuariosCargados = usuarios || [];
        const usuarioActual = usuariosCargados.find((usuario) => usuario.email === sessionEmail);
        usuarioActualId = usuarioActual?.id || null;

        renderizarOpcionesUsuarios();

        if (!usuarioActualId) {
            UI.mostrarAlerta('No se pudo identificar el ID del usuario actual.');
            UI.renderizarUsuarios(usuariosCargados, emailActual, relacionesUsuarios);
            return;
        }

        await refrescarRelaciones();
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
        button.addEventListener('click', function () {
            showUsuariosTab(this.dataset.tab);
        });
    });

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
            showCitasTab(this.dataset.tab);
        });
    });

    const citaTipoSelect = document.getElementById('citaTipo');
    const citaPersonaSingleGroup = document.getElementById('citaPersonaSingleGroup');
    const citaPersonaGrupoGroup = document.getElementById('citaPersonaGrupoGroup');
    const citaPersonaSelect = document.getElementById('citaPersona');
    const citaForm = document.getElementById('citaForm');
    const citaFeedback = document.getElementById('citaFeedback');
    const citaHistorialList = document.getElementById('citaHistorialList');
    const citaInvitacionesList = document.getElementById('citaInvitacionesList');
    const citasStorageKey = 'akaito-citas';

    function obtenerCitasGuardadas() {
        try {
            const almacenadas = localStorage.getItem(citasStorageKey);
            if (!almacenadas) return [];
            const parsed = JSON.parse(almacenadas);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('No se pudieron cargar las citas guardadas', error);
            return [];
        }
    }

    function guardarCitas() {
        localStorage.setItem(citasStorageKey, JSON.stringify(citasAgendadas));
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
        const fechaDate = new Date();
        fechaDate.setHours(Number(horas || 0), Number(minutos || 0), 0, 0);
        return fechaDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    function obtenerTituloCita(cita) {
        if (cita.tipo === 'gokon') {
            return `Cita grupal en ${cita.lugar || 'por definir'}`;
        }
        return `Cita con ${cita.persona || 'un usuario'}`;
    }

    function obtenerTextoParticipantes(cita) {
        if (cita.tipo === 'gokon' && Array.isArray(cita.participantes) && cita.participantes.length) {
            return cita.participantes.join(', ');
        }
        if (cita.persona) {
            return cita.persona;
        }
        return 'Sin participante asignado';
    }

    function obtenerNombreUsuario(usuario) {
        return usuario?.nombre || usuario?.nombre_perfil || usuario?.email?.split('@')[0] || 'Usuario';
    }

    function renderizarOpcionesUsuarios() {
        if (!citaPersonaSelect) return;

        const opciones = usuariosCargados
            .filter((usuario) => usuario.email !== emailActual)
            .map((usuario) => `<option value="${obtenerNombreUsuario(usuario)}">${obtenerNombreUsuario(usuario)}</option>`)
            .join('');

        const baseOption = '<option value="">Selecciona un usuario</option>';
        citaPersonaSelect.innerHTML = `${baseOption}${opciones}`;
    }

    function renderizarCitas() {
        if (!citaHistorialList || !citaInvitacionesList) return;

        const historial = citasAgendadas.filter((cita) => cita.estado !== 'rechazada');
        const invitaciones = citasAgendadas.filter((cita) => cita.estado === 'pendiente');

        if (historial.length === 0) {
            citaHistorialList.innerHTML = '<div class="card" style="background-color: white;"><p style="margin: 0; color: var(--text-muted);">Aún no tienes citas registradas.</p></div>';
        } else {
            citaHistorialList.innerHTML = historial.map((cita) => `
                <div class="card" style="background-color: white;">
                    <h3 style="margin-bottom: 8px;">${obtenerTituloCita(cita)}</h3>
                    <p style="margin-bottom: 8px; color: var(--text-muted);">${formatearFechaCita(cita.fecha, cita.hora)} · ${formatearHoraCita(cita.hora)} · ${cita.lugar || 'Lugar por definir'}</p>
                    <p style="margin-bottom: 8px;"><strong>Participantes:</strong> ${obtenerTextoParticipantes(cita)}</p>
                    <p style="margin: 0;">Estado: <span style="font-weight: 600; text-transform: capitalize;">${cita.estado || 'pendiente'}</span></p>
                </div>
            `).join('');
        }

        if (invitaciones.length === 0) {
            citaInvitacionesList.innerHTML = '<div class="card" style="background-color: white;"><p style="margin: 0; color: var(--text-muted);">No tienes invitaciones pendientes.</p></div>';
        } else {
            citaInvitacionesList.innerHTML = invitaciones.map((cita) => `
                <div class="card" style="background-color: white;">
                    <h3 style="margin-bottom: 8px;">${cita.tipo === 'gokon' ? 'Invitación grupal' : 'Invitación de cita'}</h3>
                    <p style="margin-bottom: 8px; color: var(--text-muted);">${formatearFechaCita(cita.fecha, cita.hora)} · ${formatearHoraCita(cita.hora)}</p>
                    <p style="margin-bottom: 12px;">Lugar: ${cita.lugar || 'Por definir'}</p>
                    <p style="margin-bottom: 12px;"><strong>Participantes:</strong> ${obtenerTextoParticipantes(cita)}</p>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-primary js-cita-accept-btn" data-id="${cita.id}" style="padding: 10px 16px;">Aceptar</button>
                        <button class="js-cita-reject-btn" data-id="${cita.id}" style="padding: 10px 16px; border: 1px solid #dee2e6; background: white; border-radius: 8px; cursor: pointer;">Rechazar</button>
                    </div>
                </div>
            `).join('');
        }
    }

    function inicializarCitas() {
        citasAgendadas = obtenerCitasGuardadas();
        if (citasAgendadas.length > 0) {
            return;
        }

        citasAgendadas = [];
        guardarCitas();
    }

    function updateCitaParticipantMode() {
        if (!citaTipoSelect || !citaPersonaSingleGroup || !citaPersonaGrupoGroup) {
            return;
        }

        const isGokon = citaTipoSelect.value === 'gokon';
        citaPersonaSingleGroup.style.display = isGokon ? 'none' : 'block';
        citaPersonaGrupoGroup.style.display = isGokon ? 'block' : 'none';

        if (citaPersonaSelect) {
            citaPersonaSelect.disabled = isGokon;
            if (isGokon) {
                citaPersonaSelect.value = '';
            }
        }
    }

    if (citaTipoSelect) {
        citaTipoSelect.addEventListener('change', updateCitaParticipantMode);
        updateCitaParticipantMode();
    }

    inicializarCitas();
    renderizarCitas();

    if (citaForm) {
        citaForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const tipo = citaTipoSelect?.value || 'normal';
            const fecha = document.getElementById('citaFecha')?.value;
            const hora = document.getElementById('citaHora')?.value;
            const lugar = document.getElementById('citaLugar')?.value.trim();
            const persona = citaPersonaSelect?.value?.trim() || '';
            const participantes = Array.from(document.querySelectorAll('.gokon-person-item input:checked'))
                .map((input) => input.value)
                .filter(Boolean);

            if (!fecha || !hora || !lugar) {
                if (citaFeedback) citaFeedback.textContent = 'Completa fecha, hora y lugar para crear la cita.';
                return;
            }

            if (tipo === 'normal' && !persona) {
                if (citaFeedback) citaFeedback.textContent = 'Selecciona con quién quieres agendar la cita.';
                return;
            }

            const nuevaCita = {
                id: `cita-${Date.now()}`,
                tipo,
                persona: tipo === 'normal' ? persona : '',
                participantes: tipo === 'gokon' ? participantes : [],
                fecha,
                hora,
                lugar,
                estado: 'pendiente',
                createdAt: new Date().toISOString()
            };

            citasAgendadas = [nuevaCita, ...citasAgendadas];
            guardarCitas();
            renderizarCitas();
            citaForm.reset();
            updateCitaParticipantMode();
            if (citaFeedback) citaFeedback.textContent = `Cita creada para ${formatearFechaCita(fecha, hora)} a las ${formatearHoraCita(hora)}.`;
            showCitasTab('historial');
        });
    }
    
    // --- NAVEGACIÓN ---
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.content-section');
    const btnConfig = document.getElementById('btnConfig');
    
    menuItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(sec => sec.classList.remove('active'));
            const target = document.getElementById(`sec-${item.getAttribute('data-section')}`);
            if (target) target.classList.add('active');
            
            // Cargar usuarios si se hace clic en la sección Usuarios
            if (item.getAttribute('data-section') === 'emparejador') {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    await cargarDatosUsuarios(session.user.email);
                }
            }

            // Cargar perfil si se hace clic en perfil
            if (item.getAttribute('data-section') === 'perfil') {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    const { data: usuario, error } = await API.obtenerPerfil(session.user.email);
                    if (!error && usuario) {
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
                    }
                }
            }
        });
    });

    // --- CARGA INICIAL DE DATOS ---
    if (window.location.pathname.includes('dashboard.html')) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // Cargar datos del usuario y mostrar nombre
            const { data: usuario } = await API.obtenerPerfil(session.user.email);
            if (usuario) {
                UI.actualizarNombreUsuario(usuario.nombre || usuario.nombre_perfil || 'paisano');
            }

            // Cargar usuarios y resolver ID actual antes de inicializar chat
            await cargarDatosUsuarios(session.user.email);
            
            // Cargar lista de chats
            const listaContactos = document.getElementById('listaContactos');
            if (listaContactos && usuarioActualId) {
                await Chat.cargarLista(listaContactos, usuarioActualId);
            }
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

            const datosPerfil = {
                nombre: document.getElementById('profNombre').value,
                edad: parseInt(document.getElementById('profEdad').value),
                genero: document.getElementById('profGenero').value,
                whatsapp: document.getElementById('profWhatsapp').value,
                instagram: document.getElementById('profInstagram').value,
                bio: document.getElementById('profBio').value,
                intereses: document.getElementById('profIntereses').value,
                busca: document.getElementById('profBusca').value
            };

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

            const { error } = await supabaseClient
                .from('usuarios')
                .update(datosPerfil)
                .eq('email', session.user.email);

            if (error) {
                alert('Error al guardar perfil: ' + error.message);
            } else {
                alert('¡Perfil guardado exitosamente!');
                UI.actualizarNombreUsuario(datosPerfil.nombre);
            }
        });
    }

    // --- EVENTO ENVIAR MENSAJE ---
    const btnEnviar = document.getElementById('btnEnviar');
    const inputMensaje = document.getElementById('inputMensaje');
    
    const enviarMensaje = async () => {
        const contenido = inputMensaje.value;
        
        if (!interlocutorActual) { alert('Selecciona un contacto'); return; }
        if (!contenido) return;
        if (!usuarioActualId) { alert('No se pudo identificar tu usuario actual.'); return; }

        await API.enviarMensaje(usuarioActualId, interlocutorActual, contenido);
        inputMensaje.value = '';
        
        // Refrescar mensajes tras enviar
        await Chat.abrirChat(interlocutorActual);
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
    const buscadorEmparejador = document.getElementById('buscadorEmparejador');
    if (buscadorEmparejador) {
        buscadorEmparejador.addEventListener('input', (e) => {
            const filtro = e.target.value.toLowerCase();
            const usuariosFiltrados = usuariosCargados.filter(usuario => {
                const nombre = (usuario.nombre || usuario.nombre_perfil || usuario.email).toLowerCase();
                const bio = (usuario.bio || '').toLowerCase();
                const intereses = (usuario.intereses || '').toLowerCase();
                
                return nombre.includes(filtro) || bio.includes(filtro) || intereses.includes(filtro);
            });
            
            UI.renderizarUsuarios(usuariosFiltrados, emailActual, relacionesUsuarios);
        });
    }

    const citasSection = document.getElementById('sec-citas');
    if (citasSection) {
        citasSection.addEventListener('click', (event) => {
            const acceptBtn = event.target.closest('.js-cita-accept-btn');
            if (acceptBtn) {
                const citaId = acceptBtn.dataset.id;
                citasAgendadas = citasAgendadas.map((cita) => cita.id === citaId ? { ...cita, estado: 'aceptada' } : cita);
                guardarCitas();
                renderizarCitas();
                return;
            }

            const rejectBtn = event.target.closest('.js-cita-reject-btn');
            if (rejectBtn) {
                const citaId = rejectBtn.dataset.id;
                citasAgendadas = citasAgendadas.map((cita) => cita.id === citaId ? { ...cita, estado: 'rechazada' } : cita);
                guardarCitas();
                renderizarCitas();
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

    // --- EVENTO CONFIGURACIÓN ---
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            const ayudaMenu = document.querySelector('[data-section="ayuda"]');
            if (ayudaMenu) ayudaMenu.classList.add('active');

            const ayudaSection = document.getElementById('sec-ayuda');
            if (ayudaSection) ayudaSection.classList.add('active');
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
});