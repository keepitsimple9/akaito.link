// js/chat.js
const Chat = {
    async cargarLista(listaContactos, emailPropio) {
        const { data: mensajes } = await API.obtenerContactos(emailPropio);
        const contactos = new Set();
        mensajes?.forEach(m => {
            contactos.add(m.remitente_email === emailPropio ? m.receptor_email : m.remitente_email);
        });

        listaContactos.innerHTML = '';
        if (contactos.size === 0) {
            listaContactos.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Sin conversaciones aún</p>';
            return;
        }

        contactos.forEach(email => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.setAttribute('data-email', email);
            div.textContent = email;
            div.style.cssText = 'cursor: pointer; padding: 10px; margin: 5px 0; border-radius: 6px; background-color: transparent; transition: background-color 0.2s;';
            div.onclick = () => Chat.abrirChat(email);
            listaContactos.appendChild(div);
        });
    },

    async abrirChat(email) {
        interlocutorActual = email;
        
        // Remover clase activa de todos los contactos
        const todosContactos = document.querySelectorAll('.contact-item');
        todosContactos.forEach(div => {
            div.style.backgroundColor = 'transparent';
            div.style.color = 'var(--text-main)';
            div.style.fontWeight = 'normal';
        });
        
        // Marcar contacto actual como activo
        const contactoActivo = document.querySelector(`[data-email="${email}"]`);
        if (contactoActivo) {
            contactoActivo.style.backgroundColor = 'var(--accent)';
            contactoActivo.style.color = 'white';
            contactoActivo.style.fontWeight = 'bold';
        }
        
        const { data: { session } } = await supabaseClient.auth.getSession();
        const { data: mensajes } = await API.obtenerMensajes(session.user.email, email);
        
        const mensajesList = document.getElementById('mensajesList');
        const emailActualUsuario = session.user.email;
        mensajesList.innerHTML = '';
        
        mensajes?.forEach(msg => {
            const esMensajePropio = msg.remitente_email === emailActualUsuario;
            const colorTexto = esMensajePropio ? 'color: red;' : 'color: var(--text-main);';
            mensajesList.innerHTML += `<div style="${colorTexto}"><b>${msg.remitente_email}:</b> ${msg.contenido}</div>`;
        });
    }
};