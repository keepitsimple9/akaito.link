// js/chat.js
const Chat = {
    marcarContactoActivo(contactoId) {
        const id = String(contactoId);
        document.querySelectorAll('.contact-item').forEach((div) => {
            const esActivo = div.getAttribute('data-user-id') === id;
            div.classList.toggle('active', esActivo);
            if (!esActivo) {
                div.style.backgroundColor = 'transparent';
                div.style.color = 'var(--text-main)';
                div.style.fontWeight = 'normal';
            }
        });
    },

    async obtenerMiPerfilSeguro() {
        if (window.perfilPropioCache?.id) {
            return window.perfilPropioCache;
        }

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.user?.email) return null;

            const { data: perfil } = await supabaseClient
                .from('usuarios')
                .select('*')
                .eq('email', session.user.email)
                .maybeSingle();

            if (perfil) {
                window.perfilPropioCache = perfil;
            }

            return perfil || null;
        } catch (error) {
            console.warn('No se pudo resolver el perfil propio para chat:', error);
            return null;
        }
    },

    obtenerNombreVisible(usuario = {}, fallbackId = '') {
        const nombre = (usuario.nombre || usuario.nombre_perfil || '').trim();
        if (nombre) return nombre;

        const email = (usuario.email || '').trim();
        if (email.includes('@')) {
            return email.split('@')[0];
        }

        return fallbackId ? `Usuario #${fallbackId}` : 'Usuario';
    },

    async cargarLista(listaContactos, usuarioPropioId) {
        if (!listaContactos) return;

        let mensajes = [];
        let usuarios = [];

        try {
            const contactosResp = await API.obtenerContactos(usuarioPropioId);
            mensajes = contactosResp?.data || [];
        } catch (error) {
            console.warn('No se pudieron cargar contactos de chat:', error);
        }

        try {
            const usuariosResp = await API.obtenerUsuarios();
            usuarios = usuariosResp?.data || [];
        } catch (error) {
            console.warn('No se pudieron cargar usuarios para chat:', error);
        }

        const usuariosPorId = new Map((usuarios || []).map((usuario) => [String(usuario.id), usuario]));

        const contactos = new Set();
        mensajes?.forEach(m => {
            const contactoId = String(m.remitente_id) === String(usuarioPropioId) ? m.receptor_id : m.remitente_id;
            contactos.add(String(contactoId));
        });

        listaContactos.innerHTML = '';
        if (contactos.size === 0) {
            listaContactos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Sin conversaciones aún</p>';
            return;
        }

        contactos.forEach(contactoId => {
            const usuario = usuariosPorId.get(String(contactoId));
            const etiqueta = Chat.obtenerNombreVisible(usuario, contactoId);
            const div = document.createElement('div');
            div.className = 'contact-item';
            if (String(contactoId) === String(window.interlocutorActual || '')) {
                div.classList.add('active');
            }
            div.setAttribute('data-user-id', contactoId);
            div.textContent = etiqueta;
            div.style.cssText = 'cursor: pointer; padding: 10px; margin: 5px 0; border-radius: 6px; background-color: transparent; transition: background-color 0.2s;';
            div.onclick = () => Chat.abrirChat(contactoId);
            listaContactos.appendChild(div);
        });
    },

    async asegurarContactoVisible(contactoId) {
        const id = String(contactoId);
        const listaContactos = document.getElementById('listaContactos');
        if (!listaContactos) return;

        const existente = listaContactos.querySelector(`[data-user-id="${id}"]`);
        if (existente) return;

        if (listaContactos.textContent.includes('Sin conversaciones aún')) {
            listaContactos.innerHTML = '';
        }

        let usuarios = [];
        try {
            const usuariosResp = await API.obtenerUsuarios();
            usuarios = usuariosResp?.data || [];
        } catch (error) {
            console.warn('No se pudo cargar usuario para contacto visible:', error);
        }
        const usuario = (usuarios || []).find((u) => String(u.id) === id);
        const etiqueta = Chat.obtenerNombreVisible(usuario, id);

        const div = document.createElement('div');
        div.className = 'contact-item';
        if (String(id) === String(window.interlocutorActual || '')) {
            div.classList.add('active');
        }
        div.setAttribute('data-user-id', id);
        div.textContent = etiqueta;
        div.style.cssText = 'cursor: pointer; padding: 10px; margin: 5px 0; border-radius: 6px; background-color: transparent; transition: background-color 0.2s;';
        div.onclick = () => Chat.abrirChat(id);
        listaContactos.appendChild(div);
    },

    async abrirChat(contactoId) {
        interlocutorActual = String(contactoId);
        await Chat.asegurarContactoVisible(interlocutorActual);
        Chat.marcarContactoActivo(interlocutorActual);
        
        // Marcar contacto actual como activo
        const contactoActivo = document.querySelector(`[data-user-id="${interlocutorActual}"]`);
        if (contactoActivo) {
            contactoActivo.classList.add('active');
        }
        
        const miPerfil = await Chat.obtenerMiPerfilSeguro();
        const miUsuarioId = miPerfil?.id;
        if (!miUsuarioId) {
            const mensajesList = document.getElementById('mensajesList');
            if (mensajesList) {
                mensajesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No se pudo resolver tu perfil para abrir el chat.</p>';
            }
            return;
        }

        let mensajes = [];
        let usuarios = [];

        try {
            const mensajesResp = await API.obtenerMensajes(miUsuarioId, interlocutorActual);
            mensajes = mensajesResp?.data || [];
        } catch (error) {
            console.warn('No se pudieron cargar mensajes del chat:', error);
        }

        try {
            const usuariosResp = await API.obtenerUsuarios();
            usuarios = usuariosResp?.data || [];
        } catch (error) {
            console.warn('No se pudieron cargar usuarios para renderizar mensajes:', error);
        }

        const usuariosPorId = new Map((usuarios || []).map((usuario) => [String(usuario.id), usuario]));
        
        const mensajesList = document.getElementById('mensajesList');
        if (!mensajesList) return;
        mensajesList.innerHTML = '';
        if (!mensajes || mensajes.length === 0) {
            mensajesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Aun no hay mensajes en esta conversacion.</p>';
            return;
        }
        
        mensajes?.forEach(msg => {
            const esMensajePropio = String(msg.remitente_id) === String(miUsuarioId);
            const remitente = usuariosPorId.get(String(msg.remitente_id));
            const etiqueta = esMensajePropio ? 'Tu' : Chat.obtenerNombreVisible(remitente, msg.remitente_id);
            const colorTexto = esMensajePropio ? 'color: red;' : 'color: var(--text-main);';
            mensajesList.innerHTML += `<div style="${colorTexto}"><b>${etiqueta}:</b> ${msg.contenido}</div>`;
        });
    }
};