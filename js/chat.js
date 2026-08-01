// js/chat.js
const Chat = {
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
        const { data: mensajes } = await API.obtenerContactos(usuarioPropioId);
        const { data: usuarios } = await API.obtenerUsuarios();
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

        const { data: usuarios } = await API.obtenerUsuarios();
        const usuario = (usuarios || []).find((u) => String(u.id) === id);
        const etiqueta = Chat.obtenerNombreVisible(usuario, id);

        const div = document.createElement('div');
        div.className = 'contact-item';
        div.setAttribute('data-user-id', id);
        div.textContent = etiqueta;
        div.style.cssText = 'cursor: pointer; padding: 10px; margin: 5px 0; border-radius: 6px; background-color: transparent; transition: background-color 0.2s;';
        div.onclick = () => Chat.abrirChat(id);
        listaContactos.appendChild(div);
    },

    async abrirChat(contactoId) {
        interlocutorActual = String(contactoId);
        await Chat.asegurarContactoVisible(interlocutorActual);
        
        // Remover clase activa de todos los contactos
        const todosContactos = document.querySelectorAll('.contact-item');
        todosContactos.forEach(div => {
            div.style.backgroundColor = 'transparent';
            div.style.color = 'var(--text-main)';
            div.style.fontWeight = 'normal';
        });
        
        // Marcar contacto actual como activo
        const contactoActivo = document.querySelector(`[data-user-id="${interlocutorActual}"]`);
        if (contactoActivo) {
            contactoActivo.style.backgroundColor = 'var(--accent)';
            contactoActivo.style.color = 'white';
            contactoActivo.style.fontWeight = 'bold';
        }
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        const { data: miPerfil } = await API.obtenerPerfil(session.user.email);
        const miUsuarioId = miPerfil?.id;
        if (!miUsuarioId) {
            return;
        }

        const { data: mensajes } = await API.obtenerMensajes(miUsuarioId, interlocutorActual);
        const { data: usuarios } = await API.obtenerUsuarios();
        const usuariosPorId = new Map((usuarios || []).map((usuario) => [String(usuario.id), usuario]));
        
        const mensajesList = document.getElementById('mensajesList');
        mensajesList.innerHTML = '';
        
        mensajes?.forEach(msg => {
            const esMensajePropio = String(msg.remitente_id) === String(miUsuarioId);
            const remitente = usuariosPorId.get(String(msg.remitente_id));
            const etiqueta = esMensajePropio ? 'Tu' : Chat.obtenerNombreVisible(remitente, msg.remitente_id);
            const colorTexto = esMensajePropio ? 'color: red;' : 'color: var(--text-main);';
            mensajesList.innerHTML += `<div style="${colorTexto}"><b>${etiqueta}:</b> ${msg.contenido}</div>`;
        });
    }
};