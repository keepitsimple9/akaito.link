// js/ui.js

const UI = {
    // Para mostrar mensajes de error o éxito al usuario
    mostrarAlerta(mensaje, tipo = 'error') {
        alert(mensaje); // Puedes cambiar esto por un modal o un toast más elegante después
    },

    // Para actualizar el texto del nombre en el dashboard
    actualizarNombreUsuario(nombreCompleto) {
        const txtNombre = document.getElementById('nombreUsuario');
        if (txtNombre && nombreCompleto) {
            txtNombre.textContent = nombreCompleto.split(' ')[0];
        }
    },

    // Para cargar el perfil del usuario en el formulario
    cargarPerfil(usuario) {
        if (!usuario) return;
        
        document.getElementById('profNombre').value = usuario.nombre_perfil || '';
        document.getElementById('profEdad').value = usuario.edad || '';
        document.getElementById('profGenero').value = usuario.genero || '';
        document.getElementById('profWhatsapp').value = usuario.whatsapp || '';
        document.getElementById('profInstagram').value = usuario.instagram || '';
        document.getElementById('profBio').value = usuario.bio || '';
        document.getElementById('profIntereses').value = usuario.intereses || '';
        document.getElementById('profBusca').value = usuario.busca || 'pareja';
    },

    // Para limpiar campos de formularios
    limpiarFormulario(idFormulario) {
        const form = document.getElementById(idFormulario);
        if (form) form.reset();
    },

    // Para renderizar los mensajes en el chat
    renderizarMensajes(mensajes, emailPropio) {
        const mensajesList = document.getElementById('mensajesList');
        if (!mensajesList) return;
        
        mensajesList.innerHTML = '';
        mensajes.forEach(msg => {
            const div = document.createElement('div');
            div.className = msg.remitente_email === emailPropio ? 'mensaje-propio' : 'mensaje-recibido';
            div.innerHTML = `<b>${msg.remitente_email}:</b> ${msg.contenido}`;
            mensajesList.appendChild(div);
        });
    },

    // Para renderizar la lista de usuarios en el emparejador
    async renderizarUsuarios(usuarios, emailPropio) {
        const listaUsuarios = document.getElementById('listaUsuarios');
        if (!listaUsuarios) return;
        
        if (!usuarios || usuarios.length === 0) {
            listaUsuarios.innerHTML = '<p>No hay usuarios disponibles</p>';
            return;
        }

        listaUsuarios.innerHTML = '';
        usuarios.forEach(usuario => {
            if (usuario.email !== emailPropio) {
                const div = document.createElement('div');
                div.className = 'profile-card';
                div.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; transition: transform 0.2s;';
                
                let fotosHTML = '';
                if (usuario.foto1 || usuario.foto2) {
                    fotosHTML = `
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                            ${usuario.foto1 ? `<img src="${usuario.foto1}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;">` : `<div style="width: 100%; height: 120px; background: #f0f0f0; border-radius: 6px;"></div>`}
                            ${usuario.foto2 ? `<img src="${usuario.foto2}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;">` : `<div style="width: 100%; height: 120px; background: #f0f0f0; border-radius: 6px;"></div>`}
                        </div>
                    `;
                }
                
                div.innerHTML = `
                    ${fotosHTML}
                    <h4 style="cursor: pointer; color: var(--accent);">${usuario.nombre_perfil || usuario.email}</h4>
                    <p style="color: var(--text-muted); margin: 5px 0;"><strong>Edad:</strong> ${usuario.edad || 'No especificada'} ${usuario.genero ? `(${usuario.genero})` : ''}</p>
                    <p style="color: var(--text-muted); margin: 5px 0;"><strong>Bio:</strong> ${usuario.bio || 'Sin descripción'}</p>
                    <p style="color: var(--text-muted); margin: 5px 0;"><strong>Intereses:</strong> ${usuario.intereses || 'No especificados'}</p>
                    <button class="btn-primary" style="width: 100%; margin-top: 10px;" onclick="UI.irAlChat('${usuario.email}')">
                        Enviar Mensaje
                    </button>
                `;
                
                // Hacer clickeable el nombre para ver perfil completo
                const nombreElement = div.querySelector('h4');
                nombreElement.onclick = (e) => {
                    e.stopPropagation();
                    UI.mostrarPerfilUsuario(usuario);
                };
                
                listaUsuarios.appendChild(div);
            }
        });
    },

    // Para mostrar el perfil completo de otro usuario
    mostrarPerfilUsuario(usuario) {
        // Llenar los campos de la vista de perfil
        document.getElementById('verNombre').textContent = usuario.nombre_perfil || '-';
        document.getElementById('verEdad').textContent = (usuario.edad || '-') + (usuario.genero ? ` (${usuario.genero})` : '');
        document.getElementById('verGenero').textContent = usuario.genero || '-';
        document.getElementById('verWhatsapp').textContent = usuario.whatsapp || '-';
        document.getElementById('verInstagram').textContent = usuario.instagram || '-';
        document.getElementById('verBio').textContent = usuario.bio || '-';
        document.getElementById('verIntereses').textContent = usuario.intereses || '-';
        
        // Mostrar fotos
        const fotoVerOtro1 = document.getElementById('fotoVerOtro1');
        const fotoVerOtro2 = document.getElementById('fotoVerOtro2');
        
        // Limpiar contenido anterior
        fotoVerOtro1.innerHTML = '';
        fotoVerOtro2.innerHTML = '';
        
        if (usuario.foto1) {
            const img1 = document.createElement('img');
            img1.src = usuario.foto1;
            img1.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            fotoVerOtro1.appendChild(img1);
        } else {
            fotoVerOtro1.innerHTML = '<p style="color: #999;">Sin foto</p>';
        }
        
        if (usuario.foto2) {
            const img2 = document.createElement('img');
            img2.src = usuario.foto2;
            img2.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            fotoVerOtro2.appendChild(img2);
        } else {
            fotoVerOtro2.innerHTML = '<p style="color: #999;">Sin foto</p>';
        }
        
        // Mapear valores de busca a texto
        const textoBusca = {
            'pareja': 'Una relación seria',
            'conocer': 'Salir y ver qué pasa',
            'amistad': 'Amistad en la colectividad'
        };
        document.getElementById('verBusca').textContent = textoBusca[usuario.busca] || usuario.busca || '-';
        
        // Guardar email del usuario para usar en el botón de mensaje
        window.usuarioPerfilActual = usuario.email;
        
        // Cambiar a la sección de perfil de usuario
        const menuItems = document.querySelectorAll('.menu-item');
        const sections = document.querySelectorAll('.content-section');
        
        menuItems.forEach(item => item.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));
        
        document.getElementById('sec-perfil-usuario').classList.add('active');
    },

    // Para navegar a la sección de chat y abrir conversación
    async irAlChat(emailContacto) {
        // Navegar a la sección de chat
        const menuItems = document.querySelectorAll('.menu-item');
        const sections = document.querySelectorAll('.content-section');
        
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === 'chat') {
                item.classList.add('active');
            }
        });
        
        sections.forEach(sec => sec.classList.remove('active'));
        const chatSection = document.getElementById('sec-chat');
        if (chatSection) {
            chatSection.classList.add('active');
        }
        
        // Abrir el chat con el contacto
        await Chat.abrirChat(emailContacto);
    }
};